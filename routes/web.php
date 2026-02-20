<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ContactsController;
use App\Http\Controllers\AttachmentProxyController;
use App\Http\Controllers\ImageProxyController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ChatwootEnterpriseController;
use App\Http\Controllers\Api\ChannelOAuthController;

// ============================================================================
// 1. PROXIES (sin auth, máxima prioridad, rate-limited)
// ============================================================================
Route::get('/img-proxy', [ImageProxyController::class, 'proxy'])
    ->middleware('throttle:120,1')
    ->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);

// ============================================================================
// 2. BROADCASTING
// ============================================================================
Broadcast::routes(['middleware' => ['web', 'railway.auth']]);

// ============================================================================
// 3. AUTENTICACIÓN (Google OAuth, sesión, logout)
// ============================================================================
Route::get('/', function () {
    if (Auth::check()) {
        $user = Auth::user();
        if ($user->company_slug) {
            return view('transition', ['redirect' => "/dashboard/{$user->company_slug}"]);
        }
        return view('transition', ['redirect' => '/onboarding']);
    }
    return response()->file(public_path('login.html'));
});

Route::get('/login', function () {
    if (Auth::check()) {
        return view('transition', ['redirect' => '/onboarding']);
    }
    return response()->file(public_path('login.html'));
})->name('login');

Route::post('/auth/google', [GoogleAuthController::class, 'authenticate'])
    ->middleware('throttle:10,1')
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('auth.google');

Route::post('/auth/google/invitation', [GoogleAuthController::class, 'authenticateWithInvitation'])
    ->middleware('throttle:10,1')
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('auth.google.invitation');

Route::get('/check-session', [GoogleAuthController::class, 'checkSession'])->name('auth.check');

Route::get('/logout', function () {
    try {
        Auth::guard('web')->logout();
        if (request()->hasSession()) {
            request()->session()->invalidate();
            request()->session()->regenerateToken();
        }
    } catch (\Throwable $e) {
        Log::error('Logout error: ' . $e->getMessage());
    }
    return redirect('/login');
})->name('logout.get');

// ============================================================================
// 4. TRANSICIONES Y CARGA
// ============================================================================
Route::get('/transition-login', function () {
    return view('transition', ['redirect' => '/login']);
})->name('transition.login');

Route::get('/transition-to-onboarding', function () {
    if (!Auth::check()) {
        Log::error('transition-to-onboarding: User not authenticated after login!');
        return response()->file(public_path('login.html'));
    }
    return view('transition', ['redirect' => '/onboarding']);
})->name('transition.onboarding');

Route::get('/auth-loading', function (Request $request) {
    $redirect = $request->query('redirect', '/login');
    return view('auth-loading', ['redirect' => $redirect]);
})->name('auth.loading');

// ============================================================================
// 5. INVITACIONES (público, sin auth)
// ============================================================================
Route::get('/invitation/accept/{token}', function ($token) {
    return Inertia::render('AcceptInvitation', ['token' => $token]);
})->name('invitation.accept');

// ============================================================================
// 5b. OAUTH CALLBACK (público — Facebook/Instagram redirige aquí)
// ============================================================================
Route::get('/channels/oauth/callback', [ChannelOAuthController::class, 'callback'])
    ->name('channels.oauth.callback');

// ============================================================================
// 5c. META / FACEBOOK — legal pages required for app review
// ============================================================================
Route::get('/privacy', fn () => view('legal.privacy'))->name('privacy');
Route::get('/terms', fn () => view('legal.terms'))->name('terms');
Route::get('/data-deletion', fn () => view('legal.data-deletion'))->name('data-deletion');
Route::post('/data-deletion', function (Request $request) {
    // Facebook sends signed_request for data deletion callback
    Log::info('Data deletion request received', $request->all());
    return response()->json([
        'url' => url('/data-deletion'),
        'confirmation_code' => \Illuminate\Support\Str::uuid()->toString(),
    ]);
})->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);

// ============================================================================
// 6. ONBOARDING
// ============================================================================
Route::post('/onboarding', [OnboardingController::class, 'store'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('onboarding.store');

Route::post('/api/improve-description', [OnboardingController::class, 'improveDescription'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('onboarding.improve');

Route::get('/onboarding', function (Request $request) {
    if (!Auth::check()) {
        return response()->file(public_path('login.html'));
    }
    $user = Auth::user();
    if ($user->company_slug && $user->onboarding_completed) {
        $url = route('dashboard.company', ['companySlug' => $user->company_slug]);
        if ($authToken = $request->query('auth_token')) {
            $url .= '?auth_token=' . $authToken;
        }
        return redirect($url);
    }
    return app(OnboardingController::class)->show($request);
})->name('onboarding');

// ============================================================================
// 7. DASHBOARD + RUTAS AUTENTICADAS PRINCIPALES
// ============================================================================
Route::middleware(['railway.auth', 'auth', 'auth.clean'])->group(function () {

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'show'])->name('dashboard');
    Route::get('/dashboard/{companySlug}', [DashboardController::class, 'show'])
        ->where('companySlug', '(?!dashboard)[a-z0-9\-]+')
        ->name('dashboard.company');

    // Conversaciones (Chatwoot)
    Route::get('/dashboard/{company}/conversaciones', function (Request $request, $company) {
        $user = auth()->user();
        $companyModel = $user->company()->where('slug', $company)->firstOrFail();
        return Inertia::render('Conversaciones', [
            'user' => $user,
            'company' => $companyModel,
            'chatwoot' => [
                'url' => config('chatwoot.url', ''),
                'inbox_id' => $user->chatwoot_inbox_id ?? $companyModel->chatwoot_inbox_id ?? 1,
                'account_id' => $companyModel->chatwoot_account_id ?? null,
            ]
        ]);
    })->name('dashboard.conversaciones');

    // Contacts Excel
    Route::prefix('contacts')->name('contacts.')->group(function () {
        Route::get('/excel/download', [ContactsController::class, 'downloadDynamicExcel'])->name('excel.download');
        Route::get('/excel/stats', [ContactsController::class, 'getExcelStats'])->name('excel.stats');
        Route::post('/excel/refresh', [ContactsController::class, 'refreshExcel'])
            ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
            ->name('excel.refresh');
        Route::delete('/excel/reset', [ContactsController::class, 'resetExcel'])
            ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
            ->name('excel.reset');
    });
});

// ============================================================================
// 8. SETTINGS
// ============================================================================
require __DIR__.'/settings.php';

// ============================================================================
// 9. CHATWOOT ENTERPRISE (admin)
// ============================================================================
Route::middleware(['auth', 'verified'])->prefix('chatwoot/enterprise')->group(function () {
    Route::post('provision', [ChatwootEnterpriseController::class, 'provisionAccount'])->name('chatwoot.enterprise.provision');
    Route::get('configuration', [ChatwootEnterpriseController::class, 'getConfiguration'])->name('chatwoot.enterprise.configuration');
    Route::get('dashboard', [ChatwootEnterpriseController::class, 'getEnterpriseDashboard'])->name('chatwoot.enterprise.dashboard');
    Route::post('invite-agent', [ChatwootEnterpriseController::class, 'inviteAgent'])->name('chatwoot.enterprise.invite');
    Route::post('bulk-provision', [ChatwootEnterpriseController::class, 'bulkProvision'])->name('chatwoot.enterprise.bulk');
    Route::get('invitations', [ChatwootEnterpriseController::class, 'getInvitations'])->name('chatwoot.enterprise.invitations.index');
    Route::delete('invitations/{invitation}', [ChatwootEnterpriseController::class, 'cancelInvitation'])->name('chatwoot.enterprise.invitations.cancel');
});

Route::middleware(['auth', 'verified'])->get('/chatwoot/enterprise', function () {
    return view('chatwoot.enterprise');
})->name('chatwoot.enterprise.view');

// ============================================================================
// 10. ADMIN PANEL
// ============================================================================
Route::middleware(['auth'])->prefix('admin')->group(function () {
    // Pages
    Route::get('/dashboard', [AdminController::class, 'dashboard'])->name('admin.dashboard');
    Route::get('/users', [AdminController::class, 'users'])->name('admin.users');
    Route::get('/companies', [AdminController::class, 'companies'])->name('admin.companies');

    // API
    Route::get('/api/users', [AdminController::class, 'apiUsers'])->name('admin.api.users');
    Route::get('/api/companies', [AdminController::class, 'apiCompanies'])->name('admin.api.companies');
    Route::patch('/api/users/{id}/role', [AdminController::class, 'updateUserRole'])->name('admin.api.users.role');
    Route::delete('/api/users/{id}', [AdminController::class, 'deleteUser'])->name('admin.api.users.delete');
    Route::get('/api/stats', [AdminController::class, 'stats'])->name('admin.api.stats');
    Route::get('/api/health', [AdminController::class, 'health'])->name('admin.api.health');
    Route::post('/api/repair-qdrant', [AdminController::class, 'repairQdrantCollections'])->name('admin.api.repair-qdrant');
});

// ============================================================================
// TEST (solo local)
// ============================================================================
if (app()->environment('local')) {
    Route::get('/test-route', fn() => response()->json(['status' => 'ok', 'time' => now()->toISOString()]));
}
