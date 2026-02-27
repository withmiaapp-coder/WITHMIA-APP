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
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\CalendlyController;
use App\Http\Controllers\Api\OutlookCalendarController;
use App\Http\Controllers\Api\ReservoController;
use App\Http\Controllers\Api\AgendaProController;
use App\Http\Controllers\Api\DentalinkController;
use App\Http\Controllers\Api\MedilinkController;
use App\Http\Controllers\Api\CalendarHubController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductIntegrationController;
use App\Http\Controllers\Api\ProductHubController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SupportTicketController;
use App\Http\Controllers\Api\ClientPortalController;
use App\Http\Controllers\Api\WebsiteBookingController;

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
// DIAGNOSTIC: Product tables check (temporary — remove once issue resolved)
// ============================================================================
Route::get('/diag/products', function () {
    $result = ['timestamp' => now()->toIso8601String()];
    try {
        $result['db'] = 'connected';
        $result['products_table'] = \Illuminate\Support\Facades\Schema::hasTable('products');
        $result['product_integrations_table'] = \Illuminate\Support\Facades\Schema::hasTable('product_integrations');
        if ($result['products_table']) {
            $result['products_count'] = DB::table('products')->count();
        }
        if ($result['product_integrations_table']) {
            $result['integrations_count'] = DB::table('product_integrations')->count();
        }
        // Test the exact controller path
        $result['controller_exists'] = class_exists(\App\Http\Controllers\Api\ProductIntegrationController::class);
        $result['model_product'] = class_exists(\App\Models\Product::class);
        $result['model_integration'] = class_exists(\App\Models\ProductIntegration::class);
    } catch (\Throwable $e) {
        $result['error'] = $e->getMessage();
        $result['error_class'] = get_class($e);
        $result['error_file'] = $e->getFile() . ':' . $e->getLine();
    }
    return response()->json($result);
});

// ============================================================================
// 2. ONBOARDING API (throttled, sin auth)
// ============================================================================
Route::post('/onboarding', [OnboardingApiController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('api.onboarding.store');

// ============================================================================
// 2b. SUPPORT TICKETS (público, throttled, sin auth)
// ============================================================================
Route::post('/support-tickets', [SupportTicketController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('api.support-tickets.store');

// ============================================================================
// 2c. CLIENT PORTAL (público, throttled, sin auth)
// ============================================================================
Route::post('/client-portal', [ClientPortalController::class, 'index'])
    ->middleware('throttle:15,1')
    ->name('api.client-portal');

// ============================================================================
// 2d. WEBSITE BOOKING (público, throttled, sin auth)
// ============================================================================
Route::post('/website/booking', [WebsiteBookingController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('api.website-booking.store');

Route::get('/website/booking/busy', [WebsiteBookingController::class, 'busy'])
    ->middleware('throttle:30,1')
    ->name('api.website-booking.busy');

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
    Route::post('/n8n/fix-owner-roles', [AdminToolsController::class, 'fixOwnerRoles']);
});

// ============================================================================
// 4. INVITACIONES PÚBLICAS (throttled, sin auth)
// ============================================================================
Route::middleware('throttle:20,1')->prefix('invitation')->group(function () {
    Route::get('/validate/{token}', [TeamInvitationController::class, 'validateToken']);
    // Password-based accept removed: only Google Sign-In is supported
});

// ============================================================================
// 5. USUARIO AUTENTICADO (sesión web)
// ============================================================================
Route::middleware(['web', 'auth'])->prefix('user')->group(function () {
    Route::get('/profile', [UserController::class, 'profile']);
    Route::put('/profile', [UserController::class, 'updateProfile']);
    Route::post('/avatar', [UserController::class, 'uploadAvatar']);
    Route::post('/cover', [UserController::class, 'uploadCover']);
});

// ============================================================================
// 5b. SUBSCRIPTION / BILLING (sesión web)
// ============================================================================
Route::middleware(['web', 'auth'])->prefix('subscription')->group(function () {
    Route::get('/', [SubscriptionController::class, 'index']);
    Route::post('/checkout', [SubscriptionController::class, 'checkout']);
    Route::get('/callback', [SubscriptionController::class, 'callback']);
    Route::post('/portal', [SubscriptionController::class, 'portal']);
    Route::post('/referral', [SubscriptionController::class, 'applyReferral']);
});

// dLocal GO Webhook (external callback — throttled)
Route::post('/webhooks/dlocal', [SubscriptionController::class, 'webhook'])
    ->middleware('throttle:30,1');

// ============================================================================
// 5c. SUPPORT TICKETS — authenticated client (sesión web)
// ============================================================================
Route::middleware(['web', 'auth'])->prefix('my-tickets')->group(function () {
    Route::get('/', [SupportTicketController::class, 'myTickets']);
    Route::post('/', [SupportTicketController::class, 'storeAuthenticated']);
    Route::get('/{id}', [SupportTicketController::class, 'show']);
    Route::post('/{id}/reply', [SupportTicketController::class, 'reply']);
});

Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->group(function () {
    Route::get('/user/permissions', [UserController::class, 'permissions']);
    Route::get('/user/has-permission/{permission}', [UserController::class, 'hasPermission']);
});

// ============================================================================
// 6a. CHATWOOT PROXY - Attachment (signed URL to prevent enumeration)
// ============================================================================
Route::prefix('chatwoot-proxy')->group(function () {
    Route::get('/attachment/{attachmentId}', [ChatwootConversationController::class, 'proxyAttachment'])
        ->name('chatwoot.attachment')
        ->middleware('signed');
});

// 6b. CHATWOOT PROXY (auth via RailwayAuthToken)
// ============================================================================
Route::middleware([\App\Http\Middleware\RailwayAuthToken::class . ':true'])->prefix('chatwoot-proxy')->group(function () {
    // --- Ping: verify auth/middleware (local + staging only) ---
    if (app()->environment('local', 'staging')) {
        Route::get('/ping', function () {
            return response()->json([
                'pong' => true,
                'user' => auth()->id(),
                'timestamp' => now()->toIso8601String(),
            ]);
        });
    }
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

    // --- Daily inspirational quote: moved to standalone /api/daily-quote below ---

    // --- Communication Channels: moved to standalone /api/channels/ group below ---

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

// Daily inspirational quote (standalone, auth via RailwayAuthToken)
Route::middleware([\App\Http\Middleware\RailwayAuthToken::class])->group(function () {
    Route::get('/daily-quote', \App\Http\Controllers\Api\DailyQuoteController::class);
});

// ============================================================================
// 6c. COMMUNICATION CHANNELS + OAUTH (auth via RailwayAuthToken)
// ============================================================================
Route::middleware([\App\Http\Middleware\RailwayAuthToken::class . ':true'])->prefix('channels')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\ChatwootChannelController::class, 'index']);
    Route::post('/web-widget', [\App\Http\Controllers\Api\ChatwootChannelController::class, 'createWebWidget']);
    Route::post('/email', [\App\Http\Controllers\Api\ChatwootChannelController::class, 'createEmail']);
    Route::post('/facebook-messenger', [\App\Http\Controllers\Api\ChatwootChannelController::class, 'createFacebookMessenger']);
    Route::post('/instagram', [\App\Http\Controllers\Api\ChatwootChannelController::class, 'createInstagram']);
    Route::post('/whatsapp-cloud', [\App\Http\Controllers\Api\ChatwootChannelController::class, 'createWhatsAppCloud']);
    Route::get('/{inboxId}/widget-script', [\App\Http\Controllers\Api\ChatwootChannelController::class, 'getWidgetScript']);
    Route::delete('/{inboxId}', [\App\Http\Controllers\Api\ChatwootChannelController::class, 'destroy']);

    // OAuth: Get auth URL for popup (Messenger, Instagram, WhatsApp Cloud)
    Route::get('/oauth/{channel}/auth-url', [\App\Http\Controllers\Api\ChannelOAuthController::class, 'getAuthUrl'])
        ->where('channel', 'messenger|instagram|whatsapp-cloud');
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
// 8b. CALENDAR / GOOGLE CALENDAR INTEGRATION
// ============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->prefix('calendar')->group(function () {
    // OAuth flow
    Route::get('/google/auth-url', [CalendarController::class, 'getAuthUrl']);
    Route::post('/google/callback', [CalendarController::class, 'handleCallback']);
    Route::post('/google/disconnect', [CalendarController::class, 'disconnect']);

    // Integration status & settings
    Route::get('/status', [CalendarController::class, 'status']);
    Route::put('/settings', [CalendarController::class, 'updateSettings']);

    // Calendar data
    Route::get('/calendars', [CalendarController::class, 'listCalendars']);
    Route::get('/events', [CalendarController::class, 'getEvents']);
    Route::post('/events', [CalendarController::class, 'createEvent']);
    Route::delete('/events/{eventId}', [CalendarController::class, 'deleteEvent']);
});

// Calendar Bot Access (para n8n workflows - auth via n8n secret)
Route::middleware('n8n.secret')->prefix('calendar/bot')->group(function () {
    Route::get('/availability', [CalendarController::class, 'botGetAvailability']);
    Route::post('/create-event', [CalendarController::class, 'botCreateEvent']);
});

// Calendar Hub — Endpoint UNIFICADO para n8n (consulta TODOS los calendarios conectados)
Route::middleware('n8n.secret')->prefix('calendar-hub/bot')->group(function () {
    Route::get('/availability', [CalendarHubController::class, 'botGetAvailability']);
    Route::post('/create-event', [CalendarHubController::class, 'botCreateEvent']);
});

// ============================================================================
// PRODUCTS — CRUD + Integrations
// ============================================================================
Route::middleware([\App\Http\Middleware\RailwayAuthToken::class])->prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'index']);
    Route::post('/', [ProductController::class, 'store']);
    Route::get('/categories', [ProductController::class, 'categories']);
    Route::get('/{id}', [ProductController::class, 'show']);
    Route::put('/{id}', [ProductController::class, 'update']);
    Route::delete('/{id}', [ProductController::class, 'destroy']);
    Route::post('/bulk-delete', [ProductController::class, 'bulkDelete']);
    Route::post('/upload-image', [ProductController::class, 'uploadImage']);
});

Route::middleware([\App\Http\Middleware\RailwayAuthToken::class])->prefix('product-integrations')->group(function () {
    Route::get('/status', [ProductIntegrationController::class, 'status']);
    Route::post('/connect', [ProductIntegrationController::class, 'connect']);
    Route::post('/disconnect', [ProductIntegrationController::class, 'disconnect']);
    Route::post('/toggle-bot-access', [ProductIntegrationController::class, 'toggleBotAccess']);
    Route::post('/sync', [ProductIntegrationController::class, 'sync']);
});

// Sales — Dashboard endpoints (auth required)
Route::middleware([\App\Http\Middleware\RailwayAuthToken::class])->prefix('sales')->group(function () {
    Route::get('/stats', [SaleController::class, 'stats']);
    Route::get('/', [SaleController::class, 'index']);
    Route::patch('/{id}/status', [SaleController::class, 'updateStatus']);
});

// Product Hub — Endpoint para n8n bot (buscar productos)
Route::middleware('n8n.secret')->prefix('product-hub/bot')->group(function () {
    Route::get('/search', [ProductHubController::class, 'botSearch']);
    Route::get('/catalog', [ProductHubController::class, 'botCatalog']);
    Route::post('/generate-link', [ProductHubController::class, 'botGenerateLink']);
});

// Sales — Bot endpoints (protegidos por n8n secret)
Route::middleware('n8n.secret')->prefix('sales/bot')->group(function () {
    Route::post('/record', [SaleController::class, 'botRecord']);
    Route::patch('/update-status', [SaleController::class, 'botUpdateStatus']);
});

// Google OAuth GET callback (sin auth - Google redirige directamente aquí)
Route::get('/calendar/google/callback', [CalendarController::class, 'handleCallbackGet']);

// ============================================================================
// 8c. CALENDLY INTEGRATION
// ============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->prefix('calendly')->group(function () {
    Route::get('/auth-url', [CalendlyController::class, 'getAuthUrl']);
    Route::post('/disconnect', [CalendlyController::class, 'disconnect']);
    Route::get('/status', [CalendlyController::class, 'status']);
    Route::put('/settings', [CalendlyController::class, 'updateSettings']);
    Route::get('/event-types', [CalendlyController::class, 'listEventTypes']);
    Route::get('/events', [CalendlyController::class, 'getEvents']);
});
Route::get('/calendly/callback', [CalendlyController::class, 'handleCallbackGet']);
Route::middleware('n8n.secret')->prefix('calendly/bot')->group(function () {
    Route::get('/availability', [CalendlyController::class, 'botGetAvailability']);
});

// ============================================================================
// 8d. OUTLOOK CALENDAR INTEGRATION
// ============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->prefix('outlook')->group(function () {
    Route::get('/auth-url', [OutlookCalendarController::class, 'getAuthUrl']);
    Route::post('/disconnect', [OutlookCalendarController::class, 'disconnect']);
    Route::get('/status', [OutlookCalendarController::class, 'status']);
    Route::put('/settings', [OutlookCalendarController::class, 'updateSettings']);
    Route::get('/calendars', [OutlookCalendarController::class, 'listCalendars']);
    Route::get('/events', [OutlookCalendarController::class, 'getEvents']);
    Route::post('/events', [OutlookCalendarController::class, 'createEvent']);
    Route::delete('/events/{eventId}', [OutlookCalendarController::class, 'deleteEvent']);
});
Route::get('/outlook/callback', [OutlookCalendarController::class, 'handleCallbackGet']);
Route::middleware('n8n.secret')->prefix('outlook/bot')->group(function () {
    Route::get('/availability', [OutlookCalendarController::class, 'botGetAvailability']);
    Route::post('/create-event', [OutlookCalendarController::class, 'botCreateEvent']);
});

// ============================================================================
// 8e. RESERVO INTEGRATION
// ============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->prefix('reservo')->group(function () {
    Route::post('/connect', [ReservoController::class, 'connect']);
    Route::post('/disconnect', [ReservoController::class, 'disconnect']);
    Route::get('/status', [ReservoController::class, 'status']);
    Route::put('/settings', [ReservoController::class, 'updateSettings']);
    Route::get('/services', [ReservoController::class, 'listServices']);
    Route::get('/availability', [ReservoController::class, 'getAvailability']);
    Route::get('/bookings', [ReservoController::class, 'listBookings']);
    Route::post('/bookings', [ReservoController::class, 'createBooking']);
});
Route::middleware('n8n.secret')->prefix('reservo/bot')->group(function () {
    Route::get('/availability', [ReservoController::class, 'botGetAvailability']);
    Route::post('/create-booking', [ReservoController::class, 'botCreateBooking']);
});

// ============================================================================
// 8f. AGENDAPRO INTEGRATION
// ============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->prefix('agendapro')->group(function () {
    Route::post('/connect', [AgendaProController::class, 'connect']);
    Route::post('/disconnect', [AgendaProController::class, 'disconnect']);
    Route::get('/status', [AgendaProController::class, 'status']);
    Route::put('/settings', [AgendaProController::class, 'updateSettings']);
    Route::get('/locations', [AgendaProController::class, 'listLocations']);
    Route::get('/services', [AgendaProController::class, 'listServices']);
    Route::get('/availability', [AgendaProController::class, 'getAvailability']);
    Route::get('/bookings', [AgendaProController::class, 'listBookings']);
    Route::post('/bookings', [AgendaProController::class, 'createBooking']);
});
Route::middleware('n8n.secret')->prefix('agendapro/bot')->group(function () {
    Route::get('/availability', [AgendaProController::class, 'botGetAvailability']);
    Route::post('/create-booking', [AgendaProController::class, 'botCreateBooking']);
});

// ============================================================================
// 8g. DENTALINK INTEGRATION
// ============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->prefix('dentalink')->group(function () {
    Route::post('/connect', [DentalinkController::class, 'connect']);
    Route::post('/disconnect', [DentalinkController::class, 'disconnect']);
    Route::get('/status', [DentalinkController::class, 'status']);
    Route::put('/settings', [DentalinkController::class, 'updateSettings']);
    Route::get('/branches', [DentalinkController::class, 'listBranches']);
    Route::get('/dentists', [DentalinkController::class, 'listDentists']);
    Route::get('/treatments', [DentalinkController::class, 'listTreatments']);
    Route::get('/availability', [DentalinkController::class, 'getAvailability']);
    Route::get('/appointments', [DentalinkController::class, 'listAppointments']);
    Route::post('/appointments', [DentalinkController::class, 'createAppointment']);
});
Route::middleware('n8n.secret')->prefix('dentalink/bot')->group(function () {
    Route::get('/availability', [DentalinkController::class, 'botGetAvailability']);
    Route::post('/create-appointment', [DentalinkController::class, 'botCreateAppointment']);
});

// ============================================================================
// 8h. MEDILINK INTEGRATION
// ============================================================================
Route::middleware(['web', \App\Http\Middleware\RailwayAuthToken::class])->prefix('medilink')->group(function () {
    Route::post('/connect', [MedilinkController::class, 'connect']);
    Route::post('/disconnect', [MedilinkController::class, 'disconnect']);
    Route::get('/status', [MedilinkController::class, 'status']);
    Route::put('/settings', [MedilinkController::class, 'updateSettings']);
    Route::get('/branches', [MedilinkController::class, 'listBranches']);
    Route::get('/practitioners', [MedilinkController::class, 'listPractitioners']);
    Route::get('/specialties', [MedilinkController::class, 'listSpecialties']);
    Route::get('/availability', [MedilinkController::class, 'getAvailability']);
    Route::get('/appointments', [MedilinkController::class, 'listAppointments']);
    Route::post('/appointments', [MedilinkController::class, 'createAppointment']);
});
Route::middleware('n8n.secret')->prefix('medilink/bot')->group(function () {
    Route::get('/availability', [MedilinkController::class, 'botGetAvailability']);
    Route::post('/create-appointment', [MedilinkController::class, 'botCreateAppointment']);
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
Route::middleware(['auth:sanctum', 'throttle:30,1'])->group(function () {
    Route::post('/workflows/create-for-company', [N8nWorkflowController::class, 'createWorkflowForCompany']);
    Route::post('/workflows/create-training', [N8nWorkflowController::class, 'createTrainingWorkflow']);
    Route::get('/workflows/company-list', [N8nWorkflowController::class, 'listCompanyWorkflows']);
    Route::get('/workflows/company/{companyId}', [N8nWorkflowController::class, 'getCompanyWorkflow']);
    Route::delete('/workflows/company/{companyId}', [N8nWorkflowController::class, 'deleteCompanyWorkflow']);
    Route::post('/workflows/company/{companyId}/toggle', [N8nWorkflowController::class, 'toggleWorkflow']);
});

// ============================================================================
// 11. ADMIN TOOLS (auth:sanctum + rate limit)
// ============================================================================
Route::middleware(['auth:sanctum', 'throttle:20,1'])->group(function () {
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
// 12. DEBUG (auth:sanctum + rate limit)
// ============================================================================
Route::middleware(['auth:sanctum', 'throttle:10,1'])->prefix('debug')->group(function () {
    Route::get('/bot-state/{phone}', [DebugController::class, 'getBotState']);
    Route::delete('/bot-state/{phone}', [DebugController::class, 'deleteBotState']);
    Route::post('/bot-state/{phone}', [DebugController::class, 'setBotState']);
    Route::get('/bot-config', [DebugController::class, 'getBotConfig']);
});

// ============================================================================
// DEBUG ROUTES (local only with X-Debug-Key)
// ============================================================================
if (app()->environment('local')) {
    require __DIR__ . '/debug.php';
}

