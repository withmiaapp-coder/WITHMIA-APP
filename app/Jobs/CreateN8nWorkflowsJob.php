<?php

namespace App\Jobs;

use App\Models\Company;
use App\Models\User;
use App\Services\N8nService;
use App\Services\QdrantService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

/**
 * Job para crear workflows n8n de forma asíncrona usando HTTP sin esperar respuesta
 * Se dispara en el paso 7 del onboarding
 */
class CreateN8nWorkflowsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    protected int $companyId;
    protected string $companySlug;

    public function __construct(int $companyId, string $companySlug)
    {
        $this->companyId = $companyId;
        $this->companySlug = $companySlug;
        
        // Ejecutar en cola 'sync' para que sea inmediato
        $this->onConnection('sync');
    }

    public function handle(N8nService $n8nService, QdrantService $qdrantService): void
    {
        $company = Company::find($this->companyId);
        
        if (!$company) {
            Log::warning("CreateN8nWorkflowsJob: Company not found", ['id' => $this->companyId]);
            return;
        }

        Log::info("🚀 Creating n8n workflows for: {$this->companySlug}");

        // 1. Crear workflow RAG (si no existe)
        $this->createRagWorkflow($company, $n8nService, $qdrantService);
        
        // 2. Crear workflow Training (si no existe)
        $this->createTrainingWorkflow($company, $n8nService);

        Log::info("✅ N8n workflows job completed for: {$this->companySlug}");
    }

    private function createRagWorkflow(Company $company, N8nService $n8nService, QdrantService $qdrantService): void
    {
        if (!empty($company->settings['rag_workflow_id'])) {
            Log::info("RAG workflow already exists for: {$this->companySlug}");
            return;
        }

        try {
            Log::info("Creating RAG workflow for: {$this->companySlug}");
            
            $ragResult = $this->buildRagWorkflow($company, $n8nService, $qdrantService);
            
            if ($ragResult['success']) {
                Log::info("✅ RAG workflow created", [
                    'workflow_id' => $ragResult['workflow_id'],
                    'webhook_path' => $ragResult['webhook_path'] ?? null
                ]);
                
                $company->update([
                    'settings' => array_merge($company->settings ?? [], [
                        'rag_workflow_id' => $ragResult['workflow_id'] ?? null,
                        'rag_webhook_path' => $ragResult['webhook_path'] ?? null,
                        'rag_webhook_url' => $ragResult['webhook_url'] ?? null,
                        'rag_workflow_name' => "RAG Documents - {$this->companySlug}"
                    ])
                ]);
            } else {
                Log::error("Failed to create RAG workflow: " . ($ragResult['error'] ?? 'Unknown'));
            }
        } catch (\Exception $e) {
            Log::error("Exception creating RAG workflow: " . $e->getMessage());
        }
    }

    private function createTrainingWorkflow(Company $company, N8nService $n8nService): void
    {
        if (!empty($company->settings['training_workflow_id'])) {
            Log::info("Training workflow already exists for: {$this->companySlug}");
            return;
        }

        try {
            Log::info("Creating Training workflow for: {$this->companySlug}");
            
            $trainingResult = $n8nService->createTrainingWorkflow($this->companySlug);
            
            if ($trainingResult['success']) {
                Log::info("✅ Training workflow created", [
                    'workflow_id' => $trainingResult['workflow_id'],
                    'webhook_path' => $trainingResult['webhook_path'] ?? null
                ]);
                
                $company->update([
                    'settings' => array_merge($company->settings ?? [], [
                        'training_workflow_id' => $trainingResult['workflow_id'] ?? null,
                        'training_webhook_path' => $trainingResult['webhook_path'] ?? null,
                        'training_webhook_url' => $trainingResult['webhook_url'] ?? null,
                        'training_workflow_name' => "Training Chat - {$this->companySlug}"
                    ])
                ]);
            } else {
                Log::error("Failed to create Training workflow: " . ($trainingResult['error'] ?? 'Unknown'));
            }
        } catch (\Exception $e) {
            Log::error("Exception creating Training workflow: " . $e->getMessage());
        }
    }

    private function buildRagWorkflow(Company $company, N8nService $n8nService, QdrantService $qdrantService): array
    {
        try {
            $templatePath = base_path('workflows/rag-text-processor.json');
            
            if (!file_exists($templatePath)) {
                return ['success' => false, 'error' => 'RAG template not found'];
            }

            $content = file_get_contents($templatePath);
            $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
            $templateWorkflow = json_decode($content, true);

            if (!$templateWorkflow) {
                return ['success' => false, 'error' => 'Invalid RAG template JSON'];
            }

            // Personalizar workflow
            $webhookPath = "rag-{$this->companySlug}-" . substr(md5(uniqid()), 0, 8);
            $newWebhookId = \Illuminate\Support\Str::uuid()->toString();

            foreach ($templateWorkflow['nodes'] as &$node) {
                if ($node['type'] === 'n8n-nodes-base.webhook') {
                    $node['parameters']['path'] = $webhookPath;
                    $node['webhookId'] = $newWebhookId;
                }
            }

            $templateWorkflow['name'] = "RAG Documents - {$this->companySlug}";
            unset($templateWorkflow['id'], $templateWorkflow['versionId'], $templateWorkflow['active']);

            $result = $n8nService->createWorkflow($templateWorkflow);

            if ($result['success']) {
                $workflowId = $result['data']['id'] ?? null;
                $webhookUrl = config('services.n8n.base_url') . "/webhook/{$webhookPath}";

                if ($workflowId) {
                    $n8nService->activateWorkflow($workflowId);
                }

                return [
                    'success' => true,
                    'workflow_id' => $workflowId,
                    'webhook_url' => $webhookUrl,
                    'webhook_path' => $webhookPath
                ];
            }

            return ['success' => false, 'error' => $result['error'] ?? 'Unknown error'];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
