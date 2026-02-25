<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Models\UserMedia;

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

            $user->load('company');
            $inboxId = $user->chatwoot_inbox_id ?? $user->company?->chatwoot_inbox_id ?? null;

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'phone_country' => $user->phone_country ?? 'CL',
                    'avatar' => $user->avatar,
                    'cover_photo' => $user->cover_photo,
                    'role' => $user->role ?? 'user',
                    'company_slug' => $user->company_slug,
                    'company' => $user->company ? [
                        'id' => $user->company->id,
                        'name' => $user->company->name,
                    ] : null,
                    'chatwoot_inbox_id' => $inboxId,
                    'created_at' => $user->created_at?->toISOString(),
                    'last_login_at' => $user->last_login_at,
                ],
                // Keep backward compat
                'user' => $user,
                'chatwoot_inbox_id' => $inboxId,
            ]);
        } catch (\Throwable $e) {
            Log::error('Error fetching user profile', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo perfil de usuario',
            ], 500);
        }
    }

    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json(['success' => false, 'error' => 'No autenticado'], 401);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'full_name' => 'sometimes|nullable|string|max:255',
                'phone' => 'sometimes|nullable|string|max:20',
            ]);

            $user->fill($validated);
            $user->save();

            // Clear profile cache
            Cache::forget("user:profile:{$user->id}");

            return response()->json([
                'success' => true,
                'message' => 'Perfil actualizado exitosamente',
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'full_name' => $user->full_name,
                    'phone' => $user->phone,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Error updating user profile', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el perfil',
            ], 500);
        }
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json(['success' => false, 'error' => 'No autenticado'], 401);
            }

            $request->validate([
                'avatar' => 'required|image|max:5120', // 5MB
            ]);

            $file = $request->file('avatar');

            // Store in database
            UserMedia::updateOrCreate(
                ['user_id' => $user->id, 'type' => 'avatar'],
                [
                    'filename' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'data' => $file->getContent(),
                ]
            );

            $url = url("/user-media/{$user->id}/avatar") . '?v=' . time();
            $user->avatar = $url;
            $user->save();

            Cache::forget("user:profile:{$user->id}");

            return response()->json([
                'success' => true,
                'data' => ['avatar_url' => $url],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error uploading avatar', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Error al subir la imagen',
            ], 500);
        }
    }

    public function uploadCover(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json(['success' => false, 'error' => 'No autenticado'], 401);
            }

            $request->validate([
                'cover' => 'required|image|max:10240', // 10MB
            ]);

            $file = $request->file('cover');

            // Store in database
            UserMedia::updateOrCreate(
                ['user_id' => $user->id, 'type' => 'cover'],
                [
                    'filename' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'data' => $file->getContent(),
                ]
            );

            $url = url("/user-media/{$user->id}/cover") . '?v=' . time();
            $user->cover_photo = $url;
            $user->save();

            Cache::forget("user:profile:{$user->id}");

            return response()->json([
                'success' => true,
                'data' => ['cover_url' => $url],
            ]);
        } catch (\Throwable $e) {
            Log::error('Error uploading cover photo', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Error al subir la portada',
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
