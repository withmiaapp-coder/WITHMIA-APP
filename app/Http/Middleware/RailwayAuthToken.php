<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class RailwayAuthToken
{
    public function handle(Request $request, Closure $next)
    {
        // Ya autenticado, continuar
        if (Auth::check()) {
            return $next($request);
        }
        
        // Buscar token en múltiples lugares (orden de prioridad)
        $token = $request->query('auth_token') 
            ?? $request->header('X-Railway-Auth-Token')
            ?? $request->input('auth_token');
        
        if ($token) {
            $user = User::where('auth_token', $token)->first();
            
            if ($user) {
                Auth::login($user);
                Log::info('RailwayAuthToken: User authenticated via token', [
                    'user_id' => $user->id,
                    'source' => $request->query('auth_token') ? 'query' : 
                               ($request->header('X-Railway-Auth-Token') ? 'header' : 'input')
                ]);
                return $next($request);
            } else {
                Log::warning('RailwayAuthToken: Invalid token provided', [
                    'token_prefix' => substr($token, 0, 8) . '...'
                ]);
            }
        }
        
        // No autenticado - devolver error JSON 401
        Log::warning('RailwayAuthToken: Unauthenticated request blocked', [
            'path' => $request->path(),
            'has_token' => !empty($token)
        ]);
        
        return response()->json([
            'success' => false,
            'error' => 'Unauthenticated - No valid auth token provided'
        ], 401);
    }
}
