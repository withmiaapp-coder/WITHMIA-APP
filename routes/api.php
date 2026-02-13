<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\OnboardingApiController;
use App\Http\Controllers\Api\ChatwootController;
use App\Http\Controllers\Api\ChatwootConversationController;
use App\Http\Controllers\Api\ChatwootMessageController;
use App\Http\Controllers\Api\ChatwootTeamController;
use App\Http\Controllers\Api\AdminToolsController;
use App\Http\Controllers\Api\CompanySettingsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\N8nConfigController;
use App\Http\Controllers\Api\DebugController;
use App\Http\Controllers\Api\CompanyProfileController;
use App\Http\Controllers\Api\BotConfigController;
use App\Http\Controllers\Api\TrainingChatController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\QdrantPointController;
use App\Http\Controllers\Api\MembersController;
use App\Http\Controllers\Api\TeamInvitationController;
use App\Http\Controllers\Api\N8nWorkflowController;
use App\Http\Controllers\Api\EvolutionApiController;
use App\Http\Controllers\Api\ChatwootWebhookController;
use App\Http\Controllers\Api\WhatsAppInstanceController;
use App\Http\Controllers\AttachmentProxyController;

// ============================================================================
// 1. HEALTH CHECK (sin auth)
// ============================================================================
Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'app' => config('app.name'),
            'database' => 'connected'
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'unhealthy',
            'timestamp' => now()->toIso8601String(),
            'error' => 'Database connection failed'
        ], 503);
    }
});

// ============================================================================
// 2. ONBOARDING API (throttled, sin auth)
// ============================================================================
Route::post('/onboarding', [OnboardingApiController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('api.onboarding.store');

// ============================================================================
// 3. WEBHOOKS EXTERNOS (protegidos por HMAC/secret, sin auth de usuario)
// ============================================================================

// Evolution API webhook
Route::post('/evolution-whatsapp/webhook', [EvolutionApiController::class, 'webhook'])
    ->middleware(['throttle:120,1', 'webhook.hmac:evolution']);

// Evolution API webhook (alias - Evolution sometimes sends to this URL)
Route::post('/evolution/webhook', [EvolutionApiController::class, 'webhook'])
    ->middleware(['throttle:120,1', 'webhook.hmac:evolution']);

// Chatwoot webhooks (con y sin instance param)
Route::post('/chatwoot/webhook/{instance}', [ChatwootWebhookController::class, 'handleWebhook'])
    ->middleware(['throttle:120,1', 'webhook.hmac:chatwoot']);
Route::post('/chatwoot/webhook', [ChatwootWebhookController::class, 'handleWebhook'])
    ->middleware(['throttle:120,1', 'webhook.hmac:chatwoot']);

// n8n webhooks (protegidos por X-N8N-Secret)
Route::middleware('n8n.secret')->group(function () {
    Route::post('/n8n/update-vector-ids', [DocumentController::class, 'updateVectorIdsWebhook']);
    Route::post('/knowledge/chunk-stored', [DocumentController::class, 'chunkStored']);
    Route::get('/whatsapp/instance/{instanceName}/company', [WhatsAppInstanceController::class, 'getCompanyByInstance']);
    Route::get('/n8n/company-config/{companySlug}', [N8nConfigController::class, 'companyConfig']);
    Route::get('/n8n/company-config-by-inbox/{inboxName}', [N8nConfigController::class, 'companyConfigByInbox']);
    Route::post('/n8n/notify-response', [N8nConfigController::class, 'notifyResponse']);
    Route::post('/n8n/qdrant-search', [N8nConfigController::class, 'qdrantSearch']);
});

// ============================================================================
// 4. INVITACIONES PÚBLICAS (throttled, sin auth)
// ============================================================================
Route::middleware('throttle:20,1')->prefix('invitation')->group(function () {
    Route::get('/validate/{token}', [TeamInvitationController::class, 'validateToken']);
    Route::post('/accept/{token}', [TeamInvitationController::class, 'accept']);
});

// ============================================================================
// 5. USUARIO AUTENTICADO (sesión web)
// ============================================================================
Route::middleware(['web', 'auth'])->prefix('user')->group(function () {
    Route::get('/profile', [UserController::class, 'profile']);
});

Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->group(function () {
    Route::get('/user/permissions', [UserController::class, 'permissions']);
    Route::get('/user/has-permission/{permission}', [UserController::class, 'hasPermission']);
});

// ============================================================================
// 6a. CHATWOOT PROXY - Attachment (NO auth required, browser loads <img> directly)
// ============================================================================
Route::prefix('chatwoot-proxy')->group(function () {
    Route::get('/attachment/{attachmentId}', [ChatwootConversationController::class, 'proxyAttachment']);
});

// 6b. CHATWOOT PROXY (auth via RailwayAuthToken)
// ============================================================================
Route::middleware([\App\Http\Middleware\RailwayAuthToken::class . ':true'])->prefix('chatwoot-proxy')->group(function () {
    // --- DEBUG: Test route to isolate middleware vs controller errors ---
    Route::get('/ping', function () {
        return response()->json([
            'pong' => true,
            'user' => auth()->id(),
            'timestamp' => now()->toIso8601String(),
        ]);
    });
    // --- Conversaciones ---
    Route::get('/conversations', [ChatwootConversationController::class, 'getConversations']);
    Route::get('/conversations/search', [ChatwootConversationController::class, 'searchMessages']);
    Route::get('/conversations/export-all', [ChatwootConversationController::class, 'exportAllConversationsWithMessages']);
    Route::get('/conversations/{id}', [ChatwootConversationController::class, 'getConversation']);
    Route::get('/conversations/{id}/messages', [ChatwootConversationController::class, 'getConversationMessages']);
    Route::delete('/conversations/{conversationId}', [ChatwootConversationController::class, 'deleteConversation']);
    Route::post('/conversations/{id}/update_last_seen', [ChatwootConversationController::class, 'markAsRead']);

    // --- Mensajes ---
    Route::post('/conversations/{id}/messages', [ChatwootMessageController::class, 'sendMessage']);
    Route::delete('/conversations/{id}/messages/{messageId}', [ChatwootMessageController::class, 'deleteMessage']);

    // --- Deduplicación ---
    Route::get('/duplicates/diagnosis', [ChatwootConversationController::class, 'getDuplicatesDiagnosis']);
    Route::post('/duplicates/merge', [ChatwootConversationController::class, 'forceMergeDuplicates']);

    // --- Asignación y estado ---
    Route::post('/conversations/{id}/assignments', [ChatwootController::class, 'assignConversation']);
    Route::post('/conversations/{id}/status', [ChatwootController::class, 'changeConversationStatus']);
    Route::post('/conversations/{id}/labels', [ChatwootController::class, 'updateConversationLabels']);
    Route::get('/conversations/{id}/labels', [ChatwootController::class, 'getConversationLabels']);
    Route::post('/conversations/{id}/priority', [ChatwootController::class, 'updateConversationPriority']);

    // --- Equipos ---
    Route::get('/teams', [ChatwootTeamController::class, 'getTeams']);
    Route::get('/teams/{teamId}', [ChatwootTeamController::class, 'getTeam']);
    Route::post('/teams', [ChatwootTeamController::class, 'createTeam']);
    Route::patch('/teams/{teamId}', [ChatwootTeamController::class, 'updateTeam']);
    Route::delete('/teams/{teamId}', [ChatwootTeamController::class, 'deleteTeam']);
    Route::get('/teams/{teamId}/members', [ChatwootTeamController::class, 'getTeamMembers']);
    Route::post('/teams/{teamId}/members', [ChatwootTeamController::class, 'addTeamMembers']);
    Route::patch('/teams/{teamId}/members', [ChatwootTeamController::class, 'updateTeamMembers']);
    Route::delete('/teams/{teamId}/members', [ChatwootTeamController::class, 'removeTeamMember']);

    // --- Etiquetas ---
    Route::get('/labels', [ChatwootController::class, 'getLabels']);
    Route::post('/labels', [ChatwootController::class, 'createLabel']);
    Route::delete('/labels/{id}', [ChatwootController::class, 'deleteLabel']);

    // --- Respuestas rápidas (Canned Responses) ---
    Route::get('/canned-responses', [ChatwootController::class, 'getCannedResponses']);
    Route::post('/canned-responses', [ChatwootController::class, 'createCannedResponse']);
    Route::delete('/canned-responses/{id}', [ChatwootController::class, 'deleteCannedResponse']);

    // --- Notas de contacto ---
    Route::get('/contacts/{contactId}/notes', [ChatwootController::class, 'getContactNotes']);
    Route::post('/contacts/{contactId}/notes', [ChatwootController::class, 'createContactNote']);
    Route::delete('/contacts/{contactId}/notes/{noteId}', [ChatwootController::class, 'deleteContactNote']);

    // --- Agentes ---
    Route::get('/agents', [ChatwootController::class, 'getAgents']);

    // --- Dashboard stats ---
    Route::get('/dashboard-stats', [ChatwootController::class, 'getDashboardStats']);

    // --- Contactos ---
    Route::put('/contacts/{contactId}', [ChatwootController::class, 'updateContact']);

    // --- Config ---
    Route::get('/config', [ChatwootController::class, 'getConfig']);

    // --- Miembros de empresa ---
    Route::get('/members', [MembersController::class, 'index']);
    Route::patch('/members/{id}', [MembersController::class, 'update']);
    Route::delete('/members/{id}', [MembersController::class, 'destroy']);

    // --- Invitaciones de equipo ---
    Route::get('/invitations', [TeamInvitationController::class, 'index']);
    Route::post('/invitations', [TeamInvitationController::class, 'store']);
    Route::post('/invitations/{id}/resend', [TeamInvitationController::class, 'resend']);
    Route::delete('/invitations/{id}', [TeamInvitationController::class, 'cancel']);
    Route::post('/invitations/sync-chatwoot', [TeamInvitationController::class, 'syncUsersWithChatwoot']);

});

// ============================================================================
// 7. CONOCIMIENTOS / RAG (auth via web + RailwayAuthToken)
// ============================================================================
Route::middleware(['web', 'railway.auth:true'])->group(function () {

    // Perfil de empresa / onboarding data
    Route::get('/onboarding-data', [CompanyProfileController::class, 'getOnboardingData']);
    Route::put('/onboarding-data', [CompanyProfileController::class, 'updateOnboardingData']);
    Route::post('/company/logo', [CompanyProfileController::class, 'uploadCompanyLogo']);
    Route::get('/google-search', [CompanyProfileController::class, 'googleSearch']);

    // Bot config (n8n)
    Route::get('/bot-config', [BotConfigController::class, 'index']);
    Route::put('/bot-config', [BotConfigController::class, 'update']);

    // Training chat
    Route::post('/training/chat', [TrainingChatController::class, 'trainingChat']);

    // Documents (RAG)
    Route::get('/documents', [DocumentController::class, 'getDocuments']);
    Route::post('/documents/metadata', [DocumentController::class, 'storeDocumentMetadata']);
    Route::delete('/documents/{id}', [DocumentController::class, 'deleteDocument']);
    Route::post('/documents/update-vector-ids', [DocumentController::class, 'updateVectorIds']);
    Route::post('/documents/process-rag', [DocumentController::class, 'proxyToN8n']);
    Route::post('/documents/reset-workflow', [DocumentController::class, 'resetWorkflow']);

    // Qdrant points
    Route::get('/qdrant/points', [QdrantPointController::class, 'getQdrantPoints']);
    Route::get('/qdrant/points/{pointId}', [QdrantPointController::class, 'getQdrantPoint']);
    Route::put('/qdrant/points/{pointId}', [QdrantPointController::class, 'updateQdrantPoint']);
    Route::delete('/qdrant/points/{pointId}', [QdrantPointController::class, 'deleteQdrantPoint']);
    Route::delete('/qdrant/points', [QdrantPointController::class, 'deleteQdrantPoints']);
});

// ============================================================================
// 8. COMPANY SETTINGS (timezone, etc.)
// ============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->group(function () {
    Route::get('/company/settings', [CompanySettingsController::class, 'getSettings']);
    Route::put('/company/settings', [CompanySettingsController::class, 'updateSettings']);
});

// ============================================================================
// 9. EVOLUTION API (WhatsApp multi-tenant)
// ============================================================================
Route::middleware(['railway.auth:true'])->prefix('evolution-whatsapp')->group(function () {
    Route::post('/create', [EvolutionApiController::class, 'createInstance']);
    Route::get('/instances', [EvolutionApiController::class, 'listInstances']);
    Route::post('/connect/{instanceName?}', [EvolutionApiController::class, 'connect']);
    Route::get('/status/{instanceName?}', [EvolutionApiController::class, 'getStatus']);
    Route::post('/disconnect/{instanceName?}', [EvolutionApiController::class, 'disconnect']);
    Route::delete('/instance/{instanceName?}', [EvolutionApiController::class, 'deleteInstance']);
    Route::post('/send-message/{instanceName?}', [EvolutionApiController::class, 'sendMessage']);
    Route::post('/chatwoot/{instanceName?}', [EvolutionApiController::class, 'setChatwoot']);
    Route::get('/settings/{instanceName?}', [EvolutionApiController::class, 'getSettings']);
    Route::post('/settings/{instanceName?}', [EvolutionApiController::class, 'updateSettings']);
    Route::post('/sync-inbox/{instanceName?}', [EvolutionApiController::class, 'syncChatwootInbox']);
});

// ============================================================================
// 10. N8N WORKFLOW MANAGEMENT (auth:sanctum)
// ============================================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/workflows/create-for-company', [N8nWorkflowController::class, 'createWorkflowForCompany']);
    Route::post('/workflows/create-training', [N8nWorkflowController::class, 'createTrainingWorkflow']);
    Route::get('/workflows/company-list', [N8nWorkflowController::class, 'listCompanyWorkflows']);
    Route::get('/workflows/company/{companyId}', [N8nWorkflowController::class, 'getCompanyWorkflow']);
    Route::delete('/workflows/company/{companyId}', [N8nWorkflowController::class, 'deleteCompanyWorkflow']);
    Route::post('/workflows/company/{companyId}/toggle', [N8nWorkflowController::class, 'toggleWorkflow']);
});

// ============================================================================
// 11. ADMIN TOOLS (auth:sanctum)
// ============================================================================
Route::middleware(['auth:sanctum'])->group(function () {
    // Workflow management
    Route::post('/setup-training-workflow/{companySlug}', [AdminToolsController::class, 'setupTrainingWorkflow']);
    Route::post('/regenerate-chatwoot-token/{userId}', [AdminToolsController::class, 'regenerateChatwootToken']);
    Route::post('/update-rag-workflow/{companySlug}', [AdminToolsController::class, 'updateRagWorkflow']);
    Route::post('/update-all-rag-workflows', [AdminToolsController::class, 'updateAllRagWorkflows']);
    Route::post('/reset-workflow/{instanceName}', [AdminToolsController::class, 'resetWorkflow']);
    Route::post('/update-workflow/{instanceName}', [AdminToolsController::class, 'updateWorkflow']);
    Route::post('/clear-all-cache', [AdminToolsController::class, 'clearAllCache']);
    Route::post('/activate-workflow/{workflowId}', [AdminToolsController::class, 'activateWorkflow']);
    Route::post('/create-minimal-workflow/{instanceName}', [AdminToolsController::class, 'createMinimalWorkflow']);
    Route::post('/patch-all-bot-workflows', [AdminToolsController::class, 'patchAllBotWorkflows']);
    Route::post('/patch-bot-strict-rag', [AdminToolsController::class, 'patchBotStrictRag']);

    // Qdrant
    Route::post('/admin/recreate-qdrant/{companySlug}', [AdminToolsController::class, 'recreateQdrant']);

    // Phone block
    Route::delete('/unblock-phone/{phone}', [AdminToolsController::class, 'unblockPhone']);
    Route::get('/check-phone-block/{phone}', [AdminToolsController::class, 'checkPhoneBlock']);

    // Diagnostics
    Route::get('/raw-inbox-check', [AdminToolsController::class, 'rawInboxCheck']);
    Route::get('/evolution/chatwoot-config/{instanceName}', [AdminToolsController::class, 'evolutionChatwootConfig']);
    Route::post('/evolution/reconfigure-chatwoot/{instanceName}', [AdminToolsController::class, 'reconfigureEvolutionChatwoot']);

    // Company/instance updates
    Route::post('/update/company-assistant/{companyId}', [AdminToolsController::class, 'updateCompanyAssistant']);
    Route::post('/update/whatsapp-instance-url/{instanceName}', [AdminToolsController::class, 'updateWhatsappInstanceUrl']);
    Route::post('/update/company-evolution-url/{companyId}', [AdminToolsController::class, 'updateCompanyEvolutionUrl']);
    Route::post('/update/company-chatwoot/{companyId}', [AdminToolsController::class, 'updateCompanyChatwoot']);

    // Repair & webhooks
    Route::post('/repair-instance/{instanceName}', [AdminToolsController::class, 'repairInstance']);
    Route::get('/list-chatwoot-webhooks', [AdminToolsController::class, 'listChatwootWebhooks']);
    Route::post('/migrate-chatwoot-webhooks', [AdminToolsController::class, 'migrateChatwootWebhooks']);
    Route::get('/chatwoot-debug', [AdminToolsController::class, 'chatwootDebug']);

    // Conversation memory management
    Route::post('/flush-conversation-memory/{companySlug}', [AdminToolsController::class, 'flushConversationMemory']);
    Route::get('/conversation-memory-diagnostics/{companySlug}', [AdminToolsController::class, 'conversationMemoryDiagnostics']);

    // Admin invitation diagnostics
    Route::get('/admin/diagnostic-agents', [TeamInvitationController::class, 'diagnosticAgents']);
    Route::post('/admin/fix-company-chatwoot', [TeamInvitationController::class, 'fixCompanyChatwoot']);
    Route::post('/admin/fix-user-role', [TeamInvitationController::class, 'fixUserRole']);
    Route::post('/admin/provision-company-chatwoot', [TeamInvitationController::class, 'provisionCompanyChatwoot']);
});

// ============================================================================
// 12. DEBUG (auth:sanctum)
// ============================================================================
Route::middleware(['auth:sanctum'])->prefix('debug')->group(function () {
    Route::get('/bot-state/{phone}', [DebugController::class, 'getBotState']);
    Route::delete('/bot-state/{phone}', [DebugController::class, 'deleteBotState']);
    Route::post('/bot-state/{phone}', [DebugController::class, 'setBotState']);
    Route::get('/bot-config', [DebugController::class, 'getBotConfig']);
});

// ============================================================================
// DEBUG ROUTES (local + staging con X-Debug-Key)
// ============================================================================
if (app()->environment('local', 'staging')) {
    require __DIR__ . '/debug.php';
}

