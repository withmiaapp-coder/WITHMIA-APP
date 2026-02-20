<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ResolvesChatwootConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Manages communication channel inboxes in Chatwoot.
 * Supports: Web Chat Widget, Email, Instagram, Facebook Messenger, WhatsApp Cloud API.
 */
class ChatwootChannelController extends Controller
{
    use ResolvesChatwootConfig;

    /**
     * List all inboxes/channels for the authenticated user's company.
     */
    public function index(Request $request)
    {
        $config = $this->resolveChatwootConfig($request->user());

        if (!$config['account_id']) {
            return response()->json(['channels' => []], 200);
        }

        try {
            $response = $this->chatwootClient($config)
                ->get($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/inboxes"));

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch inboxes'], $response->status());
            }

            $inboxes = collect($response->json('payload') ?? []);

            // Map Chatwoot inbox types to our channel IDs
            $channels = $inboxes->map(function ($inbox) {
                $channelType = $inbox['channel_type'] ?? '';
                $channelId = $this->mapChannelType($channelType, $inbox);

                return [
                    'id' => $channelId,
                    'inbox_id' => $inbox['id'],
                    'name' => $inbox['name'],
                    'channel_type' => $channelType,
                    'enabled' => true,
                    'phone_number' => $inbox['phone_number'] ?? null,
                    'website_url' => $inbox['website_url'] ?? null,
                    'widget_color' => $inbox['widget_color'] ?? null,
                    'welcome_title' => $inbox['welcome_title'] ?? null,
                    'welcome_tagline' => $inbox['welcome_tagline'] ?? null,
                    'web_widget_script' => $inbox['web_widget_script'] ?? null,
                    'email' => $inbox['forward_to_email'] ?? null,
                    'provider' => $inbox['provider'] ?? null,
                    'page_id' => $inbox['page_id'] ?? null,
                ];
            })->toArray();

            return response()->json(['channels' => $channels]);
        } catch (\Throwable $e) {
            Log::error('ChatwootChannelController: Error listing channels', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Error fetching channels'], 500);
        }
    }

    /**
     * Create a Web Chat Widget inbox.
     */
    public function createWebWidget(Request $request)
    {
        $request->validate([
            'website_url' => 'required|url',
            'widget_color' => 'nullable|string|max:7',
            'welcome_title' => 'nullable|string|max:200',
            'welcome_tagline' => 'nullable|string|max:200',
        ]);

        $config = $this->resolveChatwootConfig($request->user());
        $company = $request->user()->company;

        $payload = [
            'name' => "Web Chat - {$company->name}",
            'channel' => [
                'type' => 'web_widget',
                'website_url' => $request->website_url,
            ],
        ];

        if ($request->widget_color) {
            $payload['channel']['widget_color'] = $request->widget_color;
        }
        if ($request->welcome_title) {
            $payload['channel']['welcome_title'] = $request->welcome_title;
        }
        if ($request->welcome_tagline) {
            $payload['channel']['welcome_tagline'] = $request->welcome_tagline;
        }

        return $this->createInbox($config, $payload, 'web-chat');
    }

    /**
     * Create an Email channel inbox.
     */
    public function createEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'imap_address' => 'required|string',
            'imap_port' => 'required|integer',
            'imap_login' => 'required|string',
            'imap_password' => 'required|string',
            'imap_enable_ssl' => 'boolean',
            'smtp_address' => 'required|string',
            'smtp_port' => 'required|integer',
            'smtp_login' => 'required|string',
            'smtp_password' => 'required|string',
            'smtp_enable_ssl_tls' => 'boolean',
            'smtp_openssl_verify_mode' => 'nullable|string',
        ]);

        $config = $this->resolveChatwootConfig($request->user());
        $company = $request->user()->company;

        $payload = [
            'name' => "Email - {$company->name}",
            'channel' => [
                'type' => 'email',
                'email' => $request->email,
                'imap_address' => $request->imap_address,
                'imap_port' => $request->imap_port,
                'imap_login' => $request->imap_login,
                'imap_password' => $request->imap_password,
                'imap_enable_ssl' => $request->imap_enable_ssl ?? true,
                'smtp_address' => $request->smtp_address,
                'smtp_port' => $request->smtp_port,
                'smtp_login' => $request->smtp_login,
                'smtp_password' => $request->smtp_password,
                'smtp_enable_ssl_tls' => $request->smtp_enable_ssl_tls ?? true,
                'smtp_openssl_verify_mode' => $request->smtp_openssl_verify_mode ?? 'none',
            ],
        ];

        return $this->createInbox($config, $payload, 'email');
    }

    /**
     * Get Facebook OAuth URL for Instagram / Messenger integration.
     * Chatwoot handles the FB OAuth flow internally via its own callbacks.
     */
    public function getFacebookAuthUrl(Request $request)
    {
        $config = $this->resolveChatwootConfig($request->user());

        // Chatwoot's Facebook auth endpoint
        $chatwootUrl = config('chatwoot.url');
        $authUrl = "{$chatwootUrl}/auth/facebook?account_id={$config['account_id']}";

        return response()->json([
            'auth_url' => $authUrl,
            'instructions' => [
                'Para Instagram: Necesitas una cuenta Instagram Business vinculada a una Página de Facebook.',
                'Para Messenger: Necesitas ser administrador de la Página de Facebook.',
            ],
        ]);
    }

    /**
     * Create a Facebook Messenger inbox using a page access token.
     */
    public function createFacebookMessenger(Request $request)
    {
        $request->validate([
            'page_access_token' => 'required|string',
            'page_id' => 'required|string',
            'page_name' => 'nullable|string|max:200',
        ]);

        $config = $this->resolveChatwootConfig($request->user());
        $company = $request->user()->company;

        // For Facebook channel, Chatwoot has a specific API
        $payload = [
            'name' => $request->page_name ? "Messenger - {$request->page_name}" : "Messenger - {$company->name}",
            'channel' => [
                'type' => 'facebook',
                'page_access_token' => $request->page_access_token,
                'page_id' => $request->page_id,
            ],
        ];

        return $this->createInbox($config, $payload, 'messenger');
    }

    /**
     * Create an Instagram inbox (via Facebook Page).
     */
    public function createInstagram(Request $request)
    {
        $request->validate([
            'page_access_token' => 'required|string',
            'page_id' => 'required|string',
            'instagram_id' => 'nullable|string',
        ]);

        $config = $this->resolveChatwootConfig($request->user());
        $company = $request->user()->company;

        // Instagram uses the Facebook Page connection in Chatwoot
        // The page must have an Instagram Business account linked
        $payload = [
            'name' => "Instagram - {$company->name}",
            'channel' => [
                'type' => 'facebook',
                'page_access_token' => $request->page_access_token,
                'page_id' => $request->page_id,
            ],
        ];

        return $this->createInbox($config, $payload, 'instagram');
    }

    /**
     * Create a WhatsApp Cloud API inbox (native Chatwoot, not Evolution).
     */
    public function createWhatsAppCloud(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'phone_number_id' => 'required|string',
            'business_account_id' => 'required|string',
            'api_key' => 'required|string', // Meta permanent token
        ]);

        $config = $this->resolveChatwootConfig($request->user());
        $company = $request->user()->company;

        $payload = [
            'name' => "WhatsApp Cloud - {$company->name}",
            'channel' => [
                'type' => 'whatsapp',
                'phone_number' => $request->phone_number,
                'provider' => 'whatsapp_cloud',
                'provider_config' => [
                    'api_key' => $request->api_key,
                    'phone_number_id' => $request->phone_number_id,
                    'business_account_id' => $request->business_account_id,
                ],
            ],
        ];

        return $this->createInbox($config, $payload, 'whatsapp-api');
    }

    /**
     * Delete/disconnect a channel inbox.
     */
    public function destroy(Request $request, int $inboxId)
    {
        $config = $this->resolveChatwootConfig($request->user());

        try {
            $response = $this->chatwootClient($config)
                ->delete($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/inboxes/{$inboxId}"));

            if ($response->successful()) {
                Log::info('ChatwootChannelController: Inbox deleted', ['inbox_id' => $inboxId]);
                return response()->json(['success' => true, 'message' => 'Canal desconectado correctamente']);
            }

            return response()->json(['error' => 'No se pudo desconectar el canal'], $response->status());
        } catch (\Throwable $e) {
            Log::error('ChatwootChannelController: Error deleting inbox', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Error al desconectar canal'], 500);
        }
    }

    /**
     * Get the Web Widget embed script for a given inbox.
     */
    public function getWidgetScript(Request $request, int $inboxId)
    {
        $config = $this->resolveChatwootConfig($request->user());

        try {
            $response = $this->chatwootClient($config)
                ->get($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/inboxes/{$inboxId}"));

            if (!$response->successful()) {
                return response()->json(['error' => 'Inbox not found'], 404);
            }

            $inbox = $response->json();
            $websiteToken = $inbox['website_token'] ?? null;
            $chatwootUrl = config('chatwoot.url');

            if (!$websiteToken) {
                return response()->json(['error' => 'Not a web widget inbox'], 400);
            }

            $script = <<<HTML
<script>
  (function(d,t) {
    var BASE_URL="{$chatwootUrl}";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.defer = true;
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: '{$websiteToken}',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
</script>
HTML;

            return response()->json([
                'script' => trim($script),
                'website_token' => $websiteToken,
                'base_url' => $chatwootUrl,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Error getting widget script'], 500);
        }
    }

    // ─── Private helpers ───────────────────────────────────────

    /**
     * Create an inbox in Chatwoot and subscribe webhooks.
     */
    private function createInbox(array $config, array $payload, string $channelId)
    {
        try {
            $response = $this->chatwootClient($config)
                ->post($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/inboxes"), $payload);

            if (!$response->successful()) {
                Log::error('ChatwootChannelController: Inbox creation failed', [
                    'channel' => $channelId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return response()->json([
                    'error' => 'No se pudo crear el canal',
                    'details' => $response->json('message') ?? $response->body(),
                ], $response->status());
            }

            $inbox = $response->json();
            $inboxId = $inbox['id'] ?? null;

            // Subscribe the new inbox to the company's webhook
            if ($inboxId) {
                $this->subscribeInboxWebhook($config, $inboxId);

                // Add agents to inbox
                $this->addAgentsToInbox($config, $inboxId);

                // Invalidate resolver caches so new inbox is picked up
                \Illuminate\Support\Facades\Cache::forget("inbox_to_slug:{$inboxId}");
                if ($config['account_id']) {
                    \Illuminate\Support\Facades\Cache::forget("account_to_slug:{$config['account_id']}");
                }
            }

            // Ensure n8n bot workflow exists for this company
            // (may already exist if WhatsApp was connected first)
            $this->ensureN8nWorkflowForCompany(request()->user());

            Log::info('ChatwootChannelController: Inbox created', [
                'channel' => $channelId,
                'inbox_id' => $inboxId,
                'name' => $inbox['name'] ?? 'unknown',
            ]);

            return response()->json([
                'success' => true,
                'channel' => $channelId,
                'inbox' => [
                    'id' => $inboxId,
                    'name' => $inbox['name'] ?? '',
                    'channel_type' => $inbox['channel_type'] ?? '',
                    'website_token' => $inbox['website_token'] ?? null,
                    'web_widget_script' => $inbox['web_widget_script'] ?? null,
                    'forward_to_email' => $inbox['forward_to_email'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('ChatwootChannelController: Exception creating inbox', [
                'channel' => $channelId,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Error interno al crear canal'], 500);
        }
    }

    /**
     * Subscribe the new inbox to the existing Laravel webhook.
     */
    private function subscribeInboxWebhook(array $config, int $inboxId): void
    {
        try {
            $appUrl = rtrim(config('app.url', ''), '/');
            $webhookUrl = "{$appUrl}/api/chatwoot/webhook";

            // List existing webhooks
            $response = $this->chatwootClient($config)
                ->get($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/webhooks"));

            if ($response->successful()) {
                $webhooks = $response->json('payload') ?? [];

                foreach ($webhooks as $wh) {
                    if (str_contains($wh['url'] ?? '', '/api/chatwoot/webhook')) {
                        // Add new inbox to existing webhook's inbox_ids
                        $existingIds = $wh['inbox_ids'] ?? [];
                        if (!in_array($inboxId, $existingIds)) {
                            $existingIds[] = $inboxId;
                            $this->chatwootClient($config)
                                ->patch($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/webhooks/{$wh['id']}"), [
                                    'inbox_ids' => $existingIds,
                                ]);
                        }
                        return;
                    }
                }

                // No existing webhook — create one
                $this->chatwootClient($config)
                    ->post($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/webhooks"), [
                        'url' => $webhookUrl,
                        'subscriptions' => ['message_created'],
                        'inbox_ids' => [$inboxId],
                    ]);
            }
        } catch (\Throwable $e) {
            Log::warning('ChatwootChannelController: Could not subscribe webhook', [
                'inbox_id' => $inboxId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Add all existing company agents to the new inbox.
     */
    private function addAgentsToInbox(array $config, int $inboxId): void
    {
        try {
            // Get existing agents
            $agentResponse = $this->chatwootClient($config)
                ->get($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/agents"));

            if ($agentResponse->successful()) {
                $agents = $agentResponse->json();
                $agentIds = collect($agents)->pluck('id')->toArray();

                if (!empty($agentIds)) {
                    $this->chatwootClient($config)
                        ->post($this->chatwootUrl("/api/v1/accounts/{$config['account_id']}/inbox_members"), [
                            'inbox_id' => $inboxId,
                            'user_ids' => $agentIds,
                        ]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('ChatwootChannelController: Could not add agents to inbox', [
                'inbox_id' => $inboxId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Map Chatwoot channel types to our internal channel IDs.
     */
    private function mapChannelType(string $channelType, array $inbox): string
    {
        return match ($channelType) {
            'Channel::WebWidget' => 'web-chat',
            'Channel::Email' => 'email',
            'Channel::FacebookPage' => $this->isFacebookOrInstagram($inbox),
            'Channel::Whatsapp' => 'whatsapp-api',
            'Channel::Api' => 'whatsapp', // Evolution API WhatsApp
            'Channel::Telegram' => 'telegram',
            'Channel::TwitterProfile' => 'twitter',
            'Channel::Line' => 'line',
            'Channel::TwilioSms' => 'sms',
            default => 'unknown',
        };
    }

    /**
     * Determine if a Facebook Page channel is for Instagram or Messenger.
     * Uses multiple signals: channel metadata, provider, and name as fallback.
     */
    private function isFacebookOrInstagram(array $inbox): string
    {
        // 1. Check provider field (most reliable if set by Chatwoot)
        $provider = strtolower($inbox['provider'] ?? '');
        if (str_contains($provider, 'instagram')) {
            return 'instagram';
        }

        // 2. Check channel-specific attributes
        if (!empty($inbox['instagram_id']) || !empty($inbox['instagram_add_on'])) {
            return 'instagram';
        }

        // 3. Fallback: check inbox name
        $name = strtolower($inbox['name'] ?? '');
        if (str_contains($name, 'instagram')) {
            return 'instagram';
        }

        return 'messenger';
    }

    /**
     * Build a Chatwoot HTTP client with the correct auth.
     */
    private function chatwootClient(array $config): \Illuminate\Http\Client\PendingRequest
    {
        $token = $config['token'] ?? config('chatwoot.platform_token');

        return Http::timeout(15)->withHeaders([
            'api_access_token' => $token,
            'Content-Type' => 'application/json',
        ]);
    }

    /**
     * Build a full Chatwoot URL.
     */
    private function chatwootUrl(string $path): string
    {
        $base = rtrim(config('chatwoot.url', ''), '/');
        return $base . $path;
    }

    /**
     * Ensure an n8n bot workflow exists for the company.
     * If WhatsApp is already connected, the workflow already exists.
     * If not, create one using the company slug as the webhook path.
     */
    private function ensureN8nWorkflowForCompany($user): void
    {
        try {
            $company = $user->company;
            if (!$company) return;

            // Check if any active WhatsAppInstance already has a workflow
            $instance = \App\Models\WhatsAppInstance::where('company_id', $company->id)
                ->where('is_active', true)
                ->whereNotNull('n8n_workflow_id')
                ->first();

            if ($instance) {
                Log::debug('ChatwootChannelController: n8n workflow already exists via WhatsApp', [
                    'company' => $company->slug,
                    'workflow_id' => $instance->n8n_workflow_id,
                ]);
                return;
            }

            // No workflow exists — create one using company slug as webhook path
            $n8nService = app(\App\Services\N8nService::class);
            $webhookPath = $company->slug;

            $result = $n8nService->createBotWorkflow($company, $webhookPath);

            if ($result['success']) {
                // Store workflow reference in a WhatsAppInstance record (reuse model for workflow tracking)
                // or create a minimal one so resolveCompanySlugFromInbox can find it
                Log::info('ChatwootChannelController: n8n bot workflow created for non-WhatsApp company', [
                    'company' => $company->slug,
                    'workflow_id' => $result['workflow_id'],
                    'webhook_path' => $webhookPath,
                ]);
            } else {
                Log::warning('ChatwootChannelController: Could not create n8n workflow', [
                    'company' => $company->slug,
                    'error' => $result['error'] ?? 'Unknown',
                ]);
            }
        } catch (\Throwable $e) {
            // Non-blocking: channel still works, just no AI bot
            Log::warning('ChatwootChannelController: Error ensuring n8n workflow', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
