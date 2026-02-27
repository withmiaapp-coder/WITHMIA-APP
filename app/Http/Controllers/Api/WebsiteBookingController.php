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
 */
class WebsiteBookingController extends Controller
{
    /**
     * POST /api/website/booking
     */
    public function store(Request $request): JsonResponse
    {
        // ── 1. Validación ──
        try {
            $validated = $request->validate([
                'name'    => 'required|string|max:100',
                'email'   => 'required|email|max:150',
                'company' => 'nullable|string|max:100',
                'motivo'  => 'required|string|max:200',
                'date'    => 'required|date|after_or_equal:today',
                'time'    => 'required|string|regex:/^\d{2}:\d{2}$/',
            ]);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors'  => $ve->errors(),
            ], 422);
        } catch (\Throwable $e) {
            return $this->bookingErrorResponse('validation_unexpected', $e);
        }

        // ── 2. Preparar fecha/hora ──
        $timezone = 'America/Santiago';
        $date = $validated['date'];
        $time = $validated['time'];
        $startDateTime = "{$date}T{$time}:00";

        $endMinutes = intval(substr($time, 3, 2)) + 15;
        $endHour = intval(substr($time, 0, 2));
        if ($endMinutes >= 60) {
            $endHour++;
            $endMinutes -= 60;
        }
        $endTime = str_pad($endHour, 2, '0', STR_PAD_LEFT) . ':' . str_pad($endMinutes, 2, '0', STR_PAD_LEFT);
        $endDateTime = "{$date}T{$endTime}:00";

        // ── 3. Buscar Company + Calendar Integration ──
        try {
            $company = Company::find(1);
        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] DB error fetching company', ['error' => $e->getMessage()]);
            return $this->fallbackResponse($validated);
        }

        if (!$company) {
            Log::warning('[WebsiteBooking] No company found with id=1');
            return $this->fallbackResponse($validated);
        }

        try {
            $integration = CalendarIntegration::where('company_id', $company->id)
                ->where('provider', 'google')
                ->where('is_active', true)
                ->first();
        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] DB error fetching integration', ['error' => $e->getMessage()]);
            return $this->fallbackResponse($validated);
        }

        if (!$integration) {
            Log::warning('[WebsiteBooking] No active Google Calendar integration', ['company_id' => $company->id]);
            return $this->fallbackResponse($validated);
        }

        // ── 4. Obtener access token ──
        try {
            $accessToken = $integration->getValidAccessToken();
        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] Token error', ['error' => $e->getMessage()]);
            $accessToken = null;
        }

        if (!$accessToken) {
            Log::warning('[WebsiteBooking] No valid access token');
            return $this->fallbackResponse($validated);
        }

        // ── 5. Crear evento en Google Calendar ──
        $companyInfo = !empty($validated['company']) ? "Empresa: {$validated['company']}\n" : '';
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
            'end'   => ['dateTime' => $endDateTime, 'timeZone' => $timezone],
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
                ->timeout(15)
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
                return $this->fallbackResponse($validated);
            }

            $event = $response->json();

            Log::info('[WebsiteBooking] Event created', [
                'event_id' => $event['id'] ?? null,
                'attendee' => $validated['email'],
            ]);

            $meetLink = $event['conferenceData']['entryPoints'][0]['uri']
                ?? $event['hangoutLink']
                ?? null;

            return response()->json([
                'success'   => true,
                'message'   => 'Sesión agendada exitosamente',
                'event_id'  => $event['id'] ?? null,
                'meet_link' => $meetLink,
                'html_link' => $event['htmlLink'] ?? null,
                'start'     => $startDateTime,
                'end'       => $endDateTime,
            ], 201);

        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] Exception creating event', ['error' => $e->getMessage()]);
            return $this->fallbackResponse($validated);
        }
    }

    /**
     * Fallback: notifica al equipo por email cuando GCal no funciona.
     * Siempre retorna 201 success para no bloquear al usuario.
     */
    private function fallbackResponse(array $data): JsonResponse
    {
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
            'success'  => true,
            'message'  => 'Solicitud recibida. Te confirmaremos por email.',
            'fallback' => true,
        ], 201);
    }

    /**
     * Error response con debug info (temporal para diagnóstico).
     */
    private function bookingErrorResponse(string $step, \Throwable $e): JsonResponse
    {
        Log::error("[WebsiteBooking] Error at {$step}", [
            'class'   => get_class($e),
            'message' => $e->getMessage(),
            'file'    => $e->getFile(),
            'line'    => $e->getLine(),
        ]);

        return response()->json([
            'success'     => false,
            'message'     => 'Error interno',
            'debug_step'  => $step,
            'debug_error' => $e->getMessage(),
            'debug_class' => get_class($e),
        ], 500);
    }
}
