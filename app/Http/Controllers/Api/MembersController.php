<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ChatwootService;
use App\Services\UserDeletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MembersController extends Controller
{
    private ChatwootService $chatwootService;

    public function __construct(ChatwootService $chatwootService)
    {
        $this->chatwootService = $chatwootService;
    }

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
            
            // Verificar que sea admin o superadmin
            if (!in_array($user->role, ['admin', 'superadmin'])) {
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
            
            if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
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
            
            $changes = [];
            $roleChanged = false;
            
            // Actualizar rol si se proporciona
            if ($request->has('role')) {
                $newRole = $request->input('role');
                if (in_array($newRole, ['admin', 'agent'])) {
                    $changes['role'] = ['from' => $member->role, 'to' => $newRole];
                    $member->role = $newRole;
                    $roleChanged = true;
                    
                    // Si cambia a admin, limpiar permisos personalizados
                    if ($newRole === 'admin') {
                        $member->permissions = null;
                    }
                }
            }
            
            // Actualizar permisos si se proporcionan (solo para agentes)
            if ($request->has('permissions') && $member->role !== 'admin') {
                $changes['permissions'] = 'updated';
                $member->permissions = $request->input('permissions');
            }
            
            $member->save();
            
            // Si tiene chatwoot_agent_id y cambió el rol, actualizar en Chatwoot
            if ($roleChanged && $member->chatwoot_agent_id) {
                $this->updateChatwootAgentRole($member);
            }
            
            Log::debug('Member updated', [
                'member_id' => $member->id,
                'updated_by' => $user->id,
                'changes' => $changes
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
     * Eliminar un miembro completamente del sistema.
     * Toda la limpieza se centraliza en UserDeletionService.
     */
    public function destroy(Request $request, $id, UserDeletionService $deletionService)
    {
        try {
            $user = auth()->user();

            if (!$user || !in_array($user->role, ['admin', 'superadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }

            $member = User::where('id', $id)
                ->where('company_slug', $user->company_slug)
                ->first();

            if (!$member) {
                return response()->json([
                    'success' => false,
                    'message' => 'Miembro no encontrado'
                ], 404);
            }

            if ($member->id === $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes eliminarte a ti mismo'
                ], 400);
            }

            $result = $deletionService->delete($member, force: true, deletedBy: $user->id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Miembro eliminado completamente del sistema'
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
            if (!$company || !$company->chatwoot_api_key || !$company->chatwoot_account_id || !$member->chatwoot_agent_id) {
                return;
            }
            
            $role = $member->role === 'admin' ? 'administrator' : 'agent';
            $this->chatwootService->updateAgentRole(
                $company->chatwoot_account_id,
                $company->chatwoot_api_key,
                $member->chatwoot_agent_id,
                $role
            );
            
        } catch (\Exception $e) {
            Log::error('Error updating Chatwoot agent role: ' . $e->getMessage());
        }
    }
}
