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
        $this->baseUrl = rtrim(config('chatwoot.url', ''), '/');
        $this->platformToken = config('chatwoot.platform_token') ?? '';
        $this->superAdminToken = config('chatwoot.super_admin_token') ?? $this->platformToken;
        $this->accountId = (int) config('chatwoot.account_id', 1);
    }

    private function platformClient(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::timeout(config('services.timeouts.chatwoot', 15))
            ->withHeaders([
                'api_access_token' => $this->platformToken,
                'Content-Type' => 'application/json',
            ]);
    }

    private function accountClient(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::timeout(config('services.timeouts.chatwoot', 15))
            ->withHeaders([
                'api_access_token' => $this->superAdminToken,
                'Content-Type' => 'application/json',
            ]);
    }

    public function createAccount(string $name): array
    {
        try {
            $response = $this->platformClient()->post("$this->baseUrl/platform/api/v1/accounts", [
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
            $response = $this->platformClient()->post("$this->baseUrl/platform/api/v1/accounts/$accountId/users", [
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
     * 
     * IMPORTANTE: Para n8n solo necesitamos message_created
     * Los demás eventos causan ejecuciones duplicadas:
     * - message_updated: se dispara cuando el bot responde
     * - conversation_updated: se dispara con cada mensaje
     * - conversation_created: innecesario para el flujo del bot
     */
    private function createWebhookSubscription(string $webhookUrl, ?int $inboxId = null): array
    {
        $endpoint = "{$this->baseUrl}/api/v1/accounts/{$this->accountId}/webhooks";
        
        // Solo suscribirse a message_created para evitar ejecuciones duplicadas en n8n
        $payload = [
            'url' => $webhookUrl,
            'subscriptions' => [
                'message_created', // Único evento necesario para el bot
            ],
        ];

        if ($inboxId) {
            $payload['inbox_ids'] = [$inboxId];
        }

        Log::debug('ChatwootService: Creando webhook subscription', [
            'endpoint' => $endpoint,
            'payload' => $payload,
        ]);

        $response = $this->accountClient()->post($endpoint, $payload);

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

        $response = $this->accountClient()->get($endpoint);

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
     * 🔧 Migrar webhooks: Eliminar webhooks directos a n8n y asegurar que
     * solo el webhook a Laravel (con enriquecimiento de media) exista.
     * 
     * Esto resuelve el problema de audio: si Chatwoot envía directamente a n8n,
     * el webhook llega sin attachments (race condition). Al pasar por Laravel,
     * se enriquece con los attachments reales antes de enviar a n8n.
     * 
     * @return array Resultado de la migración
     */
    public function migrateWebhooksToLaravel(): array
    {
        $result = $this->listWebhooks();
        
        if (!$result['success']) {
            return ['success' => false, 'error' => 'Could not list webhooks'];
        }

        $webhooks = $result['webhooks'] ?? [];
        $deleted = [];
        $kept = [];
        $errors = [];
        $appUrl = rtrim(config('app.url', ''), '/');
        $n8nUrl = rtrim(config('n8n.url', ''), '/');
        
        foreach ($webhooks as $webhook) {
            $url = $webhook['url'] ?? '';
            
            // Detectar webhooks que van DIRECTAMENTE a n8n (sin pasar por Laravel)
            $isDirectN8n = (
                (str_contains($url, 'n8n') || str_contains($url, '/webhook/')) &&
                !str_contains($url, $appUrl) &&
                !str_contains($url, '/api/chatwoot/')
            );
            
            if ($isDirectN8n) {
                // Eliminar el webhook directo a n8n
                $deleteResult = $this->deleteWebhook($webhook['id']);
                
                if ($deleteResult['success']) {
                    $deleted[] = [
                        'id' => $webhook['id'],
                        'url' => $url,
                        'reason' => 'Direct n8n webhook removed - will use Laravel enrichment path',
                    ];
                    Log::info('🗑️ Webhook directo a n8n eliminado', [
                        'webhook_id' => $webhook['id'],
                        'url' => $url,
                    ]);
                } else {
                    $errors[] = [
                        'id' => $webhook['id'],
                        'url' => $url,
                        'error' => 'Could not delete webhook',
                    ];
                }
            } else {
                $kept[] = [
                    'id' => $webhook['id'],
                    'url' => $url,
                ];
            }
        }
        
        // Verificar que existe un webhook a Laravel
        $hasLaravelWebhook = collect($kept)->contains(function ($wh) use ($appUrl) {
            return str_contains($wh['url'], $appUrl) || str_contains($wh['url'], '/api/chatwoot/');
        });
        
        return [
            'success' => true,
            'deleted' => $deleted,
            'kept' => $kept,
            'errors' => $errors,
            'has_laravel_webhook' => $hasLaravelWebhook,
            'message' => count($deleted) > 0 
                ? "Migrated: deleted " . count($deleted) . " direct n8n webhook(s). Laravel enrichment path is now the only route."
                : "No direct n8n webhooks found - configuration looks correct.",
            'warning' => !$hasLaravelWebhook 
                ? "⚠️ No Laravel webhook found! You need to create one pointing to {$appUrl}/api/chatwoot/webhook"
                : null,
        ];
    }

    /**
     * Elimina un webhook por ID
     */
    public function deleteWebhook(int $webhookId): array
    {
        $endpoint = "{$this->baseUrl}/api/v1/accounts/{$this->accountId}/webhooks/{$webhookId}";

        $response = $this->accountClient()->delete($endpoint);

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
            \Illuminate\Support\Facades\Log::error('findInboxByName error', ['error' => $e->getMessage()]);
            return null;
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

        $response = $this->accountClient()->patch($endpoint, $payload);

        return [
            'success' => $response->successful(),
            'webhook' => $response->json(),
            'status' => $response->status(),
        ];
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
            return ['success' => false, 'error' => 'Failed to get conversations', 'data' => []];
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
            return ['success' => false, 'error' => 'Failed to get contacts', 'data' => []];
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
            return ['success' => false, 'error' => 'Failed to get agents', 'data' => []];
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
            return ['success' => false, 'error' => 'Failed to get teams', 'data' => []];
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
            return ['success' => false, 'error' => 'Failed to create team', 'data' => null];
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
                'url' => $url,
                'subscriptions' => $subscriptions
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'error' => $response->successful() ? null : $response->body(),
                'status' => $response->status(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::createAccountWebhook failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to create webhook', 'data' => null];
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
            return ['success' => false, 'error' => 'Failed to list webhooks', 'data' => []];
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
            return ['success' => false, 'error' => 'Failed to delete webhook'];
        }
    }

    /**
     * Create account user via Platform API (requires super admin token)
     */
    public function createAccountUser(int $accountId, string $name, string $email, string $role = 'agent'): array
    {
        try {
            $response = $this->accountClient()->post("{$this->baseUrl}/platform/api/v1/accounts/{$accountId}/account_users", [
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
            return ['success' => false, 'error' => 'Failed to create account user', 'data' => null];
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
            return ['success' => false, 'error' => 'Failed to create API inbox', 'data' => null];
        }
    }

    /**
     * Create a new agent in a Chatwoot account
     * 
     * @param int $accountId Chatwoot account ID
     * @param string $apiKey API key for the account
     * @param string $name Agent name
     * @param string $email Agent email
     * @param string $role Agent role (agent or administrator)
     * @return array
     */
    public function createAgent(int $accountId, string $apiKey, string $name, string $email, string $role = 'agent'): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/agents", [
                'name' => $name,
                'email' => $email,
                'role' => $role,
                'auto_offline' => true,
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::createAgent failed', [
                'account_id' => $accountId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => 'Failed to create agent', 'data' => null];
        }
    }

    /**
     * Update an existing agent in a Chatwoot account
     * 
     * @param int $accountId Chatwoot account ID
     * @param string $apiKey API key for the account
     * @param int $agentId Agent ID
     * @param array $data Data to update
     * @return array
     */
    public function updateAgent(int $accountId, string $apiKey, int $agentId, array $data): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->patch("{$this->baseUrl}/api/v1/accounts/{$accountId}/agents/{$agentId}", $data);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::updateAgent failed', [
                'account_id' => $accountId,
                'agent_id' => $agentId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => 'Failed to update agent', 'data' => null];
        }
    }

    /**
     * Add agents to a team
     * 
     * @param int $accountId Chatwoot account ID
     * @param string $apiKey API key for the account
     * @param int $teamId Team ID
     * @param array $userIds Array of agent IDs to add
     * @return array
     */
    public function addAgentsToTeam(int $accountId, string $apiKey, int $teamId, array $userIds): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/teams/{$teamId}/team_members", [
                'user_ids' => $userIds,
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::addAgentsToTeam failed', [
                'account_id' => $accountId,
                'team_id' => $teamId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => 'Failed to add agents to team', 'data' => null];
        }
    }

    /**
     * Update a team
     */
    public function updateTeam(int $accountId, string $apiKey, int $teamId, array $data): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->patch("{$this->baseUrl}/api/v1/accounts/{$accountId}/teams/{$teamId}", $data);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::updateTeam failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to update team', 'data' => null];
        }
    }

    /**
     * Delete a team
     */
    public function deleteTeam(int $accountId, string $apiKey, int $teamId): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
            ])->delete("{$this->baseUrl}/api/v1/accounts/{$accountId}/teams/{$teamId}");

            return [
                'success' => $response->successful() || $response->status() === 204,
                'status' => $response->status(),
                'error' => ($response->successful() || $response->status() === 204) ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::deleteTeam failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to delete team'];
        }
    }

    /**
     * Get a specific conversation
     */
    public function getConversation(int $accountId, string $apiKey, int $conversationId): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->get("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}");

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::getConversation failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to get conversation', 'data' => null];
        }
    }

    /**
     * Delete a conversation
     */
    public function deleteConversation(int $accountId, string $apiKey, int $conversationId): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->delete("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}");

            return [
                'success' => $response->successful(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::deleteConversation failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to delete conversation'];
        }
    }

    /**
     * Get messages from a conversation
     */
    public function getConversationMessages(int $accountId, string $apiKey, int $conversationId): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->get("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}/messages");

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::getConversationMessages failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to get conversation messages', 'data' => null];
        }
    }

    /**
     * Update a contact
     */
    public function updateContact(int $accountId, string $apiKey, int $contactId, array $data): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json'
            ])->put("{$this->baseUrl}/api/v1/accounts/{$accountId}/contacts/{$contactId}", $data);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::updateContact failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to update contact', 'data' => null];
        }
    }

    /**
     * Update an agent's role in an account
     */
    public function updateAgentRole(int $accountId, string $apiKey, int $agentId, string $role): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
                'Content-Type' => 'application/json',
            ])->patch("{$this->baseUrl}/api/v1/accounts/{$accountId}/agents/{$agentId}", [
                'role' => $role,
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::updateAgentRole failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to update agent role'];
        }
    }

    /**
     * Delete an agent from an account
     */
    public function deleteAgent(int $accountId, string $apiKey, int $agentId): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
            ])->delete("{$this->baseUrl}/api/v1/accounts/{$accountId}/agents/{$agentId}");

            return [
                'success' => $response->successful(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::deleteAgent failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to delete agent'];
        }
    }

    /**
     * Assign conversation to an agent (and optionally a team)
     */
    public function assignConversation(int $accountId, string $apiKey, int $conversationId, ?int $assigneeId, ?int $teamId = null): array
    {
        try {
            $payload = [];
            if ($assigneeId !== null) {
                $payload['assignee_id'] = $assigneeId;
            }
            if ($teamId !== null) {
                $payload['team_id'] = $teamId;
            }

            $response = Http::timeout(10)->withHeaders([
                'api_access_token' => $apiKey,
            ])->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}/assignments", $payload);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::assignConversation failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to assign conversation'];
        }
    }

    /**
     * Toggle conversation status (resolve/reopen)
     */
    public function toggleConversationStatus(int $accountId, string $apiKey, int $conversationId, string $status = 'resolved'): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $apiKey,
            ])->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}/toggle_status", [
                'status' => $status,
            ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json(),
                'status' => $response->status(),
                'error' => $response->successful() ? null : $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('ChatwootService::toggleConversationStatus failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to toggle conversation status'];
        }
    }

    // ============================================================
    // MESSAGE SENDING (Chatwoot API directo)
    // ============================================================

    /**
     * Enviar mensaje de texto a una conversación via Chatwoot API.
     *
     * Chatwoot enruta automáticamente al canal correcto (WhatsApp, web, email, etc.)
     * según el inbox asociado a la conversación.
     */
    public function sendTextMessage(int $accountId, string $apiKey, int $conversationId, string $content, bool $private = false): array
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders(['api_access_token' => $apiKey])
                ->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}/messages", [
                    'content' => $content,
                    'message_type' => 'outgoing',
                    'private' => $private,
                ]);

            if ($response->successful()) {
                return ['success' => true, 'data' => $response->json()];
            }

            Log::error('ChatwootService::sendTextMessage failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'conversation_id' => $conversationId,
            ]);

            return ['success' => false, 'error' => $response->body(), 'status' => $response->status()];
        } catch (\Exception $e) {
            Log::error('ChatwootService::sendTextMessage exception', [
                'error' => $e->getMessage(),
                'conversation_id' => $conversationId,
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Enviar mensaje con attachment (base64) a una conversación via Chatwoot API.
     *
     * Convierte base64 a archivo temporal y lo envía como multipart/form-data.
     * Soporta imágenes, audio, video, documentos.
     */
    public function sendAttachmentMessage(int $accountId, string $apiKey, int $conversationId, string $base64Data, string $fileName, string $mimeType, ?string $caption = null, bool $private = false): array
    {
        $tempPath = null;

        try {
            // Decodificar base64 → archivo temporal
            $tempPath = tempnam(sys_get_temp_dir(), 'cw_att_');
            file_put_contents($tempPath, base64_decode($base64Data));

            $response = Http::timeout(30)
                ->withHeaders(['api_access_token' => $apiKey])
                ->attach('attachments[]', file_get_contents($tempPath), $fileName, ['Content-Type' => $mimeType])
                ->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}/messages", [
                    'content' => $caption ?? '',
                    'message_type' => 'outgoing',
                    'private' => $private,
                ]);

            @unlink($tempPath);

            if ($response->successful()) {
                return ['success' => true, 'data' => $response->json()];
            }

            Log::error('ChatwootService::sendAttachmentMessage failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'conversation_id' => $conversationId,
                'file_name' => $fileName,
            ]);

            return ['success' => false, 'error' => $response->body(), 'status' => $response->status()];
        } catch (\Exception $e) {
            @unlink($tempPath ?? '');
            Log::error('ChatwootService::sendAttachmentMessage exception', [
                'error' => $e->getMessage(),
                'conversation_id' => $conversationId,
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Enviar mensaje con archivo subido (UploadedFile) a una conversación via Chatwoot API.
     *
     * Para archivos enviados via FormData (upload tradicional).
     */
    public function sendUploadMessage(int $accountId, string $apiKey, int $conversationId, $file, ?string $caption = null, bool $private = false): array
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders(['api_access_token' => $apiKey])
                ->attach(
                    'attachments[]',
                    file_get_contents($file->getPathname()),
                    $file->getClientOriginalName(),
                    ['Content-Type' => $file->getMimeType()]
                )
                ->post("{$this->baseUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}/messages", [
                    'content' => $caption ?? '',
                    'message_type' => 'outgoing',
                    'private' => $private,
                ]);

            if ($response->successful()) {
                return ['success' => true, 'data' => $response->json()];
            }

            Log::error('ChatwootService::sendUploadMessage failed', [
                'status' => $response->status(),
                'body' => $response->body(),
                'conversation_id' => $conversationId,
                'file_name' => $file->getClientOriginalName(),
            ]);

            return ['success' => false, 'error' => $response->body(), 'status' => $response->status()];
        } catch (\Exception $e) {
            Log::error('ChatwootService::sendUploadMessage exception', [
                'error' => $e->getMessage(),
                'conversation_id' => $conversationId,
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
