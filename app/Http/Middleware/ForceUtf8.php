<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

/**
 * Middleware para forzar encoding UTF-8 en toda la aplicación
 * Esto soluciona problemas de caracteres especiales (acentos, ñ, etc.)
 */
class ForceUtf8
{
    /**
     * Mapeo de caracteres mojibake comunes (UTF-8 interpretado como Latin-1)
     * Estos son los patrones más comunes de corrupción
     */
    private array $mojibakeMap = [
        // Replacement character - el byte original se perdió
        "\u{FFFD}" => '?',
        "�" => '?',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 🔴 DEBUG: Log raw input at middleware level (before any processing)
        $rawInput = file_get_contents('php://input');
        if (strlen($rawInput) > 0 && strlen($rawInput) < 5000) {
            Log::info('🔴 ForceUtf8 Middleware - RAW INPUT', [
                'uri' => $request->getRequestUri(),
                'content_type' => $request->header('Content-Type'),
                'raw_hex' => bin2hex(substr($rawInput, 0, 200)),
                'raw_preview' => substr($rawInput, 0, 300),
                'has_replacement_char' => str_contains($rawInput, "\u{FFFD}") || str_contains($rawInput, '�'),
            ]);
        }
        
        // Sanitizar input si viene con encoding incorrecto
        $this->sanitizeInput($request);
        
        $response = $next($request);

        // Agregar headers de charset UTF-8 a todas las respuestas
        if ($response instanceof Response) {
            $contentType = $response->headers->get('Content-Type');
            
            // Si es JSON, asegurar charset UTF-8 y corregir contenido
            if (str_contains($contentType ?? '', 'application/json')) {
                $response->headers->set('Content-Type', 'application/json; charset=utf-8');
                
                // Corregir mojibake en respuesta JSON
                $content = $response->getContent();
                if ($content && $this->hasMojibake($content)) {
                    $response->setContent($this->fixMojibake($content));
                }
            }
            // Si es HTML, asegurar charset UTF-8
            elseif (str_contains($contentType ?? '', 'text/html')) {
                $response->headers->set('Content-Type', 'text/html; charset=utf-8');
            }
            // Para cualquier otro contenido de texto
            elseif (str_contains($contentType ?? '', 'text/')) {
                if (!str_contains($contentType ?? '', 'charset')) {
                    $response->headers->set('Content-Type', $contentType . '; charset=utf-8');
                }
            }
            
            // Agregar header de encoding general
            $response->headers->set('X-Content-Type-Options', 'nosniff');
        }

        return $response;
    }

    /**
     * Verificar si el texto tiene mojibake
     */
    private function hasMojibake(string $text): bool
    {
        foreach (array_keys($this->mojibakeMap) as $pattern) {
            if (str_contains($text, $pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Corregir mojibake en el texto
     */
    private function fixMojibake(string $text): string
    {
        return str_replace(
            array_keys($this->mojibakeMap),
            array_values($this->mojibakeMap),
            $text
        );
    }

    /**
     * Sanitizar input para corregir problemas de encoding
     */
    private function sanitizeInput(Request $request): void
    {
        $input = $request->all();
        
        if (!empty($input)) {
            $sanitized = $this->sanitizeArray($input);
            $request->merge($sanitized);
        }
    }

    /**
     * Sanitizar array recursivamente
     */
    private function sanitizeArray(array $array): array
    {
        $result = [];
        
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $result[$key] = $this->sanitizeArray($value);
            } elseif (is_string($value)) {
                $result[$key] = $this->sanitizeString($value);
            } else {
                $result[$key] = $value;
            }
        }
        
        return $result;
    }

    /**
     * Sanitizar string individual
     * Corrige double-encoding y normaliza a UTF-8
     */
    private function sanitizeString(string $value): string
    {
        // Primero intentar corregir mojibake
        if ($this->hasMojibake($value)) {
            $value = $this->fixMojibake($value);
        }
        
        // Si ya es UTF-8 válido, retornar
        if (mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        // Intentar detectar y convertir encoding
        $detected = mb_detect_encoding($value, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
        
        if ($detected && $detected !== 'UTF-8') {
            return mb_convert_encoding($value, 'UTF-8', $detected);
        }

        // Forzar conversión desde ISO-8859-1 (común en datos corruptos)
        return mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1');
    }
}
