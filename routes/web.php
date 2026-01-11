<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\OnboardingApiController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ContactsController;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

// Autenticación de canales de broadcasting
Broadcast::routes(['middleware' => ['web', 'auth']]);

// Ruta temporal para agregar columnas faltantes
Route::get('/fix-user-columns', function () {
    try {
        $columns = DB::select("SHOW COLUMNS FROM users LIKE 'full_name'");
        if (empty($columns)) {
            DB::statement('ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NULL AFTER name');
        }
        
        $columns = DB::select("SHOW COLUMNS FROM users LIKE 'phone'");
        if (empty($columns)) {
            DB::statement('ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER email');
        }
        
        $columns = DB::select("SHOW COLUMNS FROM users LIKE 'onboarding_step'");
        if (empty($columns)) {
            DB::statement('ALTER TABLE users ADD COLUMN onboarding_step INT DEFAULT 0 AFTER email_verified_at');
        }
        
        $columns = DB::select("SHOW COLUMNS FROM users LIKE 'onboarding_completed'");
        if (empty($columns)) {
            DB::statement('ALTER TABLE users ADD COLUMN onboarding_completed TINYINT(1) DEFAULT 0 AFTER onboarding_step');
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Todas las columnas verificadas y agregadas correctamente'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});


Route::get('/', function () {
    if (Auth::check()) {
        // Verificar si el usuario ha completado el onboarding
        $user = Auth::user();
        if ($user->company_slug) {
            // Usar el slug que ya tiene el usuario
            return redirect("/dashboard/{$user->company_slug}");
        }
        return redirect('/onboarding');
    }
    return redirect('/login');
});

// Login route - redirect if already authenticated
Route::get('/login', function () {
    if (Auth::check()) {
        return redirect('/onboarding');
    }
    return response()->file(public_path('login.html'));
})->name('login');

// Authentication routes (no middleware needed)
Route::post('/auth/google', [GoogleAuthController::class, 'authenticate'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('auth.google');

Route::get('/check-session', [GoogleAuthController::class, 'checkSession'])->name('auth.check');

Route::get('/logout', function () {
    try {
        // Borrar cookies localmente sin esperar al servidor
        Auth::guard('web')->logout();
        request()->session()->flush();
        request()->session()->regenerateToken();
    } catch (\Exception $e) {
        \Log::error('Logout error: ' . $e->getMessage());
    }
    
    // Redirigir inmediatamente sin esperar nada más
    return redirect('/login')->with('logout', true)->header('Cache-Control', 'no-cache, no-store, must-revalidate');
})->name('logout.get');

// Onboarding POST route - outside auth middleware to avoid CSRF issues
Route::post('/onboarding', [OnboardingController::class, 'store'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('onboarding.store');

// Improve description endpoint for onboarding
Route::post('/api/improve-description', [OnboardingApiController::class, 'improveDescription'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('onboarding.improve');

Route::middleware('auth')->group(function () {

    // Onboarding routes
    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding');


    // Dashboard routes - Sistema híbrido /dashboard/{company-slug}
    Route::get('/dashboard', [DashboardController::class, 'show'])->name('dashboard');
    Route::get('/dashboard/{companySlug}', [DashboardController::class, 'show'])
        ->where('companySlug', '(?!dashboard)[a-z0-9\-]+')
        ->name('dashboard.company');

    // Contacts Excel Dynamic System - Simple manual/N8N integration
    Route::prefix('contacts')->name('contacts.')->group(function () {
        Route::get('/excel/download', [ContactsController::class, 'downloadDynamicExcel'])
            ->name('excel.download');
        Route::get('/excel/stats', [ContactsController::class, 'getExcelStats'])
            ->name('excel.stats');
        Route::post('/excel/refresh', [ContactsController::class, 'refreshExcel'])
            ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
            ->name('excel.refresh');
        Route::delete('/excel/reset', [ContactsController::class, 'resetExcel'])
            ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
            ->name('excel.reset');
    });

});


require __DIR__.'/settings.php';
// Conversations routes
require __DIR__.'/auth.php';

// Ruta para Conversaciones (Chatwoot)
Route::middleware('auth')->group(function () {
Route::get('/dashboard/{company}/conversaciones', function (Request $request, $company) {
    $user = auth()->user();
    $company = $user->company()->where('slug', $company)->firstOrFail();

    return Inertia::render('Conversaciones', [
        'user' => $user,
        'company' => $company
    ]);
    })->name('dashboard.conversaciones');

    // NOTA: Las rutas de Equipo y Etiquetas ya no son necesarias
    // porque están integradas como embed dentro del Dashboard principal
    
    /*
    // Ruta para Equipo (Teams Management) - DESHABILITADA
    Route::get('/dashboard/{company}/equipo', function (Request $request, $company) {
        $user = auth()->user();
        $company = $user->company()->where('slug', $company)->firstOrFail();

        return Inertia::render('Equipo', [
            'user' => $user,
            'company' => $company
        ]);
    })->name('dashboard.equipo');

    // Ruta para Etiquetas (Labels Management) - DESHABILITADA
    Route::get('/dashboard/{company}/etiquetas', function (Request $request, $company) {
        $user = auth()->user();
        $company = $user->company()->where('slug', $company)->firstOrFail();

        return Inertia::render('Etiquetas', [
            'user' => $user,
            'company' => $company
        ]);
    })->name('dashboard.etiquetas');
    */
});

// Chatwoot API Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/api/chatwoot/stats', [App\Http\Controllers\ChatwootController::class, 'getDashboardStats']);
    Route::get('/api/chatwoot/conversations', [App\Http\Controllers\ChatwootController::class, 'getConversationsV2']);
    Route::get('/api/chatwoot/conversations/search', [App\Http\Controllers\ChatwootController::class, 'searchConversations']);
    Route::get('/api/chatwoot/contacts', [App\Http\Controllers\ChatwootController::class, 'getContacts']);
    // Rutas adicionales para funcionalidades completas de Chatwoot
    Route::get('/api/chatwoot/conversations/{id}/messages', [App\Http\Controllers\ChatwootController::class, 'getConversationMessages']);
    Route::post('/api/chatwoot/conversations', [App\Http\Controllers\ChatwootController::class, 'createConversation']);
    Route::post('/api/chatwoot/conversations/{id}/messages', [App\Http\Controllers\ChatwootController::class, 'sendMessage']);
});

// ============================================
// CHATWOOT ENTERPRISE ROUTES - ALL FEATURES
// ============================================

Route::middleware(['auth', 'verified'])->group(function () {
    
    // DASHBOARD ENTERPRISE
    Route::get('/api/chatwoot/enterprise/dashboard', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getEnterpriseDashboard']);
    
    // INBOXES MANAGEMENT
    Route::get('/api/chatwoot/inboxes', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getInboxes']);
    Route::post('/api/chatwoot/inboxes', [App\Http\Controllers\ChatwootEnterpriseController::class, 'createInbox']);
    
    // AGENTS MANAGEMENT  
    Route::get('/api/chatwoot/agents', [App\Http\Controllers\TempChatwootController::class, 'getAgents']);
    Route::post('/api/chatwoot/agents', [App\Http\Controllers\TempChatwootController::class, 'createAgent']);
    
    // TEAMS MANAGEMENT (Enterprise)
    Route::get('/api/chatwoot/teams', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getTeams']);
    Route::post('/api/chatwoot/teams', [App\Http\Controllers\ChatwootEnterpriseController::class, 'createTeam']);
    
    // LABELS MANAGEMENT (Enterprise)
    Route::get('/api/chatwoot/labels', [App\Http\Controllers\TempChatwootController::class, 'getLabels']);
    Route::post('/api/chatwoot/labels', [App\Http\Controllers\TempChatwootController::class, 'createLabel']);
    
    // MACROS MANAGEMENT (Enterprise)
    Route::get('/api/chatwoot/macros', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getMacros']);
    
    // AUTOMATION RULES (Enterprise)
    Route::get('/api/chatwoot/automation-rules', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getAutomationRules']);
    
    // WEBHOOKS MANAGEMENT (Enterprise)
    Route::get('/api/chatwoot/webhooks', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getWebhooks']);
    Route::post('/api/chatwoot/webhooks', [App\Http\Controllers\ChatwootEnterpriseController::class, 'createWebhook']);
    
});
// ============================================================================
// CHATWOOT MULTI-TENANT ENTERPRISE ROUTES
// ============================================================================


// ============================================================================
// CHATWOOT MULTI-TENANT ENTERPRISE ROUTES
// ============================================================================
Route::middleware(['auth', 'verified'])->prefix('chatwoot/enterprise')->group(function () {
    Route::post('provision', [App\Http\Controllers\ChatwootEnterpriseController::class, 'provisionAccount'])
        ->name('chatwoot.enterprise.provision');
    Route::get('configuration', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getConfiguration'])
        ->name('chatwoot.enterprise.configuration');
    Route::get('dashboard', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getEnterpriseDashboard'])
        ->name('chatwoot.enterprise.dashboard');
    Route::post('invite-agent', [App\Http\Controllers\ChatwootEnterpriseController::class, 'inviteAgent'])
        ->name('chatwoot.enterprise.invite');
    Route::get('status', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getProvisioningStatus'])
        ->name('chatwoot.enterprise.status');
    Route::post('bulk-provision', [App\Http\Controllers\ChatwootEnterpriseController::class, 'bulkProvision'])
        ->name('chatwoot.enterprise.bulk');
    Route::get('invitations', [App\Http\Controllers\ChatwootEnterpriseController::class, 'getInvitations'])
        ->name('chatwoot.enterprise.invitations.index');
    Route::delete('invitations/{invitation}', [App\Http\Controllers\ChatwootEnterpriseController::class, 'cancelInvitation'])
        ->name('chatwoot.enterprise.invitations.cancel');});

// Route for Enterprise Multi-Tenant View


// Route for Enterprise Multi-Tenant View
Route::middleware(['auth', 'verified'])->get('/chatwoot/enterprise', function () {
    return view('chatwoot.enterprise');
})->name('chatwoot.enterprise.view');


// WhatsApp Integration Routes
Route::middleware(['auth', 'verified'])->prefix('whatsapp')->group(function () {
});
