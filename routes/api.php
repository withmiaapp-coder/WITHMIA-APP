<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\OnboardingApiController;
use App\Http\Controllers\Api\ChatwootController;
use App\Events\NewMessageReceived;

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
        
        // 1. Obtener webhooks existentes
        $existingResponse = \Illuminate\Support\Facades\Http::withHeaders([
            'api_access_token' => $apiKey
        ])->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks");
        
        $webhooks = $existingResponse->json()['payload']['webhooks'] ?? $existingResponse->json()['webhooks'] ?? [];
        
        // 2. Eliminar TODOS los webhooks existentes
        $deleted = [];
        foreach ($webhooks as $wh) {
            if (isset($wh['id'])) {
                $deleteResponse = \Illuminate\Support\Facades\Http::withHeaders([
                    'api_access_token' => $apiKey
                ])->delete("{$chatwootUrl}/api/v1/accounts/{$accountId}/webhooks/{$wh['id']}");
                $deleted[] = ['id' => $wh['id'], 'status' => $deleteResponse->status()];
            }
        }
        
        // 3. Resetear la secuencia de IDs en la base de datos de Chatwoot
        $chatwootDbUrl = env('CHATWOOT_DATABASE_URL', 'postgresql://postgres:dzMmfzVhEDLgeRIAvRlWofFnagOyItjs@postgres.railway.internal:5432/chatwoot');
        $sequenceReset = false;
        try {
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
            $sequenceReset = 'error: ' . $e->getMessage();
        }
        
        // 4. Crear nuevo webhook (ahora será ID=1)
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
            'status' => $createResponse->successful() ? 'recreated_with_id_1' : 'error',
            'deleted_webhooks' => $deleted,
            'sequence_reset' => $sequenceReset,
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

// User profile API
Route::middleware(['web', 'auth'])->prefix('user')->group(function () {
    Route::get('/profile', function() {
        $user = auth()->user()->load('company');
        
        // Obtener inbox_id del usuario o de la company
        $inboxId = $user->chatwoot_inbox_id ?? $user->company?->chatwoot_inbox_id ?? null;
        
        return response()->json([
            'success' => true,
            'user' => $user,
            'chatwoot_inbox_id' => $inboxId
        ]);
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
Route::post('/workflows/create-for-company', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'createWorkflowForCompany'])->middleware('auth:sanctum');
Route::get('/workflows/company-list', [\App\Http\Controllers\Api\N8nWorkflowController::class, 'listCompanyWorkflows'])->middleware('auth:sanctum');
