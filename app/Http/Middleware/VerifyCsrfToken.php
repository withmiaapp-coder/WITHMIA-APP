<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        'whatsapp/generate-qr',
        'whatsapp/status',
        'whatsapp/disconnect',
        'whatsapp/*',
        'auth/google',
        'auth/google/invitation',
        'api/bot-config',
        'api/bot-config/*',
        'api/chatwoot-proxy/*',
        'api/evolution/*',
        'api/evolution-whatsapp/*',
    ];
}
