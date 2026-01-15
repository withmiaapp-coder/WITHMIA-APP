<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TeamManagementMiddleware
{
    /**
     * Handle an incoming request - Para gestión de equipo (admin, agent)
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return response()->view('transition', ['redirect' => '/login']);
        }

        $user = auth()->user();
        
        // Solo admins y agents pueden gestionar equipos
        if (!$user->hasRole(['admin', 'agent'])) {
            return response()->json([
                'error' => 'Solo los agents pueden gestionar su equipo.',
                'user_role' => $user->roles->pluck('name')->first() ?? 'sin rol'
            ], 403);
        }

        return $next($request);
    }
}