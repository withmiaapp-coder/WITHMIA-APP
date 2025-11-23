<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\OnboardingApiController;
use App\Http\Controllers\Api\ChatwootController;

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
    });
});

// Webhook para Evolution API → Chatwoot (formato legacy)
Route::post('/chatwoot/webhook/{instance}', [\App\Http\Controllers\Api\ChatwootWebhookController::class, 'handleWebhook']);

Route::post('/chatwoot/webhook', [\App\Http\Controllers\Api\ChatwootWebhookController::class, 'handleWebhook']);

use App\Http\Controllers\ChatwootWebhookController;

// Webhook de Chatwoot para notificaciones en tiempo real
Route::post('/webhooks/chatwoot', [ChatwootWebhookController::class, 'handle'])
    ->name('chatwoot.webhook');
