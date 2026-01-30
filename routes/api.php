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
Route::get('/debug-chatwoot-config', function () {
    $companies = \App\Models\Company::select('id', 'name', 'slug', 'chatwoot_account_id')
        ->get()
        ->map(function ($c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'chatwoot_account_id' => $c->chatwoot_account_id,
                'has_own_account' => !empty($c->chatwoot_account_id),
            ];
        });
    
    return response()->json([
        'total_companies' => $companies->count(),
        'with_own_chatwoot' => $companies->where('has_own_account', true)->count(),
        'sharing_default' => $companies->where('has_own_account', false)->count(),
        'companies' => $companies
    ]);
});

// 🛠 SETUP TRAINING WORKFLOW - DINÁMICO por company_slug
Route::get('/setup-training-workflow/{companySlug}', function ($companySlug) {
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
        Log::info('🔄 Iniciando migración de workflows', ['total' => count($workflows)]);
        
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
                        
                        Log::info("🔄 Actualizando webhook path", [
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
                                        
                                        Log::info("✅ Chatwoot webhook actualizado", [
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
        
        Log::info('? Token de Chatwoot regenerado', [
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
                'has_chatwoot_user' => $chatwootUser ? '?' : '? No existe en Chatwoot',
                'has_valid_token' => $tokenMatch ? '?' : '? Token no coincide',
                'has_account_access' => $accountUser ? '?' : '? No tiene acceso a account',
                'has_inbox_access' => $inboxMember ? '?' : '? No tiene acceso a inbox',
                'recommendation' => !$tokenMatch ? 'Ejecutar /api/regenerate-chatwoot-token/' . $userId : 'Token OK'
            ]
        ]);
        
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// ??? FIX TEMPORAL: Arreglar usuarios sin inbox_id
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

// 🔐 CREAR SUPER ADMIN EN CHATWOOT
Route::get('/create-chatwoot-superadmin/{email}/{password}', function ($email, $password) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        
        // Verificar si ya existe
        $existing = $chatwootDb->table('users')->where('email', $email)->first();
        if ($existing) {
            return response()->json(['error' => 'Super Admin ya existe', 'id' => $existing->id], 400);
        }
        
        // Crear Super Admin con type='SuperAdmin'
        $id = $chatwootDb->table('users')->insertGetId([
            'email' => $email,
            'encrypted_password' => bcrypt($password),
            'name' => 'Admin WITHMIA',
            'type' => 'SuperAdmin',
            'uid' => $email,
            'provider' => 'email',
            'confirmed_at' => now(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Super Admin creado',
            'id' => $id,
            'email' => $email,
            'login_url' => config('services.chatwoot.base_url') . '/super_admin/sign_in'
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// ??? RESET TOTAL: Borra TODO (Laravel + Chatwoot) - SOLO PARA DESARROLLO
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
        
        $laravelTables = [
            'personal_access_tokens',
            'knowledge_documents', 
            'whatsapp_instances',
            'agent_invitations',
            'pipeline_items',
            'pipelines',
            'usage_metrics',
            'integrations',
            'ai_agents',
            'subscriptions',
            'sessions',
            'cache',
            'jobs',
            'failed_jobs',
            'companies',
            'users'
        ];
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
                $results[] = "? Chatwoot truncated: {$table}";
            } catch (\Exception $e) {
                $results[] = "?? Chatwoot skip {$table}: " . $e->getMessage();
            }
        }
        
        // Re-habilitar FK
        DB::statement('SET session_replication_role = DEFAULT;');
        $chatwootDb->statement('SET session_replication_role = DEFAULT;');
        
        // 3. Ejecutar migraciones de Laravel
        Artisan::call('migrate', ['--force' => true]);
        $results[] = "? Laravel migrations executed";
        
        return response()->json([
            'success' => true,
            'message' => '?? RESET COMPLETO',
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

// ? DIAGNOSTICAR INBOXES DE CHATWOOT - Ver configuraci�n actual
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

// ?? ARREGLAR WEBHOOK DEL INBOX - Quitar el webhook inv�lido a Evolution
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
        
        // El webhook correcto deber�a ser a tu app, no a Evolution
        // Evolution recibe mensajes v�a su propio webhook global
        // Chatwoot deber�a enviar webhooks a tu app
        $newWebhook = 'https://app.withmia.com/api/chatwoot/webhook';
        
        // Actualizar webhook
        $chatwootDb->table('channel_api')
            ->where('id', $inbox->channel_id)
            ->update([
                'webhook_url' => $newWebhook,
                'updated_at' => now()
            ]);
        
        Log::info('? Webhook de inbox actualizado', [
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
Route::post('/cleanup-system-messages/{inboxName?}', function ($inboxName = null) {
    $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
    
    // Patrones de mensajes de sistema que deben ser eliminados
    $systemPatterns = [
        '%Connection successfully established%',
        '%QRCode generated%',
        '%Waiting for QR Code%',
        '%Connecting...%',
        '%Connected!%',
        '%Disconnected%',
    ];
    
    $deletedCount = 0;
    
    foreach ($systemPatterns as $pattern) {
        $query = $chatwootDb->table('messages')->where('content', 'LIKE', $pattern);
        
        // Si se especificó un inbox, filtrar por ese inbox
        if ($inboxName) {
            $inbox = $chatwootDb->table('inboxes')->where('name', 'LIKE', "%{$inboxName}%")->first();
            if ($inbox) {
                $conversationIds = $chatwootDb->table('conversations')
                    ->where('inbox_id', $inbox->id)
                    ->pluck('id');
                $query->whereIn('conversation_id', $conversationIds);
            }
        }
        
        $count = $query->delete();
        $deletedCount += $count;
    }
    
    return response()->json([
        'success' => true,
        'message' => "Deleted {$deletedCount} system messages",
        'deleted_count' => $deletedCount
    ]);
});

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

// ?? DEBUG: Ver usuarios en la base de datos
Route::get('/debug-users', function () {
    $users = \App\Models\User::all(['id', 'name', 'email', 'created_at']);
    return response()->json([
        'total' => $users->count(),
        'users' => $users
    ]);
});

// ?? DEBUG: Ver tokens de usuarios
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

// ?? DEBUG: Session info
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

// ??? TRUNCATE ALL TABLES - Eliminar todos los datos manteniendo estructura
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

// ? RUN MIGRATIONS
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

// ???? WIPE DATABASE - Solo estructura, sin datos
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

// ?? CLEANUP TEST DATA - Keep only specified company
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
            
            // Asegurar que parameters nunca es array vac�o
            if (isset($node['parameters']) && is_array($node['parameters']) && empty($node['parameters'])) {
                $node['parameters'] = new \stdClass();
                $fixes[] = "Corregido parameters vac�o en nodo '$nodeName'";
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

// ?? CREAR WORKFLOW MINIMALISTA (sin template JSON)
Route::get('/create-minimal-workflow/{instanceName}', function ($instanceName) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        $evolutionApi = app(\App\Services\EvolutionApiService::class);
        
        // Usar workflow minimalista directamente
        $workflow = getMinimalWorkflow($instanceName);
        
        Log::info('?? Creando workflow minimalista', ['name' => $workflow['name']]);
        
        // Crear en n8n
        $result = $n8nService->createWorkflow($workflow);
        
        if ($result['success']) {
            $workflowId = $result['data']['id'] ?? null;
            $webhookUrl = $n8nService->getWebhookUrl($instanceName);
            
            // Activar
            if ($workflowId) {
                $activateResult = $n8nService->activateWorkflow($workflowId);
                Log::info('? Workflow activado', ['id' => $workflowId, 'result' => $activateResult]);
            }
            
            // Configurar webhook de Evolution hacia n8n
            $evolutionResult = $evolutionApi->setWebhook(
                $instanceName,
                $webhookUrl,
                ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
            );
            Log::info('?? Webhook Evolution configurado', ['result' => $evolutionResult]);
            
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
        
        // Cargar template WITHMIA
        $templatePath = base_path('workflows/withmia-bot-template.json');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Template no encontrado: ' . $templatePath], 404);
        }
        
        // Limpiar BOM y caracteres problem�ticos
        $content = file_get_contents($templatePath);
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
        
        $templateWorkflow = json_decode($content, true);
        if (!$templateWorkflow) {
            // Fallback a workflow minimalista
            $templateWorkflow = getMinimalWorkflow($instanceName);
        }
        
        // Get company settings for placeholders
        $company = $instance ? \App\Models\Company::where('slug', $companySlug)->first() : null;
        $companyName = $company ? ($company->name ?? $instanceName) : $instanceName;
        $assistantName = $company ? ($company->assistant_name ?? 'MIA') : 'MIA';
        $openaiApiKey = $company ? ($company->settings['openai_api_key'] ?? env('OPENAI_API_KEY')) : env('OPENAI_API_KEY');
        
        // Get n8n credential IDs
        $credentialIds = $n8nService->getCredentialIds();
        $openaiCredentialId = $credentialIds['openai']['id'] ?? '';
        $openaiCredentialName = $credentialIds['openai']['name'] ?? 'OpenAI Account';
        $qdrantCredentialId = $credentialIds['qdrant']['id'] ?? '';
        $qdrantCredentialName = $credentialIds['qdrant']['name'] ?? 'Qdrant';
        
        Log::info('Credentials obtenidas', [
            'openai_id' => $openaiCredentialId,
            'qdrant_id' => $qdrantCredentialId
        ]);
        
        // Replace placeholders in template
        $templateJson = json_encode($templateWorkflow);
        $appUrl = env('APP_URL', 'https://app.withmia.com');
        $replacements = [
            '{{COMPANY_SLUG}}' => $companySlug ?? 'default',
            '{{COMPANY_NAME}}' => $companyName,
            '{{ASSISTANT_NAME}}' => $assistantName,
            '{{OPENAI_API_KEY}}' => $openaiApiKey,
            '{{INSTANCE_NAME}}' => $instanceName,
            '{{APP_URL}}' => $appUrl,
            '{{N8N_OPENAI_CREDENTIAL_ID}}' => $openaiCredentialId,
            '{{N8N_OPENAI_CREDENTIAL_NAME}}' => $openaiCredentialName,
            '{{N8N_QDRANT_CREDENTIAL_ID}}' => $qdrantCredentialId,
            '{{N8N_QDRANT_CREDENTIAL_NAME}}' => $qdrantCredentialName,
        ];
        foreach ($replacements as $placeholder => $value) {
            $templateJson = str_replace($placeholder, $value, $templateJson);
        }
        $templateWorkflow = json_decode($templateJson, true);
        
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
                    // instanceName ya tiene formato "withmia-{slug}", usarlo directamente
                    $cleanNode['parameters']['path'] = $instanceName;
                }
            }
            
            $cleanNodes[] = $cleanNode;
        }
        
        $cleanWorkflow = [
            'name' => "WITHMIA Bot - {$instanceName}",
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
                Log::info('? Workflow activado', ['id' => $workflowId, 'result' => $activateResult]);
            }
            
            // Configurar webhook de Evolution hacia n8n
            $evolutionResult = $evolutionApi->setWebhook(
                $instanceName,
                $webhookUrl,
                ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
            );
            Log::info('?? Webhook Evolution configurado', ['result' => $evolutionResult]);
            
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
                'content' => '?? Mensaje de prueba REAL ' . now()->format('H:i:s'),
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
            'message' => "Broadcast REAL enviado a inbox.{$inboxId} para conversaci�n {$conversationId}",
            'broadcast_driver' => config('broadcasting.default'),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 500);
    }
});

// Habilitar autenticaci�n de canales de broadcasting

// ?? SETUP: Ver webhooks de Chatwoot existentes
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

// ?? RECREAR webhook de Chatwoot con ID=1 (elimina todos, resetea secuencia, crea nuevo)
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
            // Usar la URL de Railway interna o externa seg�n disponibilidad
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
        
        // 2. Crear nuevo webhook (ser� ID=1 si el reset funcion�)
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

// ============= EVOLUTION WEBHOOK ALIAS (para compatibilidad) =============
// Evolution API está enviando webhooks a /api/evolution/webhook en lugar de /api/evolution-whatsapp/webhook
Route::post('/evolution/webhook', [\App\Http\Controllers\Api\EvolutionApiController::class, 'webhook']);

use App\Http\Controllers\ChatwootWebhookController;

// Webhook de Chatwoot para notificaciones en tiempo real
Route::post('/webhooks/chatwoot', [ChatwootWebhookController::class, 'handle'])
    ->name('chatwoot.webhook');

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
            
            Log::info('? Token sincronizado desde Chatwoot', [
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
        
        Log::info('? Nuevo token creado en Chatwoot', [
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
        Log::error('? Error fixing Chatwoot token', [
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ?? FIX: Reparar TODOS los tokens de Chatwoot para todos los usuarios
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
        
        Log::info('? All Chatwoot tokens fixed', ['count' => count($results)]);
        
        return response()->json([
            'success' => true,
            'message' => 'Todos los tokens reparados',
            'total_users' => count($results),
            'results' => $results
        ]);
        
    } catch (\Exception $e) {
        Log::error('? Error fixing all Chatwoot tokens', ['error' => $e->getMessage()]);
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

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
        
        Log::info('?? All Chatwoot tokens REGENERATED', ['count' => count($results)]);
        
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
        
        // Ver �ltimas conversaciones con detalles
        $lastConversations = $chatwootDb->table('conversations')
            ->where('account_id', $company->chatwoot_account_id ?? 1)
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get(['id', 'inbox_id', 'contact_id', 'display_id', 'status']);
        
        // Ver �ltimos mensajes
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

// ?? FIX: Corregir el tipo de usuario en Chatwoot si est� mal
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
            
            Log::info('? Chatwoot user type fixed', [
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

// ?? DEBUG: Ver configuraci�n de Evolution API + Chatwoot para una instancia
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
        
        // Obtener el nombre del inbox existente de Chatwoot
        $chatwootDb = DB::connection('chatwoot');
        $existingInbox = $chatwootDb->table('inboxes')
            ->where('account_id', $accountId)
            ->first();
        
        // Usar el nombre del inbox existente o crear uno nuevo
        $inboxName = $existingInbox ? $existingInbox->name : "WhatsApp {$company->name}";
        
        // IMPORTANTE: Obtener el Channel Token del channel_api (NO el access_token del usuario)
        // Evolution API necesita el identifier del channel para autenticarse con Chatwoot
        $channelApi = $chatwootDb->table('channel_api')
            ->where('id', $existingInbox->channel_id ?? 1)
            ->first();
        
        $channelToken = $channelApi->identifier ?? null;
        
        if (!$channelToken) {
            return response()->json([
                'success' => false,
                'error' => 'No se encontró el channel token en Chatwoot. Verifica que exista el inbox y channel_api.'
            ], 400);
        }
        
        // Configurar Chatwoot en Evolution API
        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey,
            'Content-Type' => 'application/json'
        ])->timeout(30)->post("{$evolutionUrl}/chatwoot/set/{$instanceName}", [
            'enabled' => true,
            'accountId' => (string) $accountId,
            'token' => $channelToken, // Channel Token (identifier del channel_api)
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
            'channel_token_prefix' => substr($channelToken, 0, 8) . '...',
            'response_status' => $response->status(),
            'response_body' => $response->json()
        ]);
        
        return response()->json([
            'success' => $response->successful(),
            'instance' => $instanceName,
            'account_id' => $accountId,
            'chatwoot_url' => $chatwootUrl,
            'inbox_name' => $inboxName,
            'channel_token_used' => substr($channelToken, 0, 8) . '...',
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
        
        // 1. Buscar la conversaci�n en la DB
        $conversation = $chatwootDb->table('conversations')
            ->where('id', $conversationId)
            ->orWhere('display_id', $conversationId)
            ->first();
        
        if (!$conversation) {
            return response()->json([
                'success' => false,
                'error' => "Conversaci�n no encontrada (id/display_id: {$conversationId})",
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
            // Primero probar obtener la conversaci�n
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
                'problem' => 'El usuario tiene un inbox_id diferente al de la conversaci�n'
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
        
        // Obtener mensajes de cada conversaci�n
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
        
        Log::info('?? RESET CHATWOOT COMPLETADO', [
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
        
        // 6. Limpiar cach�
        \Illuminate\Support\Facades\Cache::flush();
        
        Log::info('?? SYNC Evolution-Chatwoot completado', [
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
Route::get('/fix-evolution-token/{instanceName}', function ($instanceName) {
    try {
        $chatwootDb = DB::connection('chatwoot');
        
        // 1. Obtener el channel token (identifier) - esto es lo que Evolution necesita
        $channel = $chatwootDb->table('channel_api')
            ->where('account_id', 1)
            ->first();
        
        if (!$channel) {
            return response()->json([
                'error' => 'No se encontró channel_api en Chatwoot',
            ], 400);
        }
        
        // 2. Obtener configuración actual de Evolution
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        
        $currentSettings = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instanceName}");
        
        $currentConfig = $currentSettings->json();
        
        // 3. Actualizar Evolution con el CHANNEL TOKEN (identifier)
        // Evolution necesita el channel identifier para autenticarse con el webhook de Chatwoot
        $updateResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey,
            'Content-Type' => 'application/json'
        ])->timeout(30)->post("{$evolutionUrl}/chatwoot/set/{$instanceName}", [
            'enabled' => true,
            'accountId' => '1',
            'token' => $channel->identifier, // CHANNEL TOKEN (identifier del channel_api)
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
        
        // 4. Verificar configuración después del update
        $newSettings = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instanceName}");
        
        return response()->json([
            'success' => $updateResponse->successful(),
            'tokens' => [
                'channel_token_used' => $channel->identifier,
                'note' => 'Evolution usa el channel identifier para autenticarse con Chatwoot'
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
Route::get('/debug-recent-messages', function () {
    $chatwootDb = DB::connection('chatwoot');
    
    // Obtener �ltimos 20 mensajes con sus attachments
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

// ?? CLEANUP: Eliminar attachments vac�os/hu�rfanos
Route::get('/cleanup-empty-attachments', function () {
    $chatwootDb = DB::connection('chatwoot');
    
    // Contar attachments vac�os antes
    $emptyBefore = $chatwootDb->select("
        SELECT COUNT(*) as count FROM attachments 
        WHERE (file_url IS NULL OR file_url = '') 
        AND (external_url IS NULL OR external_url = '')
    ");
    
    // Eliminar attachments vac�os
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
        
        // 3. Verificar la configuraci�n de Evolution API
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
        
        // 5. Limpiar cach�
        \Illuminate\Support\Facades\Cache::flush();
        
        Log::info('?? Inbox renombrado', [
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
            'next_step' => 'Env�a un mensaje desde WhatsApp y recarga la app'
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

            Log::info('Company settings updated', [
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
Route::get('/evolution/debug-instance/{instanceName}', function ($instanceName) {
    try {
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        
        // 1. Estado de conexi�n
        $connectionState = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/instance/connectionState/{$instanceName}");
        
        // 2. Configuraci�n de Chatwoot
        $chatwootConfig = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instanceName}");
        
        // 3. Configuraci�n de Webhook
        $webhookConfig = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(10)->get("{$evolutionUrl}/webhook/find/{$instanceName}");
        
        // 4. Buscar instancia en DB local
        $localInstance = \App\Models\WhatsAppInstance::where('instance_name', $instanceName)->first();
        
        // 5. Buscar informaci�n de Chatwoot
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

// ============== DEBUG: Verificar estado del onboarding ==============
Route::get('/debug/onboarding-status', function () {
    try {
        $qdrantService = app(\App\Services\QdrantService::class);
        $n8nService = app(\App\Services\N8nService::class);
        
        // 1. Obtener todas las empresas
        $companies = \App\Models\Company::all()->map(function ($company) use ($qdrantService) {
            $settings = $company->settings ?? [];
            
            // Verificar si la colecci�n Qdrant existe
            $qdrantCollectionName = $settings['qdrant_collection'] ?? $qdrantService->getCollectionName($company->slug);
            $qdrantExists = $qdrantService->collectionExists($qdrantCollectionName);
            
            return [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'chatwoot_provisioned' => $company->chatwoot_provisioned,
                'qdrant_collection' => $settings['qdrant_collection'] ?? null,
                'qdrant_exists' => $qdrantExists,
                'rag_workflow_id' => $settings['rag_workflow_id'] ?? null,
                'rag_webhook_path' => $settings['rag_webhook_path'] ?? null,
                'training_workflow_id' => $settings['training_workflow_id'] ?? null,
                'training_webhook_path' => $settings['training_webhook_path'] ?? null,
            ];
        });
        
        // 2. Colecciones en Qdrant
        $qdrantCollections = $qdrantService->getCollections();
        
        // 3. Workflows en n8n
        $n8nWorkflows = [];
        try {
            $workflows = $n8nService->listWorkflows();
            if ($workflows['success'] ?? false) {
                $n8nWorkflows = collect($workflows['data'] ?? [])->map(function ($wf) {
                    return [
                        'id' => $wf['id'],
                        'name' => $wf['name'],
                        'active' => $wf['active'] ?? false,
                    ];
                })->toArray();
            }
        } catch (\Exception $e) {
            $n8nWorkflows = ['error' => $e->getMessage()];
        }
        
        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601String(),
            'companies' => $companies,
            'qdrant' => [
                'url' => env('RAILWAY_SERVICE_QDRANT_URL'),
                'collections' => $qdrantCollections
            ],
            'n8n' => [
                'url' => env('N8N_URL'),
                'workflows' => $n8nWorkflows
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

// DEBUG: Recrear manualmente Qdrant collection y workflows para una empresa
Route::post('/debug/recreate-onboarding/{companyId}', function ($companyId) {
    try {
        $company = \App\Models\Company::findOrFail($companyId);
        $qdrantService = app(\App\Services\QdrantService::class);
        $n8nService = app(\App\Services\N8nService::class);
        
        $results = [
            'company' => $company->name,
            'slug' => $company->slug,
            'qdrant' => null,
            'rag_workflow' => null,
            'training_workflow' => null,
        ];
        
        // 1. Crear colecci�n Qdrant
        $qdrantResult = $qdrantService->createCompanyCollection($company->slug);
        $results['qdrant'] = $qdrantResult;
        
        if ($qdrantResult['success']) {
            $company->update([
                'settings' => array_merge($company->settings ?? [], [
                    'qdrant_collection' => $qdrantResult['collection']
                ])
            ]);
        }
        
        // 2. Crear workflow RAG si no existe
        if (!($company->settings['rag_workflow_id'] ?? null)) {
            $templatePath = base_path('workflows/rag-text-processor.json');
            
            if (file_exists($templatePath)) {
                $content = file_get_contents($templatePath);
                $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
                $templateWorkflow = json_decode($content, true);
                
                if ($templateWorkflow) {
                    $collectionName = $qdrantService->getCollectionName($company->slug);
                    $webhookPath = "rag-{$company->slug}";
                    $newWebhookId = \Illuminate\Support\Str::uuid()->toString();
                    
                    foreach ($templateWorkflow['nodes'] as &$node) {
                        if ($node['type'] === 'n8n-nodes-base.webhook') {
                            $node['webhookId'] = $newWebhookId;
                            $node['parameters']['path'] = $webhookPath;
                        }
                        if ($node['type'] === '@n8n/n8n-nodes-langchain.vectorStoreQdrant') {
                            $node['parameters']['qdrantCollection']['__rl'] = true;
                            $node['parameters']['qdrantCollection']['value'] = $collectionName;
                            $node['parameters']['qdrantCollection']['mode'] = 'list';
                        }
                    }
                    
                    $templateWorkflow['name'] = "RAG Documents - {$company->slug}";
                    unset($templateWorkflow['id']);
                    
                    $createResult = $n8nService->createWorkflow($templateWorkflow);
                    $results['rag_workflow'] = $createResult;
                    
                    if ($createResult['success'] ?? false) {
                        $n8nService->activateWorkflow($createResult['data']['id']);
                        
                        $company->update([
                            'settings' => array_merge($company->settings ?? [], [
                                'rag_workflow_id' => $createResult['data']['id'],
                                'rag_webhook_path' => $webhookPath,
                                'rag_webhook_url' => env('N8N_PUBLIC_URL') . "/webhook/{$webhookPath}",
                                'rag_workflow_name' => "RAG Documents - {$company->slug}"
                            ])
                        ]);
                    }
                }
            } else {
                $results['rag_workflow'] = ['error' => 'Template not found'];
            }
        } else {
            $results['rag_workflow'] = ['message' => 'Already exists', 'id' => $company->settings['rag_workflow_id']];
        }
        
        // 3. Crear workflow Training si no existe
        if (!($company->settings['training_workflow_id'] ?? null)) {
            $trainingResult = $n8nService->createTrainingWorkflow($company->slug);
            $results['training_workflow'] = $trainingResult;
            
            if ($trainingResult['success'] ?? false) {
                $company->update([
                    'settings' => array_merge($company->settings ?? [], [
                        'training_workflow_id' => $trainingResult['workflow_id'] ?? null,
                        'training_webhook_path' => $trainingResult['webhook_path'] ?? null,
                        'training_webhook_url' => $trainingResult['webhook_url'] ?? null,
                        'training_workflow_name' => "Training Chat - {$company->slug}"
                    ])
                ]);
            }
        } else {
            $results['training_workflow'] = ['message' => 'Already exists', 'id' => $company->settings['training_workflow_id']];
        }
        
        // Recargar company
        $company->refresh();
        
        return response()->json([
            'success' => true,
            'results' => $results,
            'updated_settings' => $company->settings
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// ============== DEBUG: Ver info de empresas y bots ==============
Route::get('/debug/companies-info', function () {
    try {
        $companies = \App\Models\Company::all()->map(function ($company) {
            return [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'assistant_name' => $company->assistant_name,
                'bot_personality' => $company->bot_personality,
                'industry' => $company->industry,
                'chatwoot_provisioned' => $company->chatwoot_provisioned,
                'chatwoot_account_id' => $company->chatwoot_account_id,
                'settings' => $company->settings,
                'created_at' => $company->created_at,
            ];
        });
        
        return response()->json([
            'success' => true,
            'total' => $companies->count(),
            'companies' => $companies
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ============== DEBUG: Ver columnas de companies ==============
Route::get('/debug/companies-columns', function () {
    $columns = \DB::select("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'companies' ORDER BY ordinal_position");
    return response()->json([
        'success' => true,
        'columns' => $columns
    ]);
});

// ============== FIX: Agregar columna assistant_name si no existe ==============
Route::get('/fix/add-assistant-name', function () {
    try {
        $hasColumn = \Schema::hasColumn('companies', 'assistant_name');
        
        if (!$hasColumn) {
            \Schema::table('companies', function ($table) {
                $table->string('assistant_name', 100)->nullable()->after('name');
            });
            return response()->json([
                'success' => true,
                'message' => 'Columna assistant_name agregada correctamente'
            ]);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'La columna assistant_name ya existe'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

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
            
            \Log::info('Notificacion WebSocket enviada', [
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
Route::get('/debug/test-websocket/{inboxId}', function ($inboxId) {
    try {
        $inboxId = (int) $inboxId;
        
        // Info del driver de broadcast
        $broadcastDriver = config('broadcasting.default');
        $reverbHost = config('reverb.servers.reverb.host');
        
        // Crear mensaje de prueba con timestamp único
        $testMessage = [
            'content' => '🧪 Test WebSocket - ' . now()->format('H:i:s'),
            'message_type' => 'outgoing',
            'sender' => ['name' => 'System Test', 'type' => 'test'],
            'created_at' => now()->toIso8601String(),
            'test' => true,
        ];
        
        // Enviar evento
        event(new \App\Events\NewMessageReceived(
            $testMessage,
            999, // conversation_id de prueba
            $inboxId,
            1 // account_id
        ));
        
        return response()->json([
            'success' => true,
            'broadcast_driver' => $broadcastDriver,
            'reverb_host' => $reverbHost,
            'channel' => "private-inbox.{$inboxId}",
            'event_name' => 'message.received',
            'message' => "Evento enviado a inbox.{$inboxId}",
            'payload_preview' => $testMessage,
            'timestamp' => now()->toIso8601String(),
            'hint' => 'Abre la consola del navegador (F12) para ver si llega el evento'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// ============== DEBUG: Ver estado de whatsapp_instances con campos n8n ==============
Route::get('/debug/whatsapp-instances', function () {
    try {
        $instances = \DB::table('whatsapp_instances')->get();
        
        return response()->json([
            'success' => true,
            'total' => $instances->count(),
            'instances' => $instances->map(function ($i) {
                return [
                    'id' => $i->id,
                    'instance_name' => $i->instance_name,
                    'company_id' => $i->company_id,
                    'company_slug' => $i->company_slug ?? null,
                    'n8n_workflow_id' => $i->n8n_workflow_id ?? null,
                    'n8n_webhook_url' => $i->n8n_webhook_url ?? null,
                    'is_active' => $i->is_active ?? null,
                    'updated_at' => $i->updated_at ?? null,
                ];
            })
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// ============== FIX: Actualizar n8n_webhook_url para usar patrón withmia- ==============
Route::get('/fix/update-n8n-webhook-urls', function () {
    try {
        $n8nBaseUrl = config('services.n8n.base_url');
        
        if (!$n8nBaseUrl) {
            return response()->json([
                'success' => false,
                'error' => 'N8N_PUBLIC_URL not configured. Set N8N_PUBLIC_URL environment variable.'
            ], 500);
        }
        
        // Obtener todas las instancias
        $instances = \DB::table('whatsapp_instances')->get();
        $updated = [];
        
        foreach ($instances as $instance) {
            // Determinar el slug (instance_name o company_slug)
            $slug = $instance->company_slug ?? $instance->instance_name;
            
            // Nuevo webhook URL usando patrón withmia-{slug}
            $newWebhookUrl = "{$n8nBaseUrl}/webhook/withmia-{$slug}";
            
            // Actualizar en BD
            \DB::table('whatsapp_instances')
                ->where('id', $instance->id)
                ->update([
                    'n8n_webhook_url' => $newWebhookUrl,
                    'company_slug' => $slug,
                    'updated_at' => now()
                ]);
            
            $updated[] = [
                'id' => $instance->id,
                'instance_name' => $instance->instance_name,
                'old_webhook' => $instance->n8n_webhook_url,
                'new_webhook' => $newWebhookUrl
            ];
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Actualizados ' . count($updated) . ' registros',
            'updated' => $updated
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

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
Route::get('/diagnose-instance/{instanceName}', function (string $instanceName) {
    try {
        $evolutionApi = app(\App\Services\EvolutionApiService::class);
        $chatwootService = app(\App\Services\ChatwootService::class);
        $n8nService = app(\App\Services\N8nService::class);
        
        $diagnosis = [
            'instance_name' => $instanceName,
            'timestamp' => now()->toIso8601String(),
            'checks' => []
        ];
        
        // 1. Verificar instancia en BD local
        $instance = DB::table('whatsapp_instances')
            ->where('instance_name', $instanceName)
            ->first();
        
        $diagnosis['checks']['local_db'] = [
            'exists' => $instance !== null,
            'data' => $instance ? [
                'id' => $instance->id,
                'company_id' => $instance->company_id,
                'is_active' => $instance->is_active,
                'n8n_workflow_id' => $instance->n8n_workflow_id ?? null,
                'n8n_webhook_url' => $instance->n8n_webhook_url ?? null,
                'chatwoot_inbox_id' => $instance->chatwoot_inbox_id ?? null,
            ] : null
        ];
        
        // 2. Verificar instancia en Evolution API
        try {
            $evolutionStatus = $evolutionApi->getStatus($instanceName);
            $diagnosis['checks']['evolution_api'] = [
                'exists' => $evolutionStatus['success'] ?? false,
                'connected' => $evolutionStatus['connected'] ?? false,
                'state' => $evolutionStatus['state'] ?? 'unknown'
            ];
        } catch (\Exception $e) {
            $diagnosis['checks']['evolution_api'] = [
                'exists' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // 3. Verificar webhook configurado en Evolution
        try {
            $webhookUrl = config('evolution.api_url') . "/webhook/find/{$instanceName}";
            $webhookResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => config('evolution.api_key')
            ])->get(config('evolution.api_url') . "/webhook/find/{$instanceName}");
            
            $diagnosis['checks']['evolution_webhook'] = [
                'configured' => $webhookResponse->successful(),
                'data' => $webhookResponse->successful() ? $webhookResponse->json() : null
            ];
        } catch (\Exception $e) {
            $diagnosis['checks']['evolution_webhook'] = [
                'configured' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // 4. Verificar Chatwoot integration en Evolution
        try {
            $chatwootResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => config('evolution.api_key')
            ])->get(config('evolution.api_url') . "/chatwoot/find/{$instanceName}");
            
            $diagnosis['checks']['evolution_chatwoot_integration'] = [
                'configured' => $chatwootResponse->successful(),
                'data' => $chatwootResponse->successful() ? $chatwootResponse->json() : null
            ];
        } catch (\Exception $e) {
            $diagnosis['checks']['evolution_chatwoot_integration'] = [
                'configured' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // 5. Verificar inbox en Chatwoot
        try {
            $inbox = $chatwootService->findInboxByName($instanceName);
            $diagnosis['checks']['chatwoot_inbox'] = [
                'exists' => $inbox !== null,
                'data' => $inbox
            ];
        } catch (\Exception $e) {
            $diagnosis['checks']['chatwoot_inbox'] = [
                'exists' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // 6. Verificar webhooks en Chatwoot
        try {
            $webhooks = $chatwootService->listWebhooks();
            $n8nWebhookUrl = $instance->n8n_webhook_url ?? null;
            
            $relevantWebhooks = [];
            if (isset($webhooks['payload'])) {
                foreach ($webhooks['payload'] as $wh) {
                    // Buscar webhooks que apunten a n8n con el path de esta instancia
                    if (str_contains($wh['url'] ?? '', $instanceName) || 
                        str_contains($wh['url'] ?? '', 'withmia')) {
                        $relevantWebhooks[] = $wh;
                    }
                }
            }
            
            $diagnosis['checks']['chatwoot_webhooks'] = [
                'total_count' => count($webhooks['payload'] ?? []),
                'relevant_webhooks' => $relevantWebhooks,
                'expected_webhook_url' => $n8nWebhookUrl
            ];
        } catch (\Exception $e) {
            $diagnosis['checks']['chatwoot_webhooks'] = [
                'error' => $e->getMessage()
            ];
        }
        
        // 7. Verificar workflow en n8n
        try {
            $workflowId = $instance->n8n_workflow_id ?? null;
            if ($workflowId) {
                $workflows = $n8nService->getWorkflows();
                $found = false;
                $workflowData = null;
                
                foreach ($workflows['data'] ?? [] as $wf) {
                    if ($wf['id'] == $workflowId) {
                        $found = true;
                        $workflowData = [
                            'id' => $wf['id'],
                            'name' => $wf['name'],
                            'active' => $wf['active'] ?? false
                        ];
                        break;
                    }
                }
                
                $diagnosis['checks']['n8n_workflow'] = [
                    'exists' => $found,
                    'workflow_id' => $workflowId,
                    'data' => $workflowData
                ];
            } else {
                $diagnosis['checks']['n8n_workflow'] = [
                    'exists' => false,
                    'reason' => 'No workflow_id in local database'
                ];
            }
        } catch (\Exception $e) {
            $diagnosis['checks']['n8n_workflow'] = [
                'error' => $e->getMessage()
            ];
        }
        
        // Resumen
        $issues = [];
        if (!$diagnosis['checks']['local_db']['exists']) {
            $issues[] = 'Instance not found in local database';
        }
        if (!($diagnosis['checks']['evolution_api']['connected'] ?? false)) {
            $issues[] = 'WhatsApp not connected in Evolution API';
        }
        if (empty($diagnosis['checks']['local_db']['data']['n8n_workflow_id'] ?? null)) {
            $issues[] = 'No n8n workflow assigned';
        }
        if (empty($diagnosis['checks']['local_db']['data']['n8n_webhook_url'] ?? null)) {
            $issues[] = 'No n8n webhook URL configured';
        }
        if (empty($diagnosis['checks']['chatwoot_webhooks']['relevant_webhooks'] ?? [])) {
            $issues[] = 'No Chatwoot webhook pointing to n8n for this instance';
        }
        
        $diagnosis['issues'] = $issues;
        $diagnosis['healthy'] = empty($issues);
        
        return response()->json($diagnosis);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

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
            // Intentar crear registro
            $companyId = $request->input('company_id', 1);
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
            $repairs[] = "Created instance record in local database";
        }
        
        // 2. Verificar/crear workflow en n8n si no existe
        if (empty($instance->n8n_workflow_id)) {
            Log::info("🔧 Repair: Creating n8n workflow for {$instanceName}");
            
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
Route::get('/diagnose-webhook-flow/{instanceName?}', function ($instanceName = null) {
    try {
        $results = [
            'instance' => null,
            'n8n_workflow' => null,
            'chatwoot_webhooks' => null,
            'repairs_made' => [],
            'errors' => []
        ];
        
        // 1. OBTENER INSTANCIA DE BD
        if (!$instanceName) {
            // Buscar primera instancia activa
            $instance = DB::table('whatsapp_instances')->where('is_active', 1)->orderByDesc('id')->first();
            if (!$instance) {
                return response()->json(['error' => 'No hay instancias activas. Crea una instancia primero.'], 404);
            }
            $instanceName = $instance->instance_name;
        } else {
            $instance = DB::table('whatsapp_instances')->where('instance_name', $instanceName)->first();
        }
        
        $results['instance'] = $instance ? [
            'id' => $instance->id,
            'name' => $instance->instance_name,
            'company_id' => $instance->company_id,
            'is_active' => $instance->is_active,
            'n8n_workflow_id' => $instance->n8n_workflow_id ?? null,
            'n8n_webhook_url' => $instance->n8n_webhook_url ?? null,
            'chatwoot_inbox_id' => $instance->chatwoot_inbox_id ?? null
        ] : null;
        
        if (!$instance) {
            return response()->json([
                'error' => "Instancia '{$instanceName}' no encontrada en BD",
                'suggestion' => 'Crea la instancia desde tu app primero'
            ], 404);
        }
        
        // 2. VERIFICAR/CREAR WORKFLOW EN N8N
        $n8nService = app(\App\Services\N8nService::class);
        $n8nBaseUrl = config('services.n8n.base_url');
        
        if (!empty($instance->n8n_workflow_id)) {
            // Verificar que existe
            $workflowResult = $n8nService->getWorkflow($instance->n8n_workflow_id);
            if ($workflowResult['success']) {
                $workflow = $workflowResult['data'];
                $results['n8n_workflow'] = [
                    'id' => $workflow['id'],
                    'name' => $workflow['name'],
                    'active' => $workflow['active'] ?? false,
                    'webhook_path' => null
                ];
                
                // Extraer webhook path
                foreach ($workflow['nodes'] ?? [] as $node) {
                    if ($node['type'] === 'n8n-nodes-base.webhook') {
                        $webhookPath = $node['parameters']['path'] ?? $instanceName;
                        $results['n8n_workflow']['webhook_path'] = $webhookPath;
                        $results['n8n_workflow']['webhook_url'] = "{$n8nBaseUrl}/webhook/{$webhookPath}";
                        break;
                    }
                }
                
                // Activar si está inactivo
                if (!($workflow['active'] ?? false)) {
                    $activateResult = $n8nService->activateWorkflow($instance->n8n_workflow_id);
                    if ($activateResult['success']) {
                        $results['repairs_made'][] = 'Workflow n8n activado';
                        $results['n8n_workflow']['active'] = true;
                    }
                }
            } else {
                $results['errors'][] = "Workflow {$instance->n8n_workflow_id} no encontrado en n8n";
                // Limpiar referencia inválida
                DB::table('whatsapp_instances')
                    ->where('id', $instance->id)
                    ->update(['n8n_workflow_id' => null, 'n8n_webhook_url' => null]);
                $instance->n8n_workflow_id = null;
            }
        }
        
        // Si no hay workflow, crearlo
        if (empty($instance->n8n_workflow_id)) {
            $results['errors'][] = 'No hay workflow n8n configurado';
            // TODO: Podría crear uno automáticamente aquí
        }
        
        // 3. VERIFICAR WEBHOOKS DE CHATWOOT
        $chatwootUrl = config('services.chatwoot.base_url') ?? config('chatwoot.url');
        $chatwootToken = config('chatwoot.platform_token') ?? config('chatwoot.token');
        $accountId = 1; // Account ID por defecto
        
        // Obtener company para account_id correcto
        if ($instance->company_id) {
            $company = DB::table('companies')->find($instance->company_id);
            if ($company && $company->chatwoot_account_id) {
                $accountId = $company->chatwoot_account_id;
            }
        }
        
        // Listar webhooks de Chatwoot
        $webhooksResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'api_access_token' => $chatwootToken
        ])->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks");
        
        $existingWebhooks = $webhooksResponse->json()['payload'] ?? $webhooksResponse->json() ?? [];
        $results['chatwoot_webhooks'] = [
            'account_id' => $accountId,
            'total' => count($existingWebhooks),
            'list' => array_map(fn($w) => ['id' => $w['id'], 'url' => $w['url']], $existingWebhooks)
        ];
        
        // 4. VERIFICAR SI HAY WEBHOOK APUNTANDO A N8N
        $n8nWebhookUrl = $results['n8n_workflow']['webhook_url'] ?? null;
        $hasN8nWebhook = false;
        $correctN8nWebhook = null;
        
        foreach ($existingWebhooks as $webhook) {
            if (str_contains($webhook['url'], 'n8n') || str_contains($webhook['url'], '/webhook/')) {
                $hasN8nWebhook = true;
                $correctN8nWebhook = $webhook;
                break;
            }
        }
        
        $results['n8n_webhook_configured'] = $hasN8nWebhook;
        
        // 5. SI NO HAY WEBHOOK A N8N, CREARLO
        if (!$hasN8nWebhook && $n8nWebhookUrl) {
            Log::info('🔧 Creando webhook de Chatwoot a n8n', [
                'account_id' => $accountId,
                'webhook_url' => $n8nWebhookUrl
            ]);
            
            $createResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'api_access_token' => $chatwootToken,
                'Content-Type' => 'application/json'
            ])->post("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks", [
                'webhook' => [
                    'url' => $n8nWebhookUrl,
                    'subscriptions' => ['message_created', 'message_updated', 'conversation_created', 'conversation_updated', 'conversation_status_changed']
                ]
            ]);
            
            if ($createResponse->successful()) {
                $newWebhook = $createResponse->json();
                $results['repairs_made'][] = "Webhook de Chatwoot a n8n creado: {$n8nWebhookUrl}";
                $results['new_webhook'] = $newWebhook;
                $results['n8n_webhook_configured'] = true;
            } else {
                $results['errors'][] = 'Error creando webhook: ' . $createResponse->body();
            }
        }
        
        // 6. RESUMEN
        $results['status'] = empty($results['errors']) ? 'OK' : 'NEEDS_ATTENTION';
        $results['flow_summary'] = [
            '1_whatsapp_to_evolution' => 'Configure in Evolution API dashboard',
            '2_evolution_to_chatwoot' => $instance->chatwoot_inbox_id ? '✅ Configurado' : '⚠️ Verificar en Evolution',
            '3_chatwoot_to_n8n' => $results['n8n_webhook_configured'] ? '✅ Webhook existe' : '❌ FALTA WEBHOOK',
            '4_n8n_workflow' => $results['n8n_workflow'] ? '✅ Workflow existe' : '❌ FALTA WORKFLOW'
        ];
        
        return response()->json($results);
        
    } catch (\Exception $e) {
        Log::error('Error en diagnóstico de webhook flow', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

/**
 * �🔄 Listar todos los webhooks de Chatwoot
 * GET /api/list-chatwoot-webhooks
 */
Route::get('/list-chatwoot-webhooks', function () {
    try {
        $chatwootService = app(\App\Services\ChatwootService::class);
        $webhooks = $chatwootService->listWebhooks();
        
        return response()->json([
            'success' => true,
            'webhooks' => $webhooks
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

/**
 * 🗑️ Limpiar webhooks duplicados/viejos de Chatwoot
 * POST /api/cleanup-chatwoot-webhooks
 */
Route::post('/cleanup-chatwoot-webhooks', function (Request $request) {
    try {
        $chatwootService = app(\App\Services\ChatwootService::class);
        $keepPattern = $request->input('keep_pattern', 'n8n'); // Mantener solo los que contienen este patrón
        
        $webhooks = $chatwootService->listWebhooks();
        $deleted = [];
        $kept = [];
        
        foreach ($webhooks['payload'] ?? [] as $webhook) {
            $url = $webhook['url'] ?? '';
            $id = $webhook['id'] ?? null;
            
            if (!$id) continue;
            
            // Verificar si debe mantenerse
            if (str_contains($url, $keepPattern)) {
                $kept[] = ['id' => $id, 'url' => $url];
            } else {
                // Eliminar webhook viejo
                try {
                    $deleteUrl = config('chatwoot.url') . "/api/v1/accounts/" . config('chatwoot.account_id') . "/webhooks/{$id}";
                    $response = \Illuminate\Support\Facades\Http::withHeaders([
                        'api_access_token' => config('chatwoot.super_admin_token') ?? config('chatwoot.platform_token')
                    ])->delete($deleteUrl);
                    
                    if ($response->successful()) {
                        $deleted[] = ['id' => $id, 'url' => $url];
                    }
                } catch (\Exception $e) {
                    Log::warning("Error deleting webhook {$id}", ['error' => $e->getMessage()]);
                }
            }
        }
        
        return response()->json([
            'success' => true,
            'deleted' => $deleted,
            'kept' => $kept,
            'message' => 'Cleanup completed'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

/**
 * 🔥 CREAR WEBHOOK DE CHATWOOT A N8N - DIRECTO EN BD
 * GET /api/create-n8n-webhook
 */
Route::get('/create-n8n-webhook', function () {
    try {
        // Conexión directa a Chatwoot DB
        $chatwootPdo = new \PDO(
            "pgsql:host=" . env('CHATWOOT_DB_HOST', 'postgres-mvz7.railway.internal') . 
            ";port=" . env('CHATWOOT_DB_PORT', '5432') . 
            ";dbname=" . env('CHATWOOT_DB_DATABASE', 'chatwoot'),
            env('CHATWOOT_DB_USERNAME', 'postgres'),
            env('CHATWOOT_DB_PASSWORD')
        );
        
        // Verificar webhooks existentes
        $stmt = $chatwootPdo->query("SELECT id, url, subscriptions FROM webhooks WHERE account_id = 1");
        $existing = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        // URL del webhook de n8n (dinámico basado en configuración)
        // Para futuros usuarios, cada instancia tendrá su propio webhook
        $n8nBaseUrl = config('services.n8n.url', env('N8N_PUBLIC_URL', env('N8N_URL')));
        
        // Obtener el instanceName de la primera instancia activa del account
        $miaDb = \DB::connection('mysql');
        $instance = $miaDb->table('whatsapp_instances')
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();
        
        $instanceName = $instance->instance_name ?? 'default';
        $n8nWebhookUrl = "{$n8nBaseUrl}/webhook/{$instanceName}";
        
        // Verificar si ya existe
        $alreadyExists = false;
        foreach ($existing as $wh) {
            if (str_contains($wh['url'], 'n8n')) {
                $alreadyExists = true;
                break;
            }
        }
        
        $created = null;
        if (!$alreadyExists) {
            // Crear webhook
            $stmt = $chatwootPdo->prepare("
                INSERT INTO webhooks (account_id, url, subscriptions, created_at, updated_at) 
                VALUES (1, :url, :subscriptions, NOW(), NOW()) 
                RETURNING id, url
            ");
            $stmt->execute([
                'url' => $n8nWebhookUrl,
                'subscriptions' => '{message_created,message_updated,conversation_created,conversation_updated}'
            ]);
            $created = $stmt->fetch(\PDO::FETCH_ASSOC);
        }
        
        // Listar todos los webhooks
        $stmt = $chatwootPdo->query("SELECT id, url, subscriptions FROM webhooks WHERE account_id = 1");
        $allWebhooks = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        return response()->json([
            'success' => true,
            'already_existed' => $alreadyExists,
            'created' => $created,
            'all_webhooks' => $allWebhooks,
            'n8n_webhook_url' => $n8nWebhookUrl
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
Route::get('/fix-n8n-webhook', function () {
    try {
        // Conexión directa a Chatwoot DB
        $chatwootPdo = new \PDO(
            "pgsql:host=" . env('CHATWOOT_DB_HOST', 'postgres-mvz7.railway.internal') . 
            ";port=" . env('CHATWOOT_DB_PORT', '5432') . 
            ";dbname=" . env('CHATWOOT_DB_DATABASE', 'chatwoot'),
            env('CHATWOOT_DB_USERNAME', 'postgres'),
            env('CHATWOOT_DB_PASSWORD')
        );
        
        // Las subscriptions son JSON array, no PostgreSQL array
        $subscriptions = json_encode(['message_created', 'message_updated', 'conversation_created', 'conversation_updated']);
        
        // Actualizar webhook de n8n con todas las subscripciones necesarias
        $stmt = $chatwootPdo->prepare("
            UPDATE webhooks 
            SET subscriptions = :subscriptions::jsonb, updated_at = NOW()
            WHERE url LIKE '%n8n%' AND account_id = 1
            RETURNING id, url, subscriptions
        ");
        $stmt->execute([
            'subscriptions' => $subscriptions
        ]);
        $updated = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        // Listar todos los webhooks
        $stmt = $chatwootPdo->query("SELECT id, url, subscriptions FROM webhooks WHERE account_id = 1");
        $allWebhooks = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        return response()->json([
            'success' => true,
            'updated' => $updated,
            'all_webhooks' => $allWebhooks
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

/**
 * 🔄 ACTUALIZAR WORKFLOW N8N EXISTENTE PARA ACEPTAR FORMATO CHATWOOT
 * GET /api/fix-n8n-workflow/{instanceName?}
 */
Route::get('/fix-n8n-workflow/{instanceName?}', function ($instanceName = null) {
    try {
        $n8nService = app(\App\Services\N8nService::class);
        
        // Obtener instancia
        if (!$instanceName) {
            $instance = DB::table('whatsapp_instances')->where('is_active', 1)->orderByDesc('id')->first();
            $instanceName = $instance->instance_name ?? null;
        } else {
            $instance = DB::table('whatsapp_instances')->where('instance_name', $instanceName)->first();
        }
        
        if (!$instance || !$instance->n8n_workflow_id) {
            return response()->json(['error' => 'No workflow found for instance', 'instance' => $instanceName], 404);
        }
        
        // Obtener workflow actual
        $workflowResult = $n8nService->getWorkflow($instance->n8n_workflow_id);
        if (!$workflowResult['success']) {
            return response()->json(['error' => 'Could not get workflow from n8n'], 500);
        }
        
        $workflow = $workflowResult['data'];
        $updated = false;
        
        // Actualizar el nodo "Is Incoming Message?" para aceptar ambos formatos
        foreach ($workflow['nodes'] as &$node) {
            if ($node['name'] === 'Is Incoming Message?' && isset($node['parameters']['conditions']['conditions'])) {
                foreach ($node['parameters']['conditions']['conditions'] as &$condition) {
                    // Actualizar leftValue para usar fallback
                    if (isset($condition['leftValue'])) {
                        $original = $condition['leftValue'];
                        
                        // Arreglar event
                        if (str_contains($original, '$json.body.event') && !str_contains($original, '??')) {
                            $condition['leftValue'] = str_replace('$json.body.event', '$json.body.event ?? $json.event', $original);
                            $updated = true;
                        }
                        // Arreglar message_type
                        if (str_contains($original, '$json.body.message_type') && !str_contains($original, '??')) {
                            $condition['leftValue'] = str_replace('$json.body.message_type', '$json.body.message_type ?? $json.message_type', $original);
                            $updated = true;
                        }
                        // Arreglar private
                        if (str_contains($original, '$json.body.private') && !str_contains($original, '??')) {
                            $condition['leftValue'] = str_replace('$json.body.private', '$json.body.private ?? $json.private', $original);
                            $updated = true;
                        }
                        // Arreglar content
                        if (str_contains($original, '$json.body.content') && !str_contains($original, '??')) {
                            $condition['leftValue'] = str_replace('$json.body.content', '$json.body.content ?? $json.content', $original);
                            $updated = true;
                        }
                    }
                }
            }
        }
        
        if ($updated) {
            // Actualizar workflow en n8n
            $updateResult = $n8nService->updateWorkflow($instance->n8n_workflow_id, $workflow);
            
            return response()->json([
                'success' => true,
                'message' => 'Workflow updated to accept Chatwoot format',
                'workflow_id' => $instance->n8n_workflow_id,
                'update_result' => $updateResult
            ]);
        } else {
            return response()->json([
                'success' => true,
                'message' => 'Workflow already has correct format',
                'workflow_id' => $instance->n8n_workflow_id
            ]);
        }
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});
