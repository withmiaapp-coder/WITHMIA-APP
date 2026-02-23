<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ChannelOAuthController extends Controller
{
    private string $graphVersion;

    public function __construct()
    {
        $this->graphVersion = config('services.facebook.graph_version', 'v20.0');
    }

    /**
     * Returns the Facebook/Instagram OAuth URL for the frontend popup.
     * GET /api/channels/oauth/{channel}/auth-url
     */
    public function getAuthUrl(Request $request, string $channel): JsonResponse
    {
        $appId = config('services.facebook.app_id');

        if (!$appId) {
            return response()->json([
                'error' => 'Facebook App no configurada. Configura FACEBOOK_APP_ID y FACEBOOK_APP_SECRET en las variables de entorno.',
            ], 422);
        }

        $state = encrypt(json_encode([
            'user_id' => $request->user()->id,
            'channel' => $channel,
            'ts' => time(),
        ]));

        $redirectUri = rtrim(config('app.url'), '/') . '/channels/oauth/callback';

        $scopes = match ($channel) {
            'messenger' => 'pages_messaging,pages_manage_metadata,pages_show_list,pages_read_engagement',
            'instagram' => 'instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_manage_metadata,pages_read_engagement',
            'whatsapp-cloud' => 'whatsapp_business_management,whatsapp_business_messaging,business_management',
            default => null,
        };

        if (!$scopes) {
            return response()->json(['error' => 'Canal no soportado'], 400);
        }

        $params = [
            'client_id' => $appId,
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'scope' => $scopes,
            'response_type' => 'code',
        ];

        // WhatsApp Embedded Signup requires a config_id
        if ($channel === 'whatsapp-cloud') {
            $configId = config('services.facebook.whatsapp_config_id');
            if ($configId) {
                $params['config_id'] = $configId;
                $params['override_default_response_type'] = 'true';
            }
        }

        $url = "https://www.facebook.com/{$this->graphVersion}/dialog/oauth?" . http_build_query($params);

        return response()->json(['auth_url' => $url]);
    }

    /**
     * Facebook redirects the popup here after user authorization.
     * GET /channels/oauth/callback (public web route)
     */
    public function callback(Request $request): \Illuminate\Contracts\View\View
    {
        // Handle errors / cancellation from Facebook
        if ($request->has('error')) {
            return $this->renderError($request->query('error_description', 'Autorización cancelada'));
        }

        $code = $request->query('code');
        if (!$code) {
            return $this->renderError('No se recibió código de autorización de Facebook.');
        }

        // Decrypt and validate state
        try {
            $state = json_decode(decrypt($request->query('state')), true);
        } catch (\Throwable $e) {
            Log::warning('OAuth callback: Invalid state', ['error' => $e->getMessage()]);
            return $this->renderError('Parámetro de estado inválido. Intenta de nuevo.');
        }

        // State must not be older than 10 minutes
        if (time() - ($state['ts'] ?? 0) > 600) {
            return $this->renderError('La autorización ha expirado. Intenta de nuevo.');
        }

        $channel = $state['channel'];
        $userId = $state['user_id'];
        $redirectUri = rtrim(config('app.url'), '/') . '/channels/oauth/callback';

        // ── Step 1: Exchange code for short-lived access token ──
        $tokenResponse = Http::timeout(15)->get(
            "https://graph.facebook.com/{$this->graphVersion}/oauth/access_token",
            [
                'client_id' => config('services.facebook.app_id'),
                'client_secret' => config('services.facebook.app_secret'),
                'code' => $code,
                'redirect_uri' => $redirectUri,
            ]
        );

        if (!$tokenResponse->successful()) {
            Log::error('OAuth: Token exchange failed', [
                'status' => $tokenResponse->status(),
                'body' => $tokenResponse->body(),
            ]);
            return $this->renderError('Error al obtener token de Facebook. Verifica la configuración de la app.');
        }

        $shortToken = $tokenResponse->json('access_token');

        // ── Step 2: Exchange for long-lived token (60 days) ──
        $longTokenResponse = Http::timeout(15)->get(
            "https://graph.facebook.com/{$this->graphVersion}/oauth/access_token",
            [
                'grant_type' => 'fb_exchange_token',
                'client_id' => config('services.facebook.app_id'),
                'client_secret' => config('services.facebook.app_secret'),
                'fb_exchange_token' => $shortToken,
            ]
        );

        $userAccessToken = $longTokenResponse->successful()
            ? $longTokenResponse->json('access_token')
            : $shortToken;

        // ── Step 3: Route to channel-specific handler ──
        if ($channel === 'whatsapp-cloud') {
            return $this->handleWhatsAppOAuth($userAccessToken, $userId);
        }

        return $this->handlePageBasedOAuth($userAccessToken, $userId, $channel);
    }

    // ─── Channel Handlers ──────────────────────────────────────

    /**
     * Messenger / Instagram: Get user's pages and render page selector.
     */
    private function handlePageBasedOAuth(string $userAccessToken, int $userId, string $channel)
    {
        // Debug: check what permissions the token actually has
        $debugResponse = Http::timeout(10)->get(
            "https://graph.facebook.com/{$this->graphVersion}/me/permissions",
            ['access_token' => $userAccessToken]
        );
        Log::info('OAuth: Token permissions', ['permissions' => $debugResponse->json()]);

        $pagesResponse = Http::timeout(15)->get(
            "https://graph.facebook.com/{$this->graphVersion}/me/accounts",
            [
                'access_token' => $userAccessToken,
                'fields' => 'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}',
                'limit' => 100,
            ]
        );

        Log::info('OAuth: /me/accounts response', [
            'status' => $pagesResponse->status(),
            'body' => $pagesResponse->json(),
        ]);

        if (!$pagesResponse->successful()) {
            Log::error('OAuth: Pages fetch failed', ['body' => $pagesResponse->body()]);
            return $this->renderError('No se pudieron obtener las páginas de Facebook.');
        }

        $pages = $pagesResponse->json('data', []);

        if (empty($pages)) {
            return $this->renderError(
                'No se encontraron páginas de Facebook autorizadas. '
                . 'Asegúrate de seleccionar al menos una página durante la autorización.'
            );
        }

        // For Instagram, only show pages with linked IG business accounts
        if ($channel === 'instagram') {
            $igPages = array_values(array_filter(
                $pages,
                fn($p) => !empty($p['instagram_business_account']['id'])
            ));

            if (empty($igPages)) {
                return $this->renderError(
                    'Ninguna de tus páginas tiene una cuenta de Instagram Business vinculada. '
                    . 'Primero vincula tu cuenta de Instagram a una Página de Facebook desde la app de Instagram → Configuración → Cuenta → Cuentas vinculadas.'
                );
            }

            $pages = $igPages;
        }

        Log::info('OAuth: Pages loaded for selection', [
            'user_id' => $userId,
            'channel' => $channel,
            'page_count' => count($pages),
        ]);

        return view('oauth.callback', [
            'success' => true,
            'pages' => $pages,
            'phones' => [],
            'channel' => $channel,
            'appUrl' => config('app.url'),
            'userAccessToken' => $userAccessToken,
        ]);
    }

    /**
     * WhatsApp Cloud: Get WABA and phone numbers from Embedded Signup.
     */
    private function handleWhatsAppOAuth(string $accessToken, int $userId)
    {
        // Use debug_token to find shared WABA IDs from the Embedded Signup
        $debugResponse = Http::timeout(15)->get(
            "https://graph.facebook.com/{$this->graphVersion}/debug_token",
            [
                'input_token' => $accessToken,
                'access_token' => config('services.facebook.app_id') . '|' . config('services.facebook.app_secret'),
            ]
        );

        $wabaId = null;

        if ($debugResponse->successful()) {
            $granularScopes = $debugResponse->json('data.granular_scopes', []);
            foreach ($granularScopes as $scope) {
                if ($scope['permission'] === 'whatsapp_business_management') {
                    $wabaId = $scope['target_ids'][0] ?? null;
                    break;
                }
            }
        }

        if (!$wabaId) {
            Log::warning('OAuth WA: Could not determine WABA ID', [
                'user_id' => $userId,
                'debug_response' => $debugResponse->json(),
            ]);
            return $this->renderError(
                'No se pudo determinar la cuenta de WhatsApp Business. '
                . 'Asegúrate de completar el registro de WhatsApp Business en el flujo de Facebook.'
            );
        }

        // Get phone numbers registered to this WABA
        $phonesResponse = Http::timeout(15)->get(
            "https://graph.facebook.com/{$this->graphVersion}/{$wabaId}/phone_numbers",
            [
                'access_token' => $accessToken,
                'fields' => 'id,display_phone_number,verified_name,quality_rating',
            ]
        );

        $phones = $phonesResponse->json('data', []);

        if (empty($phones)) {
            return $this->renderError(
                'No se encontraron números de teléfono registrados en la cuenta de WhatsApp Business. '
                . 'Agrega un número de teléfono en el flujo de configuración de WhatsApp.'
            );
        }

        Log::info('OAuth WA: Phone numbers loaded', [
            'user_id' => $userId,
            'waba_id' => $wabaId,
            'phone_count' => count($phones),
        ]);

        return view('oauth.callback', [
            'success' => true,
            'channel' => 'whatsapp-cloud',
            'phones' => $phones,
            'pages' => [],
            'wabaId' => $wabaId,
            'accessToken' => $accessToken,
            'appUrl' => config('app.url'),
        ]);
    }

    // ─── Helpers ───────────────────────────────────────────────

    private function renderError(string $message)
    {
        return view('oauth.callback', [
            'success' => false,
            'error' => $message,
            'pages' => [],
            'phones' => [],
            'channel' => '',
            'appUrl' => config('app.url'),
        ]);
    }
}
