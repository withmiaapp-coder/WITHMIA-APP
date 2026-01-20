<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class N8nService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        // Usar red privada de Railway si está disponible
        $this->baseUrl = env('N8N_INTERNAL_URL', env('N8N_URL', 'http://n8n.railway.internal:5678'));
        $this->apiKey = env('N8N_API_KEY', '');
    }

    /**
     * Obtener todos los workflows
     */
    public function getWorkflows(): array
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
            ])->get("{$this->baseUrl}/api/v1/workflows");

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json('data', [])
                ];
            }

            Log::error('n8n getWorkflows error', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            return ['success' => false, 'error' => 'Error al obtener workflows'];
        } catch (\Exception $e) {
            Log::error('n8n getWorkflows exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Obtener un workflow por ID
     */
    public function getWorkflow(string $workflowId): array
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
            ])->get("{$this->baseUrl}/api/v1/workflows/{$workflowId}");

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json()
                ];
            }

            return ['success' => false, 'error' => 'Workflow no encontrado'];
        } catch (\Exception $e) {
            Log::error('n8n getWorkflow exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Crear un nuevo workflow
     */
    public function createWorkflow(array $workflowData): array
    {
        try {
            // Log what we're sending
            Log::info('n8n createWorkflow request', [
                'url' => "{$this->baseUrl}/api/v1/workflows",
                'workflow_keys' => array_keys($workflowData),
                'nodes_count' => count($workflowData['nodes'] ?? []),
            ]);
            
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/api/v1/workflows", $workflowData);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json()
                ];
            }

            Log::error('n8n createWorkflow error', [
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 500), // Solo primeros 500 chars del error
                'workflow_name' => $workflowData['name'] ?? 'unknown',
                'nodes_count' => count($workflowData['nodes'] ?? [])
            ]);

            return ['success' => false, 'error' => 'Error al crear workflow'];
        } catch (\Exception $e) {
            Log::error('n8n createWorkflow exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Actualizar un workflow existente
     */
    public function updateWorkflow(string $workflowId, array $workflowData): array
    {
        try {
            Log::info('n8n updateWorkflow request', [
                'workflow_id' => $workflowId,
                'nodes_count' => count($workflowData['nodes'] ?? [])
            ]);
            
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->put("{$this->baseUrl}/api/v1/workflows/{$workflowId}", $workflowData);

            if ($response->successful()) {
                Log::info('✅ Workflow actualizado', ['workflow_id' => $workflowId]);
                return ['success' => true, 'data' => $response->json()];
            }

            Log::error('n8n updateWorkflow error', [
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 500)
            ]);
            return ['success' => false, 'error' => 'Error al actualizar workflow: ' . $response->status()];
        } catch (\Exception $e) {
            Log::error('n8n updateWorkflow exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Activar un workflow
     */
    public function activateWorkflow(string $workflowId): array
    {
        try {
            Log::info('🔄 Intentando activar workflow en n8n', ['workflow_id' => $workflowId]);
            
            // n8n API requiere un body JSON object vacío {} en el POST
            // Usar (object)[] para forzar {} en lugar de []
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/api/v1/workflows/{$workflowId}/activate", (object)[]);

            if ($response->successful()) {
                Log::info('✅ Workflow activado exitosamente', ['workflow_id' => $workflowId]);
                return ['success' => true];
            }

            Log::error('❌ Error al activar workflow', [
                'workflow_id' => $workflowId,
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 500)
            ]);
            return ['success' => false, 'error' => 'Error al activar workflow: ' . $response->status()];
        } catch (\Exception $e) {
            Log::error('n8n activateWorkflow exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Desactivar un workflow
     */
    public function deactivateWorkflow(string $workflowId): array
    {
        try {
            // n8n API requiere un body vacío {} en el POST
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/api/v1/workflows/{$workflowId}/deactivate", []);

            if ($response->successful()) {
                return ['success' => true];
            }

            return ['success' => false, 'error' => 'Error al desactivar workflow'];
        } catch (\Exception $e) {
            Log::error('n8n deactivateWorkflow exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Eliminar un workflow
     */
    public function deleteWorkflow(string $workflowId): array
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
            ])->delete("{$this->baseUrl}/api/v1/workflows/{$workflowId}");

            if ($response->successful()) {
                return ['success' => true];
            }

            return ['success' => false, 'error' => 'Error al eliminar workflow'];
        } catch (\Exception $e) {
            Log::error('n8n deleteWorkflow exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Ejecutar un workflow manualmente
     */
    public function executeWorkflow(string $workflowId, array $data = []): array
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/api/v1/workflows/{$workflowId}/execute", $data);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json()
                ];
            }

            return ['success' => false, 'error' => 'Error al ejecutar workflow'];
        } catch (\Exception $e) {
            Log::error('n8n executeWorkflow exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Obtener URL del webhook de un workflow
     */
    public function getWebhookUrl(string $instanceName): string
    {
        $publicUrl = env('N8N_PUBLIC_URL', env('N8N_URL', 'https://n8n-production-00dd.up.railway.app'));
        return "{$publicUrl}/webhook/whatsapp-{$instanceName}";
    }

    /**
     * Enviar datos a un webhook de n8n
     */
    public function sendToWebhook(string $webhookPath, array $data): array
    {
        try {
            // Usar URL interna para webhooks dentro de Railway
            $internalUrl = env('N8N_INTERNAL_URL', 'http://n8n.railway.internal:5678');
            
            $response = Http::timeout(10)
                ->post("{$internalUrl}/webhook/{$webhookPath}", $data);

            return [
                'success' => $response->successful(),
                'status' => $response->status(),
                'data' => $response->json()
            ];
        } catch (\Exception $e) {
            Log::warning('n8n webhook timeout/error (non-blocking)', [
                'webhook' => $webhookPath,
                'error' => $e->getMessage()
            ]);
            // No bloquear si el webhook falla
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Crear workflow de entrenamiento para una empresa
     * Este workflow permite entrenar el bot via chat, guardando ejemplos en Qdrant
     */
    public function createTrainingWorkflow(string $companySlug): array
    {
        try {
            $templatePath = base_path('workflows/training-chat.json');
            
            if (!file_exists($templatePath)) {
                Log::error('Training workflow template not found', ['path' => $templatePath]);
                return ['success' => false, 'error' => 'Template de entrenamiento no encontrado'];
            }

            $content = file_get_contents($templatePath);
            // Remove BOM if present
            $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
            $templateWorkflow = json_decode($content, true);

            if (!$templateWorkflow) {
                Log::error('Invalid training workflow JSON');
                return ['success' => false, 'error' => 'JSON del template inválido'];
            }

            // Generate unique webhook path for this company
            $webhookPath = "training-{$companySlug}";
            $newWebhookId = \Illuminate\Support\Str::uuid()->toString();

            // Update webhook node with company-specific path
            foreach ($templateWorkflow['nodes'] as &$node) {
                if ($node['type'] === 'n8n-nodes-base.webhook') {
                    $node['parameters']['path'] = $webhookPath;
                    $node['webhookId'] = $newWebhookId;
                }
            }

            // Update workflow name
            $templateWorkflow['name'] = "Training Chat - {$companySlug}";
            
            // Remove fields that should not be in new workflow
            unset($templateWorkflow['id']);
            unset($templateWorkflow['versionId']);
            unset($templateWorkflow['active']);
            unset($templateWorkflow['pinData']);
            
            Log::info('Creating training workflow', [
                'company_slug' => $companySlug,
                'webhook_path' => $webhookPath
            ]);

            // Create the workflow in n8n
            $result = $this->createWorkflow($templateWorkflow);

            if ($result['success']) {
                $workflowId = $result['data']['id'] ?? null;
                $webhookUrl = env('N8N_PUBLIC_URL', 'https://n8n-production-00dd.up.railway.app') . "/webhook/{$webhookPath}";

                // Activate the workflow
                if ($workflowId) {
                    $activateResult = $this->activateWorkflow($workflowId);
                    Log::info('Training workflow activation', [
                        'workflow_id' => $workflowId,
                        'activated' => $activateResult['success'] ?? false
                    ]);
                }

                Log::info('✅ Training workflow created successfully', [
                    'company_slug' => $companySlug,
                    'workflow_id' => $workflowId,
                    'webhook_url' => $webhookUrl
                ]);

                return [
                    'success' => true,
                    'workflow_id' => $workflowId,
                    'webhook_url' => $webhookUrl,
                    'webhook_path' => $webhookPath
                ];
            }

            return ['success' => false, 'error' => $result['error'] ?? 'Error desconocido al crear workflow'];

        } catch (\Exception $e) {
            Log::error('Exception creating training workflow', [
                'company_slug' => $companySlug,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
