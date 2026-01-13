<?php

namespace App\Http\Controllers;

use App\Events\NewChatwootMessage;
use App\Events\MessageUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatwootWebhookController extends Controller
{
    /**
     * Handle Chatwoot webhook
     */
    public function handle(Request $request)
    {
        try {
            $payload = $request->all();
            
            Log::info('Chatwoot Webhook recibido:', $payload);

            $eventType = $payload['event'] ?? '';

            // Verificar que es un evento de mensaje nuevo
            if ($eventType === 'message_created') {
                $messageType = $payload['message_type'] ?? '';
                
                // Solo procesar mensajes entrantes (no los enviados por nosotros)
                if ($messageType === 'incoming') {
                    $conversationId = $payload['conversation']['id'] ?? 0;
                    $contactName = $payload['conversation']['meta']['sender']['name'] ?? 'Contacto desconocido';
                    $messageContent = $payload['content'] ?? '';
                    $unreadCount = $payload['conversation']['unread_count'] ?? 0;
                    $inboxId = $payload['inbox']['id'] ?? $payload['conversation']['inbox_id'] ?? 1;

                    // Disparar evento de Reverb al canal correcto
                    broadcast(new NewChatwootMessage(
                        $conversationId,
                        $contactName,
                        $messageContent,
                        $unreadCount,
                        $inboxId
                    ))->toOthers();

                    Log::info('Notificación enviada vía Reverb', [
                        'conversation_id' => $conversationId,
                        'contact_name' => $contactName,
                        'inbox_id' => $inboxId,
                        'channel' => 'inbox.' . $inboxId
                    ]);
                }
            }
            
            // 📝 Manejar actualizaciones de mensaje (status: sent, delivered, read)
            if ($eventType === 'message_updated') {
                $message = $payload['message'] ?? $payload;
                $conversationId = $payload['conversation']['id'] ?? $message['conversation_id'] ?? 0;
                $inboxId = $payload['inbox']['id'] ?? $payload['inbox_id'] ?? $message['inbox_id'] ?? 1;
                
                // Extraer status del mensaje
                $messageData = [
                    'id' => $message['id'] ?? 0,
                    'status' => $message['status'] ?? 'sent',
                    'source_id' => $message['source_id'] ?? null,
                    'conversation_id' => $conversationId,
                ];
                
                // Disparar evento para actualizar UI
                broadcast(new MessageUpdated(
                    $messageData,
                    $conversationId,
                    $inboxId
                ))->toOthers();
                
                Log::info('Estado de mensaje actualizado vía WebSocket', [
                    'message_id' => $messageData['id'],
                    'status' => $messageData['status'],
                    'conversation_id' => $conversationId
                ]);
            }

            return response()->json(['status' => 'success'], 200);
        } catch (\Exception $e) {
            Log::error('Error procesando webhook de Chatwoot:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
