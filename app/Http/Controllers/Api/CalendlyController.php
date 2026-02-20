<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarIntegration;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CalendlyController extends Controller
{
    private const PROVIDER = 'calendly';

    private const SCOPES = 'default';

    // ==========================================
    // OAUTH FLOW
    // ==========================================

    /**
     * Generar URL de autorización para Calendly OAuth.
     */
    public function getAuthUrl(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $clientId = config('services.calendly.client_id');
        if (empty($clientId)) {
            return response()->json(['error' => 'Calendly not configured'], 500);
        }

        $nonce = Str::random(40);
        $state = base64_encode(json_encode(['uid' => $user->id, 'nonce' => $nonce]));
        \Cache::put("calendly_oauth_state:{$user->id}", $nonce, 600);

        $params = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $this->getRedirectUri(),
            'response_type' => 'code',
            'state' => $state,
        ]);

        return response()->json([
            'auth_url' => 'https://auth.calendly.com/oauth/authorize?' . $params,
        ]);
    }

    /**
     * Callback GET — Calendly redirige aquí tras autorización.
     */
    public function handleCallbackGet(Request $request)
    {
        $code = $request->query('code');
        $state = $request->query('state');
        $error = $request->query('error');

        if ($error) {
            return $this->renderPopupClose(false, 'El usuario canceló la autorización');
        }

        if (empty($code) || empty($state)) {
            return $this->renderPopupClose(false, 'Parámetros inválidos');
        }

        try {
            $stateData = json_decode(base64_decode($state), true);
            $userId = $stateData['uid'] ?? null;
            $nonce = $stateData['nonce'] ?? null;
        } catch (\Throwable $e) {
            return $this->renderPopupClose(false, 'State inválido');
        }

        if (!$userId || !$nonce) {
            return $this->renderPopupClose(false, 'State inválido');
        }

        $savedNonce = \Cache::pull("calendly_oauth_state:{$userId}");
        if ($nonce !== $savedNonce) {
            return $this->renderPopupClose(false, 'Token de seguridad expirado');
        }

        $user = \App\Models\User::find($userId);
        if (!$user) {
            return $this->renderPopupClose(false, 'Usuario no encontrado');
        }

        try {
            // Exchange code for tokens
            $tokenResponse = Http::asForm()->post('https://auth.calendly.com/oauth/token', [
                'client_id' => config('services.calendly.client_id'),
                'client_secret' => config('services.calendly.client_secret'),
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $this->getRedirectUri(),
            ]);

            if (!$tokenResponse->successful()) {
                Log::error('[Calendly] Token exchange failed', [
                    'status' => $tokenResponse->status(),
                    'body' => $tokenResponse->body(),
                ]);
                return $this->renderPopupClose(false, 'Error al intercambiar código');
            }

            $tokens = $tokenResponse->json();
            $accessToken = $tokens['access_token'];
            $refreshToken = $tokens['refresh_token'] ?? null;
            $expiresIn = $tokens['expires_in'] ?? 7200;

            // Get user info from Calendly
            $userInfo = Http::withToken($accessToken)
                ->get('https://api.calendly.com/users/me');

            $calendlyEmail = null;
            $calendlyUri = null;
            if ($userInfo->successful()) {
                $resource = $userInfo->json()['resource'] ?? [];
                $calendlyEmail = $resource['email'] ?? null;
                $calendlyUri = $resource['uri'] ?? null;
            }

            $company = Company::where('slug', $user->company_slug)->first();
            if (!$company) {
                return $this->renderPopupClose(false, 'Empresa no encontrada');
            }

            CalendarIntegration::updateOrCreate(
                ['user_id' => $user->id, 'provider' => self::PROVIDER],
                [
                    'company_id' => $company->id,
                    'provider_email' => $calendlyEmail,
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_expires_at' => now()->addSeconds($expiresIn),
                    'scopes' => [self::SCOPES],
                    'settings' => ['calendly_user_uri' => $calendlyUri],
                    'is_active' => true,
                    'last_sync_at' => now(),
                ]
            );

            Log::info('[Calendly] Connected', ['user_id' => $user->id, 'email' => $calendlyEmail]);
            return $this->renderPopupClose(true, 'Calendly conectado correctamente');

        } catch (\Throwable $e) {
            Log::error('[Calendly] OAuth error', ['error' => $e->getMessage()]);
            return $this->renderPopupClose(false, 'Error de autenticación');
        }
    }

    /**
     * Desconectar Calendly.
     */
    public function disconnect(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', self::PROVIDER)->first();

        if (!$integration) {
            return response()->json(['error' => 'No integration found'], 404);
        }

        $integration->delete();
        Log::info('[Calendly] Disconnected', ['user_id' => $user->id]);
        return response()->json(['success' => true]);
    }

    // ==========================================
    // STATUS & SETTINGS
    // ==========================================

    public function status(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', self::PROVIDER)->first();

        return response()->json([
            'connected' => $integration ? $integration->isConnected() : false,
            'integration' => $integration ? $this->formatIntegration($integration) : null,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', self::PROVIDER)->first();

        if (!$integration) {
            return response()->json(['error' => 'No integration found'], 404);
        }

        $validated = $request->validate([
            'bot_access_enabled' => 'nullable|boolean',
            'settings' => 'nullable|array',
        ]);

        if (isset($validated['bot_access_enabled'])) {
            $integration->bot_access_enabled = $validated['bot_access_enabled'];
        }
        if (isset($validated['settings'])) {
            $integration->settings = array_merge($integration->settings ?? [], $validated['settings']);
        }
        $integration->save();

        return response()->json([
            'success' => true,
            'integration' => $this->formatIntegration($integration),
        ]);
    }

    // ==========================================
    // CALENDLY DATA
    // ==========================================

    /**
     * Listar tipos de evento de Calendly.
     */
    public function listEventTypes(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Calendly not connected'], 400);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        $userUri = $integration->settings['calendly_user_uri'] ?? null;
        if (!$userUri) {
            return response()->json(['error' => 'Calendly user URI not found'], 400);
        }

        try {
            $response = Http::withToken($accessToken)
                ->get('https://api.calendly.com/event_types', [
                    'user' => $userUri,
                    'active' => 'true',
                ]);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch event types'], 502);
            }

            $eventTypes = collect($response->json()['collection'] ?? [])->map(fn($et) => [
                'uri' => $et['uri'],
                'name' => $et['name'] ?? '',
                'slug' => $et['slug'] ?? '',
                'duration' => $et['duration'] ?? 0,
                'scheduling_url' => $et['scheduling_url'] ?? '',
                'active' => $et['active'] ?? false,
                'color' => $et['color'] ?? '#006BFF',
            ]);

            return response()->json(['event_types' => $eventTypes]);
        } catch (\Throwable $e) {
            Log::error('[Calendly] List event types error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Obtener eventos agendados.
     */
    public function getEvents(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Calendly not connected'], 400);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        $userUri = $integration->settings['calendly_user_uri'] ?? null;
        if (!$userUri) {
            return response()->json(['error' => 'Calendly user URI not found'], 400);
        }

        $minDate = $request->input('min_date', now()->startOfMonth()->toIso8601String());
        $maxDate = $request->input('max_date', now()->endOfMonth()->addDays(7)->toIso8601String());

        try {
            $response = Http::withToken($accessToken)
                ->get('https://api.calendly.com/scheduled_events', [
                    'user' => $userUri,
                    'min_start_time' => $minDate,
                    'max_start_time' => $maxDate,
                    'status' => 'active',
                    'sort' => 'start_time:asc',
                    'count' => 100,
                ]);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch events'], 502);
            }

            $events = collect($response->json()['collection'] ?? [])->map(fn($ev) => [
                'uri' => $ev['uri'],
                'name' => $ev['name'] ?? '',
                'start' => $ev['start_time'] ?? null,
                'end' => $ev['end_time'] ?? null,
                'status' => $ev['status'] ?? '',
                'location' => $ev['location']['location'] ?? '',
                'event_type' => $ev['event_type'] ?? '',
            ]);

            return response()->json(['events' => $events]);
        } catch (\Throwable $e) {
            Log::error('[Calendly] Get events error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    // ==========================================
    // BOT ACCESS (para n8n workflows)
    // ==========================================

    /**
     * Bot obtiene link de agendamiento y disponibilidad.
     */
    public function botGetAvailability(Request $request)
    {
        $companySlug = $request->input('company_slug');
        if (!$companySlug) {
            return response()->json(['error' => 'company_slug required'], 400);
        }

        $company = Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        $integration = CalendarIntegration::where('company_id', $company->id)
            ->where('provider', self::PROVIDER)
            ->where('bot_access_enabled', true)
            ->where('is_active', true)
            ->first();

        if (!$integration) {
            return response()->json([
                'available' => false,
                'message' => 'No Calendly integration with bot access enabled',
            ]);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['available' => false, 'message' => 'Token expired']);
        }

        $userUri = $integration->settings['calendly_user_uri'] ?? null;
        if (!$userUri) {
            return response()->json(['available' => false, 'message' => 'User URI not found']);
        }

        try {
            // Get active event types with scheduling links
            $response = Http::withToken($accessToken)
                ->get('https://api.calendly.com/event_types', [
                    'user' => $userUri,
                    'active' => 'true',
                ]);

            $eventTypes = [];
            if ($response->successful()) {
                $eventTypes = collect($response->json()['collection'] ?? [])->map(fn($et) => [
                    'name' => $et['name'] ?? '',
                    'duration' => $et['duration'] ?? 0,
                    'scheduling_url' => $et['scheduling_url'] ?? '',
                ])->toArray();
            }

            // Get upcoming scheduled events
            $eventsResponse = Http::withToken($accessToken)
                ->get('https://api.calendly.com/scheduled_events', [
                    'user' => $userUri,
                    'min_start_time' => now()->toIso8601String(),
                    'max_start_time' => now()->addDays(14)->toIso8601String(),
                    'status' => 'active',
                    'sort' => 'start_time:asc',
                    'count' => 30,
                ]);

            $upcomingEvents = [];
            if ($eventsResponse->successful()) {
                $upcomingEvents = collect($eventsResponse->json()['collection'] ?? [])->map(fn($ev) => [
                    'name' => $ev['name'] ?? '',
                    'start' => $ev['start_time'] ?? null,
                    'end' => $ev['end_time'] ?? null,
                ])->toArray();
            }

            return response()->json([
                'available' => true,
                'provider' => 'calendly',
                'calendar_owner' => $integration->provider_email,
                'event_types' => $eventTypes,
                'upcoming_events' => $upcomingEvents,
                'message' => 'Envía el link de agendamiento correspondiente al cliente para que elija su horario.',
            ]);

        } catch (\Throwable $e) {
            Log::error('[Calendly] Bot availability error', ['error' => $e->getMessage()]);
            return response()->json(['available' => false, 'message' => 'Error']);
        }
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private function getRedirectUri(): string
    {
        return config('services.calendly.redirect_uri',
            rtrim(config('app.url'), '/') . '/api/calendly/callback'
        );
    }

    private function getIntegration(Request $request): ?CalendarIntegration
    {
        $user = $request->user();
        return CalendarIntegration::where('user_id', $user->id)
            ->where('provider', self::PROVIDER)->first();
    }

    private function getValidToken(CalendarIntegration $integration): ?string
    {
        if (!$integration->isConnected()) return null;
        if (!$integration->isTokenExpired()) return $integration->access_token;
        return $this->refreshToken($integration);
    }

    private function refreshToken(CalendarIntegration $integration): ?string
    {
        if (empty($integration->refresh_token)) return null;

        try {
            $response = Http::asForm()->post('https://auth.calendly.com/oauth/token', [
                'client_id' => config('services.calendly.client_id'),
                'client_secret' => config('services.calendly.client_secret'),
                'refresh_token' => $integration->refresh_token,
                'grant_type' => 'refresh_token',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $integration->update([
                    'access_token' => $data['access_token'],
                    'refresh_token' => $data['refresh_token'] ?? $integration->refresh_token,
                    'token_expires_at' => now()->addSeconds($data['expires_in'] ?? 7200),
                ]);
                return $data['access_token'];
            }
            return null;
        } catch (\Throwable $e) {
            Log::error('[Calendly] Token refresh error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function formatIntegration(CalendarIntegration $integration): array
    {
        return [
            'id' => $integration->id,
            'provider' => $integration->provider,
            'provider_email' => $integration->provider_email,
            'is_active' => $integration->is_active,
            'is_connected' => $integration->isConnected(),
            'bot_access_enabled' => $integration->bot_access_enabled,
            'settings' => $integration->settings,
            'last_sync_at' => $integration->last_sync_at?->toISOString(),
            'created_at' => $integration->created_at?->toISOString(),
        ];
    }

    private function renderPopupClose(bool $success, string $message): \Illuminate\Http\Response
    {
        $status = $success ? 'success' : 'error';
        $emoji = $success ? '✅' : '❌';
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head><title>Calendly - WITHMIA</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#f9fafb;">
<div style="text-align:center;padding:2rem;">
<div style="font-size:3rem;margin-bottom:1rem;">{$emoji}</div>
<h2 style="color:#1f2937;margin-bottom:0.5rem;">{$message}</h2>
<p style="color:#6b7280;font-size:0.875rem;">Esta ventana se cerrará automáticamente...</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'calendly_oauth_result', status: '{$status}', message: '{$message}' }, '*');
  }
  setTimeout(function() { window.close(); }, 2000);
</script>
</body>
</html>
HTML;
        return response($html, 200)->header('Content-Type', 'text/html');
    }
}
