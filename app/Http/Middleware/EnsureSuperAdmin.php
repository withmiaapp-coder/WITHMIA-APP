<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Ensure the authenticated user is a super admin.
     * Blocks before Inertia page rendering.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->isSuperAdmin()) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Unauthorized — super admin required'], 403);
            }

            return redirect('/dashboard')->with('error', 'Acceso restringido a super administradores');
        }

        return $next($request);
    }
}
