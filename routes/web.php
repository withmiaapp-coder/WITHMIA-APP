<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\OnboardingApiController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ContactsController;
use App\Http\Controllers\AttachmentProxyController;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

// TEST ROUTE - muy simple para verificar que las rutas funcionan
Route::get('/test-route', function () {
    return response()->json(['status' => 'ok', 'time' => now()->toISOString()]);
});

// TEMP: Reset user for testing onboarding (ELIMINAR EN PRODUCCIÓN)
Route::get('/reset-onboarding-test', function () {
    $email = request()->input('email', 'withmia.app@gmail.com');
    $secret = request()->input('secret');
    
    if ($secret !== 'withmia2026reset') {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    $user = \App\Models\User::where('email', $email)->first();
    if ($user) {
        $user->update([
            'company_slug' => null,
            'onboarding_step' => 1,
            'onboarding_completed' => false
        ]);
        return response()->json(['success' => true, 'message' => "Usuario {$email} reseteado"]);
    }
    return response()->json(['error' => 'Usuario no encontrado'], 404);
});

// TEMP: Borrar TODOS los datos de prueba de la DB (ELIMINAR EN PRODUCCIÓN)
Route::get('/clean-test-data', function () {
    $secret = request()->input('secret');
    
    if ($secret !== 'withmia2026clean') {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    $deleted = [];
    
    // Borrar todas las companies
    $companiesCount = \App\Models\Company::count();
    \App\Models\Company::truncate();
    $deleted['companies'] = $companiesCount;
    
    // Resetear todos los usuarios (no borrar, solo limpiar onboarding)
    $usersCount = \App\Models\User::count();
    \App\Models\User::query()->update([
        'company_slug' => null,
        'onboarding_step' => 1,
        'onboarding_completed' => false,
        'company_name' => null,
        'company_description' => null,
        'company_website' => null,
        'use_case' => null,
        'monthly_volume' => null,
        'discovery_source' => null,
        'current_tools' => null,
    ]);
    $deleted['users_reset'] = $usersCount;
    
    return response()->json([
        'success' => true,
        'message' => 'Base de datos limpiada',
        'deleted' => $deleted
    ]);
});

// TEMP: BORRAR TODO - usuarios, companies, reiniciar IDs (ELIMINAR EN PRODUCCIÓN)
Route::get('/nuke-database', function () {
    $secret = request()->input('secret');
    
    if ($secret !== 'withmia2026nuke') {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    $deleted = [];
    
    // Deshabilitar foreign key checks temporalmente
    \DB::statement('SET session_replication_role = replica;');
    
    // Borrar companies
    $deleted['companies'] = \App\Models\Company::count();
    \DB::table('companies')->truncate();
    
    // Borrar usuarios
    $deleted['users'] = \App\Models\User::count();
    \DB::table('users')->truncate();
    
    // Borrar sessions
    \DB::table('sessions')->truncate();
    
    // Rehabilitar foreign key checks
    \DB::statement('SET session_replication_role = DEFAULT;');
    
    return response()->json([
        'success' => true,
        'message' => '💥 Base de datos NUCLEAR - Todo borrado, IDs reiniciados',
        'deleted' => $deleted
    ]);
});

// TEMP: BORRAR ABSOLUTAMENTE TODO - Laravel DB + Chatwoot + n8n + Qdrant + Redis
Route::get('/nuke-everything', function () {
    $secret = request()->input('secret');
    
    if ($secret !== 'withmia2026nukeall') {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    $results = ['success' => true, 'cleaned' => []];
    
    // 1. LIMPIAR LARAVEL DB
    try {
        \DB::statement('SET session_replication_role = replica;');
        
        $tables = ['personal_access_tokens', 'sessions', 'knowledge_documents', 
                   'whatsapp_instances', 'agent_invitations', 'pipeline_items', 
                   'pipelines', 'usage_metrics', 'integrations', 'ai_agents', 
                   'subscriptions', 'companies', 'users', 'model_has_roles',
                   'model_has_permissions', 'cache', 'cache_locks', 'jobs', 'failed_jobs'];
        
        foreach ($tables as $table) {
            try {
                \DB::statement("TRUNCATE TABLE \"{$table}\" RESTART IDENTITY CASCADE");
            } catch (\Exception $e) {}
        }
        
        \DB::statement('SET session_replication_role = DEFAULT;');
        $results['cleaned']['laravel_db'] = true;
    } catch (\Exception $e) {
        $results['cleaned']['laravel_db'] = 'Error: ' . $e->getMessage();
    }
    
    // 2. LIMPIAR CHATWOOT DB (accounts creados por nosotros, ID > 1)
    try {
        $chatwootDb = \DB::connection('chatwoot');
        $chatwootDb->statement('SET session_replication_role = replica;');
        
        // Borrar accounts creados (ID > 1, el 1 es el admin original)
        $accountsDeleted = $chatwootDb->table('accounts')->where('id', '>', 1)->count();
        
        // Borrar en orden por foreign keys
        $chatwootDb->table('inbox_members')->whereIn('inbox_id', function($q) {
            $q->select('id')->from('inboxes')->where('account_id', '>', 1);
        })->delete();
        
        $chatwootDb->table('channel_api')->whereIn('account_id', function($q) use ($chatwootDb) {
            $q->select('id')->from('accounts')->where('id', '>', 1);
        })->delete();
        
        $chatwootDb->table('inboxes')->where('account_id', '>', 1)->delete();
        $chatwootDb->table('account_users')->where('account_id', '>', 1)->delete();
        
        // Borrar usuarios que solo pertenecen a accounts > 1
        $chatwootDb->table('users')
            ->whereNotIn('id', function($q) {
                $q->select('user_id')->from('account_users')->where('account_id', '=', 1);
            })
            ->where('id', '>', 1)
            ->delete();
        
        $chatwootDb->table('accounts')->where('id', '>', 1)->delete();
        
        $chatwootDb->statement('SET session_replication_role = DEFAULT;');
        $results['cleaned']['chatwoot_db'] = "Deleted {$accountsDeleted} accounts";
    } catch (\Exception $e) {
        $results['cleaned']['chatwoot_db'] = 'Error: ' . $e->getMessage();
    }
    
    // 3. LIMPIAR N8N WORKFLOWS
    try {
        $n8nUrl = config('services.n8n.url', env('N8N_URL'));
        $n8nApiKey = config('services.n8n.api_key', env('N8N_API_KEY'));
        
        if ($n8nUrl && $n8nApiKey) {
            $response = Http::withHeaders(['X-N8N-API-KEY' => $n8nApiKey])
                ->get("{$n8nUrl}/api/v1/workflows");
            
            $workflows = $response->json()['data'] ?? [];
            $deletedCount = 0;
            
            foreach ($workflows as $wf) {
                Http::withHeaders(['X-N8N-API-KEY' => $n8nApiKey])
                    ->delete("{$n8nUrl}/api/v1/workflows/{$wf['id']}");
                $deletedCount++;
            }
            
            $results['cleaned']['n8n'] = "Deleted {$deletedCount} workflows";
        } else {
            $results['cleaned']['n8n'] = 'N8N not configured';
        }
    } catch (\Exception $e) {
        $results['cleaned']['n8n'] = 'Error: ' . $e->getMessage();
    }
    
    // 4. LIMPIAR QDRANT COLLECTIONS
    try {
        $qdrantUrl = config('services.qdrant.host');
        // Para llamadas externas usar la URL configurada
        $qdrantPublic = $qdrantUrl;
        
        $response = Http::get("{$qdrantPublic}/collections");
        $collections = $response->json()['result']['collections'] ?? [];
        $deletedCount = 0;
        
        foreach ($collections as $col) {
            Http::delete("{$qdrantPublic}/collections/{$col['name']}");
            $deletedCount++;
        }
        
        $results['cleaned']['qdrant'] = "Deleted {$deletedCount} collections";
    } catch (\Exception $e) {
        $results['cleaned']['qdrant'] = 'Error: ' . $e->getMessage();
    }
    
    // 5. LIMPIAR REDIS (flush cache y sessions)
    try {
        \Illuminate\Support\Facades\Redis::flushdb();
        $results['cleaned']['redis'] = true;
    } catch (\Exception $e) {
        $results['cleaned']['redis'] = 'Error: ' . $e->getMessage();
    }
    
    $results['message'] = '💥💥💥 NUCLEAR TOTAL - Todo limpiado: Laravel, Chatwoot, n8n, Qdrant, Redis';
    
    return response()->json($results);
});

// ============================================================================
// PROXY DE IMÁGENES - PRIMERA RUTA (máxima prioridad, sin middleware)
// ============================================================================
Route::get('/img-proxy', function () {
    $url = request()->input('url');
    $contactName = request()->input('name', '?');
    
    // Función helper para generar un SVG placeholder con iniciales
    $generatePlaceholder = function($name = '?') {
        $initial = mb_strtoupper(mb_substr($name, 0, 1, 'UTF-8'), 'UTF-8');
        // Si el carácter no es imprimible o es especial, usar '?'
        if (empty($initial) || preg_match('/^[\x00-\x1F\x7F]/', $initial)) {
            $initial = '?';
        }
        $colors = ['4F46E5', '7C3AED', '2563EB', '059669', 'DC2626', 'EA580C'];
        $color = $colors[ord($initial) % count($colors)];
        
        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#{$color}"/>
  <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">{$initial}</text>
</svg>
SVG;
        return response($svg)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Cache-Control', 'public, max-age=3600')
            ->header('Access-Control-Allow-Origin', '*');
    };
    
    if (!$url) {
        return $generatePlaceholder($contactName);
    }
    
    // Validar que sea de Chatwoot Railway
    $host = parse_url($url, PHP_URL_HOST);
    if (!$host || !str_contains($host, 'chatwoot') || !str_contains($host, 'railway.app')) {
        return $generatePlaceholder($contactName);
    }
    
    try {
        // Usar cURL directamente para mejor control
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 10, // Timeout más corto
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_HTTPHEADER => [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept: image/*,*/*'
            ]
        ]);
        
        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = curl_error($ch);
        curl_close($ch);
        
        // Si hay cualquier error, devolver placeholder
        if ($error || $httpCode >= 400 || empty($body) || str_contains($contentType ?? '', 'text/html')) {
            error_log("IMG-PROXY: Fallback a placeholder - HTTP: $httpCode, Error: $error");
            return $generatePlaceholder($contactName);
        }
        
        return response($body)
            ->header('Content-Type', $contentType ?: 'image/jpeg')
            ->header('Cache-Control', 'public, max-age=86400')
            ->header('Access-Control-Allow-Origin', '*');
            
    } catch (\Exception $e) {
        error_log("IMG-PROXY: Exception: " . $e->getMessage());
        return $generatePlaceholder($contactName);
    }
})->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);

// Autenticación de canales de broadcasting
Broadcast::routes(['middleware' => ['web', 'auth']]);

// Proxy para archivos/imágenes de Chatwoot - SIN autenticación
// Ruta en web.php para evitar problemas de caché de rutas API
Route::get('/chatwoot-image-proxy', [AttachmentProxyController::class, 'proxy']);

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

// Ruta temporal para crear DB de Chatwoot
Route::get('/admin/create-chatwoot-db', function () {
    try {
        $pdo = new PDO(
            'pgsql:host=postgres.railway.internal;port=5432;dbname=railway',
            'postgres',
            'dzMmfzVhEDLgeRIAvRlWofFnagOyItjs',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        $stmt = $pdo->query("SELECT 1 FROM pg_database WHERE datname = 'chatwoot'");
        if ($stmt->fetchColumn()) {
            return response()->json(['status' => 'exists', 'message' => 'Database chatwoot already exists']);
        }
        
        $pdo->exec("CREATE DATABASE chatwoot");
        return response()->json(['status' => 'created', 'message' => 'Database chatwoot created successfully']);
    } catch (PDOException $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// Ruta temporal para habilitar pgvector en Chatwoot
Route::get('/admin/enable-pgvector', function () {
    try {
        $pdo = new PDO(
            'pgsql:host=postgres.railway.internal;port=5432;dbname=chatwoot',
            'postgres',
            'dzMmfzVhEDLgeRIAvRlWofFnagOyItjs',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        // Verificar si la extensión ya existe
        $stmt = $pdo->query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
        if ($stmt->fetchColumn()) {
            return response()->json(['status' => 'exists', 'message' => 'Extension vector already enabled']);
        }
        
        // Habilitar la extensión
        $pdo->exec("CREATE EXTENSION vector");
        return response()->json(['status' => 'created', 'message' => 'Extension vector enabled successfully']);
    } catch (PDOException $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

Route::get('/', function () {
    if (Auth::check()) {
        // Verificar si el usuario ha completado el onboarding
        $user = Auth::user();
        if ($user->company_slug) {
            // Usar el slug que ya tiene el usuario - mostrar transición
            return view('transition', ['redirect' => "/dashboard/{$user->company_slug}"]);
        }
        return view('transition', ['redirect' => '/onboarding']);
    }
    // No autenticado - mostrar login directamente (sin redirect feo)
    return response()->file(public_path('login.html'));
});

// Login route - redirect if already authenticated
Route::get('/login', function () {
    if (Auth::check()) {
        return view('transition', ['redirect' => '/onboarding']);
    }
    return response()->file(public_path('login.html'));
})->name('login');

// ============================================================================
// Invitación de equipo - Página de aceptación
// ============================================================================
Route::get('/invitation/accept/{token}', function ($token) {
    return Inertia::render('AcceptInvitation', [
        'token' => $token
    ]);
})->name('invitation.accept');

// Transition route for unauthenticated redirects
Route::get('/transition-login', function () {
    return view('transition', ['redirect' => '/login']);
})->name('transition.login');

// Transition route AFTER login - this is where session cookie gets set properly
Route::get('/transition-to-onboarding', function () {
    // Esta ruta se llama después del login, la sesión ya debería estar activa
    if (!Auth::check()) {
        \Log::error('transition-to-onboarding: User not authenticated after login!');
        return response()->file(public_path('login.html'));
    }
    return view('transition', ['redirect' => '/onboarding']);
})->name('transition.onboarding');

// Authentication routes (no middleware needed)
Route::post('/auth/google', [GoogleAuthController::class, 'authenticate'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('auth.google');

Route::get('/check-session', [GoogleAuthController::class, 'checkSession'])->name('auth.check');

Route::get('/logout', function () {
    try {
        // Borrar cookies y sesión
        Auth::guard('web')->logout();
        request()->session()->flush();
        request()->session()->regenerateToken();
    } catch (\Exception $e) {
        \Log::error('Logout error: ' . $e->getMessage());
    }
    
    // Mostrar pantalla de transición con video
    return view('auth-loading', ['redirect' => '/login']);
})->name('logout.get');

// Ruta para mostrar pantalla de carga con video
Route::get('/auth-loading', function (\Illuminate\Http\Request $request) {
    $redirect = $request->query('redirect', '/login');
    return view('auth-loading', ['redirect' => $redirect]);
})->name('auth.loading');

// Onboarding POST route - outside auth middleware to avoid CSRF issues
Route::post('/onboarding', [OnboardingController::class, 'store'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('onboarding.store');

// Improve description endpoint for onboarding
Route::post('/api/improve-description', [OnboardingApiController::class, 'improveDescription'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('onboarding.improve');

// Onboarding route - Autenticación basada en sesión
Route::get('/onboarding', function (\Illuminate\Http\Request $request) {
    $sessionId = session()->getId();
    
    error_log('Onboarding - Session ID: ' . $sessionId . ', Auth: ' . (Auth::check() ? 'YES' : 'NO'));
    
    if (!Auth::check()) {
        // No autenticado - mostrar login directamente
        return response()->file(public_path('login.html'));
    }
    
    $user = Auth::user();
    
    // Si ya completó onboarding, redirigir al dashboard
    if ($user->company_slug && $user->onboarding_completed) {
        $authToken = $request->query('auth_token');
        $url = route('dashboard.company', ['companySlug' => $user->company_slug]);
        if ($authToken) {
            $url .= '?auth_token=' . $authToken;
        }
        return redirect($url);
    }
    
    return app(OnboardingController::class)->show($request);
})->name('onboarding');

Route::middleware(['railway.auth', 'auth', 'auth.clean'])->group(function () {

    // Dashboard routes - Sistema slug /dashboard/{company-slug}
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
    
    // ✅ Pasar información de Chatwoot dinámica desde config/environment
    $chatwootUrl = config('chatwoot.url') ?? env('CHATWOOT_URL') ?? env('CHATWOOT_API_BASE_URL');
    
    return Inertia::render('Conversaciones', [
        'user' => $user,
        'company' => $company,
        'chatwoot' => [
            'url' => $chatwootUrl,
            'inbox_id' => $user->chatwoot_inbox_id ?? $company->chatwoot_inbox_id ?? 1,
            'account_id' => $company->chatwoot_account_id ?? 1,
        ]
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
    Route::delete('/api/chatwoot/webhooks/{webhookId}', [App\Http\Controllers\ChatwootEnterpriseController::class, 'deleteWebhook']);
    
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

// ============================================================================
// ADMIN PANEL ROUTES
// ============================================================================
Route::middleware(['auth'])->prefix('admin')->group(function () {
    // Admin Pages
    Route::get('/dashboard', [App\Http\Controllers\AdminController::class, 'dashboard'])
        ->name('admin.dashboard');
    Route::get('/users', [App\Http\Controllers\AdminController::class, 'users'])
        ->name('admin.users');
    Route::get('/companies', [App\Http\Controllers\AdminController::class, 'companies'])
        ->name('admin.companies');
    
    // Admin API Endpoints
    Route::get('/api/users', [App\Http\Controllers\AdminController::class, 'apiUsers'])
        ->name('admin.api.users');
    Route::get('/api/companies', [App\Http\Controllers\AdminController::class, 'apiCompanies'])
        ->name('admin.api.companies');
    Route::patch('/api/users/{id}/role', [App\Http\Controllers\AdminController::class, 'updateUserRole'])
        ->name('admin.api.users.role');
    Route::delete('/api/users/{id}', [App\Http\Controllers\AdminController::class, 'deleteUser'])
        ->name('admin.api.users.delete');
    Route::get('/api/stats', [App\Http\Controllers\AdminController::class, 'stats'])
        ->name('admin.api.stats');
});
