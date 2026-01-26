<?php

namespace App\Services;

use App\Models\Company;
use App\Models\WhatsAppInstance;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class N8nWorkflowService
{
    private string $n8nUrl;
    private string $n8nApiKey;
    private string $appUrl;
    private string $openaiCredentialId;
    private string $qdrantCredentialId;

    public function __construct()
    {
        $this->n8nUrl = config('services.n8n.base_url') ?? config('services.n8n.url');
        $this->n8nApiKey = config('services.n8n.api_key');
        $this->appUrl = config('app.url');
        // IDs de credenciales del Super Admin (configuradas una vez en n8n)
        $this->openaiCredentialId = config('services.n8n.openai_credential_id', '');
        $this->qdrantCredentialId = config('services.n8n.qdrant_credential_id', '');
    }

    /**
     * Crear workflow de WITHMIA Bot para una empresa
     * 100% aislado - sin valores hardcodeados
     * Soporta todos los canales de Chatwoot (WhatsApp, Email, Web, etc)
     */
    public function createChatwootBotWorkflow(Company $company): ?array
    {
        // Cargar template Único WITHMIA
        $templatePath = base_path('workflows/withmia-bot-template.json');
        
        if (!file_exists($templatePath)) {
            Log::error('Chatwoot bot template not found', ['path' => $templatePath]);
            return null;
        }

        $template = file_get_contents($templatePath);

        // Reemplazar TODOS los placeholders del template
        $replacements = [
            '{{COMPANY_SLUG}}' => $company->slug,
            '{{COMPANY_NAME}}' => $company->name ?? $company->slug,
            '{{APP_URL}}' => $this->appUrl,
            '{{EVOLUTION_API_URL}}' => config('evolution.api_url'),
            '{{EVOLUTION_API_KEY}}' => config('evolution.api_key'),
            '{{CHATWOOT_API_TOKEN}}' => $company->settings['chatwoot_api_token'] ?? config('chatwoot.token'),
            '{{OPENAI_CREDENTIAL_ID}}' => $this->openaiCredentialId,
            '{{QDRANT_CREDENTIAL_ID}}' => $this->qdrantCredentialId,
            '{{QDRANT_URL}}' => config('services.qdrant.url'),
        ];

        foreach ($replacements as $placeholder => $value) {
            $template = str_replace($placeholder, $value, $template);
        }

        $workflow = json_decode($template, true);

        if (!$workflow) {
            Log::error('Failed to parse workflow template', ['error' => json_last_error_msg()]);
            return null;
        }

        // Crear en n8n
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->n8nApiKey,
                'Content-Type' => 'application/json',
            ])->post("{$this->n8nUrl}/api/v1/workflows", $workflow);

            if (!$response->successful()) {
                Log::error('Failed to create workflow in n8n', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'company' => $company->slug,
                ]);
                return null;
            }

            $result = $response->json();
            $workflowId = $result['id'] ?? null;

            if ($workflowId) {
                // Activar workflow
                $this->activateWorkflow($workflowId);

                // Guardar en la empresa - UNIFICADO: usar withmia-{slug}
                $company->update([
                    'n8n_whatsapp_workflow_id' => $workflowId,
                    'n8n_whatsapp_webhook_path' => "withmia-{$company->slug}",
                ]);

                Log::info('Chatwoot bot workflow created', [
                    'company' => $company->slug,
                    'workflow_id' => $workflowId,
                ]);
            }

            return $result;

        } catch (\Exception $e) {
            Log::error('Exception creating workflow', [
                'company' => $company->slug,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Activar un workflow
     */
    public function activateWorkflow(string $workflowId): bool
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->n8nApiKey,
            ])->post("{$this->n8nUrl}/api/v1/workflows/{$workflowId}/activate");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Failed to activate workflow', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Desactivar un workflow
     */
    public function deactivateWorkflow(string $workflowId): bool
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->n8nApiKey,
            ])->post("{$this->n8nUrl}/api/v1/workflows/{$workflowId}/deactivate");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Failed to deactivate workflow', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Eliminar un workflow
     */
    public function deleteWorkflow(string $workflowId): bool
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->n8nApiKey,
            ])->delete("{$this->n8nUrl}/api/v1/workflows/{$workflowId}");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Failed to delete workflow', [
                'workflow_id' => $workflowId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Obtener URL del webhook para una empresa
     * UNIFICADO: usar withmia-{slug} para todos los canales de Chatwoot
     */
    public function getWebhookUrl(Company $company): string
    {
        return "{$this->n8nUrl}/webhook/withmia-{$company->slug}";
    }

    /**
     * Verificar si un workflow existe y está activo
     */
    public function isWorkflowActive(string $workflowId): bool
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->n8nApiKey,
            ])->get("{$this->n8nUrl}/api/v1/workflows/{$workflowId}");

            if ($response->successful()) {
                $data = $response->json();
                return $data['active'] ?? false;
            }

            return false;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Configurar webhook de Chatwoot para enviar mensajes al workflow de n8n
     * Se llama después de crear la instancia de Evolution API
     */
    public function configureChatwootWebhook(Company $company, int $inboxId): bool
    {
        $chatwootUrl = config('services.chatwoot.base_url');
        $platformToken = config('services.chatwoot.api_token');
        $accountId = $company->settings['chatwoot_account_id'] ?? 1;
        
        if (!$chatwootUrl || !$platformToken) {
            Log::warning('Chatwoot not configured for webhook setup', ['company' => $company->slug]);
            return false;
        }

        $webhookUrl = $this->getWebhookUrl($company);
        
        try {
            // Crear webhook en Chatwoot para el inbox
            $response = Http::withHeaders([
                'api_access_token' => $platformToken,
                'Content-Type' => 'application/json',
            ])->post("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks", [
                'url' => $webhookUrl,
                'subscriptions' => ['message_created', 'message_updated', 'conversation_created'],
            ]);

            if ($response->successful()) {
                Log::info('Chatwoot webhook configured', [
                    'company' => $company->slug,
                    'inbox_id' => $inboxId,
                    'webhook_url' => $webhookUrl,
                ]);
                return true;
            }

            Log::error('Failed to configure Chatwoot webhook', [
                'company' => $company->slug,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return false;

        } catch (\Exception $e) {
            Log::error('Exception configuring Chatwoot webhook', [
                'company' => $company->slug,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Proceso completo: Crear workflow + Configurar Chatwoot webhook
     * Se llama cuando se conecta una nueva instancia de Evolution API
     */
    public function setupCompanyIntegration(Company $company, ?int $chatwootInboxId = null): array
    {
        $result = [
            'success' => false,
            'workflow_id' => null,
            'webhook_url' => null,
            'chatwoot_configured' => false,
            'errors' => [],
        ];

        // 1. Crear workflow en n8n
        $workflow = $this->createChatwootBotWorkflow($company);
        
        if (!$workflow) {
            $result['errors'][] = 'Failed to create n8n workflow';
            return $result;
        }

        $result['workflow_id'] = $workflow['id'] ?? null;
        $result['webhook_url'] = $this->getWebhookUrl($company);

        // 2. Configurar Chatwoot webhook (si se proporciona inbox ID)
        if ($chatwootInboxId) {
            $result['chatwoot_configured'] = $this->configureChatwootWebhook($company, $chatwootInboxId);
            if (!$result['chatwoot_configured']) {
                $result['errors'][] = 'Failed to configure Chatwoot webhook (workflow still created)';
            }
        }

        $result['success'] = !empty($result['workflow_id']);

        Log::info('Company integration setup completed', [
            'company' => $company->slug,
            'result' => $result,
        ]);

        return $result;
    }

    /**
     * Actualizar instancia de WhatsApp con el workflow creado
     */
    public function updateWhatsAppInstanceWorkflow(WhatsAppInstance $instance, string $workflowId): void
    {
        $instance->update([
            'n8n_workflow_id' => $workflowId,
            'n8n_webhook_url' => $this->getWebhookUrl($instance->company),
        ]);
    }
}
