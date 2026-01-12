<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EvolutionApiService;
use App\Jobs\CleanupUnconnectedInstance;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Events\NewMessageReceived;
use App\Events\ConversationUpdated;
use App\Events\WhatsAppStatusChanged;

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

        // Si la instancia se cre?? exitosamente, registrarla en whatsapp_instances
        if ($result['success']) {
            $user = $request->user();
            if ($user && $user->company_id) {
                DB::table('whatsapp_instances')->updateOrInsert(
                    ['instance_name' => $instanceName],
                    [
                        'company_id' => $user->company_id,
                        'instance_url' => 'http://evolution_api:8080',
                        'is_active' => 1,
                        'updated_at' => now()
                    ]
                );
                Log::info("WhatsApp instance registered", [
                    'instance_name' => $instanceName,
                    'company_id' => $user->company_id
                ]);
            }
        }

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

        // 🧹 AUTO-LIMPIEZA: Programar verificación de conexión en 5 minutos
        // Si no se conecta en 5 minutos, la instancia se eliminará automáticamente
        if ($result['success']) {
            $connectionRequestedAt = time();
            
            // Guardar timestamp del intento de conexión para evitar limpiezas duplicadas
            Cache::put(
                "whatsapp:connection_attempt:{$instanceName}",
                $connectionRequestedAt,
                now()->addMinutes(10) // Mantener por 10 minutos
            );

            // Programar Job de limpieza para ejecutarse en 5 minutos
            CleanupUnconnectedInstance::dispatch($instanceName, $connectionRequestedAt)
                ->delay(now()->addMinutes(5));

            Log::info('🧹 Cleanup job programado para 5 minutos', [
                'instance' => $instanceName,
                'scheduled_at' => now()->addMinutes(5)->toDateTimeString()
            ]);
        }

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Obtener estado de conexi??n
     */
    public function getStatus(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        Log::info('WhatsApp Status Check', ['instanceName' => $instanceName]);
        $result = $this->evolutionApi->getStatus($instanceName);
        Log::info('WhatsApp Status Result', ['result' => $result]);

        // Broadcast status change to all connected clients
        if ($result['success'] ?? false) {
            try {
                $user = $request->user();
                if ($user && $user->company_slug) {
                    broadcast(new WhatsAppStatusChanged(
                        $user->company_slug,
                        $instanceName,
                        $result['state'] ?? 'unknown',
                        $result['qrCode'] ?? null,
                        $result['profileInfo'] ?? null
                    ));
                }
            } catch (\Exception $e) {
                Log::error('Error broadcasting status check', ['error' => $e->getMessage()]);
            }
        }

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
     * Configurar integraci??n con Chatwoot
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
     * Evolution API ya maneja la creaci??n de contactos y conversaciones en Chatwoot.
     * Este webhook solo registra los eventos y los transmite via Reverb para actualizaci??n en tiempo real.
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

        // REENVIO A N8N
        try {
            $instance = DB::table('whatsapp_instances')->where('instance_name', $instanceName)->where('is_active', 1)->first();
            if (!$instance) return response()->json(['status' => 'ok']);
            $n8nUrl="http://172.17.0.3:5678/webhook/whatsapp-user-{$instance->company_id}";
            Log::info('Reenviando a n8n',['url'=>$n8nUrl]);
            Http::timeout(5)->post($n8nUrl,$request->all());
        } catch (\Exception $e) { Log::error('Error n8n',['e'=>$e->getMessage()]); }


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
            Log::warning('Mensaje sin n??mero de tel??fono', ['data' => $data]);
            return;
        }

        // Limpiar el n??mero de tel??fono (quitar @s.whatsapp.net)
        $cleanPhone = str_replace('@s.whatsapp.net', '', $phoneNumber);

        Log::info('???? Nuevo mensaje recibido', [
            'phone' => $phoneNumber,
            'clean_phone' => $cleanPhone,
            'from_me' => $fromMe,
            'message' => $messageText,
            'instance' => $instanceName
        ]);

        // ???? NO notificar si el mensaje es de nosotros (fromMe: true)
        // Esto evita la notificaci??n falsa de "nuevo mensaje" cuando T?? env??as
        if ($fromMe) {
            Log::info('?????? Mensaje enviado por nosotros, no se notifica', [
                'phone' => $cleanPhone,
                'from_me' => true
            ]);
            return;
        }

        // ???? CREAR CONVERSACI??N EN CHATWOOT
        try {
            $chatwootBaseUrl = env('CHATWOOT_URL', 'http://chatwoot-rails-1:3000');
            $chatwootToken = env('CHATWOOT_TOKEN', 'UV3DeqL7tSiQzRMQcAgHNGVR');
            // $instanceName ya est?? disponible como par??metro de la funci??n
            $inboxId = null;
            
            // Buscar inbox en Chatwoot basado en el nombre de la instancia
            if ($instanceName) {
                try {
                    $inboxesResponse = Http::withHeaders([
                        'api_access_token' => $chatwootToken
                    ])->get("$chatwootBaseUrl/api/v1/accounts/1/inboxes");
                    
                    if ($inboxesResponse->successful()) {
                        $inboxes = $inboxesResponse->json()['payload'] ?? [];
                        Log::info("???? Inboxes disponibles", ['count' => count($inboxes), 'inboxes' => array_map(fn($i) => ['id' => $i['id'], 'name' => $i['name']], $inboxes)]);
                        
                        foreach ($inboxes as $inbox) {
                            if (str_contains($inbox['name'] ?? '', $instanceName)) {
                                $inboxId = $inbox['id'];
                                Log::info("??? Inbox encontrado para $instanceName", ['inbox_id' => $inboxId]);
                                break;
                            }
                        }
                        
                        // Si no se encontr?? por nombre, usar el primer inbox disponible
                        if ($inboxId === null && count($inboxes) > 0) {
                            $inboxId = $inboxes[0]['id'];
                            Log::warning("?????? Inbox no encontrado por nombre, usando primer inbox disponible", ['inbox_id' => $inboxId, 'inbox_name' => $inboxes[0]['name']]);
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("Error buscando inbox: " . $e->getMessage());
                }
                
                // Si a??n no hay inbox_id, intentar obtener del usuario
                if ($inboxId === null) {
                    try {
                        $user = \App\Models\User::where('company_slug', $instanceName)->first();
                        if ($user && $user->chatwoot_inbox_id) {
                            $inboxId = $user->chatwoot_inbox_id;
                            Log::info("??? Inbox obtenido del usuario", ['inbox_id' => $inboxId]);
                        }
                    } catch (\Exception $e) {
                        Log::error("Error obteniendo inbox del usuario: " . $e->getMessage());
                    }
                }
            }

            // Fallback final: usar inbox_id 1 si no se pudo obtener
            if ($inboxId === null) {
                $inboxId = 1;
                Log::warning("?????? No se encontr?? inbox_id, usando valor por defecto: 1");
            }
            
            // 1. Buscar o crear contacto
            $contactResponse = Http::withHeaders([
                'api_access_token' => $chatwootToken,
                'Content-Type' => 'application/json'
            ])->post("$chatwootBaseUrl/api/v1/accounts/1/contacts", [
                'inbox_id' => $inboxId,
                'name' => $cleanPhone,
                'phone_number' => '+' . $cleanPhone
            ]);
            
            $contact = null;
            if ($contactResponse->successful()) {
                $contact = $contactResponse->json()['payload'] ?? $contactResponse->json();
                Log::info('??? Contacto creado en Chatwoot', ['contact_id' => $contact['id'] ?? null]);
            } else {
                // Intentar buscar el contacto
                $searchResponse = Http::withHeaders([
                    'api_access_token' => $chatwootToken
                ])->get("$chatwootBaseUrl/api/v1/accounts/1/contacts/search", [
                    'q' => $cleanPhone
                ]);
                
                if ($searchResponse->successful()) {
                    $contacts = $searchResponse->json()['payload'] ?? [];
                    $contact = $contacts[0] ?? null;
                    Log::info('??? Contacto encontrado', ['contact_id' => $contact['id'] ?? null]);
                }
            }
            
              if ($contact && isset($contact['id'])) {
                  $contactId = $contact['id'];
                  
                  // 2. ???? BUSCAR POR CONTACT_ID (FIX - mismo n??mero = mismo ID conversaci??n)
                  $conversation = null;
                  
                  $existingConvResponse = Http::withHeaders([
                      'api_access_token' => $chatwootToken
                  ])->get("$chatwootBaseUrl/api/v1/accounts/1/contacts/$contactId/conversations");

                  if ($existingConvResponse->successful()) {
                      $contactConversations = $existingConvResponse->json()['payload'] ?? [];
                      
                      foreach ($contactConversations as $conv) {
                          if (isset($conv['inbox_id']) && $conv['inbox_id'] == $inboxId && 
                              isset($conv['status']) && $conv['status'] === 'open') {
                              $conversation = $conv;
                              Log::info('??? MISMA CONVERSACI??N (mismo ID)', [
                                  'conv_id' => $conversation['id'],
                                  'contact_id' => $contactId
                              ]);
                              break;
                          }
                      }
                  }

                  if (!$conversation) {
                      $convResponse = Http::withHeaders([
                          'api_access_token' => $chatwootToken
                      ])->post("$chatwootBaseUrl/api/v1/accounts/1/conversations", [
                          'inbox_id' => $inboxId,
                          'contact_id' => $contactId,
                          'status' => 'open'
                      ]);

                      if ($convResponse->successful()) {
                          $conversation = $convResponse->json();
                          Log::info('??? Conversaci??n NUEVA creada', ['conv_id' => $conversation['id'] ?? null]);
                      }
                  }

                  if ($conversation && isset($conversation['id'])) {
                      Http::withHeaders([
                          'api_access_token' => $chatwootToken
                      ])->post("$chatwootBaseUrl/api/v1/accounts/1/conversations/{$conversation['id']}/messages", [
                          'content' => $messageText,
                          'message_type' => 'incoming'
                      ]);

                      Log::info('??? Mensaje creado en Chatwoot');
                  }
              }
        } catch (\Exception $e) {
            Log::error('??? Error con Chatwoot', ['error' => $e->getMessage()]);
        }
        
        // Broadcast: notificar que hay que refrescar
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
                $inboxId,  // Usar inbox din??mico
                1   // accountId
            ))->toOthers();

            Log::info('??? Se??al de nuevo mensaje broadcasted', [
                'phone' => $cleanPhone,
                'action' => 'new_message'
            ]);

            // ???? INVALIDAR CACH?? de conversaciones para forzar refresh
            $cacheKey = 'conversations_user_1_inbox_' . $inboxId;
            Cache::forget($cacheKey);
            Log::info('??????? Cach?? de conversaciones invalidado', ['cache_key' => $cacheKey]);

        } catch (\Exception $e) {
            Log::error('Error broadcasting message signal', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
        }
    }

    /**
     * Manejar actualizaci??n de mensaje (le??do, entregado, etc)
     */
    private function handleMessageUpdate(array $data, string $instanceName): void
    {
        $fromMe = $data['fromMe'] ?? false;

        Log::info('???? Actualizaci??n de mensaje', [
            'data' => $data,
            'instance' => $instanceName,
            'from_me' => $fromMe
        ]);

        // ???? NO notificar si el mensaje es de nosotros (fromMe: true)
        if ($fromMe) {
            Log::info('?????? Actualizaci??n de mensaje propio, no se notifica', [
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

            Log::info('??? Evento ConversationUpdated broadcasted');
        } catch (\Exception $e) {
            Log::error('Error broadcasting update event', [
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ]);
        }
    }

    /**
     * Manejar cambio de estado de conexi??n
     */
    private function handleConnectionUpdate(array $data, string $instanceName): void
    {
        $state = $data['state'] ?? 'unknown';

        Log::info('???? Cambio de conexi??n', [
            'instance' => $instanceName,
            'state' => $state,
            'data' => $data
        ]);

        // 🧹 AUTO-LIMPIEZA: Si la conexión fue exitosa, cancelar el Job de limpieza
        // Actualizamos el timestamp para que el Job programado detecte que hay un intento más reciente
        if ($state === 'open') {
            // Marcar la conexión como exitosa para evitar que el cleanup elimine la instancia
            Cache::put(
                "whatsapp:connection_attempt:{$instanceName}",
                time() + 86400, // Timestamp futuro para invalidar cualquier job pendiente
                now()->addHours(24)
            );
            
            Log::info('✅ Conexión exitosa, cleanup job será cancelado', [
                'instance' => $instanceName,
                'state' => $state
            ]);
        }

        try {
            // Obtener company_slug desde la instancia
            $instance = DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->where('is_active', 1)
                ->first();

            if ($instance) {
                $companySlug = $instance->company_slug ?? $instance->company_id;
                
                // Disparar evento de WhatsApp con el company_slug correcto
                broadcast(new WhatsAppStatusChanged(
                    $companySlug,
                    $instanceName,
                    $state,
                    $data['qrcode'] ?? null,
                    $data['profileInfo'] ?? null
                ));

                Log::info('??? WhatsAppStatusChanged event broadcasted', [
                    'company' => $companySlug,
                    'instance' => $instanceName,
                    'state' => $state
                ]);
            }

            // Mantener el evento legacy para compatibilidad
            broadcast(new ConversationUpdated(
                ['state' => $state, 'instance' => $instanceName],  // conversation data
                5,      // inboxId
                1       // accountId
            ))->toOthers();

            Log::info('??? Evento de conexi??n broadcasted');
        } catch (\Exception $e) {
            Log::error('Error broadcasting connection event', [
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ]);
        }
    }
}
