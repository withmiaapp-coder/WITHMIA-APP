<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class EvolutionApiService
{
    private string $baseUrl;
    private string $apiKey;
    private int $cacheTtl = 5; // Tiempo de vida del caché en segundos (reducido para polling rápido)
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
     * @param bool|array $enableChatwoot true/false o array con config específica de la empresa
     * @return array
     */
    public function createInstance(string $instanceName, ?string $webhookUrl = null, bool|array $enableChatwoot = true): array
    {
        try {
            Log::info('🆕 Creating Evolution instance', [
                'instance' => $instanceName,
                'url' => "{$this->baseUrl}/instance/create"
            ]);

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
            // Ahora soporta configuración específica por empresa (multi-tenant)
            if ($enableChatwoot) {
                // Si es array, usar config específica de la empresa
                if (is_array($enableChatwoot)) {
                    $chatwootToken = $enableChatwoot['token'] ?? null;
                    $chatwootUrl = $enableChatwoot['url'] ?? config('chatwoot.url');
                    $chatwootAccountId = $enableChatwoot['account_id'] ?? null;
                    $chatwootInboxName = $enableChatwoot['inbox_name'] ?? "WhatsApp {$instanceName}";
                    $chatwootAutoCreate = $enableChatwoot['auto_create'] ?? config('chatwoot.auto_create', true);
                } else {
                    // Usar config global (fallback)
                    $chatwootToken = config('chatwoot.token');
                    $chatwootUrl = config('chatwoot.url');
                    $chatwootAccountId = config('chatwoot.account_id', '1');
                    $chatwootInboxName = "WhatsApp {$instanceName}";
                    $chatwootAutoCreate = config('chatwoot.auto_create', true);
                }
                
                // Solo incluir Chatwoot si tenemos token y account_id configurados
                if ($chatwootToken && $chatwootUrl && $chatwootAccountId) {
                    $payload['chatwootAccountId'] = (string) $chatwootAccountId;
                    $payload['chatwootToken'] = $chatwootToken;
                    $payload['chatwootUrl'] = $chatwootUrl;
                    $payload['chatwootSignMsg'] = config('chatwoot.sign_msg', false);
                    $payload['chatwootReopenConversation'] = config('chatwoot.reopen_conversation', true);
                    $payload['chatwootConversationPending'] = config('chatwoot.conversation_pending', false);
                    $payload['chatwootNameInbox'] = $chatwootInboxName;
                    $payload['chatwootMergeBrazilContacts'] = config('chatwoot.merge_brazil_contacts', true);
                    $payload['chatwootImportContacts'] = config('chatwoot.import_contacts', false);
                    $payload['chatwootImportMessages'] = config('chatwoot.import_messages', false);
                    $payload['chatwootAutoCreate'] = $chatwootAutoCreate;
                    
                    Log::info('Creating instance with Chatwoot integration (multi-tenant)', [
                        'instance' => $instanceName,
                        'account_id' => $payload['chatwootAccountId'],
                        'inbox_name' => $chatwootInboxName,
                        'auto_create' => $chatwootAutoCreate,
                        'url' => $chatwootUrl
                    ]);
                } else {
                    Log::warning('Chatwoot integration requested but config incomplete', [
                        'instance' => $instanceName,
                        'has_token' => !empty($chatwootToken),
                        'has_url' => !empty($chatwootUrl),
                        'has_account_id' => !empty($chatwootAccountId)
                    ]);
                }
            }

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->timeout(30)->post("{$this->baseUrl}/instance/create", $payload);

            Log::info('📦 Create instance response', [
                'instance' => $instanceName,
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 500)
            ]);

            if (!$response->successful()) {
                Log::error('Evolution API createInstance error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? $response->json()['error'] ?? 'Failed to create instance',
                    'details' => $response->body(),
                    'status' => $response->status()
                ];
            }

            Log::info('✅ Instance created successfully', ['instance' => $instanceName]);

            // CRITICAL: Enable readMessages immediately after instance creation
            // Evolution API creates instances with readMessages=false by default
            // This prevents WhatsApp messages from being processed
            // We must enable it via a separate /settings/set API call
            try {
                Log::info('Enabling readMessages for instance', ['instance' => $instanceName]);
                
                // Check for cached pending settings from user configuration
                $cachedSettings = \Cache::get("whatsapp_pending_settings_{$instanceName}");
                
                $settings = [
                    'rejectCall' => $cachedSettings['rejectCall'] ?? false,
                    'msgCall' => $cachedSettings['msgCall'] ?? '',
                    'groupsIgnore' => $cachedSettings['groupsIgnore'] ?? false,
                    'alwaysOnline' => $cachedSettings['alwaysOnline'] ?? false,
                    'readMessages' => true,     // CRITICAL: Always enable message reading
                    'readStatus' => $cachedSettings['readStatus'] ?? true,
                    'syncFullHistory' => $cachedSettings['syncFullHistory'] ?? false,  // Default: faster connection
                    'daysLimitImportMessages' => $cachedSettings['daysLimitImportMessages'] ?? 7
                ];
                
                $settingsResponse = Http::withHeaders([
                    'apikey' => $this->apiKey,
                    'Content-Type' => 'application/json'
                ])->post("{$this->baseUrl}/settings/set/{$instanceName}", $settings);

                if (!$settingsResponse->successful()) {
                    Log::warning('Failed to enable readMessages, but instance created', [
                        'instance' => $instanceName,
                        'status' => $settingsResponse->status(),
                        'body' => $settingsResponse->body()
                    ]);
                } else {
                    Log::info('Successfully applied settings to instance', [
                        'instance' => $instanceName,
                        'settings' => $settings,
                        'fromCache' => $cachedSettings !== null
                    ]);
                    
                    // Clear the cached settings after applying
                    if ($cachedSettings) {
                        \Cache::forget("whatsapp_pending_settings_{$instanceName}");
                    }
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

            // Si la instancia no existe (404) o fue eliminada exitosamente, es éxito
            if ($response->status() === 404 || $response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Instance disconnected and deleted successfully'
                ];
            }

            return [
                'success' => false,
                'error' => $response->json()['message'] ?? 'Failed to disconnect'
            ];

        } catch (\Exception $e) {
            // Si hay error pero la instancia probablemente ya no existe, retornamos éxito
            $this->clearCache($instanceName);
            return [
                'success' => true,
                'message' => 'Instance disconnected (may have been already deleted)'
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
     * Enviar mensaje con media (imagen, video, audio, documento)
     * 
     * @param string $instanceName Nombre de la instancia
     * @param string $number Número de teléfono (con código de país, ej: 5491234567890)
     * @param string $media URL pública o base64 del archivo de media
     * @param string $mediaType Tipo de media: image, video, audio, document
     * @param string $mimeType MIME type del archivo (ej: image/jpeg, video/mp4)
     * @param string|null $caption Texto opcional para la media
     * @param string|null $fileName Nombre del archivo (obligatorio para documentos en base64)
     * @return array
     */
    public function sendMediaMessage(
        string $instanceName, 
        string $number, 
        string $media, 
        string $mediaType, 
        string $mimeType, 
        ?string $caption = null,
        ?string $fileName = null
    ): array {
        try {
            $isBase64 = !filter_var($media, FILTER_VALIDATE_URL) && strlen($media) > 200;
            
            Log::info('📤 Enviando media vía Evolution API', [
                'instance' => $instanceName,
                'number' => $number,
                'mediaType' => $mediaType,
                'mimeType' => $mimeType,
                'isBase64' => $isBase64,
                'media_length' => strlen($media),
                'caption' => $caption
            ]);

            $payload = [
                'number' => $number,
                'mediatype' => $mediaType,
                'mimetype' => $mimeType,
                'media' => $media
            ];

            // Agregar caption si se proporciona
            if ($caption) {
                $payload['caption'] = $caption;
            }

            // Agregar nombre de archivo para documentos
            if ($fileName && $mediaType === 'document') {
                $payload['fileName'] = $fileName;
            }

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->timeout(60)->post("{$this->baseUrl}/message/sendMedia/{$instanceName}", $payload);

            if (!$response->successful()) {
                Log::error('❌ Error enviando media vía Evolution API', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to send media'
                ];
            }

            Log::info('✅ Media enviada exitosamente', [
                'instance' => $instanceName,
                'number' => $number,
                'mediaType' => $mediaType
            ]);

            return [
                'success' => true,
                'data' => $response->json()
            ];

        } catch (\Exception $e) {
            Log::error('💥 Exception en sendMediaMessage', [
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Enviar audio de WhatsApp (PTT - Push To Talk)
     * Usa endpoint especial para audio nativo de WhatsApp
     * 
     * @param string $instanceName Nombre de la instancia
     * @param string $number Número de teléfono
     * @param string $audio URL o base64 del archivo de audio
     * @return array
     */
    public function sendWhatsAppAudio(string $instanceName, string $number, string $audio): array
    {
        try {
            $isBase64 = !filter_var($audio, FILTER_VALIDATE_URL) && strlen($audio) > 200;
            
            Log::info('🎤 Enviando audio WhatsApp vía Evolution API', [
                'instance' => $instanceName,
                'number' => $number,
                'isBase64' => $isBase64,
                'audio_length' => strlen($audio)
            ]);

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->timeout(60)->post("{$this->baseUrl}/message/sendWhatsAppAudio/{$instanceName}", [
                'number' => $number,
                'audio' => $audio
            ]);

            if (!$response->successful()) {
                // Fallback: si sendWhatsAppAudio falla, intentar con sendMedia
                Log::warning('⚠️ sendWhatsAppAudio falló, intentando con sendMedia', [
                    'status' => $response->status()
                ]);
                
                return $this->sendMediaMessage(
                    $instanceName,
                    $number,
                    $audio,
                    'audio',
                    'audio/ogg',
                    null
                );
            }

            Log::info('✅ Audio WhatsApp enviado exitosamente', [
                'instance' => $instanceName,
                'number' => $number
            ]);

            return [
                'success' => true,
                'data' => $response->json()
            ];

        } catch (\Exception $e) {
            Log::error('💥 Exception en sendWhatsAppAudio', [
                'error' => $e->getMessage()
            ]);
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

    /**
     * 🔍 Buscar el inbox_id de Chatwoot basado en el nombre de la instancia
     * 
     * Evolution API crea automáticamente un inbox en Chatwoot con el nombre "WhatsApp {instanceName}"
     * Esta función busca ese inbox y retorna su ID para sincronizarlo con la DB local.
     * 
     * @param string $instanceName Nombre de la instancia de WhatsApp
     * @param string|null $chatwootUrl URL de Chatwoot (usa config si no se proporciona)
     * @param string|null $chatwootToken Token de admin de Chatwoot
     * @param string|null $accountId ID de la cuenta en Chatwoot
     * @return array ['success' => bool, 'inbox_id' => int|null, 'inbox_name' => string|null, 'error' => string|null]
     */
    public function findChatwootInboxByInstance(
        string $instanceName,
        ?string $chatwootUrl = null,
        ?string $chatwootToken = null,
        ?string $accountId = null
    ): array {
        try {
            $url = $chatwootUrl ?? config('chatwoot.url');
            $token = $chatwootToken ?? config('chatwoot.token');
            $account = $accountId ?? config('chatwoot.account_id', '1');

            if (!$url || !$token) {
                return [
                    'success' => false,
                    'inbox_id' => null,
                    'error' => 'Chatwoot URL or token not configured'
                ];
            }

            // Consultar todos los inboxes de la cuenta
            $response = Http::withHeaders([
                'api_access_token' => $token,
                'Content-Type' => 'application/json'
            ])->timeout(10)->get("{$url}/api/v1/accounts/{$account}/inboxes");

            if (!$response->successful()) {
                Log::error('Failed to fetch Chatwoot inboxes', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return [
                    'success' => false,
                    'inbox_id' => null,
                    'error' => 'Failed to fetch inboxes from Chatwoot'
                ];
            }

            $inboxes = $response->json()['payload'] ?? [];
            
            // Buscar inbox que coincida con el nombre de la instancia
            // El nombre generado por Evolution API es: "WhatsApp {instanceName}"
            $expectedInboxName = "WhatsApp {$instanceName}";
            
            foreach ($inboxes as $inbox) {
                if ($inbox['name'] === $expectedInboxName) {
                    Log::info('✅ Found matching Chatwoot inbox', [
                        'instance' => $instanceName,
                        'inbox_id' => $inbox['id'],
                        'inbox_name' => $inbox['name']
                    ]);
                    
                    return [
                        'success' => true,
                        'inbox_id' => $inbox['id'],
                        'inbox_name' => $inbox['name'],
                        'error' => null
                    ];
                }
            }

            // No se encontró el inbox
            Log::warning('Chatwoot inbox not found for instance', [
                'instance' => $instanceName,
                'expected_name' => $expectedInboxName,
                'available_inboxes' => array_map(fn($i) => $i['name'], $inboxes)
            ]);

            return [
                'success' => false,
                'inbox_id' => null,
                'error' => "Inbox '{$expectedInboxName}' not found in Chatwoot"
            ];

        } catch (\Exception $e) {
            Log::error('Exception finding Chatwoot inbox', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'inbox_id' => null,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * 🔄 Sincronizar el inbox_id de Chatwoot con el usuario/empresa
     * 
     * Busca el inbox creado por Evolution API y actualiza el chatwoot_inbox_id
     * tanto del usuario como de la empresa.
     * 
     * @param string $instanceName Nombre de la instancia
     * @param \App\Models\User $user Usuario actual
     * @return array ['success' => bool, 'inbox_id' => int|null, 'error' => string|null]
     */
    public function syncChatwootInboxId(string $instanceName, $user): array
    {
        if (!$user) {
            return [
                'success' => false,
                'inbox_id' => null,
                'error' => 'No user provided'
            ];
        }

        $company = $user->company;
        
        // Usar credenciales de la empresa si están disponibles
        $chatwootUrl = config('chatwoot.url');
        $chatwootToken = $company?->chatwoot_api_key ?? config('chatwoot.token');
        $accountId = $company?->chatwoot_account_id ?? config('chatwoot.account_id', '1');

        // Buscar el inbox
        $result = $this->findChatwootInboxByInstance(
            $instanceName,
            $chatwootUrl,
            $chatwootToken,
            $accountId
        );

        if (!$result['success'] || !$result['inbox_id']) {
            return $result;
        }

        $inboxId = $result['inbox_id'];

        try {
            // Actualizar el usuario
            $user->chatwoot_inbox_id = $inboxId;
            $user->save();
            
            Log::info('✅ Updated user chatwoot_inbox_id', [
                'user_id' => $user->id,
                'inbox_id' => $inboxId
            ]);

            // Actualizar la empresa también (si existe)
            if ($company) {
                $company->chatwoot_inbox_id = $inboxId;
                $company->save();
                
                Log::info('✅ Updated company chatwoot_inbox_id', [
                    'company_id' => $company->id,
                    'inbox_id' => $inboxId
                ]);
            }

            return [
                'success' => true,
                'inbox_id' => $inboxId,
                'error' => null
            ];

        } catch (\Exception $e) {
            Log::error('Failed to update inbox_id in database', [
                'user_id' => $user->id,
                'inbox_id' => $inboxId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'inbox_id' => $inboxId,
                'error' => 'Failed to update database: ' . $e->getMessage()
            ];
        }
    }
}
