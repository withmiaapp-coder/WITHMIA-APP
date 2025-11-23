<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EvolutionApiService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Events\NewMessageReceived;
use App\Events\ConversationUpdated;

class EvolutionApiController extends Controller
{
    private EvolutionApiService $evolutionApi;

    public function __construct(EvolutionApiService $evolutionApi)
    {
        $this->evolutionApi = $evolutionApi;
    }

    /**
     * Obtener el nombre de instancia basado en el usuario/empresa actual
     */
    private function getInstanceName(Request $request): string
    {
        if ($request->has('instance_name')) {
            return $request->input('instance_name');
        }

        $user = $request->user();

        if ($user && $user->company_id) {
            return config('evolution.instance_naming') === 'company_slug' && $user->company_slug
                ? $user->company_slug
                : "company_{$user->company_id}";
        }

        return "user_{$user->id}";
    }

    /**
     * Crear una nueva instancia de WhatsApp
     */
    public function createInstance(Request $request): JsonResponse
    {
        $instanceName = $this->getInstanceName($request);
        $webhookUrl = config('evolution.webhook_url');

        if ($request->has('webhook_url')) {
            $webhookUrl = $request->input('webhook_url');
        }

        $result = $this->evolutionApi->createInstance($instanceName, $webhookUrl);

        return response()->json($result, $result['success'] ? 201 : 400);
    }

    /**
     * Conectar instancia y obtener QR code
     */
    public function connect(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);

        $createResult = $this->evolutionApi->createInstance($instanceName);

        if (!$createResult['success'] && !str_contains($createResult['error'] ?? '', 'already in use')) {
            Log::warning('Failed to create instance', ['instance' => $instanceName, 'error' => $createResult]);
        }

        $result = $this->evolutionApi->connect($instanceName);

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Obtener estado de conexión
     */
    public function getStatus(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        Log::info('WhatsApp Status Check', ['instanceName' => $instanceName]);
        $result = $this->evolutionApi->getStatus($instanceName);
        Log::info('WhatsApp Status Result', ['result' => $result]);

        return response()->json($result);
    }

    /**
     * Desconectar instancia (logout)
     */
    public function disconnect(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        $result = $this->evolutionApi->disconnect($instanceName);

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Eliminar instancia completamente
     */
    public function deleteInstance(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        $result = $this->evolutionApi->deleteInstance($instanceName);

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Enviar mensaje de texto
     */
    public function sendMessage(Request $request, ?string $instanceName = null): JsonResponse
    {
        $request->validate([
            'number' => 'required|string',
            'message' => 'required|string'
        ]);

        $instanceName = $instanceName ?? $this->getInstanceName($request);

        $result = $this->evolutionApi->sendTextMessage(
            $instanceName,
            $request->input('number'),
            $request->input('message')
        );

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Listar todas las instancias
     */
    public function listInstances(): JsonResponse
    {
        $result = $this->evolutionApi->listInstances();

        return response()->json($result);
    }

    /**
     * Configurar integración con Chatwoot
     */
    public function setChatwoot(Request $request, ?string $instanceName = null): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|string',
            'token' => 'required|string',
            'url' => 'nullable|url'
        ]);

        $instanceName = $instanceName ?? $this->getInstanceName($request);

        $result = $this->evolutionApi->setChatwootIntegration(
            $instanceName,
            $request->input('account_id'),
            $request->input('token'),
            $request->input('url', config('evolution.chatwoot.url')),
            $request->input('sign_msg', true),
            $request->input('reopen_conversation', true),
            $request->input('conversation_pending', false)
        );

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Webhook receiver para eventos de Evolution API
     * 
     * Evolution API ya maneja la creación de contactos y conversaciones en Chatwoot.
     * Este webhook solo registra los eventos y los transmite via Reverb para actualización en tiempo real.
     */
    public function webhook(Request $request): JsonResponse
    {
        $event = $request->input('event');
        $instanceName = $request->input('instance');
        $data = $request->input('data');

        Log::info('Evolution API Webhook received', [
            'event' => $event,
            'instance' => $instanceName,
            'data' => $data
        ]);

        try {
            switch ($event) {
                case 'messages.upsert':
                case 'MESSAGES_UPSERT':
                    $this->handleMessageUpsert($data, $instanceName);
                    break;

                case 'messages.update':
                case 'MESSAGES_UPDATE':
                    $this->handleMessageUpdate($data, $instanceName);
                    break;

                case 'connection.update':
                case 'CONNECTION_UPDATE':
                    $this->handleConnectionUpdate($data, $instanceName);
                    break;

                default:
                    Log::info('Unhandled webhook event', ['event' => $event]);
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Error processing webhook', [
                'event' => $event,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Manejar evento de nuevo mensaje
     */
    private function handleMessageUpsert(array $data, string $instanceName): void
    {
        $phoneNumber = $data['key']['remoteJid'] ?? null;
        $fromMe = $data['key']['fromMe'] ?? false;
        $messageText = $data['message']['conversation'] 
            ?? $data['message']['extendedTextMessage']['text'] 
            ?? $data['message']['imageMessage']['caption'] 
            ?? '';

        if (!$phoneNumber) {
            Log::warning('Mensaje sin número de teléfono', ['data' => $data]);
            return;
        }

        // Limpiar el número de teléfono (quitar @s.whatsapp.net)
        $cleanPhone = str_replace('@s.whatsapp.net', '', $phoneNumber);

        Log::info('📨 Nuevo mensaje recibido', [
            'phone' => $phoneNumber,
            'clean_phone' => $cleanPhone,
            'from_me' => $fromMe,
            'message' => $messageText,
            'instance' => $instanceName
        ]);

        // 🚫 NO notificar si el mensaje es de nosotros (fromMe: true)
        // Esto evita la notificación falsa de "nuevo mensaje" cuando TÚ envías
        if ($fromMe) {
            Log::info('⏭️ Mensaje enviado por nosotros, no se notifica', [
                'phone' => $cleanPhone,
                'from_me' => true
            ]);
            return;
        }

        // Broadcast simple: solo notificar que hay que refrescar
        // El frontend debe escuchar conversation.updated y hacer refetch
        try {
            broadcast(new ConversationUpdated(
                [
                    'action' => 'new_message',
                    'phone' => $cleanPhone,
                    'message' => $messageText,
                    'from_me' => $fromMe,
                    'instance' => $instanceName,
                    'should_refresh' => true
                ],
                5,  // inboxId
                1   // accountId
            ))->toOthers();

            Log::info('✅ Señal de nuevo mensaje broadcasted', [
                'phone' => $cleanPhone,
                'action' => 'new_message'
            ]);

            // 🔥 INVALIDAR CACHÉ de conversaciones para forzar refresh
            $cacheKey = 'conversations_user_1_inbox_5'; // Usar el mismo formato que ChatwootController
            Cache::forget($cacheKey);
            Log::info('🗑️ Caché de conversaciones invalidado', ['cache_key' => $cacheKey]);

        } catch (\Exception $e) {
            Log::error('Error broadcasting message signal', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
        }
    }

    /**
     * Manejar actualización de mensaje (leído, entregado, etc)
     */
    private function handleMessageUpdate(array $data, string $instanceName): void
    {
        $fromMe = $data['fromMe'] ?? false;

        Log::info('📝 Actualización de mensaje', [
            'data' => $data,
            'instance' => $instanceName,
            'from_me' => $fromMe
        ]);

        // 🚫 NO notificar si el mensaje es de nosotros (fromMe: true)
        if ($fromMe) {
            Log::info('⏭️ Actualización de mensaje propio, no se notifica', [
                'from_me' => true
            ]);
            return;
        }

        try {
            broadcast(new ConversationUpdated(
                $data,  // conversation data
                5,      // inboxId
                1       // accountId
            ))->toOthers();

            Log::info('✅ Evento ConversationUpdated broadcasted');
        } catch (\Exception $e) {
            Log::error('Error broadcasting update event', [
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ]);
        }
    }

    /**
     * Manejar cambio de estado de conexión
     */
    private function handleConnectionUpdate(array $data, string $instanceName): void
    {
        $state = $data['state'] ?? 'unknown';

        Log::info('🔌 Cambio de conexión', [
            'instance' => $instanceName,
            'state' => $state,
            'data' => $data
        ]);

        try {
            broadcast(new ConversationUpdated(
                ['state' => $state, 'instance' => $instanceName],  // conversation data
                5,      // inboxId
                1       // accountId
            ))->toOthers();

            Log::info('✅ Evento de conexión broadcasted');
        } catch (\Exception $e) {
            Log::error('Error broadcasting connection event', [
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ]);
        }
    }
}
