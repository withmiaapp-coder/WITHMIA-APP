<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateChatwootAccess
{
    /**
     * Middleware para validar acceso a Chatwoot
     * Verifica que el usuario tenga:
     * 1. Una company asignada
     * 2. Chatwoot provisionado en su company
     * 3. Un inbox asignado
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();
        
        // Validar que el usuario esté autenticado
        if (!$user) {
            Log::warning('Usuario no autenticado intentó acceder a Chatwoot', [
                'ip' => $request->ip(),
                'url' => $request->fullUrl()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'No estás autenticado'
            ], 401);
        }
        
        // Validar que el usuario tenga company
        if (!$user->company) {
            Log::warning('Usuario sin company intentó acceder a Chatwoot', [
                'user_id' => $user->id,
                'email' => $user->email,
                'url' => $request->fullUrl()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'No tienes una company asignada. Por favor contacta al administrador.'
            ], 403);
        }
        
        // Validar que la company tenga Chatwoot configurado
        $company = $user->company;
        if (!$company->chatwoot_provisioned || !$company->chatwoot_account_id) {
            Log::warning('Company sin Chatwoot provisionado', [
                'user_id' => $user->id,
                'email' => $user->email,
                'company_id' => $company->id,
                'company_slug' => $company->slug,
                'chatwoot_provisioned' => $company->chatwoot_provisioned,
                'chatwoot_account_id' => $company->chatwoot_account_id,
                'url' => $request->fullUrl()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Tu company no tiene Chatwoot configurado. Por favor contacta al administrador.'
            ], 403);
        }
        
        // Validar que el usuario tenga inbox asignado
        if (!$user->chatwoot_inbox_id) {
            Log::warning('Usuario sin inbox asignado intentó acceder a Chatwoot', [
                'user_id' => $user->id,
                'email' => $user->email,
                'company_id' => $company->id,
                'company_slug' => $company->slug,
                'url' => $request->fullUrl()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'No tienes un inbox de Chatwoot asignado. Por favor contacta al administrador.'
            ], 403);
        }
        
        // Log de acceso exitoso
        Log::info('Usuario accedió a endpoint de Chatwoot', [
            'user_id' => $user->id,
            'email' => $user->email,
            'company_slug' => $company->slug,
            'chatwoot_account_id' => $company->chatwoot_account_id,
            'chatwoot_inbox_id' => $user->chatwoot_inbox_id,
            'url' => $request->fullUrl(),
            'method' => $request->method()
        ]);
        
        return $next($request);
    }
}
