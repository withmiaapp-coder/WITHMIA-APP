<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarIntegration;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CalendarController extends Controller
{
    /**
     * Google Calendar API scopes.
     */
    private const GOOGLE_SCOPES = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
    ];

    // ==========================================
    // OAUTH FLOW
    // ==========================================

    /**
     * Generar URL de autorización para Google Calendar OAuth.
     */
    public function getAuthUrl(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $clientId = config('services.google.client_id');
        if (empty($clientId)) {
            return response()->json(['error' => 'Google Calendar not configured'], 500);
        }

        // State token con user_id codificado para identificar usuario en callback sin auth
        $nonce = Str::random(40);
        $state = base64_encode(json_encode(['uid' => $user->id, 'nonce' => $nonce]));
        \Cache::put("gcal_oauth_state:{$user->id}", $nonce, 600); // 10 min

        $params = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $this->getRedirectUri(),
            'response_type' => 'code',
            'scope' => implode(' ', self::GOOGLE_SCOPES),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
            'login_hint' => $user->email,
        ]);

        return response()->json([
            'auth_url' => 'https://accounts.google.com/o/oauth2/v2/auth?' . $params,
        ]);
    }

    /**
     * Callback GET de Google OAuth. Viene directamente de Google al popup.
     * Intercambia el código por tokens y devuelve HTML que cierra el popup.
     */
    public function handleCallbackGet(Request $request)
    {
        $code = $request->query('code');
        $state = $request->query('state');
        $error = $request->query('error');

        // Si Google retornó error (ej: usuario canceló)
        if ($error) {
            return $this->renderPopupClose(false, 'El usuario canceló la autorización');
        }

        if (empty($code) || empty($state)) {
            return $this->renderPopupClose(false, 'Parámetros inválidos');
        }

        // Decodificar state para obtener user_id
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

        // Verificar nonce
        $savedNonce = \Cache::pull("gcal_oauth_state:{$userId}");
        if ($nonce !== $savedNonce) {
            return $this->renderPopupClose(false, 'Token de seguridad expirado');
        }

        // Buscar usuario
        $user = \App\Models\User::find($userId);
        if (!$user) {
            return $this->renderPopupClose(false, 'Usuario no encontrado');
        }

        // Intercambiar código por tokens
        try {
            $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $this->getRedirectUri(),
            ]);

            if (!$tokenResponse->successful()) {
                Log::error('[Calendar] OAuth token exchange failed', [
                    'status' => $tokenResponse->status(),
                    'body' => $tokenResponse->body(),
                ]);
                return $this->renderPopupClose(false, 'Error al intercambiar código de autorización');
            }

            $tokens = $tokenResponse->json();
            $accessToken = $tokens['access_token'];
            $refreshToken = $tokens['refresh_token'] ?? null;
            $expiresIn = $tokens['expires_in'] ?? 3600;

            // Obtener email de Google
            $userInfo = Http::withToken($accessToken)
                ->get('https://www.googleapis.com/oauth2/v2/userinfo');
            $googleEmail = $userInfo->successful() ? ($userInfo->json()['email'] ?? null) : null;

            // Obtener company
            $company = Company::where('slug', $user->company_slug)->first();
            if (!$company) {
                return $this->renderPopupClose(false, 'Empresa no encontrada');
            }

            // Guardar integración
            CalendarIntegration::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'provider' => 'google',
                ],
                [
                    'company_id' => $company->id,
                    'provider_email' => $googleEmail,
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_expires_at' => now()->addSeconds($expiresIn),
                    'scopes' => self::GOOGLE_SCOPES,
                    'is_active' => true,
                    'last_sync_at' => now(),
                ]
            );

            Log::info('[Calendar] Google Calendar connected', [
                'user_id' => $user->id,
                'google_email' => $googleEmail,
            ]);

            return $this->renderPopupClose(true, 'Google Calendar conectado correctamente');

        } catch (\Throwable $e) {
            Log::error('[Calendar] OAuth callback error', ['error' => $e->getMessage()]);
            return $this->renderPopupClose(false, 'Error de autenticación');
        }
    }

    /**
     * Callback POST (legacy/API). 
     */
    public function handleCallback(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $code = $request->input('code');
        $state = $request->input('state');

        if (empty($code)) {
            return response()->json(['error' => 'No authorization code provided'], 400);
        }

        // Verificar state token
        $savedState = \Cache::pull("gcal_oauth_state:{$user->id}");
        if ($state !== $savedState) {
            return response()->json(['error' => 'Invalid state token'], 400);
        }

        // Intercambiar código por tokens
        try {
            $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $this->getRedirectUri(),
            ]);

            if (!$tokenResponse->successful()) {
                Log::error('[Calendar] OAuth token exchange failed', [
                    'status' => $tokenResponse->status(),
                    'body' => $tokenResponse->body(),
                ]);
                return response()->json(['error' => 'Failed to exchange authorization code'], 400);
            }

            $tokens = $tokenResponse->json();
            $accessToken = $tokens['access_token'];
            $refreshToken = $tokens['refresh_token'] ?? null;
            $expiresIn = $tokens['expires_in'] ?? 3600;

            // Obtener email de la cuenta de Google
            $userInfo = Http::withToken($accessToken)
                ->get('https://www.googleapis.com/oauth2/v2/userinfo');
            
            $googleEmail = $userInfo->successful() ? ($userInfo->json()['email'] ?? null) : null;

            // Obtener company del usuario
            $company = Company::where('slug', $user->company_slug)->first();
            if (!$company) {
                return response()->json(['error' => 'Company not found'], 404);
            }

            // Guardar o actualizar integración
            $integration = CalendarIntegration::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'provider' => 'google',
                ],
                [
                    'company_id' => $company->id,
                    'provider_email' => $googleEmail,
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_expires_at' => now()->addSeconds($expiresIn),
                    'scopes' => self::GOOGLE_SCOPES,
                    'is_active' => true,
                    'last_sync_at' => now(),
                ]
            );

            Log::info('[Calendar] Google Calendar connected', [
                'user_id' => $user->id,
                'google_email' => $googleEmail,
            ]);

            return response()->json([
                'success' => true,
                'integration' => $this->formatIntegration($integration),
            ]);

        } catch (\Throwable $e) {
            Log::error('[Calendar] OAuth callback error', [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Authentication failed'], 500);
        }
    }

    /**
     * Desconectar Google Calendar.
     */
    public function disconnect(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', 'google')
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'No integration found'], 404);
        }

        // Revocar token en Google
        try {
            Http::asForm()->post('https://oauth2.googleapis.com/revoke', [
                'token' => $integration->access_token,
            ]);
        } catch (\Throwable $e) {
            // No crítico si falla la revocación
        }

        $integration->delete();

        Log::info('[Calendar] Google Calendar disconnected', [
            'user_id' => $user->id,
        ]);

        return response()->json(['success' => true]);
    }

    // ==========================================
    // INTEGRATION STATUS
    // ==========================================

    /**
     * Obtener estado de la integración del usuario actual.
     */
    public function status(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', 'google')
            ->first();

        return response()->json([
            'connected' => $integration ? $integration->isConnected() : false,
            'integration' => $integration ? $this->formatIntegration($integration) : null,
        ]);
    }

    /**
     * Actualizar configuración de la integración.
     */
    public function updateSettings(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', 'google')
            ->first();

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
    // CALENDAR DATA
    // ==========================================

    /**
     * Listar calendarios disponibles del usuario.
     */
    public function listCalendars(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', 'google')
            ->first();

        if (!$integration || !$integration->isConnected()) {
            return response()->json(['error' => 'Google Calendar not connected'], 400);
        }

        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired, please reconnect'], 401);
        }

        try {
            $response = Http::withToken($accessToken)
                ->get('https://www.googleapis.com/calendar/v3/users/me/calendarList');

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch calendars'], 502);
            }

            $calendars = collect($response->json()['items'] ?? [])->map(function ($cal) {
                return [
                    'id' => $cal['id'],
                    'summary' => $cal['summary'] ?? 'Sin nombre',
                    'description' => $cal['description'] ?? '',
                    'primary' => $cal['primary'] ?? false,
                    'backgroundColor' => $cal['backgroundColor'] ?? '#4285f4',
                    'accessRole' => $cal['accessRole'] ?? 'reader',
                ];
            });

            return response()->json(['calendars' => $calendars]);

        } catch (\Throwable $e) {
            Log::error('[Calendar] List calendars error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch calendars'], 500);
        }
    }

    /**
     * Obtener eventos del calendario del usuario.
     */
    public function getEvents(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', 'google')
            ->first();

        if (!$integration || !$integration->isConnected()) {
            return response()->json(['error' => 'Google Calendar not connected'], 400);
        }

        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired, please reconnect'], 401);
        }

        $calendarId = $request->input('calendar_id', $integration->selected_calendar_id ?? 'primary');
        $timeMin = $request->input('time_min', now()->startOfMonth()->toRfc3339String());
        $timeMax = $request->input('time_max', now()->endOfMonth()->addDays(7)->toRfc3339String());

        try {
            $response = Http::withToken($accessToken)
                ->get("https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events", [
                    'timeMin' => $timeMin,
                    'timeMax' => $timeMax,
                    'singleEvents' => 'true',
                    'orderBy' => 'startTime',
                    'maxResults' => 250,
                ]);

            if (!$response->successful()) {
                Log::warning('[Calendar] Get events failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 200),
                ]);
                return response()->json(['error' => 'Failed to fetch events'], 502);
            }

            $events = collect($response->json()['items'] ?? [])->map(function ($event) {
                return [
                    'id' => $event['id'],
                    'title' => $event['summary'] ?? '(Sin título)',
                    'description' => $event['description'] ?? '',
                    'location' => $event['location'] ?? '',
                    'start' => $event['start']['dateTime'] ?? $event['start']['date'] ?? null,
                    'end' => $event['end']['dateTime'] ?? $event['end']['date'] ?? null,
                    'allDay' => isset($event['start']['date']),
                    'status' => $event['status'] ?? 'confirmed',
                    'htmlLink' => $event['htmlLink'] ?? null,
                    'hangoutLink' => $event['hangoutLink'] ?? null,
                    'attendees' => collect($event['attendees'] ?? [])->map(fn($a) => [
                        'email' => $a['email'] ?? '',
                        'name' => $a['displayName'] ?? '',
                        'status' => $a['responseStatus'] ?? 'needsAction',
                    ])->toArray(),
                    'color' => $event['colorId'] ?? null,
                    'creator' => $event['creator']['email'] ?? null,
                ];
            });

            return response()->json([
                'events' => $events,
                'calendar_id' => $calendarId,
            ]);

        } catch (\Throwable $e) {
            Log::error('[Calendar] Get events error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch events'], 500);
        }
    }

    /**
     * Crear un evento en Google Calendar.
     */
    public function createEvent(Request $request)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', 'google')
            ->first();

        if (!$integration || !$integration->isConnected()) {
            return response()->json(['error' => 'Google Calendar not connected'], 400);
        }

        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired, please reconnect'], 401);
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

        $calendarId = $validated['calendar_id'] ?? $integration->selected_calendar_id ?? 'primary';

        $eventBody = [
            'summary' => $validated['title'],
            'description' => $validated['description'] ?? '',
            'location' => $validated['location'] ?? '',
        ];

        if ($validated['all_day'] ?? false) {
            $eventBody['start'] = ['date' => substr($validated['start'], 0, 10)];
            $eventBody['end'] = ['date' => substr($validated['end'], 0, 10)];
        } else {
            $eventBody['start'] = [
                'dateTime' => $validated['start'],
                'timeZone' => $user->company?->timezone ?? 'America/Santiago',
            ];
            $eventBody['end'] = [
                'dateTime' => $validated['end'],
                'timeZone' => $user->company?->timezone ?? 'America/Santiago',
            ];
        }

        if (!empty($validated['attendees'])) {
            $eventBody['attendees'] = array_map(fn($a) => ['email' => $a['email']], $validated['attendees']);
        }

        try {
            $response = Http::withToken($accessToken)
                ->post("https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events", $eventBody);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to create event'], 502);
            }

            $event = $response->json();

            Log::info('[Calendar] Event created', [
                'user_id' => $user->id,
                'event_id' => $event['id'],
            ]);

            return response()->json([
                'success' => true,
                'event' => [
                    'id' => $event['id'],
                    'title' => $event['summary'] ?? '',
                    'start' => $event['start']['dateTime'] ?? $event['start']['date'] ?? null,
                    'end' => $event['end']['dateTime'] ?? $event['end']['date'] ?? null,
                    'htmlLink' => $event['htmlLink'] ?? null,
                ],
            ]);

        } catch (\Throwable $e) {
            Log::error('[Calendar] Create event error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to create event'], 500);
        }
    }

    /**
     * Eliminar un evento de Google Calendar.
     */
    public function deleteEvent(Request $request, string $eventId)
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', 'google')
            ->first();

        if (!$integration || !$integration->isConnected()) {
            return response()->json(['error' => 'Google Calendar not connected'], 400);
        }

        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            return response()->json(['error' => 'Token expired, please reconnect'], 401);
        }

        $calendarId = $request->input('calendar_id', $integration->selected_calendar_id ?? 'primary');

        try {
            $response = Http::withToken($accessToken)
                ->delete("https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events/" . urlencode($eventId));

            if ($response->status() === 204 || $response->successful()) {
                return response()->json(['success' => true]);
            }

            return response()->json(['error' => 'Failed to delete event'], 502);

        } catch (\Throwable $e) {
            Log::error('[Calendar] Delete event error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to delete event'], 500);
        }
    }

    // ==========================================
    // BOT ACCESS (para n8n workflows)
    // ==========================================

    /**
     * Endpoint para que n8n/bot consulte disponibilidad del calendario.
     * Se usa desde el workflow del bot cuando un cliente quiere agendar.
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

        // Buscar integración con bot_access_enabled
        $integration = CalendarIntegration::where('company_id', $company->id)
            ->where('provider', 'google')
            ->where('bot_access_enabled', true)
            ->where('is_active', true)
            ->first();

        if (!$integration) {
            return response()->json([
                'available' => false,
                'message' => 'No calendar integration with bot access enabled',
            ]);
        }

        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            return response()->json([
                'available' => false,
                'message' => 'Calendar token expired',
            ]);
        }

        $calendarId = $integration->selected_calendar_id ?? 'primary';
        $date = $request->input('date', now()->format('Y-m-d'));
        $daysAhead = (int) $request->input('days_ahead', 7);

        $timeMin = \Carbon\Carbon::parse($date)->startOfDay()->toRfc3339String();
        $timeMax = \Carbon\Carbon::parse($date)->addDays($daysAhead)->endOfDay()->toRfc3339String();

        try {
            // Obtener FreeBusy para disponibilidad
            $freeBusyResponse = Http::withToken($accessToken)
                ->post('https://www.googleapis.com/calendar/v3/freeBusy', [
                    'timeMin' => $timeMin,
                    'timeMax' => $timeMax,
                    'timeZone' => $company->timezone ?? 'America/Santiago',
                    'items' => [['id' => $calendarId]],
                ]);

            $busySlots = [];
            if ($freeBusyResponse->successful()) {
                $busySlots = $freeBusyResponse->json()['calendars'][$calendarId]['busy'] ?? [];
            }

            // También obtener eventos para contexto
            $eventsResponse = Http::withToken($accessToken)
                ->get("https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events", [
                    'timeMin' => $timeMin,
                    'timeMax' => $timeMax,
                    'singleEvents' => 'true',
                    'orderBy' => 'startTime',
                    'maxResults' => 50,
                ]);

            $events = [];
            if ($eventsResponse->successful()) {
                $events = collect($eventsResponse->json()['items'] ?? [])->map(function ($event) {
                    return [
                        'title' => $event['summary'] ?? '(Ocupado)',
                        'start' => $event['start']['dateTime'] ?? $event['start']['date'] ?? null,
                        'end' => $event['end']['dateTime'] ?? $event['end']['date'] ?? null,
                        'status' => $event['status'] ?? 'confirmed',
                    ];
                })->toArray();
            }

            return response()->json([
                'available' => true,
                'calendar_owner' => $integration->provider_email,
                'timezone' => $company->timezone ?? 'America/Santiago',
                'busy_slots' => $busySlots,
                'events' => $events,
                'date_range' => [
                    'from' => $date,
                    'to' => \Carbon\Carbon::parse($date)->addDays($daysAhead)->format('Y-m-d'),
                ],
            ]);

        } catch (\Throwable $e) {
            Log::error('[Calendar] Bot availability error', ['error' => $e->getMessage()]);
            return response()->json([
                'available' => false,
                'message' => 'Error fetching calendar data',
            ]);
        }
    }

    /**
     * Endpoint para que n8n/bot cree un evento (agendar cita).
     */
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
            ->where('provider', 'google')
            ->where('bot_access_enabled', true)
            ->where('is_active', true)
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'No calendar integration with bot access'], 400);
        }

        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            return response()->json(['error' => 'Calendar token expired'], 401);
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

        $calendarId = $integration->selected_calendar_id ?? 'primary';
        $timezone = $company->timezone ?? 'America/Santiago';

        $eventBody = [
            'summary' => $validated['title'],
            'description' => ($validated['description'] ?? '') .
                (!empty($validated['attendee_phone']) ? "\n\nTeléfono: " . $validated['attendee_phone'] : '') .
                "\n\n[Agendado por MIA Bot]",
            'start' => ['dateTime' => $validated['start'], 'timeZone' => $timezone],
            'end' => ['dateTime' => $validated['end'], 'timeZone' => $timezone],
        ];

        if (!empty($validated['attendee_email'])) {
            $eventBody['attendees'] = [
                ['email' => $validated['attendee_email'], 'displayName' => $validated['attendee_name'] ?? ''],
            ];
        }

        try {
            $response = Http::withToken($accessToken)
                ->post("https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events?sendUpdates=all", $eventBody);

            if (!$response->successful()) {
                Log::warning('[Calendar] Bot create event failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 200),
                ]);
                return response()->json(['error' => 'Failed to create event'], 502);
            }

            $event = $response->json();

            Log::info('[Calendar] Bot created event', [
                'company_slug' => $companySlug,
                'event_id' => $event['id'],
                'title' => $validated['title'],
            ]);

            return response()->json([
                'success' => true,
                'event_id' => $event['id'],
                'html_link' => $event['htmlLink'] ?? null,
                'start' => $event['start']['dateTime'] ?? $event['start']['date'] ?? null,
                'end' => $event['end']['dateTime'] ?? $event['end']['date'] ?? null,
            ]);

        } catch (\Throwable $e) {
            Log::error('[Calendar] Bot create event error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to create event'], 500);
        }
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private function getRedirectUri(): string
    {
        return config('services.google.calendar_redirect_uri', 
            rtrim(config('app.url'), '/') . '/api/calendar/google/callback'
        );
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

    /**
     * Renderiza HTML que cierra el popup de OAuth y notifica al opener.
     */
    private function renderPopupClose(bool $success, string $message): \Illuminate\Http\Response
    {
        $status = $success ? 'success' : 'error';
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head><title>Google Calendar - MIA</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#f9fafb;">
<div style="text-align:center;padding:2rem;">
<div style="font-size:3rem;margin-bottom:1rem;">{$this->getStatusEmoji($success)}</div>
<h2 style="color:#1f2937;margin-bottom:0.5rem;">{$message}</h2>
<p style="color:#6b7280;font-size:0.875rem;">Esta ventana se cerrará automáticamente...</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'gcal_oauth_result', status: '{$status}', message: '{$message}' }, '*');
  }
  setTimeout(function() { window.close(); }, 2000);
</script>
</body>
</html>
HTML;
        return response($html, 200)->header('Content-Type', 'text/html');
    }

    private function getStatusEmoji(bool $success): string
    {
        return $success ? '✅' : '❌';
    }
}
