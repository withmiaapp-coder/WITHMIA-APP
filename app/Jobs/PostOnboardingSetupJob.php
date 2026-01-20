<?php

namespace App\Jobs;

use App\Models\Company;
use App\Models\User;
use App\Mail\OnboardingCompletedMail;
use App\Mail\OnboardingCompletedNotificationMail;
use App\Services\N8nService;
use App\Services\QdrantService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PostOnboardingSetupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $userId;
    protected $companyId;
    protected $companySlug;
    protected $userIP;

    public function __construct(int $userId, int $companyId, string $companySlug, string $userIP)
    {
        $this->userId = $userId;
        $this->companyId = $companyId;
        $this->companySlug = $companySlug;
        $this->userIP = $userIP;
    }

    public function handle(N8nService $n8nService, QdrantService $qdrantService)
    {
        $user = User::find($this->userId);
        $company = Company::find($this->companyId);

        if (!$user || !$company) {
            Log::error("PostOnboardingSetupJob: User or Company not found", [
                'user_id' => $this->userId,
                'company_id' => $this->companyId
            ]);
            return;
        }

        Log::info("PostOnboardingSetupJob iniciado para: {$this->companySlug}");

        // NOTA: La colección Qdrant ya se crea en OnboardingController@processOnboardingCompletion
        // No duplicamos aquí para evitar operaciones redundantes

        // Crear workflow RAG (solo si no existe ya uno)
        try {
            // Verificar si ya existe un workflow RAG para esta empresa
            $existingWorkflowId = $company->settings['rag_workflow_id'] ?? null;
            
            if ($existingWorkflowId) {
                Log::info("Workflow RAG ya existe para {$this->companySlug}: {$existingWorkflowId}");
            } else {
                Log::info("Creando workflow RAG para: {$this->companySlug}");
                $ragResult = $this->createRagWorkflow($company, $this->companySlug, $n8nService, $qdrantService);
                
                if ($ragResult['success']) {
                    Log::info("Workflow RAG creado para {$this->companySlug}", [
                        'workflow_id' => $ragResult['workflow_id'],
                        'webhook_path' => $ragResult['webhook_path'] ?? null
                    ]);
                    
                    // Guardar con las mismas claves que espera KnowledgeController
                    $company->update([
                        'settings' => array_merge($company->settings ?? [], [
                            'rag_workflow_id' => $ragResult['workflow_id'] ?? null,
                            'rag_webhook_path' => $ragResult['webhook_path'] ?? null,
                            'rag_webhook_url' => $ragResult['webhook_url'] ?? null,
                            'rag_workflow_name' => "RAG Documents - {$this->companySlug}"
                        ])
                    ]);
                } else {
                    Log::error("Error creando workflow RAG: " . ($ragResult['error'] ?? 'Unknown'));
                }
            }
        } catch (\Exception $e) {
            Log::error("Excepción creando workflow RAG: " . $e->getMessage());
        }

        // 3. Enviar correos
        try {
            if (class_exists('App\Mail\OnboardingCompletedNotificationMail')) {
                Mail::to("a.diaz@withmia.com")->send(new OnboardingCompletedNotificationMail($user, $this->userIP, $company));
                Log::info("Correo admin enviado para: {$user->email}");
                
                Mail::to($user->email)->send(new OnboardingCompletedMail($user));
                Log::info("Correo bienvenida enviado a: {$user->email}");
            }
        } catch (\Exception $e) {
            Log::error("Error enviando correos: " . $e->getMessage());
        }

        Log::info("PostOnboardingSetupJob completado para: {$this->companySlug}");
    }

    private function createRagWorkflow(Company $company, string $companySlug, N8nService $n8nService, QdrantService $qdrantService): array
    {
        try {
            // Use simplified text processor workflow (receives pre-extracted text from Laravel)
            $templatePath = base_path('workflows/rag-text-processor.json');
            
            if (!file_exists($templatePath)) {
                return ['success' => false, 'error' => 'Template not found'];
            }

            $content = file_get_contents($templatePath);
            $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
            $templateWorkflow = json_decode($content, true);

            if (!$templateWorkflow) {
                return ['success' => false, 'error' => 'Invalid template JSON'];
            }

            $collectionName = $qdrantService->getCollectionName($companySlug);
            $webhookPath = "rag-{$companySlug}";
            $newWebhookId = Str::uuid()->toString();

            foreach ($templateWorkflow['nodes'] as &$node) {
                if ($node['type'] === 'n8n-nodes-base.webhook') {
                    $node['parameters']['path'] = $webhookPath;
                    $node['webhookId'] = $newWebhookId;
                }
            }

            $templateWorkflow['name'] = "RAG Documents - {$companySlug}";
            unset($templateWorkflow['id']);
            unset($templateWorkflow['versionId']);
            unset($templateWorkflow['meta']);
            unset($templateWorkflow['tags']);
            unset($templateWorkflow['active']);

            $result = $n8nService->createWorkflow($templateWorkflow);

            if ($result['success']) {
                $workflowId = $result['data']['id'] ?? null;
                $webhookUrl = env('N8N_PUBLIC_URL', 'https://n8n-production-00dd.up.railway.app') . "/webhook/{$webhookPath}";

                if ($workflowId) {
                    $n8nService->activateWorkflow($workflowId);
                }

                return [
                    'success' => true,
                    'workflow_id' => $workflowId,
                    'webhook_url' => $webhookUrl,
                    'webhook_path' => $webhookPath,
                    'collection_name' => $collectionName
                ];
            }

            return ['success' => false, 'error' => $result['error'] ?? 'Unknown'];

        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
