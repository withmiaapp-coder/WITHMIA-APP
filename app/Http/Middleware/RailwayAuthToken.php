<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware deshabilitado - Ya no usamos auth_token
 * Mantenemos el archivo para evitar errores si está registrado en Kernel
 */
class RailwayAuthToken
{
    public function handle(Request $request, Closure $next): Response
    {
        // Simplemente continuar - la autenticación se maneja via sesiones normales
        return $next($request);
    }
}
