<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class TokenAuth
{
    public function handle(Request $request, Closure $next)
    {
        // Por ahora, simplemente verificar si hay una sesión activa
        if (Auth::check()) {
            return $next($request);
        }

        // Si no hay sesión, mostrar login directamente (sin redirect feo)
        return response()->file(public_path('login.html'));
    }
}
