<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Services\EvolutionApiService;
use App\Services\ConversationDeduplicationService;

class ChatwootController extends Controller
{
    private $chatwootBaseUrl;
    private $chatwootToken;
    private $accountId;
    private $inboxId;
    private $userId;
    private EvolutionApiService $evolutionApi;
    private ConversationDeduplicationService $deduplicationService;

    public function __construct(EvolutionApiService $evolutionApi, ConversationDeduplicationService $deduplicationService)
    {
        $this->evolutionApi = $evolutionApi;
        $this->deduplicationService = $deduplicationService;
        
        // CRÍTICO: Asegurar que el middleware 'auth' se ejecute ANTES del constructor
        $this->middleware(function ($request, $next) {
            $this->initializeChatwootConfig();
            return $next($request);
        });
    }

    /**
     * Inicializar configuración de Chatwoot (se ejecuta DESPUÉS del middleware auth)
     */
    private function initializeChatwootConfig()
    {
        $this->chatwootBaseUrl = config('services.chatwoot.base_url', 'http://localhost:3000');

        // Obtener usuario autenticado y su company
        $user = auth()->user();
        $company = $user ? $user->company : null;

        // Guardar user ID para logs
        $this->userId = $user ? $user->id : null;

        // Usar Account ID de la company del usuario
        $this->accountId = $company && $company->chatwoot_account_id
            ? $company->chatwoot_account_id
            : config('chatwoot.account_id', '1');

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
            $this->chatwootToken = config('services.chatwoot.api_token');
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
     * Obtener conversaciones (REAL API) - CON FILTRO DE SEGURIDAD
     */
    public function getConversations(Request $request)
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
                        'payload' => []
                    ],
                    'message' => 'No tienes un inbox asignado'
                ]);
            }

            // ⚡ CACHE: Intentar cargar desde caché primero (60 segundos)
            $cacheKey = "conversations_user_{$this->userId}_inbox_{$this->inboxId}";
            $cacheTTL = 60; // segundos
            
            // Si hay filtros en el request, agregar al cache key y reducir TTL
            $filters = $request->only(['status', 'assignee_type']);
            if (!empty($filters)) {
                $cacheKey .= '_' . md5(json_encode($filters));
                $cacheTTL = 30; // Reducir tiempo si hay filtros
            }

            // 🔍 VALIDAR: Verificar si hay mensajes nuevos desde que se cacheó
            $lastMessageCacheKey = "last_message_inbox_{$this->inboxId}";
            $lastMessageTimestamp = Cache::get($lastMessageCacheKey);
            $cachedData = Cache::get($cacheKey);
            $cacheTimestamp = Cache::get($cacheKey . '_timestamp');

            // Si hay mensaje nuevo después del caché, invalidar
            if ($cachedData !== null && $lastMessageTimestamp && $cacheTimestamp) {
                if ($lastMessageTimestamp > $cacheTimestamp) {
                    Log::info('🗑️ Caché invalidado por mensaje nuevo', [
                        'user_id' => $this->userId,
                        'cache_timestamp' => $cacheTimestamp,
                        'last_message_timestamp' => $lastMessageTimestamp
                    ]);
                    Cache::forget($cacheKey);
                    Cache::forget($cacheKey . '_timestamp');
                    $cachedData = null;
                }
            }
            
            // Intentar obtener desde caché
            if ($cachedData !== null) {
                Log::info('⚡ Conversations loaded from CACHE', [
                    'user_id' => $this->userId,
                    'total' => count($cachedData),
                    'cache_key' => $cacheKey
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => [
                        'payload' => $cachedData,
                        'meta' => [
                            'total' => count($cachedData),
                            'from_cache' => true
                        ]
                    ]
                ]);
            }

            // 🔄 PAGINACIÓN INFINITA: Cargar TODAS las conversaciones desde API
            $allConversations = [];
            $currentPage = 1;
            $perPage = 100;
            $hasMorePages = true;

            // Parámetros base con FILTRO DE SEGURIDAD
            $baseParams = [
                'per_page' => $perPage,
                'inbox_id' => $this->inboxId // ✅ FILTRO CRÍTICO
            ];

            // Agregar filtros adicionales del request si existen
            if ($request->has('status')) {
                $baseParams['status'] = $request->input('status');
            }
            if ($request->has('assignee_type')) {
                $baseParams['assignee_type'] = $request->input('assignee_type');
            }

            Log::info('Starting infinite pagination for conversations', [
                'user_id' => $this->userId,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId,
                'base_params' => $baseParams
            ]);

            // Bucle para cargar todas las páginas
            while ($hasMorePages) {
                $params = array_merge($baseParams, ['page' => $currentPage]);

                $response = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations', $params);

                if ($response->successful()) {
                    $data = $response->json();
                    $conversations = $data['data']['payload'] ?? [];

                    // Si no hay conversaciones en esta página, terminamos
                    if (empty($conversations)) {
                        $hasMorePages = false;
                        break;
                    }

                    // DOBLE FILTRO DE SEGURIDAD: Por si la API no respeta el parámetro
                    $filteredConversations = array_filter($conversations, function($conv) {
                        // Filtro 1: Verificar inbox_id
                        if (!isset($conv['inbox_id']) || $conv['inbox_id'] != $this->inboxId) {
                            return false;
                        }
                        
                        // 🔒 Filtro 2: EXCLUIR conversaciones de EvolutionAPI
                        $senderName = $conv['meta']['sender']['name'] ?? '';
                        if (stripos($senderName, 'EvolutionAPI') !== false) {
                            return false; // Excluir esta conversación
                        }
                        
                        return true; // Incluir la conversación
                    });

                    // Agregar a la lista total
                    $allConversations = array_merge($allConversations, array_values($filteredConversations));

                    Log::info('Page fetched and filtered', [
                        'page' => $currentPage,
                        'conversations_in_page' => count($conversations),
                        'after_inbox_filter' => count($filteredConversations),
                        'total_so_far' => count($allConversations),
                        'evolutionapi_filtered' => true
                    ]);

                    // Continuar a la siguiente página
                        $currentPage++;

                    // Límite de seguridad: máximo 20 páginas (2000 conversaciones)
                    if ($currentPage > 20) {
                        Log::warning('Reached safety limit of 20 pages');
                        $hasMorePages = false;
                    }
                } else {
                    Log::error('Error fetching page', [
                        'page' => $currentPage,
                        'status' => $response->status()
                    ]);
                    $hasMorePages = false;
                }
            }

            Log::info('All conversations fetched successfully', [
                'user_id' => $this->userId,
                'total_pages' => $currentPage,
                'total_conversations' => count($allConversations)
            ]);

            // 🔗 AUTO-FUSIÓN: Fusionar duplicados automáticamente en la base de datos
            try {
                $mergeResult = $this->deduplicationService->autoMergeDuplicates($this->inboxId);
                if ($mergeResult['success'] && isset($mergeResult['merged']) && $mergeResult['merged'] > 0) {
                    Log::info('✅ AUTO-FUSIÓN: Conversaciones fusionadas', $mergeResult);
                    // Invalidar caché para recargar datos actualizados
                    Cache::forget($cacheKey);
                    Cache::forget($cacheKey . '_timestamp');
                }
            } catch (\Exception $e) {
                Log::error('❌ Error en auto-fusión', ['error' => $e->getMessage()]);
            }

            // 🔗 DEDUPLICACIÓN: Unificar conversaciones duplicadas por identifiers de Evolution
            $allConversations = $this->deduplicateConversationsByEvolutionIdentifiers($allConversations);

            // �💾 Guardar en caché para próximas cargas
            Cache::put($cacheKey, $allConversations, $cacheTTL);
            Cache::put($cacheKey . '_timestamp', now()->timestamp, $cacheTTL);
            Log::info('💾 Conversations saved to CACHE', [
                'cache_key' => $cacheKey,
                'ttl_seconds' => $cacheTTL,
                'timestamp' => now()->timestamp,
                'total' => count($allConversations)
            ]);

            // Devolver estructura esperada por el frontend
            return response()->json([
                'success' => true,
                'data' => [
                    'payload' => $allConversations,
                    'meta' => [
                        'total' => count($allConversations),
                        'pages_loaded' => $currentPage,
                        'from_cache' => false
                    ]
                ]
            ]);

            // Si no hay conversaciones, devolver array vacío
            return response()->json([
                'success' => true,
                'data' => [
                    'payload' => []
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
                ]
            ]);
        }
    }

    /**
     * Obtener una conversación específica por ID - CON VALIDACIÓN DE SEGURIDAD Y CACHÉ REDIS
     */
    public function getConversation($id)
    {
        try {
            // SEGURIDAD: Validar que el usuario tenga inbox asignado
            if (!$this->inboxId) {
                Log::warning('Usuario sin inbox_id intentó acceder a conversación', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado'
                ], 403);
            }

            // 🚀 CACHÉ: Intentar obtener desde Redis (TTL 30 segundos)
            $cacheKey = "conversation:{$id}:inbox:{$this->inboxId}";
            $cacheTTL = 30; // 30 segundos - balance entre velocidad y frescura
            
            $cached = \Illuminate\Support\Facades\Cache::get($cacheKey);
            
            if ($cached) {
                Log::info('⚡ Conversación desde CACHÉ Redis', [
                    'conversation_id' => $id,
                    'cache_key' => $cacheKey
                ]);
                
                return response()->json([
                    'success' => true,
                    'payload' => $cached,
                    'cached' => true
                ]);
            }

            // Obtener la conversación desde Chatwoot
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $id);

            if (!$response->successful()) {
                Log::warning('Conversación no encontrada', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'status' => $response->status()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Conversación no encontrada'
                ], 404);
            }

            $conversation = $response->json();

            // SEGURIDAD: Validar que la conversación pertenece al inbox del usuario
            if (isset($conversation['inbox_id']) && $conversation['inbox_id'] != $this->inboxId) {
                Log::warning('Usuario intentó acceder a conversación de otro inbox', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'conversation_inbox_id' => $conversation['inbox_id'],
                    'user_inbox_id' => $this->inboxId
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para acceder a esta conversación'
                ], 403);
            }

            // 🚀 CACHÉ: Guardar en Redis
            \Illuminate\Support\Facades\Cache::put($cacheKey, $conversation, $cacheTTL);

            Log::info('Conversación obtenida desde Chatwoot y cacheada', [
                'user_id' => $this->userId,
                'conversation_id' => $id,
                'unread_count' => $conversation['unread_count'] ?? 0,
                'cache_ttl' => $cacheTTL
            ]);

            return response()->json([
                'success' => true,
                'payload' => $conversation,
                'cached' => false
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener conversación', [
                'user_id' => $this->userId,
                'conversation_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la conversación',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener mensajes de una conversación específica - CON VALIDACIÓN DE SEGURIDAD Y CACHE
     */
    public function getConversationMessages($id, Request $request = null)
    {
        try {
            // 🚀 PAGINACIÓN: Límite de mensajes (default 50, max 200)
            $limit = min((int)($request?->query('limit', 50) ?? 50), 200);
            $before = $request?->query('before'); // ID del mensaje más antiguo para cargar más
            
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

            // 🚀 OPTIMIZACIÓN: Cache key para mensajes (incluye limit para diferentes páginas)
            $cacheKey = "messages:inbox:{$this->inboxId}:conv:{$id}:limit:{$limit}" . ($before ? ":before:{$before}" : "");
            $cacheTTL = 120; // ✅ 2 minutos (los mensajes nuevos llegan por WebSocket)
            
            // 🚀 OPTIMIZACIÓN: Cache de validación de conversaciones (evita doble llamada)
            $validationCacheKey = "conv_valid:inbox:{$this->inboxId}:conv:{$id}";
            $isValidated = \Illuminate\Support\Facades\Cache::get($validationCacheKey);
            
            // Si ya validamos esta conversación recientemente, saltamos la verificación
            if (!$isValidated) {
                // PASO 1: Obtener la conversación para validar permisos
                $convResponse = Http::timeout(5)->withHeaders([
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
                
                // 🚀 Guardar validación en cache por 5 minutos
                \Illuminate\Support\Facades\Cache::put($validationCacheKey, true, 300);
            }

            // 🚀 Intentar obtener mensajes desde cache
            $cached = \Illuminate\Support\Facades\Cache::get($cacheKey);
            if ($cached) {
                return response()->json([
                    'success' => true,
                    'payload' => $cached['payload'],
                    'meta' => $cached['meta'] ?? [],
                    'from_cache' => true
                ]);
            }

            // PASO 3: Si pasa la validación, obtener los mensajes
            // 🔧 IMPORTANTE: Chatwoot limita a 20 mensajes por llamada, hacemos múltiples para obtener más
            $allMessages = [];
            $beforeId = $before;
            $maxIterations = ceil($limit / 20); // Cuántas llamadas necesitamos
            $iteration = 0;
            $lastBatchWasFull = true; // Para saber si hay más mensajes
            
            Log::info('Cargando mensajes', [
                'conversation_id' => $id,
                'limit' => $limit,
                'before' => $before,
                'max_iterations' => $maxIterations
            ]);
            
            while ($iteration < $maxIterations) {
                $queryParams = [];
                if ($beforeId) {
                    $queryParams['before'] = $beforeId;
                }
                
                $response = Http::timeout(8)->withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $id . '/messages', $queryParams);
                
                if (!$response->successful()) {
                    Log::warning('Error en API Chatwoot', ['status' => $response->status()]);
                    break;
                }
                
                $messagesData = $response->json();
                $batchMessages = $messagesData['payload'] ?? [];
                
                Log::info('Batch recibido', [
                    'iteration' => $iteration,
                    'batch_size' => count($batchMessages),
                    'before_id' => $beforeId
                ]);
                
                if (empty($batchMessages)) {
                    $lastBatchWasFull = false;
                    break; // No hay más mensajes
                }
                
                $allMessages = array_merge($allMessages, $batchMessages);
                
                // Obtener el ID más antiguo para la siguiente iteración
                $oldestInBatch = min(array_column($batchMessages, 'id'));
                
                // Si el batch es menor a 20, no hay más mensajes
                if (count($batchMessages) < 20) {
                    $lastBatchWasFull = false;
                    break;
                }
                
                // Preparar para siguiente iteración
                $beforeId = $oldestInBatch;
                $iteration++;
            }
            
            // Procesar mensajes obtenidos
            if (!empty($allMessages)) {
                $messagesData = ['payload' => $allMessages];
                
                // 🔒 FILTRAR mensajes de EvolutionAPI (no mostrarlos al usuario)
                if (isset($messagesData['payload']) && is_array($messagesData['payload'])) {
                    $filteredMessages = array_filter($messagesData['payload'], function($message) {
                        // Excluir mensajes que contengan "EvolutionAPI" en el nombre del sender
                        $senderName = $message['sender']['name'] ?? '';
                        $messageType = $message['message_type'] ?? null;

                        // ✅ SIEMPRE incluir mensajes outgoing (enviados por el agente)
                        if ($messageType === 1 || $messageType === 'outgoing') {
                            return true;
                        }

                        // Para mensajes incoming, filtrar EvolutionAPI
                        
                        // También podemos filtrar por contenido si es necesario
                        // $content = $message['content'] ?? '';
                        
                        // Retornar false para excluir el mensaje (true para incluirlo)
                        return stripos($senderName, 'EvolutionAPI') === false;
                    });
                    
                    // Reindexar el array para evitar huecos en los índices
                    $messagesData['payload'] = array_values($filteredMessages);
                }
                
                // 🚀 PAGINACIÓN: Limitar mensajes y agregar metadata
                $allMessages = $messagesData['payload'] ?? [];
                $totalMessages = count($allMessages);
                
                // Ordenar por ID descendente (más recientes primero) y tomar los últimos N
                usort($allMessages, fn($a, $b) => $b['id'] - $a['id']);
                $limitedMessages = array_slice($allMessages, 0, $limit);
                
                // Revertir para mostrar en orden cronológico (más antiguos primero)
                $limitedMessages = array_reverse($limitedMessages);
                
                $messagesData['payload'] = $limitedMessages;
                // has_more es true si: obtuvimos más de lo que pedimos O el último batch estaba lleno
                $hasMore = $totalMessages > $limit || $lastBatchWasFull;
                $oldestMessageId = !empty($limitedMessages) ? $limitedMessages[0]['id'] : null;
                
                Log::info('Mensajes procesados', [
                    'total' => $totalMessages,
                    'returned' => count($limitedMessages),
                    'has_more' => $hasMore,
                    'oldest_id' => $oldestMessageId,
                    'last_batch_was_full' => $lastBatchWasFull
                ]);
                
                $meta = [
                    'total' => $totalMessages,
                    'returned' => count($limitedMessages),
                    'has_more' => $hasMore,
                    'oldest_id' => $oldestMessageId
                ];
                
                // 🚀 Guardar mensajes en cache (solo si NO es loadMore para evitar cache de resultados parciales)
                if (!$before) {
                    \Illuminate\Support\Facades\Cache::put($cacheKey, [
                        'payload' => $messagesData,
                        'meta' => $meta
                    ], $cacheTTL);
                }
                
                return response()->json([
                    'success' => true,
                    'payload' => $messagesData,
                    'meta' => $meta,
                    'from_cache' => false
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No se pudieron obtener los mensajes'
            ], 500);

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
     * Marcar conversación como leída (update_last_seen)
     */
    public function markAsRead($id)
    {
        try {
            // SEGURIDAD: Validar que el usuario tenga inbox asignado
            if (!$this->inboxId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado'
                ], 403);
            }

            // Llamar a la API de Chatwoot para actualizar last_seen
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->post($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $id . '/update_last_seen');

            if ($response->successful()) {
                // 🚀 INVALIDAR CACHÉ: La conversación cambió (unread_count = 0)
                $cacheKey = "conversation:{$id}:inbox:{$this->inboxId}";
                \Illuminate\Support\Facades\Cache::forget($cacheKey);
                
                Log::info('Conversación marcada como leída (caché invalidado)', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Conversación marcada como leída'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No se pudo marcar como leída'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error marking conversation as read: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'conversation_id' => $id
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error al marcar como leída'
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
     * SOPORTA:
     * - Mensajes de texto
     * - Archivos (imágenes, videos, audio, documentos)
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

            // PASO 4: Detectar si es archivo o texto
            Log::info('📦 Detectando tipo de contenido', [
                'hasFile' => $request->hasFile('file'),
                'hasAttachments' => $request->hasFile('attachments'),
                'allFiles' => array_keys($request->allFiles()),
                'contentType' => $request->header('Content-Type'),
                'allInputs' => array_keys($request->all())
            ]);
            
            // Verificar múltiples formas de envío de archivo
            $uploadedFile = $request->file('file') ?? $request->file('attachments') ?? $request->file('attachment');
            
            if ($uploadedFile) {
                // 📎 ENVÍO DE ARCHIVO (imagen, video, audio, documento)
                Log::info('📎 Archivo detectado, procesando...', [
                    'fileName' => $uploadedFile->getClientOriginalName(),
                    'mimeType' => $uploadedFile->getMimeType(),
                    'size' => $uploadedFile->getSize()
                ]);
                return $this->sendFileMessage($request, $id, $contactPhone);
            }

            // PASO 5: Enviar mensaje de texto
            $messageContent = $request->input('content');
            
            if (empty($messageContent)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El mensaje no puede estar vacío'
                ], 400);
            }
            
            $evolutionResult = $this->sendToEvolutionAPI($contactPhone, $messageContent);

            if ($evolutionResult) {
                Log::info('✅ Mensaje enviado via Evolution (sin duplicado en Chatwoot)', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'phone' => $contactPhone
                ]);

                // 🗑️ INVALIDAR CACHÉ
                $cacheKey = "conversations_user_{$this->userId}_inbox_{$this->inboxId}";
                Cache::forget($cacheKey);

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
     * Enviar archivo (imagen, video, audio, documento) vía Evolution API
     * Usa base64 para evitar problemas de storage en Railway
     */
    private function sendFileMessage(Request $request, $conversationId, $contactPhone)
    {
        try {
            // Buscar archivo en múltiples nombres de campo
            $file = $request->file('file') ?? $request->file('attachments') ?? $request->file('attachment');
            
            if (!$file) {
                Log::error('❌ No se encontró archivo en el request');
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró archivo para enviar'
                ], 400);
            }
            
            $mimeType = $file->getMimeType();
            $originalName = $file->getClientOriginalName();
            $caption = $request->input('content', '');
            
            Log::info('📎 Procesando archivo para envío', [
                'user_id' => $this->userId,
                'conversation_id' => $conversationId,
                'mimeType' => $mimeType,
                'originalName' => $originalName,
                'size' => $file->getSize()
            ]);

            // DETECTAR SI ES UN AUDIO GRABADO (algunos browsers envían video/webm para audio)
            $isVoiceMessage = str_contains($originalName, 'audio-message');
            
            // Si es un mensaje de voz, forzar el tipo a audio
            if ($isVoiceMessage) {
                $mediaType = 'audio';
                // WhatsApp prefiere audio/ogg para notas de voz
                $mimeType = 'audio/ogg';
                Log::info('🎤 Detectado mensaje de voz, forzando tipo audio/ogg');
            } else {
                // Determinar el tipo de media según el MIME type
                $mediaType = $this->getMediaType($mimeType);
            }
            
            // Convertir archivo a base64 (funciona mejor en Railway que URLs)
            $fileContent = file_get_contents($file->getPathname());
            $base64Media = base64_encode($fileContent);
            
            Log::info('📁 Archivo convertido a base64', [
                'mediaType' => $mediaType,
                'isVoiceMessage' => $isVoiceMessage,
                'base64_length' => strlen($base64Media)
            ]);

            // Obtener instanceName desde el usuario autenticado
            $user = auth()->user();
            $instanceName = $user && $user->company_slug 
                ? $user->company_slug 
                : 'with-mia-cqwp4d'; // Fallback
            
            // Limpiar número de teléfono
            $cleanPhone = preg_replace('/[^0-9]/', '', $contactPhone);

            // Enviar según el tipo de media
            $evolutionResult = null;
            
            if ($isVoiceMessage) {
                // Para audios de voz, usar endpoint especial de WhatsApp
                Log::info('🎤 Enviando como nota de voz WhatsApp');
                $evolutionResult = $this->evolutionApi->sendWhatsAppAudio(
                    $instanceName,
                    $cleanPhone,
                    $base64Media
                );
            } else {
                // Para otros archivos, usar sendMedia con base64
                $evolutionResult = $this->evolutionApi->sendMediaMessage(
                    $instanceName,
                    $cleanPhone,
                    $base64Media,
                    $mediaType,
                    $mimeType,
                    !empty($caption) ? $caption : null,
                    $mediaType === 'document' ? $originalName : null
                );
            }

            if ($evolutionResult && $evolutionResult['success']) {
                Log::info('✅ Archivo enviado via Evolution API', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId,
                    'phone' => $cleanPhone,
                    'mediaType' => $mediaType
                ]);

                // 🗑️ INVALIDAR CACHÉ
                $cacheKey = "conversations_user_{$this->userId}_inbox_{$this->inboxId}";
                Cache::forget($cacheKey);

                return response()->json([
                    'success' => true,
                    'payload' => [
                        'id' => 'pending-' . time(),
                        'content' => $caption ?: "📎 {$originalName}",
                        'created_at' => now()->toISOString(),
                        'message_type' => 1, // outgoing
                        'status' => 'sent',
                        'attachments' => [[
                            'file_type' => $mimeType,
                            'file_name' => $originalName
                        ]],
                        'sender' => [
                            'name' => auth()->user()->name ?? 'Agent'
                        ]
                    ]
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No se pudo enviar el archivo a WhatsApp',
                'error' => $evolutionResult['error'] ?? 'Error desconocido'
            ], 500);

        } catch (\Exception $e) {
            Log::error('💥 Error enviando archivo: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'conversation_id' => $conversationId,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar archivo'
            ], 500);
        }
    }

    /**
     * Determinar el tipo de media según el MIME type
     */
    private function getMediaType(string $mimeType): string
    {
        if (str_starts_with($mimeType, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mimeType, 'video/')) {
            return 'video';
        }
        if (str_starts_with($mimeType, 'audio/')) {
            return 'audio';
        }
        // Cualquier otro tipo es documento
        return 'document';
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
                : 'with-mia-cqwp4d'; // Fallback

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
            Log::error('Chatwoot Get Labels Error: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

    public function getAgents()
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/agents');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => []
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Agents Error: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

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

            return response()->json([
                'success' => true,
                'data' => []
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Teams Error: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

    /**
     * Exportar TODAS las conversaciones con sus mensajes
     * Este endpoint hace múltiples llamadas a la API de Chatwoot para obtener
     * todos los mensajes de todas las conversaciones del inbox del usuario
     */
    public function exportAllConversationsWithMessages(Request $request)
    {
        try {
            // SEGURIDAD: Validar que el usuario tenga inbox asignado
            if (!$this->inboxId) {
                Log::warning('Usuario sin inbox_id intentó exportar conversaciones', [
                    'user_id' => $this->userId
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado',
                    'data' => []
                ]);
            }

            Log::info('Iniciando exportación de todas las conversaciones con mensajes', [
                'user_id' => $this->userId,
                'inbox_id' => $this->inboxId
            ]);

            // Paso 1: Obtener TODAS las conversaciones del inbox
            $allConversations = [];
            $currentPage = 1;
            $perPage = 100;
            $hasMorePages = true;

            while ($hasMorePages) {
                $params = [
                    'inbox_id' => $this->inboxId,
                    'page' => $currentPage,
                    'per_page' => $perPage
                ];

                $response = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get("{$this->chatwootBaseUrl}/api/v1/accounts/{$this->accountId}/conversations", $params);

                if ($response->successful()) {
                    $data = $response->json();
                    $conversations = $data['data']['payload'] ?? [];
                    
                    if (!empty($conversations)) {
                        $allConversations = array_merge($allConversations, $conversations);
                        $currentPage++;
                    } else {
                        $hasMorePages = false;
                    }
                } else {
                    $hasMorePages = false;
                    Log::error('Error obteniendo conversaciones para exportar', [
                        'status' => $response->status(),
                        'page' => $currentPage
                    ]);
                }
            }

            Log::info('Total de conversaciones encontradas', [
                'count' => count($allConversations)
            ]);

            // Paso 2: Para cada conversación, obtener sus mensajes
            $conversationsWithMessages = [];
            $processedCount = 0;
            $errorCount = 0;

            foreach ($allConversations as $conversation) {
                try {
                    $conversationId = $conversation['id'];
                    
                    // Obtener mensajes de esta conversación
                    $messagesResponse = Http::withHeaders([
                        'api_access_token' => $this->chatwootToken,
                        'Content-Type' => 'application/json'
                    ])->get("{$this->chatwootBaseUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages");

                    if ($messagesResponse->successful()) {
                        $messages = $messagesResponse->json();
                        $conversation['messages'] = $messages['payload'] ?? $messages ?? [];
                        $processedCount++;
                    } else {
                        $conversation['messages'] = [];
                        $errorCount++;
                        Log::warning('Error obteniendo mensajes de conversación', [
                            'conversation_id' => $conversationId,
                            'status' => $messagesResponse->status()
                        ]);
                    }

                    $conversationsWithMessages[] = $conversation;

                    // Pequeña pausa para no saturar la API
                    usleep(100000); // 0.1 segundos

                } catch (\Exception $e) {
                    $conversation['messages'] = [];
                    $conversationsWithMessages[] = $conversation;
                    $errorCount++;
                    Log::error('Excepción obteniendo mensajes', [
                        'conversation_id' => $conversation['id'] ?? 'unknown',
                        'error' => $e->getMessage()
                    ]);
                }
            }

            Log::info('Exportación completada', [
                'total_conversaciones' => count($allConversations),
                'procesadas_exitosamente' => $processedCount,
                'errores' => $errorCount
            ]);

            return response()->json([
                'success' => true,
                'data' => $conversationsWithMessages,
                'meta' => [
                    'total_conversations' => count($allConversations),
                    'processed_successfully' => $processedCount,
                    'errors' => $errorCount
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error en exportación de conversaciones: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al exportar conversaciones: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Actualizar contacto en Chatwoot
     */
    public function updateContact(Request $request, $contactId)
    {
        try {
            // Validar datos de entrada
            $validated = $request->validate([
                'name' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255',
                'phone_number' => 'nullable|string|max:50'
            ]);

            // Limpiar email si es el placeholder genérico (evita error de duplicado)
            $email = $validated['email'] ?? '';
            if (in_array(strtolower($email), ['sin-email@example.com', 'no-email@example.com', ''])) {
                $email = null;
            }

            Log::info('Actualizando contacto en Chatwoot', [
                'contact_id' => $contactId,
                'data' => $validated,
                'email_final' => $email,
                'user_id' => $this->userId,
                'account_id' => $this->accountId
            ]);

            // Preparar datos para Chatwoot (solo enviar campos con valor)
            $updateData = ['name' => $validated['name'] ?? ''];
            
            // Solo enviar email si tiene valor real
            if ($email !== null) {
                $updateData['email'] = $email;
            }
            
            // Solo enviar phone_number si tiene valor
            if (!empty($validated['phone_number'])) {
                $updateData['phone_number'] = $validated['phone_number'];
            }

            // Llamar a la API de Chatwoot para actualizar el contacto
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->put(
                $this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/contacts/' . $contactId,
                $updateData
            );

            if ($response->successful()) {
                $contactData = $response->json();
                
                Log::info('Contacto actualizado exitosamente', [
                    'contact_id' => $contactId,
                    'payload' => $contactData
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Contacto actualizado exitosamente',
                    'data' => $contactData['payload'] ?? $contactData
                ]);
            }

            Log::error('Error actualizando contacto en Chatwoot', [
                'contact_id' => $contactId,
                'status' => $response->status(),
                'response' => $response->body()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar contacto en Chatwoot',
                'error' => $response->body()
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error al actualizar contacto: ' . $e->getMessage(), [
                'contact_id' => $contactId,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar contacto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unificar conversaciones duplicadas basándose en identifiers de Evolution API
     * Busca conversaciones que compartan el mismo número real (con @s.whatsapp.net)
     */
    private function deduplicateConversationsByEvolutionIdentifiers(array $conversations): array
    {
        if (empty($conversations)) {
            return $conversations;
        }

        // Mapa para rastrear números reales (@s.whatsapp.net)
        $realNumberMap = [];
        $lidToRealNumberMap = [];
        $conversationsById = [];

        // Primera pasada: construir mapas de identificadores
        foreach ($conversations as $conv) {
            $conversationsById[$conv['id']] = $conv;
            $identifier = $conv['meta']['sender']['identifier'] ?? '';
            
            if (empty($identifier)) {
                continue;
            }

            // Si tiene @s.whatsapp.net, es un número real
            if (strpos($identifier, '@s.whatsapp.net') !== false) {
                $phoneNumber = str_replace('@s.whatsapp.net', '', $identifier);
                
                if (!isset($realNumberMap[$phoneNumber])) {
                    $realNumberMap[$phoneNumber] = [];
                }
                $realNumberMap[$phoneNumber][] = $conv['id'];
            }
            // Si tiene @lid, guardamos para potencial unificación
            elseif (strpos($identifier, '@lid') !== false) {
                // Extraer el número base del @lid
                $lidNumber = preg_replace('/@lid.*$/', '', $identifier);
                $lidNumber = preg_replace('/:\d+$/', '', $lidNumber); // Quitar :16 si existe
                
                if (!isset($lidToRealNumberMap[$lidNumber])) {
                    $lidToRealNumberMap[$lidNumber] = [];
                }
                $lidToRealNumberMap[$lidNumber][] = $conv['id'];
            }
        }

        // Segunda pasada: identificar y unificar duplicados
        $conversationsToKeep = [];
        $conversationsToMerge = [];
        $processedIds = [];

        foreach ($realNumberMap as $phoneNumber => $convIds) {
            // Si hay conversaciones con este número real
            if (count($convIds) > 1) {
                // Mantener la más reciente
                usort($convIds, function($a, $b) use ($conversationsById) {
                    $timeA = $conversationsById[$a]['timestamp'] ?? 0;
                    $timeB = $conversationsById[$b]['timestamp'] ?? 0;
                    return $timeB - $timeA; // Más reciente primero
                });

                $keepId = $convIds[0]; // Mantener la primera (más reciente)
                $mergeIds = array_slice($convIds, 1); // Marcar las demás para merge

                $conversationsToKeep[$keepId] = $conversationsById[$keepId];
                $processedIds[] = $keepId;

                foreach ($mergeIds as $mergeId) {
                    $conversationsToMerge[] = $mergeId;
                    $processedIds[] = $mergeId;
                }

                Log::info('🔗 Conversaciones duplicadas detectadas por número real', [
                    'phone_number' => $phoneNumber,
                    'keeping_id' => $keepId,
                    'merging_ids' => $mergeIds
                ]);
            } else {
                $convId = $convIds[0];
                $conversationsToKeep[$convId] = $conversationsById[$convId];
                $processedIds[] = $convId;
            }

            // Buscar LIDs relacionados con este número
            if (isset($lidToRealNumberMap[$phoneNumber])) {
                foreach ($lidToRealNumberMap[$phoneNumber] as $lidConvId) {
                    if (!in_array($lidConvId, $processedIds)) {
                        $conversationsToMerge[] = $lidConvId;
                        $processedIds[] = $lidConvId;

                        Log::info('🔗 Conversación LID vinculada a número real', [
                            'phone_number' => $phoneNumber,
                            'lid_conversation_id' => $lidConvId,
                            'linked_to_conversation_id' => $convIds[0]
                        ]);
                    }
                }
            }
        }

        // Tercera pasada: agregar conversaciones no procesadas
        foreach ($conversations as $conv) {
            if (!in_array($conv['id'], $processedIds)) {
                $conversationsToKeep[$conv['id']] = $conv;
            }
        }

        $result = array_values($conversationsToKeep);

        if (!empty($conversationsToMerge)) {
            Log::info('✅ Deduplicación completada', [
                'original_count' => count($conversations),
                'deduplicated_count' => count($result),
                'merged_conversations' => count($conversationsToMerge),
                'merged_ids' => $conversationsToMerge
            ]);
        }

        return $result;
    }

    /**
     * ✅ NUEVO: Eliminar conversación duplicada
     * Se usa desde el frontend para limpiar conversaciones detectadas como duplicadas
     */
    public function deleteConversation(Request $request, $conversationId)
    {
        try {
            // SEGURIDAD: Validar que el usuario tenga inbox asignado
            if (!$this->inboxId) {
                Log::warning('Usuario sin inbox_id intentó eliminar conversación', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado'
                ], 403);
            }

            // PASO 1: Verificar que la conversación existe y pertenece al inbox del usuario
            $convResponse = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->get("{$this->chatwootBaseUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}");

            if (!$convResponse->successful()) {
                Log::warning('Conversación no encontrada al intentar eliminar', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId,
                    'status' => $convResponse->status()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Conversación no encontrada'
                ], 404);
            }

            $conversation = $convResponse->json();

            // SEGURIDAD: Validar que la conversación pertenece al inbox del usuario
            if ($conversation['inbox_id'] != $this->inboxId) {
                Log::warning('Intento de eliminar conversación de otro inbox', [
                    'user_id' => $this->userId,
                    'user_inbox_id' => $this->inboxId,
                    'conversation_inbox_id' => $conversation['inbox_id'],
                    'conversation_id' => $conversationId
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para eliminar esta conversación'
                ], 403);
            }

            // PASO 2: Eliminar la conversación usando la API de Chatwoot
            $deleteResponse = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->delete("{$this->chatwootBaseUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}");

            if ($deleteResponse->successful()) {
                Log::info('✅ Conversación eliminada exitosamente', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId,
                    'contact_phone' => $conversation['meta']['sender']['phone_number'] ?? 'N/A'
                ]);

                // Limpiar cache relacionado
                $cacheKey = "conversations_user_{$this->userId}_inbox_{$this->inboxId}";
                Cache::forget($cacheKey);

                return response()->json([
                    'success' => true,
                    'message' => 'Conversación eliminada correctamente'
                ]);
            }

            // Si la eliminación falla
            Log::error('Error al eliminar conversación en Chatwoot', [
                'user_id' => $this->userId,
                'conversation_id' => $conversationId,
                'status' => $deleteResponse->status(),
                'response' => $deleteResponse->body()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la conversación en Chatwoot'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Excepción al eliminar conversación', [
                'user_id' => $this->userId,
                'conversation_id' => $conversationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno al eliminar conversación',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Obtener configuración de Chatwoot para el usuario actual
     */
    public function getConfig(Request $request)
    {
        try {
            $user = auth()->user();
            $company = $user ? $user->company : null;

            return response()->json([
                'success' => true,
                'data' => [
                    'base_url' => $this->chatwootBaseUrl,
                    'account_id' => $this->accountId,
                    'inbox_id' => $this->inboxId,
                    'website_token' => env('CHATWOOT_WEBSITE_TOKEN'),
                    'configured' => !empty($this->chatwootToken) && !empty($this->inboxId),
                    'company_name' => $company ? $company->name : null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting Chatwoot config', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener configuración'
            ], 500);
        }
    }
}
