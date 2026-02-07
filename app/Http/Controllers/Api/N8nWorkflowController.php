<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppInstance;
use App\Services\N8nService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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
        $instanceName = $request->instance_name;

        try {
            $company = \App\Models\Company::find($companyId);

            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Empresa no encontrada'
                ], 404);
            }

            $result = $this->n8nService->createBotWorkflow($company, $instanceName);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al crear workflow: ' . ($result['error'] ?? 'Unknown error')
                ], 500);
            }

            // Guardar referencia en la base de datos
            $this->saveWorkflowReference($companyId, $instanceName, $result['workflow_id'], '');

            return response()->json([
                'success' => true,
                'message' => 'Workflow creado y activado exitosamente',
                'workflow_id' => $result['workflow_id'],
                'webhook_url' => $result['webhook_url']
            ]);

        } catch (\Exception $e) {
            Log::error('Error al crear workflow para empresa', [
                'company_id' => $companyId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear workflow'
            ], 500);
        }
    }

    /**
     * Guardar referencia del workflow en la base de datos
     */
    private function saveWorkflowReference(int $companyId, string $instanceName, ?string $workflowId, string $workflowName): void
    {
        try {
            // Insertar o actualizar en whatsapp_instances
            WhatsAppInstance::where('company_id', $companyId)
                ->where('instance_name', $instanceName)
                ->update([
                    'n8n_workflow_id' => $workflowId,
                    'n8n_webhook_url' => $this->n8nService->getWebhookUrl($instanceName),
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
                'message' => 'Error al obtener workflows'
            ], 500);
        }
    }

    /**
     * Obtener workflow de una empresa específica
     */
    public function getCompanyWorkflow(int $companyId)
    {
        try {
            $instance = WhatsAppInstance::where('company_id', $companyId)->first();

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
                'message' => 'Error al obtener workflow'
            ], 500);
        }
    }

    /**
     * Eliminar workflow de una empresa
     */
    public function deleteCompanyWorkflow(int $companyId)
    {
        try {
            $instance = WhatsAppInstance::where('company_id', $companyId)->first();

            if ($instance && $instance->n8n_workflow_id) {
                // Eliminar de n8n
                $this->n8nService->deleteWorkflow($instance->n8n_workflow_id);
                
                // Limpiar referencia
                $instance->update([
                    'n8n_workflow_id' => null,
                    'n8n_webhook_url' => null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Workflow eliminado'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar workflow'
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
            $instance = WhatsAppInstance::where('company_id', $companyId)->first();

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
                'message' => 'Error al cambiar estado del workflow'
            ], 500);
        }
    }

    /**
     * Crear workflow de entrenamiento para una empresa
     * Este workflow permite entrenar el bot via chat, guardando ejemplos en Qdrant
     */
    public function createTrainingWorkflow(Request $request)
    {
        try {
            $user = auth()->user();
            
            if (!$user || !$user->company_slug) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario o empresa no encontrado'
                ], 404);
            }

            $company = $user->company;
            $companySlug = $user->company_slug;

            // Verificar si ya existe
            $existingWorkflowId = $company->settings['training_workflow_id'] ?? null;
            if ($existingWorkflowId) {
                return response()->json([
                    'success' => true,
                    'message' => 'El workflow de entrenamiento ya existe',
                    'workflow_id' => $existingWorkflowId,
                    'webhook_url' => $company->settings['training_webhook_url'] ?? null,
                    'already_exists' => true
                ]);
            }

            Log::debug("Creando workflow de entrenamiento para: {$companySlug}");

            // Crear el workflow
            $result = $this->n8nService->createTrainingWorkflow($companySlug);

            if (!$result['success']) {
                Log::error('Error creando training workflow', [
                    'company_slug' => $companySlug,
                    'error' => $result['error'] ?? 'Unknown'
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Error al crear workflow: ' . ($result['error'] ?? 'Unknown error')
                ], 500);
            }

            // Guardar configuración en la empresa
            $company->update([
                'settings' => array_merge($company->settings ?? [], [
                    'training_workflow_id' => $result['workflow_id'] ?? null,
                    'training_webhook_path' => $result['webhook_path'] ?? null,
                    'training_webhook_url' => $result['webhook_url'] ?? null,
                    'training_workflow_name' => "Training Chat - {$companySlug}"
                ])
            ]);

            Log::debug("✅ Training workflow creado exitosamente", [
                'company_slug' => $companySlug,
                'workflow_id' => $result['workflow_id']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Workflow de entrenamiento creado y activado exitosamente',
                'workflow_id' => $result['workflow_id'],
                'webhook_url' => $result['webhook_url'],
                'webhook_path' => $result['webhook_path']
            ]);

        } catch (\Exception $e) {
            Log::error('Exception creating training workflow', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error al crear workflow de entrenamiento'
            ], 500);
        }
    }
}
