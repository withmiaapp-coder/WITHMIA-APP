<?php

namespace App\Services;

use App\Models\Company;
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
        $this->n8nUrl = config('services.n8n.url');
        $this->n8nApiKey = config('services.n8n.api_key');
        $this->appUrl = config('app.url');
        $this->openaiCredentialId = config('services.n8n.openai_credential_id');
        $this->qdrantCredentialId = config('services.n8n.qdrant_credential_id');
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

        // Reemplazar placeholders - SOLO estos valores son específicos por instancia n8n
        $replacements = [
            '{{COMPANY_SLUG}}' => $company->slug,
            '{{APP_URL}}' => $this->appUrl,
            '{{OPENAI_CREDENTIAL_ID}}' => $this->openaiCredentialId,
            '{{QDRANT_CREDENTIAL_ID}}' => $this->qdrantCredentialId,
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
}
