<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $permission
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'No autenticado'], 401);
            }
            return redirect()->route('login');
        }

        if (!$user->hasPermission($permission)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'No tienes permiso para realizar esta acción',
                    'permission_required' => $permission
                ], 403);
            }
            abort(403, 'No tienes permiso para realizar esta acción');
        }

        return $next($request);
    }
}
