<?php

namespace App\Http\Controllers\Api;

use App\Data\VerifiedQuotes;
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
     * Strategy:
     * 1. Fetch ALL births/deaths from Wikipedia (ES + EN always)
     * 2. Check curated quotes DB for verified quotes
     * 3. Send remaining Wikipedia-verified people to OpenAI (index-based)
     * 4. OpenAI only provides quotes/bios — dates ALWAYS come from Wikipedia
     * 5. Static fallback if everything fails
     */
    public function __invoke(Request $request): JsonResponse
    {
        $date = now();
        $monthDay = $date->format('m-d');

        // v8: cache key — only Spanish Wikipedia people
        $poolKey = "daily_quotes_v8_{$monthDay}";
        $counterKey = "daily_quotes_v8_ctr_{$monthDay}";

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
     * Build a pool of quotes for today using Wikipedia-verified people.
     */
    private function buildQuotesPool(\Carbon\Carbon $date): ?array
    {
        $month = (int) $date->format('m');
        $day = (int) $date->format('d');
        $monthPadded = $date->format('m');
        $dayPadded = $date->format('d');
        $monthName = self::MONTH_NAMES[$month];

        // Step 1: Get ALL births/deaths from BOTH Spanish AND English Wikipedia
        $people = $this->fetchAllWikipediaPeople($monthPadded, $dayPadded);

        Log::info('DailyQuote: Wikipedia returned people', [
            'count' => count($people),
            'date' => "{$monthPadded}/{$dayPadded}",
            'sample' => array_map(fn($p) => $p['name'], array_slice($people, 0, 5)),
        ]);

        if (count($people) === 0) {
            Log::warning('DailyQuote: Wikipedia returned 0 people, using static fallback');
            return null;
        }

        // Step 2: Check curated database first
        $pool = [];
        $needsOpenAI = [];

        foreach ($people as $person) {
            $verified = VerifiedQuotes::find($person['name']);

            if ($verified) {
                $typeLabel = $person['type'] === 'birth' ? 'Nacido' : 'Fallecido';
                // ALWAYS use Wikipedia bio — never trust stored bios (they may be wrong)
                $who = $this->buildWikipediaBio($person);
                $pool[] = [
                    'quote' => $verified['quote'],
                    'author' => $person['name'],
                    'context' => "{$typeLabel} el {$day} de {$monthName} de {$person['year']}",
                    'who' => $who,
                ];
            } else {
                $needsOpenAI[] = $person;
            }
        }

        if (count($pool) >= 5) {
            Log::info("DailyQuote: All curated", ['count' => count($pool)]);
            return array_slice($pool, 0, 5);
        }

        // Step 3: Use OpenAI for remaining people (index-based matching)
        $needed = 5 - count($pool);
        if (count($needsOpenAI) > 0 && $needed > 0) {
            // Send up to 20 people so OpenAI can pick the most notable/quotable ones
            $candidates = array_slice($needsOpenAI, 0, 20);
            $aiQuotes = $this->generateQuotesForPeople($candidates, $day, $monthName, $needed + 2);

            if ($aiQuotes) {
                foreach ($aiQuotes as $q) {
                    if (count($pool) >= 5) break;
                    $pool[] = $q;
                }
            }
        }

        if (count($pool) > 0) {
            Log::info('DailyQuote: Pool built', [
                'total' => count($pool),
                'date' => "{$monthPadded}/{$dayPadded}",
            ]);
            return $pool;
        }

        return null;
    }

    /**
     * Fetch births and deaths from Spanish Wikipedia in a SINGLE API call.
     * Sorts by notability (extract length).
     */
    private function fetchAllWikipediaPeople(string $month, string $day): array
    {
        $people = [];
        $seenNames = [];

        try {
            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'WithMIA/1.0 (https://app.withmia.com)'])
                ->get("https://api.wikimedia.org/feed/v1/wikipedia/es/onthisday/all/{$month}/{$day}");

            if (!$response->ok()) {
                Log::warning('DailyQuote: Wikipedia API failed', ['status' => $response->status()]);
                return [];
            }

            $data = $response->json();

            foreach (['births', 'deaths'] as $type) {
                foreach ($data[$type] ?? [] as $entry) {
                    $page = $entry['pages'][0] ?? null;
                    if (!$page || empty($entry['year'])) continue;

                    $name = $page['titles']['normalized']
                        ?? $page['titles']['canonical']
                        ?? $page['title']
                        ?? null;

                    if (!$name) continue;

                    $cleanName = str_replace('_', ' ', $name);
                    $nameLower = mb_strtolower($cleanName);

                    if (str_starts_with($cleanName, 'Anexo:')) continue;
                    if (isset($seenNames[$nameLower])) continue;

                    $extractText = $page['extract'] ?? '';
                    $descText = $page['description'] ?? '';

                    $people[] = [
                        'name' => $cleanName,
                        'year' => (int) $entry['year'],
                        'type' => $type === 'births' ? 'birth' : 'death',
                        'description' => $descText,
                        'extract' => $extractText,
                        'extract_es' => $extractText,
                        'description_es' => $descText,
                    ];
                    $seenNames[$nameLower] = true;
                }
            }
        } catch (\Exception $e) {
            Log::error('DailyQuote: Wikipedia API error', ['error' => $e->getMessage()]);
        }

        usort($people, fn($a, $b) => strlen($b['extract_es']) - strlen($a['extract_es']));

        return array_slice($people, 0, 30);
    }

    /**
     * Generate quotes via OpenAI for Wikipedia-verified people.
     * Uses INDEX-BASED matching to avoid name mismatch issues.
     * Dates ALWAYS come from Wikipedia — OpenAI only provides quotes and bios.
     */
    private function generateQuotesForPeople(array $people, int $day, string $monthName, int $needed): ?array
    {
        $apiKey = config('services.openai.api_key');

        if (empty($apiKey) || count($people) === 0) {
            return null;
        }

        try {
            $client = OpenAI::client($apiKey);

            // Build numbered list for the prompt
            $peopleList = '';
            foreach ($people as $i => $p) {
                $typeLabel = $p['type'] === 'birth' ? 'Nacido' : 'Fallecido';
                $desc = !empty($p['description']) ? " — {$p['description']}" : '';
                $num = $i + 1;
                $peopleList .= "{$num}. {$p['name']} ({$typeLabel} en {$p['year']}{$desc})\n";
            }

            $prompt = <<<PROMPT
De la siguiente lista de personajes históricos, selecciona los {$needed} MÁS NOTABLES y CITABLES (que tengan frases célebres conocidas) y proporciona una cita célebre bien documentada para cada uno.

LISTA DE PERSONAJES (fechas verificadas por Wikipedia para el {$day} de {$monthName}):
{$peopleList}

Para cada personaje seleccionado, responde con:
- "index": El NÚMERO del personaje de la lista (ej: 1, 5, 12)
- "quote": Una cita célebre REAL y bien documentada de esa persona (en español)

REGLAS:
- Selecciona SOLO personajes que tengan citas/frases célebres conocidas y documentadas
- Prefiere científicos, artistas, filósofos, escritores, músicos y líderes famosos mundialmente
- Evita deportistas, políticos menores o personas poco conocidas mundialmente
- Las citas deben ser REALES, no inventadas
- Responde SOLO con JSON array válido

[{"index":1,"quote":"..."},{"index":5,"quote":"..."}]
PROMPT;

            $result = $client->chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un experto en citas históricas verificables. Solo proporcionas citas documentadas en fuentes confiables. Responde SOLO en JSON válido.',
                    ],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'max_tokens' => 1500,
                'temperature' => 0.2,
            ]);

            $content = trim($result->choices[0]->message->content);
            $content = preg_replace('/^```json\s*/i', '', $content);
            $content = preg_replace('/\s*```$/i', '', $content);
            $content = trim($content);

            $quotes = json_decode($content, true);

            if (!is_array($quotes) || count($quotes) === 0) {
                Log::warning('DailyQuote: Invalid JSON from OpenAI', ['content' => substr($content, 0, 300)]);
                return null;
            }

            $validated = [];
            foreach ($quotes as $q) {
                if (!isset($q['index'], $q['quote'])) {
                    continue;
                }

                // INDEX-BASED lookup: map back to Wikipedia-verified person
                $idx = (int) $q['index'] - 1; // Prompt uses 1-based
                if ($idx < 0 || $idx >= count($people)) {
                    Log::info('DailyQuote: Invalid index from OpenAI', ['index' => $q['index']]);
                    continue;
                }

                $person = $people[$idx];
                $typeLabel = $person['type'] === 'birth' ? 'Nacido' : 'Fallecido';

                // Build "who" from Wikipedia data — NEVER trust OpenAI for biography
                $who = $this->buildWikipediaBio($person);

                $validated[] = [
                    'quote' => $q['quote'],
                    'author' => $person['name'], // Wikipedia's name, not OpenAI's
                    'context' => "{$typeLabel} el {$day} de {$monthName} de {$person['year']}", // Wikipedia date
                    'who' => $who,
                ];
            }

            Log::info('DailyQuote: OpenAI quotes generated', [
                'requested' => $needed,
                'ai_returned' => count($quotes),
                'validated' => count($validated),
            ]);

            return count($validated) > 0 ? $validated : null;
        } catch (\Exception $e) {
            Log::error('DailyQuote: OpenAI error', ['error' => $e->getMessage()]);
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
     * Build biography text from Wikipedia data — guaranteed accurate.
     * Never relies on OpenAI for biographical information.
     */
    private function buildWikipediaBio(array $person): string
    {
        // ONLY use Spanish Wikipedia data — English-only people are filtered out upstream
        $extractEs = trim($person['extract_es'] ?? '');
        $descEs = trim($person['description_es'] ?? '');

        // Fallback for legacy format
        if (empty($extractEs)) {
            $extractEs = trim($person['extract'] ?? '');
        }
        if (empty($descEs)) {
            $descEs = trim($person['description'] ?? '');
        }

        if (!empty($extractEs)) {
            return $this->truncateToSentences($extractEs);
        }

        if (!empty($descEs)) {
            return ucfirst($descEs);
        }

        return $person['name'];
    }

    /**
     * Truncate text to first 1-2 sentences (max ~220 chars).
     */
    private function truncateToSentences(string $text): string
    {
        $sentences = preg_split('/(?<=\.)\s+/', $text, 3);
        $bio = $sentences[0] ?? '';
        if (isset($sentences[1]) && mb_strlen($bio . ' ' . $sentences[1]) <= 220) {
            $bio .= ' ' . $sentences[1];
        }
        return mb_strlen($bio) > 0 ? $bio : $text;
    }
}
