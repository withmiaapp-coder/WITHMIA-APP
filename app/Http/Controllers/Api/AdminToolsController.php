<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\CreateN8nWorkflowsJob;
use App\Jobs\CreateQdrantCollectionJob;
use App\Models\Company;
use App\Models\User;
use App\Models\WhatsAppInstance;
use App\Services\ChatwootService;
use App\Services\ConversationMemoryService;
use App\Services\EvolutionApiService;
use App\Services\N8nService;
use App\Services\QdrantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class AdminToolsController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || !$user->isSuperAdmin()) {
                return response()->json(['error' => 'Super admin access required'], 403);
            }

            return $next($request);
        });
    }

    /**
     * 1. Setup training workflow for a company (admin only).
     */
    public function setupTrainingWorkflow(string $companySlug): JsonResponse
    {
        try {
            $company = Company::where('slug', $companySlug)->first();
            if (!$company) {
                return response()->json(['error' => 'Company not found'], 404);
            }

            // Usar CreateN8nWorkflowsJob para crear workflows dinámicamente
            CreateN8nWorkflowsJob::dispatchSync($company->id, $companySlug);

            return response()->json([
                'success' => true,
                'message' => "Training workflow configurado para {$companySlug}",
                'settings' => $company->fresh()->settings
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 2. Regenerate Chatwoot access token for a user.
     */
    public function regenerateChatwootToken(string $userId): JsonResponse
    {
        try {
            $chatwootDb = DB::connection('chatwoot');

            // Obtener usuario de Laravel
            $user = User::find($userId);
            if (!$user) {
                return response()->json(['error' => 'Usuario no encontrado en Laravel'], 404);
            }

            // Verificar si tiene chatwoot_agent_id
            if (!$user->chatwoot_agent_id) {
                return response()->json([
                    'error' => 'Usuario no tiene chatwoot_agent_id',
                    'suggestion' => 'Ejecutar provisioning primero'
                ], 400);
            }

            // Verificar que el usuario existe en Chatwoot
            $chatwootUser = $chatwootDb->table('users')->find($user->chatwoot_agent_id);
            if (!$chatwootUser) {
                return response()->json([
                    'error' => 'Usuario no encontrado en Chatwoot',
                    'chatwoot_agent_id' => $user->chatwoot_agent_id
                ], 404);
            }

            // Eliminar tokens anteriores del usuario
            $deletedTokens = $chatwootDb->table('access_tokens')
                ->where('owner_type', 'User')
                ->where('owner_id', $user->chatwoot_agent_id)
                ->delete();

            // Generar nuevo token
            $newToken = Str::random(24);

            // Insertar en Chatwoot
            $chatwootDb->table('access_tokens')->insert([
                'owner_type' => 'User',
                'owner_id' => $user->chatwoot_agent_id,
                'token' => $newToken,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Actualizar en Laravel
            $user->update([
                'chatwoot_agent_token' => $newToken
            ]);

            Log::debug('Token de Chatwoot regenerado', [
                'user_id' => $userId,
                'chatwoot_agent_id' => $user->chatwoot_agent_id,
                'deleted_old_tokens' => $deletedTokens,
                'new_token_prefix' => substr($newToken, 0, 8) . '...'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Token regenerado exitosamente',
                'user_id' => $userId,
                'email' => $user->email,
                'chatwoot_agent_id' => $user->chatwoot_agent_id,
                'deleted_old_tokens' => $deletedTokens,
                'new_token_preview' => substr($newToken, 0, 8) . '...'
            ]);

        } catch (\Exception $e) {
            Log::error('Error regenerando token de Chatwoot', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return $this->errorResponse($e);
        }
    }

    /**
     * 3. Update RAG workflow for a specific company.
     */
    public function updateRagWorkflow(string $companySlug): JsonResponse
    {
        try {
            $n8nService = app(N8nService::class);
            $qdrantService = app(QdrantService::class);

            $templateWorkflow = $this->loadRagTemplate();
            if ($templateWorkflow instanceof JsonResponse) {
                return $templateWorkflow;
            }

            // Personalizar para la empresa
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

            // Buscar workflow existente
            $workflows = $n8nService->getWorkflows();
            $existingWorkflowId = null;

            if ($workflows['success']) {
                foreach ($workflows['data'] as $wf) {
                    if (str_contains($wf['name'] ?? '', "RAG Documents - {$companySlug}")) {
                        $existingWorkflowId = $wf['id'];
                        break;
                    }
                }
            }

            if ($existingWorkflowId) {
                // Actualizar workflow existente
                $result = $n8nService->updateWorkflow($existingWorkflowId, $templateWorkflow);
                $action = 'updated';
            } else {
                // Crear nuevo workflow
                $result = $n8nService->createWorkflow($templateWorkflow);
                $action = 'created';
            }

            if ($result['success']) {
                $workflowId = $result['data']['id'] ?? $existingWorkflowId;

                // Activar workflow
                $activateResult = $n8nService->activateWorkflow($workflowId);

                return response()->json([
                    'success' => true,
                    'action' => $action,
                    'workflow_id' => $workflowId,
                    'activated' => $activateResult['success'],
                    'webhook_url' => config('n8n.public_url') . "/webhook/{$webhookPath}"
                ]);
            }

            return response()->json(['error' => $result['error'] ?? 'Unknown error'], 500);

        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 4. Update ALL RAG workflows for all companies.
     */
    public function updateAllRagWorkflows(): JsonResponse
    {
        try {
            $n8nService = app(N8nService::class);
            $qdrantService = app(QdrantService::class);

            $templateWorkflow = $this->loadRagTemplate();
            if ($templateWorkflow instanceof JsonResponse) {
                return $templateWorkflow;
            }

            // Obtener todas las empresas
            $companies = Company::all();
            $results = [];

            foreach ($companies as $company) {
                $companySlug = $company->slug;

                try {
                    // Personalizar para la empresa
                    $collectionName = $qdrantService->getCollectionName($companySlug);
                    $webhookPath = "rag-{$companySlug}";
                    $newWebhookId = Str::uuid()->toString();

                    $workflowCopy = $templateWorkflow;

                    foreach ($workflowCopy['nodes'] as &$node) {
                        if ($node['type'] === 'n8n-nodes-base.webhook') {
                            $node['parameters']['path'] = $webhookPath;
                            $node['webhookId'] = $newWebhookId;
                        }
                    }

                    $workflowCopy['name'] = "RAG Documents - {$companySlug}";
                    unset($workflowCopy['id']);
                    unset($workflowCopy['versionId']);
                    unset($workflowCopy['meta']);
                    unset($workflowCopy['tags']);
                    unset($workflowCopy['active']);

                    // Buscar workflow existente
                    $workflows = $n8nService->getWorkflows();
                    $existingWorkflowId = null;

                    if ($workflows['success']) {
                        foreach ($workflows['data'] as $wf) {
                            if (str_contains($wf['name'] ?? '', "RAG Documents - {$companySlug}")) {
                                $existingWorkflowId = $wf['id'];
                                break;
                            }
                        }
                    }

                    if ($existingWorkflowId) {
                        $result = $n8nService->updateWorkflow($existingWorkflowId, $workflowCopy);
                        $action = 'updated';
                    } else {
                        $result = $n8nService->createWorkflow($workflowCopy);
                        $action = 'created';
                    }

                    if ($result['success']) {
                        $workflowId = $result['data']['id'] ?? $existingWorkflowId;
                        $n8nService->activateWorkflow($workflowId);
                        $results[$companySlug] = ['success' => true, 'action' => $action, 'workflow_id' => $workflowId];
                    } else {
                        $results[$companySlug] = ['success' => false, 'error' => $result['error'] ?? 'Unknown'];
                    }
                } catch (\Exception $e) {
                    $results[$companySlug] = ['success' => false, 'error' => $e->getMessage()];
                }
            }

            return response()->json([
                'success' => true,
                'total_companies' => count($companies),
                'results' => $results
            ]);

        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 5. Reset workflow for an instance (clear n8n_workflow_id and n8n_webhook_url).
     */
    public function resetWorkflow(string $instanceName): JsonResponse
    {
        $updated = WhatsAppInstance::where('instance_name', $instanceName)
            ->update([
                'n8n_workflow_id' => null,
                'n8n_webhook_url' => null,
            ]);

        return response()->json([
            'success' => $updated > 0,
            'message' => $updated > 0 ? 'Workflow reset successfully' : 'No instance found'
        ]);
    }

    /**
     * 6. Update workflow (set n8n_workflow_id and/or n8n_webhook_url).
     */
    public function updateWorkflow(string $instanceName, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'n8n_workflow_id' => 'nullable|string|max:255',
            'n8n_webhook_url' => 'nullable|url|max:500',
        ]);

        $updateData = array_filter($validated, fn($v) => $v !== null);
        if (empty($updateData)) {
            return response()->json(['error' => 'No fields to update'], 400);
        }

        $updated = WhatsAppInstance::where('instance_name', $instanceName)
            ->update($updateData);

        $instance = WhatsAppInstance::where('instance_name', $instanceName)->first();

        return response()->json([
            'success' => $updated > 0,
            'message' => $updated > 0 ? 'Workflow updated successfully' : 'No instance found',
            'instance' => $instance
        ]);
    }

    /**
     * 7. Clear all application and config cache.
     */
    public function clearAllCache(): JsonResponse
    {
        try {
            Artisan::call('cache:clear');
            Artisan::call('config:clear');
            return response()->json([
                'success' => true,
                'message' => 'Cache cleared'
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 8. Activate an n8n workflow by ID.
     */
    public function activateWorkflow(string $workflowId): JsonResponse
    {
        try {
            $n8nService = app(N8nService::class);
            $result = $n8nService->activateWorkflow($workflowId);

            return response()->json([
                'workflow_id' => $workflowId,
                'result' => $result
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 9. Create a minimal n8n workflow for an instance.
     */
    public function createMinimalWorkflow(string $instanceName): JsonResponse
    {
        try {
            $n8nService = app(N8nService::class);
            $evolutionApi = app(EvolutionApiService::class);

            // Usar workflow minimalista directamente
            $workflow = $n8nService->getMinimalWorkflow($instanceName);

            Log::debug('Creando workflow minimalista', ['name' => $workflow['name']]);

            // Crear en n8n
            $result = $n8nService->createWorkflow($workflow);

            if ($result['success']) {
                $workflowId = $result['data']['id'] ?? null;
                $webhookUrl = $n8nService->getWebhookUrl($instanceName);

                // Activar
                $activateResult = null;
                if ($workflowId) {
                    $activateResult = $n8nService->activateWorkflow($workflowId);
                    Log::debug('Workflow activado', ['id' => $workflowId, 'result' => $activateResult]);
                }

                // Configurar webhook de Evolution hacia n8n
                $evolutionResult = $evolutionApi->setWebhook(
                    $instanceName,
                    $webhookUrl,
                    ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
                );
                Log::debug('Webhook Evolution configurado', ['result' => $evolutionResult]);

                // Guardar en BD
                WhatsAppInstance::where('instance_name', $instanceName)
                    ->update([
                        'n8n_workflow_id' => $workflowId,
                        'n8n_webhook_url' => $webhookUrl,
                    ]);

                return response()->json([
                    'success' => true,
                    'workflow_id' => $workflowId,
                    'webhook_url' => $webhookUrl,
                    'evolution_webhook' => $evolutionResult['success'] ?? false,
                    'activated' => $activateResult['success'] ?? false,
                    'message' => 'Workflow minimalista creado y activado!'
                ]);
            }

            return response()->json(['error' => 'Error creando workflow', 'details' => $result], 500);

        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 10. Recreate Qdrant collection for a company.
     */
    public function recreateQdrant(string $companySlug): JsonResponse
    {
        $company = Company::where('slug', $companySlug)->first();

        if (!$company) {
            $user = User::where('company_slug', $companySlug)->where('role', 'admin')->first();
            if ($user) $company = $user->company;
        }

        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada', 'slug' => $companySlug], 404);
        }

        // Limpiar setting para forzar recreación
        $settings = $company->settings ?? [];
        unset($settings['qdrant_collection']);
        $company->update(['settings' => $settings]);

        // Ejecutar el mismo Job del onboarding
        CreateQdrantCollectionJob::dispatchSync($company->id, $company->slug);

        $company->refresh();

        return response()->json([
            'success' => true,
            'company' => $company->name,
            'collection' => $company->settings['qdrant_collection'] ?? 'No se creó',
        ]);
    }

    /**
     * 11. Unblock a phone number in Redis.
     */
    public function unblockPhone(string $phone): JsonResponse
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        $deleted = Redis::del($phone);

        return response()->json([
            'success' => true,
            'phone' => $phone,
            'deleted' => $deleted,
            'message' => "Unblocked phone {$phone}"
        ]);
    }

    /**
     * 12. Check if a phone number is blocked in Redis.
     */
    public function checkPhoneBlock(string $phone): JsonResponse
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        $value = Redis::get($phone);

        return response()->json([
            'success' => true,
            'phone' => $phone,
            'blocked' => !empty($value),
            'value' => $value
        ]);
    }

    /**
     * 13. Raw inbox check — direct SQL queries to Chatwoot DB.
     */
    public function rawInboxCheck(): JsonResponse
    {
        $user = auth()->user();
        $company = $user?->company;
        $accountId = (int) ($company?->chatwoot_account_id ?? config('chatwoot.account_id', 1));

        $chatwootDb = DB::connection('chatwoot');

        // Scoped to user's company account — no access_tokens exposed
        $inboxes = $chatwootDb->select(
            'SELECT id, name, account_id, channel_id, channel_type, updated_at FROM inboxes WHERE account_id = ? ORDER BY id',
            [$accountId]
        );
        $channels = $chatwootDb->select(
            'SELECT id, account_id, identifier FROM channel_api WHERE account_id = ? ORDER BY id',
            [$accountId]
        );
        $users = $chatwootDb->select(
            'SELECT u.id, u.name, u.email FROM users u INNER JOIN account_users au ON au.user_id = u.id WHERE au.account_id = ? ORDER BY u.id',
            [$accountId]
        );

        return response()->json([
            'timestamp' => now()->toIso8601String(),
            'account_id' => $accountId,
            'inboxes' => $inboxes,
            'channel_api' => $channels,
            'users' => $users,
        ]);
    }

    /**
     * 14. Get Chatwoot config from Evolution API for an instance.
     */
    public function evolutionChatwootConfig(string $instanceName): JsonResponse
    {
        try {
            $evolutionService = app(EvolutionApiService::class);
            $config = $evolutionService->getChatwootConfig($instanceName);

            return response()->json([
                'success' => $config['success'],
                'instance' => $instanceName,
                'chatwoot_config' => $config['data'] ?? null,
                'error' => $config['error'] ?? null,
                'help' => 'Si los mensajes del bot no aparecen en la app, usa POST /api/evolution/reconfigure-chatwoot/{instanceName}'
            ]);

        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 15. Reconfigure Chatwoot integration in Evolution API.
     */
    public function reconfigureEvolutionChatwoot(string $instanceName): JsonResponse
    {
        try {
            $evolutionService = app(EvolutionApiService::class);

            // Primero obtener la configuración actual
            $currentConfig = $evolutionService->getChatwootConfig($instanceName);

            // Reconfigurar
            $result = $evolutionService->reconfigureChatwoot($instanceName);

            return response()->json([
                'success' => $result['success'],
                'instance' => $instanceName,
                'previous_config' => $currentConfig['data'] ?? null,
                'new_config' => $result['data'] ?? null,
                'message' => $result['message'] ?? null,
                'error' => $result['error'] ?? null,
                'next_steps' => $result['success'] ? [
                    '1. Envía un mensaje de prueba desde WhatsApp',
                    '2. Espera la respuesta del bot',
                    '3. Recarga la conversación en la app',
                    '4. Ambos mensajes (entrante y saliente) deberían aparecer'
                ] : null
            ]);

        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 16. Update the assistant_name for a company.
     */
    public function updateCompanyAssistant(string $companyId, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:100',
            ]);

            $company = Company::findOrFail($companyId);
            $oldName = $company->assistant_name;
            $name = $validated['name'];
            $company->update(['assistant_name' => $name]);

            // 🧹 Flush memoria + actualizar Qdrant + fortalecer prompt
            $flushResult = null;
            $promptStrengthened = false;
            $qdrantUpdated = false;

            if ($oldName !== $name) {
                $memoryService = app(ConversationMemoryService::class);
                $qdrantService = app(QdrantService::class);

                // 1. Flush memoria de conversación (Redis + reset n8n workflow)
                try {
                    $flushResult = $memoryService->flushOnIdentityChange(
                        $company, $oldName, $name, 'assistant_name'
                    );
                    Log::info('✅ Memoria limpiada tras cambio de nombre (admin)', $flushResult);
                } catch (\Exception $e) {
                    Log::error('Error al limpiar memoria (admin)', ['error' => $e->getMessage()]);
                }

                // 2. Actualizar identidad en Qdrant
                try {
                    $this->updateCompanyOnboardingInQdrant($company, $name, $qdrantService);
                    $qdrantUpdated = true;
                } catch (\Exception $e) {
                    Log::error('Error al actualizar Qdrant (admin)', ['error' => $e->getMessage()]);
                }

                // 3. Fortalecer system prompt en n8n
                try {
                    $promptStrengthened = $memoryService->strengthenSystemPrompt($company);
                } catch (\Exception $e) {
                    Log::error('Error al fortalecer prompt (admin)', ['error' => $e->getMessage()]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => "assistant_name actualizado a '{$name}'",
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'assistant_name' => $company->assistant_name
                ],
                'memory_flushed' => $flushResult !== null,
                'qdrant_updated' => $qdrantUpdated,
                'prompt_strengthened' => $promptStrengthened,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Helper: actualizar punto de identidad en Qdrant tras cambio de nombre.
     */
    private function updateCompanyOnboardingInQdrant(Company $company, string $assistantName, QdrantService $qdrantService): void
    {
        $collectionName = $company->settings['qdrant_collection'] ?? null;
        if (!$collectionName) {
            Log::warning('No Qdrant collection found for company (admin)', ['company_id' => $company->id]);
            return;
        }

        $result = $qdrantService->upsertCompanyKnowledge($collectionName, $company, $assistantName);

        if (!($result['success'] ?? false)) {
            Log::error('Failed to update company_onboarding in Qdrant (admin)', ['error' => $result['error'] ?? 'Unknown']);
        }
    }

    /**
     * 17. Update the instance_url (and optionally api_key) for a WhatsApp instance.
     */
    public function updateWhatsappInstanceUrl(string $instanceName, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'url' => 'nullable|url|max:500',
                'apikey' => 'nullable|string|max:255',
            ]);

            $newUrl = $validated['url'] ?? config('evolution.api_url');
            $newApiKey = $validated['apikey'] ?? null;

            $instance = WhatsAppInstance::where('instance_name', $instanceName)->first();

            if (!$instance) {
                return response()->json([
                    'success' => false,
                    'error' => "Instancia '{$instanceName}' no encontrada"
                ], 404);
            }

            $oldUrl = $instance->instance_url;
            $oldApiKey = $instance->api_key;

            $updateData = ['instance_url' => $newUrl];
            if ($newApiKey) {
                $updateData['api_key'] = $newApiKey;
            }

            $instance->update($updateData);

            return response()->json([
                'success' => true,
                'message' => "WhatsApp instance actualizada",
                'instance' => [
                    'id' => $instance->id,
                    'instance_name' => $instance->instance_name,
                    'old_url' => $oldUrl,
                    'new_url' => $instance->instance_url,
                    'old_api_key' => $oldApiKey ? '***' : null,
                    'new_api_key' => $instance->api_key ? '***' : null
                ]
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 18. Update the evolution_api_url for a company.
     */
    public function updateCompanyEvolutionUrl(string $companyId, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'url' => 'nullable|url|max:500',
            ]);

            $newUrl = $validated['url'] ?? config('evolution.api_url');

            $company = Company::findOrFail($companyId);
            $oldUrl = $company->evolution_api_url;

            $company->update(['evolution_api_url' => $newUrl]);

            return response()->json([
                'success' => true,
                'message' => "evolution_api_url actualizado",
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'old_url' => $oldUrl,
                    'new_url' => $company->evolution_api_url
                ]
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 19. Update Chatwoot account_id and/or inbox_id for a company.
     */
    public function updateCompanyChatwoot(string $companyId, Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'account_id' => 'nullable|integer|min:1',
                'inbox_id' => 'nullable|integer|min:1',
            ]);

            $accountId = $validated['account_id'] ?? null;
            $inboxId = $validated['inbox_id'] ?? null;

            if (!$accountId && !$inboxId) {
                return response()->json([
                    'success' => false,
                    'error' => 'Debe proporcionar account_id o inbox_id'
                ], 400);
            }

            $company = Company::findOrFail($companyId);

            $updates = [];
            $oldValues = [];

            if ($accountId) {
                $oldValues['chatwoot_account_id'] = $company->chatwoot_account_id;
                $updates['chatwoot_account_id'] = (int) $accountId;
            }

            if ($inboxId) {
                $oldValues['chatwoot_inbox_id'] = $company->chatwoot_inbox_id;
                $updates['chatwoot_inbox_id'] = (int) $inboxId;
            }

            $company->update($updates);
            $company->refresh();

            return response()->json([
                'success' => true,
                'message' => "Datos de Chatwoot actualizados para company {$company->name}",
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'slug' => $company->slug,
                    'old_values' => $oldValues,
                    'new_values' => [
                        'chatwoot_account_id' => $company->chatwoot_account_id,
                        'chatwoot_inbox_id' => $company->chatwoot_inbox_id
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 20. Full repair of a WhatsApp instance: creates instance record, n8n workflow,
     *     configures Evolution webhook, and Chatwoot webhook.
     */
    public function repairInstance(Request $request, string $instanceName): JsonResponse
    {
        try {
            $evolutionApi = app(EvolutionApiService::class);
            $chatwootService = app(ChatwootService::class);
            $n8nService = app(N8nService::class);

            $repairs = [];
            $appUrl = config('app.url');

            // 1. Buscar o crear instancia en BD
            $instance = WhatsAppInstance::where('instance_name', $instanceName)->first();

            if (!$instance) {
                // Buscar company por slug del instanceName, no usar default 1
                $company = Company::where('slug', $instanceName)->first();
                $companyId = $company ? $company->id : $request->input('company_id');

                if (!$companyId) {
                    return response()->json([
                        'success' => false,
                        'error' => "No se encontró empresa para el slug: {$instanceName}. Verifica que la empresa exista."
                    ], 400);
                }

                $instance = WhatsAppInstance::create([
                    'instance_name' => $instanceName,
                    'company_id' => $companyId,
                    'instance_url' => config('evolution.api_url'),
                    'is_active' => true,
                ]);
                $repairs[] = "Created instance record with company_id: {$companyId}";
            }

            // 2. Verificar/crear workflow en n8n si no existe
            if (empty($instance->n8n_workflow_id)) {
                Log::debug("Repair: Creating n8n workflow for {$instanceName}");

                // Obtener company
                $company = Company::find($instance->company_id);
                $companySlug = $company ? $company->slug : $instanceName;

                // Cargar template y crear workflow
                $templatePath = base_path('workflows/withmia-bot-template.json');
                if (file_exists($templatePath)) {
                    $content = file_get_contents($templatePath);
                    $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
                    $templateWorkflow = json_decode($content, true);

                    if ($templateWorkflow) {
                        // Reemplazar placeholders
                        $templateJson = json_encode($templateWorkflow);
                        $replacements = [
                            '{{COMPANY_SLUG}}' => $companySlug,
                            '{{COMPANY_NAME}}' => $company->name ?? $instanceName,
                            '{{ASSISTANT_NAME}}' => $company->assistant_name ?? 'MIA',
                            '{{INSTANCE_NAME}}' => $instanceName,
                            '{{APP_URL}}' => $appUrl,
                            '{{EVOLUTION_API_URL}}' => config('evolution.api_url'),
                            '{{EVOLUTION_API_KEY}}' => config('evolution.api_key'),
                            '{{QDRANT_URL}}' => config('qdrant.url'),
                        ];
                        foreach ($replacements as $placeholder => $value) {
                            $templateJson = str_replace($placeholder, $value, $templateJson);
                        }
                        $templateWorkflow = json_decode($templateJson, true);

                        // Configurar webhook path
                        foreach ($templateWorkflow['nodes'] as &$node) {
                            if ($node['type'] === 'n8n-nodes-base.webhook') {
                                $node['parameters']['path'] = $instanceName;
                                $node['webhookId'] = Str::uuid()->toString();
                            }
                        }

                        $templateWorkflow['name'] = "WITHMIA Bot - {$instanceName}";
                        unset($templateWorkflow['id'], $templateWorkflow['versionId']);

                        $result = $n8nService->createWorkflow($templateWorkflow);

                        if ($result['success']) {
                            $workflowId = $result['data']['id'];
                            $webhookUrl = $n8nService->getWebhookUrl($instanceName);

                            // Activar workflow
                            $n8nService->activateWorkflow($workflowId);

                            // Actualizar BD
                            $instance->update([
                                'n8n_workflow_id' => $workflowId,
                                'n8n_webhook_url' => $webhookUrl,
                            ]);

                            $repairs[] = "Created n8n workflow (ID: {$workflowId})";
                            $repairs[] = "Webhook URL: {$webhookUrl}";

                            // Recargar instancia
                            $instance->refresh();
                        } else {
                            $repairs[] = "ERROR creating workflow: " . ($result['error'] ?? 'Unknown');
                        }
                    }
                }
            } else {
                $repairs[] = "Workflow already exists (ID: {$instance->n8n_workflow_id})";
            }

            // 3. Configurar webhook de Evolution hacia nuestra app
            $evolutionWebhookUrl = "{$appUrl}/api/evolution-whatsapp/webhook";
            $webhookResult = $evolutionApi->setWebhook($instanceName, $evolutionWebhookUrl);
            if ($webhookResult['success']) {
                $repairs[] = "Configured Evolution webhook to: {$evolutionWebhookUrl}";
            } else {
                $repairs[] = "ERROR configuring Evolution webhook: " . ($webhookResult['error'] ?? 'Unknown');
            }

            // 4. Buscar inbox en Chatwoot y configurar webhook
            $inbox = $chatwootService->findInboxByName($instanceName);
            if ($inbox) {
                $inboxId = $inbox['id'];

                // Actualizar inbox_id en BD si no estaba
                if (empty($instance->chatwoot_inbox_id)) {
                    $instance->update([
                        'chatwoot_inbox_id' => $inboxId,
                    ]);
                    $repairs[] = "Updated chatwoot_inbox_id in local DB: {$inboxId}";
                }

                // Configurar webhook en Chatwoot apuntando a LARAVEL (no directamente a n8n)
                $laravelWebhookUrl = "{$appUrl}/api/chatwoot/webhook/" . preg_replace('/^WhatsApp\s+/i', '', $inbox['name'] ?? $instanceName);
                $chatwootWebhookResult = $chatwootService->configureInboxWebhook($inboxId, $laravelWebhookUrl);

                if ($chatwootWebhookResult['success']) {
                    $repairs[] = "Configured Chatwoot webhook for inbox {$inboxId} to: {$laravelWebhookUrl} (via Laravel enrichment)";
                } else {
                    $repairs[] = "ERROR configuring Chatwoot webhook: " . ($chatwootWebhookResult['error'] ?? 'Unknown');
                }
            } else {
                $repairs[] = "WARNING: Inbox not found in Chatwoot for instance {$instanceName}";
            }

            return response()->json([
                'success' => true,
                'instance_name' => $instanceName,
                'repairs_made' => $repairs,
                'message' => 'Repair process completed. Check repairs_made for details.'
            ]);

        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 21. List all Chatwoot webhooks.
     */
    public function listChatwootWebhooks(): JsonResponse
    {
        try {
            $chatwootService = app(ChatwootService::class);
            $result = $chatwootService->listWebhooks();
            return response()->json($result);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 22. Migrate Chatwoot webhooks to use Laravel routing.
     */
    public function migrateChatwootWebhooks(): JsonResponse
    {
        try {
            $chatwootService = app(ChatwootService::class);
            $result = $chatwootService->migrateWebhooksToLaravel();
            return response()->json($result);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * 23. Chatwoot debug — query inboxes, conversations, and messages via DB::connection('chatwoot').
     */
    public function chatwootDebug(): JsonResponse
    {
        try {
            $user = auth()->user();
            $company = $user?->company;
            $accountId = (int) ($company?->chatwoot_account_id ?? config('chatwoot.account_id', 1));

            $chatwootDb = DB::connection('chatwoot');

            // Scoped to user's company account
            $inboxes = $chatwootDb->select(
                'SELECT id, name, channel_type, account_id FROM inboxes WHERE account_id = ?',
                [$accountId]
            );

            $conversations = $chatwootDb->select(
                'SELECT id, inbox_id, status, created_at FROM conversations WHERE account_id = ? ORDER BY created_at DESC LIMIT 5',
                [$accountId]
            );

            $messages = $chatwootDb->select(
                'SELECT m.id, m.content, m.message_type, m.created_at, m.conversation_id FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.account_id = ? ORDER BY m.created_at DESC LIMIT 10',
                [$accountId]
            );

            return response()->json([
                'success' => true,
                'account_id' => $accountId,
                'inboxes' => $inboxes,
                'recent_conversations' => $conversations,
                'recent_messages' => $messages
            ]);

        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Load and decode the RAG text-processor template.
     *
     * @return array|JsonResponse The decoded template array, or a JsonResponse on failure.
     */
    private function loadRagTemplate(): array|JsonResponse
    {
        $templatePath = base_path('workflows/rag-text-processor.json');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $content = file_get_contents($templatePath);
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $template = json_decode($content, true);

        if (!$template) {
            return response()->json(['error' => 'Invalid template JSON: ' . json_last_error_msg()], 500);
        }

        return $template;
    }

    /**
     * 🧹 Flush de memoria de conversación del bot para una empresa.
     * Útil cuando cambia el nombre del asistente u otros datos de identidad.
     * POST /api/flush-conversation-memory/{companySlug}
     */
    public function flushConversationMemory(string $companySlug, Request $request): JsonResponse
    {
        $company = Company::where('slug', $companySlug)->first();
        
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        $memoryService = app(ConversationMemoryService::class);

        // Diagnóstico antes del flush
        $diagnosticsBefore = $memoryService->getDiagnostics($company);

        // Ejecutar flush
        $result = $memoryService->flushOnIdentityChange(
            $company,
            $request->input('old_value', $company->assistant_name),
            $request->input('new_value', $company->assistant_name),
            $request->input('field', 'assistant_name')
        );

        // Opcionalmente, fortalecer el system prompt
        $promptStrengthened = false;
        if ($request->boolean('strengthen_prompt', true)) {
            $promptStrengthened = $memoryService->strengthenSystemPrompt($company);
        }

        // Diagnóstico después del flush
        $diagnosticsAfter = $memoryService->getDiagnostics($company);

        return response()->json([
            'success' => true,
            'message' => 'Flush de memoria de conversación completado',
            'result' => $result,
            'prompt_strengthened' => $promptStrengthened,
            'diagnostics' => [
                'before' => $diagnosticsBefore,
                'after' => $diagnosticsAfter,
            ],
        ]);
    }

    /**
     * 🔍 Diagnóstico de memoria de conversación del bot.
     * GET /api/conversation-memory-diagnostics/{companySlug}
     */
    public function conversationMemoryDiagnostics(string $companySlug): JsonResponse
    {
        $company = Company::where('slug', $companySlug)->first();
        
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        $memoryService = app(ConversationMemoryService::class);
        $diagnostics = $memoryService->getDiagnostics($company);

        return response()->json([
            'success' => true,
            'company' => $companySlug,
            'assistant_name' => $company->assistant_name,
            'diagnostics' => $diagnostics,
        ]);
    }

    /**
     * Patch ALL active WITHMIA Bot workflows in n8n with targeted fixes:
     * 1. Get Imagen/Get Audio: message.message_id → message.source_id
     * 2. pregunta_usuario: response → chat_input + include:none (fix 3-keys memory error)
     */
    public function patchAllBotWorkflows(): JsonResponse
    {
        try {
            $n8nService = app(N8nService::class);
            $workflows = $n8nService->getWorkflows();

            if (!$workflows['success']) {
                return response()->json(['error' => 'Failed to list n8n workflows'], 500);
            }

            $results = [];
            $botWorkflows = collect($workflows['data'])
                ->filter(fn($wf) => str_starts_with($wf['name'] ?? '', 'WITHMIA Bot'));

            foreach ($botWorkflows as $wf) {
                $workflowId = $wf['id'];
                $workflowName = $wf['name'];
                $patches = [];

                try {
                    $detail = $n8nService->getWorkflow($workflowId);
                    if (!$detail['success']) {
                        $results[$workflowName] = ['success' => false, 'error' => 'Could not fetch workflow'];
                        continue;
                    }

                    $workflow = $detail['data'];
                    $modified = false;

                    foreach ($workflow['nodes'] as &$node) {
                        // Fix 1: Get Imagen / Get Audio — message.message_id → message.source_id
                        if (in_array($node['name'], ['Get Imagen', 'Get Audio'])) {
                            $body = $node['parameters']['body'] ?? '';
                            if (is_string($body) && str_contains($body, 'message.message_id')) {
                                $node['parameters']['body'] = str_replace('message.message_id', 'message.source_id', $body);
                                $patches[] = "{$node['name']}: message_id→source_id";
                                $modified = true;
                            }

                            // Also check sendBody/bodyParameters for structured format
                            if (isset($node['parameters']['bodyParameters']['parameters'])) {
                                foreach ($node['parameters']['bodyParameters']['parameters'] as &$param) {
                                    if (isset($param['value']) && is_string($param['value']) && str_contains($param['value'], 'message.message_id')) {
                                        $param['value'] = str_replace('message.message_id', 'message.source_id', $param['value']);
                                        $patches[] = "{$node['name']}: bodyParam message_id→source_id";
                                        $modified = true;
                                    }
                                }
                            }
                        }

                        // Fix 2: pregunta_usuario — response → chat_input + include:none
                        if ($node['name'] === 'pregunta_usuario') {
                            $assignments = $node['parameters']['assignments']['assignments'] ?? [];
                            foreach ($assignments as &$assignment) {
                                if (($assignment['name'] ?? '') === 'response') {
                                    $assignment['name'] = 'chat_input';
                                    $patches[] = 'pregunta_usuario: response→chat_input';
                                    $modified = true;
                                }
                            }
                            $node['parameters']['assignments']['assignments'] = $assignments;

                            // Add include:none to strip extra keys
                            $options = $node['parameters']['options'] ?? [];
                            if (is_array($options) && !isset($options['include'])) {
                                $node['parameters']['options'] = ['include' => 'none'];
                                $patches[] = 'pregunta_usuario: added include:none';
                                $modified = true;
                            }
                        }
                    }

                    if ($modified) {
                        // Clean and push back
                        $cleanNodes = [];
                        foreach ($workflow['nodes'] as $n) {
                            if (!isset($n['parameters']) || $n['parameters'] === null ||
                                (is_array($n['parameters']) && empty($n['parameters']) && array_keys($n['parameters']) === [])) {
                                $n['parameters'] = new \stdClass();
                            }
                            $cleanNodes[] = $n;
                        }

                        $updatePayload = [
                            'name' => $workflow['name'],
                            'nodes' => $cleanNodes,
                            'connections' => $workflow['connections'],
                            'settings' => $workflow['settings'] ?? new \stdClass(),
                        ];

                        $result = $n8nService->updateWorkflow($workflowId, $updatePayload);

                        if ($result['success']) {
                            // Re-activate
                            if ($wf['active'] ?? false) {
                                $n8nService->activateWorkflow($workflowId);
                            }
                            $results[$workflowName] = ['success' => true, 'patches' => $patches];
                        } else {
                            $results[$workflowName] = ['success' => false, 'error' => $result['error'] ?? 'Update failed', 'patches_attempted' => $patches];
                        }
                    } else {
                        $results[$workflowName] = ['success' => true, 'patches' => [], 'message' => 'Already up to date'];
                    }
                } catch (\Exception $e) {
                    $results[$workflowName] = ['success' => false, 'error' => $e->getMessage()];
                }
            }

            return response()->json([
                'success' => true,
                'total_bot_workflows' => $botWorkflows->count(),
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Patch all WITHMIA Bot workflows to enforce strict RAG-only responses.
     * Updates: system prompt (strict), tool description (mandatory), topK (5→10).
     */
    public function patchBotStrictRag(): JsonResponse
    {
        try {
            $n8nService = app(N8nService::class);
            $workflows = $n8nService->getWorkflows();

            if (!$workflows['success']) {
                return response()->json(['error' => 'Failed to list n8n workflows'], 500);
            }

            $results = [];
            $botWorkflows = collect($workflows['data'])
                ->filter(fn($wf) => str_starts_with($wf['name'] ?? '', 'WITHMIA Bot'));

            // New strict system prompt
            $newPromptText = "=Eres {{ \$('Normalize Data').item.json.config.assistant_name }}, el asistente virtual de {{ \$('Normalize Data').item.json.config.company_name }}.\n\n"
                . "TU IDENTIDAD:\n"
                . "- Tu nombre es {{ \$('Normalize Data').item.json.config.assistant_name }}\n"
                . "- Cuando te pregunten como te llamas, responde que te llamas {{ \$('Normalize Data').item.json.config.assistant_name }}\n"
                . "- Eres el asistente de {{ \$('Normalize Data').item.json.config.company_name }}\n\n"
                . "REGLA FUNDAMENTAL (OBLIGATORIO):\n"
                . "- SIEMPRE debes usar la herramienta \"Buscar en Base de Conocimientos\" ANTES de responder CUALQUIER pregunta del usuario, sin excepcion\n"
                . "- UNICAMENTE puedes responder con informacion que encuentres en los resultados de esa busqueda\n"
                . "- JAMAS inventes, supongas, improvises o uses conocimiento general de tu entrenamiento\n"
                . "- Si la busqueda NO devuelve informacion relevante sobre lo que pregunta el usuario, responde EXACTAMENTE: \"No tengo esa informacion disponible. Te gustaria que te conecte con alguien del equipo para ayudarte?\"\n"
                . "- No mezcles informacion de la base de conocimientos con informacion que imagines o sepas por entrenamiento general\n"
                . "- Cada respuesta tuya DEBE estar respaldada por informacion encontrada en la busqueda\n\n"
                . "ESTILO DE RESPUESTA:\n"
                . "- Respondes como si respondieras por redes sociales: natural, cercano y directo\n"
                . "- Maximo 2-3 oraciones por respuesta\n"
                . "- Amigable y profesional\n\n"
                . "PROHIBICIONES ABSOLUTAS:\n"
                . "- PROHIBIDO responder con informacion que NO provenga de tu base de conocimientos\n"
                . "- PROHIBIDO inventar datos sobre la empresa, productos, servicios, precios, horarios o cualquier otro dato\n"
                . "- NO te presentes dos veces en la conversacion\n"
                . "- NO uses markdown ni formato especial\n"
                . "- NO respondas en bloques largos\n"
                . "- NO uses puntos suspensivos (...)\n"
                . "- NO uses asteriscos ni negritas\n\n"
                . "Fecha: {{ \$now.format('dd MMM. yyyy', 'es') }}\n"
                . "Nombre del usuario: {{ \$('Normalize Data').item.json.user.name }}\n"
                . "Numero: {{ \$('Normalize Data').item.json.message.chat_id }}\n"
                . "Tipo de mensaje: {{ \$('Normalize Data').item.json.message.content_type }}\n\n"
                . "Mensaje:\n={{ \$json.chat_input }}";

            // New mandatory tool description
            $newToolDesc = "=HERRAMIENTA OBLIGATORIA. Debes usar esta herramienta SIEMPRE para CADA pregunta del usuario, ANTES de formular tu respuesta. "
                . "Busca informacion en la base de conocimientos de {{ \$('Normalize Data').item.json.config.company_name }}. "
                . "Contiene TODA la informacion oficial sobre productos, servicios, horarios, precios y datos de la empresa. "
                . "Si esta herramienta no devuelve resultados relevantes, indica que no tienes esa informacion disponible. "
                . "NUNCA respondas sin consultar esta herramienta primero.";

            foreach ($botWorkflows as $wf) {
                $workflowId = $wf['id'];
                $workflowName = $wf['name'];
                $patches = [];

                try {
                    $detail = $n8nService->getWorkflow($workflowId);
                    if (!$detail['success']) {
                        $results[$workflowName] = ['success' => false, 'error' => 'Could not fetch workflow'];
                        continue;
                    }

                    $workflow = $detail['data'];
                    $modified = false;

                    foreach ($workflow['nodes'] as &$node) {
                        // Patch 1: AI Agent — update system prompt
                        if ($node['name'] === 'AI Agent' && ($node['type'] ?? '') === '@n8n/n8n-nodes-langchain.agent') {
                            $node['parameters']['text'] = $newPromptText;
                            $patches[] = 'AI Agent: strict RAG-only prompt';
                            $modified = true;
                        }

                        // Patch 2: Qdrant tool — update description + topK
                        if ($node['name'] === 'Buscar en Base de Conocimientos' && ($node['type'] ?? '') === '@n8n/n8n-nodes-langchain.vectorStoreQdrant') {
                            $node['parameters']['toolDescription'] = $newToolDesc;
                            $node['parameters']['topK'] = 10;
                            $patches[] = 'Qdrant tool: mandatory description + topK=10';
                            $modified = true;
                        }
                    }

                    if ($modified) {
                        $cleanNodes = [];
                        foreach ($workflow['nodes'] as $n) {
                            if (!isset($n['parameters']) || $n['parameters'] === null ||
                                (is_array($n['parameters']) && empty($n['parameters']))) {
                                $n['parameters'] = new \stdClass();
                            }
                            $cleanNodes[] = $n;
                        }

                        $updatePayload = [
                            'name' => $workflow['name'],
                            'nodes' => $cleanNodes,
                            'connections' => $workflow['connections'],
                            'settings' => $workflow['settings'] ?? new \stdClass(),
                        ];

                        $result = $n8nService->updateWorkflow($workflowId, $updatePayload);

                        if ($result['success']) {
                            if ($wf['active'] ?? false) {
                                $n8nService->activateWorkflow($workflowId);
                            }
                            $results[$workflowName] = ['success' => true, 'patches' => $patches];
                        } else {
                            $results[$workflowName] = ['success' => false, 'error' => $result['error'] ?? 'Update failed', 'patches_attempted' => $patches];
                        }
                    } else {
                        $results[$workflowName] = ['success' => true, 'patches' => [], 'message' => 'No AI Agent / Qdrant nodes found'];
                    }
                } catch (\Exception $e) {
                    $results[$workflowName] = ['success' => false, 'error' => $e->getMessage()];
                }
            }

            return response()->json([
                'success' => true,
                'total_bot_workflows' => $botWorkflows->count(),
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Fix company owners with wrong role (should be 'admin', not 'user').
     */
    public function fixOwnerRoles(): JsonResponse
    {
        $fixed = DB::table('users')
            ->where('role', 'user')
            ->whereNotNull('company_slug')
            ->where('onboarding_completed', true)
            ->whereIn('id', DB::table('companies')->select('user_id'))
            ->update(['role' => 'admin']);

        return response()->json([
            'fixed' => $fixed,
            'message' => "Updated {$fixed} company owners from 'user' to 'admin' role",
        ]);
    }
}
