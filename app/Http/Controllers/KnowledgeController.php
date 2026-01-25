<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Services\QdrantService;
use App\Helpers\Utf8Helper;

class KnowledgeController extends Controller
{
    private $qdrantHost;

    public function __construct()
    {
        $this->qdrantHost = rtrim(env('QDRANT_HOST', 'http://localhost:6333'), '/');
    }

    /**
     * Ensure Qdrant collection exists for company, create if not
     */
    private function ensureQdrantCollection($companySlug)
    {
        $collectionName = "company_{$companySlug}_knowledge";
        
        try {
            // Check if collection exists
            $response = Http::get("{$this->qdrantHost}/collections/{$collectionName}");
            
            if ($response->successful()) {
                Log::info("Qdrant collection {$collectionName} already exists");
                return true;
            }
            
            // Collection doesn't exist, create it
            Log::info("Creating Qdrant collection: {$collectionName}");
            
            $createResponse = Http::put("{$this->qdrantHost}/collections/{$collectionName}", [
                'vectors' => [
                    'size' => 1536,  // OpenAI text-embedding-3-small dimension
                    'distance' => 'Cosine'
                ]
            ]);
            
            if ($createResponse->successful()) {
                Log::info("Successfully created Qdrant collection: {$collectionName}");
                return true;
            } else {
                Log::error("Failed to create Qdrant collection: " . $createResponse->body());
                return false;
            }
            
        } catch (\Exception $e) {
            Log::error("Error ensuring Qdrant collection {$collectionName}: " . $e->getMessage());
            return false;
        }
    }
    /**
     * Get current user's company onboarding data
     */
    public function getOnboardingData(Request $request)
    {
        try {
            $user = Auth::user();
            Log::info('getOnboardingData - User ID: ' . $user->id . ', Company Slug: ' . $user->company_slug);
            
            $company = $user->company;
            
            if (!$company) {
                Log::error('getOnboardingData - No company found for user ' . $user->id);
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró información de la empresa'
                ], 404);
            }

            $responseData = [
                'company_name' => $company->name ?? '',
                'company_description' => $company->description ?? '',
                'has_website' => !empty($company->website),
                'website' => $company->website ?? '',
                'client_type' => $company->client_type ?? null,
                'logo_url' => $company->logo_url ?? null,
                'assistant_name' => $company->assistant_name ?? 'WITHMIA'
            ];
            
            Log::info('getOnboardingData - Response:', $responseData);

            return response()->json([
                'success' => true,
                'data' => $responseData
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching onboarding data: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener datos de onboarding'
            ], 500);
        }
    }

    /**
     * Update current user's company onboarding data
     */
    public function updateOnboardingData(Request $request)
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

            $validated = $request->validate([
                'company_name' => 'nullable|string|max:255',
                'company_description' => 'nullable|string|max:2000',
                'has_website' => 'nullable|boolean',
                'website' => 'nullable|url|max:500',
                'client_type' => 'nullable|in:interno,externo',
                'assistant_name' => 'nullable|string|max:100'
            ]);

            // Map fields to company table columns
            $updateData = [];
            if (isset($validated['company_name'])) $updateData['name'] = $validated['company_name'];
            if (isset($validated['company_description'])) $updateData['description'] = $validated['company_description'];
            if (isset($validated['website'])) $updateData['website'] = $validated['website'];
            if (isset($validated['client_type'])) $updateData['client_type'] = $validated['client_type'];
            if (isset($validated['assistant_name'])) $updateData['assistant_name'] = $validated['assistant_name'];

            $company->update($updateData);

            // Actualizar información de la empresa en Qdrant
            $this->updateCompanyInfoInQdrant($company);

            return response()->json([
                'success' => true,
                'message' => 'Datos actualizados correctamente',
                'data' => [
                    'company_name' => $company->name,
                    'company_description' => $company->description,
                    'has_website' => !empty($company->website),
                    'website' => $company->website,
                    'client_type' => $company->client_type,
                    'assistant_name' => $company->assistant_name ?? 'WITHMIA'
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating onboarding data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar datos'
            ], 500);
        }
    }

    /**
     * Send company information to Qdrant for AI training
     * Creates a knowledge point with company name, description, and website
     * First removes any existing "empresa" category points to avoid duplicates
     */
    private function sendCompanyInfoToQdrant($company, $user)
    {
        try {
            // Build the company info text for the knowledge base
            $assistantName = $company->assistant_name ?? 'WITHMIA';
            
            $companyText = "INFORMACIÓN DE LA EMPRESA Y ASISTENTE\n\n";
            $companyText .= "Nombre del Asistente de IA: " . $assistantName . "\n\n";
            $companyText .= "Nombre de la Empresa: " . ($company->name ?? 'No especificado') . "\n\n";
            
            if (!empty($company->website)) {
                $companyText .= "Sitio Web: " . $company->website . "\n\n";
            }
            
            if (!empty($company->description)) {
                $companyText .= "Descripción de la Empresa: " . $company->description . "\n\n";
            }
            
            if (!empty($company->client_type)) {
                $clientTypeText = $company->client_type === 'interno' ? 'Clientes internos (empleados)' : 'Clientes externos';
                $companyText .= "Tipo de Clientes: " . $clientTypeText . "\n\n";
            }
            
            $companyText .= "IMPORTANTE: Cuando respondas, debes identificarte como " . $assistantName . ", el asistente de inteligencia artificial de " . ($company->name ?? 'la empresa') . ".\n";

            // Don't send if there's no meaningful content
            if (strlen($companyText) < 60) {
                Log::info('Company info too short to send to Qdrant');
                return;
            }

            $companySlug = $user->company_slug ?? 'default';
            $qdrantHost = env('QDRANT_HOST', 'https://qdrant-production-f4e7.up.railway.app');
            $collectionName = 'company_' . preg_replace('/[^a-z0-9_-]/i', '_', strtolower($companySlug)) . '_knowledge';
            
            // First, delete existing "empresa" category points to avoid duplicates
            $this->deleteCompanyInfoFromQdrant($qdrantHost, $collectionName);

            // Get n8n configuration - use company-specific webhook
            $n8nUrl = env('N8N_PUBLIC_URL', 'https://n8n-production-00dd.up.railway.app');
            
            // Use webhook path from company settings if available, otherwise use default pattern
            $webhookPath = $company->settings['rag_webhook_path'] ?? ('rag-' . $companySlug);
            $fullUrl = rtrim($n8nUrl, '/') . '/webhook/' . ltrim($webhookPath, '/');

            // Prepare the payload (same structure as document uploads)
            $payload = [
                'company_slug' => $companySlug,
                'filename' => 'informacion_empresa.txt',
                'category' => 'empresa',
                'text' => $companyText,
                'openai_api_key' => env('OPENAI_API_KEY'),
                'qdrant_host' => $qdrantHost,
            ];

            Log::info('Sending company info to Qdrant via n8n', [
                'company_slug' => $user->company_slug,
                'text_length' => strlen($companyText)
            ]);

            // Send to n8n webhook (async, don't wait for response)
            $client = new \GuzzleHttp\Client(['timeout' => 5]);
            $client->postAsync($fullUrl, [
                'json' => $payload,
                'headers' => [
                    'Content-Type' => 'application/json; charset=utf-8',
                ]
            ])->wait(false); // Don't block

            Log::info('Company info sent to Qdrant successfully');

        } catch (\Exception $e) {
            // Log but don't fail the main request
            Log::error('Error sending company info to Qdrant: ' . $e->getMessage());
        }
    }

    /**
     * Actualizar información de la empresa directamente en Qdrant (sobrescribe, no duplica)
     */
    private function updateCompanyInfoInQdrant($company)
    {
        try {
            $qdrantService = app(QdrantService::class);
            
            // Obtener el nombre de la colección
            $collectionName = $company->settings['qdrant_collection'] ?? null;
            
            if (!$collectionName) {
                Log::warning('No Qdrant collection found for company', ['company_id' => $company->id]);
                return;
            }

            // Construir el texto con toda la información de la empresa
            $companyInfoParts = [];
            
            if (!empty($company->assistant_name)) {
                $companyInfoParts[] = "Nombre del Asistente: {$company->assistant_name}";
            }
            
            if (!empty($company->name)) {
                $companyInfoParts[] = "Nombre de la Empresa: {$company->name}";
            }
            
            if (!empty($company->website)) {
                $companyInfoParts[] = "Sitio Web: {$company->website}";
            }
            
            if (!empty($company->description)) {
                $companyInfoParts[] = "Descripción de la Empresa: {$company->description}";
            }

            if (!empty($company->client_type)) {
                $clientTypeText = $company->client_type === 'interno' ? 'Interno - Para tus clientes finales' : 'Externo - Para tus clientes finales';
                $companyInfoParts[] = "Tipo de Cliente: {$clientTypeText}";
            }
            
            if (empty($companyInfoParts)) {
                Log::info("No company info to update in Qdrant for company {$company->id}");
                return;
            }

            $companyInfoText = implode("\n\n", $companyInfoParts);
            
            // UPSERT en Qdrant (mismo ID = sobrescribe, no duplica)
            // Usar ID numérico porque Qdrant no acepta strings como ID
            $pointId = $company->id;
            
            $insertResult = $qdrantService->upsertPoints($collectionName, [
                [
                    'id' => $pointId,
                    'vector' => $qdrantService->generateEmbedding($companyInfoText),
                    'payload' => [
                        'text' => $companyInfoText,
                        'source' => 'company_onboarding',
                        'type' => 'company_information',
                        'company_id' => $company->id,
                        'updated_at' => now()->toIso8601String(),
                    ]
                ]
            ]);

            if ($insertResult['success']) {
                Log::info("✅ Company information updated in Qdrant (upsert with same ID)", [
                    'company_id' => $company->id,
                    'collection' => $collectionName
                ]);
            } else {
                Log::error("❌ Failed to update company info in Qdrant: " . ($insertResult['error'] ?? 'Unknown'));
            }
        } catch (\Exception $e) {
            Log::error("❌ Exception updating company info in Qdrant: " . $e->getMessage());
        }
    }

    /**
     * Delete existing company info (category="empresa") from Qdrant before updating
     * This ensures only one version of company info exists at a time
     */
    private function deleteCompanyInfoFromQdrant($qdrantHost, $collectionName)
    {
        try {
            $client = new \GuzzleHttp\Client(['timeout' => 10]);
            
            // Delete all points with category = "empresa"
            $deleteUrl = rtrim($qdrantHost, '/') . '/collections/' . $collectionName . '/points/delete';
            
            $response = $client->post($deleteUrl, [
                'json' => [
                    'filter' => [
                        'must' => [
                            [
                                'key' => 'category',
                                'match' => [
                                    'value' => 'empresa'
                                ]
                            ]
                        ]
                    ]
                ],
                'headers' => [
                    'Content-Type' => 'application/json; charset=utf-8',
                ]
            ]);

            Log::info('Deleted existing company info from Qdrant', [
                'collection' => $collectionName,
                'status' => $response->getStatusCode()
            ]);

        } catch (\Exception $e) {
            // Log but don't fail - collection might not exist yet or no points to delete
            Log::warning('Could not delete existing company info from Qdrant: ' . $e->getMessage());
        }
    }

    /**
     * Training Chat - Procesa mensajes de entrenamiento y genera respuestas del agente
     * Guarda las interacciones en Qdrant para mejorar el conocimiento del bot
     */
    public function trainingChat(Request $request)
    {
        Log::info('🔴🔴🔴 TrainingChat ENTRANDO');
        
        // 🔧 DEBUG: Log raw request body
        $rawBody = $request->getContent();
        Log::info('TrainingChat - RAW BODY', [
            'raw_body_length' => strlen($rawBody),
            'raw_body_hex' => bin2hex(substr($rawBody, 0, 200)),
            'raw_body_preview' => substr($rawBody, 0, 300),
        ]);
        
        try {
            $user = Auth::user();
            Log::info('TrainingChat - User: ' . ($user ? $user->id : 'NULL'));
            
            $company = $user->company;
            Log::info('TrainingChat - Company: ' . ($company ? $company->slug : 'NULL'));
            
            if (!$company) {
                Log::error('TrainingChat - No company found');
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró información de la empresa'
                ], 404);
            }

            $request->validate([
                'message' => 'required|string|max:5000',
                'context' => 'nullable|array', // Contexto de la conversación
            ]);

            // 🔧 IMPORTANTE: Asegurar encoding UTF-8 correcto ANTES de procesar
            $rawMessage = $request->input('message');
            $userMessage = Utf8Helper::ensureUtf8($rawMessage);
            
            // Log para debug de encoding
            Log::info('TrainingChat - Message encoding', [
                'raw_length' => strlen($rawMessage),
                'fixed_length' => strlen($userMessage),
                'raw_bytes' => bin2hex(substr($rawMessage, 0, 50)),
                'message_preview' => substr($userMessage, 0, 100)
            ]);
            $context = $request->input('context', []);
            
            // 🔄 Detectar si el usuario quiere cambiar el nombre del asistente
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
                Log::info('TrainingChat - Detected as QUESTION, skipping storage', [
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
            $n8nUrl = env('N8N_PUBLIC_URL', 'https://n8n-production-00dd.up.railway.app');
            
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
                'openai_api_key' => env('OPENAI_API_KEY'),
                'qdrant_host' => env('QDRANT_HOST', 'https://qdrant-production-f4e7.up.railway.app'),
                'timestamp' => now()->toIso8601String(),
                // Agregar información de deduplicación
                'deduplication' => $deduplicationResult,
            ];

            // Forzar encoding UTF-8 en JSON
            $jsonPayload = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            
            Log::info('Sending training message to n8n', [
                'company_slug' => $companySlug,
                'message_length' => strlen($userMessage),
                'json_length' => strlen($jsonPayload),
                'action' => $deduplicationResult['action'],
                'similarity' => $deduplicationResult['similarity'] ?? null,
            ]);

            // Enviar a n8n y esperar respuesta
            $client = new \GuzzleHttp\Client(['timeout' => 30]);
            
            try {
                // 🔧 Usar body raw con JSON pre-codificado para preservar UTF-8
                $response = $client->post($fullUrl, [
                    'body' => $jsonPayload,
                    'headers' => [
                        'Content-Type' => 'application/json; charset=utf-8',
                        'Accept' => 'application/json',
                    ]
                ]);

                $responseBody = json_decode($response->getBody()->getContents(), true);
                
                Log::info('Training response received from n8n', [
                    'status' => $response->getStatusCode()
                ]);

                // 🔧 Corregir encoding UTF-8/mojibake de la respuesta de n8n
                $rawResponse = $responseBody['response'] ?? $responseBody['message'] ?? 'Entendido. He registrado esta información.';
                $cleanResponse = Utf8Helper::fix($rawResponse);
                
                Log::info('Response encoding fixed', [
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

            } catch (\GuzzleHttp\Exception\ConnectException $e) {
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
            $collectionName = 'knowledge_' . $companySlug;
            
            // 1. Generar embedding del mensaje nuevo
            $embedding = $qdrantService->generateEmbedding($message);
            
            // 2. Buscar puntos similares en Qdrant (top 3)
            $qdrantHost = env('QDRANT_HOST', 'https://qdrant-production-f4e7.up.railway.app');
            $client = new \GuzzleHttp\Client(['timeout' => 10]);
            
            $searchResponse = $client->post("{$qdrantHost}/collections/{$collectionName}/points/search", [
                'json' => [
                    'vector' => $embedding,
                    'limit' => 3,
                    'with_payload' => true,
                    'score_threshold' => 0.75, // Solo considerar si la similitud es > 75%
                ]
            ]);
            
            $searchResults = json_decode($searchResponse->getBody()->getContents(), true);
            $results = $searchResults['result'] ?? [];
            
            // 3. Si no hay resultados similares, crear nuevo punto
            if (empty($results)) {
                $newPointId = 'training_' . time() . '_' . bin2hex(random_bytes(4));
                
                Log::info('No similar content found - creating new point', [
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
            
            // 5. Umbral de decisión: 0.85 (85% de similitud)
            if ($similarity >= 0.85) {
                // ES UN DUPLICADO O CORRECCIÓN - Actualizar el punto existente
                Log::info('Similar content detected - updating existing point', [
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
                
                Log::info('Moderately similar content found - creating new point', [
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
            Log::info('detectIfQuestion: Detected by interrogation marks');
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
                Log::info('detectIfQuestion: Detected by question starter', ['starter' => $starter]);
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
                Log::info('detectIfQuestion: Detected by pattern', ['pattern' => $pattern]);
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
                Log::info('detectIfQuestion: NOT a question - training keyword found', ['keyword' => $keyword]);
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
            Log::info('detectIfQuestion: Short message looks like question');
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
        
        Log::info('Assistant name changed via chat', [
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

    /**
     * Upload company logo - saves as base64 data URL in database
     */
    public function uploadCompanyLogo(Request $request)
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
                'logo' => 'required|image|max:2048' // Max 2MB
            ]);

            $file = $request->file('logo');
            
            // Convert image to base64 data URL (persists in database, survives deploys)
            $imageData = file_get_contents($file->getRealPath());
            $mimeType = $file->getMimeType();
            $base64 = base64_encode($imageData);
            $logoUrl = 'data:' . $mimeType . ';base64,' . $base64;
            
            // Update company logo_url with base64 data
            $company->update(['logo_url' => $logoUrl]);

            Log::info('Logo uploaded successfully as base64', [
                'company_id' => $company->id,
                'mime_type' => $mimeType,
                'size_bytes' => strlen($imageData)
            ]);

            return response()->json([
                'success' => true,
                'logo_url' => $logoUrl,
                'message' => 'Logo subido correctamente'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Archivo inválido',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error uploading company logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al subir el logo'
            ], 500);
        }
    }

    /**
     * Get documents for current user/company filtered by category
     */
    public function getDocuments(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $category = $request->query('category');

            $query = DB::table('knowledge_documents')
                ->where('company_id', $company->id);

            if ($category) {
                $query->where('category', $category);
            }

            $documents = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'documents' => $documents
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching documents: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener documentos'
            ], 500);
        }
    }

    /**
     * Delete a document
     */
    public function deleteDocument(Request $request, $documentId)
    {
        try {
            $user = Auth::user();
            
            Log::info('deleteDocument called', [
                'documentId' => $documentId,
                'user' => $user ? $user->id : null,
                'auth_check' => Auth::check(),
                'has_token' => $request->header('X-Railway-Auth-Token') ? 'yes' : 'no'
            ]);
            
            if (!$user) {
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }
            
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            // Verify document belongs to user's company
            $document = DB::table('knowledge_documents')
                ->where('id', $documentId)
                ->where('company_id', $company->id)
                ->first();

            if (!$document) {
                return response()->json([
                    'success' => false,
                    'error' => 'Documento no encontrado'
                ], 404);
            }

            // Delete vectors from Qdrant using stored vector IDs
            try {
                $companySlug = $company->slug ?? 'company_' . $company->id;
                $collectionName = $document->qdrant_collection ?? "company_{$companySlug}_knowledge";
                $qdrantUrl = rtrim(env('QDRANT_HOST', 'http://localhost:6333'), '/');

                // Get vector IDs from qdrant_vector_ids column (JSON array)
                if (!empty($document->qdrant_vector_ids)) {
                    $vectorIds = json_decode($document->qdrant_vector_ids, true);
                    
                    if (is_array($vectorIds) && count($vectorIds) > 0) {
                        // Delete points by IDs
                        $ch = curl_init("{$qdrantUrl}/collections/{$collectionName}/points/delete");
                        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
                        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                            'points' => $vectorIds
                        ]));
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

                        $qdrantResponse = curl_exec($ch);
                        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        curl_close($ch);

                        if ($httpCode != 200 && $httpCode != 201) {
                            Log::warning("Failed to delete from Qdrant: " . $qdrantResponse);
                        } else {
                            Log::info("Deleted " . count($vectorIds) . " vectors from Qdrant for document: " . $document->filename);
                        }
                    }
                } else {
                    Log::warning("No vector IDs stored for document: " . $document->filename);
                }
            } catch (\Exception $e) {
                Log::warning('Error deleting from Qdrant: ' . $e->getMessage());
                // Continue even if Qdrant deletion fails
            }            // Delete from database
            DB::table('knowledge_documents')->where('id', $documentId)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Documento eliminado correctamente'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al eliminar documento'
            ], 500);
        }
    }

    /**
     * Store document metadata after successful upload to N8N
     * This endpoint is called by the frontend AFTER the N8N webhook succeeds
     */
    public function storeDocumentMetadata(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            // Use company slug for Qdrant collection naming
            $companySlug = $company->slug ?? 'company_' . $company->id;

            // Ensure Qdrant collection exists for this company
            $this->ensureQdrantCollection($companySlug);

            $validated = $request->validate([
                'filename' => 'required|string|max:255',
                'category' => 'required|in:historia,producto,informacion,desarrollo',
                'chunks_created' => 'nullable|integer',
                'qdrant_collection' => 'nullable|string'
            ]);

            $documentId = DB::table('knowledge_documents')->insertGetId([
                'company_id' => $company->id,
                'title' => pathinfo($validated['filename'], PATHINFO_FILENAME),
                'filename' => $validated['filename'],
                'category' => $validated['category'],
                'chunks_created' => $validated['chunks_created'] ?? 0,
                'qdrant_collection' => $validated['qdrant_collection'] ?? "company_{$companySlug}_knowledge",
                'file_path' => "/documents/{$companySlug}/{$validated['category']}/{$validated['filename']}",
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Metadata guardada correctamente',
                'document_id' => $documentId
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error storing document metadata: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al guardar metadata'
            ], 500);
        }
    }

    /**
     * Update vector IDs after N8N processing is complete
     * This is called in the background when n8n finishes processing
     */
    public function updateVectorIds(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;

            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $validated = $request->validate([
                'filename' => 'required|string|max:255',
                'vector_ids' => 'required|array',
                'chunks_created' => 'nullable|integer'
            ]);

            $updated = DB::table('knowledge_documents')
                ->where('company_id', $company->id)
                ->where('filename', $validated['filename'])
                ->update([
                    'qdrant_vector_ids' => json_encode($validated['vector_ids']),
                    'chunks_created' => $validated['chunks_created'] ?? 0,
                    'updated_at' => now()
                ]);

            if ($updated) {
                Log::info("Updated vector IDs for document: {$validated['filename']}, IDs count: " . count($validated['vector_ids']));
                return response()->json([
                    'success' => true,
                    'message' => 'Vector IDs actualizados correctamente'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Documento no encontrado'
                ], 404);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating vector IDs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar vector IDs'
            ], 500);
        }
    }

    /**
     * Update vector IDs from n8n webhook (no authentication required, uses secret token)
     * This endpoint is called by n8n after processing is complete
     */
    public function updateVectorIdsWebhook(Request $request)
    {
        try {
            // Verify secret token
            $token = $request->header('X-N8N-Secret') ?? $request->input('secret_token');
            if ($token !== 'withmia_n8n_secret_2024') {
                return response()->json(['success' => false, 'error' => 'Invalid token'], 401);
            }

            $validated = $request->validate([
                'company_id' => 'required|integer',
                'filename' => 'required|string|max:255',
                'vector_ids' => 'required|array',
                'chunks_created' => 'nullable|integer'
            ]);

            $updated = DB::table('knowledge_documents')
                ->where('company_id', $validated['company_id'])
                ->where('filename', $validated['filename'])
                ->update([
                    'qdrant_vector_ids' => json_encode($validated['vector_ids']),
                    'chunks_created' => $validated['chunks_created'] ?? 0,
                    'updated_at' => now()
                ]);

            if ($updated) {
                Log::info("N8N updated vector IDs for document: {$validated['filename']}, IDs count: " . count($validated['vector_ids']));
                return response()->json([
                    'success' => true,
                    'message' => 'Vector IDs actualizados correctamente'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Documento no encontrado'
                ], 404);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating vector IDs from n8n: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar vector IDs'
            ], 500);
        }
    }

    /**
     * Store chunk notification from n8n (no authentication required)
     * Called by n8n after each chunk is stored in Qdrant
     */
    public function chunkStored(Request $request)
    {
        try {
            $validated = $request->validate([
                'company_slug' => 'required|string',
                'filename' => 'required|string|max:255',
                'chunk_id' => 'required|string',
                'chunk_index' => 'required|integer'
            ]);

            // Find company by slug
            $company = DB::table('companies')->where('slug', $validated['company_slug'])->first();
            
            if (!$company) {
                Log::warning("Chunk stored - Company not found: {$validated['company_slug']}");
                return response()->json(['success' => false, 'error' => 'Company not found'], 404);
            }

            // Find or create document record
            $document = DB::table('knowledge_documents')
                ->where('company_id', $company->id)
                ->where('filename', $validated['filename'])
                ->first();

            if ($document) {
                // Update existing document - increment chunks and add vector ID
                $existingVectorIds = $document->qdrant_vector_ids ? json_decode($document->qdrant_vector_ids, true) : [];
                $existingVectorIds[] = $validated['chunk_id'];
                
                DB::table('knowledge_documents')
                    ->where('id', $document->id)
                    ->update([
                        'qdrant_vector_ids' => json_encode($existingVectorIds),
                        'chunks_created' => $validated['chunk_index'] + 1,
                        'updated_at' => now()
                    ]);
                    
                Log::info("Chunk stored for document {$validated['filename']}, chunk {$validated['chunk_index']}");
            } else {
                // Document not found - this shouldn't happen normally
                // Create it anyway to not lose data
                $collectionName = "company_{$validated['company_slug']}_knowledge";
                
                DB::table('knowledge_documents')->insert([
                    'company_id' => $company->id,
                    'title' => pathinfo($validated['filename'], PATHINFO_FILENAME),
                    'filename' => $validated['filename'],
                    'category' => 'informacion', // Valid values: historia, producto, informacion, desarrollo
                    'chunks_created' => 1,
                    'qdrant_collection' => $collectionName,
                    'qdrant_vector_ids' => json_encode([$validated['chunk_id']]),
                    'file_path' => "/documents/{$validated['company_slug']}/informacion/{$validated['filename']}",
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                Log::info("Created new document record for {$validated['filename']}");
            }

            return response()->json([
                'success' => true,
                'message' => 'Chunk stored notification received'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error processing chunk stored notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error processing notification'
            ], 500);
        }
    }

    /**
     * Proxy request to n8n RAG webhook to avoid CORS issues
     * Creates a company-specific workflow if it doesn't exist
     */
    public function proxyToN8n(Request $request)
    {
        Log::info("proxyToN8n called", [
            'has_user' => Auth::check(),
            'request_method' => $request->method(),
            'has_file' => $request->has('file'),
            'filename' => $request->input('filename'),
        ]);
        
        try {
            $user = Auth::user();
            
            if (!$user) {
                Log::error("proxyToN8n: User not authenticated");
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }
            
            Log::info("proxyToN8n: User authenticated", ['user_id' => $user->id, 'email' => $user->email]);
            
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $companySlug = $company->slug ?? 'company_' . $company->id;
            $companyName = $company->name ?? $companySlug;
            
            // Get n8n configuration
            $n8nUrl = env('N8N_PUBLIC_URL', 'https://n8n-production-00dd.up.railway.app');
            $n8nApiKey = env('N8N_API_KEY');

            // Get OpenAI API key - company specific or fallback to global
            $openaiApiKey = $company->settings['openai_api_key'] ?? env('OPENAI_API_KEY');
            
            if (!$openaiApiKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'No hay API key de OpenAI configurada para esta empresa'
                ], 400);
            }

            // Get Qdrant host
            $qdrantHost = $company->settings['qdrant_host'] ?? env('QDRANT_HOST', 'https://qdrant-production-f4e7.up.railway.app');
            $qdrantApiKey = $company->settings['qdrant_api_key'] ?? env('QDRANT_API_KEY', '');

            // Check if company has a workflow, if not create one
            $webhookPath = $company->settings['rag_webhook_path'] ?? null;
            $workflowId = $company->settings['rag_workflow_id'] ?? null;

            // Verify workflow still exists in n8n
            if ($workflowId && $n8nApiKey) {
                try {
                    $checkResponse = Http::withHeaders([
                        'X-N8N-API-KEY' => $n8nApiKey
                    ])->get("{$n8nUrl}/api/v1/workflows/{$workflowId}");
                    
                    if (!$checkResponse->successful()) {
                        // Workflow was deleted, clear settings
                        Log::info("Workflow {$workflowId} not found in n8n, will create new one");
                        $settings = $company->settings ?? [];
                        unset($settings['rag_workflow_id']);
                        unset($settings['rag_webhook_path']);
                        unset($settings['rag_workflow_name']);
                        $company->settings = $settings;
                        $company->save();
                        
                        $webhookPath = null;
                        $workflowId = null;
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not verify workflow existence: " . $e->getMessage());
                }
            }

            if (!$webhookPath || !$workflowId) {
                // Antes de crear, buscar si ya existe un workflow RAG para esta empresa en N8N
                try {
                    $searchResponse = Http::withHeaders([
                        'X-N8N-API-KEY' => $n8nApiKey
                    ])->get("{$n8nUrl}/api/v1/workflows");
                    
                    if ($searchResponse->successful()) {
                        $workflows = $searchResponse->json()['data'] ?? [];
                        $expectedName = "RAG Documents - {$companySlug}";
                        
                        foreach ($workflows as $wf) {
                            if (stripos($wf['name'] ?? '', "RAG Documents - {$companySlug}") !== false || 
                                stripos($wf['name'] ?? '', $expectedName) !== false) {
                                // Encontramos un workflow existente, recuperar su info
                                Log::info("Workflow RAG existente encontrado en N8N: {$wf['id']} - {$wf['name']}");
                                
                                // Extraer webhook path del workflow
                                $existingWebhookPath = null;
                                foreach ($wf['nodes'] ?? [] as $node) {
                                    if ($node['type'] === 'n8n-nodes-base.webhook') {
                                        $existingWebhookPath = $node['parameters']['path'] ?? null;
                                        break;
                                    }
                                }
                                
                                // Guardar en settings de la empresa
                                $settings = $company->settings ?? [];
                                $settings['rag_workflow_id'] = $wf['id'];
                                $settings['rag_webhook_path'] = $existingWebhookPath;
                                $settings['rag_workflow_name'] = $wf['name'];
                                $company->settings = $settings;
                                $company->save();
                                
                                $workflowId = $wf['id'];
                                $webhookPath = $existingWebhookPath;
                                break;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not search for existing workflows: " . $e->getMessage());
                }
            }

            // Solo crear si definitivamente no existe
            if (!$webhookPath || !$workflowId) {
                // Create company-specific workflow
                Log::info("Creando nuevo workflow RAG para {$companySlug} - no se encontró existente");
                $result = $this->createCompanyWorkflow($company, $companySlug, $companyName, $n8nUrl, $n8nApiKey);
                
                if (!$result['success']) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Error al crear workflow: ' . $result['error']
                    ], 500);
                }
                
                $webhookPath = $result['webhook_path'];
                $workflowId = $result['workflow_id'];
            }

            $webhookUrl = "{$n8nUrl}/webhook/{$webhookPath}";

            $validated = $request->validate([
                'category' => 'required|string',
                'filename' => 'required|string',
                'file' => 'required|string', // base64 content
            ]);

            Log::info("Processing RAG request for {$validated['filename']}", [
                'company_slug' => $companySlug,
                'workflow_id' => $workflowId
            ]);

            // EXTRACT TEXT IN LARAVEL - supports visual PDFs with GPT-4 Vision
            $extractedText = $this->extractTextFromDocument(
                $validated['file'], 
                $validated['filename'],
                $openaiApiKey
            );

            if (!$extractedText || strlen($extractedText) < 50) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se pudo extraer texto del documento. Puede estar vacío o ser solo imágenes sin texto legible.'
                ], 400);
            }

            // DEBUG: Print to stderr so it appears in Railway logs
            error_log("=== RAG DEBUG ===");
            error_log("Text extracted: " . strlen($extractedText) . " characters");
            error_log("First 300 chars: " . substr($extractedText, 0, 300));
            
            Log::info("Text extracted: " . strlen($extractedText) . " characters");
            Log::info("Extracted text preview (first 500 chars): " . substr($extractedText, 0, 500));
            Log::info("Extracted text preview (last 500 chars): " . substr($extractedText, -500));

            // Prepare payload for n8n
            $payload = [
                'company_slug' => $companySlug,
                'category' => $validated['category'],
                'filename' => $validated['filename'],
                'text' => $extractedText, // Send text, not file
                'openai_api_key' => $openaiApiKey,
                'qdrant_host' => $qdrantHost,
                'qdrant_api_key' => $qdrantApiKey,
            ];

            error_log("Payload text length: " . strlen($payload['text']));
            Log::info("Payload to n8n - text length: " . strlen($payload['text']));

            // Send EXTRACTED TEXT to n8n (not the binary file)
            $response = Http::timeout(120)->post($webhookUrl, $payload);

            if ($response->successful()) {
                Log::info("n8n RAG webhook responded successfully for {$validated['filename']}");
                return response()->json([
                    'success' => true,
                    'message' => 'Document sent to n8n for AI processing',
                    'n8n_response' => $response->json()
                ]);
            } else {
                Log::error("n8n RAG webhook failed: " . $response->body());
                return response()->json([
                    'success' => false,
                    'error' => 'n8n webhook failed',
                    'details' => $response->body()
                ], 500);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error proxying to n8n: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error sending to n8n: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Extract text from document - supports PDFs (including visual/catalog PDFs), TXT, DOCX
     * Uses GPT-4 Vision for visual PDFs when text extraction yields poor results
     */
    private function extractTextFromDocument($base64Content, $filename, $openaiApiKey)
    {
        // Clean base64
        $cleanBase64 = $base64Content;
        if (strpos($cleanBase64, ',') !== false) {
            $cleanBase64 = explode(',', $cleanBase64)[1];
        }
        
        $fileContent = base64_decode($cleanBase64);
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $extractedText = '';
        
        try {
            if ($extension === 'pdf') {
                // Method 1: Try pdftotext (poppler-utils) - BEST quality
                $tempPdfPath = tempnam(sys_get_temp_dir(), 'pdf_');
                file_put_contents($tempPdfPath, $fileContent);
                
                $pdftotext = shell_exec("which pdftotext 2>/dev/null");
                
                if ($pdftotext && trim($pdftotext)) {
                    // pdftotext is available - use it (MUCH better extraction)
                    $tempTxtPath = $tempPdfPath . '.txt';
                    
                    // -layout preserves layout, -enc UTF-8 ensures proper encoding
                    $cmd = "pdftotext -layout -enc UTF-8 " . escapeshellarg($tempPdfPath) . " " . escapeshellarg($tempTxtPath) . " 2>&1";
                    exec($cmd, $output, $returnCode);
                    
                    if ($returnCode === 0 && file_exists($tempTxtPath)) {
                        $extractedText = file_get_contents($tempTxtPath);
                        unlink($tempTxtPath);
                        Log::info("pdftotext extraction: " . strlen($extractedText) . " characters");
                    }
                    
                    unlink($tempPdfPath);
                }
                
                // Method 2: Fallback to pdfparser if pdftotext failed or not available
                if (strlen($extractedText) < 100) {
                    Log::info("Falling back to pdfparser...");
                    $parser = new \Smalot\PdfParser\Parser();
                    $pdf = $parser->parseContent($fileContent);
                    
                    // Extract text from ALL pages individually
                    $pages = $pdf->getPages();
                    $allText = [];
                    
                    foreach ($pages as $pageNum => $page) {
                        try {
                            $pageText = $page->getText();
                            if (!empty(trim($pageText))) {
                                $allText[] = $pageText;
                            }
                        } catch (\Exception $e) {
                            Log::warning("Error extracting page " . ($pageNum + 1) . ": " . $e->getMessage());
                        }
                    }
                    
                    $extractedText = implode("\n\n", $allText);
                    
                    // If page-by-page extraction failed, try the whole document
                    if (strlen($extractedText) < 100) {
                        $extractedText = $pdf->getText();
                    }
                    
                    Log::info("pdfparser extraction: " . count($pages) . " pages, " . strlen($extractedText) . " chars total");
                }
                
                // Fix UTF-8 encoding issues
                if (!mb_check_encoding($extractedText, 'UTF-8')) {
                    // Try to detect and convert encoding
                    $detectedEncoding = mb_detect_encoding($extractedText, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
                    if ($detectedEncoding && $detectedEncoding !== 'UTF-8') {
                        $extractedText = mb_convert_encoding($extractedText, 'UTF-8', $detectedEncoding);
                        Log::info("Converted PDF text from {$detectedEncoding} to UTF-8");
                    }
                }
                
                // Fix mojibake (UTF-8 double-encoded text)
                $extractedText = $this->fixUtf8Mojibake($extractedText);
                
                // Clean the text
                $extractedText = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $extractedText);
                $extractedText = preg_replace('/\s+/', ' ', $extractedText);
                $extractedText = trim($extractedText);
                
                Log::info("PDF final text: " . strlen($extractedText) . " characters");
                
                // If text is too short, it's likely a visual/scanned PDF - use GPT-4 Vision
                if (strlen($extractedText) < 500) {
                    Log::info("PDF has little text (" . strlen($extractedText) . " chars), using GPT-4 Vision for visual content");
                    $extractedText = $this->extractWithVision($cleanBase64, $filename, $openaiApiKey, 'pdf');
                }
                
            } elseif (in_array($extension, ['txt', 'md'])) {
                $extractedText = $fileContent;
                
            } elseif ($extension === 'docx') {
                // Extract text from DOCX
                $tempFile = tempnam(sys_get_temp_dir(), 'docx_');
                file_put_contents($tempFile, $fileContent);
                
                $zip = new \ZipArchive();
                if ($zip->open($tempFile) === true) {
                    $xml = $zip->getFromName('word/document.xml');
                    $zip->close();
                    
                    // Strip XML tags
                    $extractedText = strip_tags($xml);
                    $extractedText = preg_replace('/\s+/', ' ', $extractedText);
                    $extractedText = trim($extractedText);
                }
                
                unlink($tempFile);
                
            } elseif (in_array($extension, ['png', 'jpg', 'jpeg', 'webp', 'gif'])) {
                // Images - use Vision directly
                $extractedText = $this->extractWithVision($cleanBase64, $filename, $openaiApiKey, 'image');
            }
            
        } catch (\Exception $e) {
            Log::error("Text extraction error for {$filename}: " . $e->getMessage());
            
            // Fallback to Vision for PDFs
            if ($extension === 'pdf') {
                Log::info("Falling back to GPT-4 Vision after extraction error");
                try {
                    $extractedText = $this->extractWithVision($cleanBase64, $filename, $openaiApiKey, 'pdf');
                } catch (\Exception $e2) {
                    Log::error("Vision fallback also failed: " . $e2->getMessage());
                }
            }
        }
        
        return $extractedText;
    }

    /**
     * Fix UTF-8 mojibake and ensure valid UTF-8 for json_encode
     * Preserves Spanish characters (á, é, í, ó, ú, ñ, etc.)
     */
    private function fixUtf8Mojibake($text)
    {
        $originalLength = strlen($text);
        $originalSample = mb_substr($text, 0, 100);
        
        Log::info("fixUtf8Mojibake - Input sample (first 100 chars): " . $originalSample);
        Log::info("fixUtf8Mojibake - Input bytes: " . bin2hex(substr($text, 0, 50)));
        
        // Method 1: Direct string replacement for visible mojibake patterns
        // When pdftotext outputs "Ã³" as actual characters (not bytes), we need string replacement
        $visibleMojibake = [
            // These are the VISIBLE mojibake patterns (as strings, not bytes)
            "\xC3\x83\xC2\xB3" => "\xC3\xB3",  // Ã³ -> ó (4-byte to 2-byte)
            "\xC3\x83\xC2\xA1" => "\xC3\xA1",  // Ã¡ -> á
            "\xC3\x83\xC2\xA9" => "\xC3\xA9",  // Ã© -> é  
            "\xC3\x83\xC2\xAD" => "\xC3\xAD",  // Ã­ -> í
            "\xC3\x83\xC2\xBA" => "\xC3\xBA",  // Ãº -> ú
            "\xC3\x83\xC2\xB1" => "\xC3\xB1",  // Ã± -> ñ
            "\xC3\x83\xC2\xBC" => "\xC3\xBC",  // Ã¼ -> ü
            "\xC3\x83\xC2\x81" => "\xC3\x81",  // Ã -> Á
            "\xC3\x83\xC2\x89" => "\xC3\x89",  // Ã‰ -> É
            "\xC3\x83\xC2\x8D" => "\xC3\x8D",  // Ã -> Í
            "\xC3\x83\xC2\x93" => "\xC3\x93",  // Ã" -> Ó
            "\xC3\x83\xC2\x9A" => "\xC3\x9A",  // Ãš -> Ú
            "\xC3\x83\xC2\x91" => "\xC3\x91",  // Ã' -> Ñ
            "\xC3\x83\xC2\x9C" => "\xC3\x9C",  // Ãœ -> Ü
        ];
        
        $text = str_replace(array_keys($visibleMojibake), array_values($visibleMojibake), $text);
        
        // Method 2: THE KEY FIX - UTF-8 interpreted as Latin-1 then re-encoded to UTF-8
        // This is the most common PDF mojibake pattern
        // The text was UTF-8, but pdftotext read it as Latin-1, then output as UTF-8
        // So we need: UTF-8 -> Latin-1 (decode) -> UTF-8 (what we want)
        $fixed = @mb_convert_encoding($text, 'Windows-1252', 'UTF-8');
        if ($fixed !== false && $fixed !== $text) {
            // Check if conversion produced valid Spanish characters
            $hasSpanishAfter = preg_match('/[áéíóúñüÁÉÍÓÚÑÜ¿¡]/u', $fixed);
            $hadMojibeforeFix = preg_match('/[\xC3][\x80-\xBF][\xC2][\x80-\xBF]/', $text);
            
            Log::info("mb_convert_encoding attempt - hasSpanish: {$hasSpanishAfter}, hadMojibake: {$hadMojibeforeFix}");
            
            if ($hasSpanishAfter || $hadMojibeforeFix) {
                $text = $fixed;
                Log::info("Applied Windows-1252 decode - Output sample: " . mb_substr($text, 0, 100));
            }
        }
        
        // Method 3: Try utf8_decode for double-encoded UTF-8
        if (preg_match('/\xC3\x83/', $text)) {
            Log::info("Still detecting C3 83 pattern, trying utf8_decode");
            $decoded = @utf8_decode($text);
            if ($decoded && mb_check_encoding($decoded, 'UTF-8')) {
                $text = $decoded;
                Log::info("Applied utf8_decode");
            }
        }
        
        // Method 4: Clean invalid UTF-8 sequences
        if (!mb_check_encoding($text, 'UTF-8')) {
            $text = @iconv('UTF-8', 'UTF-8//IGNORE', $text) ?: $text;
            Log::info("Applied iconv UTF-8 cleanup");
        }
        
        // Remove control characters but keep printable chars and newlines
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        
        // Final validation for json_encode
        if (@json_encode(['test' => $text]) === false) {
            Log::warning("JSON encode still failing, applying aggressive cleanup");
            $text = @iconv('UTF-8', 'UTF-8//IGNORE', $text) ?: $text;
        }
        
        $finalSample = mb_substr($text, 0, 100);
        Log::info("fixUtf8Mojibake - Output sample: " . $finalSample);
        Log::info("fixUtf8Mojibake - Length changed: {$originalLength} -> " . strlen($text));
        
        return $text;
    }

    /**
     * Extract text from visual content using GPT-4 Vision
     */
    private function extractWithVision($base64Content, $filename, $openaiApiKey, $type = 'pdf')
    {
        // For PDFs, we need to tell the user we're processing visual content
        // GPT-4 Vision can read images, so we'll describe what to extract
        
        $mimeType = 'application/pdf';
        if ($type === 'image') {
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            $mimeType = "image/{$ext}";
            if ($ext === 'jpg') $mimeType = 'image/jpeg';
        }
        
        // Use GPT-4o (supports vision) to analyze the document
        $response = Http::timeout(180)
            ->withHeaders([
                'Authorization' => "Bearer {$openaiApiKey}",
                'Content-Type' => 'application/json'
            ])
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un experto en extraer texto de documentos visuales como catálogos, presentaciones, y PDFs con imágenes. Tu tarea es extraer TODO el texto visible en el documento, incluyendo:
- Títulos y subtítulos
- Descripciones de productos
- Precios y códigos
- Texto en tablas
- Texto en imágenes
- Cualquier información relevante

Responde SOLO con el texto extraído, organizado de forma clara. No agregues comentarios ni explicaciones.'
                    ],
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => "Extrae todo el texto de este documento: {$filename}"
                            ],
                            [
                                'type' => 'image_url',
                                'image_url' => [
                                    'url' => "data:{$mimeType};base64,{$base64Content}",
                                    'detail' => 'high'
                                ]
                            ]
                        ]
                    ]
                ],
                'max_tokens' => 4096,
                'temperature' => 0
            ]);
        
        if ($response->successful()) {
            $data = $response->json();
            $text = $data['choices'][0]['message']['content'] ?? '';
            Log::info("GPT-4 Vision extracted: " . strlen($text) . " characters");
            return trim($text);
        } else {
            Log::error("GPT-4 Vision API error: " . $response->body());
            throw new \Exception("Error calling GPT-4 Vision: " . $response->status());
        }
    }

    /**
     * Create a company-specific RAG workflow in n8n
     */
    private function createCompanyWorkflow($company, $companySlug, $companyName, $n8nUrl, $n8nApiKey)
    {
        try {
            // Generate webhook path for this company (simple, predictable pattern)
            $webhookPath = "rag-{$companySlug}";
            $workflowName = "RAG Documents - {$companySlug}";

            // Workflow template - SIMPLIFICADO: texto ya extraído en Laravel
            $workflow = [
                'name' => $workflowName,
                'nodes' => [
                    [
                        'parameters' => [
                            'httpMethod' => 'POST',
                            'path' => $webhookPath,
                            'responseMode' => 'responseNode',
                            'options' => new \stdClass()
                        ],
                        'type' => 'n8n-nodes-base.webhook',
                        'typeVersion' => 2,
                        'position' => [0, 300],
                        'id' => 'webhook-text',
                        'name' => 'Webhook Receive Text',
                        'webhookId' => "rag-{$companySlug}"
                    ],
                    [
                        'parameters' => [
                            'respondWith' => 'json',
                            'responseBody' => '={"success": true, "message": "Processing started", "filename": "{{ $json.body.filename || $json.filename }}"}'
                        ],
                        'type' => 'n8n-nodes-base.respondToWebhook',
                        'typeVersion' => 1.1,
                        'position' => [220, 160],
                        'id' => 'respond-webhook',
                        'name' => 'Respond Immediately'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getProcessInputCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [220, 300],
                        'id' => 'prepare-data',
                        'name' => 'Prepare Data'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getChunkTextCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [440, 300],
                        'id' => 'chunk-text',
                        'name' => 'Split into Chunks'
                    ],
                    [
                        'parameters' => [
                            'method' => 'POST',
                            'url' => 'https://api.openai.com/v1/embeddings',
                            'sendHeaders' => true,
                            'headerParameters' => [
                                'parameters' => [
                                    ['name' => 'Authorization', 'value' => '=Bearer {{ $json.openai_api_key || $env.OPENAI_API_KEY }}'],
                                    ['name' => 'Content-Type', 'value' => 'application/json']
                                ]
                            ],
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => "={\n  \"model\": \"text-embedding-3-small\",\n  \"input\": {{ JSON.stringify(\$json.text) }}\n}",
                            'options' => new \stdClass()
                        ],
                        'type' => 'n8n-nodes-base.httpRequest',
                        'typeVersion' => 4.2,
                        'position' => [660, 300],
                        'id' => 'generate-embeddings',
                        'name' => 'Generate Embeddings'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getPrepareQdrantCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [880, 300],
                        'id' => 'prepare-qdrant',
                        'name' => 'Prepare for Qdrant'
                    ],
                    [
                        'parameters' => [
                            'method' => 'PUT',
                            'url' => '={{ $json.qdrant_host }}/collections/{{ $json.collection_name }}/points',
                            'sendHeaders' => true,
                            'headerParameters' => [
                                'parameters' => [
                                    ['name' => 'Content-Type', 'value' => 'application/json']
                                ]
                            ],
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => "={\n  \"points\": [{\n    \"id\": {{ JSON.stringify(\$json.id) }},\n    \"vector\": {{ JSON.stringify(\$json.vector) }},\n    \"payload\": {{ JSON.stringify(\$json.payload) }}\n  }]\n}",
                            'options' => new \stdClass()
                        ],
                        'type' => 'n8n-nodes-base.httpRequest',
                        'typeVersion' => 4.2,
                        'position' => [1100, 300],
                        'id' => 'store-qdrant',
                        'name' => 'Store in Qdrant'
                    ],
                    [
                        'parameters' => [
                            'method' => 'POST',
                            'url' => 'https://app.withmia.com/api/knowledge/chunk-stored',
                            'sendHeaders' => true,
                            'headerParameters' => [
                                'parameters' => [
                                    ['name' => 'Content-Type', 'value' => 'application/json']
                                ]
                            ],
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => "={\n  \"company_slug\": {{ JSON.stringify(\$('Prepare for Qdrant').item.json.company_slug) }},\n  \"filename\": {{ JSON.stringify(\$('Prepare for Qdrant').item.json.filename) }},\n  \"chunk_id\": {{ JSON.stringify(\$('Prepare for Qdrant').item.json.id) }},\n  \"chunk_index\": {{ \$('Prepare for Qdrant').item.json.chunk_index }},\n  \"total_chunks\": {{ \$('Prepare for Qdrant').item.json.total_chunks }}\n}",
                            'options' => new \stdClass()
                        ],
                        'type' => 'n8n-nodes-base.httpRequest',
                        'typeVersion' => 4.2,
                        'position' => [1320, 300],
                        'id' => 'notify-laravel',
                        'name' => 'Notify Laravel'
                    ]
                ],
                'connections' => [
                    'Webhook Receive Text' => ['main' => [[
                        ['node' => 'Respond Immediately', 'type' => 'main', 'index' => 0],
                        ['node' => 'Prepare Data', 'type' => 'main', 'index' => 0]
                    ]]],
                    'Prepare Data' => ['main' => [[['node' => 'Split into Chunks', 'type' => 'main', 'index' => 0]]]],
                    'Split into Chunks' => ['main' => [[['node' => 'Generate Embeddings', 'type' => 'main', 'index' => 0]]]],
                    'Generate Embeddings' => ['main' => [[['node' => 'Prepare for Qdrant', 'type' => 'main', 'index' => 0]]]],
                    'Prepare for Qdrant' => ['main' => [[['node' => 'Store in Qdrant', 'type' => 'main', 'index' => 0]]]],
                    'Store in Qdrant' => ['main' => [[['node' => 'Notify Laravel', 'type' => 'main', 'index' => 0]]]]
                ],
                'settings' => ['executionOrder' => 'v1']
            ];

            // Create workflow in n8n
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $n8nApiKey,
                'Content-Type' => 'application/json'
            ])->post("{$n8nUrl}/api/v1/workflows", $workflow);

            if (!$response->successful()) {
                Log::error("Failed to create n8n workflow: " . $response->body());
                return ['success' => false, 'error' => 'Failed to create workflow in n8n'];
            }

            $workflowData = $response->json();
            $workflowId = $workflowData['id'];

            // SIEMPRE activar el workflow después de crearlo
            // n8n requiere (object)[] para enviar {} como body JSON
            Log::info("Activating workflow {$workflowId}...");
            $activateResponse = Http::withHeaders([
                'X-N8N-API-KEY' => $n8nApiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post("{$n8nUrl}/api/v1/workflows/{$workflowId}/activate", (object)[]);

            if ($activateResponse->successful()) {
                Log::info("✅ Workflow {$workflowId} activated successfully");
            } else {
                Log::error("❌ Failed to activate workflow: " . $activateResponse->body());
            }

            // Save workflow info to company settings
            $settings = $company->settings ?? [];
            $settings['rag_workflow_id'] = $workflowId;
            $settings['rag_webhook_path'] = $webhookPath;
            $settings['rag_workflow_name'] = $workflowName;
            $company->settings = $settings;
            $company->save();

            Log::info("Created RAG workflow for company {$companySlug}", [
                'workflow_id' => $workflowId,
                'webhook_path' => $webhookPath,
                'workflow_name' => $workflowName
            ]);

            return [
                'success' => true,
                'workflow_id' => $workflowId,
                'webhook_path' => $webhookPath
            ];

        } catch (\Exception $e) {
            Log::error("Error creating company workflow: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function getProcessInputCode()
    {
        return <<<'JS'
// Extract data from body - Laravel sends text already extracted
const body = $input.first().json.body || $input.first().json;

const companySlug = body.company_slug || 'default';
const filename = body.filename || 'document.pdf';
const category = body.category || 'general';
const text = body.text || '';
const openaiApiKey = body.openai_api_key || '';
const qdrantHost = body.qdrant_host || 'https://qdrant-production-f4e7.up.railway.app';

// Validate text
if (!text || text.length < 50) {
  throw new Error('No text provided or text too short');
}

// Create collection name
const collectionName = 'company_' + companySlug.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() + '_knowledge';

return {
  json: {
    company_slug: companySlug,
    filename: filename,
    category: category,
    collection_name: collectionName,
    text: text,
    text_length: text.length,
    openai_api_key: openaiApiKey,
    qdrant_host: qdrantHost
  }
};
JS;
    }

    private function getChunkTextCode()
    {
        return <<<'JS'
// Split text into chunks - LIMITED to ~6000 TOKENS (approx 24000 chars)
const input = $input.first().json;
const text = input.text || '';
const companySlug = input.company_slug;
const filename = input.filename;
const category = input.category;
const collectionName = input.collection_name;
const openaiApiKey = input.openai_api_key;
const qdrantHost = input.qdrant_host;

// ~4 chars = 1 token approx. Limit 6000 tokens = 24000 chars
// Use 20000 for safety margin
const maxCharsPerChunk = 20000;
const chunkOverlap = 500;
const chunks = [];

// If text is short, don't split
if (text.length <= maxCharsPerChunk) {
  chunks.push(text);
} else {
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxCharsPerChunk) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      if (para.length > maxCharsPerChunk) {
        const sentences = para.split(/(?<=[.!?])\s+/);
        currentChunk = '';
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxCharsPerChunk) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            if (sentence.length > maxCharsPerChunk) {
              for (let i = 0; i < sentence.length; i += maxCharsPerChunk - chunkOverlap) {
                chunks.push(sentence.substring(i, i + maxCharsPerChunk));
              }
              currentChunk = '';
            } else {
              currentChunk = sentence;
            }
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
}

// Return chunks as separate items
return chunks.map((chunk, index) => ({
  json: {
    text: chunk,
    chunk_index: index,
    total_chunks: chunks.length,
    company_slug: companySlug,
    filename: filename,
    category: category,
    collection_name: collectionName,
    openai_api_key: openaiApiKey,
    qdrant_host: qdrantHost
  }
}));
JS;
    }

    private function getPrepareQdrantCode()
    {
        return <<<'JS'
// Process ALL items and prepare data for Qdrant AND Laravel notification
const results = [];
const items = $input.all();

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const embedding = item.json.data[0].embedding;
  const prevData = $('Split into Chunks').all()[i].json;

  // Generate UUID v4 for Qdrant (required format)
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  results.push({
    json: {
      id: uuid,
      vector: embedding,
      payload: {
        text: prevData.text,
        filename: prevData.filename,
        category: prevData.category,
        company_slug: prevData.company_slug,
        chunk_index: prevData.chunk_index,
        total_chunks: prevData.total_chunks
      },
      collection_name: prevData.collection_name,
      qdrant_host: prevData.qdrant_host,
      // Add these for easy access in Notify Laravel
      company_slug: prevData.company_slug,
      filename: prevData.filename,
      chunk_index: prevData.chunk_index,
      total_chunks: prevData.total_chunks
    }
  });
}

return results;
JS;
    }

    /**
     * Reset the RAG workflow for the company (deletes and recreates)
     */
    public function resetWorkflow(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }
            
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $n8nUrl = env('N8N_PUBLIC_URL', 'https://n8n-production-00dd.up.railway.app');
            $n8nApiKey = env('N8N_API_KEY');

            // Try to delete the old workflow if it exists
            $oldWorkflowId = $company->settings['rag_workflow_id'] ?? null;
            if ($oldWorkflowId && $n8nApiKey) {
                try {
                    Http::withHeaders([
                        'X-N8N-API-KEY' => $n8nApiKey
                    ])->delete("{$n8nUrl}/api/v1/workflows/{$oldWorkflowId}");
                } catch (\Exception $e) {
                    Log::warning("Could not delete old workflow: " . $e->getMessage());
                }
            }

            // Clear workflow settings
            $settings = $company->settings ?? [];
            unset($settings['rag_workflow_id']);
            unset($settings['rag_webhook_path']);
            unset($settings['rag_workflow_name']);
            $company->settings = $settings;
            $company->save();

            // Create new workflow
            $companySlug = $company->slug ?? 'company_' . $company->id;
            $companyName = $company->name ?? $companySlug;
            
            $result = $this->createCompanyWorkflow($company, $companySlug, $companyName, $n8nUrl, $n8nApiKey);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error creating new workflow: ' . $result['error']
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Workflow reset successfully',
                'workflow_id' => $result['workflow_id'],
                'webhook_path' => $result['webhook_path']
            ]);

        } catch (\Exception $e) {
            Log::error('Error resetting workflow: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error resetting workflow: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Qdrant points for the company's collection
     */
    public function getQdrantPoints(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['error' => 'No company found'], 404);
            }

            $qdrantService = app(QdrantService::class);
            $collectionName = $qdrantService->getCollectionName($company->slug);
            
            $limit = $request->get('limit', 50);
            $offset = $request->get('offset');
            
            $result = $qdrantService->getPoints($collectionName, $limit, $offset);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error fetching points',
                    'points' => []
                ]);
            }

            return response()->json([
                'success' => true,
                'points' => $result['points'],
                'next_offset' => $result['next_offset'],
                'collection' => $collectionName
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting Qdrant points: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'points' => []
            ]);
        }
    }

    /**
     * Get a single Qdrant point
     */
    public function getQdrantPoint($pointId)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['error' => 'No company found'], 404);
            }

            $qdrantService = app(QdrantService::class);
            $collectionName = $qdrantService->getCollectionName($company->slug);
            
            $result = $qdrantService->getPoint($collectionName, $pointId);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Point not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'point' => $result['point']
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting Qdrant point: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a Qdrant point's payload
     */
    public function updateQdrantPoint(Request $request, $pointId)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['error' => 'No company found'], 404);
            }

            $qdrantService = app(QdrantService::class);
            $collectionName = $qdrantService->getCollectionName($company->slug);
            
            // Convert to proper type: integer if numeric, otherwise keep as string (UUID)
            if (is_numeric($pointId)) {
                $pointId = (int) $pointId;
            }
            
            $payload = $request->get('payload', []);
            
            $result = $qdrantService->updatePointPayload($collectionName, $pointId, $payload);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error updating point'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Point updated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating Qdrant point: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a single Qdrant point
     */
    public function deleteQdrantPoint($pointId)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['error' => 'No company found'], 404);
            }

            $qdrantService = app(QdrantService::class);
            $collectionName = $qdrantService->getCollectionName($company->slug);
            
            // Convert to proper type: integer if numeric, otherwise keep as string (UUID)
            if (is_numeric($pointId)) {
                $pointId = (int) $pointId;
            }
            
            $result = $qdrantService->deletePoints($collectionName, [$pointId]);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error deleting point'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Point deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting Qdrant point: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete multiple Qdrant points
     */
    public function deleteQdrantPoints(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['error' => 'No company found'], 404);
            }

            $pointIds = $request->get('point_ids', []);
            
            if (empty($pointIds)) {
                return response()->json([
                    'success' => false,
                    'error' => 'No point IDs provided'
                ], 400);
            }

            $qdrantService = app(QdrantService::class);
            $collectionName = $qdrantService->getCollectionName($company->slug);
            
            $result = $qdrantService->deletePoints($collectionName, $pointIds);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error deleting points'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => count($pointIds) . ' points deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting Qdrant points: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
