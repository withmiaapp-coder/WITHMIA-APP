<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware para autenticar usuarios via Railway Auth Token
 * 
 * Railway Edge stripea los Set-Cookie headers, así que usamos un token
 * persistente que el frontend guarda en localStorage y envía en cada petición.
 */
class RailwayAuthToken
{
    public function handle(Request $request, Closure $next): Response
    {
        // Si ya está autenticado, continuar
        if (Auth::check()) {
            return $next($request);
        }

        // Intentar obtener el token del header X-Railway-Auth-Token
        $authToken = $request->header('X-Railway-Auth-Token');
        
        // También intentar desde query param (para la carga inicial)
        if (!$authToken) {
            $authToken = $request->query('auth_token');
        }

        if ($authToken) {
            $tokenData = Cache::get('auth_token:' . $authToken);
            
            if ($tokenData && isset($tokenData['user_id'])) {
                $user = User::find($tokenData['user_id']);
                
                if ($user) {
                    Auth::login($user, true);
                    
                    // Guardar en sesión para que Inertia lo pase al frontend
                    session(['railway_auth_token' => $authToken]);
                    
                    error_log('[RailwayAuth] User authenticated via token: ' . $user->id);
                }
            }
        }

        return $next($request);
    }
}
