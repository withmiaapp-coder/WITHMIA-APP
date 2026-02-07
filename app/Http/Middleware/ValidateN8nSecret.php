<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateN8nSecret
{
    /**
     * Validate the X-N8N-Secret header or secret_token param.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('X-N8N-Secret') ?? $request->input('secret_token') ?? $request->query('secret');
        
        if (!$token || $token !== config('n8n.webhook_secret')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
