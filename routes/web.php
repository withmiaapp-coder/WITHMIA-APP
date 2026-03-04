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

// Serve user-uploaded media (avatars, covers) from database
Route::get('/user-media/{userId}/{type}', function (int $userId, string $type) {
    if (!in_array($type, ['avatar', 'cover'])) {
        abort(404);
    }

    $media = \Illuminate\Support\Facades\DB::table('user_media')
        ->where('user_id', $userId)
        ->where('type', $type)
        ->first();

    if (!$media || !$media->data) {
        abort(404);
    }

    $data = $media->data;
    // PostgreSQL bytea: PDO may return as resource stream
    if (is_resource($data)) {
        $data = stream_get_contents($data);
    }

    return response($data, 200, [
        'Content-Type' => $media->mime_type,
        'Content-Length' => $media->size,
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->where('userId', '[0-9]+')
  ->where('type', 'avatar|cover')
  ->middleware('throttle:300,1')
  ->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);

// Fallback for old /storage/ and /uploads/ URLs (redirect to 404 gracefully)
Route::get('/storage/{path}', function () { abort(404); })->where('path', '.*');
Route::get('/uploads/{path}', function () { abort(404); })->where('path', '.*');

// ============================================================================
// 2. BROADCASTING
// ============================================================================
Broadcast::routes(['middleware' => ['web', 'railway.auth']]);

// ============================================================================
// 3. AUTENTICACIÓN (Google OAuth, sesión, logout)
// ============================================================================
Route::get('/', function (Request $request) {
    if (Auth::check()) {
        $user = Auth::user();
        if ($user->company_slug) {
            return view('auth-loading', ['redirect' => "/dashboard/{$user->company_slug}"]);
        }
        return view('auth-loading', ['redirect' => '/onboarding']);
    }
    // Preserve ?plan= param from pricing page for post-signup checkout
    $plan = $request->query('plan');
    if ($plan) {
        session(['pending_plan' => $plan]);
    }
    return view('login', ['plan' => $plan]);
});

Route::get('/login', function (Request $request) {
    if (Auth::check()) {
        return view('auth-loading', ['redirect' => '/onboarding']);
    }
    $plan = $request->query('plan');
    if ($plan) {
        session(['pending_plan' => $plan]);
    }
    return view('login', ['plan' => $plan]);
})->name('login');

// Alias for /register → same as login (Google OAuth creates account automatically)
Route::get('/register', function (Request $request) {
    if (Auth::check()) {
        return view('auth-loading', ['redirect' => '/onboarding']);
    }
    $plan = $request->query('plan');
    if ($plan) {
        session(['pending_plan' => $plan]);
    }
    return view('login', ['plan' => $plan]);
})->name('register');

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
    return view('auth-loading', ['redirect' => '/login']);
})->name('transition.login');

Route::get('/transition-to-onboarding', function () {
    if (!Auth::check()) {
        Log::error('transition-to-onboarding: User not authenticated after login!');
        return view('login');
    }
    return view('auth-loading', ['redirect' => '/onboarding']);
})->name('transition.onboarding');

Route::get('/auth-loading', function (Request $request) {
    $redirect = $request->query('redirect', '/login');

    // SECURITY: Prevent open redirect — only allow relative paths (no scheme, no //)
    if (!is_string($redirect) || !str_starts_with($redirect, '/') || str_starts_with($redirect, '//')) {
        $redirect = '/login';
    }

    return view('auth-loading', ['redirect' => $redirect]);
})->name('auth.loading');

// ============================================================================
// 5. INVITACIONES (público, sin auth)
// ============================================================================
Route::get('/invitation/accept/{token}', function ($token) {
    return Inertia::render('AcceptInvitation', [
        'token' => $token,
        'googleClientId' => config('services.google.client_id'),
    ]);
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
    $signedRequest = $request->input('signed_request');
    if (!$signedRequest) {
        Log::warning('Data deletion request missing signed_request');
        return response()->json(['error' => 'Missing signed_request'], 400);
    }

    Log::info('Data deletion request received', ['has_signed_request' => true]);
    return response()->json([
        'url' => url('/data-deletion'),
        'confirmation_code' => \Illuminate\Support\Str::uuid()->toString(),
    ]);
})->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);

// ============================================================================
// 5d. WITHMIA FOR WOOCOMMERCE PLUGIN DOWNLOAD
// ============================================================================
Route::get('/plugins/withmia-for-woocommerce/download', function () {
    $pluginDir = public_path('plugins/withmia-for-woocommerce');
    if (!is_dir($pluginDir)) {
        abort(404, 'Plugin not found');
    }

    $zipPath = storage_path('app/withmia-for-woocommerce.zip');
    $zip = new \ZipArchive();
    if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
        abort(500, 'Could not create ZIP');
    }

    $files = new \RecursiveIteratorIterator(
        new \RecursiveDirectoryIterator($pluginDir, \RecursiveDirectoryIterator::SKIP_DOTS),
        \RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($files as $file) {
        if (!$file->isDir()) {
            $relativePath = 'withmia-for-woocommerce/' . substr($file->getPathname(), strlen($pluginDir) + 1);
            $relativePath = str_replace('\\', '/', $relativePath);
            $zip->addFile($file->getPathname(), $relativePath);
        }
    }

    $zip->close();

    return response()->download($zipPath, 'withmia-for-woocommerce.zip')->deleteFileAfterSend(true);
})->middleware('throttle:5,1')->name('plugins.woocommerce.download');

// ============================================================================
// 5e. WITHMIA CHATWEB PLUGIN DOWNLOAD
// ============================================================================
Route::get('/plugins/withmia-chatweb/download', function () {
    $pluginDir = public_path('plugins/withmia-chatweb');
    if (!is_dir($pluginDir)) {
        abort(404, 'Plugin not found');
    }

    $zipPath = storage_path('app/withmia-chatweb.zip');
    $zip = new \ZipArchive();
    if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
        abort(500, 'Could not create ZIP');
    }

    $files = new \RecursiveIteratorIterator(
        new \RecursiveDirectoryIterator($pluginDir, \RecursiveDirectoryIterator::SKIP_DOTS),
        \RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($files as $file) {
        if (!$file->isDir()) {
            $relativePath = 'withmia-chatweb/' . substr($file->getPathname(), strlen($pluginDir) + 1);
            $relativePath = str_replace('\\', '/', $relativePath);
            $zip->addFile($file->getPathname(), $relativePath);
        }
    }

    $zip->close();

    return response()->download($zipPath, 'withmia-chatweb.zip')->deleteFileAfterSend(true);
})->middleware('throttle:5,1')->name('plugins.chatweb.download');

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
        return view('login');
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
Route::middleware(['railway.auth', 'auth'])->group(function () {

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
Route::middleware(['auth', 'superadmin'])->prefix('admin')->group(function () {
    // Pages
    Route::get('/dashboard', [AdminController::class, 'dashboard'])->name('admin.dashboard');
    Route::get('/users', [AdminController::class, 'users'])->name('admin.users');
    Route::get('/companies', [AdminController::class, 'companies'])->name('admin.companies');
    Route::get('/tickets', [AdminController::class, 'tickets'])->name('admin.tickets');

    // API
    Route::get('/api/users', [AdminController::class, 'apiUsers'])->name('admin.api.users');
    Route::get('/api/companies', [AdminController::class, 'apiCompanies'])->name('admin.api.companies');
    Route::patch('/api/users/{id}/role', [AdminController::class, 'updateUserRole'])->name('admin.api.users.role');
    Route::delete('/api/users/{id}', [AdminController::class, 'deleteUser'])->name('admin.api.users.delete');
    Route::get('/api/stats', [AdminController::class, 'stats'])->name('admin.api.stats');
    Route::get('/api/health', [AdminController::class, 'health'])->name('admin.api.health');
    Route::post('/api/repair-qdrant', [AdminController::class, 'repairQdrantCollections'])->name('admin.api.repair-qdrant');

    // Tickets API
    Route::get('/api/tickets', [AdminController::class, 'apiTickets'])->name('admin.api.tickets');
    Route::get('/api/tickets/{id}', [AdminController::class, 'apiTicketShow'])->name('admin.api.tickets.show');
    Route::post('/api/tickets/{id}/reply', [AdminController::class, 'apiTicketReply'])->name('admin.api.tickets.reply');
    Route::patch('/api/tickets/{id}/status', [AdminController::class, 'apiTicketUpdateStatus'])->name('admin.api.tickets.status');
    Route::patch('/api/tickets/{id}/assign', [AdminController::class, 'apiTicketAssign'])->name('admin.api.tickets.assign');
});

// ============================================================================
// TEST (solo local)
// ============================================================================
if (app()->environment('local')) {
    Route::get('/test-route', fn() => response()->json(['status' => 'ok', 'time' => now()->toISOString()]));
}
