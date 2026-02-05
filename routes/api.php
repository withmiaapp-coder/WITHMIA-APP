<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Http\Request;
use App\Http\Controllers\OnboardingApiController;
use App\Http\Controllers\Api\ChatwootController;
use App\Events\NewMessageReceived;

// 🔧 DEBUG: Ver configuración de Chatwoot por empresa (temporal)

// ⚠️ RUTAS PELIGROSAS ELIMINADAS - Usar comandos Artisan en su lugar:
// php artisan chatwoot:setup-workflow {companySlug}
// php artisan migrate:workflows

// 🛠 SETUP TRAINING WORKFLOW - Protegido con middleware admin
Route::middleware(['auth:sanctum'])->get('/setup-training-workflow/{companySlug}', function ($companySlug, Request $request) {
    // Solo admins pueden ejecutar esto
    if (!$request->user() || $request->user()->role !== 'admin') {
        return response()->json(['error' => 'Unauthorized'], 403);
    }
    
    try {
        $company = \App\Models\Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }
        
        // Usar CreateN8nWorkflowsJob para crear workflows dinámicamente
        \App\Jobs\CreateN8nWorkflowsJob::dispatchSync($company->id, $companySlug);
        
        return response()->json([
            'success' => true,
            'message' => "Training workflow configurado para {$companySlug}",
            'settings' => $company->fresh()->settings
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// ?? FIX: Cambiar logo_url a TEXT para soportar base64

// 🔄 MIGRACIÓN: Actualizar workflows de n8n de whatsapp-{slug} a withmia-{slug}
Route::get('/migrate-workflows-to-withmia', function () {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $results = [];
        $chatwootUrl = config('chatwoot.url');
        $chatwootToken = config('chatwoot.platform_token');
        
        // 1. Obtener todos los workflows de n8n
        $workflowsResult = $n8nService->getWorkflows();
        if (!$workflowsResult['success']) {
            return response()->json(['error' => 'No se pudieron obtener workflows de n8n'], 500);
        }
        
        $workflows = $workflowsResult['data'] ?? [];
        Log::debug('🔄 Iniciando migración de workflows', ['total' => count($workflows)]);
        
        foreach ($workflows as $workflow) {
            $workflowId = $workflow['id'];
            $workflowName = $workflow['name'] ?? '';
            
            // Solo migrar workflows de WhatsApp Bot
            if (!str_contains($workflowName, 'WhatsApp Bot') && !str_contains($workflowName, 'WITHMIA Bot')) {
                continue;
            }
            
            // Obtener workflow completo
            $fullWorkflow = $n8nService->getWorkflow($workflowId);
            if (!$fullWorkflow['success']) {
                $results[] = ['workflow_id' => $workflowId, 'status' => 'error', 'message' => 'No se pudo obtener'];
                continue;
            }
            
            $workflowData = $fullWorkflow['data'];
            $needsUpdate = false;
            $oldWebhookPath = null;
            $newWebhookPath = null;
            
            // Buscar y actualizar nodos webhook
            foreach ($workflowData['nodes'] as &$node) {
                if ($node['type'] === 'n8n-nodes-base.webhook') {
                    $currentPath = $node['parameters']['path'] ?? '';
                    
                    // Si usa el patrón viejo whatsapp-{slug}
                    if (str_starts_with($currentPath, 'whatsapp-')) {
                        $slug = str_replace('whatsapp-', '', $currentPath);
                        $oldWebhookPath = $currentPath;
                        $newWebhookPath = "withmia-{$slug}";
                        
                        $node['parameters']['path'] = $newWebhookPath;
                        $node['name'] = 'WITHMIA Webhook';
                        $node['id'] = 'webhook-withmia';
                        $needsUpdate = true;
                        
                        Log::debug("🔄 Actualizando webhook path", [
                            'workflow_id' => $workflowId,
                            'old_path' => $oldWebhookPath,
                            'new_path' => $newWebhookPath
                        ]);
                    }
                }
            }
            
            if (!$needsUpdate) {
                $results[] = ['workflow_id' => $workflowId, 'name' => $workflowName, 'status' => 'skipped', 'message' => 'Ya usa withmia- o no es WhatsApp Bot'];
                continue;
            }
            
            // Actualizar nombre del workflow
            $workflowData['name'] = str_replace('WhatsApp Bot', 'WITHMIA Bot', $workflowData['name']);
            
            // Desactivar antes de actualizar
            $n8nService->deactivateWorkflow($workflowId);
            
            // Actualizar workflow en n8n
            $updateResult = $n8nService->updateWorkflow($workflowId, $workflowData);
            
            if ($updateResult['success']) {
                // Reactivar workflow
                $n8nService->activateWorkflow($workflowId);
                
                // Extraer slug del path
                $slug = str_replace('withmia-', '', $newWebhookPath);
                
                // Actualizar whatsapp_instances
                $n8nBaseUrl = config('services.n8n.base_url');
                DB::table('whatsapp_instances')
                    ->where('instance_name', $slug)
                    ->orWhere('n8n_workflow_id', $workflowId)
                    ->update([
                        'n8n_webhook_url' => "{$n8nBaseUrl}/webhook/{$newWebhookPath}",
                        'updated_at' => now()
                    ]);
                
                // Actualizar webhook de Chatwoot si existe
                if ($chatwootUrl && $chatwootToken) {
                    try {
                        // Buscar company por slug
                        $company = \App\Models\Company::where('slug', $slug)->first();
                        if ($company && $company->chatwoot_account_id) {
                            // Obtener webhooks existentes
                            $webhooksResponse = \Illuminate\Support\Facades\Http::withHeaders([
                                'api_access_token' => $chatwootToken
                            ])->get("{$chatwootUrl}/api/v1/accounts/{$company->chatwoot_account_id}/webhooks");
                            
                            if ($webhooksResponse->successful()) {
                                $webhooks = $webhooksResponse->json('payload.webhooks', []);
                                foreach ($webhooks as $webhook) {
                                    // Si el webhook apunta al path viejo
                                    if (str_contains($webhook['url'] ?? '', $oldWebhookPath)) {
                                        $n8nBaseUrl = config('services.n8n.base_url');
                                        $newWebhookUrl = "{$n8nBaseUrl}/webhook/{$newWebhookPath}";
                                        
                                        \Illuminate\Support\Facades\Http::withHeaders([
                                            'api_access_token' => $chatwootToken,
                                            'Content-Type' => 'application/json'
                                        ])->patch("{$chatwootUrl}/api/v1/accounts/{$company->chatwoot_account_id}/webhooks/{$webhook['id']}", [
                                            'url' => $newWebhookUrl
                                        ]);
                                        
                                        Log::debug("✅ Chatwoot webhook actualizado", [
                                            'webhook_id' => $webhook['id'],
                                            'new_url' => $newWebhookUrl
                                        ]);
                                    }
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning("⚠️ No se pudo actualizar Chatwoot webhook", ['error' => $e->getMessage()]);
                    }
                }
                
                $results[] = [
                    'workflow_id' => $workflowId,
                    'name' => $workflowData['name'],
                    'status' => 'migrated',
                    'old_path' => $oldWebhookPath,
                    'new_path' => $newWebhookPath
                ];
            } else {
                // Reactivar aunque haya fallado
                $n8nService->activateWorkflow($workflowId);
                $results[] = [
                    'workflow_id' => $workflowId,
                    'name' => $workflowName,
                    'status' => 'error',
                    'message' => $updateResult['error'] ?? 'Error desconocido'
                ];
            }
        }
        
        $migrated = count(array_filter($results, fn($r) => $r['status'] === 'migrated'));
        $skipped = count(array_filter($results, fn($r) => $r['status'] === 'skipped'));
        $errors = count(array_filter($results, fn($r) => $r['status'] === 'error'));
        
        return response()->json([
            'success' => true,
            'summary' => [
                'total_workflows' => count($workflows),
                'migrated' => $migrated,
                'skipped' => $skipped,
                'errors' => $errors
            ],
            'results' => $results
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error en migración de workflows', ['error' => $e->getMessage()]);
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// ?? REGENERAR TOKEN DE CHATWOOT - Crea un nuevo access_token v�lido para el usuario
Route::get('/regenerate-chatwoot-token/{userId}', function ($userId) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        
        // Obtener usuario de Laravel
        $user = \App\Models\User::find($userId);
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
        $newToken = \Illuminate\Support\Str::random(24);
        
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
        
        Log::debug('? Token de Chatwoot regenerado', [
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
            'new_token' => $newToken
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error regenerando token de Chatwoot', [
            'user_id' => $userId,
            'error' => $e->getMessage()
        ]);
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
});

// ?? VERIFICAR ESTADO COMPLETO DE UN USUARIO EN CHATWOOT

// ??? FIX TEMPORAL: Arreglar usuarios sin inbox_id

// ⛔ RUTAS PELIGROSAS ELIMINADAS EN PRODUCCIÓN
// Las siguientes rutas fueron eliminadas por seguridad:
// - /create-chatwoot-superadmin/{email}/{password} → Usar: php artisan chatwoot:create-admin
// - /reset-all-databases/{confirm} → Usar: php artisan migrate:fresh (con precaución)
// - /truncate-all-tables → ELIMINADO
// - /wipe-database → ELIMINADO
// Estas operaciones solo deben ejecutarse vía CLI en entornos controlados.

// ? DIAGNOSTICAR INBOXES DE CHATWOOT - Ver configuraci�n actual

// ?? ARREGLAR WEBHOOK DEL INBOX - Quitar el webhook inv�lido a Evolution

// ??? Actualizar workflow RAG existente con el nuevo template
Route::get('/update-rag-workflow/{companySlug}', function ($companySlug) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $qdrantService = app(\App\Services\QdrantService::class);
        
        // Cargar template actualizado
        $templatePath = base_path('workflows/rag-text-processor.json');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Template not found'], 404);
        }
        
        $content = file_get_contents($templatePath);
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $templateWorkflow = json_decode($content, true);
        
        if (!$templateWorkflow) {
            return response()->json(['error' => 'Invalid template JSON: ' . json_last_error_msg()], 500);
        }
        
        // Personalizar para la empresa
        $collectionName = $qdrantService->getCollectionName($companySlug);
        $webhookPath = "rag-{$companySlug}";
        $newWebhookId = \Illuminate\Support\Str::uuid()->toString();
        
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
                'webhook_url' => config('services.n8n.base_url') . "/webhook/{$webhookPath}"
            ]);
        }
        
        return response()->json(['error' => $result['error'] ?? 'Unknown error'], 500);
        
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// ?? Actualizar TODOS los workflows RAG de todas las empresas
Route::get('/update-all-rag-workflows', function () {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $qdrantService = app(\App\Services\QdrantService::class);
        
        // Cargar template actualizado
        $templatePath = base_path('workflows/rag-text-processor.json');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Template not found'], 404);
        }
        
        $content = file_get_contents($templatePath);
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $templateWorkflow = json_decode($content, true);
        
        if (!$templateWorkflow) {
            return response()->json(['error' => 'Invalid template JSON'], 500);
        }
        
        // Obtener todas las empresas
        $companies = \App\Models\Company::all();
        $results = [];
        
        foreach ($companies as $company) {
            $companySlug = $company->slug;
            
            try {
                // Personalizar para la empresa
                $collectionName = $qdrantService->getCollectionName($companySlug);
                $webhookPath = "rag-{$companySlug}";
                $newWebhookId = \Illuminate\Support\Str::uuid()->toString();
                
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
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// Helper para workflow minimalista
if (!function_exists('getMinimalWorkflow')) {
    function getMinimalWorkflow(string $instanceName): array {
        // instanceName ya tiene formato "withmia-{slug}", usarlo directamente
        $webhookPath = $instanceName;
        return [
            'name' => "WITHMIA Bot - {$instanceName}",
            'nodes' => [
                [
                    'parameters' => [
                        'path' => $webhookPath,
                        'httpMethod' => 'POST',
                        'responseMode' => 'onReceived',
                        'responseData' => 'allEntries'
                    ],
                    'type' => 'n8n-nodes-base.webhook',
                    'typeVersion' => 2,
                    'position' => [0, 0],
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'name' => 'Webhook WITHMIA',
                    'webhookId' => \Illuminate\Support\Str::uuid()->toString()
                ]
            ],
            'connections' => new \stdClass(),
            'settings' => ['executionOrder' => 'v1']
        ];
    }
}

// ?? RESETEAR WORKFLOW PARA PRUEBAS (limpiar n8n_workflow_id)
Route::get('/reset-workflow/{instanceName}', function ($instanceName) {
    $updated = \Illuminate\Support\Facades\DB::table('whatsapp_instances')
        ->where('instance_name', $instanceName)
        ->update([
            'n8n_workflow_id' => null,
            'n8n_webhook_url' => null,
            'updated_at' => now()
        ]);
    
    return response()->json([
        'success' => $updated > 0,
        'message' => $updated > 0 ? 'Workflow reset successfully' : 'No instance found'
    ]);
});

// 🧹 LIMPIAR MENSAJES DE SISTEMA DE CHATWOOT

// ?? ACTUALIZAR WORKFLOW (fijar n8n_workflow_id y n8n_webhook_url)
Route::post('/update-workflow/{instanceName}', function ($instanceName, \Illuminate\Http\Request $request) {
    $workflowId = $request->input('n8n_workflow_id');
    $webhookUrl = $request->input('n8n_webhook_url');
    
    $updateData = ['updated_at' => now()];
    if ($workflowId) $updateData['n8n_workflow_id'] = $workflowId;
    if ($webhookUrl) $updateData['n8n_webhook_url'] = $webhookUrl;
    
    $updated = \Illuminate\Support\Facades\DB::table('whatsapp_instances')
        ->where('instance_name', $instanceName)
        ->update($updateData);
    
    $instance = \Illuminate\Support\Facades\DB::table('whatsapp_instances')
        ->where('instance_name', $instanceName)
        ->first();
    
    return response()->json([
        'success' => $updated > 0,
        'message' => $updated > 0 ? 'Workflow updated successfully' : 'No instance found',
        'instance' => $instance
    ]);
});

// 🔧 DEBUG: Ver y gestionar bot-state en Redis (para human takeover)
Route::get('/debug/bot-state/{phone}', function ($phone) {
    try {
        $redis = \Illuminate\Support\Facades\Redis::connection('n8n');
        $value = $redis->get($phone);
        $ttl = $redis->ttl($phone);
        
        return response()->json([
            'phone' => $phone,
            'value' => $value,
            'ttl_seconds' => $ttl,
            'ttl_human' => $ttl > 0 ? gmdate('H:i:s', $ttl) : 'expired/not-set'
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::delete('/debug/bot-state/{phone}', function ($phone) {
    try {
        $redis = \Illuminate\Support\Facades\Redis::connection('n8n');
        $deleted = $redis->del($phone);
        
        return response()->json([
            'phone' => $phone,
            'deleted' => $deleted > 0,
            'message' => $deleted > 0 ? 'Bot reactivado - key eliminada' : 'Key no existía'
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// ?? DEBUG: Ver usuarios en la base de datos

// ?? DEBUG: Ver tokens de usuarios

// ?? DEBUG: Session info

// ?? DEBUG: Limpiar cach� de Redis
Route::get('/clear-all-cache', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('cache:clear');
        \Illuminate\Support\Facades\Artisan::call('config:clear');
        return response()->json([
            'success' => true,
            'message' => 'Cache cleared'
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// ⛔ RUTAS ELIMINADAS: /truncate-all-tables, /run-migrations, /wipe-database
// Usar comandos Artisan directamente en el servidor

// ?? CLEANUP TEST DATA - Keep only specified company

// ? ACTIVAR WORKFLOW n8n
Route::get('/activate-workflow/{workflowId}', function ($workflowId) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $result = $n8nService->activateWorkflow($workflowId);
        
        return response()->json([
            'workflow_id' => $workflowId,
            'result' => $result
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
});

// ?? ARREGLAR WORKFLOW EXISTENTE - Obtener, corregir nodos con error y actualizar

// ?? CREAR WORKFLOW MINIMALISTA (sin template JSON)
Route::get('/create-minimal-workflow/{instanceName}', function ($instanceName) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $evolutionApi = app(\App\Services\EvolutionApiService::class);
        
        // Usar workflow minimalista directamente
        $workflow = getMinimalWorkflow($instanceName);
        
        Log::debug('?? Creando workflow minimalista', ['name' => $workflow['name']]);
        
        // Crear en n8n
        $result = $n8nService->createWorkflow($workflow);
        
        if ($result['success']) {
            $workflowId = $result['data']['id'] ?? null;
            $webhookUrl = $n8nService->getWebhookUrl($instanceName);
            
            // Activar
            if ($workflowId) {
                $activateResult = $n8nService->activateWorkflow($workflowId);
                Log::debug('? Workflow activado', ['id' => $workflowId, 'result' => $activateResult]);
            }
            
            // Configurar webhook de Evolution hacia n8n
            $evolutionResult = $evolutionApi->setWebhook(
                $instanceName,
                $webhookUrl,
                ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
            );
            Log::debug('?? Webhook Evolution configurado', ['result' => $evolutionResult]);
            
            // Guardar en BD
            \Illuminate\Support\Facades\DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->update([
                    'n8n_workflow_id' => $workflowId,
                    'n8n_webhook_url' => $webhookUrl,
                    'updated_at' => now()
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
        Log::error('? Error creando workflow minimalista', ['error' => $e->getMessage()]);
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// ?? CREAR WORKFLOW N8N MANUALMENTE

// Health check endpoint for Railway
Route::get('/health', function () {
    try {
        // Verificar conexi�n a base de datos
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        
        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'app' => config('app.name'),
            'environment' => config('app.env'),
            'database' => 'connected'
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'unhealthy',
            'timestamp' => now()->toIso8601String(),
            'error' => $e->getMessage()
        ], 503);
    }
});

// ?? DEBUG: Test broadcast - Solo verificar que Pusher funciona (no crea conversaciones)

// Test endpoint using Laravel broadcast() function

// Test endpoint para simular mensaje REAL (sin flag test) - para debugging

// Habilitar autenticaci�n de canales de broadcasting

// ?? SETUP: Ver webhooks de Chatwoot existentes

// ?? RECREAR webhook de Chatwoot con ID=1 (elimina todos, resetea secuencia, crea nuevo)

// API routes go here - using dedicated API controller without auth

// Onboarding API route - no authentication required
Route::post('/onboarding', [OnboardingApiController::class, 'store'])
    ->name('api.onboarding.store');

// AI description improvement API route
Route::post('/improve-description', [OnboardingApiController::class, 'improveDescription'])
    ->name('api.improve.description');

// WhatsApp API route - no authentication required for testing

// User profile API (con cache)
Route::middleware(['web', 'auth'])->prefix('user')->group(function () {
    Route::get('/profile', function() {
        $userId = auth()->id();
        $cacheKey = "user:profile:{$userId}";
        
        // Cache por 5 minutos
        $data = \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function() {
            $user = auth()->user()->load('company');
            $inboxId = $user->chatwoot_inbox_id ?? $user->company?->chatwoot_inbox_id ?? null;
            
            return [
                'success' => true,
                'user' => $user,
                'chatwoot_inbox_id' => $inboxId
            ];
        });
        
        return response()->json($data);
    });
});

// Chatwoot Enterprise API routes - authenticated
Route::middleware([\App\Http\Middleware\RailwayAuthToken::class])->prefix('chatwoot-proxy')->group(function () {
    // Conversaciones
    Route::get('/conversations', [ChatwootController::class, 'getConversations']);
    Route::get('/conversations/export-all', [ChatwootController::class, 'exportAllConversationsWithMessages']);
    Route::get('/conversations/{id}', [ChatwootController::class, 'getConversation']);
    Route::get('/conversations/{id}/messages', [ChatwootController::class, 'getConversationMessages']);
    Route::delete('/conversations/{conversationId}', [ChatwootController::class, 'deleteConversation']);
    Route::post('/conversations/deduplicate-auto', [ChatwootController::class, 'deduplicateConversationsAuto']);
    Route::post('/conversations/{id}/messages', [ChatwootController::class, 'sendMessage']);
    Route::post('/conversations/{id}/update_last_seen', [ChatwootController::class, 'markAsRead']);
    
    // ============================================================================
    // DEDUPLICACIÓN V2 - Diagnóstico y fusión manual
    // ============================================================================
    Route::get('/duplicates/diagnosis', [ChatwootController::class, 'getDuplicatesDiagnosis']);
    Route::post('/duplicates/merge', [ChatwootController::class, 'forceMergeDuplicates']);
    
    // ============================================================================
    // ASIGNACIÓN Y ESTADO DE CONVERSACIONES
    // ============================================================================
    Route::post('/conversations/{id}/assignments', [ChatwootController::class, 'assignConversation']);
    Route::post('/conversations/{id}/status', [ChatwootController::class, 'changeConversationStatus']);
    Route::post('/conversations/{id}/labels', [ChatwootController::class, 'updateConversationLabels']);
    Route::get('/conversations/{id}/labels', [ChatwootController::class, 'getConversationLabels']);

    // ============================================================================
    // EQUIPOS - CRUD Completo
    // ============================================================================
    Route::get('/teams', [ChatwootController::class, 'getTeams']);
    Route::get('/teams/{teamId}', [ChatwootController::class, 'getTeam']);
    Route::post('/teams', [ChatwootController::class, 'createTeam']);
    Route::patch('/teams/{teamId}', [ChatwootController::class, 'updateTeam']);
    Route::delete('/teams/{teamId}', [ChatwootController::class, 'deleteTeam']);
    
    // Miembros de equipos
    Route::get('/teams/{teamId}/members', [ChatwootController::class, 'getTeamMembers']);
    Route::post('/teams/{teamId}/members', [ChatwootController::class, 'addTeamMembers']);
    Route::patch('/teams/{teamId}/members', [ChatwootController::class, 'updateTeamMembers']);
    Route::delete('/teams/{teamId}/members', [ChatwootController::class, 'removeTeamMember']);

    // Etiquetas
    Route::get('/labels', [ChatwootController::class, 'getLabels']);
    Route::post('/labels', [ChatwootController::class, 'createLabel']);

    // Agentes
    Route::get('/agents', [ChatwootController::class, 'getAgents']);
    Route::post('/agents', [ChatwootController::class, 'createAgent']);

    // Dashboard stats
    Route::get('/dashboard-stats', [ChatwootController::class, 'getDashboardStats']);
    
    // User stats
    Route::get('/user/dashboard-stats', [ChatwootController::class, 'getUserDashboardStats']);
    
    // Contactos
    Route::put('/contacts/{contactId}', [ChatwootController::class, 'updateContact']);
    
    // Configuración
    Route::get('/config', [ChatwootController::class, 'getConfig']);
    
    // ============================================================================
    // GESTIÓN DE MIEMBROS DE LA EMPRESA (solo admin)
    // ============================================================================
    Route::get('/members', [\App\Http\Controllers\Api\MembersController::class, 'index']);
    Route::patch('/members/{id}', [\App\Http\Controllers\Api\MembersController::class, 'update']);
    Route::delete('/members/{id}', [\App\Http\Controllers\Api\MembersController::class, 'destroy']);
    
    // ============================================================================
    // INVITACIONES DE EQUIPO (autenticado)
    // ============================================================================
    Route::get('/invitations', [\App\Http\Controllers\Api\TeamInvitationController::class, 'index']);
    Route::post('/invitations', [\App\Http\Controllers\Api\TeamInvitationController::class, 'store']);
    Route::post('/invitations/{id}/resend', [\App\Http\Controllers\Api\TeamInvitationController::class, 'resend']);
    Route::delete('/invitations/{id}', [\App\Http\Controllers\Api\TeamInvitationController::class, 'cancel']);
    Route::post('/invitations/sync-chatwoot', [\App\Http\Controllers\Api\TeamInvitationController::class, 'syncUsersWithChatwoot']);
});

// ============================================================================
// INVITACIONES PÚBLICAS (sin autenticación)
// ============================================================================
Route::prefix('invitation')->group(function () {
    Route::get('/validate/{token}', [\App\Http\Controllers\Api\TeamInvitationController::class, 'validateToken']);
    Route::post('/accept/{token}', [\App\Http\Controllers\Api\TeamInvitationController::class, 'accept']);
});

// Endpoint para sincronizar usuarios con Chatwoot (requiere clave secreta)
Route::post('/admin/sync-chatwoot-agents', [\App\Http\Controllers\Api\TeamInvitationController::class, 'syncUsersWithChatwoot']);

// Endpoint de diagnóstico para verificar estado de usuarios y agentes
Route::get('/admin/diagnostic-agents', [\App\Http\Controllers\Api\TeamInvitationController::class, 'diagnosticAgents']);

// Endpoint para arreglar empresa con API key de Chatwoot
Route::post('/admin/fix-company-chatwoot', [\App\Http\Controllers\Api\TeamInvitationController::class, 'fixCompanyChatwoot']);

// Endpoint para corregir rol de usuario
Route::post('/admin/fix-user-role', [\App\Http\Controllers\Api\TeamInvitationController::class, 'fixUserRole']);

// Endpoint para provisionar Chatwoot a una empresa que no lo tiene
Route::post('/admin/provision-company-chatwoot', [\App\Http\Controllers\Api\TeamInvitationController::class, 'provisionCompanyChatwoot']);

// Endpoint para recrear colección de Qdrant (temporal - usar con cuidado)
Route::get('/admin/recreate-qdrant/{companySlug}', function ($companySlug) {
    $company = \App\Models\Company::where('slug', $companySlug)->first();
    
    if (!$company) {
        $user = \App\Models\User::where('company_slug', $companySlug)->where('role', 'admin')->first();
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
    \App\Jobs\CreateQdrantCollectionJob::dispatchSync($company->id, $company->slug);
    
    $company->refresh();
    
    return response()->json([
        'success' => true,
        'company' => $company->name,
        'collection' => $company->settings['qdrant_collection'] ?? 'No se creó',
    ]);
});

// Proxy para archivos/imágenes de Chatwoot - SIN autenticación (las imágenes se cargan vía <img src>)
// Usa controlador separado sin dependencias de autenticación
Route::get('/chatwoot-proxy/attachment-proxy', [\App\Http\Controllers\AttachmentProxyController::class, 'proxy']);

// ============= EVOLUTION API ROUTES (Multi-tenant WhatsApp) =============
Route::prefix('evolution-whatsapp')->group(function () {
    Route::post('/webhook', [\App\Http\Controllers\Api\EvolutionApiController::class, 'webhook']);
    
    Route::middleware(['railway.auth:true'])->group(function () {
        Route::post('/create', [\App\Http\Controllers\Api\EvolutionApiController::class, 'createInstance']);
        Route::get('/instances', [\App\Http\Controllers\Api\EvolutionApiController::class, 'listInstances']);
        Route::post('/connect/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'connect']);
        Route::get('/status/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'getStatus']);
        Route::post('/disconnect/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'disconnect']);
        Route::delete('/instance/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'deleteInstance']);
        Route::post('/send-message/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'sendMessage']);
        Route::post('/chatwoot/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'setChatwoot']);
        // Settings endpoints
        Route::get('/settings/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'getSettings']);
        Route::post('/settings/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'updateSettings']);
        // Sync inbox_id from Chatwoot (force re-sync)
        Route::post('/sync-inbox/{instanceName?}', [\App\Http\Controllers\Api\EvolutionApiController::class, 'syncChatwootInbox']);
    });
});

// Webhook para Evolution API → Chatwoot (formato legacy)
Route::post('/chatwoot/webhook/{instance}', [\App\Http\Controllers\Api\ChatwootWebhookController::class, 'handleWebhook']);

Route::post('/chatwoot/webhook', [\App\Http\Controllers\Api\ChatwootWebhookController::class, 'handleWebhook']);

// 🔓 Utility: Unblock phone in Redis (for bot session management)
Route::delete('/unblock-phone/{phone}', function ($phone) {
    // Validate secret key
    $secretKey = request()->header('X-Secret-Key');
    if ($secretKey !== config('app.debug_key', env('DEBUG_SECRET_KEY', 'withmia-debug-2026-secure'))) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    $phone = preg_replace('/[^0-9]/', '', $phone);
    $deleted = \Illuminate\Support\Facades\Redis::del($phone);
    
    return response()->json([
        'success' => true,
        'phone' => $phone,
        'deleted' => $deleted,
        'message' => "Unblocked phone {$phone}"
    ]);
});

Route::get('/check-phone-block/{phone}', function ($phone) {
    $secretKey = request()->header('X-Secret-Key');
    if ($secretKey !== config('app.debug_key', env('DEBUG_SECRET_KEY', 'withmia-debug-2026-secure'))) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    $phone = preg_replace('/[^0-9]/', '', $phone);
    $value = \Illuminate\Support\Facades\Redis::get($phone);
    
    return response()->json([
        'success' => true,
        'phone' => $phone,
        'blocked' => !empty($value),
        'value' => $value
    ]);
});

// ⚠️ ALIAS ELIMINADO: /evolution/webhook → Usar /evolution-whatsapp/webhook
// La ruta duplicada fue removida. Actualizar configuración de Evolution si es necesario.

// Knowledge Base / Conocimientos API routes - authenticated via session or RailwayAuthToken
Route::middleware(['web', 'railway.auth:true'])->group(function () {
    // Onboarding data
    Route::get('/onboarding-data', [\App\Http\Controllers\KnowledgeController::class, 'getOnboardingData']);
    Route::put('/onboarding-data', [\App\Http\Controllers\KnowledgeController::class, 'updateOnboardingData']);
    Route::post('/company/logo', [\App\Http\Controllers\KnowledgeController::class, 'uploadCompanyLogo']);
    Route::post('/knowledge/upload-document', [\App\Http\Controllers\KnowledgeController::class, 'uploadDocument']);
    
    // Bot Configuration - configuración del bot n8n
    Route::get('/bot-config', [\App\Http\Controllers\Api\BotConfigController::class, 'index']);
    Route::put('/bot-config', [\App\Http\Controllers\Api\BotConfigController::class, 'update']);
    
    // Training Chat - conversación para entrenar al bot
    Route::post('/training/chat', [\App\Http\Controllers\KnowledgeController::class, 'trainingChat']);
    
    // Documents
    Route::get('/documents', [\App\Http\Controllers\KnowledgeController::class, 'getDocuments']);
    Route::post('/documents/metadata', [\App\Http\Controllers\KnowledgeController::class, 'storeDocumentMetadata']);
    Route::delete('/documents/{id}', [\App\Http\Controllers\KnowledgeController::class, 'deleteDocument']);
    Route::post('/documents/update-vector-ids', [\App\Http\Controllers\KnowledgeController::class, 'updateVectorIds']);
    
    // Proxy to n8n RAG webhook (avoids CORS issues)
    Route::post('/documents/process-rag', [\App\Http\Controllers\KnowledgeController::class, 'proxyToN8n']);
    
    // Reset workflow (creates new simplified workflow for company)
    Route::post('/documents/reset-workflow', [\App\Http\Controllers\KnowledgeController::class, 'resetWorkflow']);
    
    // Qdrant Points CRUD
    Route::get('/qdrant/points', [\App\Http\Controllers\KnowledgeController::class, 'getQdrantPoints']);
    Route::get('/qdrant/points/{pointId}', [\App\Http\Controllers\KnowledgeController::class, 'getQdrantPoint']);
    Route::put('/qdrant/points/{pointId}', [\App\Http\Controllers\KnowledgeController::class, 'updateQdrantPoint']);
    Route::delete('/qdrant/points/{pointId}', [\App\Http\Controllers\KnowledgeController::class, 'deleteQdrantPoint']);
    Route::delete('/qdrant/points', [\App\Http\Controllers\KnowledgeController::class, 'deleteQdrantPoints']);
});

// Public webhook endpoint for n8n (no authentication)
Route::post('/n8n/update-vector-ids', [\App\Http\Controllers\KnowledgeController::class, 'updateVectorIdsWebhook']);

// n8n chunk notification endpoint (no authentication - called after each chunk is stored in Qdrant)
Route::post('/knowledge/chunk-stored', [\App\Http\Controllers\KnowledgeController::class, 'chunkStored']);

// WhatsApp Instance lookup endpoint (no authentication - used by n8n)
Route::get('/whatsapp/instance/{instanceName}/company', [\App\Http\Controllers\Api\WhatsAppInstanceController::class, 'getCompanyByInstance']);

// ?? FIX: Reparar tokens de Chatwoot para usuarios existentes
// Este endpoint crea el access_token en la base de datos de Chatwoot si no existe

// ?? FIX: Reparar TODOS los tokens de Chatwoot para todos los usuarios

// ?? FIX FORZADO: Regenera TODOS los tokens de Chatwoot (borra los viejos y crea nuevos)
Route::get('/regenerate-all-chatwoot-tokens', function () {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $users = \App\Models\User::whereNotNull('chatwoot_agent_id')->get();
        $results = [];
        
        foreach ($users as $user) {
            // BORRAR token existente si hay
            $chatwootDb->table('access_tokens')
                ->where('owner_type', 'User')
                ->where('owner_id', $user->chatwoot_agent_id)
                ->delete();
            
            // Crear nuevo token
            $newToken = \Illuminate\Support\Str::random(24);
            $chatwootDb->table('access_tokens')->insert([
                'owner_type' => 'User',
                'owner_id' => $user->chatwoot_agent_id,
                'token' => $newToken,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Actualizar en Laravel
            $user->update(['chatwoot_agent_token' => $newToken]);
            
            $results[] = [
                'user_id' => $user->id,
                'email' => $user->email,
                'chatwoot_agent_id' => $user->chatwoot_agent_id,
                'action' => 'regenerated',
                'token_prefix' => substr($newToken, 0, 8) . '...'
            ];
        }
        
        // Limpiar cache de conversaciones
        \Illuminate\Support\Facades\Cache::flush();
        
        Log::debug('?? All Chatwoot tokens REGENERATED', ['count' => count($results)]);
        
        return response()->json([
            'success' => true,
            'message' => 'Todos los tokens REGENERADOS (viejos borrados, nuevos creados)',
            'total_users' => count($results),
            'cache_cleared' => true,
            'results' => $results
        ]);
        
    } catch (\Exception $e) {
        Log::error('? Error regenerating Chatwoot tokens', ['error' => $e->getMessage()]);
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ?? DEBUG: Ver estado de tokens y conversaciones

// ?? FIX: Corregir el tipo de usuario en Chatwoot si est� mal

// ?? DEBUG: Ver configuraci�n de Evolution API + Chatwoot para una instancia

// 🔧 FIX: Configurar/Reconfigurar Chatwoot en Evolution API
Route::get('/setup-evolution-chatwoot/{instanceName}', function ($instanceName) {
    try {
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        $chatwootUrl = config('chatwoot.url');
        
        // Obtener usuario y company
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() ?? \App\Models\User::first();
        $company = $user->company;
        $accountId = $company->chatwoot_account_id ?? '1';
        
        // Obtener el nombre del inbox existente de Chatwoot
        $chatwootDb = DB::connection('chatwoot');
        $existingInbox = $chatwootDb->table('inboxes')
            ->where('account_id', $accountId)
            ->first();
        
        // Usar el nombre del inbox existente o crear uno nuevo
        $inboxName = $existingInbox ? $existingInbox->name : "WhatsApp {$company->name}";
        
        // CRÍTICO: Evolution API necesita el API Access Token del usuario (NO el Channel Token)
        // El API Access Token permite:
        // - Buscar contactos
        // - Listar y crear conversaciones
        // - Enviar mensajes
        // El Channel Token SOLO sirve para recibir mensajes entrantes
        
        // Obtener el API Access Token de la empresa
        $apiToken = $company->chatwoot_api_key ?? null;
        
        if (!$apiToken) {
            // Fallback: buscar el access_token de cualquier admin de la cuenta
            $adminUser = $chatwootDb->table('account_users')
                ->join('access_tokens', 'account_users.user_id', '=', 'access_tokens.owner_id')
                ->where('account_users.account_id', $accountId)
                ->where('account_users.role', 1) // 1 = administrator
                ->first();
            
            $apiToken = $adminUser->token ?? null;
        }
        
        if (!$apiToken) {
            return response()->json([
                'success' => false,
                'error' => 'No se encontró un API Access Token para la cuenta. Asegúrate de que la empresa tenga chatwoot_api_key configurado.'
            ], 400);
        }
        
        // Configurar Chatwoot en Evolution API
        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey,
            'Content-Type' => 'application/json'
        ])->timeout(30)->post("{$evolutionUrl}/chatwoot/set/{$instanceName}", [
            'enabled' => true,
            'accountId' => (string) $accountId,
            'token' => $apiToken, // API Access Token del usuario admin
            'url' => $chatwootUrl,
            'signMsg' => false,
            'reopenConversation' => true,
            'conversationPending' => false,
            'nameInbox' => $inboxName,
            'mergeBrazilContacts' => false,
            'importContacts' => false,
            'importMessages' => false,
            'daysLimitImportMessages' => 0,
            'autoCreate' => true // Permitir crear inbox si no existe
        ]);
        
        Log::debug('🔧 Chatwoot configured in Evolution API', [
            'instance' => $instanceName,
            'account_id' => $accountId,
            'inbox_name' => $inboxName,
            'api_token_prefix' => substr($apiToken, 0, 8) . '...',
            'response_status' => $response->status(),
            'response_body' => $response->json()
        ]);
        
        return response()->json([
            'success' => $response->successful(),
            'instance' => $instanceName,
            'account_id' => $accountId,
            'chatwoot_url' => $chatwootUrl,
            'inbox_name' => $inboxName,
            'api_token_used' => substr($apiToken, 0, 8) . '...',
            'evolution_response' => $response->json()
        ]);
        
    } catch (\Exception $e) {
        Log::error('? Failed to setup Chatwoot in Evolution', ['error' => $e->getMessage()]);
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

Route::middleware(['web', 'auth'])->group(function () {
    
});

// ?? DEBUG: Probar obtener mensajes de una conversaci�n espec�fica

// ✅ Verificar y regenerar token de Chatwoot si es necesario
Route::get('/clear-conversations-cache', function () {
    try {
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        $company = $user->company;
        $chatwootDb = DB::connection('chatwoot');
        
        // ✅ NOTA: Ya no hay cache de conversaciones (consultas directas a BD)
        
        // Verificar token actual en Chatwoot DB
        $tokenInChatwoot = $chatwootDb->table('access_tokens')
            ->where('owner_type', 'User')
            ->where('owner_id', $user->chatwoot_agent_id)
            ->first();
        
        $tokenMatch = $tokenInChatwoot && $tokenInChatwoot->token === $user->chatwoot_agent_token;
        
        // Si no coincide, regenerar
        $regenerated = false;
        if (!$tokenMatch) {
            // Generar nuevo token
            $newToken = bin2hex(random_bytes(32));
            
            // Eliminar tokens existentes
            $chatwootDb->table('access_tokens')
                ->where('owner_type', 'User')
                ->where('owner_id', $user->chatwoot_agent_id)
                ->delete();
            
            // Insertar nuevo token
            $chatwootDb->table('access_tokens')->insert([
                'owner_type' => 'User',
                'owner_id' => $user->chatwoot_agent_id,
                'token' => $newToken,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Actualizar en Laravel
            $user->chatwoot_agent_token = $newToken;
            $user->save();
            
            $regenerated = true;
        }
        
        // Probar el token
        $chatwootUrl = config('chatwoot.url');
        $accountId = $company->chatwoot_account_id ?? 1;
        $testResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'api_access_token' => $user->chatwoot_agent_token,
        ])->timeout(10)->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/conversations", [
            'inbox_id' => $user->chatwoot_inbox_id,
            'page' => 1,
            'per_page' => 5
        ]);
        
        return response()->json([
            'success' => true,
            'note' => 'Ya no hay cache de conversaciones (consultas directas a BD)',
            'token_status' => [
                'token_existed_in_chatwoot' => $tokenInChatwoot ? true : false,
                'token_matched' => $tokenMatch,
                'regenerated' => $regenerated,
                'current_token_prefix' => substr($user->chatwoot_agent_token, 0, 8) . '...'
            ],
            'api_test' => [
                'status' => $testResponse->status(),
                'success' => $testResponse->successful(),
                'conversations_count' => $testResponse->successful() 
                    ? count($testResponse->json()['data']['payload'] ?? []) 
                    : 0,
                'error' => !$testResponse->successful() ? $testResponse->body() : null
            ]
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ?? DEBUG: Ver conversaciones directamente de la DB de Chatwoot (sin API)

// ?? FLUSH ALL: Limpiar TODO el cach� de Redis
Route::get('/flush-all-cache', function () {
    try {
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        
        $deletedKeys = [];
        
        // Todas las posibles claves de cach�
        $keysToDelete = [
            "conversations_user_{$user->id}_inbox_{$user->chatwoot_inbox_id}",
            "conversations_user_{$user->id}_inbox_{$user->chatwoot_inbox_id}_timestamp",
            "conversations:inbox:{$user->chatwoot_inbox_id}:user:{$user->id}",
            "last_message_inbox_{$user->chatwoot_inbox_id}",
            "conversations_user_1_inbox_1",
            "conversations_user_1_inbox_1_timestamp",
        ];
        
        foreach ($keysToDelete as $key) {
            $existed = \Illuminate\Support\Facades\Cache::has($key);
            \Illuminate\Support\Facades\Cache::forget($key);
            $deletedKeys[$key] = $existed ? 'deleted' : 'not_found';
        }
        
        // Tambi�n intentar flush completo si es Redis
        try {
            \Illuminate\Support\Facades\Cache::flush();
            $flushed = true;
        } catch (\Exception $e) {
            $flushed = false;
        }
        
        return response()->json([
            'success' => true,
            'keys_status' => $deletedKeys,
            'full_flush' => $flushed,
            'message' => 'Cach� limpiado. Recarga la p�gina.',
            'next_step' => 'Visita https://app.withmia.com/dashboard/withmia-xrygbo y recarga con Ctrl+F5'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ?? RESET COMPLETO: Eliminar todas las conversaciones y mensajes de Chatwoot
Route::get('/reset-chatwoot-conversations/{confirm}', function ($confirm) {
    if ($confirm !== 'YES-DELETE-ALL') {
        return response()->json([
            'success' => false,
            'message' => 'Para confirmar, usa /api/reset-chatwoot-conversations/YES-DELETE-ALL',
            'warning' => '?? ESTO ELIMINAR� TODAS LAS CONVERSACIONES Y MENSAJES'
        ]);
    }
    
    try {
        $chatwootDb = DB::connection('chatwoot');
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() ?? \App\Models\User::first();
        $company = $user->company;
        $accountId = $company->chatwoot_account_id ?? 1;
        $inboxId = $user->chatwoot_inbox_id ?? 1;
        
        // Contar antes de eliminar
        $conversationsBefore = $chatwootDb->table('conversations')
            ->where('account_id', $accountId)
            ->count();
        
        $messagesBefore = $chatwootDb->table('messages')
            ->whereIn('conversation_id', function ($query) use ($accountId) {
                $query->select('id')
                    ->from('conversations')
                    ->where('account_id', $accountId);
            })
            ->count();
        
        // 1. Eliminar mensajes
        $messagesDeleted = $chatwootDb->table('messages')
            ->whereIn('conversation_id', function ($query) use ($accountId) {
                $query->select('id')
                    ->from('conversations')
                    ->where('account_id', $accountId);
            })
            ->delete();
        
        // 2. Eliminar conversaciones
        $conversationsDeleted = $chatwootDb->table('conversations')
            ->where('account_id', $accountId)
            ->delete();
        
        // 3. Limpiar cach�
        \Illuminate\Support\Facades\Cache::flush();
        
        Log::debug('?? RESET CHATWOOT COMPLETADO', [
            'account_id' => $accountId,
            'conversations_deleted' => $conversationsDeleted,
            'messages_deleted' => $messagesDeleted
        ]);
        
        return response()->json([
            'success' => true,
            'before' => [
                'conversations' => $conversationsBefore,
                'messages' => $messagesBefore
            ],
            'deleted' => [
                'conversations' => $conversationsDeleted,
                'messages' => $messagesDeleted
            ],
            'cache_flushed' => true,
            'next_step' => 'Recarga la app y env�a un nuevo mensaje de WhatsApp para probar'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ?? SYNC COMPLETO: Sincronizar Evolution API con Chatwoot usando el inbox EXISTENTE
Route::get('/sync-evolution-with-chatwoot/{instanceName}', function ($instanceName) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        $company = $user->company;
        $accountId = $company->chatwoot_account_id ?? 1;
        
        // 1. Obtener el inbox REAL de Chatwoot (el que ya existe)
        $existingInbox = $chatwootDb->table('inboxes')
            ->where('account_id', $accountId)
            ->first();
        
        if (!$existingInbox) {
            return response()->json([
                'success' => false,
                'error' => 'No hay inbox en Chatwoot. Primero completa el onboarding.'
            ], 400);
        }
        
        $inboxName = $existingInbox->name;
        $inboxId = $existingInbox->id;
        
        // 2. CRÍTICO: Usar API Access Token (NO Channel Token)
        // El API Access Token permite buscar contactos, listar conversaciones, etc.
        $apiToken = $company->chatwoot_api_key;
        
        if (!$apiToken) {
            // Fallback: buscar el access_token del admin de la cuenta
            $adminUser = $chatwootDb->table('account_users')
                ->join('access_tokens', 'account_users.user_id', '=', 'access_tokens.owner_id')
                ->where('account_users.account_id', $accountId)
                ->where('account_users.role', 1)
                ->first();
            $apiToken = $adminUser->token ?? null;
        }
        
        if (!$apiToken) {
            return response()->json([
                'success' => false,
                'error' => 'No se encontró API Access Token para la cuenta.'
            ], 400);
        }
        
        // 3. Configurar Evolution API con los datos CORRECTOS
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        $chatwootUrl = config('chatwoot.url');
        
        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey,
            'Content-Type' => 'application/json'
        ])->timeout(30)->post("{$evolutionUrl}/chatwoot/set/{$instanceName}", [
            'enabled' => true,
            'accountId' => (string) $accountId,
            'token' => $apiToken, // API Access Token del usuario admin
            'url' => $chatwootUrl,
            'signMsg' => false,
            'reopenConversation' => true,
            'conversationPending' => false,
            'nameInbox' => $inboxName, // Nombre REAL del inbox existente
            'mergeBrazilContacts' => false,
            'importContacts' => false,
            'importMessages' => false,
            'daysLimitImportMessages' => 0,
            'autoCreate' => true // Crear inbox si no existe
        ]);
        
        // 4. Actualizar el usuario con el inbox_id correcto
        $user->chatwoot_inbox_id = $inboxId;
        $user->save();
        
        // 5. Actualizar la company si es necesario
        if ($company->chatwoot_inbox_id != $inboxId) {
            $company->chatwoot_inbox_id = $inboxId;
            $company->save();
        }
        
        // 6. Limpiar caché
        \Illuminate\Support\Facades\Cache::flush();
        
        Log::debug('✅ SYNC Evolution-Chatwoot completado', [
            'instance' => $instanceName,
            'inbox_name' => $inboxName,
            'inbox_id' => $inboxId,
            'account_id' => $accountId,
            'api_token' => substr($apiToken, 0, 8) . '...'
        ]);
        
        return response()->json([
            'success' => $response->successful(),
            'instance' => $instanceName,
            'chatwoot_config' => [
                'account_id' => $accountId,
                'inbox_id' => $inboxId,
                'inbox_name' => $inboxName,
                'api_token' => substr($apiToken, 0, 8) . '...'
            ],
            'user_updated' => [
                'chatwoot_inbox_id' => $user->chatwoot_inbox_id,
                'chatwoot_agent_token' => substr($user->chatwoot_agent_token ?? '', 0, 8) . '...'
            ],
            'evolution_response' => $response->json(),
            'next_steps' => [
                '1' => 'El sistema est� sincronizado',
                '2' => 'Env�a un mensaje desde WhatsApp',
                '3' => 'Recarga la app para ver la conversaci�n'
            ]
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// 🔧 FIX: Renombrar inbox en Chatwoot para que coincida con el slug de la instancia
// 🔧 FIX: Actualizar Evolution con el token correcto de Chatwoot

// ?? FIX DIRECTO: Renombrar inbox forzosamente
Route::get('/force-rename-inbox/{instanceName}', function ($instanceName) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $correctInboxName = "WhatsApp {$instanceName}";
        
        // Obtener TODOS los inboxes
        $allInboxes = $chatwootDb->table('inboxes')->get();
        
        // Buscar el inbox con account_id=1
        $inbox = $chatwootDb->table('inboxes')->where('account_id', 1)->first();
        
        if (!$inbox) {
            return response()->json([
                'error' => 'No se encontr� inbox con account_id=1',
                'all_inboxes' => $allInboxes
            ], 400);
        }
        
        $oldName = $inbox->name;
        
        // Forzar actualizaci�n
        $updated = $chatwootDb->table('inboxes')
            ->where('id', $inbox->id)
            ->update([
                'name' => $correctInboxName,
                'updated_at' => now()
            ]);
        
        // Verificar despu�s del update
        $inboxAfter = $chatwootDb->table('inboxes')->where('id', $inbox->id)->first();
        
        return response()->json([
            'success' => true,
            'updated_rows' => $updated,
            'inbox_id' => $inbox->id,
            'old_name' => $oldName,
            'new_name' => $correctInboxName,
            'verification' => [
                'name_after_update' => $inboxAfter->name,
                'matches' => $inboxAfter->name === $correctInboxName
            ]
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
});

// ?? DEBUG: Ver inbox directamente de la DB sin cach�
Route::get('/raw-inbox-check', function () {
    $chatwootDb = DB::connection('chatwoot');
    
    // Query directa sin cach�
    $inboxes = $chatwootDb->select('SELECT id, name, account_id, channel_id, channel_type, updated_at FROM inboxes ORDER BY id');
    $channels = $chatwootDb->select('SELECT id, account_id, identifier FROM channel_api ORDER BY id');
    $accessTokens = $chatwootDb->select('SELECT id, owner_id, owner_type, token FROM access_tokens ORDER BY id');
    $users = $chatwootDb->select('SELECT id, name, email FROM users ORDER BY id');
    
    return response()->json([
        'timestamp' => now()->toIso8601String(),
        'inboxes' => $inboxes,
        'channel_api' => $channels,
        'access_tokens' => $accessTokens,
        'users' => $users,
        'connection' => config('database.connections.chatwoot.host')
    ]);
});

// ?? DEBUG: Ver mensajes recientes con attachments

// ?? CLEANUP: Eliminar attachments vac�os/hu�rfanos


// N8n Workflow Management
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/workflows/create-for-company', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'createWorkflowForCompany']);
    Route::post('/workflows/create-training', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'createTrainingWorkflow']);
    Route::get('/workflows/company-list', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'listCompanyWorkflows']);
    Route::get('/workflows/company/{companyId}', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'getCompanyWorkflow']);
    Route::delete('/workflows/company/{companyId}', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'deleteCompanyWorkflow']);
    Route::post('/workflows/company/{companyId}/toggle', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'toggleWorkflow']);
});

// =============================================================================
// ⚙️ COMPANY SETTINGS (timezone, configuración general)
// =============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->group(function () {
    // Obtener configuración de la company
    Route::get('/company/settings', function (Request $request) {
        try {
            $user = $request->user();
            if (!$user || !$user->company) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autenticado o sin empresa'
                ], 401);
            }

            $company = $user->company;
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'slug' => $company->slug,
                    'timezone' => $company->timezone ?? 'UTC',
                    'logo_url' => $company->logo_url,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting company settings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener configuración'
            ], 500);
        }
    });

    // Actualizar configuración de la company
    Route::put('/company/settings', function (Request $request) {
        try {
            $user = $request->user();
            if (!$user || !$user->company) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autenticado o sin empresa'
                ], 401);
            }

            // Solo admins pueden cambiar la configuración
            if (!$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para cambiar la configuración'
                ], 403);
            }

            $company = $user->company;
            
            // Validar timezone
            $timezone = $request->input('timezone');
            if ($timezone) {
                $validTimezones = timezone_identifiers_list();
                if (!in_array($timezone, $validTimezones)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Zona horaria inválida'
                    ], 400);
                }
                $company->timezone = $timezone;
            }

            $company->save();

            Log::debug('Company settings updated', [
                'company_id' => $company->id,
                'user_id' => $user->id,
                'timezone' => $company->timezone
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Configuración actualizada',
                'data' => [
                    'timezone' => $company->timezone
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating company settings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar configuración'
            ], 500);
        }
    });
});

// =============================================================================
// 🔐 PERMISOS Y ROL DEL USUARIO
// =============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->group(function () {
    // Obtener permisos del usuario actual
    Route::get('/user/permissions', function (Request $request) {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'No autenticado',
                    'role' => 'admin',
                    'is_admin' => true,
                    'is_agent' => false,
                    'permissions' => [],
                ], 401);
            }
            return response()->json([
                'success' => true,
                'role' => $user->role ?? 'admin',
                'is_admin' => $user->isAdmin(),
                'is_agent' => $user->isAgent(),
                'permissions' => $user->getPermissions(),
            ]);
        } catch (\Exception $e) {
            // Fallback seguro: dar permisos de admin si falla
            return response()->json([
                'success' => true,
                'role' => 'admin',
                'is_admin' => true,
                'is_agent' => false,
                'permissions' => [],
            ]);
        }
    });
    
    // Verificar si tiene un permiso específico
    Route::get('/user/has-permission/{permission}', function (Request $request, $permission) {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => true,
                    'permission' => $permission,
                    'has_permission' => true, // Fallback: dar permiso
                ]);
            }
            return response()->json([
                'success' => true,
                'permission' => $permission,
                'has_permission' => $user->hasPermission($permission),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => true,
                'permission' => $permission,
                'has_permission' => true, // Fallback seguro
            ]);
        }
    });
});

// =============================================================================
// ?? DIAGN�STICO DE EVOLUTION-CHATWOOT
// =============================================================================

/**
 * GET /api/evolution/chatwoot-config/{instanceName}
 * Obtener la configuraci�n actual de Chatwoot en Evolution API
 */
Route::get('/evolution/chatwoot-config/{instanceName}', function ($instanceName) {
    try {
        $evolutionService = app(\App\Services\EvolutionApiService::class);
        $config = $evolutionService->getChatwootConfig($instanceName);
        
        return response()->json([
            'success' => $config['success'],
            'instance' => $instanceName,
            'chatwoot_config' => $config['data'] ?? null,
            'error' => $config['error'] ?? null,
            'help' => 'Si los mensajes del bot no aparecen en la app, usa POST /api/evolution/reconfigure-chatwoot/{instanceName}'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

/**
 * GET /api/evolution/reconfigure-chatwoot/{instanceName}
 * Reconfigurar la integraci�n de Chatwoot para forzar sincronizaci�n de mensajes
 */
Route::get('/evolution/reconfigure-chatwoot/{instanceName}', function ($instanceName) {
    try {
        $evolutionService = app(\App\Services\EvolutionApiService::class);
        
        // Primero obtener la configuraci�n actual
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
                '1. Env�a un mensaje de prueba desde WhatsApp',
                '2. Espera la respuesta del bot',
                '3. Recarga la conversaci�n en la app',
                '4. Ambos mensajes (entrante y saliente) deber�an aparecer'
            ] : null
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

/**
 * GET /api/evolution/debug-instance/{instanceName}
 * Informaci�n completa de diagn�stico de una instancia
 */

// ============== DEBUG: Verificar estado del onboarding ==============

// DEBUG: Recrear manualmente Qdrant collection y workflows para una empresa

// ============== DEBUG: Ver info de empresas y bots ==============

// ============== DEBUG: Ver columnas de companies ==============

// ============== FIX: Agregar columna assistant_name si no existe ==============

// ============== UPDATE: Actualizar assistant_name de una empresa ==============
Route::get('/update/company-assistant/{companyId}/{name}', function ($companyId, $name) {
    try {
        $company = \App\Models\Company::findOrFail($companyId);
        $company->update(['assistant_name' => $name]);
        
        return response()->json([
            'success' => true,
            'message' => "assistant_name actualizado a '{$name}'",
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'assistant_name' => $company->assistant_name
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// Actualizar instance_url de WhatsApp Instance
Route::get('/update/whatsapp-instance-url/{instanceName}', function ($instanceName, \Illuminate\Http\Request $request) {
    try {
        $newUrl = $request->query('url', config('evolution.server_url'));
        $newApiKey = $request->query('apikey');
        
        $instance = \App\Models\WhatsAppInstance::where('instance_name', $instanceName)->first();
        
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
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});
// ============== N8N: Obtener configuración de empresa por slug (para workflows dinámicos) ==============
Route::get('/n8n/company-config/{companySlug}', function ($companySlug) {
    try {
        $company = \App\Models\Company::where('slug', $companySlug)->first();
        
        if (!$company) {
            return response()->json([
                'success' => false,
                'error' => 'Empresa no encontrada',
                'assistant_name' => 'MIA',
                'company_name' => $companySlug
            ]);
        }
        
        return response()->json([
            'success' => true,
            'assistant_name' => $company->assistant_name ?? 'MIA',
            'company_name' => $company->name ?? $companySlug,
            'company_slug' => $company->slug,
            'openai_api_key' => $company->settings['openai_api_key'] ?? env('OPENAI_API_KEY'),
            'qdrant_host' => config('services.qdrant.host'),
            'collection_name' => 'company_' . $company->slug . '_knowledge'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'assistant_name' => 'MIA',
            'company_name' => $companySlug
        ], 500);
    }
});

// ============== N8N: Obtener configuración de empresa por nombre de inbox (Chatwoot) ==============
Route::get('/n8n/company-config-by-inbox/{inboxName}', function ($inboxName) {
    try {
        // El inbox name puede tener formatos:
        // - "WhatsApp withmia-nfudrg" (prefijo WhatsApp)
        // - "withmia-nfudrg" (solo instance name)
        $instanceName = preg_replace('/^WhatsApp\s+/i', '', $inboxName);
        
        // Buscar en whatsapp_instances por instance_name
        $whatsappInstance = \App\Models\WhatsAppInstance::where('instance_name', $instanceName)->first();
        
        // Si no encuentra, intentar buscar por coincidencia parcial
        if (!$whatsappInstance) {
            $whatsappInstance = \App\Models\WhatsAppInstance::where('instance_name', 'like', '%' . $instanceName . '%')->first();
        }
        
        // Obtener la company asociada
        $company = $whatsappInstance ? $whatsappInstance->company : null;
        
        // Si no hay instancia, intentar buscar company por slug
        if (!$company) {
            $company = \App\Models\Company::where('slug', $instanceName)->first();
        }
        
        // SIN FALLBACKS - si no hay empresa, error
        if (!$company) {
            \Log::warning('Company not found for inbox', ['inbox' => $inboxName, 'instance' => $instanceName]);
            return response()->json([
                'success' => false,
                'error' => 'Empresa no encontrada para inbox: ' . $inboxName
            ], 404);
        }
        
        // Obtener la instancia activa de la empresa si no la tenemos
        if (!$whatsappInstance) {
            $whatsappInstance = \App\Models\WhatsAppInstance::where('company_id', $company->id)
                ->where('is_active', true)
                ->first();
        }
        
        // Obtener Evolution API URL y Key de la instancia o settings de company
        $evolutionApiUrl = $whatsappInstance?->instance_url ?? $company->settings['evolution_api_url'] ?? config('services.evolution.base_url');
        $evolutionApiKey = $whatsappInstance?->api_key ?? $company->settings['evolution_api_key'] ?? null;
        $evolutionInstanceName = $whatsappInstance?->instance_name ?? $instanceName;
        
        // Validar que tenga Evolution configurado
        if (!$evolutionApiUrl) {
            \Log::warning('Company missing Evolution config', ['company' => $company->slug]);
            return response()->json([
                'success' => false,
                'error' => 'Empresa ' . $company->slug . ' no tiene Evolution API configurado'
            ], 400);
        }
        
        // Respuesta 100% dinámica
        return response()->json([
            'success' => true,
            // Datos de empresa
            'company_slug' => $company->slug,
            'company_name' => $company->name,
            'assistant_name' => $company->assistant_name ?? 'MIA',
            'ai_prompt' => $company->settings['ai_prompt'] ?? null,
            // Qdrant
            'collection_name' => 'company_' . $company->slug . '_knowledge',
            // Evolution API
            'evolution_instance_name' => $evolutionInstanceName,
            'evolution_server_url' => $evolutionApiUrl,
            'evolution_api_key' => $evolutionApiKey ?? config('services.evolution.api_key'),
            // Chatwoot - usar columnas directas, no settings
            'chatwoot_api_token' => $company->chatwoot_api_key ?? $company->settings['chatwoot_api_token'] ?? config('chatwoot.api_key'),
            'chatwoot_account_id' => $company->chatwoot_account_id ?? $company->settings['chatwoot_account_id'] ?? 1
        ]);
    } catch (\Exception $e) {
        \Log::error('Error getting company config by inbox: ' . $e->getMessage(), [
            'inbox' => $inboxName,
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ============== N8N: Notificar respuesta a Laravel (para Reverb/WebSocket) ==============
Route::post('/n8n/notify-response', function (Request $request) {
    try {
        $data = $request->all();
        
        // Validar datos mínimos
        $companySlug = $data['company_slug'] ?? '';
        $conversationId = (int) ($data['conversation_id'] ?? 0);
        $message = $data['message'] ?? '';
        $phone = $data['phone'] ?? '';
        $inboxId = (int) ($data['inbox_id'] ?? 0);
        $accountId = (int) ($data['account_id'] ?? 0);
        
        // Obtener datos de Chatwoot desde la Company asociada
        $company = null;
        if ($companySlug) {
            $company = \App\Models\Company::where('slug', $companySlug)->first();
        }
        
        // Si no encontramos por slug, buscar por WhatsAppInstance
        if (!$company && $companySlug) {
            $instance = \App\Models\WhatsAppInstance::where('company_slug', $companySlug)
                ->where('is_active', true)
                ->with('company')
                ->first();
            $company = $instance?->company;
        }
        
        // Obtener inbox_id de la company si no viene en el request
        if (!$inboxId && $company) {
            $inboxId = (int) ($company->chatwoot_inbox_id ?? 0);
        }
        
        // Obtener account_id de la company si no viene en el request
        if (!$accountId && $company) {
            $accountId = (int) ($company->chatwoot_account_id ?? 0);
        }
        
        // NOTA: Ya no enviamos a Chatwoot aquí porque n8n lo hace directamente
        // via HTTP Request nodes. Este endpoint ahora solo hace broadcast WebSocket.
        
        // Solo broadcast si hay datos válidos
        if ($conversationId > 0 && $inboxId > 0 && $accountId > 0) {
            // Enviar al canal inbox.{id} para actualizar UI de conversaciones
            event(new \App\Events\NewMessageReceived(
                [
                    'content' => $message,
                    'message_type' => 'outgoing',
                    'sender' => ['name' => 'MIA', 'type' => 'agent_bot'],
                    'created_at' => now()->toIso8601String(),
                ],
                $conversationId,
                $inboxId,
                $accountId
            ));
            
            \Log::debug('Notificacion WebSocket enviada', [
                'company_slug' => $companySlug,
                'conversation_id' => $conversationId,
                'inbox_id' => $inboxId,
                'account_id' => $accountId,
                'message_preview' => substr($message, 0, 50)
            ]);
        } else {
            \Log::warning('No se pudo enviar notificacion WebSocket - datos incompletos', [
                'company_slug' => $companySlug,
                'conversation_id' => $conversationId,
                'inbox_id' => $inboxId,
                'account_id' => $accountId,
            ]);
        }
        
        return response()->json([
            'success' => true,
            'broadcast_sent' => ($conversationId > 0 && $inboxId > 0 && $accountId > 0),
            'channel' => "inbox.{$inboxId}",
            'account_id' => $accountId
        ]);
    } catch (\Exception $e) {
        \Log::error('Error notifying response: ' . $e->getMessage(), [
            'data' => $request->all(),
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
    }
});

// ============== DEBUG: Test WebSocket broadcast ==============

// ============== DEBUG: Ver estado de whatsapp_instances con campos n8n ==============

// ============== FIX: Actualizar n8n_webhook_url para usar patrón withmia- ==============

// Actualizar Evolution API URL de una empresa
Route::get('/update/company-evolution-url/{companyId}', function ($companyId, \Illuminate\Http\Request $request) {
    try {
        $newUrl = $request->query('url', config('evolution.server_url'));
        
        $company = \App\Models\Company::findOrFail($companyId);
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
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// Actualizar datos de Chatwoot de una empresa (account_id, inbox_id)
Route::get('/update/company-chatwoot/{companyId}', function ($companyId, \Illuminate\Http\Request $request) {
    try {
        $accountId = $request->query('account_id');
        $inboxId = $request->query('inbox_id');
        
        if (!$accountId && !$inboxId) {
            return response()->json([
                'success' => false,
                'error' => 'Debe proporcionar account_id o inbox_id como query params'
            ], 400);
        }
        
        $company = \App\Models\Company::findOrFail($companyId);
        
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
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ============================================================
// 🔧 DIAGNÓSTICO Y REPARACIÓN DE WEBHOOKS (POST-RESET DB)
// ============================================================

/**
 * 🔍 Diagnosticar estado completo de una instancia de WhatsApp
 * GET /api/diagnose-instance/{instanceName}
 */

/**
 * 🔧 Reparar webhooks de una instancia
 * POST /api/repair-instance/{instanceName}
 */
Route::post('/repair-instance/{instanceName}', function (Request $request, string $instanceName) {
    try {
        $evolutionApi = app(\App\Services\EvolutionApiService::class);
        $chatwootService = app(\App\Services\ChatwootService::class);
        $n8nService = app(\App\Services\N8nService::class);
        
        $repairs = [];
        $appUrl = config('app.url');
        
        // 1. Buscar o crear instancia en BD
        $instance = DB::table('whatsapp_instances')
            ->where('instance_name', $instanceName)
            ->first();
        
        if (!$instance) {
            // 🔧 FIX: Buscar company por slug del instanceName, no usar default 1
            $company = \App\Models\Company::where('slug', $instanceName)->first();
            $companyId = $company ? $company->id : $request->input('company_id');
            
            if (!$companyId) {
                return response()->json([
                    'success' => false,
                    'error' => "No se encontró empresa para el slug: {$instanceName}. Verifica que la empresa exista."
                ], 400);
            }
            
            DB::table('whatsapp_instances')->insert([
                'instance_name' => $instanceName,
                'company_id' => $companyId,
                'instance_url' => config('evolution.api_url'),
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            $instance = DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->first();
            $repairs[] = "Created instance record with company_id: {$companyId}";
        }
        
        // 2. Verificar/crear workflow en n8n si no existe
        if (empty($instance->n8n_workflow_id)) {
            Log::debug("🔧 Repair: Creating n8n workflow for {$instanceName}");
            
            // Obtener company
            $company = \App\Models\Company::find($instance->company_id);
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
                        '{{QDRANT_URL}}' => config('services.qdrant.url'),
                    ];
                    foreach ($replacements as $placeholder => $value) {
                        $templateJson = str_replace($placeholder, $value, $templateJson);
                    }
                    $templateWorkflow = json_decode($templateJson, true);
                    
                    // Configurar webhook path
                    foreach ($templateWorkflow['nodes'] as &$node) {
                        if ($node['type'] === 'n8n-nodes-base.webhook') {
                            $node['parameters']['path'] = $instanceName;
                            $node['webhookId'] = \Illuminate\Support\Str::uuid()->toString();
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
                        DB::table('whatsapp_instances')
                            ->where('id', $instance->id)
                            ->update([
                                'n8n_workflow_id' => $workflowId,
                                'n8n_webhook_url' => $webhookUrl,
                                'updated_at' => now()
                            ]);
                        
                        $repairs[] = "Created n8n workflow (ID: {$workflowId})";
                        $repairs[] = "Webhook URL: {$webhookUrl}";
                        
                        // Recargar instancia
                        $instance = DB::table('whatsapp_instances')
                            ->where('instance_name', $instanceName)
                            ->first();
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
                DB::table('whatsapp_instances')
                    ->where('id', $instance->id)
                    ->update([
                        'chatwoot_inbox_id' => $inboxId,
                        'updated_at' => now()
                    ]);
                $repairs[] = "Updated chatwoot_inbox_id in local DB: {$inboxId}";
            }
            
            // Configurar webhook en Chatwoot apuntando a n8n
            $n8nWebhookUrl = $instance->n8n_webhook_url ?? $n8nService->getWebhookUrl($instanceName);
            $chatwootWebhookResult = $chatwootService->configureInboxWebhook($inboxId, $n8nWebhookUrl);
            
            if ($chatwootWebhookResult['success']) {
                $repairs[] = "Configured Chatwoot webhook for inbox {$inboxId} to: {$n8nWebhookUrl}";
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
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

/**
 * � DIAGNÓSTICO Y REPARACIÓN COMPLETA DEL FLUJO DE WEBHOOKS
 * GET /api/diagnose-webhook-flow/{instanceName}
 * 
 * Este endpoint diagnostica y repara todo el flujo:
 * 1. Verifica instancia en BD
 * 2. Verifica workflow en n8n
 * 3. Verifica webhook de Chatwoot configurado para enviar a n8n
 * 4. Repara lo que falte automáticamente
 */

/**
 * �🔄 Listar todos los webhooks de Chatwoot
 * GET /api/list-chatwoot-webhooks
 */

/**
 * 🗑️ Limpiar webhooks duplicados/viejos de Chatwoot
 * POST /api/cleanup-chatwoot-webhooks
 */

/**
 * 🔥 CREAR WEBHOOK DE CHATWOOT A N8N - DIRECTO EN BD
 * GET /api/create-n8n-webhook
 */

/**
 * � VER INBOXES Y CONVERSACIONES DE CHATWOOT
 * GET /api/chatwoot-debug
 */
Route::get('/chatwoot-debug', function () {
    try {
        $chatwootPdo = new \PDO(
            "pgsql:host=" . env('CHATWOOT_DB_HOST', 'postgres-mvz7.railway.internal') . 
            ";port=" . env('CHATWOOT_DB_PORT', '5432') . 
            ";dbname=" . env('CHATWOOT_DB_DATABASE', 'chatwoot'),
            env('CHATWOOT_DB_USERNAME', 'postgres'),
            env('CHATWOOT_DB_PASSWORD')
        );
        
        // Inboxes
        $stmt = $chatwootPdo->query("SELECT id, name, channel_type, account_id FROM inboxes WHERE account_id = 1");
        $inboxes = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        // Conversaciones recientes
        $stmt = $chatwootPdo->query("SELECT id, inbox_id, status, created_at FROM conversations WHERE account_id = 1 ORDER BY created_at DESC LIMIT 5");
        $conversations = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        // Mensajes recientes
        $stmt = $chatwootPdo->query("SELECT m.id, m.content, m.message_type, m.created_at, m.conversation_id FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.account_id = 1 ORDER BY m.created_at DESC LIMIT 10");
        $messages = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        return response()->json([
            'success' => true,
            'inboxes' => $inboxes,
            'recent_conversations' => $conversations,
            'recent_messages' => $messages
        ]);
        
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
    }
});

/**
 * �🔧 ACTUALIZAR WEBHOOK DE N8N CON TODAS LAS SUBSCRIPCIONES
 * GET /api/fix-n8n-webhook
 */

/**
 * 🔄 ACTUALIZAR WORKFLOW N8N EXISTENTE PARA ACEPTAR FORMATO CHATWOOT
 * GET /api/fix-n8n-workflow/{instanceName?}
 */

// ============== 🔍 DIAGNÓSTICO DE SESIONES Y ENRUTAMIENTO ==============
// Usar cuando hay problemas de mensajes yendo al usuario incorrecto

// ====================================
// 🔧 CARGAR RUTAS DE DEBUG (solo en desarrollo)
// ====================================
if (app()->environment('local', 'development', 'staging')) {
    require __DIR__ . '/debug.php';
}

