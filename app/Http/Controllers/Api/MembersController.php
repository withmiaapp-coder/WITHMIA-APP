<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class MembersController extends Controller
{
    /**
     * Listar miembros de la empresa del usuario actual
     */
    public function index(Request $request)
    {
        try {
            $user = auth()->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autenticado'
                ], 401);
            }
            
            // Verificar que sea admin
            if ($user->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }
            
            // Obtener miembros de la misma empresa
            $members = User::where('company_slug', $user->company_slug)
                ->select('id', 'name', 'email', 'role', 'permissions', 'chatwoot_agent_id', 'created_at')
                ->orderBy('role', 'asc')
                ->orderBy('name', 'asc')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $members
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching members: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener miembros'
            ], 500);
        }
    }
    
    /**
     * Actualizar rol y permisos de un miembro
     */
    public function update(Request $request, $id)
    {
        try {
            $user = auth()->user();
            
            if (!$user || $user->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }
            
            // Buscar el miembro
            $member = User::where('id', $id)
                ->where('company_slug', $user->company_slug)
                ->first();
            
            if (!$member) {
                return response()->json([
                    'success' => false,
                    'message' => 'Miembro no encontrado'
                ], 404);
            }
            
            // No permitir que el admin se modifique a sí mismo
            if ($member->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes modificar tu propio rol'
                ], 400);
            }
            
            $updateData = [];
            
            // Actualizar rol si se proporciona
            if ($request->has('role')) {
                $newRole = $request->input('role');
                if (in_array($newRole, ['admin', 'agent'])) {
                    $updateData['role'] = $newRole;
                    
                    // Si cambia a admin, limpiar permisos personalizados
                    if ($newRole === 'admin') {
                        $updateData['permissions'] = null;
                    }
                }
            }
            
            // Actualizar permisos si se proporcionan (solo para agentes)
            if ($request->has('permissions') && ($updateData['role'] ?? $member->role) !== 'admin') {
                $updateData['permissions'] = $request->input('permissions');
            }
            
            if (!empty($updateData)) {
                $member->update($updateData);
                
                // Si tiene chatwoot_agent_id y cambió el rol, actualizar en Chatwoot
                if (isset($updateData['role']) && $member->chatwoot_agent_id) {
                    $this->updateChatwootAgentRole($member);
                }
            }
            
            Log::debug('Member updated', [
                'member_id' => $member->id,
                'updated_by' => $user->id,
                'changes' => $updateData
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Miembro actualizado correctamente',
                'data' => $member->fresh()
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating member: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar miembro'
            ], 500);
        }
    }
    
    /**
     * Eliminar un miembro completamente del sistema
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = auth()->user();
            
            if (!$user || $user->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }
            
            // Buscar el miembro
            $member = User::where('id', $id)
                ->where('company_slug', $user->company_slug)
                ->first();
            
            if (!$member) {
                return response()->json([
                    'success' => false,
                    'message' => 'Miembro no encontrado'
                ], 404);
            }
            
            // No permitir que el admin se elimine a sí mismo
            if ($member->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes eliminarte a ti mismo'
                ], 400);
            }
            
            $memberEmail = $member->email;
            $memberId = $member->id;
            
            // Si tiene chatwoot_agent_id, eliminar de Chatwoot
            if ($member->chatwoot_agent_id) {
                $this->deleteChatwootAgent($member);
            }
            
            // ========================================
            // LIMPIEZA COMPLETA DE DATOS RELACIONADOS
            // ========================================
            
            // 1. Eliminar sesiones del usuario
            DB::table('sessions')->where('user_id', $memberId)->delete();
            
            // 2. Eliminar invitaciones donde este usuario fue invitado (por email)
            \App\Models\TeamInvitation::where('email', $memberEmail)->delete();
            
            // 3. Eliminar invitaciones de agente relacionadas
            if (Schema::hasTable('agent_invitations')) {
                DB::table('agent_invitations')->where('email', $memberEmail)->delete();
            }
            
            // 4. Desasignar pipeline items (no eliminar, solo desasignar)
            if (Schema::hasTable('pipeline_items')) {
                DB::table('pipeline_items')->where('assigned_to', $memberId)->update(['assigned_to' => null]);
            }
            
            // 5. Eliminar tokens de acceso personal si existen
            if (Schema::hasTable('personal_access_tokens')) {
                DB::table('personal_access_tokens')->where('tokenable_id', $memberId)
                    ->where('tokenable_type', 'App\\Models\\User')
                    ->delete();
            }
            
            // 6. Eliminar password reset tokens
            if (Schema::hasTable('password_reset_tokens')) {
                DB::table('password_reset_tokens')->where('email', $memberEmail)->delete();
            }
            
            // 7. Eliminar remember tokens / cache relacionado
            Cache::forget("user_{$memberId}_permissions");
            Cache::forget("user_{$memberId}_company");
            
            // Finalmente, eliminar el usuario
            $member->forceDelete(); // Usar forceDelete para asegurar eliminación permanente
            
            Log::debug('Member completely deleted with all related data', [
                'member_id' => $memberId,
                'member_email' => $memberEmail,
                'deleted_by' => $user->id
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Miembro eliminado completamente del sistema'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting member: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar miembro: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Actualizar rol del agente en Chatwoot
     */
    private function updateChatwootAgentRole(User $member)
    {
        try {
            $company = $member->company;
            if (!$company || !$company->chatwoot_api_key || !$company->chatwoot_account_id) {
                return;
            }
            
            $baseUrl = config('chatwoot.base_url') ?: config('services.chatwoot.base_url');
            $accountId = $company->chatwoot_account_id;
            
            Http::withHeaders([
                'api_access_token' => $company->chatwoot_api_key,
                'Content-Type' => 'application/json',
            ])->patch("{$baseUrl}/api/v1/accounts/{$accountId}/agents/{$member->chatwoot_agent_id}", [
                'role' => $member->role === 'admin' ? 'administrator' : 'agent',
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating Chatwoot agent role: ' . $e->getMessage());
        }
    }
    
    /**
     * Eliminar agente de Chatwoot
     */
    private function deleteChatwootAgent(User $member)
    {
        try {
            $company = $member->company;
            if (!$company || !$company->chatwoot_api_key || !$company->chatwoot_account_id) {
                return;
            }
            
            $baseUrl = config('chatwoot.base_url') ?: config('services.chatwoot.base_url');
            $accountId = $company->chatwoot_account_id;
            
            Http::withHeaders([
                'api_access_token' => $company->chatwoot_api_key,
            ])->delete("{$baseUrl}/api/v1/accounts/{$accountId}/agents/{$member->chatwoot_agent_id}");
            
        } catch (\Exception $e) {
            Log::error('Error deleting Chatwoot agent: ' . $e->getMessage());
        }
    }
}
