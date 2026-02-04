<?php

/**
 * 🔧 Rutas de Diagnóstico y Debug
 * 
 * Este archivo contiene rutas temporales para diagnóstico y corrección.
 * Solo se carga en entorno local/development/staging.
 * 
 * 🔒 SEGURIDAD: Todas las rutas requieren header X-Debug-Key
 * 
 * @see config/app.php para APP_ENV
 */

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

// ====================================
// 🔒 MIDDLEWARE DE SEGURIDAD PARA DEBUG
// ====================================
Route::middleware(function ($request, $next) {
    // En local permitir sin key
    if (app()->environment('local')) {
        return $next($request);
    }
    
    // En staging/development requerir X-Debug-Key
    $debugKey = config('app.debug_key', env('DEBUG_SECRET_KEY'));
    $providedKey = $request->header('X-Debug-Key');
    
    if (!$debugKey || $providedKey !== $debugKey) {
        Log::warning('Intento de acceso a rutas debug sin key válida', [
            'ip' => $request->ip(),
            'path' => $request->path()
        ]);
        return response()->json(['error' => 'Unauthorized - Debug key required'], 401);
    }
    
    return $next($request);
})->group(function () {

// ====================================
// 🔧 RUTAS DE DIAGNÓSTICO Y DEBUG
// ====================================

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
        
        Log::debug('? Webhook de inbox actualizado', [
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

Route::get('/debug-users', function () {
    $users = \App\Models\User::all(['id', 'name', 'email', 'created_at']);
    return response()->json([
        'total' => $users->count(),
        'users' => $users
    ]);
});

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
        
        Log::debug("Creando workflow para {$instanceName}", [
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
        
        Log::debug('Credentials obtenidas', [
            'openai_id' => $openaiCredentialId,
            'qdrant_id' => $qdrantCredentialId
        ]);
        
        // Replace placeholders in template
        $templateJson = json_encode($templateWorkflow);
        $appUrl = config('app.url');
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
            
            Log::debug('? Token sincronizado desde Chatwoot', [
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
        
        Log::debug('? Nuevo token creado en Chatwoot', [
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
        
        Log::debug('? All Chatwoot tokens fixed', ['count' => count($results)]);
        
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
            
            Log::debug('? Chatwoot user type fixed', [
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
            // CRÍTICO: Usar API Access Token (NO Channel Token)
            $apiToken = $company->chatwoot_api_key;
            
            if (!$apiToken) {
                $adminUser = $chatwootDb->table('account_users')
                    ->join('access_tokens', 'account_users.user_id', '=', 'access_tokens.owner_id')
                    ->where('account_users.account_id', $accountId)
                    ->where('account_users.role', 1)
                    ->first();
                $apiToken = $adminUser->token ?? null;
            }
            
            $chatwootUrl = config('chatwoot.url');
            
            $updateResponse = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $evolutionKey,
                'Content-Type' => 'application/json'
            ])->timeout(30)->post("{$evolutionUrl}/chatwoot/set/{$instanceName}", [
                'enabled' => true,
                'accountId' => (string) $accountId,
                'token' => $apiToken,
                'url' => $chatwootUrl,
                'signMsg' => false,
                'reopenConversation' => true,
                'conversationPending' => false,
                'nameInbox' => $correctInboxName,
                'mergeBrazilContacts' => false,
                'importContacts' => false,
                'importMessages' => false,
                'daysLimitImportMessages' => 0,
                'autoCreate' => true
            ]);
            
            $evolutionUpdated = $updateResponse->successful();
        }
        
        // 5. Limpiar caché
        \Illuminate\Support\Facades\Cache::flush();
        
        Log::debug('✅ Inbox renombrado', [
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

Route::get('/debug/companies-columns', function () {
    $columns = \DB::select("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'companies' ORDER BY ordinal_position");
    return response()->json([
        'success' => true,
        'columns' => $columns
    ]);
});

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
            Log::debug('🔧 Creando webhook de Chatwoot a n8n', [
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
 * Optimiza los webhooks de n8n existentes para evitar ejecuciones duplicadas
 * Reduce las suscripciones a solo 'message_created'
 */
Route::post('/optimize-n8n-webhooks', function () {
    try {
        $chatwootService = app(\App\Services\ChatwootService::class);
        $result = $chatwootService->optimizeN8nWebhooks();
        
        return response()->json($result);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

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

Route::get('/debug/session-routing-diagnostic', function () {
    try {
        $evolutionUrl = config('evolution.api_url');
        $evolutionKey = config('evolution.api_key');
        $chatwootDb = DB::connection('chatwoot');
        
        // 1. Obtener TODAS las instancias activas de Evolution API
        $instancesResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'apikey' => $evolutionKey
        ])->timeout(15)->get("{$evolutionUrl}/instance/fetchInstances");
        
        $evolutionInstances = $instancesResponse->json() ?? [];
        
        // 2. Obtener todos los usuarios con sus company_slug e inbox
        $users = \App\Models\User::with('company')
            ->whereNotNull('company_slug')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'company_slug' => $user->company_slug,
                    'chatwoot_inbox_id' => $user->chatwoot_inbox_id,
                    'company_name' => $user->company ? $user->company->name : null,
                    'last_login' => $user->last_login_at ?? 'N/A'
                ];
            });
        
        // 3. Obtener todos los inboxes de Chatwoot
        $inboxes = $chatwootDb->table('inboxes')
            ->select('id', 'name', 'channel_type', 'channel_id', 'account_id')
            ->get();
        
        // 4. Mapear cada instancia de Evolution con su configuración
        $instanceDiagnostics = [];
        foreach ($evolutionInstances as $instance) {
            $instName = $instance['instance']['instanceName'] ?? $instance['name'] ?? 'unknown';
            $state = $instance['instance']['status'] ?? $instance['state'] ?? 'unknown';
            
            // Obtener config de Chatwoot para esta instancia
            try {
                $chatwootConfig = \Illuminate\Support\Facades\Http::withHeaders([
                    'apikey' => $evolutionKey
                ])->timeout(10)->get("{$evolutionUrl}/chatwoot/find/{$instName}");
                $cwConfig = $chatwootConfig->json();
            } catch (\Exception $e) {
                $cwConfig = ['error' => $e->getMessage()];
            }
            
            // Buscar usuarios asociados a esta instancia
            $associatedUsers = $users->filter(function ($u) use ($instName) {
                return $u['company_slug'] === $instName;
            })->values();
            
            // Buscar inbox de Chatwoot
            $relatedInbox = $inboxes->first(function ($inbox) use ($instName) {
                return stripos($inbox->name, $instName) !== false;
            });
            
            $instanceDiagnostics[] = [
                'instance_name' => $instName,
                'status' => $state,
                'chatwoot_enabled' => $cwConfig['enabled'] ?? false,
                'chatwoot_inbox_name' => $cwConfig['nameInbox'] ?? null,
                'chatwoot_account_id' => $cwConfig['accountId'] ?? null,
                'related_inbox_id' => $relatedInbox ? $relatedInbox->id : null,
                'associated_users' => $associatedUsers->count(),
                'users' => $associatedUsers->toArray()
            ];
        }
        
        // 5. Detectar problemas potenciales
        $issues = [];
        
        // Múltiples usuarios con el mismo company_slug
        $slugCounts = $users->groupBy('company_slug')->map->count();
        foreach ($slugCounts as $slug => $count) {
            if ($count > 1) {
                $issues[] = [
                    'type' => 'duplicate_company_slug',
                    'severity' => 'high',
                    'message' => "El company_slug '{$slug}' está asignado a {$count} usuarios. Esto puede causar conflictos de enrutamiento.",
                    'users' => $users->where('company_slug', $slug)->pluck('email')->toArray()
                ];
            }
        }
        
        // Usuarios sin inbox asignado
        $usersWithoutInbox = $users->where('chatwoot_inbox_id', null);
        if ($usersWithoutInbox->count() > 0) {
            $issues[] = [
                'type' => 'missing_inbox',
                'severity' => 'medium',
                'message' => "{$usersWithoutInbox->count()} usuarios no tienen inbox_id asignado",
                'users' => $usersWithoutInbox->pluck('email')->toArray()
            ];
        }
        
        // Instancias conectadas sin usuarios asociados
        foreach ($instanceDiagnostics as $diag) {
            if ($diag['status'] === 'open' && $diag['associated_users'] === 0) {
                $issues[] = [
                    'type' => 'orphan_instance',
                    'severity' => 'low',
                    'message' => "La instancia '{$diag['instance_name']}' está conectada pero no tiene usuarios asociados"
                ];
            }
        }
        
        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601String(),
            'summary' => [
                'total_evolution_instances' => count($evolutionInstances),
                'total_users_with_slug' => $users->count(),
                'total_inboxes' => $inboxes->count(),
                'issues_found' => count($issues)
            ],
            'issues' => $issues,
            'instances' => $instanceDiagnostics,
            'all_users' => $users,
            'all_inboxes' => $inboxes,
            'recommendation' => count($issues) > 0 
                ? 'Hay problemas de configuración que pueden causar enrutamiento incorrecto de mensajes' 
                : 'La configuración parece correcta'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});


}); // Cierre del grupo middleware de seguridad
