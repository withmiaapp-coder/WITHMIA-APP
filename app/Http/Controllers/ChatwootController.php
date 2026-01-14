<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Services\EvolutionApiService;

class ChatwootController extends Controller
{
    private $chatwootBaseUrl;
    private $chatwootToken;
    private $accountId;
    private $inboxId;
    private $userId;
    private EvolutionApiService $evolutionApi;

    public function __construct(EvolutionApiService $evolutionApi)
    {
        $this->evolutionApi = $evolutionApi;
        $this->chatwootBaseUrl = env('CHATWOOT_API_BASE_URL', 'http://localhost:3000');

        // Obtener usuario autenticado y su company
        $user = auth()->user();
        $company = $user ? $user->company : null;

        // Guardar user ID para logs
        $this->userId = $user ? $user->id : null;

        // Usar Account ID de la company del usuario
        $this->accountId = $company && $company->chatwoot_account_id
            ? $company->chatwoot_account_id
            : env('CHATWOOT_ACCOUNT_ID', '1');

        // NUEVO: Obtener inbox_id del usuario para filtrado de seguridad
        $this->inboxId = $user && $user->chatwoot_inbox_id 
            ? $user->chatwoot_inbox_id 
            : null;

        // PRIORIDAD: 1. Token de company, 2. Token de usuario, 3. Token platform
        if ($company && $company->chatwoot_api_key) {
            $this->chatwootToken = $company->chatwoot_api_key;
        } elseif ($user && $user->chatwoot_agent_token) {
            $this->chatwootToken = $user->chatwoot_agent_token;
        } else {
            $this->chatwootToken = env('CHATWOOT_PLATFORM_API_TOKEN');
        }
        
        // SEGURIDAD: Log de acceso
        if ($user) {
            Log::info('ChatwootController initialized', [
                'user_id' => $user->id,
                'email' => $user->email,
                'company_slug' => $company ? $company->slug : null,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId
            ]);
        }
    }

    /**
     * Helper: HTTP client con timeout configurado para Chatwoot
     */
    private function chatwootHttp()
    {
        return Http::timeout(10)->withHeaders([
            'api_access_token' => $this->chatwootToken,
            'Content-Type' => 'application/json'
        ]);
    }

    /**
     * Obtener estadísticas del dashboard (REAL API)
     */
    /**
     * Obtener conversaciones con caché en Redis
     * TTL: 2 minutos (actualizado por Reverb en tiempo real)
     */
    public function getConversations(Request $request)
    {
        try {
            // SEGURIDAD: Validar que el usuario tenga inbox asignado
            if (!$this->inboxId) {
                return response()->json([
                    'success' => true,
                    'data' => ['payload' => []],
                    'meta' => ['current_page' => 1, 'total_pages' => 0, 'total_count' => 0],
                    'message' => 'No tienes un inbox asignado'
                ]);
            }

            // Cache key único por usuario/inbox
            $cacheKey = "conversations:inbox:{$this->inboxId}:user:{$this->userId}";
            $cacheTTL = 300; // 5 minutos

            // Intentar obtener desde Redis
            $cached = \Illuminate\Support\Facades\Cache::get($cacheKey);
            
            if ($cached) {
                Log::info('✅ Conversaciones servidas desde Redis cache', [
                    'user_id' => $this->userId,
                    'inbox_id' => $this->inboxId,
                    'cache_key' => $cacheKey,
                    'conversations_count' => count($cached)
                ]);

                return response()->json([
                    'success' => true,
                    'data' => ['payload' => $cached],
                    'meta' => [
                        'current_page' => 1,
                        'total_pages' => 1,
                        'total_count' => count($cached),
                        'from_cache' => true
                    ]
                ]);
            }

            // No hay cache, obtener desde Chatwoot API
            Log::info('⚠️ Cache miss - Obteniendo desde Chatwoot API', [
                'user_id' => $this->userId,
                'inbox_id' => $this->inboxId
            ]);

            $allConversations = [];
            $currentPage = 1;
            $maxPages = 20;

            while ($currentPage <= $maxPages) {
                $response = \Illuminate\Support\Facades\Http::timeout(10)->withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations', [
                    'inbox_id' => $this->inboxId,
                    'page' => $currentPage,
                    'per_page' => 100
                ]);

                if (!$response->successful()) break;

                $data = $response->json();
                $conversations = $data['data']['payload'] ?? [];
                
                if (empty($conversations)) break;

                // Filtro de seguridad
                $filtered = array_filter($conversations, fn($conv) => 
                    isset($conv['inbox_id']) && $conv['inbox_id'] == $this->inboxId
                );

                $allConversations = array_merge($allConversations, array_values($filtered));
                
                $meta = $data['meta'] ?? [];
                if ($currentPage >= (($meta['all_count'] ?? 0) / 100)) break;
                
                $currentPage++;
            }

            // Guardar en Redis cache
            \Illuminate\Support\Facades\Cache::put($cacheKey, $allConversations, $cacheTTL);

            Log::info('💾 Conversaciones guardadas en Redis cache', [
                'user_id' => $this->userId,
                'inbox_id' => $this->inboxId,
                'cache_key' => $cacheKey,
                'conversations_count' => count($allConversations),
                'ttl' => $cacheTTL
            ]);

            return response()->json([
                'success' => true,
                'data' => ['payload' => $allConversations],
                'meta' => [
                    'current_page' => 1,
                    'total_pages' => 1,
                    'total_count' => count($allConversations),
                    'from_cache' => false
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching conversations: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'inbox_id' => $this->inboxId
            ]);

            return response()->json([
                'success' => true,
                'data' => ['payload' => []],
                'meta' => ['current_page' => 1, 'total_pages' => 0, 'total_count' => 0]
            ]);
        }
    }

    public function getDashboardStats()
    {
        try {
            // Obtener conversaciones reales para calcular stats
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations', [
                'inbox_id' => $this->inboxId // FILTRO DE SEGURIDAD
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $conversations = $data['data']['payload'] ?? [];

                // FILTRO ADICIONAL: En caso de que la API no respete el parámetro
                if ($this->inboxId) {
                    $conversations = array_filter($conversations, function($conv) {
                        return isset($conv['inbox_id']) && $conv['inbox_id'] == $this->inboxId;
                    });
                }

                // Procesar estadísticas reales
                $totalConversations = count($conversations);
                $activeConversations = count(array_filter($conversations, function($conv) {
                    return $conv['status'] === 'open';
                }));

                // Calcular tiempo promedio de respuesta (simulado por ahora)
                $avgResponseTime = '2.5';

                return response()->json([
                    'success' => true,
                    'data' => [
                        'totalConversations' => $totalConversations,
                        'activeConversations' => $activeConversations,
                        'avgResponseTime' => $avgResponseTime . ' min',
                        'satisfactionRate' => 85, // Simulado por ahora
                    ]
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No se pudieron obtener las estadísticas'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Chatwoot Stats Error: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener conversaciones (REAL API) - CON FILTRO DE SEGURIDAD
     */
    public function getConversationsOld(Request $request)
    {
        try {
            // SEGURIDAD: Validar que el usuario tenga inbox asignado
            if (!$this->inboxId) {
                Log::warning('Usuario sin inbox_id intentó acceder a conversaciones', [
                    'user_id' => $this->userId,
                    'account_id' => $this->accountId
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => [
                        'payload' => [],
                        'meta' => [
                            'current_page' => 1,
                            'total_pages' => 0,
                            'total_count' => 0
                        ]
                    ],
                    'message' => 'No tienes un inbox asignado'
                ]);
            }

            // ✅ NUEVA IMPLEMENTACIÓN: Paginación infinita automática
            $page = (int) $request->input('page', 1);
            $perPage = (int) $request->input('per_page', 25);
            $allConversations = [];
            $currentPage = 1;
            $hasMorePages = true;
            $maxPages = 20; // Límite de seguridad
            
            Log::info('Starting infinite pagination for conversations', [
                'user_id' => $this->userId,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId,
                'requested_page' => $page,
                'per_page' => $perPage
            ]);

            // Loop para cargar TODAS las páginas
            while ($hasMorePages && $currentPage <= $maxPages) {
                // Parámetros de la API con paginación
                $params = [
                    'inbox_id' => $this->inboxId,
                    'page' => $currentPage,
                    'per_page' => 100 // Máximo por página en la API
                ];

                // Agregar filtros adicionales del request si existen
                if ($request->has('status')) {
                    $params['status'] = $request->input('status');
                }
                if ($request->has('assignee_type')) {
                    $params['assignee_type'] = $request->input('assignee_type');
                }

                $response = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations', $params);

                if ($response->successful()) {
                    $data = $response->json();
                    $conversations = $data['data']['payload'] ?? [];
                    $meta = $data['meta'] ?? [];

                    // DOBLE FILTRO DE SEGURIDAD: Por si la API no respeta el parámetro
                    $filteredConversations = array_filter($conversations, function($conv) {
                        return isset($conv['inbox_id']) && $conv['inbox_id'] == $this->inboxId;
                    });

                    // Agregar a la colección total
                    $allConversations = array_merge($allConversations, array_values($filteredConversations));

                    Log::info('🔥 NUEVA VERSION - Page fetched and filtered', [
                        'timestamp' => now()->toDateTimeString(),
                        'page' => $currentPage,
                        'conversations_in_page' => count($conversations),
                        'after_inbox_filter' => count($filteredConversations),
                        'total_so_far' => count($allConversations),
                        'meta_dump' => json_encode($meta),
                        'meta_all_count' => $meta['all_count'] ?? 'N/A',
                        'has_more_check' => !empty($conversations),
                        'will_continue' => isset($meta['all_count']) ? (count($allConversations) < $meta['all_count']) : (!empty($conversations) && count($conversations) >= 25)
                    ]);

                    // FIX: Verificar si la API devolvio conversaciones (ANTES del filtro)
                    $hasMorePages = !empty($conversations);

                    $currentPage++;
                } else {
                    Log::warning('Error fetching page', [
                        'page' => $currentPage,
                        'status' => $response->status()
                    ]);
                    break;
                }
            }

            Log::info('All conversations fetched successfully', [
                'user_id' => $this->userId,
                'total_pages' => $currentPage - 1,
                'total_conversations' => count($allConversations)
            ]);

            // Si se solicitó una página específica, paginar el resultado final
            if ($page > 1) {
                $offset = ($page - 1) * $perPage;
                $paginatedConversations = array_slice($allConversations, $offset, $perPage);
                $totalPages = ceil(count($allConversations) / $perPage);
                
                return response()->json([
                    'success' => true,
                    'data' => [
                        'payload' => $paginatedConversations
                    ],
                    'meta' => [
                        'current_page' => $page,
                        'total_pages' => $totalPages,
                        'total_count' => count($allConversations),
                        'per_page' => $perPage
                    ]
                ]);
            }

            // Devolver todas las conversaciones
            return response()->json([
                'success' => true,
                'data' => [
                    'payload' => $allConversations
                ],
                'meta' => [
                    'current_page' => 1,
                    'total_pages' => 1,
                    'total_count' => count($allConversations),
                    'per_page' => count($allConversations)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching conversations from Chatwoot: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId
            ]);

            // Devolver array vacío en lugar de error para evitar "Error de Conexión"
            return response()->json([
                'success' => true,
                'data' => [
                    'payload' => []
                ],
                'meta' => [
                    'current_page' => 1,
                    'total_pages' => 0,
                    'total_count' => 0
                ]
            ]);
        }
    }

    /**
     * Obtener mensajes de una conversación específica - CON VALIDACIÓN DE SEGURIDAD
     */
    public function getConversationMessages($id)
    {
        try {
            // SEGURIDAD: Validar que el usuario tenga inbox asignado
            if (!$this->inboxId) {
                Log::warning('Usuario sin inbox_id intentó acceder a mensajes', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado'
                ], 403);
            }

            // PASO 1: Obtener la conversación para validar permisos
            $convResponse = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $id);

            if (!$convResponse->successful()) {
                Log::warning('Conversación no encontrada', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'status' => $convResponse->status()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Conversación no encontrada'
                ], 404);
            }

            $conversation = $convResponse->json();

            // PASO 2: VALIDACIÓN DE SEGURIDAD - Verificar que pertenece al inbox del usuario
            if (!isset($conversation['inbox_id']) || $conversation['inbox_id'] != $this->inboxId) {
                Log::warning('Intento de acceso no autorizado a conversación', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'conversation_inbox_id' => $conversation['inbox_id'] ?? 'null',
                    'user_inbox_id' => $this->inboxId,
                    'account_id' => $this->accountId
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permiso para ver esta conversación'
                ], 403);
            }

            // PASO 3: Si pasa la validación, obtener los mensajes
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $id . '/messages');

            if ($response->successful()) {
                Log::info('Mensajes obtenidos exitosamente', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id
                ]);
                
                return response()->json([
                    'success' => true,
                    'payload' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No se pudieron obtener los mensajes'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Messages Error: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'conversation_id' => $id
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener mensajes'
            ], 500);
        }
    }

    /**
     * Enviar mensaje a una conversación - VIA EVOLUTION API (SIN DUPLICADOS)
     * 
     * FLUJO CORRECTO:
     * 1. App → Evolution API → WhatsApp
     * 2. Evolution → Chatwoot (un solo mensaje con source_id)
     * 
     * ANTES (con duplicados):
     * 1. App → Chatwoot API (mensaje sin source_id)
     * 2. App → Evolution → WhatsApp
     * 3. Evolution → Chatwoot (mensaje CON source_id) = DUPLICADO
     */
    public function sendMessage(Request $request, $id)
    {
        try {
            // SEGURIDAD: Validar que el usuario tenga inbox asignado
            if (!$this->inboxId) {
                Log::warning('Usuario sin inbox_id intentó enviar mensaje', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado'
                ], 403);
            }

            // PASO 1: Validar que la conversación pertenece al inbox del usuario
            $convResponse = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $id);

            if (!$convResponse->successful()) {
                Log::warning('Conversación no encontrada al enviar mensaje', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Conversación no encontrada'
                ], 404);
            }

            $conversation = $convResponse->json();

            // PASO 2: VALIDACIÓN DE SEGURIDAD
            if (!isset($conversation['inbox_id']) || $conversation['inbox_id'] != $this->inboxId) {
                Log::warning('Intento de envío de mensaje no autorizado', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'conversation_inbox_id' => $conversation['inbox_id'] ?? 'null',
                    'user_inbox_id' => $this->inboxId
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permiso para enviar mensajes a esta conversación'
                ], 403);
            }

            // PASO 3: Obtener el teléfono del contacto para enviar via Evolution
            $contactPhone = $conversation['meta']['sender']['phone_number'] ?? null;
            $contactIdentifier = $conversation['meta']['sender']['identifier'] ?? null;
            
            // Intentar obtener el teléfono del identifier si no está en phone_number
            if (!$contactPhone && $contactIdentifier) {
                // Formato: 56975235071@s.whatsapp.net o similar
                $contactPhone = preg_replace('/@.*$/', '', $contactIdentifier);
            }

            if (!$contactPhone) {
                Log::error('No se pudo obtener teléfono del contacto', [
                    'conversation_id' => $id,
                    'meta' => $conversation['meta'] ?? null
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo obtener el teléfono del contacto'
                ], 400);
            }

            // PASO 4: Enviar DIRECTAMENTE a Evolution API (Evolution guardará en Chatwoot)
            $messageContent = $request->input('content');
            $evolutionResult = $this->sendToEvolutionAPI($contactPhone, $messageContent);

            if ($evolutionResult) {
                Log::info('✅ Mensaje enviado via Evolution (sin duplicado en Chatwoot)', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'phone' => $contactPhone
                ]);

                // Devolver respuesta optimista - Evolution guardará el mensaje real en Chatwoot
                return response()->json([
                    'success' => true,
                    'payload' => [
                        'id' => 'pending-' . time(), // ID temporal
                        'content' => $messageContent,
                        'created_at' => now()->toISOString(),
                        'message_type' => 1, // outgoing
                        'status' => 'sent',
                        'sender' => [
                            'name' => auth()->user()->name ?? 'Agent'
                        ]
                    ]
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No se pudo enviar el mensaje a WhatsApp'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Chatwoot Send Message Error: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'conversation_id' => $id
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar mensaje'
            ], 500);
        }
    }

    /**
     * Enviar mensaje a WhatsApp vía Evolution API
     * Usa el servicio EvolutionApiService que ya está probado y funciona
     */
    private function sendToEvolutionAPI($phone, $message)
    {
        try {
            // Obtener instanceName desde el usuario autenticado
            $user = auth()->user();
            $instanceName = $user && $user->company_slug 
                ? $user->company_slug 
                : 'withmia-admin-qb8yer'; // Fallback

            // Limpiar número de teléfono (remover +, espacios, etc.)
            $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

            Log::info('📤 Enviando mensaje a WhatsApp vía EvolutionApiService', [
                'user_id' => $this->userId,
                'instance' => $instanceName,
                'phone' => $cleanPhone,
                'message_preview' => substr($message, 0, 50)
            ]);

            // Usar el servicio que YA FUNCIONA para recibir mensajes
            $result = $this->evolutionApi->sendTextMessage(
                $instanceName,
                $cleanPhone,
                $message
            );

            if ($result['success']) {
                Log::info('✅ Mensaje enviado exitosamente a WhatsApp', [
                    'user_id' => $this->userId,
                    'phone' => $cleanPhone,
                    'result' => $result
                ]);
                return true;
            } else {
                Log::error('❌ Error enviando a WhatsApp vía EvolutionApiService', [
                    'user_id' => $this->userId,
                    'phone' => $cleanPhone,
                    'error' => $result['error'] ?? 'Unknown error'
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('💥 Exception en sendToEvolutionAPI', [
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Obtener contactos - CON FILTRO DE SEGURIDAD
     */
    public function getContacts()
    {
        try {
            // NOTA: Chatwoot no tiene endpoint para filtrar contactos por inbox
            // Se obtienen todos y se filtran en el backend
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/contacts');

            if ($response->successful()) {
                $contacts = $response->json();
                
                // TODO: Implementar filtrado de contactos por inbox si es necesario
                // Por ahora devolvemos todos los contactos del account
                
                return response()->json([
                    'success' => true,
                    'data' => $contacts
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No se pudieron obtener los contactos'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Contacts Error: ' . $e->getMessage(), [
                'user_id' => $this->userId
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener contactos'
            ], 500);
        }
    }

    /**
     * Obtener labels (etiquetas)
     */
    public function getLabels()
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/labels');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            // Si falla, devolver array vacío para no romper el frontend
            return response()->json([
                'success' => true,
                'data' => []
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Labels Error: ' . $e->getMessage(), [
                'user_id' => $this->userId
            ]);
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

    /**
     * Obtener teams (equipos)
     */
    public function getTeams()
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            // Si falla, devolver array vacío para no romper el frontend
            return response()->json([
                'success' => true,
                'data' => []
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Teams Error: ' . $e->getMessage(), [
                'user_id' => $this->userId
            ]);
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

    /**
     * Obtener estadísticas del usuario
     */
    public function getUserDashboardStats()
    {
        try {
            // Por ahora devolver stats simuladas
            // TODO: Implementar llamada real a API de Chatwoot cuando esté disponible
            return response()->json([
                'success' => true,
                'data' => [
                    'assigned_conversations' => 0,
                    'pending_conversations' => 0,
                    'resolved_conversations' => 0
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get User Stats Error: ' . $e->getMessage(), [
                'user_id' => $this->userId
            ]);
            return response()->json([
                'success' => true,
                'data' => [
                    'assigned_conversations' => 0,
                    'pending_conversations' => 0,
                    'resolved_conversations' => 0
                ]
            ]);
        }
    }

    /**
     * Marcar conversación como leída (actualizar last_seen)
     */
    public function markConversationAsRead($conversationId)
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->post("{$this->chatwootBaseUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/update_last_seen");

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Conversación marcada como leída'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al marcar conversación como leída'
            ], $response->status());
        } catch (\Exception $e) {
            Log::error('Error marcando conversación como leída', [
                'conversation_id' => $conversationId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al marcar conversación como leída'
            ], 500);
        }
    }

    /**
     * BÚSQUEDA GLOBAL: Buscar en todas las conversaciones y mensajes
     * Solo busca en conversaciones del inbox del usuario
     */
    public function searchConversations(Request $request)
    {
        try {
            $searchTerm = $request->input('q', '');
            
            if (empty($searchTerm) || strlen($searchTerm) < 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'El término de búsqueda debe tener al menos 2 caracteres',
                    'data' => []
                ], 400);
            }

            // SEGURIDAD: Obtener inbox del usuario autenticado
            $user = auth()->user();
            $inboxId = $user ? $user->chatwoot_inbox_id : null;
            
            if (!$inboxId) {
                Log::warning('Usuario sin inbox_id intentó buscar', [
                    'user_id' => $user ? $user->id : null,
                    'email' => $user ? $user->email : null
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado'
                ], 403);
            }

            Log::info('Búsqueda global iniciada', [
                'user_id' => $user->id,
                'search_term' => $searchTerm,
                'inbox_id' => $inboxId
            ]);

            // PASO 1: Obtener TODAS las conversaciones del usuario (paginación infinita)
            $allConversations = [];
            $currentPage = 1;
            $hasMorePages = true;
            
            while ($hasMorePages) {
                $response = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations', [
                    'inbox_id' => $inboxId,
                    'page' => $currentPage,
                    'status' => 'all' // Buscar en todas (abiertas y cerradas)
                ]);

                if (!$response->successful()) {
                    Log::error('Error obteniendo conversaciones para búsqueda', [
                        'page' => $currentPage,
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    break;
                }

                $responseData = $response->json();
                $pageConversations = $responseData['data']['payload'] ?? [];
                $allConversations = array_merge($allConversations, $pageConversations);
                
                // Verificar si hay más páginas
                $meta = $responseData['meta'] ?? [];
                $hasMorePages = isset($meta['all_count']) && count($allConversations) < $meta['all_count'];
                
                Log::info('Página de búsqueda obtenida', [
                    'page' => $currentPage,
                    'conversations_in_page' => count($pageConversations),
                    'total_so_far' => count($allConversations),
                    'has_more' => $hasMorePages
                ]);
                
                $currentPage++;
                
                // Seguridad: Limitar a 10 páginas máximo (250 conversaciones)
                if ($currentPage > 10) {
                    Log::warning('Límite de páginas alcanzado en búsqueda', [
                        'max_pages' => 10,
                        'total_conversations' => count($allConversations)
                    ]);
                    break;
                }
            }
            $searchLower = strtolower($searchTerm);
            $matchedConversations = [];

            // PASO 2: Buscar en cada conversación
            foreach ($allConversations as $conversation) {
                $matches = [];
                $conversationId = $conversation['id'];
                
                // Buscar en nombre del contacto
                $contactName = $conversation['meta']['sender']['name'] ?? '';
                if (stripos($contactName, $searchTerm) !== false) {
                    $matches[] = 'contact_name';
                }
                
                // Buscar en email
                $email = $conversation['meta']['sender']['email'] ?? '';
                if (stripos($email, $searchTerm) !== false) {
                    $matches[] = 'email';
                }
                
                // Buscar en teléfono
                $phone = $conversation['meta']['sender']['phone_number'] ?? '';
                if (stripos($phone, $searchTerm) !== false) {
                    $matches[] = 'phone';
                }
                
                // Buscar en etiquetas
                foreach ($conversation['labels'] ?? [] as $label) {
                    if (stripos($label, $searchTerm) !== false) {
                        $matches[] = 'label';
                        break;
                    }
                }
                
                // PASO 3: Buscar en los mensajes de esta conversación
                $messagesResponse = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $conversationId . '/messages');
                
                if ($messagesResponse->successful()) {
                    $messages = $messagesResponse->json()['payload'] ?? [];
                    $matchingMessages = [];
                    
                    foreach ($messages as $message) {
                        $content = $message['content'] ?? '';
                        if (stripos($content, $searchTerm) !== false) {
                            $matchingMessages[] = [
                                'id' => $message['id'],
                                'content' => $content,
                                'created_at' => $message['created_at'] ?? null,
                                'message_type' => $message['message_type'] ?? null
                            ];
                        }
                    }
                    
                    if (!empty($matchingMessages)) {
                        $matches[] = 'messages';
                        $conversation['matching_messages'] = $matchingMessages;
                        $conversation['matching_messages_count'] = count($matchingMessages);
                    }
                }
                
                // Si hay algún match, normalizar estructura y agregar a resultados
                if (!empty($matches)) {
                    // Normalizar estructura para que coincida con el frontend
                    $normalizedConversation = [
                        'id' => $conversation['id'],
                        'status' => $conversation['status'] ?? 'open',
                        'priority' => $conversation['priority'] ?? 'medium',
                        'assignee_id' => $conversation['assignee_id'] ?? null,
                        'assignee' => $conversation['assignee'] ?? null,
                        'labels' => $conversation['labels'] ?? [],
                        'unread_count' => $conversation['unread_count'] ?? 0,
                        'inbox_id' => $conversation['inbox_id'] ?? null,
                        'contact' => [
                            'name' => $conversation['meta']['sender']['name'] ?? 'Sin nombre',
                            'email' => $conversation['meta']['sender']['email'] ?? '',
                            'phone_number' => $conversation['meta']['sender']['phone_number'] ?? '',
                            'avatar' => $conversation['meta']['sender']['thumbnail'] ?? '',
                            'avatarUrl' => $conversation['meta']['sender']['thumbnail'] ?? '',
                            'status' => 'offline'
                        ],
                        'last_message' => [
                            'content' => $conversation['messages'][0]['content'] ?? '',
                            'timestamp' => $conversation['messages'][0]['created_at'] ?? $conversation['created_at'] ?? now(),
                            'sender' => $conversation['messages'][0]['message_type'] === 0 ? 'contact' : 'agent'
                        ],
                        'match_fields' => $matches,
                        'matching_messages' => $conversation['matching_messages'] ?? [],
                        'matching_messages_count' => $conversation['matching_messages_count'] ?? 0
                    ];
                    
                    $matchedConversations[] = $normalizedConversation;
                }
            }

            Log::info('Búsqueda global completada', [
                'user_id' => $user->id,
                'search_term' => $searchTerm,
                'total_conversations_checked' => count($allConversations),
                'matched_conversations' => count($matchedConversations)
            ]);

            return response()->json([
                'success' => true,
                'data' => $matchedConversations,
                'meta' => [
                    'search_term' => $searchTerm,
                    'total_checked' => count($allConversations),
                    'total_matched' => count($matchedConversations)
                ]
            ]);

        } catch (\Exception $e) {
            $user = auth()->user();
            Log::error('Error en búsqueda global', [
                'user_id' => $user ? $user->id : null,
                'search_term' => $request->input('q'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al realizar la búsqueda: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Proxy para archivos/imágenes de Chatwoot
     * Evita problemas de CORS al cargar imágenes desde Active Storage de Rails
     * NOTA: Este método NO requiere autenticación - la validación es por URL
     */
    public function proxyAttachment(Request $request)
    {
        try {
            $url = $request->input('url');
            
            if (!$url) {
                return response()->json(['error' => 'URL requerida'], 400);
            }

            // Validar que la URL sea de Chatwoot (puede tener diferentes subdominios en Railway)
            $urlHost = parse_url($url, PHP_URL_HOST);
            
            // Permitir cualquier URL de Chatwoot en Railway (no depende de autenticación)
            $isValidChatwootUrl = (
                $urlHost && str_contains($urlHost, 'chatwoot') && str_contains($urlHost, 'railway.app')
            );
            
            if (!$isValidChatwootUrl) {
                Log::warning('Intento de proxy a URL no autorizada', [
                    'url' => $url,
                    'actual_host' => $urlHost
                ]);
                return response()->json(['error' => 'URL no autorizada'], 403);
            }

            // Active Storage de Rails usa redirecciones, necesitamos seguirlas
            // Usar withOptions para configurar Guzzle y seguir redirects
            try {
                $response = Http::withOptions([
                    'allow_redirects' => [
                        'max' => 5,
                        'strict' => false,
                        'referer' => true,
                        'protocols' => ['http', 'https'],
                        'track_redirects' => true
                    ],
                    'verify' => false, // Desactivar verificación SSL si hay problemas
                    'http_errors' => false, // No lanzar excepciones en errores HTTP
                ])
                ->timeout(15)
                ->get($url);
            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                // El servidor de Chatwoot no existe o no responde
                Log::warning('Servidor Chatwoot no disponible', [
                    'url' => $url,
                    'error' => $e->getMessage()
                ]);
                return response()->json(['error' => 'Servidor no disponible'], 404);
            }

            // Si el servidor devuelve error (404, 500, etc.), retornar 404
            if (!$response->successful()) {
                Log::info('Archivo no encontrado en Chatwoot', [
                    'url' => $url,
                    'status' => $response->status()
                ]);
                return response()->json(['error' => 'Archivo no disponible'], 404);
            }

            // Detectar el tipo de contenido
            $contentType = $response->header('Content-Type') ?? 'application/octet-stream';
            
            // Si es HTML, probablemente es un error o página de login
            if (str_contains($contentType, 'text/html')) {
                Log::warning('Respuesta HTML en lugar de archivo', [
                    'url' => $url,
                    'content_type' => $contentType
                ]);
                return response()->json(['error' => 'Archivo no disponible'], 404);
            }
            
            // Retornar el archivo con el tipo de contenido correcto
            return response($response->body())
                ->header('Content-Type', $contentType)
                ->header('Cache-Control', 'public, max-age=86400') // Cache por 24 horas
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            Log::error('Error en proxy de attachment', [
                'url' => $request->input('url'),
                'error' => $e->getMessage()
            ]);
            
            // Retornar 404 en lugar de 500 para que el frontend muestre el placeholder
            return response()->json(['error' => 'Archivo no disponible'], 404);
        }
    }
}
