<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class EvolutionApiService
{
    private string $baseUrl;
    private string $apiKey;
    private int $cacheTtl = 60; // Tiempo de vida del caché en segundos (aumentado)
    private int $timeout = 5; // Timeout en segundos para evitar bloqueos
    private int $connectTimeout = 3; // Timeout de conexión

    public function __construct()
    {
        $this->baseUrl = config('evolution.api_url', 'http://localhost:8080');
        $this->apiKey = config('evolution.api_key', 'withmia_evolution_api_key_2025_secure_token');
    }

    /**
     * Crear una nueva instancia de WhatsApp CON integración Chatwoot
     * 
     * @param string $instanceName Nombre único de la instancia (ej: "company_123")
     * @param string|null $webhookUrl URL para recibir webhooks de mensajes
     * @param bool $enableChatwoot Habilitar integración con Chatwoot (default: true)
     * @return array
     */
    public function createInstance(string $instanceName, ?string $webhookUrl = null, bool $enableChatwoot = true): array
    {
        try {
            $payload = [
                'instanceName' => $instanceName,
                'qrcode' => true,
                'integration' => 'WHATSAPP-BAILEYS'
            ];

            // Agregar webhook si se proporciona
            if ($webhookUrl) {
                $payload['webhook'] = [
                    'url' => $webhookUrl,
                    'webhook_by_events' => false,
                    'webhook_base64' => false,
                    'events' => [
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'MESSAGES_DELETE',
                        'SEND_MESSAGE',
                        'CONNECTION_UPDATE',
                        'CALL',
                        'GROUPS_UPSERT',
                        'GROUP_UPDATE',
                        'GROUP_PARTICIPANTS_UPDATE'
                    ]
                ];
            }

            // CONFIGURACIÓN CHATWOOT: Incluir desde la creación de la instancia
            // Según documentación oficial: https://doc.evolution-api.com/v2/en/integrations/chatwoot
            if ($enableChatwoot) {
                $payload['chatwootAccountId'] = config('chatwoot.account_id', '1');
                $payload['chatwootToken'] = config('chatwoot.token', 'n88kRvouwD41QhiXZ1nRmaqY');
                $payload['chatwootUrl'] = config('chatwoot.url', 'http://localhost:3000');
                $payload['chatwootSignMsg'] = config('chatwoot.sign_msg', false);
                $payload['chatwootReopenConversation'] = config('chatwoot.reopen_conversation', false);
                $payload['chatwootConversationPending'] = config('chatwoot.conversation_pending', false);
                $payload['chatwootNameInbox'] = "WhatsApp {$instanceName}";
                $payload['chatwootMergeBrazilContacts'] = config('chatwoot.merge_brazil_contacts', false);
                $payload['chatwootImportContacts'] = config('chatwoot.import_contacts', false);
                $payload['chatwootImportMessages'] = config('chatwoot.import_messages', false);
                $payload['chatwootAutoCreate'] = config('chatwoot.auto_create', true);
                
                Log::info('Creating instance with Chatwoot integration', [
                    'instance' => $instanceName,
                    'account_id' => $payload['chatwootAccountId']
                ]);
            }

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/instance/create", $payload);

            if (!$response->successful()) {
                Log::error('Evolution API createInstance error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to create instance'
                ];
            }

            // CRITICAL: Enable readMessages immediately after instance creation
            // Evolution API creates instances with readMessages=false by default
            // This prevents WhatsApp messages from being processed
            // We must enable it via a separate /settings/set API call
            try {
                Log::info('Enabling readMessages for instance', ['instance' => $instanceName]);
                
                $settingsResponse = Http::withHeaders([
                    'apikey' => $this->apiKey,
                    'Content-Type' => 'application/json'
                ])->post("{$this->baseUrl}/settings/set/{$instanceName}", [
                    'rejectCall' => false,
                    'msgCall' => '',
                    'groupsIgnore' => false,
                    'alwaysOnline' => false,
                    'readMessages' => true,     // CRITICAL: Enable message reading
                    'readStatus' => true,       // Enable status reading
                    'syncFullHistory' => true   // CRITICAL: Sync WhatsApp contacts/messages
                ]);

                if (!$settingsResponse->successful()) {
                    Log::warning('Failed to enable readMessages, but instance created', [
                        'instance' => $instanceName,
                        'status' => $settingsResponse->status(),
                        'body' => $settingsResponse->body()
                    ]);
                } else {
                    Log::info('Successfully enabled readMessages', ['instance' => $instanceName]);
                }
            } catch (\Exception $settingsException) {
                // Log warning but don't fail instance creation
                Log::warning('Exception enabling readMessages, but instance created', [
                    'instance' => $instanceName,
                    'error' => $settingsException->getMessage()
                ]);
            }

            return [
                'success' => true,
                'data' => $response->json()
            ];

        } catch (\Exception $e) {
            Log::error('Evolution API createInstance exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Conectar instancia y obtener código QR
     * 
     * @param string $instanceName Nombre de la instancia
     * @return array
     */
    public function connect(string $instanceName): array
    {
        try {
            Log::info('Evolution API connect attempt', [
                'instance' => $instanceName,
                'url' => "{$this->baseUrl}/instance/connect/{$instanceName}"
            ]);

            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->timeout(30)->get("{$this->baseUrl}/instance/connect/{$instanceName}");

            Log::info('Evolution API connect response', [
                'instance' => $instanceName,
                'status' => $response->status(),
                'body_length' => strlen($response->body())
            ]);

            if (!$response->successful()) {
                $errorBody = $response->body();
                $errorJson = $response->json();
                
                Log::error('Evolution API connect error', [
                    'status' => $response->status(),
                    'body' => $errorBody,
                    'json' => $errorJson
                ]);

                // Si la instancia no existe, intentar crearla primero
                if ($response->status() === 404 || str_contains($errorBody, 'not found') || str_contains($errorBody, 'does not exist')) {
                    Log::info('Instance not found, creating first', ['instance' => $instanceName]);
                    
                    $createResult = $this->createInstance($instanceName);
                    
                    if ($createResult['success']) {
                        // Reintentar connect después de crear
                        sleep(1);
                        return $this->connect($instanceName);
                    }
                }

                return [
                    'success' => false,
                    'error' => $errorJson['message'] ?? $errorJson['error'] ?? 'Failed to connect',
                    'details' => $errorBody,
                    'status' => $response->status()
                ];
            }

            $data = $response->json();

            // Formatear QR code para asegurar que tenga el prefijo data:image correcto
            $qrCode = $data['base64'] ?? null;
            if ($qrCode && !str_starts_with($qrCode, 'data:image')) {
                $qrCode = 'data:image/png;base64,' . $qrCode;
            }

            // Invalidar caché para forzar actualización del estado
            $this->clearCache($instanceName);

            // AUTO-CONFIGURAR WEBHOOKS si no existen
            $this->ensureWebhooksConfigured($instanceName);

            return [
                'success' => true,
                'qr' => $qrCode,
                'pairingCode' => $data['pairingCode'] ?? null,
                'data' => $data
            ];


        } catch (\Exception $e) {
            Log::error('Evolution API connect exception', [
                'instance' => $instanceName,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Asegurar que los webhooks estén configurados
     */
    private function ensureWebhooksConfigured(string $instanceName): void
    {
        try {
            // Verificar si ya tiene webhooks
            $checkResponse = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->get("{$this->baseUrl}/webhook/find/{$instanceName}");

            // Si ya tiene webhooks configurados, no hacer nada
            if ($checkResponse->successful() && $checkResponse->json()) {
                Log::info("Webhooks already configured", ['instance' => $instanceName]);
                return;
            }

            // Configurar webhooks
            $webhookUrl = config('app.url') . '/api/evolution-whatsapp/webhook';
            $webhookConfig = [
                'webhook' => [
                    'enabled' => true,
                    'url' => $webhookUrl,
                    'webhook_by_events' => false,
                    'webhook_base64' => false,
                    'events' => [
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'CONNECTION_UPDATE',
                        'SEND_MESSAGE'
                    ]
                ]
            ];

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/webhook/set/{$instanceName}", $webhookConfig);

            if ($response->successful()) {
                Log::info("Webhooks configured successfully", [
                    'instance' => $instanceName,
                    'url' => $webhookUrl
                ]);
            } else {
                Log::warning("Failed to configure webhooks", [
                    'instance' => $instanceName,
                    'error' => $response->body()
                ]);
            }

        } catch (\Exception $e) {
            Log::error("Error configuring webhooks", [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Obtener estado de conexión de la instancia
     * 
     * @param string $instanceName Nombre de la instancia
     * @return array
     */
    public function getStatus(string $instanceName): array
    {
        $cacheKey = "whatsapp:status:{$instanceName}";
        
        // Intentar obtener del caché primero
        try {
            $cached = Redis::get($cacheKey);
            if ($cached !== null) {
                $cachedData = json_decode($cached, true);
                if ($cachedData) {
                    Log::info("WhatsApp status retrieved from cache", ['instance' => $instanceName]);
                    return $cachedData;
                }
            }
        } catch (\Exception $e) {
            Log::warning("Redis cache read failed, fetching from API", ['error' => $e->getMessage()]);
        }

        // Si no está en caché, consultar la API con timeout corto
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->timeout($this->timeout)
              ->connectTimeout($this->connectTimeout)
              ->get("{$this->baseUrl}/instance/connectionState/{$instanceName}");

            if (!$response->successful()) {
                $result = [
                    'success' => false,
                    'connected' => false,
                    'error' => $response->json()['message'] ?? 'Failed to get status'
                ];
                return $result;
            }

            $data = $response->json();
            $state = $data['instance']['state'] ?? $data['state'] ?? 'close';

            $result = [
                'success' => true,
                'connected' => $state === 'open',
                'state' => $state,
                'data' => $data
            ];

            // Guardar en caché
            try {
                Redis::setex($cacheKey, $this->cacheTtl, json_encode($result));
                Log::info("WhatsApp status cached", ['instance' => $instanceName, 'ttl' => $this->cacheTtl]);
            } catch (\Exception $e) {
                Log::warning("Failed to cache WhatsApp status", ['error' => $e->getMessage()]);
            }

            return $result;

        } catch (\Exception $e) {
            return [
                'success' => false,
                'connected' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Desconectar instancia (eliminar completamente para evitar sesiones fantasma)
     * 
     * @param string $instanceName Nombre de la instancia
     * @return array
     */
    public function disconnect(string $instanceName): array
    {
        try {
            // Eliminar completamente la instancia en lugar de solo logout
            // Esto evita problemas de "No se pueden vincular nuevos dispositivos"
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->delete("{$this->baseUrl}/instance/delete/{$instanceName}");

            // Invalidar caché
            $this->clearCache($instanceName);

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to disconnect'
                ];
            }

            return [
                'success' => true,
                'message' => 'Instance disconnected and deleted successfully'
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Eliminar instancia completamente
     * 
     * @param string $instanceName Nombre de la instancia
     * @return array
     */
    public function deleteInstance(string $instanceName): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->delete("{$this->baseUrl}/instance/delete/{$instanceName}");

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to delete instance'
                ];
            }

            return [
                'success' => true,
                'message' => 'Instance deleted successfully'
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Enviar mensaje de texto
     * 
     * @param string $instanceName Nombre de la instancia
     * @param string $number Número de teléfono (con código de país, ej: 5491234567890)
     * @param string $message Texto del mensaje
     * @return array
     */
    public function sendTextMessage(string $instanceName, string $number, string $message): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/message/sendText/{$instanceName}", [
                'number' => $number,
                'text' => $message
            ]);

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to send message'
                ];
            }

            return [
                'success' => true,
                'data' => $response->json()
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Listar todas las instancias
     * 
     * @return array
     */
    public function listInstances(): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->get("{$this->baseUrl}/instance/fetchInstances");

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to list instances'
                ];
            }

            return [
                'success' => true,
                'instances' => $response->json()
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Configurar integración con Chatwoot
     * 
     * @param string $instanceName Nombre de la instancia
     * @param string $accountId ID de la cuenta en Chatwoot
     * @param string $token Token de la API de Chatwoot
     * @param string $url URL de Chatwoot (ej: https://chatwoot.withmia.com)
     * @param bool $signMsg Firmar mensajes con nombre del agente
     * @param bool $reopenConversation Reabrir conversaciones cerradas
     * @param bool $conversationPending Crear conversaciones como pendientes
     * @return array
     */
    public function setChatwootIntegration(
        string $instanceName, 
        string $accountId, 
        string $token, 
        string $url,
        bool $signMsg = true,
        bool $reopenConversation = true,
        bool $conversationPending = false
    ): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/chatwoot/set/{$instanceName}", [
                'enabled' => true,
                'account_id' => $accountId,
                'token' => $token,
                'url' => $url,
                'sign_msg' => $signMsg,
                'reopen_conversation' => $reopenConversation,
                'conversation_pending' => $conversationPending,
                'name_inbox' => $instanceName,
                'merge_brazil_contacts' => false,
                'import_contacts' => true,
                'import_messages' => true,
                'days_limit_import_messages' => 60
            ]);

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to set Chatwoot integration'
                ];
            }

            return [
                'success' => true,
                'data' => $response->json()
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Limpiar caché de estado de WhatsApp
     * 
     * @param string $instanceName Nombre de la instancia
     * @return void
     */
    private function clearCache(string $instanceName): void
    {
        try {
            $cacheKey = "whatsapp:status:{$instanceName}";
            Redis::del($cacheKey);
            Log::info("WhatsApp cache cleared", ['instance' => $instanceName]);
        } catch (\Exception $e) {
            Log::warning("Failed to clear WhatsApp cache", ['error' => $e->getMessage()]);
        }
    }
}
