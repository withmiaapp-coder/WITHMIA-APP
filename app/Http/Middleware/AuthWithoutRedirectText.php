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
     * Si no está autenticado, muestra login directamente sin el feo "Redirecting to"
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            // Mostrar login directamente sin redirect
            return response(view('login')->render(), 200, ['Content-Type' => 'text/html']);
        }

        return $next($request);
    }
}
