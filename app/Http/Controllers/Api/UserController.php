<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function profile(): JsonResponse
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'No autenticado',
                ], 401);
            }

            $cacheKey = "user:profile:{$user->id}";

            $data = Cache::remember($cacheKey, 300, function () use ($user) {
                $user->load('company');
                $inboxId = $user->chatwoot_inbox_id ?? $user->company?->chatwoot_inbox_id ?? null;

                return [
                    'success' => true,
                    'user' => $user,
                    'chatwoot_inbox_id' => $inboxId,
                ];
            });

            return response()->json($data);
        } catch (\Throwable $e) {
            Log::error('Error fetching user profile', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo perfil de usuario',
            ], 500);
        }
    }

    public function permissions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'No autenticado',
                    'role' => 'viewer',
                    'is_admin' => false,
                    'is_agent' => false,
                    'permissions' => [],
                ], 401);
            }

            return response()->json([
                'success' => true,
                'role' => $user->role ?? 'admin',
                'is_admin' => $user->isAdmin(),
                'is_agent' => $user->isAgent(),
                'is_super_admin' => $user->isSuperAdmin(),
                'permissions' => $user->getPermissions(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error fetching user permissions', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo permisos',
                'role' => 'viewer',
                'is_admin' => false,
                'is_agent' => false,
                'permissions' => [],
            ], 500);
        }
    }

    public function hasPermission(Request $request, $permission): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'permission' => $permission,
                    'has_permission' => false,
                ], 401);
            }

            return response()->json([
                'success' => true,
                'permission' => $permission,
                'has_permission' => $user->hasPermission($permission),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error checking permission', ['permission' => $permission, 'error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'permission' => $permission,
                'has_permission' => false,
            ], 500);
        }
    }
}
