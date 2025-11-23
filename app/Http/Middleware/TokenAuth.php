<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class TokenAuth
{
    public function handle(Request \, Closure \)
    {
        // Por ahora, simplemente verificar si hay una sesión activa
        if (Auth::check()) {
            return \(\);
        }

        // Si no hay sesión, redirigir al login
        return redirect('/login');
    }
}
