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
                'body' => $response->body()
            ]);

            return ['success' => false, 'error' => 'Error al crear workflow'];
        } catch (\Exception $e) {
            Log::error('n8n createWorkflow exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Activar un workflow
     */
    public function activateWorkflow(string $workflowId): array
    {
        try {
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
            ])->post("{$this->baseUrl}/api/v1/workflows/{$workflowId}/activate");

            if ($response->successful()) {
                return ['success' => true];
            }

            return ['success' => false, 'error' => 'Error al activar workflow'];
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
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $this->apiKey,
                'Accept' => 'application/json',
            ])->post("{$this->baseUrl}/api/v1/workflows/{$workflowId}/deactivate");

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
        $publicUrl = env('N8N_PUBLIC_URL', env('N8N_URL', 'https://n8n-production-dace.up.railway.app'));
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
}
