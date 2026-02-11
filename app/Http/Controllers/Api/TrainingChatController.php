<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Services\QdrantService;
use App\Helpers\Utf8Helper;

class TrainingChatController extends Controller
{
    private QdrantService $qdrantService;

    public function __construct(QdrantService $qdrantService)
    {
        $this->qdrantService = $qdrantService;
    }

    public function trainingChat(Request $request)
    {
        try {
            $user = Auth::user();
            
            $company = $user->company;
            
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró información de la empresa'
                ], 404);
            }

            $request->validate([
                'message' => 'required|string|max:5000',
                'context' => 'nullable|array', // Contexto de la conversación
            ]);

            // Asegurar encoding UTF-8 correcto ANTES de procesar
            $rawMessage = $request->input('message');
            $userMessage = Utf8Helper::ensureUtf8($rawMessage);
            $context = $request->input('context', []);
            
            // Detectar si el usuario quiere cambiar el nombre del asistente
            $nameChangeResult = $this->detectAndUpdateAssistantName($userMessage, $company);
            if ($nameChangeResult) {
                return response()->json([
                    'success' => true,
                    'response' => $nameChangeResult['response'],
                    'saved_to_knowledge' => false,
                    'name_changed' => true,
                    'new_name' => $nameChangeResult['new_name']
                ]);
            }
            
            $companySlug = $user->company_slug ?? 'default';
            $assistantName = $company->assistant_name ?? 'WITHMIA';
            
            // 🔍 DETECTAR SI ES PREGUNTA (simulación de cliente) vs INFORMACIÓN (entrenamiento)
            $isQuestion = $this->detectIfQuestion($userMessage);
            
            // Si es una pregunta, NO guardar en Qdrant - solo responder con el conocimiento existente
            $deduplicationResult = null;
            if (!$isQuestion) {
                // 🧠 INTELIGENCIA: Detectar duplicados antes de guardar (solo si NO es pregunta)
                $deduplicationResult = $this->intelligentTrainingStorage($userMessage, $company, $companySlug);
            } else {
                Log::debug('TrainingChat - Detected as QUESTION, skipping storage', [
                    'message' => substr($userMessage, 0, 100)
                ]);
                $deduplicationResult = [
                    'action' => 'skip',
                    'point_id' => null,
                    'similarity' => 0,
                    'message' => 'Pregunta detectada - solo responder, no guardar',
                ];
            }
            
            // Obtener configuración de n8n - usar webhook personalizado de la empresa si existe
            $settings = $company->settings ?? [];
            $n8nUrl = config('n8n.public_url');
            
            // Usar la URL de webhook guardada en settings o construir una por defecto
            if (!empty($settings['training_webhook_url'])) {
                $fullUrl = $settings['training_webhook_url'];
            } else {
                $webhookPath = $settings['training_webhook_path'] ?? ('training-' . $companySlug);
                $fullUrl = rtrim($n8nUrl, '/') . '/webhook/' . $webhookPath;
            }

            // Preparar payload para n8n (ahora con información de deduplicación)
            // 🔧 Asegurar encoding UTF-8 en TODOS los campos de texto
            $payload = [
                'company_slug' => $companySlug,
                'assistant_name' => Utf8Helper::ensureUtf8($assistantName),
                'company_name' => Utf8Helper::ensureUtf8($company->name ?? 'la empresa'),
                'user_message' => Utf8Helper::ensureUtf8($userMessage),
                'context' => $context,
                'openai_api_key' => config('services.openai.api_key'),
                'qdrant_host' => config('qdrant.url'),
                'qdrant_api_key' => config('qdrant.api_key'),
                'timestamp' => now()->toIso8601String(),
                // Agregar información de deduplicación
                'deduplication' => $deduplicationResult,
            ];

            // Forzar encoding UTF-8 en JSON
            $jsonPayload = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            
            Log::debug('Sending training message to n8n', [
                'company_slug' => $companySlug,
                'message_length' => strlen($userMessage),
                'json_length' => strlen($jsonPayload),
                'action' => $deduplicationResult['action'],
                'similarity' => $deduplicationResult['similarity'] ?? null,
            ]);

            // Enviar a n8n y esperar respuesta
            try {
                $response = Http::timeout(config('services.timeouts.training', 30))
                    ->withHeaders([
                        'Content-Type' => 'application/json; charset=utf-8',
                        'Accept' => 'application/json',
                    ])
                    ->withBody($jsonPayload, 'application/json')
                    ->post($fullUrl);

                $responseBody = $response->json();
                
                Log::debug('Training response received from n8n', [
                    'status' => $response->status()
                ]);

                // 🔧 Corregir encoding UTF-8/mojibake de la respuesta de n8n
                $rawResponse = $responseBody['response'] ?? $responseBody['message'] ?? 'Entendido. He registrado esta información.';
                $cleanResponse = Utf8Helper::fix($rawResponse);
                
                Log::debug('Response encoding fixed', [
                    'original_length' => strlen($rawResponse),
                    'fixed_length' => strlen($cleanResponse),
                    'had_mojibake' => Utf8Helper::hasMojibake($rawResponse)
                ]);

                return response()->json([
                    'success' => true,
                    'response' => $cleanResponse,
                    'saved_to_knowledge' => $responseBody['saved'] ?? false,
                    'action' => $deduplicationResult['action'],
                    'similarity' => $deduplicationResult['similarity'] ?? null,
                ]);

            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                // Si n8n no está disponible, dar una respuesta por defecto
                Log::warning('n8n training webhook not available: ' . $e->getMessage());
                
                return response()->json([
                    'success' => true,
                    'response' => $this->getDefaultTrainingResponse($userMessage, $assistantName),
                    'saved_to_knowledge' => false,
                    'note' => 'Respuesta local - workflow de entrenamiento no configurado',
                    'action' => $deduplicationResult['action'],
                ]);
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error in training chat: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el mensaje de entrenamiento'
            ], 500);
        }
    }
    
    /**
     * 🧠 DEDUPLICACIÓN INTELIGENTE: Detecta si el mensaje es similar a contenido existente
     * 
     * @param string $message Mensaje del usuario
     * @param \App\Models\Company $company Empresa
     * @param string $companySlug Slug de la empresa
     * @return array ['action' => 'create'|'update', 'point_id' => string, 'similarity' => float]
     */
    private function intelligentTrainingStorage($message, $company, $companySlug)
    {
        try {
            $qdrantService = app(QdrantService::class);
            $collectionName = 'company_' . $companySlug . '_knowledge';
            
            // 1. Generar embedding del mensaje nuevo
            $embedding = $qdrantService->generateEmbedding($message);
            
            // 2. Buscar puntos similares en Qdrant (top 3)
            $qdrantHost = config('qdrant.url');
            
            $searchResponse = Http::timeout(config('services.timeouts.default', 10))
                ->withHeaders(['api-key' => config('qdrant.api_key')])
                ->post("{$qdrantHost}/collections/{$collectionName}/points/search", [
                    'vector' => $embedding,
                    'limit' => 3,
                    'with_payload' => true,
                    'score_threshold' => 0.60,
                ]);
            
            $searchResults = $searchResponse->json();
            $results = $searchResults['result'] ?? [];
            
            // 3. Si no hay resultados similares, crear nuevo punto
            if (empty($results)) {
                // Qdrant requires integer or UUID point IDs
                $newPointId = intval(microtime(true) * 10000) + random_int(1, 9999);
                
                Log::debug('No similar content found - creating new point', [
                    'point_id' => $newPointId,
                    'company_slug' => $companySlug,
                ]);
                
                return [
                    'action' => 'create',
                    'point_id' => $newPointId,
                    'similarity' => 0,
                    'message' => 'Nueva información agregada',
                ];
            }
            
            // 4. Evaluar el punto más similar
            $mostSimilar = $results[0];
            $similarity = $mostSimilar['score'];
            $existingId = $mostSimilar['id'];
            $existingPayload = $mostSimilar['payload'] ?? [];
            
            // 5. Umbral de decisión: 0.70 (70% de similitud = mismo tema)
            if ($similarity >= 0.70) {
                // ES UN DUPLICADO O CORRECCIÓN - Actualizar el punto existente
                Log::debug('Similar content detected - updating existing point', [
                    'point_id' => $existingId,
                    'similarity' => $similarity,
                    'company_slug' => $companySlug,
                    'old_content' => substr($existingPayload['content'] ?? '', 0, 50),
                    'new_content' => substr($message, 0, 50),
                ]);
                
                // Actualizar el punto con el nuevo contenido
                $qdrantService->upsertPoints($collectionName, [[
                    'id' => $existingId,
                    'vector' => $embedding,
                    'payload' => [
                        'content' => $message,
                        'type' => 'training_message',
                        'company_id' => $company->id,
                        'company_slug' => $companySlug,
                        'created_at' => $existingPayload['created_at'] ?? now()->toIso8601String(),
                        'updated_at' => now()->toIso8601String(),
                        'update_count' => ($existingPayload['update_count'] ?? 0) + 1,
                    ]
                ]]);
                
                return [
                    'action' => 'update',
                    'point_id' => $existingId,
                    'similarity' => $similarity,
                    'message' => 'Información actualizada (contenido similar detectado)',
                ];
            } else {
                // ES INFORMACIÓN NUEVA (similarity < 0.85) - Crear nuevo punto
                // Usar timestamp como ID numérico (Qdrant requiere integer o UUID)
                $newPointId = intval(microtime(true) * 10000) + random_int(1, 9999);
                
                Log::debug('Moderately similar content found - creating new point', [
                    'new_point_id' => $newPointId,
                    'similarity_to_existing' => $similarity,
                    'company_slug' => $companySlug,
                ]);
                
                return [
                    'action' => 'create',
                    'point_id' => $newPointId,
                    'similarity' => $similarity,
                    'message' => 'Nueva información agregada (suficientemente diferente)',
                ];
            }
            
        } catch (\Exception $e) {
            // Si falla la deduplicación, crear nuevo punto por defecto
            Log::warning('Deduplication failed, creating new point by default: ' . $e->getMessage());
            
            return [
                'action' => 'create',
                'point_id' => intval(microtime(true) * 10000) + random_int(1, 9999),
                'similarity' => 0,
                'message' => 'Nueva información agregada (deduplicación no disponible)',
            ];
        }
    }

    /**
     * 🔍 DETECTAR SI ES PREGUNTA (simulación de cliente) vs INFORMACIÓN (entrenamiento)
     * 
     * Las preguntas son consultas que el usuario hace para probar el bot, 
     * NO deben guardarse como conocimiento.
     * 
     * La información de entrenamiento son datos que el usuario quiere que el bot aprenda.
     * 
     * @param string $message Mensaje del usuario
     * @return bool True si es pregunta, False si es información para entrenar
     */
    private function detectIfQuestion($message)
    {
        $lowerMessage = mb_strtolower(trim($message), 'UTF-8');
        
        // 1. Detectar signos de interrogación (al inicio o al final)
        if (preg_match('/^¿|^\?|\?$/', $message)) {
            Log::debug('detectIfQuestion: Detected by interrogation marks');
            return true;
        }
        
        // 2. Palabras interrogativas al inicio del mensaje
        $questionStarters = [
            'qué', 'que', 'cuál', 'cual', 'cuáles', 'cuales',
            'cómo', 'como', 'cuándo', 'cuando', 'cuánto', 'cuanto',
            'cuánta', 'cuanta', 'cuántos', 'cuantos', 'cuántas', 'cuantas',
            'dónde', 'donde', 'quién', 'quien', 'quiénes', 'quienes',
            'por qué', 'por que', 'para qué', 'para que',
            'tienen', 'tienes', 'hay', 'existe', 'existen',
            'puedo', 'puedes', 'pueden', 'podría', 'podrían',
            'es posible', 'se puede', 'me pueden', 'me puedes',
        ];
        
        foreach ($questionStarters as $starter) {
            if (str_starts_with($lowerMessage, $starter . ' ') || $lowerMessage === $starter) {
                Log::debug('detectIfQuestion: Detected by question starter', ['starter' => $starter]);
                return true;
            }
        }
        
        // 3. Patrones de preguntas comunes
        $questionPatterns = [
            '/^¿/',                                    // Empieza con ¿
            '/\?$/',                                   // Termina con ?
            '/^(qué|cuál|cómo|cuándo|dónde|quién|por qué|para qué)\s/iu',  // Interrogativas
            '/^(tienen|tienes|hay|existe|puedo|pueden|es posible)\s/iu',   // Verbos de consulta
            '/^(me (pueden|puedes|podrías|podría) (decir|explicar|ayudar))/iu',
            '/^(quisiera saber|necesito saber|me gustaría saber)/iu',
            '/^(a qué hora|cuál es el horario|qué horario)/iu',
            '/horario.*(tienen|tienes|es|son)\s*\??$/iu',  // "¿horario de atención tienen?"
            '/precio.*(tienen|tienes|es|son|cuesta)\s*\??$/iu',
            '/^(está|están|estás) (abierto|disponible|cerrado)/iu',
        ];
        
        foreach ($questionPatterns as $pattern) {
            if (preg_match($pattern, $message)) {
                Log::debug('detectIfQuestion: Detected by pattern', ['pattern' => $pattern]);
                return true;
            }
        }
        
        // 4. Palabras clave de información/entrenamiento (NO es pregunta si tiene estas)
        $trainingKeywords = [
            'nuestro horario es', 'nuestros horarios son', 'el horario es', 'los horarios son',
            'abrimos', 'cerramos', 'trabajamos', 'atendemos',
            'nuestro precio', 'nuestros precios', 'el precio es', 'los precios son', 'cuesta', 'vale',
            'vendemos', 'ofrecemos', 'tenemos disponible',
            'nuestra dirección', 'nuestra direccion', 'estamos ubicados', 'nos ubicamos',
            'nuestro teléfono', 'nuestro telefono', 'llámanos', 'llamanos', 'contáctanos',
            'nuestro email', 'nuestro correo', 'escríbenos', 'escribenos',
            'recuerda que', 'importante:', 'nota:', 'información:',
            'cuando pregunten', 'si alguien pregunta', 'si te preguntan',
            'responde que', 'debes responder', 'responde así', 'la respuesta es',
            'ejemplo:', 'por ejemplo',
        ];
        
        foreach ($trainingKeywords as $keyword) {
            if (stripos($lowerMessage, $keyword) !== false) {
                Log::debug('detectIfQuestion: NOT a question - training keyword found', ['keyword' => $keyword]);
                return false; // Es información de entrenamiento, NO pregunta
            }
        }
        
        // 5. Si el mensaje es muy corto y parece consulta simple
        $wordCount = str_word_count($lowerMessage);
        if ($wordCount <= 5 && (
            stripos($lowerMessage, 'horario') !== false ||
            stripos($lowerMessage, 'precio') !== false ||
            stripos($lowerMessage, 'direccion') !== false ||
            stripos($lowerMessage, 'dirección') !== false ||
            stripos($lowerMessage, 'telefono') !== false ||
            stripos($lowerMessage, 'teléfono') !== false ||
            stripos($lowerMessage, 'abierto') !== false ||
            stripos($lowerMessage, 'cerrado') !== false
        )) {
            Log::debug('detectIfQuestion: Short message looks like question');
            return true;
        }
        
        // Por defecto, asumir que es información de entrenamiento
        return false;
    }

    /**
     * Detecta si el usuario quiere cambiar el nombre del asistente y lo actualiza
     * Retorna null si no hay cambio de nombre, o un array con el resultado si hubo cambio
     */
    private function detectAndUpdateAssistantName($message, $company)
    {
        $lowerMessage = mb_strtolower($message, 'UTF-8');
        
        // Patrones para detectar cambio de nombre
        $patterns = [
            // "te llamas X" / "te llamarás X" / "tu nombre es X" / "tu nombre será X"
            '/(?:te\s+llamas?|te\s+llamar[áa]s|tu\s+nombre\s+(?:es|ser[áa]))\s+["\']?([a-záéíóúñü]+)["\']?/iu',
            // "ahora eres X" / "serás X"
            '/(?:ahora\s+(?:eres|te\s+llamas|ser[áa]s))\s+["\']?([a-záéíóúñü]+)["\']?/iu',
            // "llámame X" (cuando quieren que el bot se llame así)
            '/(?:ll[áa]mate|tu\s+nuevo\s+nombre\s+(?:es|ser[áa]))\s+["\']?([a-záéíóúñü]+)["\']?/iu',
            // "cámbiate el nombre a X" / "cambia tu nombre a X"
            '/(?:c[áa]mbia(?:te)?(?:\s+el)?\s+nombre\s+a)\s+["\']?([a-záéíóúñü]+)["\']?/iu',
            // "de ahora en adelante te llamas X"
            '/(?:de\s+ahora\s+en\s+adelante\s+te\s+llamas?)\s+["\']?([a-záéíóúñü]+)["\']?/iu',
            // "quiero que te llames X"
            '/(?:quiero\s+que\s+te\s+llames?)\s+["\']?([a-záéíóúñü]+)["\']?/iu',
        ];
        
        $newName = null;
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $message, $matches)) {
                $newName = trim($matches[1]);
                break;
            }
        }
        
        // Si no encontramos un nombre, retornamos null
        if (!$newName) {
            return null;
        }
        
        // Capitalizar primera letra
        $newName = mb_convert_case($newName, MB_CASE_TITLE, 'UTF-8');
        
        // Validar que el nombre sea razonable (2-50 caracteres)
        if (mb_strlen($newName) < 2 || mb_strlen($newName) > 50) {
            return null;
        }
        
        $oldName = $company->assistant_name ?? 'WITHMIA';
        
        // Actualizar en la base de datos
        $company->update(['assistant_name' => $newName]);
        
        Log::debug('Assistant name changed via chat', [
            'company_id' => $company->id,
            'old_name' => $oldName,
            'new_name' => $newName
        ]);
        
        // Respuestas variadas para el cambio de nombre
        $responses = [
            "¡Perfecto! Ahora me llamo **{$newName}**. Así me presentaré a tus clientes. 😊",
            "¡Entendido! De ahora en adelante soy **{$newName}**. ¿Hay algo más que deba saber sobre mí?",
            "¡Genial! Mi nuevo nombre es **{$newName}**. Me gusta cómo suena. ¿Qué más te gustaría configurar?",
            "¡Hecho! Ya no soy {$oldName}, ahora soy **{$newName}**. ¿Quieres enseñarme algo más?",
        ];
        
        return [
            'new_name' => $newName,
            'old_name' => $oldName,
            'response' => $responses[array_rand($responses)]
        ];
    }

    /**
     * Genera una respuesta por defecto cuando n8n no está disponible
     */
    private function getDefaultTrainingResponse($userMessage, $assistantName)
    {
        $responses = [
            'Entendido. Voy a recordar eso para mejorar mis respuestas. ¿Hay algo más que deba saber?',
            '¡Gracias por la información! Esto me ayudará a responder mejor a tus clientes.',
            'Perfecto, he registrado esa información. ¿Quieres que practiquemos una conversación de ejemplo?',
            'Muy útil. ¿Podrías darme un ejemplo de cómo debería responder en esa situación?',
            'Excelente. He tomado nota de esto. ¿Qué más te gustaría enseñarme?',
        ];
        
        // Detectar si es una corrección
        $lowerMessage = strtolower($userMessage);
        if (str_contains($lowerMessage, 'no, ') || str_contains($lowerMessage, 'incorrecto') || str_contains($lowerMessage, 'mal ') || str_contains($lowerMessage, 'error')) {
            return "Gracias por la corrección. He actualizado mi conocimiento. ¿Cómo debería responder correctamente en este caso?";
        }
        
        // Detectar si es un ejemplo
        if (str_contains($lowerMessage, 'ejemplo') || str_contains($lowerMessage, 'por ejemplo') || str_contains($lowerMessage, 'así:')) {
            return "Perfecto, he registrado ese ejemplo. Así responderé en situaciones similares. ¿Tienes más ejemplos que compartir?";
        }
        
        return $responses[array_rand($responses)];
    }
}
