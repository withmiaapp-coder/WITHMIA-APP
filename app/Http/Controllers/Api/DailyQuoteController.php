<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use OpenAI;

class DailyQuoteController extends Controller
{
    /**
     * Get a daily inspirational quote.
     * Uses OpenAI to generate quotes about notable people born/died on today's date.
     * Caches multiple quotes per day and rotates them on each request.
     */
    public function __invoke(Request $request)
    {
        $date = now();
        $monthDay = $date->format('m-d');
        $dateLabel = $this->formatSpanishDate($date);

        // Cache key for today's pool of quotes
        $poolKey = "daily_quotes_pool_{$monthDay}";
        $counterKey = "daily_quotes_counter_{$monthDay}";

        // Try to get the cached pool
        $pool = Cache::get($poolKey);

        if (!$pool || count($pool) === 0) {
            // Generate a pool of quotes for today
            $pool = $this->generateQuotesPool($monthDay, $dateLabel);

            if ($pool && count($pool) > 0) {
                // Cache until end of day
                $minutesUntilMidnight = now()->diffInMinutes(now()->endOfDay());
                Cache::put($poolKey, $pool, $minutesUntilMidnight * 60);
                Cache::put($counterKey, 0, $minutesUntilMidnight * 60);
            } else {
                // Fallback
                return response()->json($this->getFallbackQuote());
            }
        }

        // Rotate: get current index and advance
        $index = Cache::get($counterKey, 0);
        $quote = $pool[$index % count($pool)];
        Cache::put($counterKey, ($index + 1) % count($pool), now()->diffInMinutes(now()->endOfDay()) * 60);

        return response()->json($quote);
    }

    /**
     * Generate a pool of 5 quotes from notable people born/died on this date.
     */
    private function generateQuotesPool(string $monthDay, string $dateLabel): ?array
    {
        $apiKey = config('services.openai.api_key');

        if (empty($apiKey)) {
            Log::warning('DailyQuote: OpenAI API key not configured');
            return null;
        }

        try {
            $client = OpenAI::client($apiKey);

            // Parse month/day for prompt
            $parts = explode('-', $monthDay);
            $month = (int) $parts[0];
            $day = (int) $parts[1];

            $monthNames = [
                1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril',
                5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto',
                9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
            ];
            $monthName = $monthNames[$month] ?? 'enero';

            $prompt = <<<PROMPT
Hoy es {$day} de {$monthName}. Necesito información sobre 5 personajes históricos DIFERENTES que nacieron o fallecieron este mismo día ({$day} de {$monthName}) a lo largo de la historia. 

Para cada uno, dame:
1. Una cita célebre REAL de esa persona (no inventada)
2. Su nombre completo
3. Por qué aparece hoy (ej: "Nacido el {$day} de {$monthName} de 1879")
4. Una mini biografía de 1-2 líneas explicando quién fue y su contribución más importante

IMPORTANTE:
- Solo incluye personas que REALMENTE nacieron o murieron el {$day} de {$monthName}. Verifica las fechas.
- Las citas deben ser REALES y verificables, no inventadas.
- Incluye variedad: científicos, artistas, filósofos, líderes, escritores, músicos, inventores.
- Las biografías deben ser concisas pero informativas.
- Todo en español.

Responde SOLO con un JSON array válido, sin markdown ni explicación. Formato exacto:
[
  {
    "quote": "La cita textual en español",
    "author": "Nombre Completo",
    "context": "Nacido/Fallecido el {$day} de {$monthName} de XXXX",
    "who": "Breve biografía de 1-2 líneas sobre quién fue y su contribución principal."
  }
]
PROMPT;

            $result = $client->chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un historiador experto con conocimiento enciclopédico de efemérides, fechas de nacimiento y muerte de personajes históricos. Siempre verificas las fechas antes de responder. Respondes SOLO en JSON válido.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt,
                    ],
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
                Log::warning('DailyQuote: Invalid JSON from OpenAI', ['content' => $content]);
                return null;
            }

            // Validate structure
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
            Log::error('DailyQuote: OpenAI error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Fallback quote if OpenAI fails.
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
        $months = [
            1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril',
            5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto',
            9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
        ];

        return $days[$date->dayOfWeek] . ', ' . $date->day . ' de ' . $months[$date->month] . ' de ' . $date->year;
    }
}
