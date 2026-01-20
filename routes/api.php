<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use App\Http\Controllers\OnboardingApiController;
use App\Http\Controllers\Api\ChatwootController;
use App\Events\NewMessageReceived;

// 🔧 FIX: Cambiar logo_url a TEXT para soportar base64
Route::get('/fix-logo-column', function () {
    try {
        // Cambiar logo_url de VARCHAR a TEXT
        DB::statement("ALTER TABLE companies ALTER COLUMN logo_url TYPE TEXT");
        
        // Limpiar los paths antiguos que ya no funcionan
        DB::table('companies')->update(['logo_url' => null]);
        
        return response()->json([
            'success' => true,
            'message' => 'Columna logo_url cambiada a TEXT y limpiada. Sube el logo nuevamente.'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔄 REGENERAR TOKEN DE CHATWOOT - Crea un nuevo access_token válido para el usuario
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
        
        Log::info('✅ Token de Chatwoot regenerado', [
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

// 🔍 VERIFICAR ESTADO COMPLETO DE UN USUARIO EN CHATWOOT
Route::get('/debug-user-chatwoot/{userId}', function ($userId) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        
        $user = \App\Models\User::find($userId);
        if (!$user) {
            return response()->json(['error' => 'Usuario no encontrado'], 404);
        }
        
        $company = $user->company;
        
        // Datos de Laravel
        $laravelData = [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'company_slug' => $user->company_slug,
            'chatwoot_agent_id' => $user->chatwoot_agent_id,
            'chatwoot_inbox_id' => $user->chatwoot_inbox_id,
            'chatwoot_agent_token' => $user->chatwoot_agent_token ? substr($user->chatwoot_agent_token, 0, 8) . '...' : null,
            'chatwoot_agent_token_length' => strlen($user->chatwoot_agent_token ?? '')
        ];
        
        $companyData = $company ? [
            'id' => $company->id,
            'name' => $company->name,
            'slug' => $company->slug,
            'chatwoot_account_id' => $company->chatwoot_account_id,
            'chatwoot_inbox_id' => $company->chatwoot_inbox_id,
            'chatwoot_api_key' => $company->chatwoot_api_key ? substr($company->chatwoot_api_key, 0, 8) . '...' : null
        ] : null;
        
        // Datos de Chatwoot
        $chatwootUser = $user->chatwoot_agent_id 
            ? $chatwootDb->table('users')->find($user->chatwoot_agent_id) 
            : null;
        
        $accessTokens = $user->chatwoot_agent_id 
            ? $chatwootDb->table('access_tokens')
                ->where('owner_type', 'User')
                ->where('owner_id', $user->chatwoot_agent_id)
                ->get()
            : collect([]);
        
        $tokenMatch = false;
        foreach ($accessTokens as $token) {
            if ($token->token === $user->chatwoot_agent_token) {
                $tokenMatch = true;
                break;
            }
        }
        
        $accountUser = $user->chatwoot_agent_id && $company && $company->chatwoot_account_id
            ? $chatwootDb->table('account_users')
                ->where('user_id', $user->chatwoot_agent_id)
                ->where('account_id', $company->chatwoot_account_id)
                ->first()
            : null;
        
        $inboxMember = $user->chatwoot_agent_id && $user->chatwoot_inbox_id
            ? $chatwootDb->table('inbox_members')
                ->where('user_id', $user->chatwoot_agent_id)
                ->where('inbox_id', $user->chatwoot_inbox_id)
                ->first()
            : null;
        
        return response()->json([
            'success' => true,
            'laravel' => $laravelData,
            'company' => $companyData,
            'chatwoot' => [
                'user_exists' => $chatwootUser ? true : false,
                'user' => $chatwootUser ? [
                    'id' => $chatwootUser->id,
                    'email' => $chatwootUser->email,
                    'name' => $chatwootUser->name
                ] : null,
                'access_tokens_count' => $accessTokens->count(),
                'token_match' => $tokenMatch,
                'account_user_exists' => $accountUser ? true : false,
                'account_user_role' => $accountUser ? $accountUser->role : null,
                'inbox_member_exists' => $inboxMember ? true : false
            ],
            'diagnosis' => [
                'has_chatwoot_user' => $chatwootUser ? '✅' : '❌ No existe en Chatwoot',
                'has_valid_token' => $tokenMatch ? '✅' : '❌ Token no coincide',
                'has_account_access' => $accountUser ? '✅' : '❌ No tiene acceso a account',
                'has_inbox_access' => $inboxMember ? '✅' : '❌ No tiene acceso a inbox',
                'recommendation' => !$tokenMatch ? 'Ejecutar /api/regenerate-chatwoot-token/' . $userId : 'Token OK'
            ]
        ]);
        
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// �🔧 FIX TEMPORAL: Arreglar usuarios sin inbox_id
Route::get('/fix-user-inbox/{email}', function ($email) {
    $updated = DB::table('users')
        ->where('email', $email)
        ->update([
            'chatwoot_inbox_id' => 1,
            'onboarding_completed' => true,
            'updated_at' => now()
        ]);
    
    return response()->json([
        'success' => $updated > 0,
        'message' => $updated > 0 ? "Usuario {$email} actualizado con inbox_id=1" : "Usuario no encontrado",
        'rows_affected' => $updated
    ]);
});

// 🔥 RESET TOTAL: Borra TODO (Laravel + Chatwoot) - SOLO PARA DESARROLLO
Route::get('/reset-all-databases/{confirm}', function ($confirm) {
    if ($confirm !== 'SI-BORRAR-TODO') {
        return response()->json([
            'error' => 'Para confirmar usa: /api/reset-all-databases/SI-BORRAR-TODO'
        ], 400);
    }
    
    $results = [];
    
    try {
        // 1. Borrar tablas de Laravel (usuarios, empresas, etc)
        DB::statement('SET session_replication_role = replica;'); // Deshabilitar FK temporalmente
        
        $laravelTables = ['users', 'companies', 'whatsapp_instances', 'sessions', 'cache', 'jobs', 'failed_jobs'];
        foreach ($laravelTables as $table) {
            try {
                DB::table($table)->truncate();
                $results[] = "✅ Truncated: {$table}";
            } catch (\Exception $e) {
                $results[] = "⚠️ Skip {$table}: " . $e->getMessage();
            }
        }
        
        // 2. Borrar tablas de Chatwoot
        $chatwootDb = DB::connection('chatwoot');
        $chatwootDb->statement('SET session_replication_role = replica;');
        
        $chatwootTables = [
            'inbox_members', 'inboxes', 'channel_api', 'access_tokens',
            'account_users', 'users', 'accounts', 'conversations', 'messages', 'contacts'
        ];
        
        foreach ($chatwootTables as $table) {
            try {
                $chatwootDb->table($table)->truncate();
                $results[] = "✅ Chatwoot truncated: {$table}";
            } catch (\Exception $e) {
                $results[] = "⚠️ Chatwoot skip {$table}: " . $e->getMessage();
            }
        }
        
        // Re-habilitar FK
        DB::statement('SET session_replication_role = DEFAULT;');
        $chatwootDb->statement('SET session_replication_role = DEFAULT;');
        
        // 3. Ejecutar migraciones de Laravel
        Artisan::call('migrate', ['--force' => true]);
        $results[] = "✅ Laravel migrations executed";
        
        return response()->json([
            'success' => true,
            'message' => '🔥 RESET COMPLETO',
            'results' => $results
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'results' => $results
        ], 500);
    }
});

// � DIAGNOSTICAR INBOXES DE CHATWOOT - Ver configuración actual
Route::get('/debug-chatwoot-inboxes', function () {
    try {
        $chatwootDb = DB::connection('chatwoot');
        
        // Obtener todos los inboxes
        $inboxes = $chatwootDb->table('inboxes')
            ->select('inboxes.*')
            ->get();
        
        $inboxesData = [];
        foreach ($inboxes as $inbox) {
            // Obtener canal asociado
            $channel = null;
            if ($inbox->channel_type === 'Channel::Api') {
                $channel = $chatwootDb->table('channel_api')
                    ->where('id', $inbox->channel_id)
                    ->first();
            }
            
            $inboxesData[] = [
                'id' => $inbox->id,
                'name' => $inbox->name,
                'channel_type' => $inbox->channel_type,
                'channel_id' => $inbox->channel_id,
                'account_id' => $inbox->account_id,
                'webhook_url' => $channel->webhook_url ?? null,
                'has_webhook_error' => $channel && str_contains($channel->webhook_url ?? '', 'evolution-api') 
                    && str_contains($channel->webhook_url ?? '', '/chatwoot/webhook'),
            ];
        }
        
        return response()->json([
            'success' => true,
            'total_inboxes' => count($inboxesData),
            'inboxes' => $inboxesData,
            'recommendation' => 'Si hay webhook a evolution-api/chatwoot/webhook, usar /api/fix-chatwoot-inbox-webhook/{inboxId}'
        ]);
        
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// 🔧 ARREGLAR WEBHOOK DEL INBOX - Quitar el webhook inválido a Evolution
Route::get('/fix-chatwoot-inbox-webhook/{inboxId}', function ($inboxId) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        
        // Obtener inbox
        $inbox = $chatwootDb->table('inboxes')->find($inboxId);
        if (!$inbox) {
            return response()->json(['error' => 'Inbox no encontrado'], 404);
        }
        
        // Obtener canal
        if ($inbox->channel_type !== 'Channel::Api') {
            return response()->json(['error' => 'Solo se pueden modificar inboxes de tipo Channel::Api'], 400);
        }
        
        $channel = $chatwootDb->table('channel_api')
            ->where('id', $inbox->channel_id)
            ->first();
        
        if (!$channel) {
            return response()->json(['error' => 'Canal no encontrado'], 404);
        }
        
        $oldWebhook = $channel->webhook_url;
        
        // El webhook correcto debería ser a tu app, no a Evolution
        // Evolution recibe mensajes vía su propio webhook global
        // Chatwoot debería enviar webhooks a tu app
        $newWebhook = 'https://app.withmia.com/api/chatwoot/webhook';
        
        // Actualizar webhook
        $chatwootDb->table('channel_api')
            ->where('id', $inbox->channel_id)
            ->update([
                'webhook_url' => $newWebhook,
                'updated_at' => now()
            ]);
        
        Log::info('✅ Webhook de inbox actualizado', [
            'inbox_id' => $inboxId,
            'old_webhook' => $oldWebhook,
            'new_webhook' => $newWebhook
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Webhook actualizado correctamente',
            'inbox_id' => $inboxId,
            'inbox_name' => $inbox->name,
            'old_webhook' => $oldWebhook,
            'new_webhook' => $newWebhook
        ]);
        
    } catch (\Exception $e) {
        Log::error('Error actualizando webhook de inbox', [
            'inbox_id' => $inboxId,
            'error' => $e->getMessage()
        ]);
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// �🔄 Actualizar workflow RAG existente con el nuevo template
Route::get('/update-rag-workflow/{companySlug}', function ($companySlug) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $qdrantService = app(\App\Services\QdrantService::class);
        
        // Cargar template actualizado
        $templatePath = base_path('workflows/rag-documents-updated.json');
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
                'webhook_url' => env('N8N_PUBLIC_URL', 'https://n8n-production-00dd.up.railway.app') . "/webhook/{$webhookPath}"
            ]);
        }
        
        return response()->json(['error' => $result['error'] ?? 'Unknown error'], 500);
        
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// 🔄 Actualizar TODOS los workflows RAG de todas las empresas
Route::get('/update-all-rag-workflows', function () {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $qdrantService = app(\App\Services\QdrantService::class);
        
        // Cargar template actualizado
        $templatePath = base_path('workflows/rag-documents-updated.json');
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
        $webhookPath = "whatsapp-{$instanceName}";
        return [
            'name' => "WhatsApp Bot - {$instanceName}",
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
                    'name' => 'Webhook WhatsApp',
                    'webhookId' => \Illuminate\Support\Str::uuid()->toString()
                ]
            ],
            'connections' => new \stdClass(),
            'settings' => ['executionOrder' => 'v1']
        ];
    }
}

// 🔄 RESETEAR WORKFLOW PARA PRUEBAS (limpiar n8n_workflow_id)
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

// 🔍 DEBUG: Ver usuarios en la base de datos
Route::get('/debug-users', function () {
    $users = \App\Models\User::all(['id', 'name', 'email', 'created_at']);
    return response()->json([
        'total' => $users->count(),
        'users' => $users
    ]);
});

// 🔍 DEBUG: Ver tokens de usuarios
Route::get('/debug-tokens', function () {
    $users = \App\Models\User::all(['id', 'name', 'email', 'auth_token']);
    return response()->json([
        'total' => $users->count(),
        'users' => $users->map(function($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'auth_token' => $u->auth_token,
                'token_length' => strlen($u->auth_token ?? '')
            ];
        })
    ]);
});

// 🔍 DEBUG: Session info
Route::get('/debug-session', function (\Illuminate\Http\Request $request) {
    return response()->json([
        'authenticated' => \Illuminate\Support\Facades\Auth::check(),
        'user_id' => \Illuminate\Support\Facades\Auth::id(),
        'session_id' => session()->getId(),
        'session_driver' => config('session.driver'),
        'session_domain' => config('session.domain'),
        'session_secure' => config('session.secure'),
        'session_same_site' => config('session.same_site'),
        'cookies' => array_keys($request->cookies->all()),
        'session_data' => session()->all(),
    ]);
});

// 🔍 DEBUG: Limpiar caché de Redis
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

// 🗑️ TRUNCATE ALL TABLES - Eliminar todos los datos manteniendo estructura
Route::get('/truncate-all-tables', function () {
    try {
        Artisan::call('db:truncate-all', ['--force' => true]);
        $output = Artisan::output();
        
        return response()->json([
            'success' => true,
            'message' => 'All tables truncated successfully',
            'output' => $output
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// � RUN MIGRATIONS
Route::get('/run-migrations', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);
        $output = Artisan::output();
        
        return response()->json([
            'success' => true,
            'message' => 'Migrations executed successfully',
            'output' => $output
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// �🗑️ WIPE DATABASE - Solo estructura, sin datos
Route::get('/wipe-database', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', [
            '--force' => true
        ]);
        $output = \Illuminate\Support\Facades\Artisan::output();
        return response()->json([
            'success' => true,
            'message' => 'Database wiped - empty tables created',
            'output' => $output
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// 🧹 CLEANUP TEST DATA - Keep only specified company
Route::get('/cleanup-test-data/{keepSlug}', function ($keepSlug) {
    try {
        $output = \Illuminate\Support\Facades\Artisan::call('cleanup:test-data', [
            '--keep-slug' => $keepSlug
        ]);
        return response()->json([
            'success' => true,
            'message' => "Cleanup completed, kept company: {$keepSlug}",
            'output' => \Illuminate\Support\Facades\Artisan::output()
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// ⚡ ACTIVAR WORKFLOW n8n
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

// 🔧 ARREGLAR WORKFLOW EXISTENTE - Obtener, corregir nodos con error y actualizar
Route::get('/fix-workflow/{workflowId}', function ($workflowId) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        
        // 1. Obtener workflow actual
        $getResult = $n8nService->getWorkflow($workflowId);
        if (!$getResult['success']) {
            return response()->json(['error' => 'No se pudo obtener workflow', 'details' => $getResult], 400);
        }
        
        $workflow = $getResult['data'];
        $nodes = $workflow['nodes'] ?? [];
        $fixedNodes = [];
        $fixes = [];
        
        foreach ($nodes as $node) {
            $nodeType = $node['type'] ?? '';
            $nodeName = $node['name'] ?? '';
            
            // Arreglar nodo OpenAI Chat Model
            if (strpos($nodeType, 'lmChatOpenAi') !== false) {
                // Corregir modelo
                if (isset($node['parameters']['model'])) {
                    $model = $node['parameters']['model'];
                    if (is_array($model) && isset($model['value'])) {
                        $modelValue = $model['value'];
                        // Corregir modelos incorrectos
                        if ($modelValue === 'gpt-4.1-mini' || $modelValue === 'gpt-4-mini') {
                            $node['parameters']['model'] = 'gpt-4o-mini';
                            $fixes[] = "Corregido modelo de '$modelValue' a 'gpt-4o-mini'";
                        }
                    }
                }
                // Asegurar options es objeto
                if (!isset($node['parameters']['options']) || empty($node['parameters']['options'])) {
                    $node['parameters']['options'] = new \stdClass();
                }
            }
            
            // Asegurar que parameters nunca es array vacío
            if (isset($node['parameters']) && is_array($node['parameters']) && empty($node['parameters'])) {
                $node['parameters'] = new \stdClass();
                $fixes[] = "Corregido parameters vacío en nodo '$nodeName'";
            }
            
            $fixedNodes[] = $node;
        }
        
        // 2. Actualizar workflow con nodos corregidos
        $updateData = [
            'name' => $workflow['name'],
            'nodes' => $fixedNodes,
            'connections' => $workflow['connections'] ?? new \stdClass(),
            'settings' => $workflow['settings'] ?? ['executionOrder' => 'v1']
        ];
        
        $updateResult = $n8nService->updateWorkflow($workflowId, $updateData);
        
        // 3. Activar workflow
        $activateResult = $n8nService->activateWorkflow($workflowId);
        
        return response()->json([
            'success' => true,
            'workflow_id' => $workflowId,
            'fixes_applied' => $fixes,
            'update_result' => $updateResult,
            'activate_result' => $activateResult
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// 🚀 CREAR WORKFLOW MINIMALISTA (sin template JSON)
Route::get('/create-minimal-workflow/{instanceName}', function ($instanceName) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $evolutionApi = app(\App\Services\EvolutionApiService::class);
        
        // Usar workflow minimalista directamente
        $workflow = getMinimalWorkflow($instanceName);
        
        Log::info('🔧 Creando workflow minimalista', ['name' => $workflow['name']]);
        
        // Crear en n8n
        $result = $n8nService->createWorkflow($workflow);
        
        if ($result['success']) {
            $workflowId = $result['data']['id'] ?? null;
            $webhookUrl = $n8nService->getWebhookUrl($instanceName);
            
            // Activar
            if ($workflowId) {
                $activateResult = $n8nService->activateWorkflow($workflowId);
                Log::info('✅ Workflow activado', ['id' => $workflowId, 'result' => $activateResult]);
            }
            
            // Configurar webhook de Evolution hacia n8n
            $evolutionResult = $evolutionApi->setWebhook(
                $instanceName,
                $webhookUrl,
                ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
            );
            Log::info('🔗 Webhook Evolution configurado', ['result' => $evolutionResult]);
            
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
        Log::error('❌ Error creando workflow minimalista', ['error' => $e->getMessage()]);
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// 🚀 CREAR WORKFLOW N8N MANUALMENTE
Route::get('/create-n8n-workflow/{instanceName}', function ($instanceName) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $evolutionApi = app(\App\Services\EvolutionApiService::class);
        $qdrantService = app(\App\Services\QdrantService::class);
        
        // Buscar la instancia para obtener el company_slug
        $instance = \Illuminate\Support\Facades\DB::table('whatsapp_instances')
            ->where('instance_name', $instanceName)
            ->first();
        
        $companySlug = $instance->company_slug ?? null;
        $collectionName = $companySlug ? $qdrantService->getCollectionName($companySlug) : 'coleccion';
        
        Log::info("Creando workflow para {$instanceName}", [
            'company_slug' => $companySlug,
            'collection_name' => $collectionName
        ]);
        
        // Cargar template
        $templatePath = base_path('workflows/whatsapp-bot-updated.json');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Template no encontrado: ' . $templatePath], 404);
        }
        
        // Limpiar BOM y caracteres problemáticos
        $content = file_get_contents($templatePath);
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
        
        $templateWorkflow = json_decode($content, true);
        if (!$templateWorkflow) {
            // Fallback a workflow minimalista
            $templateWorkflow = getMinimalWorkflow($instanceName);
        }
        
        // Limpiar nodos
        $newWebhookId = \Illuminate\Support\Str::uuid()->toString();
        $cleanNodes = [];
        foreach ($templateWorkflow['nodes'] ?? [] as $node) {
            $cleanNode = [
                'parameters' => $node['parameters'] ?? [],
                'type' => $node['type'],
                'typeVersion' => $node['typeVersion'] ?? 1,
                'position' => $node['position'],
                'id' => $node['id'],
                'name' => $node['name'],
            ];
            
            if (isset($node['credentials'])) {
                $cleanNode['credentials'] = $node['credentials'];
            }
            
            if ($node['type'] === 'n8n-nodes-base.webhook') {
                $cleanNode['webhookId'] = $newWebhookId;
                if (isset($cleanNode['parameters']['path'])) {
                    $cleanNode['parameters']['path'] = "whatsapp-{$instanceName}";
                }
            }
            
            // 🔧 Configurar Qdrant con la colección correcta de la empresa
            if ($node['type'] === '@n8n/n8n-nodes-langchain.vectorStoreQdrant') {
                $cleanNode['parameters']['qdrantCollection'] = [
                    '__rl' => true,
                    'value' => $collectionName,
                    'mode' => 'id'
                ];
                Log::info("Configurando Qdrant con colección: {$collectionName}");
            }
            
            // 🔧 Simplificar prompt del AI Agent para evitar error 500 de n8n
            if ($node['type'] === '@n8n/n8n-nodes-langchain.agent') {
                $cleanNode['parameters']['text'] = "Responde como asistente de {$instanceName}";
                $cleanNode['parameters']['options'] = [
                    'systemMessage' => "Eres MIA, asistente digital. Responde de forma profesional y amigable."
                ];
            }
            
            $cleanNodes[] = $cleanNode;
        }
        
        $cleanWorkflow = [
            'name' => "WhatsApp Bot - {$instanceName}",
            'nodes' => $cleanNodes,
            'connections' => $templateWorkflow['connections'] ?? new \stdClass(),
            'settings' => ['executionOrder' => 'v1'],
        ];
        
        // Crear en n8n
        $result = $n8nService->createWorkflow($cleanWorkflow);
        
        if ($result['success']) {
            $workflowId = $result['data']['id'] ?? null;
            $webhookUrl = $n8nService->getWebhookUrl($instanceName);
            
            // Activar
            if ($workflowId) {
                $activateResult = $n8nService->activateWorkflow($workflowId);
                Log::info('✅ Workflow activado', ['id' => $workflowId, 'result' => $activateResult]);
            }
            
            // Configurar webhook de Evolution hacia n8n
            $evolutionResult = $evolutionApi->setWebhook(
                $instanceName,
                $webhookUrl,
                ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
            );
            Log::info('🔗 Webhook Evolution configurado', ['result' => $evolutionResult]);
            
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
                'evolution_webhook' => $evolutionResult,
                'message' => 'Workflow creado, activado y Evolution configurado!'
            ]);
        }
        
        return response()->json(['error' => 'Error creando workflow', 'details' => $result], 500);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Health check endpoint for Railway
Route::get('/health', function () {
    try {
        // Verificar conexión a base de datos
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

// 🔧 DEBUG: Test broadcast - Solo verificar que Pusher funciona (no crea conversaciones)
Route::get('/test-broadcast/{inboxId}', function ($inboxId) {
    try {
        $key = config('broadcasting.connections.pusher.key');
        $secret = config('broadcasting.connections.pusher.secret');
        $appId = config('broadcasting.connections.pusher.app_id');
        $cluster = config('broadcasting.connections.pusher.options.cluster');
        
        $pusher = new \Pusher\Pusher($key, $secret, $appId, [
            'cluster' => $cluster,
            'useTLS' => true,
        ]);
        
        // Solo enviar ping de prueba, no simular mensaje real
        $result = $pusher->trigger('private-inbox.' . $inboxId, 'ping', [
            'test' => true,
            'timestamp' => now()->toIso8601String(),
        ]);
        
        return response()->json([
            'status' => 'success',
            'message' => 'Ping sent to private-inbox.' . $inboxId,
            'pusher_working' => true,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 500);
    }
});

// Test endpoint using Laravel broadcast() function
Route::get('/test-laravel-broadcast/{inboxId}', function ($inboxId) {
    try {
        // Test NewMessageReceived event
        broadcast(new \App\Events\NewMessageReceived(
            [
                'content' => 'Test Laravel broadcast ' . now()->format('H:i:s'),
                'phone' => '5491234567890',
                'from_me' => false,
                'test' => true,
            ],
            999, // fake conversation ID
            (int)$inboxId,
            1
        ));
        
        return response()->json([
            'status' => 'success',
            'message' => 'Laravel broadcast sent to inbox.' . $inboxId,
            'queue_connection' => config('queue.default'),
            'broadcast_driver' => config('broadcasting.default'),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ], 500);
    }
});

// Test endpoint para simular mensaje REAL (sin flag test) - para debugging
Route::get('/test-real-broadcast/{inboxId}/{conversationId}', function ($inboxId, $conversationId) {
    try {
        // Simular un mensaje real de Chatwoot
        broadcast(new \App\Events\NewMessageReceived(
            [
                'id' => rand(10000, 99999),
                'content' => '🔔 Mensaje de prueba REAL ' . now()->format('H:i:s'),
                'message_type' => 0, // incoming
                'created_at' => now()->toIso8601String(),
                'sender' => [
                    'id' => 1,
                    'name' => 'Test Contact',
                    'type' => 'contact'
                ]
            ],
            (int)$conversationId,
            (int)$inboxId,
            1
        ));
        
        return response()->json([
            'status' => 'success',
            'message' => "Broadcast REAL enviado a inbox.{$inboxId} para conversación {$conversationId}",
            'broadcast_driver' => config('broadcasting.default'),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 500);
    }
});

// Habilitar autenticación de canales de broadcasting

// 🔧 SETUP: Ver webhooks de Chatwoot existentes
Route::get('/setup-chatwoot-webhook', function () {
    try {
        $user = \App\Models\User::first();
        $company = $user->company;
        
        if (!$company || !$company->chatwoot_account_id) {
            return response()->json(['error' => 'No company/account found'], 400);
        }
        
        $chatwootUrl = config('services.chatwoot.base_url', 'https://chatwoot.withmia.com');
        $apiKey = $user->chatwoot_agent_token ?? $company->chatwoot_api_key;
        $accountId = $company->chatwoot_account_id;
        $appUrl = config('app.url', 'https://app.withmia.com');
        $webhookUrl = "{$appUrl}/api/chatwoot/webhook";
        
        // Ver webhooks existentes
        $existingResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'api_access_token' => $apiKey
        ])->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks");
        
        $existingWebhooks = $existingResponse->json()['payload'] ?? $existingResponse->json() ?? [];
        
        return response()->json([
            'status' => 'ok',
            'chatwoot_url' => $chatwootUrl,
            'account_id' => $accountId,
            'expected_webhook_url' => $webhookUrl,
            'existing_webhooks' => $existingWebhooks,
            'api_key_used' => substr($apiKey, 0, 10) . '...',
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// 🔧 RECREAR webhook de Chatwoot con ID=1 (elimina todos, resetea secuencia, crea nuevo)
Route::get('/recreate-chatwoot-webhook', function () {
    try {
        $user = \App\Models\User::first();
        $company = $user->company;
        
        $chatwootUrl = config('services.chatwoot.base_url', 'https://chatwoot.withmia.com');
        $apiKey = $user->chatwoot_agent_token ?? $company->chatwoot_api_key;
        $accountId = $company->chatwoot_account_id;
        $appUrl = config('app.url', 'https://app.withmia.com');
        $webhookUrl = "{$appUrl}/api/chatwoot/webhook";
        
        // 1. Conectar a la base de datos de Chatwoot y limpiar webhooks + resetear secuencia
        $sequenceReset = false;
        $dbError = null;
        try {
            // Usar la URL de Railway interna o externa según disponibilidad
            $chatwootDbUrl = env('CHATWOOT_DATABASE_URL', 'postgresql://postgres:dzMmfzVhEDLgeRIAvRlWofFnagOyItjs@postgres.railway.internal:5432/chatwoot');
            $parsed = parse_url($chatwootDbUrl);
            $chatwootPdo = new \PDO(
                "pgsql:host={$parsed['host']};port={$parsed['port']};dbname=" . ltrim($parsed['path'], '/'),
                $parsed['user'],
                $parsed['pass']
            );
            // Eliminar todos los webhooks directamente y resetear secuencia
            $chatwootPdo->exec("DELETE FROM webhooks");
            $chatwootPdo->exec("ALTER SEQUENCE webhooks_id_seq RESTART WITH 1");
            $sequenceReset = true;
        } catch (\Exception $e) {
            $dbError = $e->getMessage();
            
            // Fallback: Eliminar via API si no podemos acceder a la DB directamente
            $existingResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'api_access_token' => $apiKey
            ])->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks");
            
            $webhooks = $existingResponse->json()['payload']['webhooks'] ?? $existingResponse->json()['webhooks'] ?? [];
            
            foreach ($webhooks as $wh) {
                if (isset($wh['id'])) {
                    \Illuminate\Support\Facades\Http::withHeaders([
                        'api_access_token' => $apiKey
                    ])->delete("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks/{$wh['id']}");
                }
            }
        }
        
        // 2. Crear nuevo webhook (será ID=1 si el reset funcionó)
        $createResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'api_access_token' => $apiKey,
            'Content-Type' => 'application/json'
        ])->post("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks", [
            'webhook' => [
                'url' => $webhookUrl,
                'subscriptions' => ['message_created', 'message_updated', 'conversation_created', 'conversation_updated', 'conversation_status_changed']
            ]
        ]);
        
        return response()->json([
            'status' => $createResponse->successful() ? ($sequenceReset ? 'recreated_with_id_1' : 'recreated_no_reset') : 'error',
            'sequence_reset' => $sequenceReset,
            'db_error' => $dbError,
            'new_webhook' => $createResponse->json(),
            'webhook_url' => $webhookUrl
        ]);
        
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

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
Route::middleware(['web', 'auth'])->prefix('chatwoot-proxy')->group(function () {
    // Conversaciones
    Route::get('/conversations', [ChatwootController::class, 'getConversations']);
    Route::get('/conversations/export-all', [ChatwootController::class, 'exportAllConversationsWithMessages']);
    Route::get('/conversations/{id}', [ChatwootController::class, 'getConversation']);
    Route::get('/conversations/{id}/messages', [ChatwootController::class, 'getConversationMessages']);
    Route::delete('/conversations/{conversationId}', [ChatwootController::class, 'deleteConversation']);
    Route::post('/conversations/deduplicate-auto', [ChatwootController::class, 'deduplicateConversationsAuto']);
    Route::post('/conversations/{id}/messages', [ChatwootController::class, 'sendMessage']);
    Route::post('/conversations/{id}/update_last_seen', [ChatwootController::class, 'markAsRead']);

    // Equipos
    Route::get('/teams', [ChatwootController::class, 'getTeams']);
    Route::post('/teams', [ChatwootController::class, 'createTeam']);

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
});

// Proxy para archivos/imágenes de Chatwoot - SIN autenticación (las imágenes se cargan vía <img src>)
// Usa controlador separado sin dependencias de autenticación
Route::get('/chatwoot-proxy/attachment-proxy', [\App\Http\Controllers\AttachmentProxyController::class, 'proxy']);

// ============= BAILEYS WHATSAPP API ROUTES =============
Route::prefix('baileys-whatsapp')->group(function () {
});

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

use App\Http\Controllers\ChatwootWebhookController;

// Webhook de Chatwoot para notificaciones en tiempo real
Route::post('/webhooks/chatwoot', [ChatwootWebhookController::class, 'handle'])
    ->name('chatwoot.webhook');

// Knowledge Base / Conocimientos API routes - authenticated via RailwayAuthToken
Route::middleware(['railway.auth:true'])->group(function () {
    // Onboarding data
    Route::get('/onboarding-data', [\App\Http\Controllers\KnowledgeController::class, 'getOnboardingData']);
    Route::put('/onboarding-data', [\App\Http\Controllers\KnowledgeController::class, 'updateOnboardingData']);
    Route::post('/company/logo', [\App\Http\Controllers\KnowledgeController::class, 'uploadCompanyLogo']);
    Route::post('/knowledge/upload-document', [\App\Http\Controllers\KnowledgeController::class, 'uploadDocument']);
    
    // Documents
    Route::get('/documents', [\App\Http\Controllers\KnowledgeController::class, 'getDocuments']);
    Route::post('/documents/metadata', [\App\Http\Controllers\KnowledgeController::class, 'storeDocumentMetadata']);
    Route::delete('/documents/{id}', [\App\Http\Controllers\KnowledgeController::class, 'deleteDocument']);
    Route::post('/documents/update-vector-ids', [\App\Http\Controllers\KnowledgeController::class, 'updateVectorIds']);
    
    // Proxy to n8n RAG webhook (avoids CORS issues)
    Route::post('/documents/process-rag', [\App\Http\Controllers\KnowledgeController::class, 'proxyToN8n']);
    
    // Reset workflow (creates new simplified workflow for company)
    Route::post('/documents/reset-workflow', [\App\Http\Controllers\KnowledgeController::class, 'resetWorkflow']);
});

// Public webhook endpoint for n8n (no authentication)
Route::post('/n8n/update-vector-ids', [\App\Http\Controllers\KnowledgeController::class, 'updateVectorIdsWebhook']);

// n8n chunk notification endpoint (no authentication - called after each chunk is stored in Qdrant)
Route::post('/knowledge/chunk-stored', [\App\Http\Controllers\KnowledgeController::class, 'chunkStored']);

// WhatsApp Instance lookup endpoint (no authentication - used by n8n)
Route::get('/whatsapp/instance/{instanceName}/company', [\App\Http\Controllers\Api\WhatsAppInstanceController::class, 'getCompanyByInstance']);

// 🔧 FIX: Reparar tokens de Chatwoot para usuarios existentes
// Este endpoint crea el access_token en la base de datos de Chatwoot si no existe
Route::get('/fix-chatwoot-token/{userId?}', function ($userId = null) {
    try {
        $user = $userId 
            ? \App\Models\User::findOrFail($userId)
            : \App\Models\User::first();
        
        if (!$user->chatwoot_agent_id) {
            return response()->json([
                'success' => false,
                'error' => 'El usuario no tiene chatwoot_agent_id asignado'
            ], 400);
        }
        
        $chatwootDb = DB::connection('chatwoot');
        
        // Verificar si ya existe un token en Chatwoot
        $existingToken = $chatwootDb->table('access_tokens')
            ->where('owner_type', 'User')
            ->where('owner_id', $user->chatwoot_agent_id)
            ->first();
        
        if ($existingToken) {
            // Ya existe, actualizar el token del usuario en Laravel con el de Chatwoot
            $user->update([
                'chatwoot_agent_token' => $existingToken->token
            ]);
            
            Log::info('✅ Token sincronizado desde Chatwoot', [
                'user_id' => $user->id,
                'chatwoot_user_id' => $user->chatwoot_agent_id
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Token sincronizado desde Chatwoot existente',
                'user_id' => $user->id,
                'chatwoot_user_id' => $user->chatwoot_agent_id,
                'token_prefix' => substr($existingToken->token, 0, 8) . '...',
                'action' => 'synced_existing'
            ]);
        }
        
        // No existe, crear nuevo token en Chatwoot
        $newToken = \Illuminate\Support\Str::random(24);
        
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
        
        Log::info('✅ Nuevo token creado en Chatwoot', [
            'user_id' => $user->id,
            'chatwoot_user_id' => $user->chatwoot_agent_id
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Nuevo token creado en Chatwoot y sincronizado',
            'user_id' => $user->id,
            'chatwoot_user_id' => $user->chatwoot_agent_id,
            'token_prefix' => substr($newToken, 0, 8) . '...',
            'action' => 'created_new'
        ]);
        
    } catch (\Exception $e) {
        Log::error('❌ Error fixing Chatwoot token', [
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔧 FIX: Reparar TODOS los tokens de Chatwoot para todos los usuarios
Route::get('/fix-all-chatwoot-tokens', function () {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $users = \App\Models\User::whereNotNull('chatwoot_agent_id')->get();
        $results = [];
        
        foreach ($users as $user) {
            // Verificar si ya existe un token en Chatwoot
            $existingToken = $chatwootDb->table('access_tokens')
                ->where('owner_type', 'User')
                ->where('owner_id', $user->chatwoot_agent_id)
                ->first();
            
            if ($existingToken) {
                // Sincronizar
                $user->update(['chatwoot_agent_token' => $existingToken->token]);
                $results[] = [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'action' => 'synced',
                    'token_prefix' => substr($existingToken->token, 0, 8) . '...'
                ];
            } else {
                // Crear nuevo
                $newToken = \Illuminate\Support\Str::random(24);
                $chatwootDb->table('access_tokens')->insert([
                    'owner_type' => 'User',
                    'owner_id' => $user->chatwoot_agent_id,
                    'token' => $newToken,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                $user->update(['chatwoot_agent_token' => $newToken]);
                $results[] = [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'action' => 'created',
                    'token_prefix' => substr($newToken, 0, 8) . '...'
                ];
            }
        }
        
        Log::info('✅ All Chatwoot tokens fixed', ['count' => count($results)]);
        
        return response()->json([
            'success' => true,
            'message' => 'Todos los tokens reparados',
            'total_users' => count($results),
            'results' => $results
        ]);
        
    } catch (\Exception $e) {
        Log::error('❌ Error fixing all Chatwoot tokens', ['error' => $e->getMessage()]);
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔧 FIX FORZADO: Regenera TODOS los tokens de Chatwoot (borra los viejos y crea nuevos)
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
        
        Log::info('🔄 All Chatwoot tokens REGENERATED', ['count' => count($results)]);
        
        return response()->json([
            'success' => true,
            'message' => 'Todos los tokens REGENERADOS (viejos borrados, nuevos creados)',
            'total_users' => count($results),
            'cache_cleared' => true,
            'results' => $results
        ]);
        
    } catch (\Exception $e) {
        Log::error('❌ Error regenerating Chatwoot tokens', ['error' => $e->getMessage()]);
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔍 DEBUG: Ver estado de tokens y conversaciones
Route::get('/debug-chatwoot-status', function () {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        $company = $user->company;
        
        // Info del usuario en Laravel
        $laravelInfo = [
            'user_id' => $user->id,
            'email' => $user->email,
            'chatwoot_agent_id' => $user->chatwoot_agent_id,
            'chatwoot_inbox_id' => $user->chatwoot_inbox_id,
            'chatwoot_agent_token' => $user->chatwoot_agent_token ? substr($user->chatwoot_agent_token, 0, 8) . '...' : null
        ];
        
        // Info de la company
        $companyInfo = [
            'company_id' => $company->id ?? null,
            'chatwoot_account_id' => $company->chatwoot_account_id ?? null,
            'chatwoot_api_key' => $company->chatwoot_api_key ? substr($company->chatwoot_api_key, 0, 8) . '...' : null,
            'chatwoot_inbox_id' => $company->chatwoot_inbox_id ?? null
        ];
        
        // Usuario en Chatwoot DB
        $chatwootUser = $chatwootDb->table('users')
            ->where('id', $user->chatwoot_agent_id)
            ->first();
        
        $chatwootUserInfo = $chatwootUser ? [
            'id' => $chatwootUser->id,
            'email' => $chatwootUser->email,
            'type' => $chatwootUser->type,
            'name' => $chatwootUser->name
        ] : ['exists' => false];
        
        // Token en Chatwoot DB
        $chatwootToken = $chatwootDb->table('access_tokens')
            ->where('owner_type', 'User')
            ->where('owner_id', $user->chatwoot_agent_id)
            ->first();
        
        $chatwootTokenInfo = $chatwootToken ? [
            'exists' => true,
            'token_prefix' => substr($chatwootToken->token, 0, 8) . '...',
            'matches_laravel' => $chatwootToken->token === $user->chatwoot_agent_token,
            'owner_type' => $chatwootToken->owner_type,
            'owner_id' => $chatwootToken->owner_id,
            'created_at' => $chatwootToken->created_at
        ] : ['exists' => false];
        
        // Probar API de Chatwoot
        $apiTest = null;
        if ($user->chatwoot_agent_token) {
            $chatwootUrl = config('chatwoot.url');
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'api_access_token' => $user->chatwoot_agent_token,
            ])->timeout(5)->get("{$chatwootUrl}/api/v1/accounts/{$company->chatwoot_account_id}/conversations", [
                'inbox_id' => $user->chatwoot_inbox_id,
                'page' => 1,
                'per_page' => 5
            ]);
            
            $apiTest = [
                'status' => $response->status(),
                'success' => $response->successful(),
                'conversations_count' => $response->successful() ? count($response->json()['data']['payload'] ?? []) : 0,
                'error' => !$response->successful() ? $response->body() : null
            ];
        }
        
        // Contar conversaciones en Chatwoot DB directamente
        $directCount = $chatwootDb->table('conversations')
            ->where('account_id', $company->chatwoot_account_id ?? 1)
            ->count();
        
        // Listar todos los inboxes
        $inboxes = $chatwootDb->table('inboxes')
            ->where('account_id', $company->chatwoot_account_id ?? 1)
            ->get(['id', 'name', 'channel_type']);
        
        // Ver últimas conversaciones con detalles
        $lastConversations = $chatwootDb->table('conversations')
            ->where('account_id', $company->chatwoot_account_id ?? 1)
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get(['id', 'inbox_id', 'contact_id', 'display_id', 'status']);
        
        // Ver últimos mensajes
        $conversationIds = $lastConversations->pluck('id')->toArray();
        $lastMessages = [];
        if (!empty($conversationIds)) {
            $lastMessages = $chatwootDb->table('messages')
                ->whereIn('conversation_id', $conversationIds)
                ->orderBy('id', 'desc')
                ->limit(10)
                ->get(['id', 'conversation_id', 'content', 'message_type', 'sender_type', 'created_at']);
        }
        
        // Ver contactos
        $contactIds = $lastConversations->pluck('contact_id')->unique()->toArray();
        $contacts = [];
        if (!empty($contactIds)) {
            $contacts = $chatwootDb->table('contacts')
                ->whereIn('id', $contactIds)
                ->get(['id', 'name', 'email', 'phone_number', 'identifier']);
        }
        
        return response()->json([
            'success' => true,
            'laravel_user' => $laravelInfo,
            'company' => $companyInfo,
            'chatwoot_user' => $chatwootUserInfo,
            'chatwoot_token' => $chatwootTokenInfo,
            'api_test' => $apiTest,
            'conversations_in_db' => $directCount,
            'inboxes' => $inboxes,
            'last_conversations' => $lastConversations,
            'last_messages' => $lastMessages,
            'contacts' => $contacts
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// 🔧 FIX: Corregir el tipo de usuario en Chatwoot si está mal
Route::get('/fix-chatwoot-user-type/{userId?}', function ($userId = null) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $user = $userId 
            ? \App\Models\User::findOrFail($userId)
            : \App\Models\User::where('email', 'withmia.app@gmail.com')->first() ?? \App\Models\User::first();
        
        if (!$user->chatwoot_agent_id) {
            return response()->json([
                'success' => false,
                'error' => 'Usuario no tiene chatwoot_agent_id'
            ], 400);
        }
        
        // Obtener usuario de Chatwoot
        $chatwootUser = $chatwootDb->table('users')
            ->where('id', $user->chatwoot_agent_id)
            ->first();
        
        if (!$chatwootUser) {
            return response()->json([
                'success' => false,
                'error' => 'Usuario no existe en Chatwoot DB'
            ], 404);
        }
        
        $oldType = $chatwootUser->type;
        
        // Corregir el tipo si no es 'User'
        if ($chatwootUser->type !== 'User') {
            $chatwootDb->table('users')
                ->where('id', $user->chatwoot_agent_id)
                ->update(['type' => 'User']);
            
            Log::info('✅ Chatwoot user type fixed', [
                'chatwoot_user_id' => $user->chatwoot_agent_id,
                'old_type' => $oldType,
                'new_type' => 'User'
            ]);
        }
        
        return response()->json([
            'success' => true,
            'user_id' => $user->id,
            'chatwoot_user_id' => $user->chatwoot_agent_id,
            'old_type' => $oldType,
            'new_type' => 'User',
            'action' => $oldType !== 'User' ? 'fixed' : 'already_correct'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔍 DEBUG: Ver configuración de Evolution API + Chatwoot para una instancia
Route::get('/debug-evolution-chatwoot/{instanceName}', function ($instanceName) {
    try {
        // 1. Obtener info de la instancia en Evolution API
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        
        $instanceResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/instance/fetchInstances", [
            'instanceName' => $instanceName
        ]);
        
        $instances = $instanceResponse->json();
        $instanceInfo = null;
        if (is_array($instances)) {
            foreach ($instances as $inst) {
                if (($inst['instance']['instanceName'] ?? '') === $instanceName) {
                    $instanceInfo = $inst;
                    break;
                }
            }
        }
        
        // 2. Obtener settings de Chatwoot de la instancia
        $chatwootSettingsResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instanceName}");
        
        $chatwootSettings = $chatwootSettingsResponse->json();
        
        // 3. Ver todos los inboxes en Chatwoot (directamente en DB)
        $chatwootDb = DB::connection('chatwoot');
        $allInboxes = $chatwootDb->table('inboxes')->get(['id', 'name', 'account_id', 'channel_type']);
        
        // 4. Contar conversaciones por inbox
        $conversationsByInbox = $chatwootDb->table('conversations')
            ->select('inbox_id', DB::raw('count(*) as total'))
            ->groupBy('inbox_id')
            ->get();
        
        return response()->json([
            'success' => true,
            'instance_name' => $instanceName,
            'evolution_instance' => $instanceInfo ? [
                'status' => $instanceInfo['instance']['status'] ?? null,
                'integration' => $instanceInfo['instance']['integration'] ?? null,
            ] : null,
            'chatwoot_settings_from_evolution' => $chatwootSettings,
            'all_chatwoot_inboxes' => $allInboxes,
            'conversations_by_inbox' => $conversationsByInbox
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

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
        
        // IMPORTANTE: Usar el token del usuario (chatwoot_agent_token) 
        // Este es el token registrado en access_tokens de Chatwoot
        $chatwootToken = $user->chatwoot_agent_token;
        
        if (!$chatwootToken) {
            return response()->json([
                'success' => false,
                'error' => 'El usuario no tiene chatwoot_agent_token. Ejecuta primero /api/regenerate-all-chatwoot-tokens'
            ], 400);
        }
        
        // Obtener el nombre del inbox existente de Chatwoot
        $chatwootDb = DB::connection('chatwoot');
        $existingInbox = $chatwootDb->table('inboxes')
            ->where('account_id', $accountId)
            ->first();
        
        // Usar el nombre del inbox existente o crear uno nuevo
        $inboxName = $existingInbox ? $existingInbox->name : "WhatsApp {$company->name}";
        
        // Configurar Chatwoot en Evolution API
        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey,
            'Content-Type' => 'application/json'
        ])->timeout(30)->post("{$evolutionUrl}/chatwoot/set/{$instanceName}", [
            'enabled' => true,
            'accountId' => (string) $accountId,
            'token' => $chatwootToken,
            'url' => $chatwootUrl,
            'signMsg' => false,
            'reopenConversation' => true,
            'conversationPending' => false,
            'nameInbox' => $inboxName,
            'mergeBrazilContacts' => false,
            'importContacts' => false,
            'importMessages' => false,
            'daysLimitImportMessages' => 0,
            'autoCreate' => false // No crear inbox automáticamente, ya existe
        ]);
        
        Log::info('🔧 Chatwoot configured in Evolution API', [
            'instance' => $instanceName,
            'account_id' => $accountId,
            'inbox_name' => $inboxName,
            'token_prefix' => substr($chatwootToken, 0, 8) . '...',
            'response_status' => $response->status(),
            'response_body' => $response->json()
        ]);
        
        return response()->json([
            'success' => $response->successful(),
            'instance' => $instanceName,
            'account_id' => $accountId,
            'chatwoot_url' => $chatwootUrl,
            'inbox_name' => $inboxName,
            'token_used' => substr($chatwootToken, 0, 8) . '...',
            'evolution_response' => $response->json()
        ]);
        
    } catch (\Exception $e) {
        Log::error('❌ Failed to setup Chatwoot in Evolution', ['error' => $e->getMessage()]);
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

Route::middleware(['web', 'auth'])->group(function () {
    
});

// 🔍 DEBUG: Probar obtener mensajes de una conversación específica
Route::get('/debug-conversation-messages/{conversationId}', function ($conversationId) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        $company = $user->company;
        
        // Info del usuario
        $userInfo = [
            'user_id' => $user->id,
            'email' => $user->email,
            'chatwoot_agent_token' => $user->chatwoot_agent_token ? substr($user->chatwoot_agent_token, 0, 8) . '...' : null,
            'chatwoot_inbox_id' => $user->chatwoot_inbox_id,
            'chatwoot_agent_id' => $user->chatwoot_agent_id
        ];
        
        // 1. Buscar la conversación en la DB
        $conversation = $chatwootDb->table('conversations')
            ->where('id', $conversationId)
            ->orWhere('display_id', $conversationId)
            ->first();
        
        if (!$conversation) {
            return response()->json([
                'success' => false,
                'error' => "Conversación no encontrada (id/display_id: {$conversationId})",
                'user_info' => $userInfo
            ], 404);
        }
        
        // 2. Obtener mensajes de la DB
        $messagesFromDb = $chatwootDb->table('messages')
            ->where('conversation_id', $conversation->id)
            ->orderBy('created_at', 'asc')
            ->get(['id', 'content', 'message_type', 'sender_type', 'sender_id', 'created_at']);
        
        // 3. Obtener info del contacto
        $contact = $chatwootDb->table('contacts')
            ->where('id', $conversation->contact_id)
            ->first(['id', 'name', 'email', 'phone_number', 'identifier']);
        
        // 4. Probar la API de Chatwoot con el token del usuario
        $apiResult = null;
        $chatwootUrl = config('chatwoot.url');
        $accountId = $company->chatwoot_account_id ?? 1;
        
        if ($user->chatwoot_agent_token) {
            // Primero probar obtener la conversación
            $convResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'api_access_token' => $user->chatwoot_agent_token,
                'Content-Type' => 'application/json'
            ])->timeout(10)->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}");
            
            $apiResult['get_conversation'] = [
                'status' => $convResponse->status(),
                'success' => $convResponse->successful(),
                'inbox_id_from_api' => $convResponse->successful() ? ($convResponse->json()['inbox_id'] ?? 'N/A') : null,
                'error' => !$convResponse->successful() ? $convResponse->body() : null
            ];
            
            // Luego probar obtener mensajes
            $msgResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'api_access_token' => $user->chatwoot_agent_token,
                'Content-Type' => 'application/json'
            ])->timeout(10)->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/conversations/{$conversationId}/messages");
            
            $apiResult['get_messages'] = [
                'status' => $msgResponse->status(),
                'success' => $msgResponse->successful(),
                'messages_count' => $msgResponse->successful() ? count($msgResponse->json()['payload'] ?? []) : 0,
                'raw_response' => $msgResponse->json()
            ];
        }
        
        // 5. Verificar si hay mismatch de inbox_id
        $inboxMismatch = $conversation->inbox_id != $user->chatwoot_inbox_id;
        
        return response()->json([
            'success' => true,
            'user_info' => $userInfo,
            'conversation' => [
                'id' => $conversation->id,
                'display_id' => $conversation->display_id,
                'inbox_id' => $conversation->inbox_id,
                'contact_id' => $conversation->contact_id,
                'status' => $conversation->status,
                'assignee_id' => $conversation->assignee_id ?? null
            ],
            'inbox_mismatch' => $inboxMismatch,
            'inbox_mismatch_details' => $inboxMismatch ? [
                'conversation_inbox_id' => $conversation->inbox_id,
                'user_inbox_id' => $user->chatwoot_inbox_id,
                'problem' => 'El usuario tiene un inbox_id diferente al de la conversación'
            ] : null,
            'contact' => $contact,
            'messages_in_db' => [
                'count' => $messagesFromDb->count(),
                'messages' => $messagesFromDb
            ],
            'api_test' => $apiResult
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// 🧹 Limpiar caché de conversaciones y regenerar token
Route::get('/clear-conversations-cache', function () {
    try {
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        $company = $user->company;
        $chatwootDb = DB::connection('chatwoot');
        
        // 1. Limpiar caché de conversaciones
        $cacheKey = "conversations_user_{$user->id}_inbox_{$user->chatwoot_inbox_id}";
        $cacheKey2 = "conversations:inbox:{$user->chatwoot_inbox_id}:user:{$user->id}";
        
        $deleted1 = \Illuminate\Support\Facades\Cache::forget($cacheKey);
        $deleted2 = \Illuminate\Support\Facades\Cache::forget($cacheKey2);
        
        // 2. Verificar token actual en Chatwoot DB
        $tokenInChatwoot = $chatwootDb->table('access_tokens')
            ->where('owner_type', 'User')
            ->where('owner_id', $user->chatwoot_agent_id)
            ->first();
        
        $tokenMatch = $tokenInChatwoot && $tokenInChatwoot->token === $user->chatwoot_agent_token;
        
        // 3. Si no coincide, regenerar
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
        
        // 4. Probar el token
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
            'cache_cleared' => [
                'key1' => $cacheKey,
                'deleted1' => $deleted1,
                'key2' => $cacheKey2,
                'deleted2' => $deleted2
            ],
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
            ],
            'next_step' => 'Recarga la página de la app'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔍 DEBUG: Ver conversaciones directamente de la DB de Chatwoot (sin API)
Route::get('/debug-conversations-from-db', function () {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        $company = $user->company;
        $accountId = $company->chatwoot_account_id ?? 1;
        $inboxId = $user->chatwoot_inbox_id ?? 1;
        
        // Obtener conversaciones directamente de la DB
        $conversations = $chatwootDb->table('conversations')
            ->where('account_id', $accountId)
            ->where('inbox_id', $inboxId)
            ->orderBy('last_activity_at', 'desc')
            ->limit(20)
            ->get();
        
        // Obtener contactos
        $contactIds = $conversations->pluck('contact_id')->unique()->toArray();
        $contacts = $chatwootDb->table('contacts')
            ->whereIn('id', $contactIds)
            ->get()
            ->keyBy('id');
        
        // Obtener mensajes de cada conversación
        $conversationsWithData = [];
        foreach ($conversations as $conv) {
            $messages = $chatwootDb->table('messages')
                ->where('conversation_id', $conv->id)
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['id', 'content', 'message_type', 'sender_type', 'created_at']);
            
            $contact = $contacts[$conv->contact_id] ?? null;
            
            $conversationsWithData[] = [
                'id' => $conv->id,
                'display_id' => $conv->display_id,
                'status' => $conv->status,
                'inbox_id' => $conv->inbox_id,
                'contact' => $contact ? [
                    'id' => $contact->id,
                    'name' => $contact->name,
                    'phone_number' => $contact->phone_number,
                    'identifier' => $contact->identifier
                ] : null,
                'last_activity_at' => $conv->last_activity_at,
                'messages_count' => $messages->count(),
                'last_messages' => $messages
            ];
        }
        
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'chatwoot_inbox_id' => $user->chatwoot_inbox_id,
                'chatwoot_agent_id' => $user->chatwoot_agent_id
            ],
            'query_params' => [
                'account_id' => $accountId,
                'inbox_id' => $inboxId
            ],
            'total_conversations' => $conversations->count(),
            'conversations' => $conversationsWithData
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🧹 FLUSH ALL: Limpiar TODO el caché de Redis
Route::get('/flush-all-cache', function () {
    try {
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        
        $deletedKeys = [];
        
        // Todas las posibles claves de caché
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
        
        // También intentar flush completo si es Redis
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
            'message' => 'Caché limpiado. Recarga la página.',
            'next_step' => 'Visita https://app.withmia.com/dashboard/withmia-xrygbo y recarga con Ctrl+F5'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔥 RESET COMPLETO: Eliminar todas las conversaciones y mensajes de Chatwoot
Route::get('/reset-chatwoot-conversations/{confirm}', function ($confirm) {
    if ($confirm !== 'YES-DELETE-ALL') {
        return response()->json([
            'success' => false,
            'message' => 'Para confirmar, usa /api/reset-chatwoot-conversations/YES-DELETE-ALL',
            'warning' => '⚠️ ESTO ELIMINARÁ TODAS LAS CONVERSACIONES Y MENSAJES'
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
        
        // 3. Limpiar caché
        \Illuminate\Support\Facades\Cache::flush();
        
        Log::info('🔥 RESET CHATWOOT COMPLETADO', [
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
            'next_step' => 'Recarga la app y envía un nuevo mensaje de WhatsApp para probar'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔧 SYNC COMPLETO: Sincronizar Evolution API con Chatwoot usando el inbox EXISTENTE
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
        
        // 2. Obtener el channel_api para obtener el token correcto
        $channelApi = $chatwootDb->table('channel_api')
            ->where('id', $existingInbox->channel_id)
            ->first();
        
        $channelToken = $channelApi->identifier ?? $company->chatwoot_api_key;
        
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
            'token' => $channelToken, // Token del channel_api (para webhook)
            'url' => $chatwootUrl,
            'signMsg' => false,
            'reopenConversation' => true,
            'conversationPending' => false,
            'nameInbox' => $inboxName, // Nombre REAL del inbox existente
            'mergeBrazilContacts' => false,
            'importContacts' => false,
            'importMessages' => false,
            'daysLimitImportMessages' => 0,
            'autoCreate' => false // NO crear inbox nuevo, usar el existente
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
        
        Log::info('🔄 SYNC Evolution-Chatwoot completado', [
            'instance' => $instanceName,
            'inbox_name' => $inboxName,
            'inbox_id' => $inboxId,
            'account_id' => $accountId,
            'channel_token' => substr($channelToken, 0, 8) . '...'
        ]);
        
        return response()->json([
            'success' => $response->successful(),
            'instance' => $instanceName,
            'chatwoot_config' => [
                'account_id' => $accountId,
                'inbox_id' => $inboxId,
                'inbox_name' => $inboxName,
                'channel_token' => substr($channelToken, 0, 8) . '...'
            ],
            'user_updated' => [
                'chatwoot_inbox_id' => $user->chatwoot_inbox_id,
                'chatwoot_agent_token' => substr($user->chatwoot_agent_token ?? '', 0, 8) . '...'
            ],
            'evolution_response' => $response->json(),
            'next_steps' => [
                '1' => 'El sistema está sincronizado',
                '2' => 'Envía un mensaje desde WhatsApp',
                '3' => 'Recarga la app para ver la conversación'
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
Route::get('/fix-evolution-token/{instanceName}', function ($instanceName) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        
        // 1. Obtener el access_token del usuario (para API REST)
        $accessToken = $chatwootDb->table('access_tokens')
            ->where('owner_type', 'User')
            ->where('owner_id', 1)
            ->first();
        
        // 2. Obtener el channel token (para webhook)
        $channel = $chatwootDb->table('channel_api')
            ->where('account_id', 1)
            ->first();
        
        if (!$accessToken || !$channel) {
            return response()->json([
                'error' => 'No se encontró token o channel',
                'access_token' => $accessToken,
                'channel' => $channel
            ], 400);
        }
        
        // 3. Obtener configuración actual de Evolution
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        
        $currentSettings = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instanceName}");
        
        $currentConfig = $currentSettings->json();
        
        // 4. Actualizar Evolution con el ACCESS TOKEN (no el channel token)
        // Evolution necesita el access_token para hacer requests a la API de Chatwoot
        $updateResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey,
            'Content-Type' => 'application/json'
        ])->timeout(30)->post("{$evolutionUrl}/chatwoot/set/{$instanceName}", [
            'enabled' => true,
            'accountId' => '1',
            'token' => $accessToken->token, // ACCESS TOKEN del usuario
            'url' => config('chatwoot.url'),
            'signMsg' => false,
            'reopenConversation' => true,
            'conversationPending' => false,
            'nameInbox' => "WhatsApp {$instanceName}",
            'mergeBrazilContacts' => false,
            'importContacts' => false,
            'importMessages' => false,
            'daysLimitImportMessages' => 0,
            'autoCreate' => true // Permitir crear contactos/conversaciones
        ]);
        
        // 5. Verificar configuración después del update
        $newSettings = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instanceName}");
        
        return response()->json([
            'success' => $updateResponse->successful(),
            'tokens' => [
                'channel_token' => $channel->identifier,
                'access_token_used' => $accessToken->token,
                'note' => 'Evolution ahora usa el access_token del usuario para API de Chatwoot'
            ],
            'previous_config' => $currentConfig,
            'new_config' => $newSettings->json(),
            'next_step' => 'Envía un mensaje de WhatsApp para probar'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
});

// 🔧 FIX DIRECTO: Renombrar inbox forzosamente
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
                'error' => 'No se encontró inbox con account_id=1',
                'all_inboxes' => $allInboxes
            ], 400);
        }
        
        $oldName = $inbox->name;
        
        // Forzar actualización
        $updated = $chatwootDb->table('inboxes')
            ->where('id', $inbox->id)
            ->update([
                'name' => $correctInboxName,
                'updated_at' => now()
            ]);
        
        // Verificar después del update
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

// 🔍 DEBUG: Ver inbox directamente de la DB sin caché
Route::get('/raw-inbox-check', function () {
    $chatwootDb = DB::connection('chatwoot');
    
    // Query directa sin caché
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

// 🔍 DEBUG: Ver mensajes recientes con attachments
Route::get('/debug-recent-messages', function () {
    $chatwootDb = DB::connection('chatwoot');
    
    // Obtener últimos 20 mensajes con sus attachments
    $messages = $chatwootDb->select("
        SELECT 
            m.id,
            m.content,
            m.message_type,
            m.content_type,
            m.content_attributes,
            m.created_at,
            m.conversation_id,
            c.display_id as conversation_display_id
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.account_id = 1
        ORDER BY m.created_at DESC
        LIMIT 20
    ");
    
    // Obtener attachments de esos mensajes
    $messageIds = collect($messages)->pluck('id')->toArray();
    $attachments = [];
    if (!empty($messageIds)) {
        $attachments = $chatwootDb->select("
            SELECT * FROM attachments 
            WHERE message_id IN (" . implode(',', $messageIds) . ")
        ");
    }
    
    return response()->json([
        'timestamp' => now()->toIso8601String(),
        'messages' => $messages,
        'attachments' => $attachments
    ]);
});

// 🧹 CLEANUP: Eliminar attachments vacíos/huérfanos
Route::get('/cleanup-empty-attachments', function () {
    $chatwootDb = DB::connection('chatwoot');
    
    // Contar attachments vacíos antes
    $emptyBefore = $chatwootDb->select("
        SELECT COUNT(*) as count FROM attachments 
        WHERE (file_url IS NULL OR file_url = '') 
        AND (external_url IS NULL OR external_url = '')
    ");
    
    // Eliminar attachments vacíos
    $deleted = $chatwootDb->delete("
        DELETE FROM attachments 
        WHERE (file_url IS NULL OR file_url = '') 
        AND (external_url IS NULL OR external_url = '')
    ");
    
    return response()->json([
        'success' => true,
        'empty_attachments_found' => $emptyBefore[0]->count ?? 0,
        'deleted' => $deleted
    ]);
});

Route::get('/fix-inbox-name/{instanceName}', function ($instanceName) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        $user = \App\Models\User::where('email', 'withmia.app@gmail.com')->first() 
            ?? \App\Models\User::first();
        $company = $user->company;
        $accountId = $company->chatwoot_account_id ?? 1;
        
        // Nombre correcto del inbox (con slug)
        $correctInboxName = "WhatsApp {$instanceName}";
        
        // 1. Obtener el inbox actual
        $existingInbox = $chatwootDb->table('inboxes')
            ->where('account_id', $accountId)
            ->first();
        
        if (!$existingInbox) {
            return response()->json([
                'success' => false,
                'error' => 'No hay inbox en Chatwoot'
            ], 400);
        }
        
        $oldName = $existingInbox->name;
        
        // 2. Renombrar el inbox en Chatwoot DB
        $chatwootDb->table('inboxes')
            ->where('id', $existingInbox->id)
            ->update(['name' => $correctInboxName, 'updated_at' => now()]);
        
        // 3. Verificar la configuración de Evolution API
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        
        $evolutionSettings = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instanceName}");
        
        $currentEvolutionInbox = $evolutionSettings->json()['nameInbox'] ?? 'unknown';
        
        // 4. Si Evolution tiene otro nombre, actualizarlo
        $evolutionUpdated = false;
        if ($currentEvolutionInbox !== $correctInboxName) {
            $channelApi = $chatwootDb->table('channel_api')
                ->where('id', $existingInbox->channel_id)
                ->first();
            
            $channelToken = $channelApi->identifier ?? $company->chatwoot_api_key;
            $chatwootUrl = config('chatwoot.url');
            
            $updateResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $evolutionKey,
                'Content-Type' => 'application/json'
            ])->timeout(30)->post("{$evolutionUrl}/chatwoot/set/{$instanceName}", [
                'enabled' => true,
                'accountId' => (string) $accountId,
                'token' => $channelToken,
                'url' => $chatwootUrl,
                'signMsg' => false,
                'reopenConversation' => true,
                'conversationPending' => false,
                'nameInbox' => $correctInboxName,
                'mergeBrazilContacts' => false,
                'importContacts' => false,
                'importMessages' => false,
                'daysLimitImportMessages' => 0,
                'autoCreate' => false
            ]);
            
            $evolutionUpdated = $updateResponse->successful();
        }
        
        // 5. Limpiar caché
        \Illuminate\Support\Facades\Cache::flush();
        
        Log::info('🔧 Inbox renombrado', [
            'old_name' => $oldName,
            'new_name' => $correctInboxName,
            'inbox_id' => $existingInbox->id
        ]);
        
        return response()->json([
            'success' => true,
            'inbox' => [
                'id' => $existingInbox->id,
                'old_name' => $oldName,
                'new_name' => $correctInboxName
            ],
            'evolution' => [
                'previous_inbox_name' => $currentEvolutionInbox,
                'updated' => $evolutionUpdated
            ],
            'next_step' => 'Envía un mensaje desde WhatsApp y recarga la app'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// N8n Workflow Management
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/workflows/create-for-company', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'createWorkflowForCompany']);
    Route::get('/workflows/company-list', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'listCompanyWorkflows']);
    Route::get('/workflows/company/{companyId}', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'getCompanyWorkflow']);
    Route::delete('/workflows/company/{companyId}', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'deleteCompanyWorkflow']);
    Route::post('/workflows/company/{companyId}/toggle', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'toggleWorkflow']);
});

// =============================================================================
// 🔧 DIAGNÓSTICO DE EVOLUTION-CHATWOOT
// =============================================================================

/**
 * GET /api/evolution/chatwoot-config/{instanceName}
 * Obtener la configuración actual de Chatwoot en Evolution API
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
 * Reconfigurar la integración de Chatwoot para forzar sincronización de mensajes
 */
Route::get('/evolution/reconfigure-chatwoot/{instanceName}', function ($instanceName) {
    try {
        $evolutionService = app(\App\Services\EvolutionApiService::class);
        
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
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

/**
 * GET /api/evolution/debug-instance/{instanceName}
 * Información completa de diagnóstico de una instancia
 */
Route::get('/evolution/debug-instance/{instanceName}', function ($instanceName) {
    try {
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        
        // 1. Estado de conexión
        $connectionState = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/instance/connectionState/{$instanceName}");
        
        // 2. Configuración de Chatwoot
        $chatwootConfig = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instanceName}");
        
        // 3. Configuración de Webhook
        $webhookConfig = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/webhook/find/{$instanceName}");
        
        // 4. Buscar instancia en DB local
        $localInstance = \App\Models\WhatsAppInstance::where('instance_name', $instanceName)->first();
        
        // 5. Buscar información de Chatwoot
        $chatwootInfo = null;
        if ($localInstance && $localInstance->company) {
            $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
            $inbox = $chatwootDb->table('inboxes')
                ->where('account_id', $localInstance->company->chatwoot_account_id ?: 1)
                ->where('name', 'like', "%{$instanceName}%")
                ->first();
            
            if ($inbox) {
                $chatwootInfo = [
                    'inbox_id' => $inbox->id,
                    'inbox_name' => $inbox->name,
                    'channel_type' => $inbox->channel_type,
                    'channel_id' => $inbox->channel_id
                ];
            }
        }
        
        return response()->json([
            'success' => true,
            'instance' => $instanceName,
            'evolution_api' => [
                'url' => $evolutionUrl,
                'connection_state' => $connectionState->json(),
                'chatwoot_config' => $chatwootConfig->json(),
                'webhook_config' => $webhookConfig->json()
            ],
            'local_db' => $localInstance ? [
                'id' => $localInstance->id,
                'company_id' => $localInstance->company_id,
                'status' => $localInstance->status,
                'connected_at' => $localInstance->connected_at
            ] : null,
            'chatwoot' => $chatwootInfo,
            'diagnosis' => [
                'evolution_connected' => ($connectionState->json()['state'] ?? null) === 'open',
                'chatwoot_enabled' => $chatwootConfig->json()['enabled'] ?? false,
                'has_local_instance' => $localInstance !== null,
                'has_chatwoot_inbox' => $chatwootInfo !== null
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
