<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check() || !auth()->user()->hasRole('admin')) {
            return response()->json([
                'error' => 'Acceso denegado. Se requiere rol de administrador.',
                'user_role' => auth()->user()?->roles->pluck('name')->first() ?? 'sin autenticar'
            ], 403);
        }

        return $next($request);
    }
}