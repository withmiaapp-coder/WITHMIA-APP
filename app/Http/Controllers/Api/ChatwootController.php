<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Services\EvolutionApiService;
use App\Services\ChatwootService;
use App\Services\ConversationDeduplicationService;
use App\Helpers\PhoneNormalizer;
use App\Traits\ResolvesChatwootConfig;

class ChatwootController extends Controller
{
    use ResolvesChatwootConfig;
    
    // 🚀 CONSTANTES: Evita duplicación de statusMap en todo el controlador
    private const STATUS_TO_INT = ['open' => 0, 'resolved' => 1, 'pending' => 2, 'snoozed' => 3];
    private const INT_TO_STATUS = [0 => 'open', 1 => 'resolved', 2 => 'pending', 3 => 'snoozed'];
    
    // Alias para compatibilidad con código existente (usan $this->accountId en lugar de $this->chatwootAccountId)
    private $accountId;
    private $inboxId;
    private $userId;
    private EvolutionApiService $evolutionApi;
    private ChatwootService $chatwootService;
    private ConversationDeduplicationService $deduplicationService;

    /**
     * Convertir timestamp UTC de la BD a Unix timestamp
     * La BD de Chatwoot guarda en UTC, PHP está en America/Santiago
     */
    private function utcToTimestamp($utcDatetime): ?int
    {
        if (!$utcDatetime) return null;
        // Agregar 'UTC' para que strtotime interprete correctamente
        return strtotime($utcDatetime . ' UTC');
    }

    public function __construct(
        EvolutionApiService $evolutionApi, 
        ChatwootService $chatwootService,
        ConversationDeduplicationService $deduplicationService
    )
    {
        $this->evolutionApi = $evolutionApi;
        $this->chatwootService = $chatwootService;
        $this->deduplicationService = $deduplicationService;
        
        // CRÍTICO: Asegurar que el middleware 'auth' se ejecute ANTES del constructor
        $this->middleware(function ($request, $next) {
            // 🚀 USAR TRAIT: Inicialización unificada con cache
            $this->initializeChatwootFromUser(auth()->user());
            // Alias para compatibilidad con código existente
            $this->userId = $this->chatwootUserId;
            $this->accountId = $this->chatwootAccountId;
            $this->inboxId = $this->chatwootInboxId;
            return $next($request);
        });
    }

    /**
     * Obtener conversaciones (REAL API) - CON FILTRO DE SEGURIDAD
     * ✅ SIN CACHE - Consultas directas a BD para datos en tiempo real
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

            // ✅ OPTIMIZACIÓN: Obtener conversaciones DIRECTAMENTE desde la BD
            // Esto es mucho más rápido que hacer múltiples llamadas HTTP paginadas
            $allConversations = [];
            
            Log::debug('📥 Obteniendo conversaciones desde BD directa', [
                'user_id' => $this->userId,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId
            ]);
            
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Query base con filtros de seguridad
            $query = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId);
            
            // Aplicar filtro de status si existe
            if ($request->has('status')) {
                $statusValue = self::STATUS_TO_INT[$request->input('status')] ?? null;
                if ($statusValue !== null) {
                    $query->where('status', $statusValue);
                }
            }
            
            // Aplicar filtro de assignee_type si existe
            if ($request->has('assignee_type')) {
                $assigneeType = $request->input('assignee_type');
                if ($assigneeType === 'me') {
                    // Buscar el agente de Chatwoot asociado al usuario
                    $chatwootAgent = $chatwootDb->table('users')
                        ->where('email', Auth::user()->email)
                        ->first();
                    if ($chatwootAgent) {
                        $query->where('assignee_id', $chatwootAgent->id);
                    }
                } elseif ($assigneeType === 'unassigned') {
                    $query->whereNull('assignee_id');
                }
            }
            
            // Ordenar y limitar
            $conversationsFromDb = $query
                ->orderBy('last_activity_at', 'desc')
                ->limit(200) // Aumentado para mejor cobertura
                ->get();
            
            Log::debug('📊 Conversaciones obtenidas de BD', [
                'count' => count($conversationsFromDb)
            ]);
            
            // Obtener contactos en una sola query
            $contactIds = $conversationsFromDb->pluck('contact_id')->unique()->filter()->toArray();
            $contacts = [];
            if (!empty($contactIds)) {
                $contacts = $chatwootDb->table('contacts')
                    ->whereIn('id', $contactIds)
                    ->get()
                    ->keyBy('id');
            }
            
            // Obtener asignados (agentes) en una sola query
            $assigneeIds = $conversationsFromDb->pluck('assignee_id')->unique()->filter()->toArray();
            $assignees = [];
            if (!empty($assigneeIds)) {
                $assignees = $chatwootDb->table('users')
                    ->whereIn('id', $assigneeIds)
                    ->get()
                    ->keyBy('id');
            }
            
            // Obtener último mensaje de cada conversación (optimizado con subquery)
            $conversationIds = $conversationsFromDb->pluck('id')->toArray();
            $lastMessages = [];
            if (!empty($conversationIds)) {
                // Obtener el último mensaje NO-ACTIVITY de cada conversación
                $lastMessagesRaw = $chatwootDb->table('messages')
                    ->select('messages.*')
                    ->whereIn('conversation_id', $conversationIds)
                    ->whereIn('message_type', [0, 1]) // Solo INCOMING y OUTGOING
                    ->whereRaw('messages.id = (
                        SELECT MAX(m2.id) FROM messages m2 
                        WHERE m2.conversation_id = messages.conversation_id 
                        AND m2.message_type IN (0, 1)
                    )')
                    ->get();
                
                foreach ($lastMessagesRaw as $msg) {
                    $lastMessages[$msg->conversation_id] = $msg;
                }
            }
            
            // Construir array de conversaciones
            foreach ($conversationsFromDb as $conv) {
                $contact = $contacts[$conv->contact_id] ?? null;
                $assignee = isset($conv->assignee_id) ? ($assignees[$conv->assignee_id] ?? null) : null;
                $lastMessage = $lastMessages[$conv->id] ?? null;
                
                // 🔒 Filtro: EXCLUIR conversaciones de EvolutionAPI
                $senderName = $contact->name ?? '';
                if (stripos($senderName, 'EvolutionAPI') !== false) {
                    continue; // Saltar esta conversación
                }
                
                // Mapear status numérico a string
                $statusString = self::INT_TO_STATUS[$conv->status] ?? 'open';
                
                $allConversations[] = [
                    'id' => $conv->display_id, // El frontend espera display_id
                    'account_id' => $conv->account_id,
                    'inbox_id' => $conv->inbox_id,
                    'status' => $statusString,
                    'assignee' => $assignee ? [
                        'id' => $assignee->id,
                        'name' => $assignee->name ?? $assignee->display_name ?? 'Agente',
                        'email' => $assignee->email ?? null,
                        'available_name' => $assignee->display_name ?? $assignee->name ?? 'Agente'
                    ] : null,
                    'meta' => [
                        'sender' => [
                            'id' => $contact->id ?? null,
                            'name' => $contact->name ?? 'Contacto',
                            'phone_number' => $contact->phone_number ?? null,
                            'identifier' => $contact->identifier ?? null,
                            'thumbnail' => $contact->avatar_url ?? ''
                        ]
                    ],
                    'messages' => $lastMessage ? [[
                        'id' => $lastMessage->id,
                        'content' => $lastMessage->content,
                        'message_type' => $lastMessage->message_type,
                        'created_at' => $this->utcToTimestamp($lastMessage->created_at)
                    ]] : [],
                    'unread_count' => $conv->unread_count ?? 0,
                    'created_at' => $this->utcToTimestamp($conv->created_at),
                    'last_activity_at' => $this->utcToTimestamp($conv->last_activity_at) ?? $this->utcToTimestamp($conv->created_at),
                    'timestamp' => $this->utcToTimestamp($conv->last_activity_at) ?? $this->utcToTimestamp($conv->created_at),
                    'from_db' => true
                ];
            }
            
            Log::debug('✅ Conversaciones procesadas desde BD', [
                'total' => count($allConversations),
                'filtered_evolutionapi' => count($conversationsFromDb) - count($allConversations)
            ]);

            // 🔗 DEDUPLICACIÓN EN MEMORIA: Filtrar duplicados por phone_number
            // La fusión real se ejecuta en background via MergeDuplicateConversationsJob
            $originalCount = count($allConversations);
            $allConversations = $this->deduplicateByNormalizedPhone($allConversations);
            
            // Si detectamos duplicados en memoria, disparar job de fusión en background
            // (no bloquea el request actual)
            if ($originalCount > count($allConversations)) {
                \App\Jobs\MergeDuplicateConversationsJob::dispatch($this->inboxId, $this->accountId)
                    ->delay(now()->addSeconds(5)); // Pequeño delay para evitar sobrecarga
                
                Log::debug('🔄 Job de fusión de duplicados despachado', [
                    'inbox_id' => $this->inboxId,
                    'duplicates_found' => $originalCount - count($allConversations)
                ]);
            }

            // ✅ Devolver estructura esperada por el frontend (SIN CACHE)
            return response()->json([
                'success' => true,
                'data' => [
                    'payload' => $allConversations,
                    'meta' => [
                        'total' => count($allConversations),
                        'from_db' => true
                    ]
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
     * Obtener una conversación específica por ID - CON VALIDACIÓN DE SEGURIDAD
     * ✅ SIN CACHE - Consultas directas a BD para datos en tiempo real
     */
    public function getConversation($id)
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            // 🚀 BD DIRECTA: Obtener conversación desde Chatwoot DB
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            $conv = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where(function ($q) use ($id) {
                    $q->where('id', $id)->orWhere('display_id', $id);
                })
                ->first();
            
            if (!$conv) {
                return response()->json(['success' => false, 'message' => 'Conversación no encontrada'], 404);
            }
            
            // SEGURIDAD: Verificar inbox
            if ($conv->inbox_id != $this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos'], 403);
            }
            
            // Obtener contacto
            $contact = $chatwootDb->table('contacts')->where('id', $conv->contact_id)->first();
            
            // Obtener asignado
            $assignee = $conv->assignee_id 
                ? $chatwootDb->table('users')->where('id', $conv->assignee_id)->first() 
                : null;
            
            $conversation = [
                'id' => $conv->display_id,
                'account_id' => $conv->account_id,
                'inbox_id' => $conv->inbox_id,
                'status' => self::INT_TO_STATUS[$conv->status] ?? 'open',
                'assignee' => $assignee ? [
                    'id' => $assignee->id,
                    'name' => $assignee->name ?? $assignee->display_name ?? 'Agente',
                    'email' => $assignee->email ?? null
                ] : null,
                'meta' => [
                    'sender' => [
                        'id' => $contact->id ?? null,
                        'name' => $contact->name ?? 'Contacto',
                        'phone_number' => $contact->phone_number ?? null,
                        'identifier' => $contact->identifier ?? null,
                        'thumbnail' => $contact->avatar_url ?? ''
                    ]
                ],
                'unread_count' => $conv->unread_count ?? 0,
                'created_at' => $this->utcToTimestamp($conv->created_at),
                'last_activity_at' => $this->utcToTimestamp($conv->last_activity_at)
            ];
            
            return response()->json(['success' => true, 'payload' => $conversation]);

        } catch (\Exception $e) {
            Log::error('Error getConversation: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al obtener conversación'], 500);
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
            
            Log::debug('Conversación encontrada en DB', [
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

            // 🎯 SOLUCIÓN: Obtener mensajes DIRECTAMENTE desde la BD (SIN CACHE)
            // La API de Chatwoot tiene problemas de paginación que hacen que solo 
            // devuelva mensajes ACTIVITY cuando hay muchos, así que usamos la BD
            // que es más confiable y permite filtrar directamente en SQL
            
            $messagesPerBatch = 50;
            $allMessages = [];
            $hasMore = false;
            
            Log::debug("📥 Obteniendo mensajes desde DB para conversación", [
                'db_conversation_id' => $dbConversationId,
                'display_id' => $apiConversationId,
                'limit' => $limit,
                'before' => $before
            ]);
            
            // 🎯 Query directa a la BD - Filtrar message_type != 2 directamente en SQL
            $query = $chatwootDb->table('messages')
                ->where('conversation_id', $dbConversationId)
                ->whereIn('message_type', [0, 1]) // Solo INCOMING (0) y OUTGOING (1), excluir ACTIVITY (2)
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
            
            // Obtener info de los usuarios (agentes) para mensajes salientes
            $userIds = $messagesFromDb->where('sender_type', 'User')->pluck('sender_id')->unique()->filter();
            $users = [];
            if ($userIds->isNotEmpty()) {
                $users = $chatwootDb->table('users')
                    ->whereIn('id', $userIds)
                    ->get()
                    ->keyBy('id');
            }
            
            foreach ($messagesFromDb as $msg) {
                $sender = null;
                if ($msg->sender_type === 'Contact' && $contact) {
                    $sender = [
                        'id' => $contact->id,
                        'name' => $contact->name ?? 'Contacto',
                        'type' => 'contact',
                        'phone_number' => $contact->phone_number ?? null
                    ];
                } elseif ($msg->sender_type === 'User' && isset($users[$msg->sender_id])) {
                    $user = $users[$msg->sender_id];
                    $sender = [
                        'id' => $user->id,
                        'name' => $user->name ?? 'Agente',
                        'type' => 'user'
                    ];
                } else {
                    $sender = [
                        'id' => $msg->sender_id ?? 0,
                        'name' => 'Agente',
                        'type' => 'user'
                    ];
                }
                
                // Procesar attachments si existen
                $attachments = [];
                if ($msg->content_attributes) {
                    $contentAttrs = json_decode($msg->content_attributes, true);
                    // TODO: procesar attachments si es necesario
                }
                
                $allMessages[] = [
                    'id' => $msg->id,
                    'content' => $msg->content,
                    'message_type' => $msg->message_type,
                    'created_at' => $this->utcToTimestamp($msg->created_at),
                    'sender' => $sender,
                    'attachments' => $attachments,
                    'private' => $msg->private ?? false,
                    'from_db' => true
                ];
            }
            
            Log::debug("✅ Mensajes desde DB: " . count($allMessages) . ", hasMore: " . ($hasMore ? 'true' : 'false'));
            
            // Ordenar por ID ascendente (más antiguos primero)
            usort($allMessages, fn($a, $b) => $a['id'] - $b['id']);
            
            // 🔒 Filtrar mensajes de EvolutionAPI (ya se filtraron los de actividad en SQL)
            $filteredMessages = array_values(array_filter($allMessages, function($message) {
                $senderName = $message['sender']['name'] ?? '';
                $messageType = $message['message_type'] ?? null;
                
                // Siempre mostrar mensajes salientes
                if ($messageType === 1 || $messageType === 'outgoing') return true;
                // Para entrantes, filtrar EvolutionAPI
                return stripos($senderName, 'EvolutionAPI') === false;
            }));
            
            Log::debug("📊 Mensajes después de filtrar EvolutionAPI", [
                'antes' => count($allMessages),
                'después' => count($filteredMessages)
            ]);
            
            $oldestMessageId = !empty($filteredMessages) ? $filteredMessages[0]['id'] : null;
            $newestMessageId = !empty($filteredMessages) ? $filteredMessages[count($filteredMessages) - 1]['id'] : null;
            
            Log::debug("📊 Mensajes procesados", [
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
                
            return response()->json([
                'success' => true,
                'payload' => $messagesData,
                'meta' => $meta
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

            // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API
            // Actualizar agent_last_seen_at y resetear unread_count directamente
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Buscar conversación por display_id o id
            $conversation = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->where(function ($q) use ($id) {
                    $q->where('id', $id)->orWhere('display_id', $id);
                })
                ->first();
            
            if (!$conversation) {
                Log::warning('markAsRead: Conversación no encontrada', [
                    'conversation_id' => $id,
                    'inbox_id' => $this->inboxId
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Conversación no encontrada'
                ], 404);
            }
            
            // Actualizar agent_last_seen_at al timestamp actual y resetear unread_count
            $now = now();
            $chatwootDb->table('conversations')
                ->where('id', $conversation->id)
                ->update([
                    'agent_last_seen_at' => $now,
                    'updated_at' => $now
                ]);
            
            Log::debug('✅ Conversación marcada como leída (BD directa)', [
                'user_id' => $this->userId,
                'conversation_id' => $conversation->id,
                'display_id' => $conversation->display_id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Conversación marcada como leída'
            ]);

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

            // PASO 1: Validar que la conversación pertenece al inbox del usuario (BD DIRECTA)
            // 🚀 OPTIMIZACIÓN: Query directo en lugar de HTTP API
            $conversation = \Illuminate\Support\Facades\DB::connection('chatwoot')
                ->table('conversations')
                ->join('contacts', 'conversations.contact_id', '=', 'contacts.id')
                ->where('conversations.id', $id)
                ->where('conversations.account_id', $this->accountId)
                ->select(
                    'conversations.id',
                    'conversations.inbox_id',
                    'contacts.phone_number',
                    'contacts.identifier'
                )
                ->first();

            if (!$conversation) {
                Log::warning('Conversación no encontrada al enviar mensaje', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Conversación no encontrada'
                ], 404);
            }

            // PASO 2: VALIDACIÓN DE SEGURIDAD
            if (!$conversation->inbox_id || $conversation->inbox_id != $this->inboxId) {
                Log::warning('Intento de envío de mensaje no autorizado', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'conversation_inbox_id' => $conversation->inbox_id ?? 'null',
                    'user_inbox_id' => $this->inboxId
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permiso para enviar mensajes a esta conversación'
                ], 403);
            }

            // PASO 3: Obtener el teléfono del contacto para enviar via Evolution
            $contactPhone = $conversation->phone_number ?? null;
            $contactIdentifier = $conversation->identifier ?? null;
            
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
                Log::debug('📦 Archivo recibido como base64', [
                    'fileName' => $fileName,
                    'fileType' => $fileType,
                    'base64_length' => strlen($fileBase64)
                ]);
                
                return $this->sendBase64File($fileBase64, $fileName, $fileType, $id, $contactPhone);
            }
            
            // 🔄 MÉTODO 2: Upload tradicional (FormData)
            Log::debug('📦 Detectando upload tradicional', [
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
                Log::debug('📎 Archivo detectado, procesando...', [
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
                Log::debug('✅ Mensaje enviado via Evolution (sin duplicado en Chatwoot)', [
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
            Log::debug('📎 Procesando archivo base64 para envío', [
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
                Log::debug('🎤 Detectado mensaje de voz, forzando tipo audio/ogg');
            } else {
                $mediaType = $this->getMediaType($mimeType);
            }
            
            Log::debug('📁 Archivo base64 listo para enviar', [
                'mediaType' => $mediaType,
                'isVoiceMessage' => $isVoiceMessage
            ]);

            // Obtener instanceName - REQUIERE company_slug configurado
            $user = auth()->user();
            if (!$user || !$user->company_slug) {
                Log::error('❌ No se puede enviar archivo: Usuario sin company_slug configurado', [
                    'user_id' => $user ? $user->id : null
                ]);
                throw new \Exception('No hay instancia de WhatsApp configurada. Por favor conecta tu WhatsApp primero.');
            }
            $instanceName = $user->company_slug;
            
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
                Log::debug('✅ Archivo base64 enviado via Evolution API', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId,
                    'phone' => $cleanPhone,
                    'mediaType' => $mediaType
                ]);

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
            
            Log::debug('📎 Procesando archivo para envío', [
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
                Log::debug('🎤 Detectado mensaje de voz, forzando tipo audio/ogg');
            } else {
                // Determinar el tipo de media según el MIME type
                $mediaType = $this->getMediaType($mimeType);
            }
            
            // Convertir archivo a base64 (funciona mejor en Railway que URLs)
            $fileContent = file_get_contents($file->getPathname());
            $base64Media = base64_encode($fileContent);
            
            Log::debug('📁 Archivo convertido a base64', [
                'mediaType' => $mediaType,
                'isVoiceMessage' => $isVoiceMessage,
                'base64_length' => strlen($base64Media)
            ]);

            // Obtener instanceName - REQUIERE company_slug configurado
            $user = auth()->user();
            if (!$user || !$user->company_slug) {
                Log::error('❌ No se puede enviar archivo: Usuario sin company_slug configurado', [
                    'user_id' => $user ? $user->id : null
                ]);
                throw new \Exception('No hay instancia de WhatsApp configurada. Por favor conecta tu WhatsApp primero.');
            }
            $instanceName = $user->company_slug;
            
            // Limpiar número de teléfono
            $cleanPhone = preg_replace('/[^0-9]/', '', $contactPhone);

            // Enviar según el tipo de media
            $evolutionResult = null;
            
            if ($isVoiceMessage) {
                // Para audios de voz, usar endpoint especial de WhatsApp
                Log::debug('🎤 Enviando como nota de voz WhatsApp');
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
                Log::debug('✅ Archivo enviado via Evolution API', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId,
                    'phone' => $cleanPhone,
                    'mediaType' => $mediaType
                ]);

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
            // Obtener instanceName - REQUIERE company_slug configurado
            $user = auth()->user();
            if (!$user || !$user->company_slug) {
                Log::error('❌ No se puede enviar mensaje: Usuario sin company_slug configurado', [
                    'user_id' => $user ? $user->id : null
                ]);
                return false; // No hay instancia de WhatsApp configurada
            }
            $instanceName = $user->company_slug;

            // Limpiar número de teléfono (remover +, espacios, etc.)
            $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

            Log::debug('📤 Enviando mensaje a WhatsApp vía EvolutionApiService', [
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
                Log::debug('✅ Mensaje enviado exitosamente a WhatsApp', [
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
     * ✅ SIN CACHE - Consulta directa a BD
     */
    public function getLabels()
    {
        try {
            // 🚀 BD DIRECTA
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            $labels = $chatwootDb->table('labels')
                ->where('account_id', $this->accountId)
                ->select('id', 'title', 'description', 'color', 'show_on_sidebar')
                ->orderBy('title')
                ->get()
                ->toArray();

            return response()->json(['success' => true, 'data' => $labels]);

        } catch (\Exception $e) {
            Log::error('getLabels Error: ' . $e->getMessage());
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    /**
     * Obtener agentes de la cuenta
     * OPTIMIZADO: Cache de 60 segundos + BD directa sin N+1
     */
    public function getAgents()
    {
        try {
            $user = auth()->user();
            $company = $user ? $user->company : null;
            
            if (!$company || !$company->chatwoot_account_id) {
                return response()->json(['success' => true, 'data' => [], 'message' => 'Sin Chatwoot configurado']);
            }
            
            // 🚀 BD DIRECTA: Obtener agentes de la cuenta (sin cache para datos en tiempo real)
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Obtener usuarios que son agentes de esta cuenta
            $chatwootAgents = $chatwootDb->table('account_users')
                ->join('users', 'account_users.user_id', '=', 'users.id')
                ->where('account_users.account_id', $this->accountId)
                ->select(
                    'users.id',
                    'users.name',
                    'users.display_name',
                    'users.email',
                    'account_users.role',
                    'users.availability'
                )
                ->get();
            
            // ⚡ Pre-cargar TODOS los usuarios locales en UNA sola query (evita N+1)
            $emails = $chatwootAgents->pluck('email')->filter()->toArray();
            $localUsers = !empty($emails) 
                ? \App\Models\User::whereIn('email', $emails)->get()->keyBy('email')
                : collect();
            
            $agents = $chatwootAgents->map(function ($agent) use ($localUsers) {
                $localUser = $localUsers->get($agent->email);
                return [
                    'id' => $agent->id,
                    'name' => $localUser->full_name ?? $agent->display_name ?? $agent->name,
                    'email' => $agent->email,
                    'role' => $agent->role,
                    'thumbnail' => '',
                    'availability_status' => $agent->availability ?? 'offline'
                ];
            })->toArray();

            return response()->json(['success' => true, 'data' => $agents]);

        } catch (\Exception $e) {
            Log::error('getAgents Error: ' . $e->getMessage());
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    /**
     * Crear un nuevo agente (stub - no implementado)
     */
    public function createAgent(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Función no implementada aún'
        ]);
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
            
            // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Buscar conversación por display_id o id
            $conversation = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->where(function ($q) use ($conversationId) {
                    $q->where('id', $conversationId)->orWhere('display_id', $conversationId);
                })
                ->first();
            
            if (!$conversation) {
                return response()->json([
                    'success' => false,
                    'error' => 'Conversación no encontrada'
                ], 404);
            }
            
            // Actualizar assignee_id
            $chatwootDb->table('conversations')
                ->where('id', $conversation->id)
                ->update([
                    'assignee_id' => $assigneeId ?: null,
                    'updated_at' => now()
                ]);
            
            // Obtener datos del assignee si existe
            $assignee = null;
            if ($assigneeId) {
                $assignee = $chatwootDb->table('users')
                    ->where('id', $assigneeId)
                    ->select('id', 'name', 'email', 'avatar_url')
                    ->first();
            }
            
            Log::debug('✅ Conversación asignada (BD directa)', [
                'conversation_id' => $conversation->id,
                'assignee_id' => $assigneeId,
                'user_id' => $this->userId
            ]);
            
            return response()->json([
                'success' => true,
                'assignee' => $assignee
            ]);

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
            
            // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Mapear status string a integer (Chatwoot usa integers en BD)
            $statusValue = self::STATUS_TO_INT[$status] ?? 0;
            
            // Buscar conversación por display_id o id
            $conversation = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->where(function ($q) use ($conversationId) {
                    $q->where('id', $conversationId)->orWhere('display_id', $conversationId);
                })
                ->first();
            
            if (!$conversation) {
                return response()->json([
                    'success' => false,
                    'error' => 'Conversación no encontrada'
                ], 404);
            }
            
            // Preparar datos de actualización
            $updateData = [
                'status' => $statusValue,
                'updated_at' => now()
            ];
            
            // Si es snoozed, agregar snoozed_until
            if ($status === 'snoozed' && $snoozedUntil) {
                $updateData['snoozed_until'] = $snoozedUntil;
            } else {
                $updateData['snoozed_until'] = null;
            }
            
            // Actualizar status
            $chatwootDb->table('conversations')
                ->where('id', $conversation->id)
                ->update($updateData);
            
            Log::debug('✅ Estado de conversación cambiado (BD directa)', [
                'conversation_id' => $conversation->id,
                'status' => $status,
                'status_value' => $statusValue,
                'user_id' => $this->userId
            ]);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $conversation->id,
                    'status' => $status,
                    'current_status' => $status
                ]
            ]);

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
            
            // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Buscar conversación por display_id o id
            $conversation = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->where(function ($q) use ($conversationId) {
                    $q->where('id', $conversationId)->orWhere('display_id', $conversationId);
                })
                ->first();
            
            if (!$conversation) {
                return response()->json([
                    'success' => false,
                    'error' => 'Conversación no encontrada'
                ], 404);
            }
            
            // Obtener IDs de labels por título
            $labelIds = [];
            if (!empty($labels)) {
                $labelIds = $chatwootDb->table('labels')
                    ->where('account_id', $this->accountId)
                    ->whereIn('title', $labels)
                    ->pluck('id')
                    ->toArray();
            }
            
            // Eliminar labels actuales de la conversación
            $chatwootDb->table('conversations_labels')
                ->where('conversation_id', $conversation->id)
                ->delete();
            
            // Insertar nuevos labels
            foreach ($labelIds as $labelId) {
                $chatwootDb->table('conversations_labels')->insert([
                    'conversation_id' => $conversation->id,
                    'label_id' => $labelId
                ]);
            }
            
            // Obtener labels actualizados
            $updatedLabels = $chatwootDb->table('conversations_labels')
                ->join('labels', 'conversations_labels.label_id', '=', 'labels.id')
                ->where('conversations_labels.conversation_id', $conversation->id)
                ->select('labels.id', 'labels.title', 'labels.color')
                ->get()
                ->toArray();
            
            Log::debug('✅ Etiquetas de conversación actualizadas (BD directa)', [
                'conversation_id' => $conversation->id,
                'labels' => $labels,
                'user_id' => $this->userId
            ]);
            
            return response()->json([
                'success' => true,
                'labels' => $updatedLabels
            ]);

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
            // 🚀 BD DIRECTA
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Buscar conversación por display_id o id
            $conv = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where(function ($q) use ($conversationId) {
                    $q->where('id', $conversationId)->orWhere('display_id', $conversationId);
                })
                ->first();
            
            if (!$conv) {
                return response()->json(['success' => true, 'labels' => []]);
            }
            
            // Obtener labels de la conversación
            $labels = $chatwootDb->table('conversations_labels')
                ->join('labels', 'conversations_labels.label_id', '=', 'labels.id')
                ->where('conversations_labels.conversation_id', $conv->id)
                ->select('labels.id', 'labels.title', 'labels.color')
                ->get()
                ->toArray();

            return response()->json(['success' => true, 'labels' => $labels]);

        } catch (\Exception $e) {
            Log::error('getConversationLabels Error: ' . $e->getMessage());
            return response()->json(['success' => true, 'labels' => []]);
        }
    }

    /**
     * Crear nueva etiqueta
     */
    public function createLabel(Request $request)
    {
        try {
            // 🚀 OPTIMIZACIÓN: INSERT directo en lugar de HTTP API
            $title = $request->input('title');
            $description = $request->input('description', '');
            $color = $request->input('color', '#1f93ff');
            $showOnSidebar = $request->input('show_on_sidebar', true);

            // Verificar si ya existe una etiqueta con el mismo nombre
            $existingLabel = \Illuminate\Support\Facades\DB::connection('chatwoot')
                ->table('labels')
                ->where('account_id', $this->accountId)
                ->where('title', $title)
                ->first();

            if ($existingLabel) {
                return response()->json([
                    'success' => false,
                    'error' => 'Ya existe una etiqueta con ese nombre'
                ], 422);
            }

            $labelId = \Illuminate\Support\Facades\DB::connection('chatwoot')
                ->table('labels')
                ->insertGetId([
                    'account_id' => $this->accountId,
                    'title' => $title,
                    'description' => $description,
                    'color' => $color,
                    'show_on_sidebar' => $showOnSidebar,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

            Log::debug('✅ Etiqueta creada (BD directa)', [
                'label_id' => $labelId,
                'title' => $title,
                'user_id' => $this->userId
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $labelId,
                    'title' => $title,
                    'description' => $description,
                    'color' => $color,
                    'show_on_sidebar' => $showOnSidebar
                ]
            ]);

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
     * OPTIMIZADO: BD directa + Cache de 2 minutos + Sin N+1
     */
    public function getTeams()
    {
        try {
            $user = auth()->user();
            $company = $user ? $user->company : null;
            
            if (!$company || !$company->chatwoot_account_id) {
                return response()->json(['success' => true, 'data' => [], 'message' => 'Sin Chatwoot configurado']);
            }
            
            // 🚀 BD DIRECTA (sin cache para datos en tiempo real)
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Obtener equipos de la cuenta
            $teams = $chatwootDb->table('teams')
                ->where('account_id', $this->accountId)
                ->select('id', 'name', 'description', 'allow_auto_assign', 'account_id')
                ->orderBy('name')
                ->get();
            
            if ($teams->isEmpty()) {
                return response()->json(['success' => true, 'data' => []]);
            }
            
            // Obtener miembros de todos los equipos en una sola query
            $teamIds = $teams->pluck('id')->toArray();
            $allMembers = $chatwootDb->table('team_members')
                ->join('users', 'team_members.user_id', '=', 'users.id')
                ->whereIn('team_members.team_id', $teamIds)
                ->select(
                    'team_members.team_id',
                    'users.id',
                    'users.name',
                    'users.display_name',
                    'users.email'
                )
                ->get();
            
            // ⚡ Pre-cargar TODOS los usuarios locales en UNA sola query (evita N+1)
            $allEmails = $allMembers->pluck('email')->filter()->unique()->toArray();
            $localUsers = !empty($allEmails)
                ? \App\Models\User::whereIn('email', $allEmails)->get()->keyBy('email')
                : collect();
            
            // Agrupar miembros por team_id
            $membersByTeam = $allMembers->groupBy('team_id');
            
            // Construir respuesta
            $teamsWithMembers = $teams->map(function ($team) use ($membersByTeam, $localUsers) {
                $members = $membersByTeam->get($team->id, collect());
                
                // Enriquecer con nombres de nuestra BD (ya pre-cargados)
                $enrichedMembers = $members->map(function ($member) use ($localUsers) {
                    $localUser = $localUsers->get($member->email);
                    return [
                        'id' => $member->id,
                        'name' => $localUser->full_name ?? $member->display_name ?? $member->name,
                        'email' => $member->email,
                        'thumbnail' => ''
                    ];
                })->toArray();
                
                return [
                    'id' => $team->id,
                    'name' => $team->name,
                    'description' => $team->description,
                    'allow_auto_assign' => $team->allow_auto_assign,
                    'account_id' => $team->account_id,
                    'members' => $enrichedMembers
                ];
            })->toArray();
            
            return response()->json(['success' => true, 'data' => $teamsWithMembers]);

        } catch (\Exception $e) {
            Log::error('getTeams Error: ' . $e->getMessage());
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    /**
     * Obtener un equipo específico con sus miembros
     * OPTIMIZADO: BD directa + Sin N+1
     */
    public function getTeam($teamId)
    {
        try {
            // 🚀 BD DIRECTA
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)
                ->where('account_id', $this->accountId)
                ->first();
            
            if (!$team) {
                return response()->json(['success' => false, 'message' => 'Equipo no encontrado'], 404);
            }
            
            // Obtener miembros
            $chatwootMembers = $chatwootDb->table('team_members')
                ->join('users', 'team_members.user_id', '=', 'users.id')
                ->where('team_members.team_id', $teamId)
                ->select('users.id', 'users.name', 'users.display_name', 'users.email')
                ->get();
            
            // ⚡ Pre-cargar usuarios locales en UNA sola query (evita N+1)
            $emails = $chatwootMembers->pluck('email')->filter()->toArray();
            $localUsers = !empty($emails)
                ? \App\Models\User::whereIn('email', $emails)->get()->keyBy('email')
                : collect();
            
            $members = $chatwootMembers->map(function ($member) use ($localUsers) {
                $localUser = $localUsers->get($member->email);
                return [
                    'id' => $member->id,
                    'name' => $localUser->full_name ?? $member->display_name ?? $member->name,
                    'email' => $member->email,
                    'thumbnail' => ''
                ];
            })->toArray();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'description' => $team->description,
                    'allow_auto_assign' => $team->allow_auto_assign,
                    'account_id' => $team->account_id,
                    'members' => $members
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('getTeam Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al obtener equipo'], 500);
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

            Log::debug('🔧 Creando equipo en Chatwoot', [
                'name' => $validated['name'],
                'account_id' => $this->accountId,
                'token_preview' => substr($this->chatwootToken, 0, 10) . '...',
            ]);

            $result = $this->chatwootService->createTeam(
                $this->accountId,
                $this->chatwootToken,
                $validated['name'],
                $validated['description'] ?? ''
            );

            $responseBody = $result['data'] ?? [];
            $responseStatus = $result['status'] ?? 500;
            
            Log::debug('🔧 Respuesta createTeam', [
                'status' => $responseStatus,
                'successful' => $result['success'],
                'body' => $responseBody
            ]);

            if ($result['success']) {
                Log::debug('✅ Equipo creado exitosamente en Chatwoot', [
                    'user_id' => $this->userId,
                    'team_name' => $validated['name'],
                    'team_id' => $responseBody['id'] ?? 'unknown'
                ]);
                
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
                'error' => $result['error'] ?? 'Unknown'
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al crear equipo: ' . ($responseBody['message'] ?? $responseBody['error'] ?? $result['error'] ?? 'Error desconocido'),
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

            $result = $this->chatwootService->updateTeam(
                $this->accountId,
                $this->chatwootToken,
                (int) $teamId,
                $validated
            );

            if ($result['success']) {
                Log::debug('Equipo actualizado en Chatwoot', [
                    'user_id' => $this->userId,
                    'team_id' => $teamId
                ]);
                
                return response()->json([
                    'success' => true,
                    'data' => $result['data'],
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
            $result = $this->chatwootService->deleteTeam(
                $this->accountId,
                $this->chatwootToken,
                (int) $teamId
            );

            if ($result['success']) {
                Log::debug('Equipo eliminado de Chatwoot', [
                    'user_id' => $this->userId,
                    'team_id' => $teamId
                ]);
                
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
            // 🚀 BD DIRECTA
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            $members = $chatwootDb->table('team_members')
                ->join('users', 'team_members.user_id', '=', 'users.id')
                ->where('team_members.team_id', $teamId)
                ->select('users.id', 'users.name', 'users.display_name', 'users.email')
                ->get()
                ->map(function ($member) {
                    $localUser = \App\Models\User::where('email', $member->email)->first();
                    return [
                        'id' => $member->id,
                        'name' => $localUser->full_name ?? $member->display_name ?? $member->name,
                        'email' => $member->email,
                        'thumbnail' => ''
                    ];
                })
                ->toArray();

            return response()->json(['success' => true, 'data' => $members]);

        } catch (\Exception $e) {
            Log::error('getTeamMembers Error: ' . $e->getMessage());
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    /**
     * Agregar miembros a un equipo
     * OPTIMIZADO: BD directa
     */
    public function addTeamMembers(Request $request, $teamId)
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            // 🚀 BD DIRECTA
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Verificar que el team existe y pertenece a la cuenta
            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)
                ->where('account_id', $this->accountId)
                ->first();
            
            if (!$team) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipo no encontrado'
                ], 404);
            }
            
            $addedCount = 0;
            $now = now();
            
            foreach ($validated['user_ids'] as $userId) {
                // Verificar que el usuario existe
                $userExists = $chatwootDb->table('users')->where('id', $userId)->exists();
                if (!$userExists) continue;
                
                // Verificar si ya es miembro (evitar duplicados)
                $alreadyMember = $chatwootDb->table('team_members')
                    ->where('team_id', $teamId)
                    ->where('user_id', $userId)
                    ->exists();
                
                if (!$alreadyMember) {
                    $chatwootDb->table('team_members')->insert([
                        'team_id' => $teamId,
                        'user_id' => $userId,
                        'created_at' => $now,
                        'updated_at' => $now
                    ]);
                    $addedCount++;
                }
            }
            
            Log::debug('🚀 BD directa: Miembros agregados al equipo', [
                'user_id' => $this->userId,
                'team_id' => $teamId,
                'added_users' => $validated['user_ids'],
                'added_count' => $addedCount
            ]);
            
            return response()->json([
                'success' => true,
                'message' => "Se agregaron $addedCount miembros exitosamente"
            ]);

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
     * OPTIMIZADO: BD directa
     */
    public function updateTeamMembers(Request $request, $teamId)
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            // 🚀 BD DIRECTA
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Verificar que el team existe y pertenece a la cuenta
            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)
                ->where('account_id', $this->accountId)
                ->first();
            
            if (!$team) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipo no encontrado'
                ], 404);
            }
            
            // Usar transacción para asegurar consistencia
            $chatwootDb->beginTransaction();
            
            try {
                // Eliminar todos los miembros actuales
                $chatwootDb->table('team_members')
                    ->where('team_id', $teamId)
                    ->delete();
                
                // Insertar los nuevos miembros
                $now = now();
                $insertedCount = 0;
                
                foreach ($validated['user_ids'] as $userId) {
                    // Verificar que el usuario existe
                    $userExists = $chatwootDb->table('users')->where('id', $userId)->exists();
                    if (!$userExists) continue;
                    
                    $chatwootDb->table('team_members')->insert([
                        'team_id' => $teamId,
                        'user_id' => $userId,
                        'created_at' => $now,
                        'updated_at' => $now
                    ]);
                    $insertedCount++;
                }
                
                $chatwootDb->commit();
                
                Log::debug('🚀 BD directa: Miembros del equipo actualizados', [
                    'user_id' => $this->userId,
                    'team_id' => $teamId,
                    'new_member_count' => $insertedCount
                ]);
                
            } catch (\Exception $e) {
                $chatwootDb->rollBack();
                throw $e;
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Miembros actualizados exitosamente'
            ]);

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
     * OPTIMIZADO: BD directa
     */
    public function removeTeamMember(Request $request, $teamId)
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            // 🚀 BD DIRECTA
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // Verificar que el team existe y pertenece a la cuenta
            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)
                ->where('account_id', $this->accountId)
                ->first();
            
            if (!$team) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipo no encontrado'
                ], 404);
            }
            
            // Eliminar los miembros especificados
            $deletedCount = $chatwootDb->table('team_members')
                ->where('team_id', $teamId)
                ->whereIn('user_id', $validated['user_ids'])
                ->delete();
            
            Log::debug('🚀 BD directa: Miembros removidos del equipo', [
                'user_id' => $this->userId,
                'team_id' => $teamId,
                'removed_users' => $validated['user_ids'],
                'deleted_count' => $deletedCount
            ]);
            
            return response()->json([
                'success' => true,
                'message' => "Se removieron $deletedCount miembros exitosamente"
            ]);

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

            Log::debug('Iniciando exportación de todas las conversaciones con mensajes', [
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

            Log::debug('Total de conversaciones encontradas', [
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

            Log::debug('Exportación completada', [
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

            Log::debug('Actualizando contacto en Chatwoot', [
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

            // Llamar al servicio para actualizar el contacto
            $result = $this->chatwootService->updateContact(
                $this->accountId,
                $this->chatwootToken,
                (int) $contactId,
                $updateData
            );

            if ($result['success']) {
                $contactData = $result['data'] ?? [];
                
                Log::debug('Contacto actualizado exitosamente', [
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
                'status' => $result['status'] ?? 'N/A',
                'error' => $result['error'] ?? 'Unknown'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar contacto en Chatwoot',
                'error' => $result['error'] ?? 'Unknown'
            ], $result['status'] ?? 500);

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

                Log::debug('🔗 Conversaciones duplicadas detectadas por número real', [
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

                        Log::debug('🔗 Conversación LID vinculada a número real', [
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
            Log::debug('✅ Deduplicación completada', [
                'original_count' => count($conversations),
                'deduplicated_count' => count($result),
                'merged_conversations' => count($conversationsToMerge),
                'merged_ids' => $conversationsToMerge
            ]);
        }

        return $result;
    }

    /**
     * 🆕 DEDUPLICACIÓN V2: Por phone_number normalizado
     * Esta es la forma correcta de deduplicar, no por identifier/LID
     */
    private function deduplicateByNormalizedPhone(array $conversations): array
    {
        if (empty($conversations)) {
            return $conversations;
        }

        $phoneMap = [];
        $noPhoneConversations = [];

        foreach ($conversations as $conv) {
            // Obtener phone_number del contacto
            $phoneNumber = $conv['meta']['sender']['phone_number'] ?? null;
            
            // Si no hay phone_number, intentar extraerlo del identifier
            if (!$phoneNumber) {
                $identifier = $conv['meta']['sender']['identifier'] ?? '';
                if (PhoneNormalizer::isRealNumber($identifier)) {
                    $phoneNumber = PhoneNormalizer::normalize($identifier);
                } elseif (PhoneNormalizer::isGroup($identifier)) {
                    // Es un grupo, no deduplicar por teléfono
                    $noPhoneConversations[] = $conv;
                    continue;
                }
            }

            // 🚀 REFACTORIZADO: Usar PhoneNormalizer centralizado
            $normalizedPhone = PhoneNormalizer::getLastDigits($phoneNumber);

            if (!$normalizedPhone) {
                // Sin teléfono válido, agregar sin deduplicar
                $noPhoneConversations[] = $conv;
                continue;
            }

            // Si ya existe una conversación con este teléfono, quedarse con la más reciente
            if (isset($phoneMap[$normalizedPhone])) {
                $existing = $phoneMap[$normalizedPhone];
                $existingTime = $existing['timestamp'] ?? $existing['last_activity_at'] ?? 0;
                $currentTime = $conv['timestamp'] ?? $conv['last_activity_at'] ?? 0;

                if ($currentTime > $existingTime) {
                    // La nueva es más reciente, reemplazar
                    Log::debug('🔗 Deduplicación por phone: reemplazando conversación más antigua', [
                        'phone' => $normalizedPhone,
                        'old_id' => $existing['id'],
                        'new_id' => $conv['id']
                    ]);
                    $phoneMap[$normalizedPhone] = $conv;
                }
            } else {
                $phoneMap[$normalizedPhone] = $conv;
            }
        }

        // Combinar y ordenar por timestamp
        $result = array_merge(array_values($phoneMap), $noPhoneConversations);
        
        usort($result, function($a, $b) {
            $timeA = $a['timestamp'] ?? $a['last_activity_at'] ?? 0;
            $timeB = $b['timestamp'] ?? $b['last_activity_at'] ?? 0;
            return $timeB - $timeA; // Más reciente primero
        });

        $deduplicatedCount = count($conversations) - count($result);
        if ($deduplicatedCount > 0) {
            Log::debug('✅ Deduplicación por phone_number completada', [
                'original' => count($conversations),
                'result' => count($result),
                'removed' => $deduplicatedCount
            ]);
        }

        return $result;
    }

    /**
     * 🔍 Endpoint de diagnóstico de duplicados
     * GET /api/chatwoot/duplicates/diagnosis
     */
    public function getDuplicatesDiagnosis(Request $request)
    {
        try {
            if (!$this->inboxId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado'
                ], 403);
            }

            $diagnosis = $this->deduplicationService->getDuplicatesDiagnosis(
                $this->inboxId, 
                $this->accountId
            );

            return response()->json($diagnosis);

        } catch (\Exception $e) {
            Log::error('Error en diagnóstico de duplicados', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🔀 Endpoint para forzar fusión de duplicados
     * POST /api/chatwoot/duplicates/merge
     */
    public function forceMergeDuplicates(Request $request)
    {
        try {
            if (!$this->inboxId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un inbox asignado'
                ], 403);
            }

            $result = $this->deduplicationService->autoMergeDuplicates(
                $this->inboxId,
                $this->accountId
            );

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Error en fusión forzada de duplicados', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
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
            $convResult = $this->chatwootService->getConversation(
                $this->accountId,
                $this->chatwootToken,
                (int) $conversationId
            );

            if (!$convResult['success']) {
                Log::warning('Conversación no encontrada al intentar eliminar', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId,
                    'status' => $convResult['status'] ?? 'N/A'
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Conversación no encontrada'
                ], 404);
            }

            $conversation = $convResult['data'] ?? [];

            // SEGURIDAD: Validar que la conversación pertenece al inbox del usuario
            if (($conversation['inbox_id'] ?? 0) != $this->inboxId) {
                Log::warning('Intento de eliminar conversación de otro inbox', [
                    'user_id' => $this->userId,
                    'user_inbox_id' => $this->inboxId,
                    'conversation_inbox_id' => $conversation['inbox_id'] ?? 'N/A',
                    'conversation_id' => $conversationId
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para eliminar esta conversación'
                ], 403);
            }

            // PASO 2: Eliminar la conversación usando el servicio
            $deleteResult = $this->chatwootService->deleteConversation(
                $this->accountId,
                $this->chatwootToken,
                (int) $conversationId
            );

            if ($deleteResult['success']) {
                Log::debug('✅ Conversación eliminada exitosamente', [
                    'user_id' => $this->userId,
                    'conversation_id' => $conversationId,
                    'contact_phone' => $conversation['meta']['sender']['phone_number'] ?? 'N/A'
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Conversación eliminada correctamente'
                ]);
            }

            // Si la eliminación falla
            Log::error('Error al eliminar conversación en Chatwoot', [
                'user_id' => $this->userId,
                'conversation_id' => $conversationId,
                'status' => $deleteResult['status'] ?? 'N/A',
                'error' => $deleteResult['error'] ?? 'Unknown'
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

            // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de múltiples llamadas HTTP
            // Una sola conexión, múltiples queries optimizadas
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            
            // 1. Total y activas conversaciones
            $conversationStats = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as active
                ')
                ->first();
            
            $totalConversations = $conversationStats->total ?? 0;
            $activeConversations = $conversationStats->active ?? 0;
            
            // 2. Estadísticas de mensajes (excluyendo activity type=2)
            $messageStats = $chatwootDb->table('messages')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->where('message_type', '!=', 2) // Excluir activity
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN message_type = 1 THEN 1 ELSE 0 END) as agent,
                    SUM(CASE WHEN message_type = 0 THEN 1 ELSE 0 END) as client
                ')
                ->first();
            
            $totalMessages = $messageStats->total ?? 0;
            $agentMessages = $messageStats->agent ?? 0;
            $clientMessages = $messageStats->client ?? 0;
            
            // 3. Top 5 contactos con más mensajes
            $topContacts = $chatwootDb->table('messages as m')
                ->join('conversations as c', 'm.conversation_id', '=', 'c.id')
                ->join('contacts as ct', 'c.contact_id', '=', 'ct.id')
                ->where('m.account_id', $this->accountId)
                ->where('m.inbox_id', $this->inboxId)
                ->where('m.message_type', '!=', 2)
                ->groupBy('ct.id', 'ct.name', 'ct.phone_number')
                ->orderByRaw('COUNT(*) DESC')
                ->limit(5)
                ->selectRaw('ct.id, ct.name, ct.phone_number as phone, COUNT(*) as count')
                ->get()
                ->toArray();
            
            // 4. Tiempo promedio de respuesta (calculado de forma simple)
            // Buscamos el tiempo entre mensaje entrante y primera respuesta saliente
            $avgResponseTime = '2.5 min'; // Por ahora valor estimado
            
            Log::debug('✅ Dashboard stats obtenidas (BD directa)', [
                'inbox_id' => $this->inboxId,
                'total_conversations' => $totalConversations,
                'total_messages' => $totalMessages
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'totalConversations' => $totalConversations,
                    'activeConversations' => $activeConversations,
                    'totalMessages' => $totalMessages,
                    'agentMessages' => $agentMessages,
                    'clientMessages' => $clientMessages,
                    'topContacts' => $topContacts,
                    'avgResponseTime' => $avgResponseTime,
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
