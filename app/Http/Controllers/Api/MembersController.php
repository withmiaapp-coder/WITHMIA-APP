<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
            
            Log::info('Member updated', [
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
            
            // Si tiene chatwoot_agent_id, eliminar de Chatwoot
            if ($member->chatwoot_agent_id) {
                $this->deleteChatwootAgent($member);
            }
            
            $memberEmail = $member->email;
            $memberId = $member->id;
            
            // Eliminar usuario
            $member->delete();
            
            Log::info('Member deleted', [
                'member_id' => $memberId,
                'member_email' => $memberEmail,
                'deleted_by' => $user->id
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Miembro eliminado correctamente'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting member: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar miembro'
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
