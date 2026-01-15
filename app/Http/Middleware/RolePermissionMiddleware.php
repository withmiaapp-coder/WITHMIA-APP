<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RolePermissionMiddleware
{
    /**
     * Handle an incoming request.
     * 
     * Usage:
     * Route::get('/admin', function () {})->middleware('role:admin');
     * Route::get('/sales', function () {})->middleware('permission:view.sales');
     * Route::get('/team', function () {})->middleware('role:admin,agent');
     */
    public function handle(Request $request, Closure $next, ...$rolesOrPermissions): Response
    {
        if (!auth()->check()) {
            return response()->file(public_path('login.html'));
        }

        $user = auth()->user();
        
        // Si no se especifican roles/permisos, permitir acceso a usuarios autenticados
        if (empty($rolesOrPermissions)) {
            return $next($request);
        }

        foreach ($rolesOrPermissions as $roleOrPermission) {
            // Verificar si es un rol
            if ($user->hasRole($roleOrPermission)) {
                return $next($request);
            }
            
            // Verificar si es un permiso
            if ($user->can($roleOrPermission)) {
                return $next($request);
            }
        }

        // Usuario no tiene los permisos requeridos
        return response()->json([
            'error' => 'No tienes permisos para acceder a esta sección.',
            'required' => $rolesOrPermissions,
            'user_role' => $user->roles->pluck('name')->first() ?? 'sin rol'
        ], 403);
    }
}