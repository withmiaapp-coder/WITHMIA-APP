<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     * Nota: La configuración principal está en bootstrap/app.php (validateCsrfTokens).
     * Este archivo se mantiene como fallback para rutas legacy.
     *
     * @var array<int, string>
     */
    protected $except = [
        'whatsapp/*',
        'auth/google',
        'auth/google/invitation',
    ];
}
