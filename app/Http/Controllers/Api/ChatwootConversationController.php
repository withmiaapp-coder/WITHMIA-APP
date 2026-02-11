<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\PhoneNormalizer;
use App\Services\ChatwootService;
use App\Services\ConversationDeduplicationService;
use App\Traits\ChatwootDbAccess;
use App\Traits\ResolvesChatwootConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatwootConversationController extends Controller
{
    use ResolvesChatwootConfig, ChatwootDbAccess;

    private $accountId;
    private $inboxId;
    private $userId;
    private ChatwootService $chatwootService;
    private ConversationDeduplicationService $deduplicationService;

    public function __construct(
        ChatwootService $chatwootService,
        ConversationDeduplicationService $deduplicationService
    ) {
        $this->chatwootService = $chatwootService;
        $this->deduplicationService = $deduplicationService;
        $this->bootChatwootMiddleware();
    }

    /**
     * Obtener conversaciones (REAL API) - CON FILTRO DE SEGURIDAD
     */
    public function getConversations(Request $request)
    {
        try {
            Log::info('[WITHMIA] getConversations ENTRY', [
                'accountId' => $this->accountId, 'inboxId' => $this->inboxId,
                'user' => auth()->id(),
            ]);
            if (!$this->inboxId) {
                return response()->json([
                    'success' => true,
                    'data' => ['payload' => []],
                    'message' => 'No tienes un inbox asignado'
                ]);
            }

            $chatwootDb = $this->chatwootDb();

            $query = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId);

            // Filtro de status
            if ($request->has('status')) {
                $statusValue = self::STATUS_TO_INT[$request->input('status')] ?? null;
                if ($statusValue !== null) {
                    $query->where('status', $statusValue);
                }
            }

            // Filtro de assignee_type
            if ($request->has('assignee_type')) {
                $assigneeType = $request->input('assignee_type');
                if ($assigneeType === 'me') {
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

            $conversationsFromDb = $query
                ->orderBy('last_activity_at', 'desc')
                ->limit(200)
                ->get();

            // Obtener contactos en una sola query
            $contactIds = $conversationsFromDb->pluck('contact_id')->unique()->filter()->toArray();
            $contacts = !empty($contactIds)
                ? $chatwootDb->table('contacts')->whereIn('id', $contactIds)->get()->keyBy('id')
                : collect();

            // Obtener asignados en una sola query
            $assigneeIds = $conversationsFromDb->pluck('assignee_id')->unique()->filter()->toArray();
            $assignees = !empty($assigneeIds)
                ? $chatwootDb->table('users')->whereIn('id', $assigneeIds)->get()->keyBy('id')
                : collect();

            // Obtener último mensaje de cada conversación
            $conversationIds = $conversationsFromDb->pluck('id')->toArray();
            $lastMessages = [];
            if (!empty($conversationIds)) {
                // Subquery para obtener el MAX(id) por conversation_id
                $maxIdsSubquery = $chatwootDb->table('messages')
                    ->select('conversation_id', $chatwootDb->raw('MAX(id) as max_id'))
                    ->whereIn('conversation_id', $conversationIds)
                    ->whereIn('message_type', [0, 1])
                    ->groupBy('conversation_id');

                $lastMessagesRaw = $chatwootDb->table('messages')
                    ->joinSub($maxIdsSubquery, 'latest', function ($join) {
                        $join->on('messages.id', '=', 'latest.max_id');
                    })
                    ->get();

                foreach ($lastMessagesRaw as $msg) {
                    $lastMessages[$msg->conversation_id] = $msg;
                }
            }

            // Obtener labels de todas las conversaciones desde cached_label_list (text column)
            $labelsMap = [];
            foreach ($conversationsFromDb as $conv) {
                $cachedLabels = $conv->cached_label_list ?? null;
                if ($cachedLabels && is_string($cachedLabels)) {
                    // cached_label_list uses newline-separated values
                    $labels = array_values(array_filter(array_map('trim', preg_split('/[\n,]+/', trim($cachedLabels)))));
                    if (!empty($labels)) {
                        $labelsMap[$conv->id] = $labels;
                    }
                }
            }

            // Construir array de conversaciones
            $allConversations = [];
            foreach ($conversationsFromDb as $conv) {
                $contact = $contacts[$conv->contact_id] ?? null;
                $assignee = isset($conv->assignee_id) ? ($assignees[$conv->assignee_id] ?? null) : null;
                $lastMessage = $lastMessages[$conv->id] ?? null;

                // Excluir conversaciones de EvolutionAPI
                $senderName = $contact->name ?? '';
                if (stripos($senderName, 'EvolutionAPI') !== false) continue;

                $statusString = self::INT_TO_STATUS[$conv->status] ?? 'open';

                $allConversations[] = [
                    'id' => $conv->display_id,
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
                    'labels' => $labelsMap[$conv->id] ?? [],
                    'unread_count' => $conv->unread_count ?? 0,
                    'created_at' => $this->utcToTimestamp($conv->created_at),
                    'last_activity_at' => $this->utcToTimestamp($conv->last_activity_at) ?? $this->utcToTimestamp($conv->created_at),
                    'timestamp' => $this->utcToTimestamp($conv->last_activity_at) ?? $this->utcToTimestamp($conv->created_at),
                    'from_db' => true
                ];
            }

            // Deduplicación en memoria por phone_number normalizado
            $originalCount = count($allConversations);
            $allConversations = $this->deduplicateByNormalizedPhone($allConversations);

            if ($originalCount > count($allConversations)) {
                // Throttle: only dispatch merge job once per minute per inbox
                $cacheKey = "merge_job_dispatched:{$this->inboxId}";
                if (!\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                    \App\Jobs\MergeDuplicateConversationsJob::dispatch($this->inboxId, $this->accountId)
                        ->delay(now()->addSeconds(5));
                    \Illuminate\Support\Facades\Cache::put($cacheKey, true, 60);
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'payload' => $allConversations,
                    'meta' => ['total' => count($allConversations), 'from_db' => true]
                ]
            ]);

        } catch (\Throwable $e) {
            Log::error('[WITHMIA] getConversations ERROR', [
                'error' => $e->getMessage(),
                'class' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => $this->userId,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId,
            ]);
            return response()->json(['success' => true, 'data' => ['payload' => []]]);
        }
    }

    /**
     * Obtener una conversación específica por ID
     */
    public function getConversation($id)
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            $chatwootDb = $this->chatwootDb();

            $conv = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where(function ($q) use ($id) {
                    $q->where('id', $id)->orWhere('display_id', $id);
                })
                ->first();

            if (!$conv) {
                return response()->json(['success' => false, 'message' => 'Conversación no encontrada'], 404);
            }

            if ($conv->inbox_id != $this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos'], 403);
            }

            $contact = $chatwootDb->table('contacts')->where('id', $conv->contact_id)->first();
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

        } catch (\Throwable $e) {
            Log::error('Error getConversation: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al obtener conversación'], 500);
        }
    }

    /**
     * Obtener mensajes de una conversación específica
     */
    public function getConversationMessages($id, Request $request = null)
    {
        try {
            $limit = min((int)($request?->query('limit', 20) ?? 20), 100);
            $before = $request?->query('before');

            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            $chatwootDb = $this->chatwootDb();
            $conversationFromDb = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where(function ($query) use ($id) {
                    $query->where('id', $id)->orWhere('display_id', $id);
                })
                ->first();

            if (!$conversationFromDb) {
                return response()->json(['success' => false, 'message' => 'Conversación no encontrada'], 404);
            }

            $dbConversationId = $conversationFromDb->id;
            $apiConversationId = $conversationFromDb->display_id ?? $conversationFromDb->id;

            if ($conversationFromDb->inbox_id != $this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes permiso para ver esta conversación'], 403);
            }

            // Obtener mensajes de BD
            $messagesPerBatch = 50;
            $query = $chatwootDb->table('messages')
                ->where('conversation_id', $dbConversationId)
                ->whereIn('message_type', [0, 1])
                ->orderBy('id', 'desc')
                ->limit($messagesPerBatch + 1);

            if ($before) {
                $query->where('id', '<', $before);
            }

            $messagesFromDb = $query->get();
            $hasMore = count($messagesFromDb) > $messagesPerBatch;
            if ($hasMore) {
                $messagesFromDb = $messagesFromDb->take($messagesPerBatch);
            }

            // Obtener attachments
            $messageIds = $messagesFromDb->pluck('id')->toArray();
            $attachmentsFromDb = [];
            if (!empty($messageIds)) {
                $attachmentsFromDb = $chatwootDb->table('attachments')
                    ->whereIn('message_id', $messageIds)
                    ->get()
                    ->groupBy('message_id')
                    ->map(fn($items) => $items->map(fn($att) => [
                        'id' => $att->id,
                        'file_type' => $att->file_type,
                        'data_url' => $att->data_url ?? null,
                        'file_name' => $att->extension ? "archivo.{$att->extension}" : null,
                        'thumb_url' => null,
                    ])->toArray())
                    ->toArray();
            }

            // Obtener info del contacto y usuarios
            $contact = $chatwootDb->table('contacts')->where('id', $conversationFromDb->contact_id)->first();
            $userIds = $messagesFromDb->where('sender_type', 'User')->pluck('sender_id')->unique()->filter();
            $users = $userIds->isNotEmpty()
                ? $chatwootDb->table('users')->whereIn('id', $userIds)->get()->keyBy('id')
                : collect();

            $allMessages = [];
            foreach ($messagesFromDb as $msg) {
                $sender = null;
                if ($msg->sender_type === 'Contact' && $contact) {
                    $sender = [
                        'id' => $contact->id, 'name' => $contact->name ?? 'Contacto',
                        'type' => 'contact', 'phone_number' => $contact->phone_number ?? null
                    ];
                } elseif ($msg->sender_type === 'User' && isset($users[$msg->sender_id])) {
                    $user = $users[$msg->sender_id];
                    $sender = ['id' => $user->id, 'name' => $user->name ?? 'Agente', 'type' => 'user'];
                } else {
                    $sender = ['id' => $msg->sender_id ?? 0, 'name' => 'Agente', 'type' => 'user'];
                }

                $allMessages[] = [
                    'id' => $msg->id,
                    'content' => $msg->content,
                    'message_type' => $msg->message_type,
                    'created_at' => $this->utcToTimestamp($msg->created_at),
                    'sender' => $sender,
                    'attachments' => $attachmentsFromDb[$msg->id] ?? [],
                    'private' => $msg->private ?? false,
                    'from_db' => true
                ];
            }

            usort($allMessages, fn($a, $b) => $a['id'] - $b['id']);

            // Filtrar mensajes de EvolutionAPI
            $filteredMessages = array_values(array_filter($allMessages, function ($message) {
                $senderName = $message['sender']['name'] ?? '';
                $messageType = $message['message_type'] ?? null;
                if ($messageType === 1 || $messageType === 'outgoing') return true;
                return stripos($senderName, 'EvolutionAPI') === false;
            }));

            $oldestMessageId = !empty($filteredMessages) ? $filteredMessages[0]['id'] : null;
            $newestMessageId = !empty($filteredMessages) ? $filteredMessages[count($filteredMessages) - 1]['id'] : null;

            return response()->json([
                'success' => true,
                'payload' => ['payload' => $filteredMessages],
                'meta' => [
                    'total' => count($filteredMessages),
                    'returned' => count($filteredMessages),
                    'has_more' => $hasMore,
                    'oldest_id' => $oldestMessageId,
                    'newest_id' => $newestMessageId,
                    '_debug' => config('app.debug') ? ['before_param' => $before, 'raw_count' => count($allMessages)] : null
                ]
            ]);

        } catch (\Throwable $e) {
            Log::error('Chatwoot Get Messages Error: ' . $e->getMessage(), [
                'user_id' => $this->userId, 'conversation_id' => $id
            ]);
            return response()->json(['success' => false, 'message' => 'Error al obtener mensajes'], 500);
        }
    }

    /**
     * Marcar conversación como leída
     */
    public function markAsRead($id)
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            $chatwootDb = $this->chatwootDb();

            $conversation = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->where(function ($q) use ($id) {
                    $q->where('id', $id)->orWhere('display_id', $id);
                })
                ->first();

            if (!$conversation) {
                return response()->json(['success' => false, 'message' => 'Conversación no encontrada'], 404);
            }

            $now = now();
            $chatwootDb->table('conversations')
                ->where('id', $conversation->id)
                ->update(['agent_last_seen_at' => $now, 'updated_at' => $now]);

            return response()->json(['success' => true, 'message' => 'Conversación marcada como leída']);

        } catch (\Throwable $e) {
            Log::error('Error marking conversation as read: ' . $e->getMessage(), [
                'user_id' => $this->userId, 'conversation_id' => $id
            ]);
            return response()->json(['success' => false, 'message' => 'Error al marcar como leída'], 500);
        }
    }

    /**
     * Exportar todas las conversaciones con mensajes (vía API HTTP de Chatwoot)
     */
    public function exportAllConversationsWithMessages(Request $request)
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado', 'data' => []]);
            }

            // Safety limits to prevent unbounded loops / memory exhaustion
            $maxConversations = min((int) $request->query('limit', 200), 500);
            $maxPages = 20;

            $allConversations = [];
            $currentPage = 1;
            $perPage = 100;
            $hasMorePages = true;

            while ($hasMorePages && $currentPage <= $maxPages && count($allConversations) < $maxConversations) {
                $response = Http::timeout(15)->withHeaders([
                    'api_access_token' => $this->chatwootToken,
                    'Content-Type' => 'application/json'
                ])->get("{$this->chatwootBaseUrl}/api/v1/accounts/{$this->accountId}/conversations", [
                    'inbox_id' => $this->inboxId,
                    'page' => $currentPage,
                    'per_page' => $perPage
                ]);

                if ($response->successful()) {
                    $conversations = $response->json()['data']['payload'] ?? [];
                    if (!empty($conversations)) {
                        $allConversations = array_merge($allConversations, $conversations);
                        $currentPage++;
                    } else {
                        $hasMorePages = false;
                    }
                } else {
                    $hasMorePages = false;
                }
            }

            $conversationsWithMessages = [];
            $processedCount = 0;
            $errorCount = 0;

            foreach ($allConversations as $conversation) {
                try {
                    $conversationId = $conversation['id'];
                    $messagesResponse = Http::timeout(10)->withHeaders([
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
                    }
                    $conversationsWithMessages[] = $conversation;
                    usleep(100000);
                } catch (\Throwable $e) {
                    $conversation['messages'] = [];
                    $conversationsWithMessages[] = $conversation;
                    $errorCount++;
                }
            }

            return response()->json([
                'success' => true,
                'data' => $conversationsWithMessages,
                'meta' => [
                    'total_conversations' => count($allConversations),
                    'processed_successfully' => $processedCount,
                    'errors' => $errorCount
                ]
            ]);

        } catch (\Throwable $e) {
            Log::error('Error en exportación: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al exportar conversaciones', 'data' => []], 500);
        }
    }

    /**
     * Eliminar conversación duplicada
     */
    public function deleteConversation(Request $request, $conversationId)
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            $convResult = $this->chatwootService->getConversation(
                $this->accountId, $this->chatwootToken, (int) $conversationId
            );

            if (!$convResult['success']) {
                return response()->json(['success' => false, 'message' => 'Conversación no encontrada'], 404);
            }

            $conversation = $convResult['data'] ?? [];

            if (($conversation['inbox_id'] ?? 0) != $this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos para eliminar esta conversación'], 403);
            }

            $deleteResult = $this->chatwootService->deleteConversation(
                $this->accountId, $this->chatwootToken, (int) $conversationId
            );

            if ($deleteResult['success']) {
                return response()->json(['success' => true, 'message' => 'Conversación eliminada correctamente']);
            }

            return response()->json(['success' => false, 'message' => 'Error al eliminar la conversación en Chatwoot'], 500);

        } catch (\Throwable $e) {
            Log::error('Excepción al eliminar conversación', [
                'conversation_id' => $conversationId, 'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error interno al eliminar conversación',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Diagnóstico de duplicados
     */
    public function getDuplicatesDiagnosis(Request $request)
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            return response()->json(
                $this->deduplicationService->getDuplicatesDiagnosis($this->inboxId, $this->accountId)
            );
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Forzar fusión de duplicados
     */
    public function forceMergeDuplicates(Request $request)
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            return response()->json(
                $this->deduplicationService->autoMergeDuplicates($this->inboxId, $this->accountId)
            );
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Deduplicación en memoria por phone_number normalizado (privada)
     */
    private function deduplicateByNormalizedPhone(array $conversations): array
    {
        if (empty($conversations)) return $conversations;

        $phoneMap = [];
        $noPhoneConversations = [];

        foreach ($conversations as $conv) {
            $phoneNumber = $conv['meta']['sender']['phone_number'] ?? null;

            if (!$phoneNumber) {
                $identifier = $conv['meta']['sender']['identifier'] ?? '';
                if (PhoneNormalizer::isRealNumber($identifier)) {
                    $phoneNumber = PhoneNormalizer::normalize($identifier);
                } elseif (PhoneNormalizer::isGroup($identifier)) {
                    $noPhoneConversations[] = $conv;
                    continue;
                }
            }

            $normalizedPhone = PhoneNormalizer::getLastDigits($phoneNumber);

            if (!$normalizedPhone) {
                $noPhoneConversations[] = $conv;
                continue;
            }

            if (isset($phoneMap[$normalizedPhone])) {
                $existing = $phoneMap[$normalizedPhone];
                $existingTime = $existing['timestamp'] ?? $existing['last_activity_at'] ?? 0;
                $currentTime = $conv['timestamp'] ?? $conv['last_activity_at'] ?? 0;
                if ($currentTime > $existingTime) {
                    $phoneMap[$normalizedPhone] = $conv;
                }
            } else {
                $phoneMap[$normalizedPhone] = $conv;
            }
        }

        $result = array_merge(array_values($phoneMap), $noPhoneConversations);
        usort($result, fn($a, $b) =>
            ($b['timestamp'] ?? $b['last_activity_at'] ?? 0) - ($a['timestamp'] ?? $a['last_activity_at'] ?? 0)
        );

        return $result;
    }
}
