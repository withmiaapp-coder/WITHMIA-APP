<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AgentMiddleware
{
    /**
     * Handle an incoming request - Solo agents o admins
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return response()->file(public_path('login.html'));
        }

        $user = auth()->user();
        
        if (!$user->hasRole(['admin', 'agent'])) {
            return response()->json([
                'error' => 'Acceso denegado. Se requiere rol de agent o superior.',
                'user_role' => $user->roles->pluck('name')->first() ?? 'sin rol'
            ], 403);
        }

        return $next($request);
    }
}