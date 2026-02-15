<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\User;
use App\Services\UserDeletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || !$user->isSuperAdmin()) {
                if ($request->expectsJson()) {
                    return response()->json(['error' => 'Unauthorized — super admin required'], 403);
                }
                return redirect('/dashboard')->with('error', 'Acceso restringido a super administradores');
            }

            return $next($request);
        });
    }

    /**
     * Admin Dashboard
     */
    public function dashboard()
    {
        return inertia('admin/AdminDashboard');
    }

    /**
     * Users Management Page
     */
    public function users()
    {
        return inertia('admin/Users');
    }

    /**
     * Companies Management Page
     */
    public function companies()
    {
        return inertia('admin/Companies');
    }

    /**
     * API: Get all users
     */
    public function apiUsers()
    {
        $users = User::select('id', 'name', 'email', 'role', 'company_slug', 'onboarding_completed', 'created_at', 'updated_at')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['users' => $users]);
    }

    /**
     * API: Get all companies
     */
    public function apiCompanies()
    {
        $companies = Company::select('id', 'name', 'slug', 'is_active', 'chatwoot_inbox_id', 'created_at', 'updated_at')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['companies' => $companies]);
    }

    /**
     * API: Update user role
     */
    public function updateUserRole(Request $request, $id)
    {
        $request->validate([
            'role' => 'required|in:agent,admin,superadmin'
        ]);

        $user = User::findOrFail($id);
        $user->role = $request->role;
        $user->save();

        return response()->json(['success' => true, 'message' => 'Rol actualizado correctamente']);
    }

    /**
     * API: Delete user.
     * Usa UserDeletionService para limpieza completa de datos.
     */
    public function deleteUser($id, UserDeletionService $deletionService)
    {
        if (Auth::id() == $id) {
            return response()->json(['error' => 'No puedes eliminarte a ti mismo'], 400);
        }

        $user = User::findOrFail($id);
        $result = $deletionService->delete($user, force: false, deletedBy: Auth::id());

        if (!$result['success']) {
            return response()->json(['error' => $result['message']], 500);
        }

        return response()->json(['success' => true, 'message' => 'Usuario eliminado correctamente']);
    }

    /**
     * API: Get admin stats
     */
    public function stats()
    {
        $users = User::select('id', 'name', 'email', 'role', 'company_slug', 'onboarding_completed', 'created_at')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $companies = Company::select('id', 'name', 'slug', 'is_active', 'chatwoot_inbox_id', 'created_at')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'total_users' => User::count(),
            'total_companies' => Company::count(),
            'users' => $users,
            'companies' => $companies,
        ]);
    }

    /**
     * API: Health check real de todos los servicios
     */
    public function health()
    {
        $services = [];
        $startTotal = microtime(true);

        // 1. PostgreSQL
        $start = microtime(true);
        try {
            DB::select('SELECT 1');
            $services['postgresql'] = [
                'name' => 'PostgreSQL',
                'status' => 'healthy',
                'latency_ms' => round((microtime(true) - $start) * 1000),
                'details' => 'Conexión activa',
            ];
        } catch (\Throwable $e) {
            $services['postgresql'] = [
                'name' => 'PostgreSQL',
                'status' => 'down',
                'latency_ms' => round((microtime(true) - $start) * 1000),
                'details' => $e->getMessage(),
            ];
        }

        // 2. Redis
        $start = microtime(true);
        try {
            $pong = Redis::ping();
            $services['redis'] = [
                'name' => 'Redis',
                'status' => $pong ? 'healthy' : 'down',
                'latency_ms' => round((microtime(true) - $start) * 1000),
                'details' => $pong ? 'PONG recibido' : 'Sin respuesta',
            ];
        } catch (\Throwable $e) {
            $services['redis'] = [
                'name' => 'Redis',
                'status' => 'down',
                'latency_ms' => round((microtime(true) - $start) * 1000),
                'details' => $e->getMessage(),
            ];
        }

        // 3. n8n
        $start = microtime(true);
        $n8nUrl = config('n8n.url', '') ?: config('n8n.public_url', '');
        if ($n8nUrl) {
            try {
                $response = Http::timeout(5)->get("{$n8nUrl}/healthz");
                $services['n8n'] = [
                    'name' => 'n8n',
                    'status' => $response->successful() ? 'healthy' : 'warning',
                    'latency_ms' => round((microtime(true) - $start) * 1000),
                    'details' => $response->successful() ? 'API respondiendo' : "HTTP {$response->status()}",
                ];
            } catch (\Throwable $e) {
                $services['n8n'] = [
                    'name' => 'n8n',
                    'status' => 'down',
                    'latency_ms' => round((microtime(true) - $start) * 1000),
                    'details' => 'No responde: ' . class_basename($e),
                ];
            }
        } else {
            $services['n8n'] = [
                'name' => 'n8n',
                'status' => 'unknown',
                'latency_ms' => 0,
                'details' => 'URL no configurada',
            ];
        }

        // 4. Qdrant
        $start = microtime(true);
        $qdrantUrl = config('qdrant.url', '');
        $qdrantKey = config('qdrant.api_key', '');
        if ($qdrantUrl) {
            try {
                $response = Http::timeout(5)
                    ->withHeaders(['api-key' => $qdrantKey])
                    ->get("{$qdrantUrl}/collections");
                $collections = $response->json('result.collections') ?? [];
                $collectionsCount = count($collections);
                $collectionNames = array_map(fn($c) => $c['name'] ?? '', $collections);

                // Comparar con empresas activas
                $activeCompanies = \App\Models\Company::where('is_active', true)->pluck('slug')->toArray();
                $expectedCollections = array_map(fn($slug) => 'company_' . preg_replace('/[^a-z0-9_-]/', '_', strtolower($slug)) . '_knowledge', $activeCompanies);
                $missing = array_diff($expectedCollections, $collectionNames);
                $missingCount = count($missing);

                $detailText = "{$collectionsCount}/" . count($expectedCollections) . " colecciones" . ($missingCount > 0 ? " ({$missingCount} faltantes)" : '');
                $qdrantStatus = $response->successful() ? ($missingCount > 0 ? 'warning' : 'healthy') : 'warning';

                $services['qdrant'] = [
                    'name' => 'Qdrant',
                    'status' => $qdrantStatus,
                    'latency_ms' => round((microtime(true) - $start) * 1000),
                    'details' => $response->successful() ? $detailText : "HTTP {$response->status()}",
                ];
            } catch (\Throwable $e) {
                $services['qdrant'] = [
                    'name' => 'Qdrant',
                    'status' => 'down',
                    'latency_ms' => round((microtime(true) - $start) * 1000),
                    'details' => 'No responde: ' . class_basename($e),
                ];
            }
        } else {
            $services['qdrant'] = [
                'name' => 'Qdrant',
                'status' => 'unknown',
                'latency_ms' => 0,
                'details' => 'URL no configurada',
            ];
        }

        // 5. Chatwoot
        $start = microtime(true);
        $chatwootUrl = config('chatwoot.url', '');
        if ($chatwootUrl) {
            try {
                $response = Http::timeout(5)->get("{$chatwootUrl}/auth/sign_in");
                // Chatwoot devuelve 200 o 401/405 si está vivo
                $isAlive = in_array($response->status(), [200, 401, 403, 405, 422]);
                $services['chatwoot'] = [
                    'name' => 'Chatwoot',
                    'status' => $isAlive ? 'healthy' : 'warning',
                    'latency_ms' => round((microtime(true) - $start) * 1000),
                    'details' => $isAlive ? "Respondiendo (HTTP {$response->status()})" : "HTTP {$response->status()}",
                ];
            } catch (\Throwable $e) {
                $services['chatwoot'] = [
                    'name' => 'Chatwoot',
                    'status' => 'down',
                    'latency_ms' => round((microtime(true) - $start) * 1000),
                    'details' => 'No responde: ' . class_basename($e),
                ];
            }
        } else {
            $services['chatwoot'] = [
                'name' => 'Chatwoot',
                'status' => 'unknown',
                'latency_ms' => 0,
                'details' => 'URL no configurada',
            ];
        }

        // 6. Evolution API
        $start = microtime(true);
        $evolutionUrl = config('evolution.api_url', '');
        $evolutionKey = config('evolution.api_key', '');
        if ($evolutionUrl) {
            try {
                $response = Http::timeout(5)
                    ->withHeaders(['apikey' => $evolutionKey])
                    ->get("{$evolutionUrl}/instance/fetchInstances");
                $instanceCount = is_array($response->json()) ? count($response->json()) : 0;
                $services['evolution'] = [
                    'name' => 'Evolution API',
                    'status' => $response->successful() ? 'healthy' : 'warning',
                    'latency_ms' => round((microtime(true) - $start) * 1000),
                    'details' => $response->successful() ? "{$instanceCount} instancias" : "HTTP {$response->status()}",
                ];
            } catch (\Throwable $e) {
                $services['evolution'] = [
                    'name' => 'Evolution API',
                    'status' => 'down',
                    'latency_ms' => round((microtime(true) - $start) * 1000),
                    'details' => 'No responde: ' . class_basename($e),
                ];
            }
        } else {
            $services['evolution'] = [
                'name' => 'Evolution API',
                'status' => 'unknown',
                'latency_ms' => 0,
                'details' => 'URL no configurada',
            ];
        }

        $totalMs = round((microtime(true) - $startTotal) * 1000);
        $healthyCount = count(array_filter($services, fn($s) => $s['status'] === 'healthy'));
        $totalCount = count($services);

        return response()->json([
            'services' => array_values($services),
            'summary' => [
                'healthy' => $healthyCount,
                'total' => $totalCount,
                'total_latency_ms' => $totalMs,
                'checked_at' => now()->toIso8601String(),
            ],
        ]);
    }
}
