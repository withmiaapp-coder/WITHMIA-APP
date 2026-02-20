<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarIntegration;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OutlookCalendarController extends Controller
{
    private const PROVIDER = 'outlook';

    private const SCOPES = 'openid profile email offline_access Calendars.ReadWrite';

    // ==========================================
    // OAUTH FLOW (Microsoft Identity Platform v2)
    // ==========================================

    public function getAuthUrl(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $clientId = config('services.microsoft.client_id');
        if (empty($clientId)) {
            return response()->json(['error' => 'Outlook Calendar not configured'], 500);
        }

        $nonce = Str::random(40);
        $state = base64_encode(json_encode(['uid' => $user->id, 'nonce' => $nonce]));
        \Cache::put("outlook_oauth_state:{$user->id}", $nonce, 600);

        $params = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $this->getRedirectUri(),
            'response_type' => 'code',
            'scope' => self::SCOPES,
            'state' => $state,
            'response_mode' => 'query',
            'prompt' => 'consent',
            'login_hint' => $user->email,
        ]);

        return response()->json([
            'auth_url' => 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' . $params,
        ]);
    }

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

        $savedNonce = \Cache::pull("outlook_oauth_state:{$userId}");
        if ($nonce !== $savedNonce) {
            return $this->renderPopupClose(false, 'Token de seguridad expirado');
        }

        $user = \App\Models\User::find($userId);
        if (!$user) {
            return $this->renderPopupClose(false, 'Usuario no encontrado');
        }

        try {
            $tokenResponse = Http::asForm()->post('https://login.microsoftonline.com/common/oauth2/v2.0/token', [
                'client_id' => config('services.microsoft.client_id'),
                'client_secret' => config('services.microsoft.client_secret'),
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $this->getRedirectUri(),
                'scope' => self::SCOPES,
            ]);

            if (!$tokenResponse->successful()) {
                Log::error('[Outlook] Token exchange failed', [
                    'status' => $tokenResponse->status(),
                    'body' => $tokenResponse->body(),
                ]);
                return $this->renderPopupClose(false, 'Error al intercambiar código');
            }

            $tokens = $tokenResponse->json();
            $accessToken = $tokens['access_token'];
            $refreshToken = $tokens['refresh_token'] ?? null;
            $expiresIn = $tokens['expires_in'] ?? 3600;

            // Get Microsoft user profile
            $profileResponse = Http::withToken($accessToken)
                ->get('https://graph.microsoft.com/v1.0/me');

            $msEmail = null;
            if ($profileResponse->successful()) {
                $profile = $profileResponse->json();
                $msEmail = $profile['mail'] ?? $profile['userPrincipalName'] ?? null;
            }

            $company = Company::where('slug', $user->company_slug)->first();
            if (!$company) {
                return $this->renderPopupClose(false, 'Empresa no encontrada');
            }

            CalendarIntegration::updateOrCreate(
                ['user_id' => $user->id, 'provider' => self::PROVIDER],
                [
                    'company_id' => $company->id,
                    'provider_email' => $msEmail,
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_expires_at' => now()->addSeconds($expiresIn),
                    'scopes' => explode(' ', self::SCOPES),
                    'is_active' => true,
                    'last_sync_at' => now(),
                ]
            );

            Log::info('[Outlook] Connected', ['user_id' => $user->id, 'email' => $msEmail]);
            return $this->renderPopupClose(true, 'Outlook Calendar conectado correctamente');

        } catch (\Throwable $e) {
            Log::error('[Outlook] OAuth error', ['error' => $e->getMessage()]);
            return $this->renderPopupClose(false, 'Error de autenticación');
        }
    }

    public function disconnect(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', self::PROVIDER)->first();

        if (!$integration) {
            return response()->json(['error' => 'No integration found'], 404);
        }

        $integration->delete();
        Log::info('[Outlook] Disconnected', ['user_id' => $user->id]);
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
            'selected_calendar_id' => 'nullable|string',
            'bot_access_enabled' => 'nullable|boolean',
            'settings' => 'nullable|array',
        ]);

        if (isset($validated['selected_calendar_id'])) {
            $integration->selected_calendar_id = $validated['selected_calendar_id'];
        }
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
    // CALENDAR DATA (Microsoft Graph API)
    // ==========================================

    public function listCalendars(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Outlook not connected'], 400);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        try {
            $response = Http::withToken($accessToken)
                ->get('https://graph.microsoft.com/v1.0/me/calendars');

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch calendars'], 502);
            }

            $calendars = collect($response->json()['value'] ?? [])->map(fn($cal) => [
                'id' => $cal['id'],
                'name' => $cal['name'] ?? 'Sin nombre',
                'color' => $cal['hexColor'] ?? '#0078D4',
                'isDefaultCalendar' => $cal['isDefaultCalendar'] ?? false,
                'canEdit' => $cal['canEdit'] ?? false,
            ]);

            return response()->json(['calendars' => $calendars]);
        } catch (\Throwable $e) {
            Log::error('[Outlook] List calendars error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    public function getEvents(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Outlook not connected'], 400);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        $calendarId = $request->input('calendar_id', $integration->selected_calendar_id);
        $startDateTime = $request->input('start', now()->startOfMonth()->toIso8601String());
        $endDateTime = $request->input('end', now()->endOfMonth()->addDays(7)->toIso8601String());

        $url = $calendarId
            ? "https://graph.microsoft.com/v1.0/me/calendars/{$calendarId}/calendarView"
            : 'https://graph.microsoft.com/v1.0/me/calendarView';

        try {
            $response = Http::withToken($accessToken)
                ->get($url, [
                    'startDateTime' => $startDateTime,
                    'endDateTime' => $endDateTime,
                    '$top' => 250,
                    '$orderby' => 'start/dateTime',
                    '$select' => 'id,subject,body,start,end,location,attendees,isAllDay,webLink,onlineMeeting',
                ]);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch events'], 502);
            }

            $events = collect($response->json()['value'] ?? [])->map(fn($event) => [
                'id' => $event['id'],
                'title' => $event['subject'] ?? '(Sin título)',
                'start' => $event['start']['dateTime'] ?? null,
                'end' => $event['end']['dateTime'] ?? null,
                'allDay' => $event['isAllDay'] ?? false,
                'location' => $event['location']['displayName'] ?? '',
                'webLink' => $event['webLink'] ?? null,
                'onlineMeetingUrl' => $event['onlineMeeting']['joinUrl'] ?? null,
                'attendees' => collect($event['attendees'] ?? [])->map(fn($a) => [
                    'email' => $a['emailAddress']['address'] ?? '',
                    'name' => $a['emailAddress']['name'] ?? '',
                    'status' => $a['status']['response'] ?? 'none',
                ])->toArray(),
            ]);

            return response()->json(['events' => $events]);
        } catch (\Throwable $e) {
            Log::error('[Outlook] Get events error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    public function createEvent(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Outlook not connected'], 400);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:500',
            'description' => 'nullable|string|max:2000',
            'location' => 'nullable|string|max:500',
            'start' => 'required|string',
            'end' => 'required|string',
            'all_day' => 'nullable|boolean',
            'attendees' => 'nullable|array',
            'attendees.*.email' => 'email',
            'calendar_id' => 'nullable|string',
        ]);

        $calendarId = $validated['calendar_id'] ?? $integration->selected_calendar_id;
        $timezone = $request->user()->company?->timezone ?? 'America/Santiago';

        $eventBody = [
            'subject' => $validated['title'],
            'body' => [
                'contentType' => 'text',
                'content' => $validated['description'] ?? '',
            ],
            'start' => [
                'dateTime' => $validated['start'],
                'timeZone' => $timezone,
            ],
            'end' => [
                'dateTime' => $validated['end'],
                'timeZone' => $timezone,
            ],
            'isAllDay' => $validated['all_day'] ?? false,
        ];

        if (!empty($validated['location'])) {
            $eventBody['location'] = ['displayName' => $validated['location']];
        }

        if (!empty($validated['attendees'])) {
            $eventBody['attendees'] = array_map(fn($a) => [
                'emailAddress' => ['address' => $a['email']],
                'type' => 'required',
            ], $validated['attendees']);
        }

        $url = $calendarId
            ? "https://graph.microsoft.com/v1.0/me/calendars/{$calendarId}/events"
            : 'https://graph.microsoft.com/v1.0/me/events';

        try {
            $response = Http::withToken($accessToken)
                ->post($url, $eventBody);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to create event'], 502);
            }

            $event = $response->json();
            Log::info('[Outlook] Event created', ['user_id' => $request->user()->id, 'event_id' => $event['id']]);

            return response()->json([
                'success' => true,
                'event' => [
                    'id' => $event['id'],
                    'title' => $event['subject'] ?? '',
                    'start' => $event['start']['dateTime'] ?? null,
                    'end' => $event['end']['dateTime'] ?? null,
                    'webLink' => $event['webLink'] ?? null,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('[Outlook] Create event error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    public function deleteEvent(Request $request, string $eventId)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Outlook not connected'], 400);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        try {
            $response = Http::withToken($accessToken)
                ->delete("https://graph.microsoft.com/v1.0/me/events/{$eventId}");

            if ($response->status() === 204 || $response->successful()) {
                return response()->json(['success' => true]);
            }
            return response()->json(['error' => 'Failed to delete event'], 502);
        } catch (\Throwable $e) {
            Log::error('[Outlook] Delete event error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    // ==========================================
    // BOT ACCESS
    // ==========================================

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
            return response()->json(['available' => false, 'message' => 'No Outlook integration with bot access']);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['available' => false, 'message' => 'Token expired']);
        }

        $date = $request->input('date', now()->format('Y-m-d'));
        $daysAhead = (int) $request->input('days_ahead', 7);
        $timezone = $company->timezone ?? 'America/Santiago';

        $startDateTime = \Carbon\Carbon::parse($date)->startOfDay()->toIso8601String();
        $endDateTime = \Carbon\Carbon::parse($date)->addDays($daysAhead)->endOfDay()->toIso8601String();

        try {
            // Get calendar view
            $response = Http::withToken($accessToken)
                ->get('https://graph.microsoft.com/v1.0/me/calendarView', [
                    'startDateTime' => $startDateTime,
                    'endDateTime' => $endDateTime,
                    '$top' => 50,
                    '$orderby' => 'start/dateTime',
                    '$select' => 'subject,start,end,isAllDay,showAs',
                ]);

            $events = [];
            $busySlots = [];
            if ($response->successful()) {
                foreach ($response->json()['value'] ?? [] as $event) {
                    $events[] = [
                        'title' => $event['subject'] ?? '(Ocupado)',
                        'start' => $event['start']['dateTime'] ?? null,
                        'end' => $event['end']['dateTime'] ?? null,
                        'status' => $event['showAs'] ?? 'busy',
                    ];
                    if (in_array($event['showAs'] ?? 'busy', ['busy', 'tentative', 'oof'])) {
                        $busySlots[] = [
                            'start' => $event['start']['dateTime'] ?? null,
                            'end' => $event['end']['dateTime'] ?? null,
                        ];
                    }
                }
            }

            return response()->json([
                'available' => true,
                'provider' => 'outlook',
                'calendar_owner' => $integration->provider_email,
                'timezone' => $timezone,
                'busy_slots' => $busySlots,
                'events' => $events,
                'date_range' => [
                    'from' => $date,
                    'to' => \Carbon\Carbon::parse($date)->addDays($daysAhead)->format('Y-m-d'),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('[Outlook] Bot availability error', ['error' => $e->getMessage()]);
            return response()->json(['available' => false, 'message' => 'Error fetching calendar data']);
        }
    }

    public function botCreateEvent(Request $request)
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
            return response()->json(['error' => 'No Outlook integration with bot access'], 400);
        }

        $accessToken = $this->getValidToken($integration);
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired'], 401);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:500',
            'description' => 'nullable|string|max:2000',
            'start' => 'required|string',
            'end' => 'required|string',
            'attendee_email' => 'nullable|email',
            'attendee_name' => 'nullable|string',
            'attendee_phone' => 'nullable|string',
        ]);

        $timezone = $company->timezone ?? 'America/Santiago';

        $eventBody = [
            'subject' => $validated['title'],
            'body' => [
                'contentType' => 'text',
                'content' => ($validated['description'] ?? '') .
                    (!empty($validated['attendee_phone']) ? "\n\nTeléfono: " . $validated['attendee_phone'] : '') .
                    "\n\n[Agendado por WITHMIA Bot]",
            ],
            'start' => ['dateTime' => $validated['start'], 'timeZone' => $timezone],
            'end' => ['dateTime' => $validated['end'], 'timeZone' => $timezone],
        ];

        if (!empty($validated['attendee_email'])) {
            $eventBody['attendees'] = [[
                'emailAddress' => [
                    'address' => $validated['attendee_email'],
                    'name' => $validated['attendee_name'] ?? '',
                ],
                'type' => 'required',
            ]];
        }

        try {
            $response = Http::withToken($accessToken)
                ->post('https://graph.microsoft.com/v1.0/me/events', $eventBody);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to create event'], 502);
            }

            $event = $response->json();
            Log::info('[Outlook] Bot created event', [
                'company_slug' => $companySlug,
                'event_id' => $event['id'],
            ]);

            return response()->json([
                'success' => true,
                'event_id' => $event['id'],
                'web_link' => $event['webLink'] ?? null,
                'start' => $event['start']['dateTime'] ?? null,
                'end' => $event['end']['dateTime'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::error('[Outlook] Bot create event error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private function getRedirectUri(): string
    {
        return config('services.microsoft.calendar_redirect_uri',
            rtrim(config('app.url'), '/') . '/api/outlook/callback'
        );
    }

    private function getIntegration(Request $request): ?CalendarIntegration
    {
        return CalendarIntegration::where('user_id', $request->user()->id)
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
            $response = Http::asForm()->post('https://login.microsoftonline.com/common/oauth2/v2.0/token', [
                'client_id' => config('services.microsoft.client_id'),
                'client_secret' => config('services.microsoft.client_secret'),
                'refresh_token' => $integration->refresh_token,
                'grant_type' => 'refresh_token',
                'scope' => self::SCOPES,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $integration->update([
                    'access_token' => $data['access_token'],
                    'refresh_token' => $data['refresh_token'] ?? $integration->refresh_token,
                    'token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600),
                ]);
                return $data['access_token'];
            }
            return null;
        } catch (\Throwable $e) {
            Log::error('[Outlook] Token refresh error', ['error' => $e->getMessage()]);
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
            'selected_calendar_id' => $integration->selected_calendar_id,
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
<head><title>Outlook Calendar - WITHMIA</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#f9fafb;">
<div style="text-align:center;padding:2rem;">
<div style="font-size:3rem;margin-bottom:1rem;">{$emoji}</div>
<h2 style="color:#1f2937;margin-bottom:0.5rem;">{$message}</h2>
<p style="color:#6b7280;font-size:0.875rem;">Esta ventana se cerrará automáticamente...</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'outlook_oauth_result', status: '{$status}', message: '{$message}' }, '*');
  }
  setTimeout(function() { window.close(); }, 2000);
</script>
</body>
</html>
HTML;
        return response($html, 200)->header('Content-Type', 'text/html');
    }
}
