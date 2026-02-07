<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EvolutionApiService;
use App\Traits\ChatwootDbAccess;
use App\Traits\ResolvesChatwootConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatwootMessageController extends Controller
{
    use ResolvesChatwootConfig, ChatwootDbAccess;

    private $accountId;
    private $inboxId;
    private $userId;
    private EvolutionApiService $evolutionApi;

    public function __construct(EvolutionApiService $evolutionApi)
    {
        $this->evolutionApi = $evolutionApi;
        $this->bootChatwootMiddleware();
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
            if (!$this->inboxId) {
                Log::warning('Usuario sin inbox_id intentó enviar mensaje', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id
                ]);
                return response()->json(['success' => false, 'message' => 'No tienes un inbox asignado'], 403);
            }

            Log::debug('sendMessage: Buscando conversación', [
                'conversation_id' => $id,
                'account_id' => $this->accountId,
                'inbox_id' => $this->inboxId,
                'user_id' => $this->userId
            ]);

            // PASO 1: Validar que la conversación pertenece al inbox del usuario (BD DIRECTA)
            $accountIdInt = (int) $this->accountId;

            $conversation = $this->chatwootDb()
                ->table('conversations')
                ->join('contacts', 'conversations.contact_id', '=', 'contacts.id')
                ->where(function ($q) use ($id) {
                    $q->where('conversations.id', $id)->orWhere('conversations.display_id', $id);
                })
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
                $convExists = $this->chatwootDb()
                    ->table('conversations')
                    ->where(function ($q) use ($id) {
                        $q->where('id', $id)->orWhere('display_id', $id);
                    })
                    ->first(['id', 'display_id', 'account_id', 'inbox_id']);

                Log::warning('Conversación no encontrada al enviar mensaje', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'account_id_used' => $accountIdInt,
                    'conv_exists_in_other_account' => $convExists ? true : false,
                    'conv_actual_account' => $convExists->account_id ?? 'N/A',
                    'conv_actual_inbox' => $convExists->inbox_id ?? 'N/A'
                ]);

                return response()->json(['success' => false, 'message' => 'Conversación no encontrada'], 404);
            }

            // PASO 2: VALIDACIÓN DE SEGURIDAD
            if (!$conversation->inbox_id || $conversation->inbox_id != $this->inboxId) {
                Log::warning('Intento de envío de mensaje no autorizado', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'conversation_inbox_id' => $conversation->inbox_id ?? 'null',
                    'user_inbox_id' => $this->inboxId
                ]);
                return response()->json(['success' => false, 'message' => 'No tienes permiso para enviar mensajes a esta conversación'], 403);
            }

            // PASO 3: Obtener teléfono del contacto
            $contactPhone = $conversation->phone_number ?? null;
            $contactIdentifier = $conversation->identifier ?? null;

            if (!$contactPhone && $contactIdentifier) {
                $contactPhone = preg_replace('/@.*$/', '', $contactIdentifier);
            }

            if (!$contactPhone) {
                Log::error('No se pudo obtener teléfono del contacto', ['conversation_id' => $id]);
                return response()->json(['success' => false, 'message' => 'No se pudo obtener el teléfono del contacto'], 400);
            }

            // PASO 4: Detectar si es archivo (base64 o upload tradicional)
            $fileBase64 = $request->input('file_base64');
            $fileName = $request->input('file_name');
            $fileType = $request->input('file_type');

            // MÉTODO 1: Archivo enviado como base64
            if ($fileBase64 && $fileName && $fileType) {
                Log::debug('📦 Archivo recibido como base64', [
                    'fileName' => $fileName, 'fileType' => $fileType, 'base64_length' => strlen($fileBase64)
                ]);
                return $this->sendBase64File($fileBase64, $fileName, $fileType, $id, $contactPhone);
            }

            // MÉTODO 2: Upload tradicional (FormData)
            // Use Laravel's request abstraction (Octane-safe, unlike $_FILES)
            $uploadedFile = $request->file('file') ?? $request->file('attachments') ?? $request->file('attachment');

            if ($uploadedFile && !$uploadedFile->isValid()) {
                $errorMsg = 'El archivo no se subió correctamente: ' . $uploadedFile->getErrorMessage();
                Log::error('❌ Error de upload: ' . $errorMsg);
                return response()->json(['success' => false, 'message' => $errorMsg], 400);
            }

            if ($uploadedFile) {
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
                return response()->json(['success' => false, 'message' => 'El mensaje no puede estar vacío'], 400);
            }

            $evolutionResult = $this->sendToEvolutionAPI($contactPhone, $messageContent);

            if ($evolutionResult) {
                Log::channel('stderr')->info('✅ [SEND_MESSAGE] Mensaje enviado via Evolution', [
                    'user_id' => $this->userId,
                    'conversation_id' => $id,
                    'phone' => $contactPhone,
                    'message' => substr($messageContent, 0, 50)
                ]);

                $messagePayload = [
                    'id' => 'sent-' . time() . '-' . rand(1000, 9999),
                    'content' => $messageContent,
                    'created_at' => now()->toISOString(),
                    'message_type' => 1,
                    'status' => 'sent',
                    'sender' => [
                        'id' => $this->userId,
                        'name' => auth()->user()->name ?? 'Agent',
                        'type' => 'user'
                    ],
                    'conversation_id' => $conversation->display_id ?? $id,
                    '_fromAgent' => true
                ];

                // HUMAN TAKEOVER: Pausar bot cuando agente envía mensaje
                $phoneNumber = preg_replace('/[^0-9]/', '', $contactPhone);

                if ($phoneNumber) {
                    try {
                        $redis = \Illuminate\Support\Facades\Redis::connection('n8n');

                        $user = auth()->user();
                        $botConfig = $this->getBotConfigForUser($user);
                        $blockDuration = (int)($botConfig['block_duration'] ?? 60);

                        $redis->setex($phoneNumber, $blockDuration, 'human-takeover');
                        Log::channel('stderr')->info('🛑 [HUMAN_TAKEOVER] Bot PAUSADO', [
                            'phone' => $phoneNumber,
                            'duration_seconds' => $blockDuration
                        ]);
                    } catch (\Exception $e) {
                        Log::channel('stderr')->error('❌ [HUMAN_TAKEOVER] Error', [
                            'error' => $e->getMessage(),
                            'phone' => $phoneNumber
                        ]);
                    }
                }

                return response()->json(['success' => true, 'payload' => $messagePayload]);
            }

            return response()->json(['success' => false, 'message' => 'No se pudo enviar el mensaje a WhatsApp'], 500);

        } catch (\Exception $e) {
            Log::error('💥 Chatwoot Send Message Error: ' . $e->getMessage(), [
                'user_id' => $this->userId,
                'conversation_id' => $id
            ]);
            return $this->errorResponse($e);
        }
    }

    /**
     * Obtener configuración del bot para el usuario.
     * Lee la configuración desde el workflow de n8n.
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
                    if ($ttl) $config['block_duration'] = (int)$ttl;
                }
            }

            \Illuminate\Support\Facades\Cache::put($cacheKey, $config, 300);
            return $config;
        } catch (\Exception $e) {
            Log::channel('stderr')->error('🤖 [getBotConfigForUser] Error', ['error' => $e->getMessage()]);
            return $defaults;
        }
    }

    /**
     * Enviar archivo como base64 (evita límites de upload PHP)
     */
    private function sendBase64File($base64Data, $fileName, $mimeType, $conversationId, $contactPhone)
    {
        try {
            $isVoiceMessage = str_contains($fileName, 'audio-message');

            if ($isVoiceMessage) {
                $mediaType = 'audio';
                $mimeType = 'audio/ogg';
            } else {
                $mediaType = $this->getMediaType($mimeType);
            }

            $user = auth()->user();
            if (!$user || !$user->company_slug) {
                throw new \Exception('No hay instancia de WhatsApp configurada. Por favor conecta tu WhatsApp primero.');
            }
            $instanceName = $user->company_slug;
            $cleanPhone = preg_replace('/[^0-9]/', '', $contactPhone);

            if ($isVoiceMessage) {
                $evolutionResult = $this->evolutionApi->sendWhatsAppAudio($instanceName, $cleanPhone, $base64Data);
            } else {
                $evolutionResult = $this->evolutionApi->sendMediaMessage(
                    $instanceName, $cleanPhone, $base64Data, $mediaType, $mimeType,
                    null, $mediaType === 'document' ? $fileName : null
                );
            }

            if ($evolutionResult && $evolutionResult['success']) {
                return response()->json([
                    'success' => true,
                    'payload' => [
                        'id' => 'pending-' . time(),
                        'content' => "📎 {$fileName}",
                        'created_at' => now()->toISOString(),
                        'message_type' => 1,
                        'status' => 'sent',
                        'attachments' => [['file_type' => $mimeType, 'file_name' => $fileName]],
                        'sender' => ['name' => auth()->user()->name ?? 'Agent']
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
                'user_id' => $this->userId, 'conversation_id' => $conversationId
            ]);
            return $this->errorResponse($e);
        }
    }

    /**
     * Enviar archivo (imagen, video, audio, documento) vía Evolution API
     */
    private function sendFileMessage(Request $request, $conversationId, $contactPhone)
    {
        try {
            $file = $request->file('file') ?? $request->file('attachments') ?? $request->file('attachment');

            if (!$file) {
                return response()->json(['success' => false, 'message' => 'No se encontró archivo para enviar'], 400);
            }

            $mimeType = $file->getMimeType();
            $originalName = $file->getClientOriginalName();
            $caption = $request->input('content', '');
            $isVoiceMessage = str_contains($originalName, 'audio-message');

            if ($isVoiceMessage) {
                $mediaType = 'audio';
                $mimeType = 'audio/ogg';
            } else {
                $mediaType = $this->getMediaType($mimeType);
            }

            $base64Media = base64_encode(file_get_contents($file->getPathname()));

            $user = auth()->user();
            if (!$user || !$user->company_slug) {
                throw new \Exception('No hay instancia de WhatsApp configurada. Por favor conecta tu WhatsApp primero.');
            }
            $instanceName = $user->company_slug;
            $cleanPhone = preg_replace('/[^0-9]/', '', $contactPhone);

            if ($isVoiceMessage) {
                $evolutionResult = $this->evolutionApi->sendWhatsAppAudio($instanceName, $cleanPhone, $base64Media);
            } else {
                $evolutionResult = $this->evolutionApi->sendMediaMessage(
                    $instanceName, $cleanPhone, $base64Media, $mediaType, $mimeType,
                    !empty($caption) ? $caption : null,
                    $mediaType === 'document' ? $originalName : null
                );
            }

            if ($evolutionResult && $evolutionResult['success']) {
                return response()->json([
                    'success' => true,
                    'payload' => [
                        'id' => 'pending-' . time(),
                        'content' => $caption ?: "📎 {$originalName}",
                        'created_at' => now()->toISOString(),
                        'message_type' => 1,
                        'status' => 'sent',
                        'attachments' => [['file_type' => $mimeType, 'file_name' => $originalName]],
                        'sender' => ['name' => auth()->user()->name ?? 'Agent']
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
                'user_id' => $this->userId, 'conversation_id' => $conversationId
            ]);
            return $this->errorResponse($e);
        }
    }

    /**
     * Determinar tipo de media según MIME type
     */
    private function getMediaType(string $mimeType): string
    {
        if (str_starts_with($mimeType, 'image/')) return 'image';
        if (str_starts_with($mimeType, 'video/')) return 'video';
        if (str_starts_with($mimeType, 'audio/')) return 'audio';
        return 'document';
    }

    /**
     * Enviar mensaje a WhatsApp vía Evolution API
     */
    private function sendToEvolutionAPI($phone, $message)
    {
        try {
            $user = auth()->user();
            if (!$user || !$user->company_slug) {
                Log::error('❌ No se puede enviar mensaje: Usuario sin company_slug configurado');
                return false;
            }
            $instanceName = $user->company_slug;
            $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

            $result = $this->evolutionApi->sendTextMessage($instanceName, $cleanPhone, $message);

            if ($result['success']) {
                Log::debug('✅ Mensaje enviado a WhatsApp', ['phone' => $cleanPhone]);
                return true;
            }

            Log::error('❌ Error enviando a WhatsApp', ['phone' => $cleanPhone, 'error' => $result['error'] ?? 'Unknown']);
            return false;
        } catch (\Exception $e) {
            Log::error('💥 Exception en sendToEvolutionAPI', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
