<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatwootService
{
    private string $baseUrl;
    private ?string $platformToken;
    private ?string $superAdminToken;
    private int $accountId;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('chatwoot.url', 'https://chatwoot-admin.withmia.com'), '/');
        $this->platformToken = config('chatwoot.platform_token') ?? '';
        $this->superAdminToken = config('chatwoot.super_admin_token') ?? $this->platformToken;
        $this->accountId = (int) config('chatwoot.account_id', 1);
    }

    public function createAccount(string $name): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->platformToken,
                'Content-Type' => 'application/json'
            ])->post("$this->baseUrl/platform/api/v1/accounts", [
                'name' => $name
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Failed to create Chatwoot account: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('Chatwoot account creation failed', [
                'error' => $e->getMessage(),
                'name' => $name
            ]);
            throw $e;
        }
    }

    public function createUser(int $accountId, string $name, string $email, string $password): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->platformToken,
                'Content-Type' => 'application/json'
            ])->post("$this->baseUrl/platform/api/v1/accounts/$accountId/users", [
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'role' => 'administrator'
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Failed to create Chatwoot user: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('Chatwoot user creation failed', [
                'error' => $e->getMessage(),
                'account_id' => $accountId,
                'email' => $email
            ]);
            throw $e;
        }
    }

    // ============================================================
    // WEBHOOK MANAGEMENT (usando Super Admin token)
    // ============================================================

    /**
     * Configura el webhook de un inbox para apuntar al workflow de n8n
     * 
     * @param int $inboxId ID del inbox en Chatwoot
     * @param string $n8nWebhookUrl URL del webhook de n8n
     * @return array
     */
    public function configureInboxWebhook(int $inboxId, string $n8nWebhookUrl): array
    {
        try {
            Log::debug('ChatwootService: Configurando webhook para inbox', [
                'inbox_id' => $inboxId,
                'webhook_url' => $n8nWebhookUrl,
            ]);

            $result = $this->createWebhookSubscription($n8nWebhookUrl, $inboxId);
            
            return $result;
        } catch (\Exception $e) {
            Log::error('ChatwootService: Error configurando webhook', [
                'inbox_id' => $inboxId,
                'error' => $e->getMessage(),
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Crea una suscripción de webhook en Chatwoot
     */
    private function createWebhookSubscription(string $webhookUrl, ?int $inboxId = null): array
    {
        $endpoint = "{$this->baseUrl}/api/v1/accounts/{$this->accountId}/webhooks";
        
        $payload = [
            'url' => $webhookUrl,
            'subscriptions' => [
                'conversation_created',
                'conversation_status_changed', 
                'conversation_updated',
                'message_created',
                'message_updated',
                'webwidget_triggered',
            ],
        ];

        if ($inboxId) {
            $payload['inbox_ids'] = [$inboxId];
        }

        Log::debug('ChatwootService: Creando webhook subscription', [
            'endpoint' => $endpoint,
            'payload' => $payload,
        ]);

        $response = Http::withHeaders([
            'api_access_token' => $this->superAdminToken,
            'Content-Type' => 'application/json',
        ])->post($endpoint, $payload);

        if ($response->successful()) {
            Log::debug('ChatwootService: Webhook creado exitosamente', [
                'response' => $response->json(),
            ]);
            
            return [
                'success' => true,
                'webhook' => $response->json(),
            ];
        }

        Log::error('ChatwootService: Error creando webhook', [
            'status' => $response->status(),
            'response' => $response->body(),
        ]);

        return [
            'success' => false,
            'error' => $response->body(),
            'status' => $response->status(),
        ];
    }

    /**
     * Lista todos los webhooks de la cuenta
     */
    public function listWebhooks(): array
    {
        $endpoint = "{$this->baseUrl}/api/v1/accounts/{$this->accountId}/webhooks";

        $response = Http::withHeaders([
            'api_access_token' => $this->superAdminToken,
        ])->get($endpoint);

        if ($response->successful()) {
            return [
                'success' => true,
                'webhooks' => $response->json('payload') ?? $response->json(),
            ];
        }

        return [
            'success' => false,
            'error' => $response->body(),
        ];
    }

    /**
     * Elimina un webhook por ID
     */
    public function deleteWebhook(int $webhookId): array
    {
        $endpoint = "{$this->baseUrl}/api/v1/accounts/{$this->accountId}/webhooks/{$webhookId}";

        $response = Http::withHeaders([
            'api_access_token' => $this->superAdminToken,
        ])->delete($endpoint);

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
        ];
    }

    /**
     * Obtiene información de un inbox
     */
    public function getInbox(int $inboxId): array
    {
        try {
            // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API
            $inbox = \Illuminate\Support\Facades\DB::connection('chatwoot')
                ->table('inboxes')
                ->where('id', $inboxId)
                ->where('account_id', $this->accountId)
                ->first();

            if ($inbox) {
                return [
                    'success' => true,
                    'inbox' => (array) $inbox,
                ];
            }

            return [
                'success' => false,
                'error' => 'Inbox not found',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Lista todos los inboxes de la cuenta
     */
    public function listInboxes(): array
    {
        try {
            // 🚀 OPTIMIZACIÓN: BD DIRECTA en lugar de HTTP API
            $inboxes = \Illuminate\Support\Facades\DB::connection('chatwoot')
                ->table('inboxes')
                ->where('account_id', $this->accountId)
                ->get()
                ->map(fn($i) => (array) $i)
                ->toArray();

            return [
                'success' => true,
                'inboxes' => $inboxes,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Busca un inbox por nombre
     */
    public function findInboxByName(string $name): ?array
    {
        try {
            // 🚀 OPTIMIZACIÓN: BD DIRECTA con ILIKE para búsqueda case-insensitive
            $inbox = \Illuminate\Support\Facades\DB::connection('chatwoot')
                ->table('inboxes')
                ->where('account_id', $this->accountId)
                ->whereRaw('name ILIKE ?', ["%{$name}%"])
                ->first();

            return $inbox ? (array) $inbox : null;
        } catch (\Exception $e) {
            \Illuminate\Support\FacadesLog::error('findInboxByName error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Configura el webhook para una empresa específica
     * 
     * @param string $companySlug Slug de la empresa
     * @param string|null $inboxName Nombre del inbox (opcional)
     * @return array
     */
    public function setupCompanyWebhook(string $companySlug, ?string $inboxName = null): array
    {
        try {
            // 1. Buscar el inbox de la empresa
            $inbox = $this->findInboxByName($inboxName ?? $companySlug);
            
            if (!$inbox) {
                Log::warning('ChatwootService: No se encontró inbox para empresa', [
                    'company_slug' => $companySlug,
                    'inbox_name' => $inboxName,
                ]);
                
                return [
                    'success' => false,
                    'error' => 'Inbox not found',
                ];
            }

            // 2. Construir URL del webhook de n8n
            $n8nWebhookUrl = config('services.n8n.url') . '/webhook/withmia-' . $companySlug;

            // 3. Configurar el webhook
            $result = $this->configureInboxWebhook($inbox['id'], $n8nWebhookUrl);
            
            if ($result['success']) {
                Log::debug('ChatwootService: Webhook configurado para empresa', [
                    'company_slug' => $companySlug,
                    'inbox_id' => $inbox['id'],
                    'webhook_url' => $n8nWebhookUrl,
                ]);
            }

            return $result;

        } catch (\Exception $e) {
            Log::error('ChatwootService: Error configurando webhook de empresa', [
                'company_slug' => $companySlug,
                'error' => $e->getMessage(),
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Actualiza un webhook existente
     */
    public function updateWebhook(int $webhookId, string $webhookUrl, array $subscriptions = []): array
    {
        $endpoint = "{$this->baseUrl}/api/v1/accounts/{$this->accountId}/webhooks/{$webhookId}";
        
        $payload = ['url' => $webhookUrl];

        if (!empty($subscriptions)) {
            $payload['subscriptions'] = $subscriptions;
        }

        $response = Http::withHeaders([
            'api_access_token' => $this->superAdminToken,
            'Content-Type' => 'application/json',
        ])->patch($endpoint, $payload);

        return [
            'success' => $response->successful(),
            'webhook' => $response->json(),
            'status' => $response->status(),
        ];
    }

    /**
     * Encuentra webhooks que apuntan a una URL específica
     */
    public function findWebhookByUrl(string $urlPattern): ?array
    {
        $result = $this->listWebhooks();
        
        if (!$result['success']) {
            return null;
        }

        foreach ($result['webhooks'] as $webhook) {
            if (stripos($webhook['url'] ?? '', $urlPattern) !== false) {
                return $webhook;
            }
        }

        return null;
    }

    /**
     * Get conversations for an account (with custom API key)
     */
    public function getConversations(int $accountId, string $apiKey): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey
            ])->get("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations");

            return [
                'success' => $response->successful(),
                'data' => $response->json()['data'] ?? [],
                'meta' => $response->json()['meta'] ?? [],
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::getConversations failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => []];
        }
    }

    /**
     * Get contacts for an account (with custom API key)
     */
    public function getContacts(int $accountId, string $apiKey): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey
            ])->get("{$this->baseUrl}/api/v1/accounts/{$accountId}/contacts");

            return [
                'success' => $response->successful(),
                'data' => $response->json()['payload'] ?? [],
                'meta' => $response->json()['meta'] ?? [],
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::getContacts failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => []];
        }
    }

    /**
     * Get agents for an account (with custom API key)
     */
    public function getAgents(int $accountId, string $apiKey): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey
            ])->get("{$this->baseUrl}/api/v1/accounts/{$accountId}/agents");

            return [
                'success' => $response->successful(),
                'data' => $response->json() ?? [],
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::getAgents failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => []];
        }
    }

    /**
     * Get teams for an account (with custom API key)
     */
    public function getTeams(int $accountId, string $apiKey): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey
            ])->get("{$this->baseUrl}/api/v1/accounts/{$accountId}/teams");

            return [
                'success' => $response->successful(),
                'data' => $response->json() ?? [],
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::getTeams failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => []];
        }
    }

    /**
     * Create a team in an account (with custom API key)
     */
    public function createTeam(int $accountId, string $apiKey, string $name, ?string $description = null): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/teams", [
                'name' => $name,
                'description' => $description
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::createTeam failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
        }
    }

    /**
     * Create a webhook in an account (with custom API key)
     */
    public function createAccountWebhook(int $accountId, string $apiKey, string $url, array $subscriptions = []): array
    {
        try {
            if (empty($subscriptions)) {
                $subscriptions = [
                    'message_created',
                    'message_updated',
                    'conversation_created',
                    'conversation_updated',
                    'conversation_status_changed'
                ];
            }

            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/webhooks", [
                'webhook' => [
                    'url' => $url,
                    'subscriptions' => $subscriptions
                ]
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'error' => $response->successful() ? null : $response->body(),
                'status' => $response->status(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::createAccountWebhook failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
        }
    }

    /**
     * List webhooks for an account (with custom API key)
     */
    public function listAccountWebhooks(int $accountId, string $apiKey): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey
            ])->get("{$this->baseUrl}/api/v1/accounts/{$accountId}/webhooks");

            return [
                'success' => $response->successful(),
                'data' => $response->json()['payload'] ?? $response->json(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::listAccountWebhooks failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => []];
        }
    }

    /**
     * Delete a webhook from an account (with custom API key)
     */
    public function deleteAccountWebhook(int $accountId, string $apiKey, int $webhookId): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey
            ])->delete("{$this->baseUrl}/api/v1/accounts/{$accountId}/webhooks/{$webhookId}");

            return [
                'success' => $response->successful(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::deleteAccountWebhook failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create account user via Platform API (requires super admin token)
     */
    public function createAccountUser(int $accountId, string $name, string $email, string $role = 'agent'): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->superAdminToken,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/platform/api/v1/accounts/{$accountId}/account_users", [
                'name' => $name,
                'email' => $email,
                'role' => $role,
                'auto_assign' => true
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::createAccountUser failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
        }
    }

    /**
     * Create an API inbox in a specific account
     * 
     * @param int $accountId Chatwoot account ID
     * @param string $apiKey API key for the account
     * @param string $inboxName Name for the inbox
     * @param string $webhookUrl Webhook URL for the inbox
     * @return array
     */
    public function createApiInbox(int $accountId, string $apiKey, string $inboxName, string $webhookUrl): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/inboxes", [
                'name' => $inboxName,
                'channel' => [
                    'type' => 'api',
                    'webhook_url' => $webhookUrl
                ]
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::createApiInbox failed', [
                'account_id' => $accountId,
                'inbox_name' => $inboxName,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage(), 'data' => null];
        }
    }
}
