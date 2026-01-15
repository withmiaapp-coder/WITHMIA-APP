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
        then: function () {
            Route::middleware('api')
                ->group(base_path('routes/stats.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Trust Railway proxies for proper HTTPS detection
        $middleware->trustProxies(at: '*');
        
        // Registrar middleware personalizado
        $middleware->alias([
            'auth.clean' => \App\Http\Middleware\AuthWithoutRedirectText::class,
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
