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
            $errorOccurred = false;
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
                        'status' => $response->status(),
                        'response' => $response->body()
                    ]);
                    $errorOccurred = true;
                    $hasMorePages = false;
                }
            }

            Log::info('All conversations fetched successfully', [
                'user_id' => $this->userId,
                'total_pages' => $currentPage,
                'total_conversations' => count($allConversations),
                'error_occurred' => $errorOccurred
            ]);

            // � FALLBACK: Si la API falló, obtener conversaciones directamente de la DB
            if ($errorOccurred && empty($allConversations)) {
                Log::info("🔄 FALLBACK: Obteniendo conversaciones desde DB de Chatwoot");
                
                $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
                
                $conversationsFromDb = $chatwootDb->table('conversations')
                    ->where('account_id', $this->accountId)
                    ->where('inbox_id', $this->inboxId)
                    ->orderBy('last_activity_at', 'desc')
                    ->limit(50)
                    ->get();
                
                // Obtener contactos
                $contactIds = $conversationsFromDb->pluck('contact_id')->unique()->toArray();
                $contacts = $chatwootDb->table('contacts')
                    ->whereIn('id', $contactIds)
                    ->get()
                    ->keyBy('id');
                
                foreach ($conversationsFromDb as $conv) {
                    $contact = $contacts[$conv->contact_id] ?? null;
                    
                    // Obtener último mensaje
                    $lastMessage = $chatwootDb->table('messages')
                        ->where('conversation_id', $conv->id)
                        ->orderBy('created_at', 'desc')
                        ->first();
                    
                    $allConversations[] = [
                        'id' => $conv->display_id, // El frontend espera display_id
                        'account_id' => $conv->account_id,
                        'inbox_id' => $conv->inbox_id,
                        'status' => $conv->status == 0 ? 'open' : ($conv->status == 1 ? 'resolved' : 'pending'),
                        'meta' => [
                            'sender' => [
                                'id' => $contact->id ?? null,
                                'name' => $contact->name ?? 'Contacto',
                                'phone_number' => $contact->phone_number ?? null,
                                'identifier' => $contact->identifier ?? null
                            ]
                        ],
                        'messages' => $lastMessage ? [[
                            'id' => $lastMessage->id,
                            'content' => $lastMessage->content,
                            'message_type' => $lastMessage->message_type,
                            'created_at' => strtotime($lastMessage->created_at)
                        ]] : [],
                        'created_at' => strtotime($conv->created_at),
                        'last_activity_at' => strtotime($conv->last_activity_at),
                        'from_db_fallback' => true
                    ];
                }
                
                Log::info("✅ FALLBACK exitoso: " . count($allConversations) . " conversaciones obtenidas de DB");
            }

            // �🔗 AUTO-FUSIÓN: Fusionar duplicados automáticamente en la base de datos
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

            // 💾 Guardar en caché SOLO si no hubo error y hay conversaciones
            // Si hubo error (401, etc) y tenemos 0 conversaciones, NO cachear para reintentar
            if (!$errorOccurred || count($allConversations) > 0) {
                Cache::put($cacheKey, $allConversations, $cacheTTL);
                Cache::put($cacheKey . '_timestamp', now()->timestamp, $cacheTTL);
                Log::info('💾 Conversations saved to CACHE', [
                    'cache_key' => $cacheKey,
                    'ttl_seconds' => $cacheTTL,
                    'timestamp' => now()->timestamp,
                    'total' => count($allConversations)
                ]);
            } else {
                // Limpiar caché existente si hubo error
                Cache::forget($cacheKey);
                Cache::forget($cacheKey . '_timestamp');
                Log::warning('⚠️ NOT caching due to error with 0 conversations', [
                    'cache_key' => $cacheKey,
                    'error_occurred' => $errorOccurred
                ]);
            }

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
     * 
     * IMPORTANTE: El frontend envía display_id (ej: 72), pero la API de Chatwoot 
     * necesita el id interno (ej: 1). Primero buscamos en la DB para obtener el id real.
     */
    public function getConversationMessages($id, Request $request = null)
    {
        try {
            // 🚀 PAGINACIÓN: Límite de mensajes (default 20, max 100 para no saturar)
            $limit = min((int)($request?->query('limit', 20) ?? 20), 100);
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

            // 🔄 PASO 0: Buscar la conversación en la DB para obtener el ID real
            // El frontend puede enviar display_id o id, buscamos en ambos campos
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            $conversationFromDb = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where(function ($query) use ($id) {
                    $query->where('id', $id)
                          ->orWhere('display_id', $id);
                })
                ->first();
            
            if (!$conversationFromDb) {
                Log::warning('Conversación no encontrada en DB', [
                    'user_id' => $this->userId,
                    'conversation_id_requested' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Conversación no encontrada'
                ], 404);
            }
            
            // IMPORTANTE: Chatwoot API usa display_id, la DB usa id
            $dbConversationId = $conversationFromDb->id;  // Para queries a la DB de Chatwoot
            $apiConversationId = $conversationFromDb->display_id ?? $conversationFromDb->id;  // Para API HTTP
            
            // Compatibilidad: usar apiConversationId donde antes se usaba realConversationId
            $realConversationId = $apiConversationId;
            
            Log::info('Conversación encontrada en DB', [
                'requested_id' => $id,
                'db_id' => $dbConversationId,
                'api_id (display_id)' => $apiConversationId,
                'inbox_id' => $conversationFromDb->inbox_id
            ]);

            // VALIDACIÓN DE SEGURIDAD - Verificar que pertenece al inbox del usuario
            if ($conversationFromDb->inbox_id != $this->inboxId) {
                Log::warning('Intento de acceso no autorizado a conversación', [
                    'user_id' => $this->userId,
                    'conversation_id' => $realConversationId,
                    'conversation_inbox_id' => $conversationFromDb->inbox_id,
                    'user_inbox_id' => $this->inboxId
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permiso para ver esta conversación'
                ], 403);
            }

            // 🚀 OPTIMIZACIÓN: Cache key para mensajes (usa ID real)
            $cacheKey = "messages:inbox:{$this->inboxId}:conv:{$realConversationId}:limit:{$limit}" . ($before ? ":before:{$before}" : "");
            $cacheTTL = 60; // 1 minuto (los mensajes nuevos llegan por WebSocket)
            
            // Intentar obtener desde cache
            $cached = Cache::get($cacheKey);
            if ($cached) {
                Log::info("⚡ Mensajes desde cache", [
                    'conversation_id' => $realConversationId,
                    'count' => count($cached['payload']['payload'] ?? [])
                ]);
                return response()->json([
                    'success' => true,
                    'payload' => $cached['payload'],
                    'meta' => $cached['meta'],
                    'from_cache' => true
                ]);
            }
            
            // URL para obtener mensajes (usa display_id para API de Chatwoot)
            $chatwootUrl = $this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $apiConversationId . '/messages';
            
            // 🚀 PAGINACIÓN EFICIENTE: Solo obtener los mensajes necesarios (máximo 50)
            $messagesPerBatch = 50; // Cambiado de 20 a 50 para ser más eficiente
            $allMessages = [];
            $hasMore = false;
            
            Log::info("📥 Obteniendo mensajes para conversación {$realConversationId}", [
                'limit' => $limit,
                'before' => $before
            ]);
            
            // 🚀 UNA SOLA LLAMADA: Obtener solo los mensajes necesarios
            $queryParams = ['before' => $before]; // Chatwoot usa 'before' para paginación
            if (!$before) {
                $queryParams = []; // Primera carga - sin before
            }
            
            $response = Http::timeout(5)->withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->get($chatwootUrl, $queryParams);
            
            if (!$response->successful()) {
                Log::error("❌ Error obteniendo mensajes: " . $response->status() . " - " . $response->body());
                
                // FALLBACK: Obtener desde DB directamente (usa db_id, no display_id)
                $query = $chatwootDb->table('messages')
                    ->where('conversation_id', $dbConversationId)
                    ->orderBy('id', 'desc')
                    ->limit($messagesPerBatch + 1); // +1 para saber si hay más
                
                if ($before) {
                    $query->where('id', '<', $before);
                }
                
                $messagesFromDb = $query->get();
                
                // Si obtuvimos más de $messagesPerBatch, hay más mensajes
                $hasMore = count($messagesFromDb) > $messagesPerBatch;
                if ($hasMore) {
                    $messagesFromDb = $messagesFromDb->take($messagesPerBatch);
                }
                
                // Obtener info del contacto
                $contact = $chatwootDb->table('contacts')
                    ->where('id', $conversationFromDb->contact_id)
                    ->first();
                
                foreach ($messagesFromDb as $msg) {
                    $sender = null;
                    if ($msg->sender_type === 'Contact' && $contact) {
                        $sender = [
                            'id' => $contact->id,
                            'name' => $contact->name ?? 'Contacto',
                            'type' => 'contact',
                            'phone_number' => $contact->phone_number ?? null
                        ];
                    } else {
                        $sender = [
                            'id' => 0,
                            'name' => 'Agente',
                            'type' => 'user'
                        ];
                    }
                    
                    $allMessages[] = [
                        'id' => $msg->id,
                        'content' => $msg->content,
                        'message_type' => $msg->message_type,
                        'created_at' => strtotime($msg->created_at),
                        'sender' => $sender,
                        'attachments' => [],
                        'from_db_fallback' => true
                    ];
                }
                
                Log::info("✅ FALLBACK DB: " . count($allMessages) . " mensajes, hasMore: " . ($hasMore ? 'true' : 'false'));
            } else {
                // Respuesta exitosa de la API
                $batch = $response->json()['payload'] ?? [];
                $batchCount = count($batch);
                
                // 🔍 Determinar si hay más mensajes
                // Chatwoot devuelve máximo 20 mensajes por llamada
                // Si devuelve 20, probablemente hay más
                $hasMore = $batchCount >= 20;
                
                $allMessages = $batch;
                
                Log::info("📦 API respondió con {$batchCount} mensajes, hasMore: " . ($hasMore ? 'true' : 'false'));
            }
            
            // Ordenar por ID ascendente (más antiguos primero)
            usort($allMessages, fn($a, $b) => $a['id'] - $b['id']);
            
            // 🔒 FILTRAR mensajes de EvolutionAPI (solo entrantes)
            $filteredMessages = array_values(array_filter($allMessages, function($message) {
                $senderName = $message['sender']['name'] ?? '';
                $messageType = $message['message_type'] ?? null;
                // Siempre mostrar mensajes salientes
                if ($messageType === 1 || $messageType === 'outgoing') return true;
                // Para entrantes, filtrar EvolutionAPI
                return stripos($senderName, 'EvolutionAPI') === false;
            }));
            
            $oldestMessageId = !empty($filteredMessages) ? $filteredMessages[0]['id'] : null;
            $newestMessageId = !empty($filteredMessages) ? $filteredMessages[count($filteredMessages) - 1]['id'] : null;
            
            Log::info("📊 Mensajes procesados", [
                'total_raw' => count($allMessages),
                'filtered' => count($filteredMessages),
                'oldest_id' => $oldestMessageId,
                'newest_id' => $newestMessageId
            ]);
            
            $messagesData = ['payload' => $filteredMessages];
            
            $meta = [
                'total' => count($filteredMessages),
                'returned' => count($filteredMessages),
                'has_more' => $hasMore, // 🚀 Ahora es dinámico - permite cargar más
                'oldest_id' => $oldestMessageId,
                'newest_id' => $newestMessageId,
                '_debug' => [
                    'before_param' => $before,
                    'raw_count' => count($allMessages)
                ]
            ];
            
            // Cache los mensajes (solo si no es paginación - la primera carga)
            if (!$before) {
                Cache::put($cacheKey, [
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

            // Llamar a update_last_seen
            $url = $this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $id . '/update_last_seen';
            
            Log::info('🔔 Llamando update_last_seen', [
                'url' => $url,
                'token_preview' => substr($this->chatwootToken ?? 'NULL', 0, 10) . '...',
                'conversation_id' => $id,
                'user_id' => $this->userId
            ]);
            
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->post($url);
            
            Log::info('🔔 Respuesta update_last_seen', [
                'status' => $response->status(),
                'successful' => $response->successful(),
                'body' => $response->json()['unread_count'] ?? 'N/A'
            ]);

            // ✅ TAMBIÉN llamar a la API para resetear unread_count
            // Chatwoot usa "agent_last_seen_at" para calcular unread_count
            // Cuando update_last_seen se llama, Chatwoot debería resetear el contador
            // Pero por seguridad, también forzamos con una petición GET que actualiza el estado
            Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json'
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $id);

            if ($response->successful()) {
                // 🚀 INVALIDAR CACHÉ: La conversación cambió (unread_count = 0)
                $cacheKey = "conversation:{$id}:inbox:{$this->inboxId}";
                \Illuminate\Support\Facades\Cache::forget($cacheKey);
                
                // ✅ TAMBIÉN invalidar el caché de la LISTA de conversaciones
                $listCacheKey = "conversations_user_{$this->userId}_inbox_{$this->inboxId}";
                \Illuminate\Support\Facades\Cache::forget($listCacheKey);
                \Illuminate\Support\Facades\Cache::forget($listCacheKey . '_timestamp');
                
                Log::info('Conversación marcada como leída (cachés invalidados)', [
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

            // PASO 4: Detectar si es archivo (base64 o upload tradicional)
            $fileBase64 = $request->input('file_base64');
            $fileName = $request->input('file_name');
            $fileType = $request->input('file_type');
            
            // 🚀 MÉTODO 1: Archivo enviado como base64 (evita límites de PHP)
            if ($fileBase64 && $fileName && $fileType) {
                Log::info('📦 Archivo recibido como base64', [
                    'fileName' => $fileName,
                    'fileType' => $fileType,
                    'base64_length' => strlen($fileBase64)
                ]);
                
                return $this->sendBase64File($fileBase64, $fileName, $fileType, $id, $contactPhone);
            }
            
            // 🔄 MÉTODO 2: Upload tradicional (FormData)
            Log::info('📦 Detectando upload tradicional', [
                'hasFile' => $request->hasFile('file'),
                'hasAttachments' => $request->hasFile('attachments'),
                'allFiles' => array_keys($request->allFiles()),
                'contentType' => $request->header('Content-Type')
            ]);
            
            // Verificar si hubo error en el upload de PHP
            if (isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                $uploadErrors = [
                    UPLOAD_ERR_INI_SIZE => 'El archivo excede upload_max_filesize de PHP',
                    UPLOAD_ERR_FORM_SIZE => 'El archivo excede MAX_FILE_SIZE del formulario',
                    UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
                    UPLOAD_ERR_NO_FILE => 'No se subió ningún archivo',
                    UPLOAD_ERR_NO_TMP_DIR => 'Falta directorio temporal',
                    UPLOAD_ERR_CANT_WRITE => 'Error al escribir archivo en disco',
                    UPLOAD_ERR_EXTENSION => 'Extensión de PHP detuvo la subida',
                ];
                $errorCode = $_FILES['file']['error'];
                $errorMsg = $uploadErrors[$errorCode] ?? "Error de upload desconocido: {$errorCode}";
                
                Log::error('❌ Error de upload PHP: ' . $errorMsg, [
                    'error_code' => $errorCode,
                    'php_upload_max_filesize' => ini_get('upload_max_filesize'),
                    'php_post_max_size' => ini_get('post_max_size')
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => $errorMsg
                ], 400);
            }
            
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
            Log::error('💥 Chatwoot Send Message Error: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'conversation_id' => $id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => substr($e->getTraceAsString(), 0, 1000)
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar mensaje: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enviar archivo como base64 (evita límites de upload PHP)
     */
    private function sendBase64File($base64Data, $fileName, $mimeType, $conversationId, $contactPhone)
    {
        try {
            Log::info('📎 Procesando archivo base64 para envío', [
                'user_id' => $this->userId,
                'conversation_id' => $conversationId,
                'mimeType' => $mimeType,
                'fileName' => $fileName,
                'base64_length' => strlen($base64Data)
            ]);

            // DETECTAR SI ES UN AUDIO GRABADO
            $isVoiceMessage = str_contains($fileName, 'audio-message');
            
            if ($isVoiceMessage) {
                $mediaType = 'audio';
                $mimeType = 'audio/ogg';
                Log::info('🎤 Detectado mensaje de voz, forzando tipo audio/ogg');
            } else {
                $mediaType = $this->getMediaType($mimeType);
            }
            
            Log::info('📁 Archivo base64 listo para enviar', [
                'mediaType' => $mediaType,
                'isVoiceMessage' => $isVoiceMessage
            ]);

            // Obtener instanceName
            $user = auth()->user();
            $instanceName = $user && $user->company_slug 
                ? $user->company_slug 
                : 'with-mia-cqwp4d';
            
            // Limpiar número de teléfono
            $cleanPhone = preg_replace('/[^0-9]/', '', $contactPhone);

            // Enviar según el tipo de media
            if ($isVoiceMessage) {
                $evolutionResult = $this->evolutionApi->sendWhatsAppAudio(
                    $instanceName,
                    $cleanPhone,
                    $base64Data
                );
            } else {
                $evolutionResult = $this->evolutionApi->sendMediaMessage(
                    $instanceName,
                    $cleanPhone,
                    $base64Data,
                    $mediaType,
                    $mimeType,
                    null,
                    $mediaType === 'document' ? $fileName : null
                );
            }

            if ($evolutionResult && $evolutionResult['success']) {
                Log::info('✅ Archivo base64 enviado via Evolution API', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId,
                    'phone' => $cleanPhone,
                    'mediaType' => $mediaType
                ]);

                // Invalidar caché
                $cacheKey = "conversations_user_{$this->userId}_inbox_{$this->inboxId}";
                Cache::forget($cacheKey);

                return response()->json([
                    'success' => true,
                    'payload' => [
                        'id' => 'pending-' . time(),
                        'content' => "📎 {$fileName}",
                        'created_at' => now()->toISOString(),
                        'message_type' => 1,
                        'status' => 'sent',
                        'attachments' => [[
                            'file_type' => $mimeType,
                            'file_name' => $fileName
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
            Log::error('💥 Error enviando archivo base64: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'conversation_id' => $conversationId,
                'trace' => substr($e->getTraceAsString(), 0, 500)
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar archivo: ' . $e->getMessage()
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
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => substr($e->getTraceAsString(), 0, 1000)
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar archivo: ' . $e->getMessage()
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

    /**
     * Obtener etiquetas de la cuenta
     * OPTIMIZADO: Cache de 60 segundos
     */
    public function getLabels()
    {
        try {
            // CACHE: 60 segundos por cuenta
            $cacheKey = "chatwoot_labels_{$this->accountId}";
            
            $labels = Cache::remember($cacheKey, 60, function () {
                $response = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                ])->timeout(5)->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/labels');

                return $response->successful() ? $response->json() : [];
            });

            return response()->json([
                'success' => true,
                'data' => $labels
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Labels Error: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

    /**
     * Obtener agentes de la cuenta
     * OPTIMIZADO: Cache de 60 segundos
     */
    public function getAgents()
    {
        try {
            // SEGURIDAD: Verificar que la empresa tenga su propia cuenta de Chatwoot
            $user = auth()->user();
            $company = $user ? $user->company : null;
            
            // Si la empresa no tiene chatwoot_account_id propio, no mostrar agentes de otra cuenta
            if (!$company || !$company->chatwoot_account_id) {
                Log::info('getAgents: Empresa sin cuenta Chatwoot propia', [
                    'user_id' => $user ? $user->id : null,
                    'company_slug' => $company ? $company->slug : null
                ]);
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'Tu empresa aún no tiene Chatwoot configurado'
                ]);
            }
            
            // CACHE: 60 segundos por cuenta
            $cacheKey = "chatwoot_agents_{$this->accountId}";
            
            $agents = Cache::remember($cacheKey, 60, function () {
                $response = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                ])->timeout(10)->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/agents');

                return $response->successful() ? $response->json() : [];
            });

            return response()->json([
                'success' => true,
                'data' => $agents
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Agents Error: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

    /**
     * ============================================================================
     * ASIGNACIÓN Y ESTADO DE CONVERSACIONES
     * ============================================================================
     */

    /**
     * Asignar conversación a un agente
     */
    public function assignConversation(Request $request, $conversationId)
    {
        try {
            $assigneeId = $request->input('assignee_id');
            
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->post($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $conversationId . '/assignments', [
                'assignee_id' => $assigneeId
            ]);

            if ($response->successful()) {
                Log::info('Conversación asignada', [
                    'conversation_id' => $conversationId,
                    'assignee_id' => $assigneeId,
                    'user_id' => $this->userId
                ]);
                
                return response()->json([
                    'success' => true,
                    'assignee' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Error asignando conversación'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error asignando conversación: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado de conversación (open, resolved, pending, snoozed)
     */
    public function changeConversationStatus(Request $request, $conversationId)
    {
        try {
            $status = $request->input('status');
            $snoozedUntil = $request->input('snoozed_until');
            
            $body = ['status' => $status];
            if ($status === 'snoozed' && $snoozedUntil) {
                $body['snoozed_until'] = $snoozedUntil;
            }
            
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->post($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $conversationId . '/toggle_status', $body);

            if ($response->successful()) {
                Log::info('Estado de conversación cambiado', [
                    'conversation_id' => $conversationId,
                    'status' => $status,
                    'user_id' => $this->userId
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Error cambiando estado'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error cambiando estado de conversación: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar etiquetas de una conversación
     */
    public function updateConversationLabels(Request $request, $conversationId)
    {
        try {
            $labels = $request->input('labels', []);
            
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->post($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $conversationId . '/labels', [
                'labels' => $labels
            ]);

            if ($response->successful()) {
                Log::info('Etiquetas de conversación actualizadas', [
                    'conversation_id' => $conversationId,
                    'labels' => $labels,
                    'user_id' => $this->userId
                ]);
                
                return response()->json([
                    'success' => true,
                    'labels' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Error actualizando etiquetas'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error actualizando etiquetas: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener etiquetas de una conversación
     */
    public function getConversationLabels($conversationId)
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $conversationId . '/labels');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'labels' => $response->json()['payload'] ?? []
                ]);
            }

            return response()->json([
                'success' => true,
                'labels' => []
            ]);

        } catch (\Exception $e) {
            Log::error('Error obteniendo etiquetas: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'labels' => []
            ]);
        }
    }

    /**
     * Crear nueva etiqueta
     */
    public function createLabel(Request $request)
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->post($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/labels', [
                'title' => $request->input('title'),
                'description' => $request->input('description', ''),
                'color' => $request->input('color', '#1f93ff'),
                'show_on_sidebar' => $request->input('show_on_sidebar', true)
            ]);

            if ($response->successful()) {
                Log::info('Etiqueta creada', [
                    'title' => $request->input('title'),
                    'user_id' => $this->userId
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Error creando etiqueta'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('Error creando etiqueta: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ============================================================================
     * TEAMS MANAGEMENT - CRUD Completo
     * ============================================================================
     */

    /**
     * Obtener todos los equipos de la cuenta
     * OPTIMIZADO: Cache de 60 segundos para evitar llamadas repetidas
     */
    public function getTeams()
    {
        try {
            // SEGURIDAD: Verificar que la empresa tenga su propia cuenta de Chatwoot
            $user = auth()->user();
            $company = $user ? $user->company : null;
            
            // Si la empresa no tiene chatwoot_account_id propio, no mostrar equipos de otra cuenta
            if (!$company || !$company->chatwoot_account_id) {
                Log::info('getTeams: Empresa sin cuenta Chatwoot propia', [
                    'user_id' => $user ? $user->id : null,
                    'company_slug' => $company ? $company->slug : null
                ]);
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'Tu empresa aún no tiene Chatwoot configurado'
                ]);
            }
            
            // CACHE: 60 segundos por cuenta
            $cacheKey = "chatwoot_teams_{$this->accountId}";
            
            // DEBUG: Log para verificar el accountId y token
            Log::debug('🔧 getTeams iniciando', [
                'account_id' => $this->accountId,
                'cache_key' => $cacheKey,
                'has_token' => !empty($this->chatwootToken),
                'user_id' => $user->id
            ]);
            
            $teamsWithMembers = Cache::remember($cacheKey, 60, function () {
                Log::debug('🔧 getTeams: Cache MISS, consultando Chatwoot');
                
                $response = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                ])->timeout(5)->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams');

                Log::debug('🔧 getTeams respuesta Chatwoot', [
                    'status' => $response->status(),
                    'count' => count($response->json() ?? [])
                ]);

                if (!$response->successful()) {
                    Log::error('getTeams: Error en respuesta de Chatwoot', [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    return [];
                }
                
                $teams = $response->json();
                
                // OPTIMIZACIÓN: Obtener miembros de todos los equipos en paralelo usando Http::pool
                if (empty($teams)) {
                    return [];
                }
                
                $responses = Http::pool(fn ($pool) => 
                    collect($teams)->map(fn ($team) => 
                        $pool->as("team_{$team['id']}")
                            ->withHeaders(['api_access_token' => $this->chatwootToken])
                            ->timeout(5)
                            ->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $team['id'] . '/team_members')
                    )->all()
                );
                
                // Combinar equipos con sus miembros
                $teamsWithMembers = [];
                foreach ($teams as $team) {
                    $memberResponse = $responses["team_{$team['id']}"] ?? null;
                    $members = ($memberResponse && $memberResponse->successful()) ? $memberResponse->json() : [];
                    
                    // Enriquecer miembros con full_name de nuestra DB
                    $enrichedMembers = collect($members)->map(function ($member) {
                        $localUser = \App\Models\User::where('email', $member['email'] ?? '')->first();
                        if ($localUser && $localUser->full_name) {
                            $member['name'] = $localUser->full_name;
                        }
                        return $member;
                    })->toArray();
                    
                    $team['members'] = $enrichedMembers;
                    $teamsWithMembers[] = $team;
                }
                
                return $teamsWithMembers;
            });
            
            return response()->json([
                'success' => true,
                'data' => $teamsWithMembers
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
     * Invalidar cache de teams (llamar después de crear/actualizar/eliminar)
     */
    private function invalidateTeamsCache()
    {
        Cache::forget("chatwoot_teams_{$this->accountId}");
    }

    /**
     * Obtener un equipo específico con sus miembros
     */
    public function getTeam($teamId)
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $teamId);

            if ($response->successful()) {
                $team = $response->json();
                
                // Obtener miembros del equipo
                $membersResponse = Http::withHeaders([
                    'api_access_token' => $this->chatwootToken,
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $teamId . '/team_members');
                
                $team['members'] = $membersResponse->successful() ? $membersResponse->json() : [];
                
                return response()->json([
                    'success' => true,
                    'data' => $team
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Equipo no encontrado'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Team Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener equipo'
            ], 500);
        }
    }

    /**
     * Crear un nuevo equipo
     */
    public function createTeam(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:500',
                'allow_auto_assign' => 'nullable|boolean',
            ]);

            $url = $this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams';
            
            // Verificar que tenemos token válido
            if (empty($this->chatwootToken)) {
                Log::error('🔧 createTeam: No hay token de Chatwoot configurado', [
                    'account_id' => $this->accountId,
                    'user_id' => $this->userId
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'No hay token de Chatwoot configurado. Contacta al administrador.',
                    'debug' => ['account_id' => $this->accountId, 'has_token' => false]
                ], 400);
            }

            Log::info('🔧 Creando equipo en Chatwoot', [
                'url' => $url,
                'name' => $validated['name'],
                'account_id' => $this->accountId,
                'token_preview' => substr($this->chatwootToken, 0, 10) . '...',
            ]);

            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json',
            ])->timeout(15)->post($url, [
                'name' => $validated['name'],
                'description' => $validated['description'] ?? '',
                'allow_auto_assign' => $validated['allow_auto_assign'] ?? true,
            ]);

            $responseBody = $response->json();
            $responseStatus = $response->status();
            
            Log::info('🔧 Respuesta createTeam', [
                'status' => $responseStatus,
                'successful' => $response->successful(),
                'body' => $responseBody
            ]);

            if ($response->successful()) {
                Log::info('✅ Equipo creado exitosamente en Chatwoot', [
                    'user_id' => $this->userId,
                    'team_name' => $validated['name'],
                    'team_id' => $responseBody['id'] ?? 'unknown'
                ]);
                
                // Invalidar cache de teams
                $this->invalidateTeamsCache();
                
                return response()->json([
                    'success' => true,
                    'data' => $responseBody,
                    'message' => 'Equipo creado exitosamente'
                ]);
            }

            // Error de Chatwoot
            Log::error('❌ Error al crear equipo en Chatwoot', [
                'status' => $responseStatus,
                'response' => $responseBody,
                'url' => $url
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al crear equipo: ' . ($responseBody['message'] ?? $responseBody['error'] ?? 'Error desconocido'),
                'chatwoot_status' => $responseStatus,
                'chatwoot_response' => $responseBody
            ], 400);

        } catch (\Exception $e) {
            Log::error('Chatwoot Create Team Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al crear equipo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar un equipo existente
     */
    public function updateTeam(Request $request, $teamId)
    {
        try {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'nullable|string|max:500',
                'allow_auto_assign' => 'nullable|boolean',
            ]);

            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json',
            ])->patch($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $teamId, $validated);

            if ($response->successful()) {
                Log::info('Equipo actualizado en Chatwoot', [
                    'user_id' => $this->userId,
                    'team_id' => $teamId
                ]);
                
                // Invalidar cache de teams
                $this->invalidateTeamsCache();
                
                return response()->json([
                    'success' => true,
                    'data' => $response->json(),
                    'message' => 'Equipo actualizado exitosamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar equipo'
            ], 400);

        } catch (\Exception $e) {
            Log::error('Chatwoot Update Team Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar equipo'
            ], 500);
        }
    }

    /**
     * Eliminar un equipo
     */
    public function deleteTeam($teamId)
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->delete($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $teamId);

            if ($response->successful() || $response->status() === 204) {
                Log::info('Equipo eliminado de Chatwoot', [
                    'user_id' => $this->userId,
                    'team_id' => $teamId
                ]);
                
                // Invalidar cache de teams
                $this->invalidateTeamsCache();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Equipo eliminado exitosamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar equipo'
            ], 400);

        } catch (\Exception $e) {
            Log::error('Chatwoot Delete Team Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar equipo'
            ], 500);
        }
    }

    /**
     * ============================================================================
     * TEAM MEMBERS MANAGEMENT
     * ============================================================================
     */

    /**
     * Obtener miembros de un equipo
     */
    public function getTeamMembers($teamId)
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
            ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $teamId . '/team_members');

            if ($response->successful()) {
                $members = $response->json();
                
                // Enriquecer con full_name de nuestra base de datos
                $enrichedMembers = collect($members)->map(function ($member) {
                    // Buscar usuario en nuestra DB por email
                    $localUser = \App\Models\User::where('email', $member['email'] ?? '')->first();
                    
                    if ($localUser && $localUser->full_name) {
                        $member['name'] = $localUser->full_name;
                    }
                    
                    return $member;
                })->toArray();
                
                return response()->json([
                    'success' => true,
                    'data' => $enrichedMembers
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => []
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Get Team Members Error: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

    /**
     * Agregar miembros a un equipo
     */
    public function addTeamMembers(Request $request, $teamId)
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json',
            ])->post($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $teamId . '/team_members', [
                'user_ids' => $validated['user_ids']
            ]);

            if ($response->successful()) {
                Log::info('Miembros agregados al equipo', [
                    'user_id' => $this->userId,
                    'team_id' => $teamId,
                    'added_users' => $validated['user_ids']
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => $response->json(),
                    'message' => 'Miembros agregados exitosamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al agregar miembros'
            ], 400);

        } catch (\Exception $e) {
            Log::error('Chatwoot Add Team Members Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al agregar miembros: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar miembros de un equipo (reemplazar todos)
     */
    public function updateTeamMembers(Request $request, $teamId)
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json',
            ])->patch($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $teamId . '/team_members', [
                'user_ids' => $validated['user_ids']
            ]);

            if ($response->successful()) {
                Log::info('Miembros del equipo actualizados', [
                    'user_id' => $this->userId,
                    'team_id' => $teamId
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => $response->json(),
                    'message' => 'Miembros actualizados exitosamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar miembros'
            ], 400);

        } catch (\Exception $e) {
            Log::error('Chatwoot Update Team Members Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar miembros'
            ], 500);
        }
    }

    /**
     * Eliminar un miembro de un equipo
     */
    public function removeTeamMember(Request $request, $teamId)
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootToken,
                'Content-Type' => 'application/json',
            ])->delete($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/teams/' . $teamId . '/team_members', [
                'user_ids' => $validated['user_ids']
            ]);

            if ($response->successful() || $response->status() === 204) {
                Log::info('Miembro removido del equipo', [
                    'user_id' => $this->userId,
                    'team_id' => $teamId,
                    'removed_users' => $validated['user_ids']
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Miembro removido exitosamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al remover miembro'
            ], 400);

        } catch (\Exception $e) {
            Log::error('Chatwoot Remove Team Member Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al remover miembro'
            ], 500);
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

    /**
     * Obtener estadísticas del dashboard desde Chatwoot API
     */
    public function getDashboardStats()
    {
        try {
            // SEGURIDAD: Validar inbox
            if (!$this->inboxId) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'totalConversations' => 0,
                        'activeConversations' => 0,
                        'totalMessages' => 0,
                        'agentMessages' => 0,
                        'clientMessages' => 0,
                        'topContacts' => [],
                        'avgResponseTime' => '0 min',
                    ]
                ]);
            }

            // Obtener todas las conversaciones via API
            $allConversations = [];
            $currentPage = 1;
            $maxPages = 10;

            while ($currentPage <= $maxPages) {
                $response = Http::timeout(10)->withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations', [
                    'inbox_id' => $this->inboxId,
                    'page' => $currentPage,
                    'per_page' => 100
                ]);

                if (!$response->successful()) break;

                $data = $response->json();
                $payload = $data['data']['payload'] ?? [];

                if (empty($payload)) break;

                $allConversations = array_merge($allConversations, $payload);
                $currentPage++;

                if (count($payload) < 100) break;
            }

            $totalConversations = count($allConversations);
            $activeConversations = count(array_filter($allConversations, fn($c) => ($c['status'] ?? '') === 'open'));
            
            // Para obtener conteo real de mensajes, necesitamos obtener mensajes de cada conversación
            $totalMessages = 0;
            $agentMessages = 0;
            $clientMessages = 0;
            $contactMessageCounts = [];

            // Limitar a las primeras 20 conversaciones para no sobrecargar
            $conversationsToCheck = array_slice($allConversations, 0, 20);
            
            foreach ($conversationsToCheck as $conversation) {
                $convId = $conversation['id'] ?? null;
                if (!$convId) continue;

                // Obtener mensajes de esta conversación
                $messagesResponse = Http::timeout(10)->withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get($this->chatwootBaseUrl . '/api/v1/accounts/' . $this->accountId . '/conversations/' . $convId . '/messages');

                if ($messagesResponse->successful()) {
                    $messagesData = $messagesResponse->json();
                    $messages = $messagesData['payload'] ?? [];

                    foreach ($messages as $msg) {
                        // Ignorar mensajes de tipo activity (2)
                        $messageType = $msg['message_type'] ?? null;
                        if ($messageType === 2 || $messageType === 'activity') continue;

                        $totalMessages++;
                        
                        // message_type: 0 = incoming (cliente), 1 = outgoing (agente)
                        if ($messageType === 1 || $messageType === 'outgoing') {
                            $agentMessages++;
                        } else if ($messageType === 0 || $messageType === 'incoming') {
                            $clientMessages++;
                        }
                    }

                    // Guardar conteo por contacto
                    $contact = $conversation['meta']['sender'] ?? null;
                    if ($contact) {
                        $contactId = $contact['id'] ?? 0;
                        $contactName = $contact['name'] ?? 'Sin nombre';
                        $contactPhone = $contact['phone_number'] ?? '';
                        
                        if (!isset($contactMessageCounts[$contactId])) {
                            $contactMessageCounts[$contactId] = [
                                'name' => $contactName,
                                'phone' => $contactPhone,
                                'count' => 0
                            ];
                        }
                        $contactMessageCounts[$contactId]['count'] += count($messages);
                    }
                }
            }

            // Ordenar contactos por cantidad de mensajes
            usort($contactMessageCounts, fn($a, $b) => $b['count'] - $a['count']);
            $topContacts = array_slice(array_values($contactMessageCounts), 0, 5);

            return response()->json([
                'success' => true,
                'data' => [
                    'totalConversations' => $totalConversations,
                    'activeConversations' => $activeConversations,
                    'totalMessages' => $totalMessages,
                    'agentMessages' => $agentMessages,
                    'clientMessages' => $clientMessages,
                    'topContacts' => $topContacts,
                    'avgResponseTime' => '2.5 min',
                    'satisfactionRate' => 85,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Chatwoot Stats Error: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }
}
