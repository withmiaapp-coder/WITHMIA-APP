<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarIntegration;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * CalendarHubController — Punto de acceso UNIFICADO para el bot (n8n).
 * 
 * En lugar de que n8n llame a /api/calendar/bot, /api/outlook/bot, etc. por separado,
 * este controlador consulta TODOS los calendarios conectados de la empresa y devuelve
 * una respuesta consolidada. El bot solo necesita llamar a 1 endpoint.
 * 
 * Providers soportados: google, outlook, calendly, reservo, agendapro
 */
class CalendarHubController extends Controller
{
    /**
     * GET /api/calendar-hub/bot/availability
     * 
     * Consulta la disponibilidad de TODOS los calendarios conectados de la empresa.
     * Devuelve información consolidada que el bot puede usar para ofrecer horarios.
     */
    public function botGetAvailability(Request $request): JsonResponse
    {
        $companySlug = $request->input('company_slug');
        if (!$companySlug) {
            return response()->json(['error' => 'company_slug required'], 400);
        }

        $company = Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        // Buscar TODAS las integraciones activas con bot_access_enabled
        $integrations = CalendarIntegration::where('company_id', $company->id)
            ->where('bot_access_enabled', true)
            ->where('is_active', true)
            ->get();

        if ($integrations->isEmpty()) {
            return response()->json([
                'has_calendar' => false,
                'message' => 'No hay calendarios conectados con acceso de bot habilitado. Informa al cliente que el agendamiento no está disponible en este momento.',
                'providers' => [],
            ]);
        }

        $date = $request->input('date', now()->format('Y-m-d'));
        $daysAhead = (int) $request->input('days_ahead', 7);
        $timezone = $company->timezone ?? 'America/Santiago';

        $results = [];
        $allBusySlots = [];
        $allEvents = [];
        $schedulingLinks = [];
        $bookingServices = [];

        foreach ($integrations as $integration) {
            try {
                $providerResult = $this->getProviderAvailability($integration, $company, $date, $daysAhead, $timezone);
                if ($providerResult) {
                    $results[] = $providerResult;

                    // Consolidar busy slots
                    if (!empty($providerResult['busy_slots'])) {
                        foreach ($providerResult['busy_slots'] as $slot) {
                            $allBusySlots[] = array_merge($slot, ['provider' => $providerResult['provider']]);
                        }
                    }

                    // Consolidar eventos
                    if (!empty($providerResult['events'])) {
                        foreach ($providerResult['events'] as $event) {
                            $allEvents[] = array_merge($event, ['provider' => $providerResult['provider']]);
                        }
                    }

                    // Calendly: links de agendamiento
                    if (!empty($providerResult['event_types'])) {
                        foreach ($providerResult['event_types'] as $et) {
                            $schedulingLinks[] = $et;
                        }
                    }

                    // Reservo/AgendaPro: servicios disponibles
                    if (!empty($providerResult['services'])) {
                        foreach ($providerResult['services'] as $svc) {
                            $bookingServices[] = array_merge($svc, ['provider' => $providerResult['provider']]);
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("[CalendarHub] Error getting availability from {$integration->provider}", [
                    'error' => $e->getMessage(),
                    'company_slug' => $companySlug,
                ]);
            }
        }

        // Ordenar eventos por fecha de inicio
        usort($allEvents, function ($a, $b) {
            return strcmp($a['start'] ?? '', $b['start'] ?? '');
        });

        // Construir respuesta inteligente para el bot
        $response = [
            'has_calendar' => true,
            'timezone' => $timezone,
            'date_range' => [
                'from' => $date,
                'to' => \Carbon\Carbon::parse($date)->addDays($daysAhead)->format('Y-m-d'),
            ],
            'connected_providers' => collect($results)->pluck('provider')->toArray(),
            'busy_slots' => $allBusySlots,
            'events' => $allEvents,
        ];

        // Agregar instrucciones específicas según el tipo de proveedor
        $instructions = [];

        // Si tiene Google o Outlook: el bot puede agendar directamente
        $directProviders = collect($results)->whereIn('provider', ['google', 'outlook'])->pluck('provider')->toArray();
        if (!empty($directProviders)) {
            $response['can_create_event'] = true;
            $instructions[] = 'Puedes agendar citas directamente usando la herramienta "Agendar Cita" con los calendarios: ' . implode(', ', $directProviders) . '.';
        }

        // Si tiene Calendly: enviar link de agendamiento
        if (!empty($schedulingLinks)) {
            $response['scheduling_links'] = $schedulingLinks;
            $instructions[] = 'Para Calendly, envía al cliente el link de agendamiento correspondiente para que elija su horario.';
        }

        // Si tiene Reservo o AgendaPro: crear booking con servicio
        if (!empty($bookingServices)) {
            $response['booking_services'] = $bookingServices;
            $response['can_create_booking'] = true;
            $bookingProviders = collect($bookingServices)->pluck('provider')->unique()->toArray();
            $instructions[] = 'Para ' . implode('/', $bookingProviders) . ', primero consulta qué servicio desea el cliente, luego usa "Agendar Cita" con el service_id correspondiente.';
        }

        if (!empty($instructions)) {
            $response['instructions'] = implode(' ', $instructions);
        }

        return response()->json($response);
    }

    /**
     * POST /api/calendar-hub/bot/create-event
     * 
     * Crea un evento/cita/reserva en el calendario de la empresa.
     * Detecta automáticamente qué proveedor usar según las integraciones activas.
     */
    public function botCreateEvent(Request $request): JsonResponse
    {
        $companySlug = $request->input('company_slug');
        if (!$companySlug) {
            return response()->json(['error' => 'company_slug required'], 400);
        }

        $company = Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        // El bot puede especificar el proveedor, o usamos el primero disponible
        $preferredProvider = $request->input('provider');
        $serviceId = $request->input('service_id');

        // Si hay service_id, buscar en reservo/agendapro
        if ($serviceId) {
            return $this->createBooking($request, $company, $preferredProvider);
        }

        // Buscar integración para crear evento directo (Google/Outlook)
        $query = CalendarIntegration::where('company_id', $company->id)
            ->where('bot_access_enabled', true)
            ->where('is_active', true)
            ->whereIn('provider', ['google', 'outlook']);

        if ($preferredProvider) {
            $query->where('provider', $preferredProvider);
        }

        $integration = $query->first();

        if (!$integration) {
            return response()->json([
                'error' => 'No calendar integration available for creating events',
                'suggestion' => 'No hay calendario conectado que permita agendar directamente. Verifica que el acceso de bot esté habilitado.',
            ], 400);
        }

        // Mapear campos del request a los nombres que esperan los controladores
        $title = $request->input('summary') ?? $request->input('title') ?? 'Cita agendada por WITHMIA';
        $start = $request->input('start_time') ?? $request->input('start');
        $end = $request->input('end_time') ?? $request->input('end');

        if (!$start || !$end) {
            return response()->json(['error' => 'start_time and end_time are required'], 400);
        }

        if ($integration->provider === 'google') {
            return $this->createGoogleEvent($integration, $company, $title, $start, $end, $request);
        } elseif ($integration->provider === 'outlook') {
            return $this->createOutlookEvent($integration, $company, $title, $start, $end, $request);
        }

        return response()->json(['error' => 'Provider not supported for direct event creation'], 400);
    }

    // =====================================================
    // MÉTODOS PRIVADOS — Disponibilidad por proveedor
    // =====================================================

    private function getProviderAvailability(CalendarIntegration $integration, Company $company, string $date, int $daysAhead, string $timezone): ?array
    {
        return match ($integration->provider) {
            'google' => $this->getGoogleAvailability($integration, $company, $date, $daysAhead, $timezone),
            'outlook' => $this->getOutlookAvailability($integration, $company, $date, $daysAhead, $timezone),
            'calendly' => $this->getCalendlyAvailability($integration),
            'reservo' => $this->getReservoAvailability($integration),
            'agendapro' => $this->getAgendaproAvailability($integration),
            default => null,
        };
    }

    private function getGoogleAvailability(CalendarIntegration $integration, Company $company, string $date, int $daysAhead, string $timezone): ?array
    {
        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) return null;

        $calendarId = $integration->selected_calendar_id ?? 'primary';
        $timeMin = \Carbon\Carbon::parse($date)->startOfDay()->toRfc3339String();
        $timeMax = \Carbon\Carbon::parse($date)->addDays($daysAhead)->endOfDay()->toRfc3339String();

        $freeBusyResponse = Http::withToken($accessToken)
            ->post('https://www.googleapis.com/calendar/v3/freeBusy', [
                'timeMin' => $timeMin,
                'timeMax' => $timeMax,
                'timeZone' => $timezone,
                'items' => [['id' => $calendarId]],
            ]);

        $busySlots = [];
        if ($freeBusyResponse->successful()) {
            $busySlots = $freeBusyResponse->json()['calendars'][$calendarId]['busy'] ?? [];
        }

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
            $events = collect($eventsResponse->json()['items'] ?? [])->map(fn($event) => [
                'title' => $event['summary'] ?? '(Ocupado)',
                'start' => $event['start']['dateTime'] ?? $event['start']['date'] ?? null,
                'end' => $event['end']['dateTime'] ?? $event['end']['date'] ?? null,
                'status' => $event['status'] ?? 'confirmed',
            ])->toArray();
        }

        return [
            'provider' => 'google',
            'calendar_owner' => $integration->provider_email,
            'busy_slots' => $busySlots,
            'events' => $events,
        ];
    }

    private function getOutlookAvailability(CalendarIntegration $integration, Company $company, string $date, int $daysAhead, string $timezone): ?array
    {
        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            // Intentar refresh
            $accessToken = $integration->refreshAccessToken();
            if (!$accessToken) return null;
        }

        $startDateTime = \Carbon\Carbon::parse($date)->startOfDay()->toIso8601String();
        $endDateTime = \Carbon\Carbon::parse($date)->addDays($daysAhead)->endOfDay()->toIso8601String();

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

        return [
            'provider' => 'outlook',
            'calendar_owner' => $integration->provider_email,
            'busy_slots' => $busySlots,
            'events' => $events,
        ];
    }

    private function getCalendlyAvailability(CalendarIntegration $integration): ?array
    {
        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) return null;

        $userUri = $integration->settings['calendly_user_uri'] ?? null;
        if (!$userUri) return null;

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
                'provider' => 'calendly',
            ])->toArray();
        }

        $eventsResponse = Http::withToken($accessToken)
            ->get('https://api.calendly.com/scheduled_events', [
                'user' => $userUri,
                'min_start_time' => now()->toIso8601String(),
                'max_start_time' => now()->addDays(14)->toIso8601String(),
                'status' => 'active',
                'sort' => 'start_time:asc',
                'count' => 30,
            ]);

        $events = [];
        if ($eventsResponse->successful()) {
            $events = collect($eventsResponse->json()['collection'] ?? [])->map(fn($ev) => [
                'title' => $ev['name'] ?? '',
                'start' => $ev['start_time'] ?? null,
                'end' => $ev['end_time'] ?? null,
                'status' => 'confirmed',
            ])->toArray();
        }

        return [
            'provider' => 'calendly',
            'calendar_owner' => $integration->provider_email,
            'event_types' => $eventTypes,
            'events' => $events,
            'busy_slots' => [],
        ];
    }

    private function getReservoAvailability(CalendarIntegration $integration): ?array
    {
        $baseUrl = 'https://' . ($integration->settings['subdomain'] ?? '') . '.reservo.cl/api/v1';
        $apiKey = $integration->access_token;

        $servicesResponse = Http::withHeaders(['Authorization' => "Bearer {$apiKey}"])
            ->get("{$baseUrl}/services");

        $services = [];
        if ($servicesResponse->successful()) {
            $services = collect($servicesResponse->json()['data'] ?? $servicesResponse->json())
                ->map(fn($s) => [
                    'id' => $s['id'] ?? null,
                    'name' => $s['name'] ?? '',
                    'duration' => $s['duration'] ?? 0,
                    'price' => $s['price'] ?? 0,
                ])->toArray();
        }

        $bookingsResponse = Http::withHeaders(['Authorization' => "Bearer {$apiKey}"])
            ->get("{$baseUrl}/bookings", [
                'from' => now()->format('Y-m-d'),
                'to' => now()->addDays(14)->format('Y-m-d'),
            ]);

        $events = [];
        if ($bookingsResponse->successful()) {
            $events = collect($bookingsResponse->json()['data'] ?? $bookingsResponse->json())
                ->take(30)->map(fn($b) => [
                    'title' => $b['service']['name'] ?? $b['service_name'] ?? 'Reserva',
                    'start' => ($b['date'] ?? '') . 'T' . ($b['time'] ?? '00:00'),
                    'end' => null,
                    'status' => 'confirmed',
                ])->toArray();
        }

        return [
            'provider' => 'reservo',
            'services' => $services,
            'events' => $events,
            'busy_slots' => [],
        ];
    }

    private function getAgendaproAvailability(CalendarIntegration $integration): ?array
    {
        $baseUrl = 'https://app.agendapro.com/api/v1';
        $apiKey = $integration->access_token;

        $servicesResponse = Http::withHeaders(['Authorization' => "Bearer {$apiKey}"])
            ->get("{$baseUrl}/services");

        $services = [];
        if ($servicesResponse->successful()) {
            $services = collect($servicesResponse->json()['data'] ?? $servicesResponse->json())
                ->map(fn($s) => [
                    'id' => $s['id'] ?? null,
                    'name' => $s['name'] ?? '',
                    'duration' => $s['duration'] ?? 0,
                    'price' => $s['price'] ?? 0,
                ])->toArray();
        }

        $locationsResponse = Http::withHeaders(['Authorization' => "Bearer {$apiKey}"])
            ->get("{$baseUrl}/locations");

        $locations = [];
        if ($locationsResponse->successful()) {
            $locations = collect($locationsResponse->json()['data'] ?? $locationsResponse->json())
                ->map(fn($l) => [
                    'id' => $l['id'] ?? null,
                    'name' => $l['name'] ?? '',
                    'address' => $l['address'] ?? '',
                ])->toArray();
        }

        $bookingsResponse = Http::withHeaders(['Authorization' => "Bearer {$apiKey}"])
            ->get("{$baseUrl}/bookings", [
                'from' => now()->format('Y-m-d'),
                'to' => now()->addDays(14)->format('Y-m-d'),
            ]);

        $events = [];
        if ($bookingsResponse->successful()) {
            $events = collect($bookingsResponse->json()['data'] ?? $bookingsResponse->json())
                ->take(30)->map(fn($b) => [
                    'title' => $b['service_name'] ?? $b['service']['name'] ?? 'Reserva',
                    'start' => ($b['date'] ?? '') . 'T' . ($b['time'] ?? '00:00'),
                    'end' => null,
                    'status' => 'confirmed',
                ])->toArray();
        }

        return [
            'provider' => 'agendapro',
            'services' => $services,
            'locations' => $locations,
            'events' => $events,
            'busy_slots' => [],
        ];
    }

    // =====================================================
    // MÉTODOS PRIVADOS — Crear eventos/bookings
    // =====================================================

    private function createGoogleEvent(CalendarIntegration $integration, Company $company, string $title, string $start, string $end, Request $request)
    {
        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            return response()->json(['error' => 'Google Calendar token expired'], 401);
        }

        $calendarId = $integration->selected_calendar_id ?? 'primary';
        $timezone = $company->timezone ?? 'America/Santiago';

        $eventBody = [
            'summary' => $title,
            'description' => ($request->input('description') ?? '') .
                (!empty($request->input('attendee_phone')) ? "\n\nTeléfono: " . $request->input('attendee_phone') : '') .
                "\n\n[Agendado por WITHMIA Bot]",
            'start' => ['dateTime' => $start, 'timeZone' => $timezone],
            'end' => ['dateTime' => $end, 'timeZone' => $timezone],
        ];

        if ($request->input('attendee_email')) {
            $eventBody['attendees'] = [
                ['email' => $request->input('attendee_email'), 'displayName' => $request->input('attendee_name') ?? ''],
            ];
        }

        $response = Http::withToken($accessToken)
            ->post("https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events?sendUpdates=all", $eventBody);

        if (!$response->successful()) {
            Log::warning('[CalendarHub] Google create event failed', ['status' => $response->status()]);
            return response()->json(['error' => 'Failed to create event in Google Calendar'], 502);
        }

        $event = $response->json();
        Log::info('[CalendarHub] Event created via Google', [
            'company' => $company->slug,
            'event_id' => $event['id'],
        ]);

        return response()->json([
            'success' => true,
            'provider' => 'google',
            'event_id' => $event['id'],
            'html_link' => $event['htmlLink'] ?? null,
            'start' => $event['start']['dateTime'] ?? null,
            'end' => $event['end']['dateTime'] ?? null,
            'message' => 'Cita agendada exitosamente en Google Calendar',
        ]);
    }

    private function createOutlookEvent(CalendarIntegration $integration, Company $company, string $title, string $start, string $end, Request $request)
    {
        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            $accessToken = $integration->refreshAccessToken();
            if (!$accessToken) {
                return response()->json(['error' => 'Outlook token expired'], 401);
            }
        }

        $timezone = $company->timezone ?? 'America/Santiago';

        $eventBody = [
            'subject' => $title,
            'body' => [
                'contentType' => 'text',
                'content' => ($request->input('description') ?? '') .
                    (!empty($request->input('attendee_phone')) ? "\n\nTeléfono: " . $request->input('attendee_phone') : '') .
                    "\n\n[Agendado por WITHMIA Bot]",
            ],
            'start' => ['dateTime' => $start, 'timeZone' => $timezone],
            'end' => ['dateTime' => $end, 'timeZone' => $timezone],
        ];

        if ($request->input('attendee_email')) {
            $eventBody['attendees'] = [[
                'emailAddress' => [
                    'address' => $request->input('attendee_email'),
                    'name' => $request->input('attendee_name') ?? '',
                ],
                'type' => 'required',
            ]];
        }

        $response = Http::withToken($accessToken)
            ->post('https://graph.microsoft.com/v1.0/me/events', $eventBody);

        if (!$response->successful()) {
            Log::warning('[CalendarHub] Outlook create event failed', ['status' => $response->status()]);
            return response()->json(['error' => 'Failed to create event in Outlook'], 502);
        }

        $event = $response->json();
        Log::info('[CalendarHub] Event created via Outlook', [
            'company' => $company->slug,
            'event_id' => $event['id'],
        ]);

        return response()->json([
            'success' => true,
            'provider' => 'outlook',
            'event_id' => $event['id'],
            'web_link' => $event['webLink'] ?? null,
            'start' => $event['start']['dateTime'] ?? null,
            'end' => $event['end']['dateTime'] ?? null,
            'message' => 'Cita agendada exitosamente en Outlook Calendar',
        ]);
    }

    private function createBooking(Request $request, Company $company, ?string $preferredProvider)
    {
        $query = CalendarIntegration::where('company_id', $company->id)
            ->where('bot_access_enabled', true)
            ->where('is_active', true)
            ->whereIn('provider', ['reservo', 'agendapro']);

        if ($preferredProvider) {
            $query->where('provider', $preferredProvider);
        }

        $integration = $query->first();

        if (!$integration) {
            return response()->json(['error' => 'No booking integration available'], 400);
        }

        $validated = $request->validate([
            'service_id' => 'required',
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|string',
            'client_name' => 'required|string|max:200',
            'client_email' => 'nullable|email',
            'client_phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string|max:1000',
            'provider_id' => 'nullable',
            'location_id' => 'nullable',
        ]);

        $validated['notes'] = ($validated['notes'] ?? '') . "\n[Agendado por WITHMIA Bot]";

        if ($integration->provider === 'reservo') {
            return $this->createReservoBooking($integration, $validated);
        } elseif ($integration->provider === 'agendapro') {
            return $this->createAgendaproBooking($integration, $validated);
        }

        return response()->json(['error' => 'Provider not supported'], 400);
    }

    private function createReservoBooking(CalendarIntegration $integration, array $data)
    {
        $baseUrl = 'https://' . ($integration->settings['subdomain'] ?? '') . '.reservo.cl/api/v1';
        $apiKey = $integration->access_token;

        $response = Http::withHeaders(['Authorization' => "Bearer {$apiKey}"])
            ->post("{$baseUrl}/bookings", $data);

        if (!$response->successful()) {
            return response()->json(['error' => 'Failed to create Reservo booking'], 502);
        }

        Log::info('[CalendarHub] Reservo booking created');
        return response()->json([
            'success' => true,
            'provider' => 'reservo',
            'booking' => $response->json()['data'] ?? $response->json(),
            'message' => 'Reserva creada exitosamente en Reservo',
        ]);
    }

    private function createAgendaproBooking(CalendarIntegration $integration, array $data)
    {
        $baseUrl = 'https://app.agendapro.com/api/v1';
        $apiKey = $integration->access_token;

        $response = Http::withHeaders(['Authorization' => "Bearer {$apiKey}"])
            ->post("{$baseUrl}/bookings", $data);

        if (!$response->successful()) {
            return response()->json(['error' => 'Failed to create AgendaPro booking'], 502);
        }

        Log::info('[CalendarHub] AgendaPro booking created');
        return response()->json([
            'success' => true,
            'provider' => 'agendapro',
            'booking' => $response->json()['data'] ?? $response->json(),
            'message' => 'Reserva creada exitosamente en AgendaPro',
        ]);
    }
}
