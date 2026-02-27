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
     * GET /api/website/booking/busy?date=2026-03-02
     * Returns busy time slots for a given date so the frontend can hide them.
     */
    public function busy(Request $request): JsonResponse
    {
        $date = $request->query('date');
        if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return response()->json(['busy_slots' => []], 200);
        }

        $timezone = 'America/Santiago';

        try {
            $integration = CalendarIntegration::where('company_id', 1)
                ->where('provider', 'google')
                ->where('is_active', true)
                ->first();

            if (!$integration) {
                return response()->json(['busy_slots' => []], 200);
            }

            $accessToken = $integration->getValidAccessToken();
            if (!$accessToken) {
                return response()->json(['busy_slots' => []], 200);
            }

            $calendarId = $integration->selected_calendar_id ?? 'primary';

            // Query events for the full day
            $timeMin = "{$date}T00:00:00-04:00";
            $timeMax = "{$date}T23:59:59-04:00";

            $response = Http::withToken($accessToken)
                ->timeout(10)
                ->get("https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events", [
                    'timeMin' => $timeMin,
                    'timeMax' => $timeMax,
                    'timeZone' => $timezone,
                    'singleEvents' => 'true',
                    'orderBy' => 'startTime',
                    'fields' => 'items(start,end,status)',
                ]);

            if (!$response->successful()) {
                return response()->json(['busy_slots' => []], 200);
            }

            $events = $response->json('items') ?? [];
            $busySlots = [];

            // All 15-min slots
            $allSlots = [];
            foreach (['09','10','11','12','14','15','16','17'] as $h) {
                foreach (['00','15','30','45'] as $m) {
                    $allSlots[] = "{$h}:{$m}";
                }
            }

            foreach ($events as $event) {
                if (($event['status'] ?? '') === 'cancelled') continue;

                $start = $event['start']['dateTime'] ?? null;
                $end = $event['end']['dateTime'] ?? null;
                if (!$start || !$end) continue;

                $eventStart = strtotime($start);
                $eventEnd = strtotime($end);

                foreach ($allSlots as $slot) {
                    $slotStart = strtotime("{$date} {$slot}:00");
                    $slotEnd = $slotStart + (15 * 60); // 15-min slot

                    // Slot overlaps with event if slot starts before event ends AND slot ends after event starts
                    if ($slotStart < $eventEnd && $slotEnd > $eventStart) {
                        $busySlots[] = $slot;
                    }
                }
            }

            return response()->json(['busy_slots' => array_values(array_unique($busySlots))], 200);

        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] busy() error', ['error' => $e->getMessage()]);
            return response()->json(['busy_slots' => []], 200);
        }
    }

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

            // Send styled confirmation email to the visitor
            $this->sendConfirmationEmail($validated, $date, $time);

            return response()->json([
                'success'   => true,
                'message'   => 'Sesión agendada exitosamente',
                'event_id'  => $event['id'] ?? null,
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
        // Send styled notification email to the team
        try {
            Mail::html(
                $this->buildTeamEmailHtml($data),
                function ($message) use ($data) {
                    $message->to('contacto@withmia.com')
                        ->subject("📅 Agendamiento web: {$data['name']} — {$data['date']} {$data['time']}")
                        ->from(config('mail.from.address'), config('mail.from.name'));
                }
            );
        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] Failed to send fallback email', ['error' => $e->getMessage()]);
        }

        // Also send confirmation to the visitor
        $this->sendConfirmationEmail($data, $data['date'], $data['time']);

        return response()->json([
            'success'  => true,
            'message'  => 'Solicitud recibida. Te confirmaremos por email.',
            'fallback' => true,
        ], 201);
    }

    /**
     * Send a styled HTML confirmation email to the visitor.
     */
    private function sendConfirmationEmail(array $data, string $date, string $time): void
    {
        try {
            $html = $this->buildConfirmationEmailHtml($data, $date, $time);
            Mail::html($html, function ($message) use ($data, $date, $time) {
                $message->to($data['email'], $data['name'])
                    ->subject("✅ Sesión confirmada — {$date} a las {$time} hrs")
                    ->from(config('mail.from.address'), 'WITHMIA');
            });
        } catch (\Throwable $e) {
            Log::error('[WebsiteBooking] Failed to send confirmation email', ['error' => $e->getMessage()]);
        }
    }

    /**
     * HTML email for the visitor confirming their booking.
     */
    private function buildConfirmationEmailHtml(array $data, string $date, string $time): string
    {
        $name = htmlspecialchars($data['name']);
        $motivo = htmlspecialchars($data['motivo']);
        $company = !empty($data['company']) ? htmlspecialchars($data['company']) : null;
        $companyRow = $company ? "<tr><td style=\"padding:4px 12px;color:#94a3b8;font-size:13px;\">Empresa</td><td style=\"padding:4px 12px;color:#e2e8f0;font-size:13px;font-weight:600;\">{$company}</td></tr>" : '';

        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0f0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <!-- Logo -->
  <div style="text-align:center;margin-bottom:32px;">
    <img src="https://app.withmia.com/icons/logo-withmia.png" alt="WITHMIA" width="140" style="display:inline-block;" />
  </div>

  <!-- Card -->
  <div style="background:linear-gradient(135deg,#1a1230 0%,#150e25 100%);border:1px solid rgba(139,92,246,0.15);border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(16,185,129,0.08) 100%);padding:28px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div style="width:56px;height:56px;border-radius:14px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.2);margin:0 auto 16px;line-height:56px;font-size:28px;">✅</div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 6px;">¡Sesión confirmada!</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0;">Sesión introductoria WITHMIA · 15 min</p>
    </div>

    <!-- Details -->
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 12px;color:#94a3b8;font-size:13px;">📅 Fecha</td>
          <td style="padding:4px 12px;color:#e2e8f0;font-size:13px;font-weight:600;">{$date}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px;color:#94a3b8;font-size:13px;">🕐 Hora</td>
          <td style="padding:4px 12px;color:#e2e8f0;font-size:13px;font-weight:600;">{$time} hrs (Chile)</td>
        </tr>
        <tr>
          <td style="padding:4px 12px;color:#94a3b8;font-size:13px;">👤 Nombre</td>
          <td style="padding:4px 12px;color:#e2e8f0;font-size:13px;font-weight:600;">{$name}</td>
        </tr>
        {$companyRow}
        <tr>
          <td style="padding:4px 12px;color:#94a3b8;font-size:13px;">💬 Motivo</td>
          <td style="padding:4px 12px;color:#e2e8f0;font-size:13px;font-weight:600;">{$motivo}</td>
        </tr>
      </table>
    </div>

    <!-- Info -->
    <div style="padding:0 24px 24px;">
      <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.1);border-radius:10px;padding:14px 16px;">
        <p style="color:#c4b5fd;font-size:13px;margin:0;line-height:1.5;">
          📩 Recibirás una invitación de Google Calendar con el enlace de la videollamada. Revisa tu bandeja de entrada.
        </p>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;margin-top:24px;">
    <p style="color:#475569;font-size:11px;margin:0;">© WITHMIA · withmia.com</p>
  </div>
</div>
</body>
</html>
HTML;
    }

    /**
     * HTML email for the WITHMIA team when a booking arrives (fallback or notification).
     */
    private function buildTeamEmailHtml(array $data): string
    {
        $name = htmlspecialchars($data['name']);
        $email = htmlspecialchars($data['email']);
        $motivo = htmlspecialchars($data['motivo']);
        $company = !empty($data['company']) ? htmlspecialchars($data['company']) : '—';
        $date = $data['date'];
        $time = $data['time'];

        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0f0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <img src="https://app.withmia.com/icons/logo-withmia.png" alt="WITHMIA" width="120" style="display:inline-block;" />
  </div>
  <div style="background:#1a1230;border:1px solid rgba(139,92,246,0.15);border-radius:16px;overflow:hidden;">
    <div style="background:rgba(245,158,11,0.08);padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.05);">
      <h2 style="color:#fbbf24;font-size:16px;margin:0;">📅 Nuevo agendamiento web</h2>
      <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">{$date} a las {$time} hrs</p>
    </div>
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:90px;">Nombre</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">{$name}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Email</td><td style="color:#e2e8f0;font-size:13px;">{$email}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Empresa</td><td style="color:#e2e8f0;font-size:13px;">{$company}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">Motivo</td><td style="color:#e2e8f0;font-size:13px;">{$motivo}</td></tr>
      </table>
    </div>
    <div style="padding:0 24px 20px;">
      <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.12);border-radius:8px;padding:12px;">
        <p style="color:#fbbf24;font-size:12px;margin:0;">⚠️ No se pudo crear el evento automáticamente. Crear reunión manualmente.</p>
      </div>
    </div>
  </div>
</div>
</body>
</html>
HTML;
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
