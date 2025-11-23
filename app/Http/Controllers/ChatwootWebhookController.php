<?php

namespace App\Http\Controllers;

use App\Events\NewChatwootMessage;
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

            // Verificar que es un evento de mensaje nuevo
            if (isset($payload['event']) && $payload['event'] === 'message_created') {
                $messageType = $payload['message_type'] ?? '';
                
                // Solo procesar mensajes entrantes (no los enviados por nosotros)
                if ($messageType === 'incoming') {
                    $conversationId = $payload['conversation']['id'] ?? 0;
                    $contactName = $payload['conversation']['meta']['sender']['name'] ?? 'Contacto desconocido';
                    $messageContent = $payload['content'] ?? '';
                    $unreadCount = $payload['conversation']['unread_count'] ?? 0;

                    // Disparar evento de Reverb
                    broadcast(new NewChatwootMessage(
                        $conversationId,
                        $contactName,
                        $messageContent,
                        $unreadCount
                    ))->toOthers();

                    Log::info('Notificación enviada vía Reverb', [
                        'conversation_id' => $conversationId,
                        'contact_name' => $contactName
                    ]);
                }
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
