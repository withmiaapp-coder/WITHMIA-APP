<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Validates webhook signatures using HMAC-SHA256.
 *
 * Usage in routes:
 *   ->middleware('webhook.hmac:chatwoot')  — uses CHATWOOT_WEBHOOK_SECRET env
 *   ->middleware('webhook.hmac:evolution') — uses EVOLUTION_WEBHOOK_SECRET env
 *
 * The webhook source must send a signature header:
 *   X-Hub-Signature-256: sha256=<hmac>
 *   or X-Webhook-Signature: <hmac>
 *
 * If no secret is configured, the middleware allows the request through
 * (graceful degradation for migration period).
 */
class ValidateWebhookSignature
{
    public function handle(Request $request, Closure $next, string $source = 'default')
    {
        $secret = match ($source) {
            'chatwoot' => config('chatwoot.webhook_secret'),
            'evolution' => config('evolution.webhook_secret'),
            default => env(strtoupper($source) . '_WEBHOOK_SECRET'),
        };

        // No secret configured → allow through (graceful degradation)
        // Evolution API doesn't send HMAC signatures by default,
        // so we can't reject requests without a secret configured.
        if (empty($secret)) {
            Log::debug('Webhook allowed: no secret configured for source (skipping HMAC)', [
                'source' => $source,
            ]);
            return $next($request);
        }

        // Extract signature from known headers
        $signature = $request->header('X-Hub-Signature-256')
            ?? $request->header('X-Webhook-Signature')
            ?? $request->header('X-Signature');

        if (empty($signature)) {
            Log::warning('Webhook rejected: missing signature header', [
                'source' => $source,
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);
            return response()->json(['error' => 'Missing webhook signature'], 401);
        }

        // Remove "sha256=" prefix if present
        $signature = str_replace('sha256=', '', $signature);

        // Compute expected HMAC
        $payload = $request->getContent();
        $expected = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expected, $signature)) {
            Log::warning('Webhook rejected: invalid signature', [
                'source' => $source,
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);
            return response()->json(['error' => 'Invalid webhook signature'], 403);
        }

        return $next($request);
    }
}
