<?php

namespace App\Services;

use App\Models\User;
use App\Models\TeamInvitation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Servicio centralizado para eliminación de usuarios.
 *
 * Antes la lógica estaba dispersa en:
 *  - AdminController::deleteUser()      → soft delete, solo Observer
 *  - ProfileController::destroy()       → soft delete, solo Observer
 *  - MembersController::destroy()       → forceDelete con cleanup parcial (sin Observer)
 *  - UserObserver::deleting()           → Evolution API + Excel + Qdrant
 *
 * Ahora toda la limpieza pasa por este servicio, garantizando que
 * NADA quede huérfano independientemente de quién dispare la eliminación.
 */
class UserDeletionService
{
    /**
     * Eliminar un usuario con limpieza completa de datos relacionados.
     * 
     * @param User   $user       Usuario a eliminar
     * @param bool   $force      true = forceDelete (permanente), false = softDelete
     * @param int|null $deletedBy  ID del usuario que ejecuta la acción (auditoría)
     * @return array  ['success' => bool, 'message' => string]
     */
    public function delete(User $user, bool $force = false, ?int $deletedBy = null): array
    {
        $userId = $user->id;
        $userEmail = $user->email;

        Log::info('UserDeletionService: Starting user deletion', [
            'user_id'    => $userId,
            'email'      => $userEmail,
            'force'      => $force,
            'deleted_by' => $deletedBy,
        ]);

        try {
            // ── 1. Chatwoot agent ──────────────────────────────────────
            $this->deleteChatwootAgent($user);

            // ── 2. Evolution API instance ──────────────────────────────
            $this->deleteEvolutionInstance($user);

            // ── 3. Excel files ─────────────────────────────────────────
            $this->deleteUserExcelFiles($user);

            // ── 4. Qdrant collection (solo si último admin) ────────────
            $this->deleteQdrantCollectionIfLastAdmin($user);

            // ── 5. Sessions ────────────────────────────────────────────
            DB::table('sessions')->where('user_id', $userId)->delete();

            // ── 6. Invitations ─────────────────────────────────────────
            TeamInvitation::where('email', $userEmail)->delete();

            // ── 7. Pipeline items (desasignar, no eliminar) ────────────
            if (Schema::hasTable('pipeline_items')) {
                DB::table('pipeline_items')
                    ->where('assigned_to', $userId)
                    ->update(['assigned_to' => null]);
            }

            // ── 8. Personal access tokens (Sanctum) ───────────────────
            if (Schema::hasTable('personal_access_tokens')) {
                DB::table('personal_access_tokens')
                    ->where('tokenable_id', $userId)
                    ->where('tokenable_type', 'App\\Models\\User')
                    ->delete();
            }

            // ── 9. Password reset tokens ──────────────────────────────
            if (Schema::hasTable('password_reset_tokens')) {
                DB::table('password_reset_tokens')
                    ->where('email', $userEmail)
                    ->delete();
            }

            // ── 10. Cache ──────────────────────────────────────────────
            Cache::forget("user_{$userId}_permissions");
            Cache::forget("user_{$userId}_company");
            Cache::forget("user:profile:{$userId}");

            // ── 11. Delete the user record ─────────────────────────────
            if ($force) {
                $user->forceDelete();
            } else {
                $user->delete();
            }

            Log::info('UserDeletionService: User deleted successfully', [
                'user_id' => $userId,
                'email'   => $userEmail,
                'force'   => $force,
            ]);

            return ['success' => true, 'message' => 'Usuario eliminado correctamente'];

        } catch (\Throwable $e) {
            Log::error('UserDeletionService: Failed to delete user', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);

            return ['success' => false, 'message' => 'Error al eliminar usuario: ' . $e->getMessage()];
        }
    }

    /**
     * Eliminar agente de Chatwoot vía API HTTP.
     */
    private function deleteChatwootAgent(User $user): void
    {
        if (empty($user->chatwoot_agent_id)) {
            return;
        }

        try {
            $company = $user->company;
            $accountId = $company?->chatwoot_account_id;
            $apiToken = $company?->chatwoot_api_key ?? config('chatwoot.api_key');
            $chatwootUrl = rtrim(config('chatwoot.url', ''), '/');

            if (!$accountId || !$apiToken || !$chatwootUrl) {
                Log::warning('UserDeletionService: Missing Chatwoot config for agent deletion', [
                    'user_id' => $user->id,
                ]);
                return;
            }

            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'api_access_token' => $apiToken,
            ])->delete("{$chatwootUrl}/api/v1/accounts/{$accountId}/agents/{$user->chatwoot_agent_id}");

            if ($response->successful()) {
                Log::debug('UserDeletionService: Chatwoot agent deleted', [
                    'agent_id' => $user->chatwoot_agent_id,
                ]);
            } else {
                Log::warning('UserDeletionService: Failed to delete Chatwoot agent', [
                    'agent_id' => $user->chatwoot_agent_id,
                    'status'   => $response->status(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('UserDeletionService: Exception deleting Chatwoot agent', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Eliminar instancia de Evolution API.
     */
    private function deleteEvolutionInstance(User $user): void
    {
        if (empty($user->whatsapp_instance_id)) {
            return;
        }

        try {
            $evolutionService = app(EvolutionApiService::class);
            $result = $evolutionService->deleteInstance($user->whatsapp_instance_id);

            Log::debug('UserDeletionService: Evolution instance ' . ($result['success'] ? 'deleted' : 'failed'), [
                'instance' => $user->whatsapp_instance_id,
            ]);
        } catch (\Throwable $e) {
            Log::error('UserDeletionService: Exception deleting Evolution instance', [
                'instance' => $user->whatsapp_instance_id,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    /**
     * Eliminar archivos Excel del usuario.
     */
    private function deleteUserExcelFiles(User $user): void
    {
        $directory = 'exports/contacts';
        $prefix = "contactos_whatsapp_user_{$user->id}_";

        try {
            if (!Storage::disk('public')->exists($directory)) {
                return;
            }

            $deleted = 0;
            foreach (Storage::disk('public')->files($directory) as $file) {
                $name = basename($file);
                if (str_starts_with($name, $prefix) && str_ends_with($name, '.xlsx')) {
                    Storage::disk('public')->delete($file);
                    $deleted++;
                }
            }

            if ($deleted > 0) {
                Log::debug('UserDeletionService: Excel files deleted', [
                    'user_id' => $user->id,
                    'count'   => $deleted,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('UserDeletionService: Exception deleting Excel files', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Eliminar colección Qdrant solo si el usuario es el último admin de la empresa.
     */
    private function deleteQdrantCollectionIfLastAdmin(User $user): void
    {
        if (empty($user->company_slug) || $user->role !== 'admin') {
            return;
        }

        $otherAdmins = User::where('company_slug', $user->company_slug)
            ->where('role', 'admin')
            ->where('id', '!=', $user->id)
            ->count();

        if ($otherAdmins > 0) {
            return;
        }

        try {
            $qdrantService = app(QdrantService::class);
            $collectionName = $qdrantService->getCollectionName($user->company_slug);
            $result = $qdrantService->deleteCollection($collectionName);

            Log::debug('UserDeletionService: Qdrant collection ' . ($result['success'] ? 'deleted' : 'failed'), [
                'collection' => $collectionName,
            ]);
        } catch (\Throwable $e) {
            Log::error('UserDeletionService: Exception deleting Qdrant collection', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
