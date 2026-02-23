<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ChatwootService;
use App\Traits\ChatwootDbAccess;
use App\Traits\ResolvesChatwootConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * ChatwootMessageController
 *
 * Envío de mensajes directamente via Chatwoot API.
 * Chatwoot enruta automáticamente al canal correcto (WhatsApp, Web, Email, etc.)
 *
 * FLUJO:
 *   App (frontend) → Laravel proxy → Chatwoot API → Canal destino
 *
 * SOPORTA:
 *   - Mensajes de texto
 *   - Notas privadas (private: true) — solo visibles para agentes
 *   - Archivos vía base64 (imágenes, videos, audio, documentos)
 *   - Archivos vía upload FormData
 *   - Audio/voice messages
 */
class ChatwootMessageController extends Controller
{
    use ResolvesChatwootConfig, ChatwootDbAccess;

    private $accountId;
    private $inboxId;
    private $userId;
    private ChatwootService $chatwootService;

    public function __construct(ChatwootService $chatwootService)
    {
        $this->chatwootService = $chatwootService;
        $this->bootChatwootMiddleware();
    }

    /**
     * Enviar mensaje a una conversación via Chatwoot API
     */
    public function sendMessage(Request $request, $id): JsonResponse
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            // PASO 1: Validar conversación y permisos
            $conversation = $this->findAndValidateConversation($id);
            if (!$conversation) {
                return response()->json(['success' => false, 'message' => 'Conversación no encontrada o sin permisos'], 404);
            }

            $isPrivate = (bool) $request->input('private', false);
            $conversationDisplayId = $conversation->display_id;

            // PASO 2: Detectar tipo de contenido y enviar

            // MÉTODO 1: Archivo como base64 (imágenes, audio, docs)
            $fileBase64 = $request->input('file_base64');
            $fileName = $request->input('file_name');
            $fileType = $request->input('file_type');

            if ($fileBase64 && $fileName) {
                // Si file_type viene vacío, intentar detectar desde el nombre
                if (empty($fileType)) {
                    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                    $mimeMap = [
                        'pdf' => 'application/pdf',
                        'doc' => 'application/msword',
                        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'xls' => 'application/vnd.ms-excel',
                        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'ppt' => 'application/vnd.ms-powerpoint',
                        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        'png' => 'image/png',
                        'jpg' => 'image/jpeg',
                        'jpeg' => 'image/jpeg',
                        'gif' => 'image/gif',
                        'webp' => 'image/webp',
                        'mp4' => 'video/mp4',
                        'mp3' => 'audio/mpeg',
                        'ogg' => 'audio/ogg',
                        'webm' => 'audio/webm',
                        'txt' => 'text/plain',
                        'csv' => 'text/csv',
                        'zip' => 'application/zip',
                    ];
                    $fileType = $mimeMap[$extension] ?? 'application/octet-stream';
                }
                Log::debug('📦 Archivo base64 recibido', [
                    'fileName' => $fileName,
                    'fileType' => $fileType,
                    'base64_length' => strlen($fileBase64),
                ]);
                return $this->handleBase64Attachment(
                    $fileBase64, $fileName, $fileType, $conversationDisplayId,
                    $request->input('content'), $isPrivate, $conversation
                );
            }

            // MÉTODO 2: Upload tradicional (FormData)
            $uploadedFile = $request->file('file') ?? $request->file('attachments') ?? $request->file('attachment');
            if ($uploadedFile) {
                if (!$uploadedFile->isValid()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'El archivo no se subió correctamente: ' . $uploadedFile->getErrorMessage()
                    ], 400);
                }
                Log::debug('📎 Archivo FormData recibido', [
                    'fileName' => $uploadedFile->getClientOriginalName(),
                    'mimeType' => $uploadedFile->getMimeType(),
                    'size' => $uploadedFile->getSize(),
                ]);
                return $this->handleUploadAttachment(
                    $uploadedFile, $conversationDisplayId,
                    $request->input('content'), $isPrivate, $conversation
                );
            }

            // MÉTODO 3: Mensaje de texto
            $messageContent = $request->input('content');
            if (empty($messageContent)) {
                return response()->json(['success' => false, 'message' => 'El mensaje no puede estar vacío'], 400);
            }

            return $this->handleTextMessage($messageContent, $conversationDisplayId, $isPrivate, $conversation);

        } catch (\Throwable $e) {
            Log::error('💥 SendMessage Error: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'conversation_id' => $id,
            ]);
            return $this->errorResponse($e);
        }
    }

    // =========================================================================
    // HANDLERS POR TIPO DE CONTENIDO
    // =========================================================================

    /**
     * Enviar mensaje de texto via Chatwoot API
     */
    private function handleTextMessage(string $content, int $conversationId, bool $isPrivate, object $conversation)
    {
        $result = $this->chatwootService->sendTextMessage(
            $this->accountId,
            $this->chatwootToken,
            $conversationId,
            $content,
            $isPrivate
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo enviar el mensaje',
                'error' => $result['error'] ?? 'Error desconocido',
            ], $result['status'] ?? 500);
        }

        Log::channel('stderr')->info('✅ [SEND_MESSAGE] Mensaje enviado via Chatwoot API', [
            'user_id' => $this->userId,
            'conversation_id' => $conversationId,
            'private' => $isPrivate,
            'content_preview' => substr($content, 0, 50),
        ]);

        // Human Takeover: pausar bot cuando agente envía (solo mensajes públicos)
        if (!$isPrivate) {
            $this->activateHumanTakeover($conversation);
        }

        return response()->json([
            'success' => true,
            'payload' => $this->formatPayload($result['data'], $content),
        ]);
    }

    /**
     * Enviar archivo base64 via Chatwoot API
     */
    private function handleBase64Attachment(string $base64Data, string $fileName, string $mimeType, int $conversationId, ?string $caption, bool $isPrivate, object $conversation)
    {
        $result = $this->chatwootService->sendAttachmentMessage(
            $this->accountId,
            $this->chatwootToken,
            $conversationId,
            $base64Data,
            $fileName,
            $mimeType,
            $caption,
            $isPrivate
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo enviar el archivo',
                'error' => $result['error'] ?? 'Error desconocido',
            ], $result['status'] ?? 500);
        }

        Log::channel('stderr')->info('✅ [SEND_ATTACHMENT] Archivo enviado via Chatwoot API', [
            'user_id' => $this->userId,
            'conversation_id' => $conversationId,
            'file_name' => $fileName,
            'mime_type' => $mimeType,
        ]);

        if (!$isPrivate) {
            $this->activateHumanTakeover($conversation);
        }

        return response()->json([
            'success' => true,
            'payload' => $this->formatPayload($result['data'], $caption ?: "📎 {$fileName}"),
        ]);
    }

    /**
     * Enviar archivo upload (FormData) via Chatwoot API
     */
    private function handleUploadAttachment($file, int $conversationId, ?string $caption, bool $isPrivate, object $conversation)
    {
        $result = $this->chatwootService->sendUploadMessage(
            $this->accountId,
            $this->chatwootToken,
            $conversationId,
            $file,
            $caption,
            $isPrivate
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo enviar el archivo',
                'error' => $result['error'] ?? 'Error desconocido',
            ], $result['status'] ?? 500);
        }

        $originalName = $file->getClientOriginalName();

        Log::channel('stderr')->info('✅ [SEND_UPLOAD] Archivo upload enviado via Chatwoot API', [
            'user_id' => $this->userId,
            'conversation_id' => $conversationId,
            'file_name' => $originalName,
        ]);

        if (!$isPrivate) {
            $this->activateHumanTakeover($conversation);
        }

        return response()->json([
            'success' => true,
            'payload' => $this->formatPayload($result['data'], $caption ?: "📎 {$originalName}"),
        ]);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Validar que la conversación existe y el usuario tiene permisos.
     * Retorna el registro con display_id, inbox_id, phone_number, identifier.
     */
    private function findAndValidateConversation($id): ?object
    {
        $accountIdInt = (int) $this->accountId;

        // ✅ FIX: Priorizar display_id para evitar colisión con internal id
        $conversation = $this->chatwootDb()
            ->table('conversations')
            ->join('contacts', 'conversations.contact_id', '=', 'contacts.id')
            ->where('conversations.display_id', $id)
            ->where('conversations.account_id', $accountIdInt)
            ->select(
                'conversations.id',
                'conversations.display_id',
                'conversations.inbox_id',
                'contacts.phone_number',
                'contacts.identifier'
            )
            ->first();

        if (!$conversation) {
            // Fallback: buscar por internal id
            $conversation = $this->chatwootDb()
                ->table('conversations')
                ->join('contacts', 'conversations.contact_id', '=', 'contacts.id')
                ->where('conversations.id', $id)
                ->where('conversations.account_id', $accountIdInt)
                ->select(
                    'conversations.id',
                    'conversations.display_id',
                    'conversations.inbox_id',
                    'contacts.phone_number',
                    'contacts.identifier'
                )
                ->first();
        }

        if (!$conversation) {
            Log::warning('Conversación no encontrada al enviar mensaje', [
                'user_id' => $this->userId,
                'conversation_id' => $id,
                'account_id' => $accountIdInt,
            ]);
            return null;
        }

        // Validación de seguridad: inbox debe coincidir
        if ($conversation->inbox_id != $this->inboxId) {
            Log::warning('Intento de envío no autorizado', [
                'user_id' => $this->userId,
                'conversation_inbox_id' => $conversation->inbox_id,
                'user_inbox_id' => $this->inboxId,
            ]);
            return null;
        }

        return $conversation;
    }

    /**
     * Formatear respuesta de Chatwoot API al formato esperado por el frontend.
     */
    private function formatPayload(array $chatwootMessage, string $contentFallback): array
    {
        return [
            'id' => $chatwootMessage['id'] ?? ('sent-' . time() . '-' . rand(1000, 9999)),
            'content' => $chatwootMessage['content'] ?? $contentFallback,
            'created_at' => $chatwootMessage['created_at'] ?? now()->toISOString(),
            'message_type' => $chatwootMessage['message_type'] ?? 1,
            'status' => 'sent',
            'private' => $chatwootMessage['private'] ?? false,
            'sender' => $chatwootMessage['sender'] ?? [
                'id' => $this->userId,
                'name' => auth()->user()->name ?? 'Agent',
                'type' => 'user',
            ],
            'attachments' => $chatwootMessage['attachments'] ?? [],
            'conversation_id' => $chatwootMessage['conversation_id'] ?? null,
            '_fromAgent' => true,
        ];
    }

    /**
     * HUMAN TAKEOVER: Pausar bot cuando agente envía mensaje.
     * Escribe clave en Redis que n8n verifica antes de responder.
     */
    private function activateHumanTakeover(object $conversation): void
    {
        $contactPhone = $conversation->phone_number ?? null;
        $contactIdentifier = $conversation->identifier ?? null;

        if (!$contactPhone && $contactIdentifier) {
            $contactPhone = preg_replace('/@.*$/', '', $contactIdentifier);
        }

        if (!$contactPhone) return;

        $phoneNumber = preg_replace('/[^0-9]/', '', $contactPhone);
        if (!$phoneNumber) return;

        try {
            $redis = \Illuminate\Support\Facades\Redis::connection('n8n');
            $user = auth()->user();
            $botConfig = $this->getBotConfigForUser($user);
            $blockDuration = (int) ($botConfig['block_duration'] ?? 60);

            $redis->setex($phoneNumber, $blockDuration, 'human-takeover');

            Log::channel('stderr')->info('🛑 [HUMAN_TAKEOVER] Bot PAUSADO', [
                'phone' => $phoneNumber,
                'duration_seconds' => $blockDuration,
            ]);
        } catch (\Throwable $e) {
            Log::channel('stderr')->error('❌ [HUMAN_TAKEOVER] Error', [
                'error' => $e->getMessage(),
                'phone' => $phoneNumber,
            ]);
        }
    }

    /**
     * Eliminar un mensaje de una conversación
     */
    public function deleteMessage($conversationId, $messageId): JsonResponse
    {
        try {
            if (!$this->inboxId) {
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            // Validate conversation belongs to this inbox
            $conversation = $this->findAndValidateConversation($conversationId);
            if (!$conversation) {
                return response()->json(['success' => false, 'message' => 'Conversación no encontrada o sin permisos'], 404);
            }

            // Try Chatwoot API first
            if ($this->chatwootToken) {
                try {
                    $response = \Illuminate\Support\Facades\Http::timeout(10)
                        ->withHeaders(['api_access_token' => $this->chatwootToken])
                        ->delete("{$this->chatwootBaseUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversation->display_id}/messages/{$messageId}");

                    if ($response->successful() || $response->status() === 204) {
                        return response()->json(['success' => true, 'message' => 'Mensaje eliminado']);
                    }
                } catch (\Throwable $apiError) {
                    Log::warning('[WITHMIA] deleteMessage API failed, trying DB', ['error' => $apiError->getMessage()]);
                }
            }

            // Fallback: soft-delete via DB (set content to empty)
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            $message = $chatwootDb->table('messages')
                ->where('id', $messageId)
                ->where('conversation_id', $conversation->id)
                ->first();

            if (!$message) {
                return response()->json(['success' => false, 'message' => 'Mensaje no encontrado'], 404);
            }

            $chatwootDb->table('messages')
                ->where('id', $messageId)
                ->update([
                    'content' => '🗑️ Este mensaje fue eliminado',
                    'content_attributes' => json_encode(['deleted' => true]),
                    'updated_at' => now(),
                ]);

            return response()->json(['success' => true, 'message' => 'Mensaje eliminado']);

        } catch (\Throwable $e) {
            Log::error('[WITHMIA] deleteMessage ERROR', [
                'error' => $e->getMessage(),
                'conversation_id' => $conversationId,
                'message_id' => $messageId,
            ]);
            return response()->json(['success' => false, 'message' => 'Error al eliminar mensaje'], 500);
        }
    }

    /**
     * Obtener configuración del bot para el usuario (desde n8n workflow).
     */
    private function getBotConfigForUser($user): array
    {
        $defaults = ['unlock_keyword' => 'BOT', 'block_duration' => 60];

        try {
            $companySlug = $user->company_slug ?? null;
            if (!$companySlug) return $defaults;

            $cacheKey = "bot_config_{$companySlug}";
            $cachedConfig = \Illuminate\Support\Facades\Cache::get($cacheKey);
            if ($cachedConfig) return $cachedConfig;

            $instance = \App\Models\WhatsAppInstance::where('company_slug', $companySlug)
                ->whereNotNull('n8n_workflow_id')
                ->first();

            if (!$instance || !$instance->n8n_workflow_id) return $defaults;

            $n8nService = app(\App\Services\N8nService::class);
            $result = $n8nService->getWorkflow($instance->n8n_workflow_id);

            if (!$result['success'] || !isset($result['data']['nodes'])) return $defaults;

            $config = $defaults;
            foreach ($result['data']['nodes'] as $node) {
                if (in_array($node['name'], ['Verifica Palabra Clave', 'Verifica Palabra Clave Saliente'])) {
                    $keyword = $node['parameters']['conditions']['conditions'][0]['rightValue'] ?? null;
                    if ($keyword) $config['unlock_keyword'] = strtoupper($keyword);
                }
                if (in_array($node['name'], ['Bloquea al Agente', 'Block Agent on Outgoing'])) {
                    $ttl = $node['parameters']['ttl'] ?? null;
                    if ($ttl) $config['block_duration'] = (int) $ttl;
                }
            }

            \Illuminate\Support\Facades\Cache::put($cacheKey, $config, 300);
            return $config;
        } catch (\Throwable $e) {
            Log::channel('stderr')->error('🤖 [getBotConfigForUser] Error', ['error' => $e->getMessage()]);
            return $defaults;
        }
    }
}
