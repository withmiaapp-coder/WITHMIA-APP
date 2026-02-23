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
 * Reservo Integration Controller
 * 
 * Reservo usa API Key authentication (no OAuth).
 * El usuario ingresa su API key y subdomain manualmente.
 * Docs: https://developers.reservo.cl/
 */
class ReservoController extends Controller
{
    use FormatsIntegration;

    private const PROVIDER = 'reservo';

    // ==========================================
    // CONNECTION (API Key based)
    // ==========================================

    /**
     * Conectar Reservo con API Key + Subdomain.
     */
    public function connect(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'api_key' => 'required|string|min:10',
            'subdomain' => 'required|string|min:2|max:100',
        ]);

        $apiKey = $validated['api_key'];
        $subdomain = rtrim($validated['subdomain'], '/');

        // Remove https:// and .reservo.cl if user included them
        $subdomain = preg_replace('#^https?://#', '', $subdomain);
        $subdomain = preg_replace('#\.reservo\.cl.*$#', '', $subdomain);

        $baseUrl = "https://{$subdomain}.reservo.cl/api/v1";

        // Verify the API key works
        try {
            $testResponse = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Accept' => 'application/json',
            ])->get("{$baseUrl}/services");

            if (!$testResponse->successful()) {
                return response()->json([
                    'error' => 'API Key o subdominio inválido. Verifica tus credenciales de Reservo.',
                    'details' => $testResponse->status(),
                ], 422);
            }
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'No se pudo conectar con Reservo. Verifica el subdominio.',
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
                'provider_email' => $subdomain,
                'access_token' => $apiKey,
                'refresh_token' => null,
                'token_expires_at' => null, // API keys don't expire
                'scopes' => ['services', 'bookings', 'availability'],
                'settings' => [
                    'subdomain' => $subdomain,
                    'base_url' => $baseUrl,
                ],
                'is_active' => true,
                'last_sync_at' => now(),
            ]
        );

        Log::info('[Reservo] Connected', ['user_id' => $user->id, 'subdomain' => $subdomain]);

        return response()->json([
            'success' => true,
            'message' => 'Reservo conectado correctamente',
        ]);
    }

    /**
     * Desconectar Reservo.
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
        Log::info('[Reservo] Disconnected', ['user_id' => $user->id]);
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
    // RESERVO DATA
    // ==========================================

    /**
     * Listar servicios disponibles.
     */
    public function listServices(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Reservo not connected'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/services');
            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch services'], 502);
            }

            return response()->json(['services' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Reservo] List services error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Obtener disponibilidad para un servicio.
     */
    public function getAvailability(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Reservo not connected'], 400);
        }

        $serviceId = $request->input('service_id');
        $date = $request->input('date', now()->format('Y-m-d'));

        if (!$serviceId) {
            return response()->json(['error' => 'service_id required'], 400);
        }

        try {
            $response = $this->apiGet($integration, '/availability', [
                'service_id' => $serviceId,
                'date' => $date,
            ]);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch availability'], 502);
            }

            return response()->json(['availability' => $response->json()['data'] ?? $response->json()]);
        } catch (\Throwable $e) {
            Log::error('[Reservo] Availability error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Listar reservas/bookings.
     */
    public function listBookings(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Reservo not connected'], 400);
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
            Log::error('[Reservo] List bookings error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed'], 500);
        }
    }

    /**
     * Crear una reserva.
     */
    public function createBooking(Request $request): JsonResponse
    {
        $integration = $this->getIntegration($request);
        if (!$integration) {
            return response()->json(['error' => 'Reservo not connected'], 400);
        }

        $validated = $request->validate([
            'service_id' => 'required|integer',
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
                Log::warning('[Reservo] Create booking failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 200),
                ]);
                return response()->json(['error' => 'Failed to create booking'], 502);
            }

            Log::info('[Reservo] Booking created', ['user_id' => $request->user()->id]);
            return response()->json([
                'success' => true,
                'booking' => $response->json()['data'] ?? $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[Reservo] Create booking error', ['error' => $e->getMessage()]);
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
                'message' => 'No Reservo integration with bot access',
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

            // Get upcoming bookings
            $bookingsResponse = $this->apiGet($integration, '/bookings', [
                'from' => now()->format('Y-m-d'),
                'to' => now()->addDays(14)->format('Y-m-d'),
            ]);

            $bookings = [];
            if ($bookingsResponse->successful()) {
                $bookings = collect($bookingsResponse->json()['data'] ?? $bookingsResponse->json())
                    ->take(30)->map(fn($b) => [
                        'service' => $b['service']['name'] ?? $b['service_name'] ?? '',
                        'date' => $b['date'] ?? '',
                        'time' => $b['time'] ?? '',
                        'client' => $b['client_name'] ?? '',
                    ])->toArray();
            }

            return response()->json([
                'available' => true,
                'provider' => 'reservo',
                'subdomain' => $integration->settings['subdomain'] ?? '',
                'services' => $services,
                'upcoming_bookings' => $bookings,
            ]);
        } catch (\Throwable $e) {
            Log::error('[Reservo] Bot availability error', ['error' => $e->getMessage()]);
            return response()->json(['available' => false, 'message' => 'Error']);
        }
    }

    public function botCreateBooking(Request $request): JsonResponse
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
            return response()->json(['error' => 'No Reservo integration with bot access'], 400);
        }

        $validated = $request->validate([
            'service_id' => 'required|integer',
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

            Log::info('[Reservo] Bot booking created', ['company_slug' => $companySlug]);
            return response()->json([
                'success' => true,
                'booking' => $response->json()['data'] ?? $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[Reservo] Bot create booking error', ['error' => $e->getMessage()]);
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
        return $integration->settings['base_url']
            ?? "https://{$integration->provider_email}.reservo.cl/api/v1";
    }

    private function apiGet(CalendarIntegration $integration, string $endpoint, array $params = [])
    {
        return Http::withHeaders([
            'Authorization' => "Bearer {$integration->access_token}",
            'Accept' => 'application/json',
        ])->get($this->getBaseUrl($integration) . $endpoint, $params);
    }

    private function apiPost(CalendarIntegration $integration, string $endpoint, array $data = [])
    {
        return Http::withHeaders([
            'Authorization' => "Bearer {$integration->access_token}",
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->post($this->getBaseUrl($integration) . $endpoint, $data);
    }

}
