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
            Log::info('ChatwootService: Configurando webhook para inbox', [
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

        Log::info('ChatwootService: Creando webhook subscription', [
            'endpoint' => $endpoint,
            'payload' => $payload,
        ]);

        $response = Http::withHeaders([
            'api_access_token' => $this->superAdminToken,
            'Content-Type' => 'application/json',
        ])->post($endpoint, $payload);

        if ($response->successful()) {
            Log::info('ChatwootService: Webhook creado exitosamente', [
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
        $endpoint = "{$this->baseUrl}/api/v1/accounts/{$this->accountId}/inboxes/{$inboxId}";

        $response = Http::withHeaders([
            'api_access_token' => $this->superAdminToken,
        ])->get($endpoint);

        if ($response->successful()) {
            return [
                'success' => true,
                'inbox' => $response->json(),
            ];
        }

        return [
            'success' => false,
            'error' => $response->body(),
        ];
    }

    /**
     * Lista todos los inboxes de la cuenta
     */
    public function listInboxes(): array
    {
        $endpoint = "{$this->baseUrl}/api/v1/accounts/{$this->accountId}/inboxes";

        $response = Http::withHeaders([
            'api_access_token' => $this->superAdminToken,
        ])->get($endpoint);

        if ($response->successful()) {
            return [
                'success' => true,
                'inboxes' => $response->json('payload') ?? $response->json(),
            ];
        }

        return [
            'success' => false,
            'error' => $response->body(),
        ];
    }

    /**
     * Busca un inbox por nombre
     */
    public function findInboxByName(string $name): ?array
    {
        $result = $this->listInboxes();
        
        if (!$result['success']) {
            return null;
        }

        foreach ($result['inboxes'] as $inbox) {
            if (stripos($inbox['name'], $name) !== false) {
                return $inbox;
            }
        }

        return null;
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
                Log::info('ChatwootService: Webhook configurado para empresa', [
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
}
