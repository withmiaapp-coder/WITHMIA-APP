<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withProviders([
        App\Providers\AppServiceProvider::class,
    ])
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Trust Railway proxies for proper HTTPS detection
        $middleware->trustProxies(at: '*');
        
        // UTF-8 encoding middleware - MUST be first to handle all requests
        $middleware->prepend(\App\Http\Middleware\ForceUtf8::class);
        
        // RailwayAuthToken removed from global middleware stack.
        // Use 'railway.auth' alias on specific route groups that need token-based auth.
        
        // Excluir rutas de verificación CSRF
        // api/* es redundante (API routes no usan web middleware) pero se mantiene como safety net
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'whatsapp/*',
            'auth/google',
            'auth/google/invitation',
            'broadcasting/auth',
        ]);
        
        // Registrar middleware personalizado
        $middleware->alias([
            'auth.clean' => \App\Http\Middleware\AuthWithoutRedirectText::class,
            'railway.auth' => \App\Http\Middleware\RailwayAuthToken::class,
            'utf8' => \App\Http\Middleware\ForceUtf8::class,
            'n8n.secret' => \App\Http\Middleware\ValidateN8nSecret::class,
            'webhook.hmac' => \App\Http\Middleware\ValidateWebhookSignature::class,
            'superadmin' => \App\Http\Middleware\EnsureSuperAdmin::class,
        ]);

        // CRITICAL: Ensure RailwayAuthToken runs BEFORE Laravel's Authenticate middleware.
        // Without this, Laravel's middleware priority sorting moves Authenticate (priority 5
        // via AuthenticatesRequests interface) before RailwayAuthToken (no priority), which
        // breaks token-based auth when Railway Edge strips session cookies.
        $middleware->prependToPriorityList(
            \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
            \App\Http\Middleware\RailwayAuthToken::class
        );
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Interceptar AuthenticationException
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            // Redirect to /login properly (302) instead of serving login as 200.
            // Serving login as 200 at wrong URLs (e.g. /dashboard) causes Google GIS
            // to auto-trigger credential callbacks, creating an infinite loop.
            return redirect()->guest('/login');
        });

        // CRITICAL: Return proper JSON for ALL API exceptions (prevents empty 500 with Octane/RoadRunner)
        $exceptions->render(function (\Throwable $e, Request $request) {
            // Let ValidationException pass through to Laravel's default handler (422)
            if ($e instanceof ValidationException) {
                return null;
            }

            if ($request->is('api/*') || $request->expectsJson()) {
                \Illuminate\Support\Facades\Log::error('[WITHMIA] API EXCEPTION', [
                    'class' => get_class($e),
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'path' => $request->path(),
                    'method' => $request->method(),
                ]);

                $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
                $response = response()->json([
                    'success' => false,
                    'error' => config('app.debug') ? $e->getMessage() : 'Server error',
                    'error_class' => config('app.debug') ? get_class($e) : null,
                ], $status);

                // Ensure CORS headers are present even on error responses
                $origin = $request->header('Origin');
                $allowedOrigins = ['https://withmia.com', 'https://www.withmia.com'];
                if ($origin && in_array($origin, $allowedOrigins)) {
                    $response->headers->set('Access-Control-Allow-Origin', $origin);
                    $response->headers->set('Access-Control-Allow-Credentials', 'true');
                    $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                    $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
                }

                return $response;
            }
            return null; // Non-API: let Laravel handle normally
        });
    })->create();
