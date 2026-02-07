<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ImageProxyController extends Controller
{
    /**
     * Proxy images from Chatwoot Railway to avoid CORS/SSL issues.
     * Returns an SVG placeholder if the image can't be fetched.
     */
    public function proxy(Request $request)
    {
        $request->validate([
            'url' => 'nullable|url',
            'name' => 'nullable|string|max:255',
        ]);

        $url = $request->input('url');
        $contactName = $request->input('name', '?');

        if (!$url) {
            return $this->generatePlaceholder($contactName);
        }

        // Only allow Chatwoot URLs matching configured host
        $host = parse_url($url, PHP_URL_HOST);
        $chatwootHost = parse_url(config('chatwoot.url'), PHP_URL_HOST);
        if (!$host || !$chatwootHost || $host !== $chatwootHost) {
            return $this->generatePlaceholder($contactName);
        }

        try {
            $response = Http::timeout(config('services.timeouts.default', 10))
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept' => 'image/*,*/*',
                ])
                ->get($url);

            if ($response->failed() || empty($response->body()) || str_contains($response->header('Content-Type') ?? '', 'text/html')) {
                return $this->generatePlaceholder($contactName);
            }

            return response($response->body())
                ->header('Content-Type', $response->header('Content-Type') ?: 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=86400')
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            Log::debug("IMG-PROXY: Exception", ['error' => $e->getMessage()]);
            return $this->generatePlaceholder($contactName);
        }
    }

    /**
     * Generate an SVG placeholder with the contact's initial.
     */
    private function generatePlaceholder(string $name = '?')
    {
        $initial = mb_strtoupper(mb_substr($name, 0, 1, 'UTF-8'), 'UTF-8');
        if (empty($initial) || preg_match('/^[\x00-\x1F\x7F]/', $initial)) {
            $initial = '?';
        }
        $colors = ['4F46E5', '7C3AED', '2563EB', '059669', 'DC2626', 'EA580C'];
        $color = $colors[ord($initial) % count($colors)];

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#{$color}"/>
  <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">{$initial}</text>
</svg>
SVG;

        return response($svg)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Cache-Control', 'public, max-age=3600')
            ->header('Access-Control-Allow-Origin', '*');
    }
}
