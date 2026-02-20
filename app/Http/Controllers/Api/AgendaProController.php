<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarIntegration;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AgendaPro Integration Controller
 * 
 * AgendaPro usa API Key authentication.
 * El usuario ingresa su API key manualmente.
 * Docs: https://developers.agendapro.com/
 */
class AgendaProController extends Controller
{
    private const PROVIDER = 'agendapro';
    private const BASE_URL = 'https://api.agendapro.com/v1';

    // ==========================================
    // CONNECTION (API Key based)
    // ==========================================

    /**
     * Conectar AgendaPro con API Key.
     */
    public function connect(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'api_key' => 'required|string|min:10',
        ]);

        $apiKey = $validated['api_key'];

        // Verify the API key works
        try {
            $testResponse = Http::withHeaders([
                'Authorization' => "Token {$apiKey}",
                'Accept' => 'application/json',
            ])->get(self::BASE_URL . '/locations');

            if (!$testResponse->successful()) {
                return response()->json([
                    'error' => 'API Key inválida. Verifica tu token de AgendaPro.',
                    'details' => $testResponse->status(),
                ], 422);
            }

            // Extract company info from locations
            $locations = $testResponse->json()['data'] ?? $testResponse->json() ?? [];
            $companyName = null;
            if (!empty($locations) && is_array($locations)) {
                $first = is_array($locations[0] ?? null) ? $locations[0] : $locations;
                $companyName = $first['company_name'] ?? $first['name'] ?? null;
            }

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'No se pudo conectar con AgendaPro. Verifica tu API Key.',
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
                'provider_email' => $companyName ?? 'AgendaPro',
                'access_token' => $apiKey,
                'refresh_token' => null,
                'token_expires_at' => null,
                'scopes' => ['locations', 'services', 'bookings', 'availability'],
                'settings' => [],
                'is_active' => true,
                'last_sync_at' => now(),
            ]
        );

        Log::info('[AgendaPro] Connected', ['user_id' => $user->id]);

        return response()->json([
            'success' => true,
            'message' => 'AgendaPro conectado correctamente',
        ]);
    }

    /**
     * Desconectar AgendaPro.
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
        Log::info('[AgendaPro] Disconnected', ['user_id' => $user->id]);
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
    // AGENDAPRO DATA
    // ==========================================

    /**
     * Listar sucursales/locations.
     */
    public function listLocations(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'AgendaPro not connected'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/locations');
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch locations'], 502);
            }

            return response()->json(['locations' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[AgendaPro] List locations error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Listar servicios.
     */
    public function listServices(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'AgendaPro not connected'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/services');
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch services'], 502);
            }

            return response()->json(['services' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[AgendaPro] List services error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Obtener disponibilidad.
     */
    public function getAvailability(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'AgendaPro not connected'], 400);
        }

        $validated = $request->validate([
            'service_id' => 'required',
            'date' => 'required|date_format:Y-m-d',
            'location_id' => 'nullable',
            'provider_id' => 'nullable',
        ]);

        try {
            $response = $this->apiGet($integration, '/availability', $validated);
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch availability'], 502);
            }

            return response()->json(['availability' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[AgendaPro] Availability error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Listar reservas.
     */
    public function listBookings(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'AgendaPro not connected'], 400);
        }

        $from = $request->input('from', now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('to', now()->endOfMonth()->format('Y-m-d'));

        try {
            $response = $this->apiGet($integration, '/bookings', [
                'from' => $from,
                'to' => $to,
            ]);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch bookings'], 502);
            }

            return response()->json(['bookings' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[AgendaPro] List bookings error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Crear una reserva.
     */
    public function createBooking(Request $request)
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'AgendaPro not connected'], 400);
        }

        $validated = $request->validate([
            'service_id' => 'required',
            'provider_id' => 'required',
            'location_id' => 'nullable',
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|string',
            'client_name' => 'required|string|max:200',
            'client_email' => 'nullable|email',
            'client_phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $response = $this->apiPost($integration, '/bookings', $validated);

            if (!$response->successful()) {
                Log::warning('[AgendaPro] Create booking failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 200),
                ]);
                return response()->json(['error' => 'Failed to create booking'], 502);
            }

            Log::info('[AgendaPro] Booking created', ['user_id' => $request->user()->id]);
            return response()->json([
                'success' => true,
                'booking' => $response->json()['data'] ?? $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[AgendaPro] Create booking error', ['error' => $e->getMessage()]);
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
                'message' => 'No AgendaPro integration with bot access',
            ]);
        }

        try {
            // Get services
            $servicesResponse = $this->apiGet($integration, '/services');
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

            // Get locations
            $locationsResponse = $this->apiGet($integration, '/locations');
            $locations = [];
            if ($locationsResponse->successful()) {
                $locations = collect($locationsResponse->json()['data'] ?? $locationsResponse->json())
                    ->map(fn($l) => [
                        'id' => $l['id'] ?? null,
                        'name' => $l['name'] ?? '',
                        'address' => $l['address'] ?? '',
                    ])->toArray();
            }

            // Get upcoming bookings
            $bookingsResponse = $this->apiGet($integration, '/bookings', [
                'from' => now()->format('Y-m-d'),
                'to' => now()->addDays(14)->format('Y-m-d'),
            ]);

            $bookings = [];
            if ($bookingsResponse->successful()) {
                $bookings = collect($bookingsResponse->json()['data'] ?? $bookingsResponse->json())
                    ->take(30)->map(fn($b) => [
                        'service' => $b['service_name'] ?? $b['service']['name'] ?? '',
                        'date' => $b['date'] ?? '',
                        'time' => $b['time'] ?? '',
                        'client' => $b['client_name'] ?? '',
                    ])->toArray();
            }

            return response()->json([
                'available' => true,
                'provider' => 'agendapro',
                'services' => $services,
                'locations' => $locations,
                'upcoming_bookings' => $bookings,
            ]);
        } catch (\Throwable $e) {
            Log::error('[AgendaPro] Bot availability error', ['error' => $e->getMessage()]);
            return response()->json(['available' => false, 'message' => 'Error']);
        }
    }

    public function botCreateBooking(Request $request)
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
            return response()->json(['error' => 'No AgendaPro integration with bot access'], 400);
        }

        $validated = $request->validate([
            'service_id' => 'required',
            'provider_id' => 'required',
            'location_id' => 'nullable',
            'date' => 'required|date_format:Y-m-d',
            'time' => 'required|string',
            'client_name' => 'required|string|max:200',
            'client_email' => 'nullable|email',
            'client_phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['notes'] = ($validated['notes'] ?? '') . "\n[Agendado por WITHMIA Bot]";

        try {
            $response = $this->apiPost($integration, '/bookings', $validated);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to create booking'], 502);
            }

            Log::info('[AgendaPro] Bot booking created', ['company_slug' => $companySlug]);
            return response()->json([
                'success' => true,
                'booking' => $response->json()['data'] ?? $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[AgendaPro] Bot create booking error', ['error' => $e->getMessage()]);
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
        ])->get(self::BASE_URL . $endpoint, $params);
    }

    private function apiPost(CalendarIntegration $integration, string $endpoint, array $data = [])
    {
        return Http::withHeaders([
            'Authorization' => "Token {$integration->access_token}",
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->post(self::BASE_URL . $endpoint, $data);
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
