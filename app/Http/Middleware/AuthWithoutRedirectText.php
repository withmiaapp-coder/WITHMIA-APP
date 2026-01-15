<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthWithoutRedirectText
{
    /**
     * Handle an incoming request.
     * Si no está autenticado, muestra login.html directamente sin el feo "Redirecting to"
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            // Mostrar login directamente sin redirect
            return response()->file(public_path('login.html'));
        }

        return $next($request);
    }
}
