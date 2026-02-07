<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
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
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'api/bot-config',
            'api/bot-config/*',
            'api/chatwoot-proxy/*',
            'api/evolution/*',
            'api/evolution-whatsapp/*',
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
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Interceptar AuthenticationException para NO mostrar "Redirecting to"
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            // Retornar login.html directamente sin redirect
            return response()->file(public_path('login.html'));
        });
    })->create();
