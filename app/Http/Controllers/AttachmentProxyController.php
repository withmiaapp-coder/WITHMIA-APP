<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Controlador dedicado para proxy de attachments de Chatwoot
 * No requiere autenticación - la validación es por URL
 */
class AttachmentProxyController extends Controller
{
    /**
     * Proxy para archivos/imágenes de Chatwoot
     * Evita problemas de CORS al cargar imágenes desde Active Storage de Rails
     */
    public function proxy(Request $request)
    {
        try {
            $url = $request->input('url');
            
            Log::info('AttachmentProxy: Request recibido', [
                'url' => $url,
                'all_params' => $request->all(),
                'query_string' => $request->getQueryString()
            ]);
            
            if (!$url) {
                Log::warning('AttachmentProxy: URL vacía');
                return response()->json(['error' => 'URL requerida'], 400);
            }

            // Validar que la URL sea de Chatwoot (puede tener diferentes subdominios en Railway)
            $urlHost = parse_url($url, PHP_URL_HOST);
            
            // Permitir cualquier URL de Chatwoot en Railway
            $isValidChatwootUrl = (
                $urlHost && str_contains($urlHost, 'chatwoot') && str_contains($urlHost, 'railway.app')
            );
            
            if (!$isValidChatwootUrl) {
                Log::warning('Intento de proxy a URL no autorizada', [
                    'url' => $url,
                    'actual_host' => $urlHost
                ]);
                return response()->json(['error' => 'URL no autorizada'], 403);
            }

            // Active Storage de Rails usa redirecciones, necesitamos seguirlas
            try {
                $response = Http::withOptions([
                    'allow_redirects' => [
                        'max' => 5,
                        'strict' => false,
                        'referer' => true,
                        'protocols' => ['http', 'https'],
                        'track_redirects' => true
                    ],
                    'verify' => false,
                    'http_errors' => false,
                ])
                ->timeout(15)
                ->get($url);
            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                Log::warning('Servidor Chatwoot no disponible', [
                    'url' => $url,
                    'error' => $e->getMessage()
                ]);
                return response()->json(['error' => 'Servidor no disponible'], 404);
            }

            // Si el servidor devuelve error, retornar 404
            if (!$response->successful()) {
                Log::info('Archivo no encontrado en Chatwoot', [
                    'url' => $url,
                    'status' => $response->status()
                ]);
                return response()->json(['error' => 'Archivo no disponible'], 404);
            }

            // Detectar el tipo de contenido
            $contentType = $response->header('Content-Type') ?? 'application/octet-stream';
            
            // Si es HTML, probablemente es un error
            if (str_contains($contentType, 'text/html')) {
                Log::warning('Respuesta HTML en lugar de archivo', [
                    'url' => $url,
                    'content_type' => $contentType
                ]);
                return response()->json(['error' => 'Archivo no disponible'], 404);
            }
            
            // Retornar el archivo con el tipo de contenido correcto
            return response($response->body())
                ->header('Content-Type', $contentType)
                ->header('Cache-Control', 'public, max-age=86400')
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            Log::error('Error en proxy de attachment', [
                'url' => $request->input('url'),
                'error' => $e->getMessage()
            ]);
            
            return response()->json(['error' => 'Archivo no disponible'], 404);
        }
    }
}
