<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\N8nService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class N8nWorkflowController extends Controller
{
    private N8nService $n8nService;

    public function __construct(N8nService $n8nService)
    {
        $this->n8nService = $n8nService;
    }

    /**
     * Crear un workflow personalizado para una empresa/instancia de WhatsApp
     */
    public function createWorkflowForCompany(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer',
            'company_name' => 'required|string',
            'instance_name' => 'required|string'
        ]);

        $companyId = $request->company_id;
        $companyName = $request->company_name;
        $instanceName = $request->instance_name;

        try {
            // 1. Cargar el template del workflow desde el archivo local
            $templatePath = base_path('workflows/whatsapp-bot-updated.json');
            
            if (!file_exists($templatePath)) {
                Log::error('Template de workflow no encontrado', ['path' => $templatePath]);
                return response()->json([
                    'success' => false,
                    'message' => 'Template de workflow no encontrado'
                ], 500);
            }

            $templateWorkflow = json_decode(file_get_contents($templatePath), true);

            if (!$templateWorkflow) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al parsear template de workflow'
                ], 500);
            }

            // 2. Personalizar el workflow para la empresa
            $customizedWorkflow = $this->customizeWorkflowForCompany(
                $templateWorkflow,
                $companyId,
                $companyName,
                $instanceName
            );

            // 3. Crear el workflow en n8n via API
            $result = $this->n8nService->createWorkflow($customizedWorkflow);

            if (!$result['success']) {
                Log::error('Error creando workflow en n8n', ['error' => $result['error'] ?? 'Unknown']);
                return response()->json([
                    'success' => false,
                    'message' => 'Error al crear workflow en n8n: ' . ($result['error'] ?? 'Unknown error')
                ], 500);
            }

            $createdWorkflow = $result['data'];
            $workflowId = $createdWorkflow['id'] ?? null;

            // 4. Activar el workflow
            if ($workflowId) {
                $this->n8nService->activateWorkflow($workflowId);
            }

            // 5. Guardar referencia en la base de datos
            $this->saveWorkflowReference($companyId, $instanceName, $workflowId, $createdWorkflow['name'] ?? '');

            // 6. Obtener URL del webhook
            $webhookUrl = $this->n8nService->getWebhookUrl($instanceName);

            Log::info('✅ Workflow creado exitosamente', [
                'company_id' => $companyId,
                'instance_name' => $instanceName,
                'workflow_id' => $workflowId,
                'webhook_url' => $webhookUrl
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Workflow creado y activado exitosamente',
                'workflow_id' => $workflowId,
                'workflow_name' => $createdWorkflow['name'] ?? '',
                'webhook_url' => $webhookUrl
            ]);

        } catch (\Exception $e) {
            Log::error('Error al crear workflow para empresa', [
                'company_id' => $companyId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear workflow: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Personalizar workflow para una empresa específica
     */
    private function customizeWorkflowForCompany(array $workflow, int $companyId, string $companyName, string $instanceName): array
    {
        // Remover ID para que n8n genere uno nuevo
        unset($workflow['id']);
        
        // Personalizar nombre
        $workflow['name'] = "WhatsApp Bot - {$companyName}";
        
        // Generar nuevo webhook ID
        $newWebhookId = Str::uuid()->toString();

        foreach ($workflow['nodes'] as &$node) {
            // Personalizar webhook path
            if ($node['type'] === 'n8n-nodes-base.webhook') {
                $node['webhookId'] = $newWebhookId;
                if (isset($node['parameters']['path'])) {
                    $node['parameters']['path'] = "whatsapp-{$instanceName}";
                }
            }

            // Personalizar session key para memoria
            if ($node['type'] === '@n8n/n8n-nodes-langchain.memoryBufferWindow') {
                if (isset($node['parameters']['sessionKey'])) {
                    $node['parameters']['sessionKey'] = "company_{$companyId}_" . '={{ $json.message.chat_id }}';
                }
            }

            // Personalizar claves de Redis si se usan
            if (in_array($node['type'], ['n8n-nodes-base.redis', 'n8n-nodes-base.redisTool'])) {
                if (isset($node['parameters']['key'])) {
                    $currentKey = $node['parameters']['key'];
                    if (strpos($currentKey, 'company_') === false) {
                        $node['parameters']['key'] = "company_{$companyId}_{$currentKey}";
                    }
                }
            }
        }

        return $workflow;
    }

    /**
     * Guardar referencia del workflow en la base de datos
     */
    private function saveWorkflowReference(int $companyId, string $instanceName, ?string $workflowId, string $workflowName): void
    {
        try {
            // Insertar o actualizar en whatsapp_instances
            DB::table('whatsapp_instances')
                ->where('company_id', $companyId)
                ->where('instance_name', $instanceName)
                ->update([
                    'n8n_workflow_id' => $workflowId,
                    'n8n_webhook_url' => $this->n8nService->getWebhookUrl($instanceName),
                    'updated_at' => now()
                ]);
        } catch (\Exception $e) {
            Log::warning('Error guardando referencia de workflow', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Listar workflows de empresas
     */
    public function listCompanyWorkflows()
    {
        try {
            $result = $this->n8nService->getWorkflows();

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al obtener workflows'
                ], 500);
            }

            // Filtrar solo workflows de WhatsApp Bot
            $workflows = collect($result['data'])->filter(function ($workflow) {
                return Str::contains($workflow['name'] ?? '', ['WhatsApp Bot', 'WhatsApp', 'whatsapp']);
            })->values();

            return response()->json([
                'success' => true,
                'workflows' => $workflows
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener workflow de una empresa específica
     */
    public function getCompanyWorkflow(int $companyId)
    {
        try {
            $instance = DB::table('whatsapp_instances')
                ->where('company_id', $companyId)
                ->first();

            if (!$instance || !$instance->n8n_workflow_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró workflow para esta empresa'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'workflow' => [
                    'workflow_id' => $instance->n8n_workflow_id,
                    'webhook_url' => $instance->n8n_webhook_url,
                    'instance_name' => $instance->instance_name
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar workflow de una empresa
     */
    public function deleteCompanyWorkflow(int $companyId)
    {
        try {
            $instance = DB::table('whatsapp_instances')
                ->where('company_id', $companyId)
                ->first();

            if ($instance && $instance->n8n_workflow_id) {
                // Eliminar de n8n
                $this->n8nService->deleteWorkflow($instance->n8n_workflow_id);
                
                // Limpiar referencia
                DB::table('whatsapp_instances')
                    ->where('company_id', $companyId)
                    ->update([
                        'n8n_workflow_id' => null,
                        'n8n_webhook_url' => null,
                        'updated_at' => now()
                    ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Workflow eliminado'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activar/desactivar workflow
     */
    public function toggleWorkflow(Request $request, int $companyId)
    {
        $request->validate([
            'active' => 'required|boolean'
        ]);

        try {
            $instance = DB::table('whatsapp_instances')
                ->where('company_id', $companyId)
                ->first();

            if (!$instance || !$instance->n8n_workflow_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Workflow no encontrado'
                ], 404);
            }

            if ($request->active) {
                $this->n8nService->activateWorkflow($instance->n8n_workflow_id);
            } else {
                $this->n8nService->deactivateWorkflow($instance->n8n_workflow_id);
            }

            return response()->json([
                'success' => true,
                'message' => $request->active ? 'Workflow activado' : 'Workflow desactivado'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }
}
