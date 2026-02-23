<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarIntegration;
use App\Models\Company;
use App\Traits\FormatsIntegration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Dentalink Integration Controller
 * 
 * Dentalink usa API Token authentication.
 * El usuario ingresa su API token manualmente.
 * Docs: https://api.dentalink.healthatom.com/docs
 * Base URL: https://api.dentalink.healthatom.com/api/v1
 */
class DentalinkController extends Controller
{
    use FormatsIntegration;

    private const PROVIDER = 'dentalink';
    private const BASE_URL = 'https://api.dentalink.healthatom.com/api/v1';

    // ==========================================
    // CONNECTION (API Token based)
    // ==========================================

    /**
     * Conectar Dentalink con API Token.
     */
    public function connect(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'api_key' => 'required|string|min:10',
        ]);

        $apiToken = $validated['api_key'];

        // Verify the API token works by fetching sucursales (branches)
        try {
            $testResponse = Http::withHeaders([
                'Authorization' => "Token {$apiToken}",
                'Accept' => 'application/json',
            ])->timeout(15)->get(self::BASE_URL . '/sucursales');

            if (!$testResponse->successful()) {
                return response()->json([
                    'error' => 'Token inválido. Verifica tu API Token de Dentalink.',
                    'details' => $testResponse->status(),
                ], 422);
            }

            // Extract clinic info from branches
            $branches = $testResponse->json()['data'] ?? $testResponse->json() ?? [];
            $clinicName = null;
            if (!empty($branches) && is_array($branches)) {
                $first = is_array($branches[0] ?? null) ? $branches[0] : $branches;
                $clinicName = $first['nombre'] ?? $first['name'] ?? null;
            }

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'No se pudo conectar con Dentalink. Verifica tu API Token.',
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
                'provider_email' => $clinicName ?? 'Dentalink',
                'access_token' => $apiToken,
                'refresh_token' => null,
                'token_expires_at' => null,
                'scopes' => ['sucursales', 'dentistas', 'citas', 'pacientes'],
                'settings' => [],
                'is_active' => true,
                'last_sync_at' => now(),
            ]
        );

        Log::info('[Dentalink] Connected', ['user_id' => $user->id]);

        return response()->json([
            'success' => true,
            'message' => 'Dentalink conectado correctamente',
        ]);
    }

    /**
     * Desconectar Dentalink.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();
        $integration = CalendarIntegration::where('user_id', $user->id)
            ->where('provider', self::PROVIDER)->first();

        if (!$integration) {
            return response()->json(['error' => 'No integration found'], 404);
        }

        $integration->delete();
        Log::info('[Dentalink] Disconnected', ['user_id' => $user->id]);
        return response()->json(['success' => true]);
    }

    // ==========================================
    // STATUS & SETTINGS
    // ==========================================

    public function status(Request $request): JsonResponse
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

    public function updateSettings(Request $request): JsonResponse
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
    // DENTALINK DATA ENDPOINTS
    // ==========================================

    /**
     * Listar sucursales (branches/locations).
     */
    public function listBranches(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Dentalink not connected'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/sucursales');
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch branches'], 502);
            }

            return response()->json(['branches' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Dentalink] List branches error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Listar dentistas/profesionales.
     */
    public function listDentists(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Dentalink not connected'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/dentistas');
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch dentists'], 502);
            }

            return response()->json(['dentists' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Dentalink] List dentists error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Listar tratamientos/servicios.
     */
    public function listTreatments(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Dentalink not connected'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/tratamientos');
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch treatments'], 502);
            }

            return response()->json(['treatments' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Dentalink] List treatments error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Obtener disponibilidad de citas.
     */
    public function getAvailability(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Dentalink not connected'], 400);
        }

        $validated = $request->validate([
            'dentist_id' => 'nullable',
            'branch_id' => 'nullable',
            'date' => 'required|date_format:Y-m-d',
        ]);

        try {
            $params = ['fecha' => $validated['date']];
            if (!empty($validated['dentist_id'])) {
                $params['id_dentista'] = $validated['dentist_id'];
            }
            if (!empty($validated['branch_id'])) {
                $params['id_sucursal'] = $validated['branch_id'];
            }

            $response = $this->apiGet($integration, '/citas/disponibilidad', $params);
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch availability'], 502);
            }

            return response()->json(['availability' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Dentalink] Availability error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Listar citas (appointments).
     */
    public function listAppointments(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Dentalink not connected'], 400);
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
            Log::error('[Dentalink] List appointments error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Crear una cita.
     */
    public function createAppointment(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Dentalink not connected'], 400);
        }

        $validated = $request->validate([
            'dentist_id' => 'required',
            'branch_id' => 'nullable',
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|string',
            'duration' => 'nullable|integer|min:15',
            'patient_name' => 'required|string|max:200',
            'patient_email' => 'nullable|email',
            'patient_phone' => 'nullable|string|max:20',
            'patient_rut' => 'nullable|string|max:15',
            'treatment_id' => 'nullable',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $payload = [
                'id_dentista' => $validated['dentist_id'],
                'fecha' => $validated['date'],
                'hora' => $validated['time'],
                'duracion' => $validated['duration'] ?? 30,
                'paciente' => [
                    'nombre' => $validated['patient_name'],
                    'email' => $validated['patient_email'] ?? '',
                    'telefono' => $validated['patient_phone'] ?? '',
                    'rut' => $validated['patient_rut'] ?? '',
                ],
                'notas' => $validated['notes'] ?? '',
            ];

            if (!empty($validated['branch_id'])) {
                $payload['id_sucursal'] = $validated['branch_id'];
            }
            if (!empty($validated['treatment_id'])) {
                $payload['id_tratamiento'] = $validated['treatment_id'];
            }

            $response = $this->apiPost($integration, '/citas', $payload);

            if (!$response->successful()) {
                Log::warning('[Dentalink] Create appointment failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 200),
                ]);
                return response()->json(['error' => 'Failed to create appointment'], 502);
            }

            Log::info('[Dentalink] Appointment created', ['user_id' => $request->user()->id]);
            return response()->json([
                'success' => true,
                'appointment' => $response->json()['data'] ?? $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[Dentalink] Create appointment error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    // ==========================================
    // BOT ACCESS
    // ==========================================

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

        $integration = CalendarIntegration::where('company_id', $company->id)
            ->where('provider', self::PROVIDER)
            ->where('bot_access_enabled', true)
            ->where('is_active', true)
            ->first();

        if (!$integration) {
            return response()->json([
                'available' => false,
                'message' => 'No Dentalink integration with bot access',
            ]);
        }

        try {
            // Get dentists
            $dentistsResponse = $this->apiGet($integration, '/dentistas');
            $dentists = [];
            if ($dentistsResponse->successful()) {
                $dentists = collect($dentistsResponse->json()['data'] ?? $dentistsResponse->json())
                    ->map(fn($d) => [
                        'id' => $d['id'] ?? null,
                        'name' => $d['nombre'] ?? $d['name'] ?? '',
                        'specialty' => $d['especialidad'] ?? $d['specialty'] ?? '',
                    ])->toArray();
            }

            // Get branches
            $branchesResponse = $this->apiGet($integration, '/sucursales');
            $branches = [];
            if ($branchesResponse->successful()) {
                $branches = collect($branchesResponse->json()['data'] ?? $branchesResponse->json())
                    ->map(fn($b) => [
                        'id' => $b['id'] ?? null,
                        'name' => $b['nombre'] ?? $b['name'] ?? '',
                        'address' => $b['direccion'] ?? $b['address'] ?? '',
                    ])->toArray();
            }

            // Get treatments
            $treatmentsResponse = $this->apiGet($integration, '/tratamientos');
            $treatments = [];
            if ($treatmentsResponse->successful()) {
                $treatments = collect($treatmentsResponse->json()['data'] ?? $treatmentsResponse->json())
                    ->take(50)->map(fn($t) => [
                        'id' => $t['id'] ?? null,
                        'name' => $t['nombre'] ?? $t['name'] ?? '',
                        'price' => $t['precio'] ?? $t['price'] ?? 0,
                        'duration' => $t['duracion'] ?? $t['duration'] ?? 0,
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
                        'dentist' => $a['dentista_nombre'] ?? $a['dentista']['nombre'] ?? '',
                        'date' => $a['fecha'] ?? '',
                        'time' => $a['hora'] ?? '',
                        'patient' => $a['paciente_nombre'] ?? $a['paciente']['nombre'] ?? '',
                        'treatment' => $a['tratamiento_nombre'] ?? '',
                    ])->toArray();
            }

            return response()->json([
                'available' => true,
                'provider' => 'dentalink',
                'dentists' => $dentists,
                'branches' => $branches,
                'treatments' => $treatments,
                'upcoming_appointments' => $appointments,
            ]);
        } catch (\Throwable $e) {
            Log::error('[Dentalink] Bot availability error', ['error' => $e->getMessage()]);
            return response()->json(['available' => false, 'message' => 'Error']);
        }
    }

    public function botCreateAppointment(Request $request): JsonResponse
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
            return response()->json(['error' => 'No Dentalink integration with bot access'], 400);
        }

        $validated = $request->validate([
            'dentist_id' => 'required',
            'branch_id' => 'nullable',
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|string',
            'duration' => 'nullable|integer|min:15',
            'patient_name' => 'required|string|max:200',
            'patient_email' => 'nullable|email',
            'patient_phone' => 'nullable|string|max:20',
            'patient_rut' => 'nullable|string|max:15',
            'treatment_id' => 'nullable',
            'notes' => 'nullable|string|max:1000',
        ]);

        $payload = [
            'id_dentista' => $validated['dentist_id'],
            'fecha' => $validated['date'],
            'hora' => $validated['time'],
            'duracion' => $validated['duration'] ?? 30,
            'paciente' => [
                'nombre' => $validated['patient_name'],
                'email' => $validated['patient_email'] ?? '',
                'telefono' => $validated['patient_phone'] ?? '',
                'rut' => $validated['patient_rut'] ?? '',
            ],
            'notas' => ($validated['notes'] ?? '') . "\n[Agendado por WITHMIA Bot]",
        ];

        if (!empty($validated['branch_id'])) {
            $payload['id_sucursal'] = $validated['branch_id'];
        }
        if (!empty($validated['treatment_id'])) {
            $payload['id_tratamiento'] = $validated['treatment_id'];
        }

        try {
            $response = $this->apiPost($integration, '/citas', $payload);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to create appointment'], 502);
            }

            Log::info('[Dentalink] Bot appointment created', ['company_slug' => $companySlug]);
            return response()->json([
                'success' => true,
                'appointment' => $response->json()['data'] ?? $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[Dentalink] Bot create appointment error', ['error' => $e->getMessage()]);
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

    private function apiGet(CalendarIntegration $integration, string $endpoint, array $params = [])
    {
        return Http::withHeaders([
            'Authorization' => "Token {$integration->access_token}",
            'Accept' => 'application/json',
        ])->timeout(15)->get(self::BASE_URL . $endpoint, $params);
    }

    private function apiPost(CalendarIntegration $integration, string $endpoint, array $data = [])
    {
        return Http::withHeaders([
            'Authorization' => "Token {$integration->access_token}",
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->timeout(15)->post(self::BASE_URL . $endpoint, $data);
    }

}
