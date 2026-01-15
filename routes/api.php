<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\OnboardingApiController;
use App\Http\Controllers\Api\ChatwootController;
use App\Events\NewMessageReceived;

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

// 🗑️ WIPE DATABASE - Solo estructura, sin datos
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
    
    Route::middleware(['web', 'auth'])->group(function () {
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

// Knowledge Base / Conocimientos API routes - authenticated
Route::middleware(['web', 'auth'])->group(function () {
    // Onboarding data
    Route::get('/onboarding-data', [\App\Http\Controllers\KnowledgeController::class, 'getOnboardingData']);
    Route::put('/onboarding-data', [\App\Http\Controllers\KnowledgeController::class, 'updateOnboardingData']);
    Route::post('/knowledge/upload-document', [\App\Http\Controllers\KnowledgeController::class, 'uploadDocument']);
    
    // Documents
    Route::get('/documents', [\App\Http\Controllers\KnowledgeController::class, 'getDocuments']);
    Route::post('/documents/metadata', [\App\Http\Controllers\KnowledgeController::class, 'storeDocumentMetadata']);
    Route::delete('/documents/{id}', [\App\Http\Controllers\KnowledgeController::class, 'deleteDocument']);
    Route::post('/documents/update-vector-ids', [\App\Http\Controllers\KnowledgeController::class, 'updateVectorIds']);
});

// Public webhook endpoint for n8n (no authentication)
Route::post('/n8n/update-vector-ids', [\App\Http\Controllers\KnowledgeController::class, 'updateVectorIdsWebhook']);

// WhatsApp Instance lookup endpoint (no authentication - used by n8n)
Route::get('/whatsapp/instance/{instanceName}/company', [\App\Http\Controllers\Api\WhatsAppInstanceController::class, 'getCompanyByInstance']);

Route::middleware(['web', 'auth'])->group(function () {
    
});

// N8n Workflow Management
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/workflows/create-for-company', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'createWorkflowForCompany']);
    Route::get('/workflows/company-list', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'listCompanyWorkflows']);
    Route::get('/workflows/company/{companyId}', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'getCompanyWorkflow']);
    Route::delete('/workflows/company/{companyId}', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'deleteCompanyWorkflow']);
    Route::post('/workflows/company/{companyId}/toggle', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'toggleWorkflow']);
});
