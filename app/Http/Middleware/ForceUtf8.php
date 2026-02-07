<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Helpers\Utf8Helper;

/**
 * Middleware para forzar encoding UTF-8 en toda la aplicación.
 * Delega la lógica de sanitización a Utf8Helper para evitar duplicación.
 */
class ForceUtf8
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Sanitizar input si viene con encoding incorrecto
        $input = $request->all();
        if (!empty($input)) {
            $request->merge(Utf8Helper::fixArray($input));
        }

        $response = $next($request);

        // Agregar headers de charset UTF-8 a todas las respuestas
        if ($response instanceof Response) {
            $contentType = $response->headers->get('Content-Type');

            if (str_contains($contentType ?? '', 'application/json')) {
                $response->headers->set('Content-Type', 'application/json; charset=utf-8');

                $content = $response->getContent();
                if ($content && Utf8Helper::hasMojibake($content)) {
                    $response->setContent(Utf8Helper::fix($content));
                }
            } elseif (str_contains($contentType ?? '', 'text/html')) {
                $response->headers->set('Content-Type', 'text/html; charset=utf-8');
            } elseif (str_contains($contentType ?? '', 'text/') && !str_contains($contentType ?? '', 'charset')) {
                $response->headers->set('Content-Type', $contentType . '; charset=utf-8');
            }

            $response->headers->set('X-Content-Type-Options', 'nosniff');
        }

        return $response;
    }
}
