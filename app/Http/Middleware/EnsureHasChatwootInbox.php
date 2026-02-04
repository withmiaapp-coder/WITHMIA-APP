<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware para validar que el usuario tiene un inbox de Chatwoot asignado
 * Evita repetir la misma validación en cada método del ChatwootController
 */
class EnsureHasChatwootInbox
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado'
            ], 401);
        }

        if (!$user->chatwoot_inbox_id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes un inbox asignado. Contacta al administrador.',
                'error_code' => 'NO_INBOX_ASSIGNED'
            ], 403);
        }

        return $next($request);
    }
}
