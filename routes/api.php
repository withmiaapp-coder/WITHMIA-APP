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

// 🔧 DEBUG: Test broadcast endpoint - CANAL PÚBLICO para debug
Route::get('/test-broadcast/{inboxId}', function ($inboxId) {
    try {
        $testMessage = [
            'id' => 9999,
            'content' => 'Test broadcast message at ' . now()->toIso8601String(),
            'conversation_id' => 1,
            'inbox_id' => (int) $inboxId,
            'account_id' => 1,
            'message_type' => 0,
            'created_at' => now()->timestamp,
        ];
        
        $key = config('broadcasting.connections.pusher.key');
        $secret = config('broadcasting.connections.pusher.secret');
        $appId = config('broadcasting.connections.pusher.app_id');
        $cluster = config('broadcasting.connections.pusher.options.cluster');
        
        // Intentar broadcast directo con Pusher
        $pusher = new \Pusher\Pusher(
            $key,
            $secret,
            $appId,
            [
                'cluster' => $cluster,
                'useTLS' => true,
            ]
        );
        
        // Probar con CANAL PÚBLICO primero
        $publicChannel = 'test-channel';
        $privateChannel = 'private-inbox.' . $inboxId;
        $eventName = 'test-event';
        
        $payload = [
            'message' => $testMessage,
            'test' => 'This is a test at ' . now()->toIso8601String(),
        ];
        
        // Enviar a canal público
        $publicResult = $pusher->trigger($publicChannel, $eventName, $payload);
        
        // Enviar a canal privado
        $privateResult = $pusher->trigger($privateChannel, 'message.received', $payload);
        
        return response()->json([
            'status' => 'success',
            'public_channel' => $publicChannel,
            'private_channel' => $privateChannel,
            'public_result' => $publicResult,
            'private_result' => $privateResult,
            'config' => [
                'key' => $key,
                'secret_first_4' => substr($secret ?? '', 0, 4) . '...',
                'app_id' => $appId,
                'cluster' => $cluster,
            ],
            'instructions' => 'Ejecuta en consola: window.Echo.channel("test-channel").listen("test-event", e => console.log("RECIBIDO!", e))'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'exception_class' => get_class($e),
        ], 500);
    }
});

// Habilitar autenticación de canales de broadcasting

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
