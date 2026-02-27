<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarIntegration;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * WebsiteBookingController — Endpoint público para agendar sesiones
 * desde la página web (withmia.com/contacto).
 * 
 * Crea automáticamente un evento en Google Calendar del equipo WITHMIA
 * y envía notificaciones por email al equipo y al visitante.
 */
class WebsiteBookingController extends Controller
{
    /**
     * POST /api/website/booking
     * 
     * Público, throttled. Recibe datos del formulario de agendamiento del sitio web
     * y crea un evento en Google Calendar + envía emails de confirmación.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:100',
                'email' => 'required|email|max:150',
                'company' => 'nullable|string|max:100',
                'motivo' => 'required|string|max:200',
                'date' => 'required|date|after_or_equal:today',
                'time' => 'required|string|regex:/^\d{2}:\d{2}$/',
            ]);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $ve->errors(),
            ], 422);
        }

        try {

        $timezone = 'America/Santiago';
        $date = $validated['date'];
        $time = $validated['time'];

        // Build ISO start/end times
        $startDateTime = "{$date}T{$time}:00";
        $endMinutes = intval(substr($time, 3, 2)) + 15;
        $endHour = intval(substr($time, 0, 2));
        if ($endMinutes >= 60) {
            $endHour++;
            $endMinutes -= 60;
        }
        $endTime = str_pad($endHour, 2, '0', STR_PAD_LEFT) . ':' . str_pad($endMinutes, 2, '0', STR_PAD_LEFT);
        $endDateTime = "{$date}T{$endTime}:00";

        // Find WITHMIA's Google Calendar integration (company_id = 1 assumed as the main company)
        $company = Company::where('id', 1)->first();
        
        if (!$company) {
            Log::warning('[WebsiteBooking] No company found with id=1');
            return $this->fallbackResponse($validated, $startDateTime, $endDateTime, $timezone);
        }

        $integration = CalendarIntegration::where('company_id', $company->id)
            ->where('provider', 'google')
            ->where('is_active', true)
            ->first();

        if (!$integration) {
            Log::warning('[WebsiteBooking] No active Google Calendar integration for company', [
                'company_id' => $company->id,
            ]);
            return $this->fallbackResponse($validated, $startDateTime, $endDateTime, $timezone);
        }

        // Get valid access token
        $accessToken = $integration->getValidAccessToken();
        if (!$accessToken) {
            Log::warning('[WebsiteBooking] Google Calendar token expired', [
                'company_id' => $company->id,
            ]);
            return $this->fallbackResponse($validated, $startDateTime, $endDateTime, $timezone);
        }

        // Build the event
        $companyInfo = $validated['company'] ? "Empresa: {$validated['company']}\n" : '';
        $description = "Sesión introductoria WITHMIA (15 min)\n\n"
            . "Nombre: {$validated['name']}\n"
            . "Email: {$validated['email']}\n"
            . $companyInfo
            . "Motivo: {$validated['motivo']}\n\n"
            . "Agendado desde withmia.com/contacto";

        $eventBody = [
            'summary' => "Sesión WITHMIA — {$validated['name']}",
            'description' => $description,
            'start' => ['dateTime' => $startDateTime, 'timeZone' => $timezone],
            'end' => ['dateTime' => $endDateTime, 'timeZone' => $timezone],
            'attendees' => [
                ['email' => $validated['email'], 'displayName' => $validated['name']],
                ['email' => 'contacto@withmia.com', 'displayName' => 'WITHMIA'],
            ],
            'reminders' => [
                'useDefault' => false,
                'overrides' => [
                    ['method' => 'email', 'minutes' => 30],
                    ['method' => 'popup', 'minutes' => 10],
                ],
            ],
            'conferenceData' => [
                'createRequest' => [
                    'requestId' => 'withmia-booking-' . uniqid(),
                    'conferenceSolutionKey' => ['type' => 'hangoutsMeet'],
                ],
            ],
        ];

        $calendarId = $integration->selected_calendar_id ?? 'primary';

        try {
            $response = Http::withToken($accessToken)
                ->post(
                    "https://www.googleapis.com/calendar/v3/calendars/" 
                    . urlencode($calendarId) 
                    . "/events?sendUpdates=all&conferenceDataVersion=1",
                    $eventBody
                );

            if (!$response->successful()) {
                Log::warning('[WebsiteBooking] Google Calendar API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return $this->fallbackResponse($validated, $startDateTime, $endDateTime, $timezone);
            }

            $event = $response->json();

            Log::info('[WebsiteBooking] Event created successfully', [
                'event_id' => $event['id'] ?? null,
                'attendee' => $validated['email'],
                'date' => $date,
                'time' => $time,
            ]);

            $meetLink = $event['conferenceData']['entryPoints'][0]['uri'] ?? 
                        $event['hangoutLink'] ?? null;

            return response()->json([
                'success' => true,
                'message' => 'Sesión agendada exitosamente',
                'event_id' => $event['id'] ?? null,
                'meet_link' => $meetLink,
                'html_link' => $event['htmlLink'] ?? null,
                'start' => $startDateTime,
                'end' => $endDateTime,
            ], 201);

        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] Exception creating event', [
                'error' => $e->getMessage(),
            ]);
            return $this->fallbackResponse($validated, $startDateTime, $endDateTime, $timezone);
        }

        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] Unexpected exception in store()', [
                'class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error interno al procesar la solicitud',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Fallback: Si no se puede crear el evento en GCal, guardamos los datos
     * y notificamos al equipo por email.
     */
    private function fallbackResponse(array $data, string $start, string $end, string $timezone): JsonResponse
    {
        // Send notification email to the team
        try {
            Mail::raw(
                "Nueva solicitud de agendamiento desde withmia.com\n\n"
                . "Nombre: {$data['name']}\n"
                . "Email: {$data['email']}\n"
                . (!empty($data['company']) ? "Empresa: {$data['company']}\n" : '')
                . "Motivo: {$data['motivo']}\n"
                . "Fecha/Hora: {$data['date']} a las {$data['time']} hrs\n\n"
                . "⚠️ No se pudo crear el evento automáticamente en Google Calendar.\n"
                . "Por favor, crear la reunión manualmente y enviar la invitación.",
                function ($message) use ($data) {
                    $message->to('contacto@withmia.com')
                        ->subject("📅 Agendamiento web: {$data['name']} — {$data['date']} {$data['time']}")
                        ->from(config('mail.from.address'), config('mail.from.name'));
                }
            );
        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] Failed to send fallback email', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Solicitud recibida. Te confirmaremos por email.',
            'fallback' => true,
        ], 201);
    }
}
