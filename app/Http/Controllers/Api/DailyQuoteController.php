<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use OpenAI;

class DailyQuoteController extends Controller
{
    private const MONTH_NAMES = [
        1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril',
        5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto',
        9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
    ];

    /**
     * Get a daily inspirational quote.
     *
     * Strategy (in order of reliability):
     * 1. Wikipedia "On this day" API → verified dates → OpenAI for quotes only
     * 2. OpenAI-only fallback (less reliable dates)
     * 3. Static fallback quotes
     *
     * Caches a pool of quotes per day and rotates them across requests.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $date = now();
        $monthDay = $date->format('m-d');

        $poolKey = "daily_quotes_pool_{$monthDay}";
        $counterKey = "daily_quotes_counter_{$monthDay}";

        $pool = Cache::get($poolKey);

        if (!$pool || count($pool) === 0) {
            $pool = $this->buildQuotesPool($date);

            if ($pool && count($pool) > 0) {
                $secondsUntilMidnight = (int) now()->diffInSeconds(now()->endOfDay());
                Cache::put($poolKey, $pool, max($secondsUntilMidnight, 60));
                Cache::put($counterKey, 0, max($secondsUntilMidnight, 60));
            } else {
                return response()->json($this->getFallbackQuote());
            }
        }

        // Rotate through pool
        $index = Cache::get($counterKey, 0);
        $quote = $pool[$index % count($pool)];
        $secondsUntilMidnight = (int) now()->diffInSeconds(now()->endOfDay());
        Cache::put($counterKey, ($index + 1) % count($pool), max($secondsUntilMidnight, 60));

        return response()->json($quote);
    }

    /**
     * Build a pool of quotes for today.
     * Uses Wikipedia for verified dates, then OpenAI for quotes about those people.
     */
    private function buildQuotesPool(\Carbon\Carbon $date): ?array
    {
        $month = (int) $date->format('m');
        $day = (int) $date->format('d');
        $monthPadded = $date->format('m');
        $dayPadded = $date->format('d');
        $monthName = self::MONTH_NAMES[$month];

        // Step 1: Get verified births/deaths from Wikipedia
        $people = $this->fetchWikipediaPeople($monthPadded, $dayPadded);

        if (count($people) >= 3) {
            // Step 2: Use OpenAI to generate quotes for these VERIFIED people
            $pool = $this->generateQuotesForVerifiedPeople($people, $day, $monthName);

            if ($pool && count($pool) > 0) {
                Log::info("DailyQuote: Wikipedia+OpenAI success", [
                    'count' => count($pool),
                    'date' => "{$monthPadded}/{$dayPadded}",
                ]);
                return $pool;
            }
        }

        // Step 3: Fallback to OpenAI-only (less reliable dates but better than nothing)
        Log::info("DailyQuote: Wikipedia insufficient, falling back to OpenAI-only", [
            'wikipedia_people' => count($people),
            'date' => "{$monthPadded}/{$dayPadded}",
        ]);

        return $this->generateQuotesPoolOpenAI($day, $monthName);
    }

    /**
     * Fetch verified births and deaths from Wikipedia's "On this day" REST API.
     * Returns an array of people with verified names, years, and type.
     */
    private function fetchWikipediaPeople(string $month, string $day): array
    {
        $people = [];

        try {
            // Try Spanish Wikipedia first for births
            $birthsResponse = Http::timeout(8)
                ->withHeaders(['User-Agent' => 'WithMIA/1.0 (https://app.withmia.com)'])
                ->get("https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/births/{$month}/{$day}");

            if ($birthsResponse->ok()) {
                foreach ($birthsResponse->json('births') ?? [] as $entry) {
                    $page = $entry['pages'][0] ?? null;
                    if ($page && !empty($entry['year'])) {
                        $name = $page['titles']['normalized']
                            ?? $page['titles']['canonical']
                            ?? $page['title']
                            ?? null;

                        if ($name) {
                            $people[] = [
                                'name' => str_replace('_', ' ', $name),
                                'year' => (int) $entry['year'],
                                'type' => 'birth',
                                'description' => $page['description'] ?? '',
                                'extract' => $page['extract'] ?? '',
                            ];
                        }
                    }
                }
            }

            // Fetch deaths
            $deathsResponse = Http::timeout(8)
                ->withHeaders(['User-Agent' => 'WithMIA/1.0 (https://app.withmia.com)'])
                ->get("https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/deaths/{$month}/{$day}");

            if ($deathsResponse->ok()) {
                foreach ($deathsResponse->json('deaths') ?? [] as $entry) {
                    $page = $entry['pages'][0] ?? null;
                    if ($page && !empty($entry['year'])) {
                        $name = $page['titles']['normalized']
                            ?? $page['titles']['canonical']
                            ?? $page['title']
                            ?? null;

                        if ($name) {
                            $people[] = [
                                'name' => str_replace('_', ' ', $name),
                                'year' => (int) $entry['year'],
                                'type' => 'death',
                                'description' => $page['description'] ?? '',
                                'extract' => $page['extract'] ?? '',
                            ];
                        }
                    }
                }
            }

            // If Spanish Wikipedia returns few results, try English
            if (count($people) < 5) {
                $this->supplementFromEnglishWikipedia($people, $month, $day);
            }
        } catch (\Exception $e) {
            Log::warning('DailyQuote: Wikipedia API error', ['error' => $e->getMessage()]);
        }

        // Sort by extract length (longer = more notable) and pick top 10
        usort($people, fn($a, $b) => strlen($b['extract']) - strlen($a['extract']));

        return array_slice($people, 0, 10);
    }

    /**
     * Supplement people list from English Wikipedia if Spanish returns few results.
     */
    private function supplementFromEnglishWikipedia(array &$people, string $month, string $day): void
    {
        $existingNames = array_map(fn($p) => mb_strtolower($p['name']), $people);

        try {
            foreach (['births', 'deaths'] as $type) {
                $response = Http::timeout(8)
                    ->withHeaders(['User-Agent' => 'WithMIA/1.0 (https://app.withmia.com)'])
                    ->get("https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/{$type}/{$month}/{$day}");

                if ($response->ok()) {
                    foreach ($response->json($type) ?? [] as $entry) {
                        $page = $entry['pages'][0] ?? null;
                        if ($page && !empty($entry['year'])) {
                            $name = $page['titles']['normalized']
                                ?? $page['titles']['canonical']
                                ?? $page['title']
                                ?? null;

                            if ($name) {
                                $cleanName = str_replace('_', ' ', $name);
                                // Avoid duplicates
                                if (!in_array(mb_strtolower($cleanName), $existingNames, true)) {
                                    $people[] = [
                                        'name' => $cleanName,
                                        'year' => (int) $entry['year'],
                                        'type' => $type === 'births' ? 'birth' : 'death',
                                        'description' => $page['description'] ?? '',
                                        'extract' => $page['extract'] ?? '',
                                    ];
                                    $existingNames[] = mb_strtolower($cleanName);
                                }
                            }
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            // Silently fail — this is supplementary
        }
    }

    /**
     * Generate quotes for Wikipedia-verified people using OpenAI.
     * Dates come from Wikipedia, OpenAI only provides quotes and bios.
     */
    private function generateQuotesForVerifiedPeople(array $people, int $day, string $monthName): ?array
    {
        $apiKey = config('services.openai.api_key');

        if (empty($apiKey)) {
            Log::warning('DailyQuote: OpenAI API key not configured');
            return null;
        }

        try {
            $client = OpenAI::client($apiKey);

            // Build verified people list for the prompt
            $peopleList = '';
            foreach ($people as $i => $p) {
                $typeLabel = $p['type'] === 'birth' ? 'Nacido' : 'Fallecido';
                $desc = $p['description'] ? " — {$p['description']}" : '';
                $num = $i + 1;
                $peopleList .= "{$num}. {$p['name']} ({$typeLabel} en {$p['year']}{$desc})\n";
            }

            $prompt = <<<PROMPT
De la siguiente lista de personajes históricos VERIFICADOS que nacieron o fallecieron el {$day} de {$monthName}, selecciona los 5 más reconocidos mundialmente y proporciona una cita célebre atribuida a cada uno.

PERSONAJES VERIFICADOS (fechas confirmadas por Wikipedia):
{$peopleList}

Para cada uno de los 5 seleccionados, responde con:
- "quote": Una cita célebre conocida de esa persona (en español). Debe ser una frase que comúnmente se le atribuye.
- "author": Su nombre más conocido
- "context": Exactamente "{Nacido/Fallecido} el {$day} de {$monthName} de {AÑO}" usando EXACTAMENTE el año de la lista
- "who": Mini biografía de 1-2 líneas sobre quién fue y su contribución principal

REGLAS ESTRICTAS:
- USA EXACTAMENTE los años proporcionados en la lista, NO los cambies
- Selecciona personajes variados y reconocidos (ciencia, arte, política, literatura, música)
- Las citas deben ser frases comúnmente atribuidas a esa persona
- Todo en español
- Responde SOLO con un JSON array válido, sin markdown ni explicación adicional

[{"quote":"...","author":"...","context":"...","who":"..."}]
PROMPT;

            $result = $client->chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un experto en citas históricas y biografías. Las fechas de nacimiento y muerte ya fueron verificadas por Wikipedia — NO las modifiques bajo ninguna circunstancia. Tu trabajo es SOLO proporcionar citas famosas y biografías breves para los personajes indicados. Responde SOLO en JSON válido.',
                    ],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 1500,
                'temperature' => 0.3,
            ]);

            $content = trim($result->choices[0]->message->content);

            // Clean potential markdown wrapping
            $content = preg_replace('/^```json\s*/i', '', $content);
            $content = preg_replace('/\s*```$/i', '', $content);
            $content = trim($content);

            $quotes = json_decode($content, true);

            if (!is_array($quotes) || count($quotes) === 0) {
                Log::warning('DailyQuote: Invalid JSON from OpenAI (verified mode)', ['content' => $content]);
                return null;
            }

            // Build a lookup of verified people by name (lowercase)
            $verifiedLookup = [];
            foreach ($people as $p) {
                $verifiedLookup[mb_strtolower(trim($p['name']))] = $p;
            }

            // Validate structure and cross-check dates with Wikipedia data
            $validated = [];
            foreach ($quotes as $q) {
                if (!isset($q['quote'], $q['author'], $q['context'], $q['who'])) {
                    continue;
                }

                // Try to match this author to a Wikipedia-verified person
                $authorLower = mb_strtolower(trim($q['author']));
                $matched = $this->findMatchingPerson($authorLower, $verifiedLookup);

                if ($matched) {
                    // OVERRIDE context with Wikipedia-verified date (guaranteed correct)
                    $typeLabel = $matched['type'] === 'birth' ? 'Nacido' : 'Fallecido';
                    $q['context'] = "{$typeLabel} el {$day} de {$monthName} de {$matched['year']}";
                }

                $validated[] = [
                    'quote' => $q['quote'],
                    'author' => $q['author'],
                    'context' => $q['context'],
                    'who' => $q['who'],
                ];
            }

            return count($validated) > 0 ? $validated : null;
        } catch (\Exception $e) {
            Log::error('DailyQuote: OpenAI error (verified mode)', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Find a matching person in the verified lookup by fuzzy name matching.
     */
    private function findMatchingPerson(string $authorLower, array $verifiedLookup): ?array
    {
        // Exact match
        if (isset($verifiedLookup[$authorLower])) {
            return $verifiedLookup[$authorLower];
        }

        // Partial match: check if author name is contained in or contains a verified name
        foreach ($verifiedLookup as $verifiedName => $person) {
            // Check substring match in both directions
            if (mb_strlen($authorLower) >= 4 && mb_strlen($verifiedName) >= 4) {
                if (str_contains($verifiedName, $authorLower) || str_contains($authorLower, $verifiedName)) {
                    return $person;
                }
            }

            // Check last name match (common case: "Einstein" vs "Albert Einstein")
            $authorParts = explode(' ', $authorLower);
            $verifiedParts = explode(' ', $verifiedName);

            $authorLastName = end($authorParts);
            $verifiedLastName = end($verifiedParts);

            if (mb_strlen($authorLastName) >= 4 && $authorLastName === $verifiedLastName) {
                return $person;
            }
        }

        return null;
    }

    /**
     * Fallback: Generate quotes using OpenAI only (original method, less reliable dates).
     * Used when Wikipedia API is unavailable.
     */
    private function generateQuotesPoolOpenAI(int $day, string $monthName): ?array
    {
        $apiKey = config('services.openai.api_key');

        if (empty($apiKey)) {
            return null;
        }

        try {
            $client = OpenAI::client($apiKey);

            $prompt = <<<PROMPT
Hoy es {$day} de {$monthName}. Necesito información sobre 5 personajes históricos DIFERENTES que nacieron o fallecieron este mismo día ({$day} de {$monthName}) a lo largo de la historia.

Para cada uno, dame:
1. Una cita célebre REAL de esa persona (no inventada)
2. Su nombre completo
3. Por qué aparece hoy (ej: "Nacido el {$day} de {$monthName} de 1879")
4. Una mini biografía de 1-2 líneas

IMPORTANTE:
- Solo incluye personas que REALMENTE nacieron o murieron el {$day} de {$monthName}. Verifica las fechas.
- Incluye variedad: científicos, artistas, filósofos, líderes, escritores, músicos.
- Todo en español.

Responde SOLO con JSON array válido:
[{"quote":"...","author":"...","context":"Nacido/Fallecido el...","who":"..."}]
PROMPT;

            $result = $client->chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un historiador experto en efemérides. Verifica las fechas antes de responder. Responde SOLO en JSON válido.',
                    ],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 1500,
                'temperature' => 0.3,
            ]);

            $content = trim($result->choices[0]->message->content);
            $content = preg_replace('/^```json\s*/i', '', $content);
            $content = preg_replace('/\s*```$/i', '', $content);
            $content = trim($content);

            $quotes = json_decode($content, true);

            if (!is_array($quotes) || count($quotes) === 0) {
                Log::warning('DailyQuote: Invalid JSON from OpenAI (fallback mode)', ['content' => $content]);
                return null;
            }

            $validated = [];
            foreach ($quotes as $q) {
                if (isset($q['quote'], $q['author'], $q['context'], $q['who'])) {
                    $validated[] = [
                        'quote' => $q['quote'],
                        'author' => $q['author'],
                        'context' => $q['context'],
                        'who' => $q['who'],
                    ];
                }
            }

            return count($validated) > 0 ? $validated : null;
        } catch (\Exception $e) {
            Log::error('DailyQuote: OpenAI error (fallback mode)', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Static fallback quote if all APIs fail.
     */
    private function getFallbackQuote(): array
    {
        $fallbacks = [
            [
                'quote' => 'La verdadera sabiduría está en reconocer la propia ignorancia.',
                'author' => 'Sócrates',
                'context' => 'Reflexión atemporal',
                'who' => 'Filósofo griego (470-399 a.C.). Padre de la filosofía occidental. Su método de preguntas (mayéutica) sentó las bases del pensamiento crítico.',
            ],
            [
                'quote' => 'La imaginación es más importante que el conocimiento.',
                'author' => 'Albert Einstein',
                'context' => 'Reflexión atemporal',
                'who' => 'Físico teórico alemán (1879-1955). Premio Nobel de Física 1921. Desarrolló la teoría de la relatividad, transformando nuestra comprensión del espacio, el tiempo y la energía.',
            ],
            [
                'quote' => 'Pienso, luego existo.',
                'author' => 'René Descartes',
                'context' => 'Reflexión atemporal',
                'who' => 'Filósofo, matemático y científico francés (1596-1650). Padre de la filosofía moderna y la geometría analítica.',
            ],
            [
                'quote' => 'El que no arriesga no gana.',
                'author' => 'Simón Bolívar',
                'context' => 'Reflexión atemporal',
                'who' => 'Líder militar y político venezolano (1783-1830). Libertador de Venezuela, Colombia, Ecuador, Perú y Bolivia. Héroe de la independencia sudamericana.',
            ],
            [
                'quote' => 'La educación es el arma más poderosa para cambiar el mundo.',
                'author' => 'Nelson Mandela',
                'context' => 'Reflexión atemporal',
                'who' => 'Líder sudafricano (1918-2013). Luchó contra el apartheid, estuvo 27 años preso y se convirtió en el primer presidente negro de Sudáfrica. Premio Nobel de la Paz 1993.',
            ],
        ];

        return $fallbacks[array_rand($fallbacks)];
    }

    /**
     * Format date in Spanish.
     */
    private function formatSpanishDate(\Carbon\Carbon $date): string
    {
        $days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return $days[$date->dayOfWeek] . ', ' . $date->day . ' de ' . self::MONTH_NAMES[$date->month] . ' de ' . $date->year;
    }
}
