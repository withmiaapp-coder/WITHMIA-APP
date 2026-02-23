<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarIntegration;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Medilink Integration Controller
 * 
 * Medilink (fichas médicas) usa API Token authentication.
 * El usuario ingresa su API token y URL base de su instancia.
 * Soporta gestión de pacientes, citas médicas y fichas clínicas.
 */
class MedilinkController extends Controller
{
    private const PROVIDER = 'medilink';
    private const DEFAULT_BASE_URL = 'https://api.medilink.cl/api/v1';

    // ==========================================
    // CONNECTION (API Token + Instance URL)
    // ==========================================

    /**
     * Conectar Medilink con API Token.
     */
    public function connect(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'api_key' => 'required|string|min:10',
            'instance_url' => 'nullable|url|max:500',
        ]);

        $apiToken = $validated['api_key'];
        $baseUrl = rtrim($validated['instance_url'] ?? self::DEFAULT_BASE_URL, '/');

        // Verify the API token works by fetching practitioners or clinic info
        try {
            $testResponse = Http::withHeaders([
                'Authorization' => "Bearer {$apiToken}",
                'Accept' => 'application/json',
            ])->timeout(15)->get($baseUrl . '/profesionales');

            if (!$testResponse->successful()) {
                // Try alternate endpoint
                $testResponse = Http::withHeaders([
                    'Authorization' => "Bearer {$apiToken}",
                    'Accept' => 'application/json',
                ])->timeout(15)->get($baseUrl . '/clinica');
            }

            if (!$testResponse->successful()) {
                return response()->json([
                    'error' => 'Token inválido. Verifica tu API Token de Medilink.',
                    'details' => $testResponse->status(),
                ], 422);
            }

            // Extract clinic info
            $responseData = $testResponse->json()['data'] ?? $testResponse->json() ?? [];
            $clinicName = null;
            if (is_array($responseData)) {
                if (!empty($responseData['nombre'])) {
                    $clinicName = $responseData['nombre'];
                } elseif (!empty($responseData[0])) {
                    $first = $responseData[0];
                    $clinicName = $first['clinica_nombre'] ?? $first['nombre'] ?? null;
                }
            }

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'No se pudo conectar con Medilink. Verifica tu API Token y URL.',
            ], 422);
        }

        $company = Company::where('slug', $user->company_slug)->first();
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        CalendarIntegration::updateOrCreate(
            ['user_id' => $user->id, 'provider' => self::PROVIDER],
            [
                'company_id' => $company->id,
                'provider_email' => $clinicName ?? 'Medilink',
                'access_token' => $apiToken,
                'refresh_token' => null,
                'token_expires_at' => null,
                'scopes' => ['profesionales', 'citas', 'pacientes', 'fichas'],
                'settings' => ['instance_url' => $baseUrl],
                'is_active' => true,
                'last_sync_at' => now(),
            ]
        );

        Log::info('[Medilink] Connected', ['user_id' => $user->id]);

        return response()->json([
            'success' => true,
            'message' => 'Medilink conectado correctamente',
        ]);
    }

    /**
     * Desconectar Medilink.
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
        Log::info('[Medilink] Disconnected', ['user_id' => $user->id]);
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

        $connected = $integration && $integration->is_active && !empty($integration->access_token);

        return response()->json([
            'connected' => $connected,
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
    // MEDILINK DATA ENDPOINTS
    // ==========================================

    /**
     * Listar profesionales/médicos.
     */
    public function listPractitioners(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Medilink not connected'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/profesionales');
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch practitioners'], 502);
            }

            return response()->json(['practitioners' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Medilink] List practitioners error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Listar especialidades.
     */
    public function listSpecialties(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Medilink not connected'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/especialidades');
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch specialties'], 502);
            }

            return response()->json(['specialties' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Medilink] List specialties error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Obtener disponibilidad de citas.
     */
    public function getAvailability(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Medilink not connected'], 400);
        }

        $validated = $request->validate([
            'practitioner_id' => 'nullable',
            'specialty_id' => 'nullable',
            'date' => 'required|date_format:Y-m-d',
        ]);

        try {
            $params = ['fecha' => $validated['date']];
            if (!empty($validated['practitioner_id'])) {
                $params['id_profesional'] = $validated['practitioner_id'];
            }
            if (!empty($validated['specialty_id'])) {
                $params['id_especialidad'] = $validated['specialty_id'];
            }

            $response = $this->apiGet($integration, '/citas/disponibilidad', $params);
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch availability'], 502);
            }

            return response()->json(['availability' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Medilink] Availability error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Listar citas (appointments).
     */
    public function listAppointments(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Medilink not connected'], 400);
        }

        $from = $request->input('from', now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('to', now()->endOfMonth()->format('Y-m-d'));

        try {
            $response = $this->apiGet($integration, '/citas', [
                'fecha_inicio' => $from,
                'fecha_fin' => $to,
            ]);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch appointments'], 502);
            }

            return response()->json(['appointments' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Medilink] List appointments error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Crear una cita médica.
     */
    public function createAppointment(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Medilink not connected'], 400);
        }

        $validated = $request->validate([
            'practitioner_id' => 'required',
            'specialty_id' => 'nullable',
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|string',
            'duration' => 'nullable|integer|min:10',
            'patient_name' => 'required|string|max:200',
            'patient_email' => 'nullable|email',
            'patient_phone' => 'nullable|string|max:20',
            'patient_rut' => 'nullable|string|max:15',
            'reason' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $payload = [
                'id_profesional' => $validated['practitioner_id'],
                'fecha' => $validated['date'],
                'hora' => $validated['time'],
                'duracion' => $validated['duration'] ?? 30,
                'paciente' => [
                    'nombre' => $validated['patient_name'],
                    'email' => $validated['patient_email'] ?? '',
                    'telefono' => $validated['patient_phone'] ?? '',
                    'rut' => $validated['patient_rut'] ?? '',
                ],
                'motivo_consulta' => $validated['reason'] ?? '',
                'notas' => $validated['notes'] ?? '',
            ];

            if (!empty($validated['specialty_id'])) {
                $payload['id_especialidad'] = $validated['specialty_id'];
            }

            $response = $this->apiPost($integration, '/citas', $payload);

            if (!$response->successful()) {
                Log::warning('[Medilink] Create appointment failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 200),
                ]);
                return response()->json(['error' => 'Failed to create appointment'], 502);
            }

            Log::info('[Medilink] Appointment created', ['user_id' => $request->user()->id]);
            return response()->json([
                'success' => true,
                'appointment' => $response->json()['data'] ?? $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[Medilink] Create appointment error', ['error' => $e->getMessage()]);
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
            return response()->json([
                'available' => false,
                'message' => 'No Medilink integration with bot access',
            ]);
        }

        try {
            // Get practitioners
            $practitionersResponse = $this->apiGet($integration, '/profesionales');
            $practitioners = [];
            if ($practitionersResponse->successful()) {
                $practitioners = collect($practitionersResponse->json()['data'] ?? $practitionersResponse->json())
                    ->map(fn($p) => [
                        'id' => $p['id'] ?? null,
                        'name' => $p['nombre'] ?? $p['name'] ?? '',
                        'specialty' => $p['especialidad'] ?? $p['specialty'] ?? '',
                    ])->toArray();
            }

            // Get specialties
            $specialtiesResponse = $this->apiGet($integration, '/especialidades');
            $specialties = [];
            if ($specialtiesResponse->successful()) {
                $specialties = collect($specialtiesResponse->json()['data'] ?? $specialtiesResponse->json())
                    ->map(fn($s) => [
                        'id' => $s['id'] ?? null,
                        'name' => $s['nombre'] ?? $s['name'] ?? '',
                    ])->toArray();
            }

            // Get upcoming appointments
            $appointmentsResponse = $this->apiGet($integration, '/citas', [
                'fecha_inicio' => now()->format('Y-m-d'),
                'fecha_fin' => now()->addDays(14)->format('Y-m-d'),
            ]);

            $appointments = [];
            if ($appointmentsResponse->successful()) {
                $appointments = collect($appointmentsResponse->json()['data'] ?? $appointmentsResponse->json())
                    ->take(30)->map(fn($a) => [
                        'practitioner' => $a['profesional_nombre'] ?? $a['profesional']['nombre'] ?? '',
                        'specialty' => $a['especialidad_nombre'] ?? '',
                        'date' => $a['fecha'] ?? '',
                        'time' => $a['hora'] ?? '',
                        'patient' => $a['paciente_nombre'] ?? $a['paciente']['nombre'] ?? '',
                        'reason' => $a['motivo_consulta'] ?? '',
                    ])->toArray();
            }

            return response()->json([
                'available' => true,
                'provider' => 'medilink',
                'practitioners' => $practitioners,
                'specialties' => $specialties,
                'upcoming_appointments' => $appointments,
            ]);
        } catch (\Throwable $e) {
            Log::error('[Medilink] Bot availability error', ['error' => $e->getMessage()]);
            return response()->json(['available' => false, 'message' => 'Error']);
        }
    }

    public function botCreateAppointment(Request $request)
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
            return response()->json(['error' => 'No Medilink integration with bot access'], 400);
        }

        $validated = $request->validate([
            'practitioner_id' => 'required',
            'specialty_id' => 'nullable',
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|string',
            'duration' => 'nullable|integer|min:10',
            'patient_name' => 'required|string|max:200',
            'patient_email' => 'nullable|email',
            'patient_phone' => 'nullable|string|max:20',
            'patient_rut' => 'nullable|string|max:15',
            'reason' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);

        $payload = [
            'id_profesional' => $validated['practitioner_id'],
            'fecha' => $validated['date'],
            'hora' => $validated['time'],
            'duracion' => $validated['duration'] ?? 30,
            'paciente' => [
                'nombre' => $validated['patient_name'],
                'email' => $validated['patient_email'] ?? '',
                'telefono' => $validated['patient_phone'] ?? '',
                'rut' => $validated['patient_rut'] ?? '',
            ],
            'motivo_consulta' => $validated['reason'] ?? '',
            'notas' => ($validated['notes'] ?? '') . "\n[Agendado por WITHMIA Bot]",
        ];

        if (!empty($validated['specialty_id'])) {
            $payload['id_especialidad'] = $validated['specialty_id'];
        }

        try {
            $response = $this->apiPost($integration, '/citas', $payload);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to create appointment'], 502);
            }

            Log::info('[Medilink] Bot appointment created', ['company_slug' => $companySlug]);
            return response()->json([
                'success' => true,
                'appointment' => $response->json()['data'] ?? $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[Medilink] Bot create appointment error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private function getIntegration(Request $request): ?CalendarIntegration
    {
        return CalendarIntegration::where('user_id', $request->user()->id)
            ->where('provider', self::PROVIDER)->first();
    }

    private function getBaseUrl(CalendarIntegration $integration): string
    {
        return $integration->settings['instance_url'] ?? self::DEFAULT_BASE_URL;
    }

    private function apiGet(CalendarIntegration $integration, string $endpoint, array $params = [])
    {
        return Http::withHeaders([
            'Authorization' => "Bearer {$integration->access_token}",
            'Accept' => 'application/json',
        ])->timeout(15)->get($this->getBaseUrl($integration) . $endpoint, $params);
    }

    private function apiPost(CalendarIntegration $integration, string $endpoint, array $data = [])
    {
        return Http::withHeaders([
            'Authorization' => "Bearer {$integration->access_token}",
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->timeout(15)->post($this->getBaseUrl($integration) . $endpoint, $data);
    }

    private function formatIntegration(CalendarIntegration $integration): array
    {
        return [
            'id' => $integration->id,
            'provider' => $integration->provider,
            'provider_email' => $integration->provider_email,
            'is_active' => $integration->is_active,
            'is_connected' => $integration->is_active && !empty($integration->access_token),
            'bot_access_enabled' => $integration->bot_access_enabled,
            'settings' => $integration->settings,
            'last_sync_at' => $integration->last_sync_at?->toISOString(),
            'created_at' => $integration->created_at?->toISOString(),
        ];
    }
}
