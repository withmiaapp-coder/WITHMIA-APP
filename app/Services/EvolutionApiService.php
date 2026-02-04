<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class EvolutionApiService
{
    private string $baseUrl;
    private ?string $apiKey;
    private int $cacheTtl = 5; // Tiempo de vida del caché en segundos (reducido para polling rápido)
    private int $timeout = 5; // Timeout en segundos para evitar bloqueos
    private int $connectTimeout = 3; // Timeout de conexión

    public function __construct()
    {
        $this->baseUrl = config('evolution.api_url');
        $this->apiKey = config('evolution.api_key');
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
            Log::debug('🆕 Creating Evolution instance', [
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
                    
                    Log::debug('Creating instance with Chatwoot integration (multi-tenant)', [
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

            Log::debug('📦 Create instance response', [
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

            Log::debug('✅ Instance created successfully', ['instance' => $instanceName]);

            // CRITICAL: Enable readMessages immediately after instance creation
            // Evolution API creates instances with readMessages=false by default
            // This prevents WhatsApp messages from being processed
            // We must enable it via a separate /settings/set API call
            try {
                Log::debug('Enabling readMessages for instance', ['instance' => $instanceName]);
                
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
                    Log::debug('Successfully applied settings to instance', [
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
            Log::debug('Evolution API connect attempt', [
                'instance' => $instanceName,
                'url' => "{$this->baseUrl}/instance/connect/{$instanceName}"
            ]);

            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->timeout(30)->get("{$this->baseUrl}/instance/connect/{$instanceName}");

            Log::debug('Evolution API connect response', [
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
     * 🎯 Configurar webhook de Evolution API para una instancia
     * 
     * @param string $instanceName Nombre de la instancia
     * @param string $webhookUrl URL del webhook (puede ser n8n, mia-app, etc.)
     * @param array $events Eventos a recibir
     * @return array
     */
    public function setWebhook(string $instanceName, string $webhookUrl, array $events = null): array
    {
        try {
            $defaultEvents = [
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'CONNECTION_UPDATE',
                'SEND_MESSAGE'
            ];

            $webhookConfig = [
                'webhook' => [
                    'enabled' => true,
                    'url' => $webhookUrl,
                    'webhook_by_events' => false,
                    'webhook_base64' => false,
                    'events' => $events ?? $defaultEvents
                ]
            ];

            Log::debug('🔗 Configurando webhook en Evolution API', [
                'instance' => $instanceName,
                'url' => $webhookUrl
            ]);

            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/webhook/set/{$instanceName}", $webhookConfig);

            if ($response->successful()) {
                Log::debug('✅ Webhook configurado exitosamente', [
                    'instance' => $instanceName,
                    'url' => $webhookUrl
                ]);
                return [
                    'success' => true,
                    'data' => $response->json()
                ];
            } else {
                Log::warning('⚠️ Error configurando webhook', [
                    'instance' => $instanceName,
                    'error' => $response->body()
                ]);
                return [
                    'success' => false,
                    'error' => $response->body()
                ];
            }

        } catch (\Exception $e) {
            Log::error('❌ Excepción configurando webhook', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Asegurar que los webhooks estén configurados (método legacy)
     * NOTA: Si ya hay un webhook configurado (hacia n8n o app), NO lo sobrescribe
     */
    private function ensureWebhooksConfigured(string $instanceName): void
    {
        try {
            // Verificar si ya tiene webhooks
            $checkResponse = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->get("{$this->baseUrl}/webhook/find/{$instanceName}");

            // Si ya tiene webhooks configurados, no hacer nada (respetar config de n8n)
            if ($checkResponse->successful()) {
                $webhookData = $checkResponse->json();
                if ($webhookData && !empty($webhookData['url'])) {
                    Log::debug("Webhook ya configurado, respetando configuración existente", [
                        'instance' => $instanceName,
                        'current_url' => $webhookData['url']
                    ]);
                    return;
                }
            }

            // Solo configurar webhook hacia app si NO hay ninguno configurado
            // (El workflow de n8n se configura en createN8nWorkflowForInstance)
            Log::debug("No hay webhook configurado, configurando hacia app Laravel", [
                'instance' => $instanceName
            ]);
            $webhookUrl = config('app.url') . '/api/evolution-whatsapp/webhook';
            $this->setWebhook($instanceName, $webhookUrl);

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
        // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API con cache
        try {
            $instance = \Illuminate\Support\Facades\DB::connection('evolution')
                ->table('Instance')
                ->where('name', $instanceName)
                ->first(['connectionStatus', 'ownerJid', 'profileName', 'number']);

            if ($instance) {
                $state = strtolower($instance->connectionStatus ?? 'close');
                
                return [
                    'success' => true,
                    'connected' => $state === 'open',
                    'state' => $state,
                    'data' => [
                        'instance' => [
                            'state' => $state,
                            'owner' => $instance->ownerJid,
                            'profileName' => $instance->profileName,
                            'number' => $instance->number
                        ]
                    ]
                ];
            }

            return [
                'success' => false,
                'connected' => false,
                'error' => 'Instance not found'
            ];

        } catch (\Exception $e) {
            Log::warning("BD Evolution no disponible para getStatus, usando HTTP API", ['error' => $e->getMessage()]);
            
            // Fallback a HTTP API con cache
            $cacheKey = "whatsapp:status:{$instanceName}";
            
            try {
                $cached = Redis::get($cacheKey);
                if ($cached !== null) {
                    $cachedData = json_decode($cached, true);
                    if ($cachedData) {
                        return $cachedData;
                    }
                }
            } catch (\Exception $cacheE) {
                // Ignorar error de cache
            }

            try {
                $response = Http::withHeaders([
                    'apikey' => $this->apiKey
                ])->timeout($this->timeout)
                  ->connectTimeout($this->connectTimeout)
                  ->get("{$this->baseUrl}/instance/connectionState/{$instanceName}");

                if (!$response->successful()) {
                    return [
                        'success' => false,
                        'connected' => false,
                        'error' => $response->json()['message'] ?? 'Failed to get status'
                    ];
                }

                $data = $response->json();
                $state = $data['instance']['state'] ?? $data['state'] ?? 'close';

                $result = [
                    'success' => true,
                    'connected' => $state === 'open',
                    'state' => $state,
                    'data' => $data
                ];

                try {
                    Redis::setex($cacheKey, $this->cacheTtl, json_encode($result));
                } catch (\Exception $cacheE) {
                    // Ignorar error de cache
                }

                return $result;

            } catch (\Exception $httpE) {
                return [
                    'success' => false,
                    'connected' => false,
                    'error' => $httpE->getMessage()
                ];
            }
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
            
            Log::debug('📤 Enviando media vía Evolution API', [
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

            Log::debug('✅ Media enviada exitosamente', [
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
            
            Log::debug('🎤 Enviando audio WhatsApp vía Evolution API', [
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

            Log::debug('✅ Audio WhatsApp enviado exitosamente', [
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
        // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API
        try {
            $instances = \Illuminate\Support\Facades\DB::connection('evolution')
                ->table('Instance')
                ->select([
                    'id',
                    'name',
                    'connectionStatus',
                    'ownerJid',
                    'profilePicUrl',
                    'profileName',
                    'number',
                    'integration',
                    'createdAt',
                    'updatedAt'
                ])
                ->get()
                ->map(function ($instance) {
                    return [
                        'instance' => [
                            'instanceName' => $instance->name,
                            'instanceId' => $instance->id,
                            'status' => $instance->connectionStatus ?? 'close',
                            'owner' => $instance->ownerJid,
                            'profilePicUrl' => $instance->profilePicUrl,
                            'profileName' => $instance->profileName,
                            'number' => $instance->number,
                            'integration' => $instance->integration,
                        ]
                    ];
                })
                ->toArray();

            Log::debug("✅ Evolution instances from BD directa", ['count' => count($instances)]);

            return [
                'success' => true,
                'instances' => $instances
            ];

        } catch (\Exception $e) {
            Log::warning("BD Evolution no disponible, usando HTTP API", ['error' => $e->getMessage()]);
            
            // Fallback a HTTP API con cache corto (30 segundos)
            $cacheKey = "evolution:instances_list";
            
            return cache()->remember($cacheKey, 30, function () {
                try {
                    $response = Http::withHeaders([
                        'apikey' => $this->apiKey
                    ])->timeout(10)->get("{$this->baseUrl}/instance/fetchInstances");

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

                } catch (\Exception $httpE) {
                    return [
                        'success' => false,
                        'error' => $httpE->getMessage()
                    ];
                }
            });
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
            Log::debug("WhatsApp cache cleared", ['instance' => $instanceName]);
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
            $account = $accountId ?? config('chatwoot.account_id', '1');

            // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API
            // El nombre generado por Evolution API es: "WhatsApp {instanceName}"
            $expectedInboxName = "WhatsApp {$instanceName}";
            
            $inbox = \Illuminate\Support\Facades\DB::connection('chatwoot')
                ->table('inboxes')
                ->where('account_id', $account)
                ->where('name', $expectedInboxName)
                ->first(['id', 'name']);
            
            if ($inbox) {
                Log::debug('✅ Found matching Chatwoot inbox (BD directa)', [
                    'instance' => $instanceName,
                    'inbox_id' => $inbox->id,
                    'inbox_name' => $inbox->name
                ]);
                
                return [
                    'success' => true,
                    'inbox_id' => $inbox->id,
                    'inbox_name' => $inbox->name,
                    'error' => null
                ];
            }

            // No se encontró el inbox
            Log::warning('Chatwoot inbox not found for instance (BD directa)', [
                'instance' => $instanceName,
                'expected_name' => $expectedInboxName,
                'account_id' => $account
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
        
        // 🔧 FIX: Usar PLATFORM TOKEN para buscar inboxes (necesita permisos de admin)
        // El chatwoot_agent_token del usuario no tiene acceso a la lista de inboxes
        $chatwootUrl = config('chatwoot.url');
        $chatwootToken = config('chatwoot.platform_token') ?? config('chatwoot.token');
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
            
            Log::debug('✅ Updated user chatwoot_inbox_id', [
                'user_id' => $user->id,
                'inbox_id' => $inboxId
            ]);

            // Actualizar la empresa también (si existe)
            if ($company) {
                $company->chatwoot_inbox_id = $inboxId;
                $company->save();
                
                Log::debug('✅ Updated company chatwoot_inbox_id', [
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

    /**
     * Obtener la configuración actual de Chatwoot para una instancia
     * 
     * @param string $instanceName Nombre de la instancia
     * @return array
     */
    public function getChatwootConfig(string $instanceName): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->get("{$this->baseUrl}/chatwoot/find/{$instanceName}");

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to get Chatwoot config',
                    'status' => $response->status()
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
     * Reconfigurar la integración de Chatwoot para una instancia
     * Útil para forzar la sincronización de mensajes
     * 
     * @param string $instanceName Nombre de la instancia
     * @return array
     */
    public function reconfigureChatwoot(string $instanceName): array
    {
        try {
            // Buscar la instancia de WhatsApp
            $instance = \App\Models\WhatsAppInstance::where('instance_name', $instanceName)->first();
            
            if (!$instance) {
                return [
                    'success' => false,
                    'error' => 'Instance not found'
                ];
            }

            $company = $instance->company;
            if (!$company) {
                return [
                    'success' => false,
                    'error' => 'Company not found for instance'
                ];
            }

            // Obtener configuración de Chatwoot
            // CRÍTICO: Usar el API Access Token del usuario de la empresa, NO el channel token
            $chatwootUrl = config('chatwoot.url');
            $chatwootToken = $company->chatwoot_api_key ?? config('chatwoot.token');
            $accountId = $company->chatwoot_account_id ?: config('chatwoot.account_id', '1');

            // Reconfigurar la integración
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/chatwoot/set/{$instanceName}", [
                'enabled' => true,
                'account_id' => (string) $accountId,
                'token' => $chatwootToken,
                'url' => $chatwootUrl,
                'sign_msg' => false, // false = no agregar firma, los mensajes se ven más limpios
                'reopen_conversation' => true,
                'conversation_pending' => false,
                'name_inbox' => "WhatsApp {$instanceName}",
                'merge_brazil_contacts' => true,
                'import_contacts' => false,
                'import_messages' => false,
                'days_limit_import_messages' => 7,
                // CRÍTICO: Este parámetro fuerza la sincronización de mensajes de la API
                'auto_create' => true
            ]);

            if (!$response->successful()) {
                Log::error('Failed to reconfigure Chatwoot', [
                    'instance' => $instanceName,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to reconfigure Chatwoot',
                    'status' => $response->status()
                ];
            }

            Log::debug('✅ Chatwoot reconfigured for instance', [
                'instance' => $instanceName,
                'account_id' => $accountId,
                'url' => $chatwootUrl
            ]);

            return [
                'success' => true,
                'data' => $response->json(),
                'message' => 'Chatwoot integration reconfigured successfully'
            ];

        } catch (\Exception $e) {
            Log::error('Exception reconfiguring Chatwoot', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get instance settings
     * 
     * @param string $instanceName Instance name
     * @return array
     */
    public function getInstanceSettings(string $instanceName): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->timeout(10)->get("{$this->baseUrl}/settings/find/{$instanceName}");

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => 'Instance not found or error getting settings',
                    'status' => $response->status()
                ];
            }

            return [
                'success' => true,
                'data' => $response->json()
            ];

        } catch (\Exception $e) {
            Log::error('Exception getting instance settings', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Update instance settings
     * 
     * @param string $instanceName Instance name
     * @param array $settings Settings to update
     * @return array
     */
    public function updateInstanceSettings(string $instanceName, array $settings): array
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json'
            ])->timeout(10)->post("{$this->baseUrl}/settings/set/{$instanceName}", $settings);

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => 'Error updating settings',
                    'status' => $response->status()
                ];
            }

            return [
                'success' => true,
                'data' => $response->json()
            ];

        } catch (\Exception $e) {
            Log::error('Exception updating instance settings', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
