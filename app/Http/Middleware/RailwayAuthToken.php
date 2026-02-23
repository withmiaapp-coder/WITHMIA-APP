<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class RailwayAuthToken
{
    /**
     * Handle an incoming request.
     * When $requireAuth is true (used as route middleware), it will block unauthenticated requests.
     * When false (used globally), it just tries to authenticate without blocking.
     */
    public function handle(Request $request, Closure $next, $requireAuth = 'false')
    {
        // Ya autenticado, continuar
        if (Auth::check()) {
            return $next($request);
        }
        
        // Buscar token en múltiples lugares (orden de prioridad)
        // Use ?: (elvis) instead of ?? so empty strings fall through to the next source
        $token = $request->query('auth_token') 
            ?: $request->header('X-Railway-Auth-Token')
            ?: $request->input('auth_token')
            ?: null;
        
        if ($token) {
            $user = User::where('auth_token', $token)->first();
            
            if ($user) {
                Auth::login($user);
                return $next($request);
            } else {
                Log::warning('RailwayAuthToken: Invalid token provided', [
                    'token_prefix' => substr($token, 0, 8) . '...'
                ]);
            }
        }
        
        // Si requireAuth es true, bloquear solicitudes no autenticadas
        if ($requireAuth === 'true' || $requireAuth === true) {
            Log::warning('RailwayAuthToken: Unauthenticated request blocked', [
                'path' => $request->path(),
                'has_token' => !empty($token)
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Unauthenticated - No valid auth token provided'
            ], 401);
        }
        
        // No bloquear - continuar sin autenticación
        return $next($request);
    }
}
