<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ChatwootService;
use App\Traits\ChatwootDbAccess;
use App\Traits\ResolvesChatwootConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatwootTeamController extends Controller
{
    use ResolvesChatwootConfig, ChatwootDbAccess;

    private $accountId;
    private $inboxId;
    private $userId;
    private ChatwootService $chatwootService;

    public function __construct(ChatwootService $chatwootService)
    {
        $this->chatwootService = $chatwootService;
        $this->bootChatwootMiddleware();
    }

    /**
     * Obtener todos los equipos de la cuenta
     * OPTIMIZADO: BD directa + Sin N+1
     */
    public function getTeams(): JsonResponse
    {
        try {
            $user = auth()->user();
            $company = $user ? $user->company : null;

            if (!$company || !$company->chatwoot_account_id) {
                return response()->json(['success' => true, 'data' => [], 'message' => 'Sin Chatwoot configurado']);
            }

            $chatwootDb = $this->chatwootDb();

            $teams = $chatwootDb->table('teams')
                ->where('account_id', $this->accountId)
                ->select('id', 'name', 'description', 'allow_auto_assign', 'account_id')
                ->orderBy('name')
                ->get();

            if ($teams->isEmpty()) {
                return response()->json(['success' => true, 'data' => []]);
            }

            // Obtener miembros de todos los equipos en una sola query
            $teamIds = $teams->pluck('id')->toArray();
            $allMembers = $chatwootDb->table('team_members')
                ->join('users', 'team_members.user_id', '=', 'users.id')
                ->whereIn('team_members.team_id', $teamIds)
                ->select(
                    'team_members.team_id',
                    'users.id',
                    'users.name',
                    'users.display_name',
                    'users.email'
                )
                ->get();

            // Pre-cargar usuarios locales en UNA sola query (evita N+1)
            $allEmails = $allMembers->pluck('email')->filter()->unique()->toArray();
            $localUsers = !empty($allEmails)
                ? \App\Models\User::whereIn('email', $allEmails)->get()->keyBy('email')
                : collect();

            $membersByTeam = $allMembers->groupBy('team_id');

            $teamsWithMembers = $teams->map(function ($team) use ($membersByTeam, $localUsers) {
                $members = $membersByTeam->get($team->id, collect());

                $enrichedMembers = $members->map(function ($member) use ($localUsers) {
                    $localUser = $localUsers->get($member->email);
                    return [
                        'id' => $member->id,
                        'name' => $localUser->full_name ?? $member->display_name ?? $member->name,
                        'email' => $member->email,
                        'thumbnail' => ''
                    ];
                })->toArray();

                return [
                    'id' => $team->id,
                    'name' => $team->name,
                    'description' => $team->description,
                    'allow_auto_assign' => $team->allow_auto_assign,
                    'account_id' => $team->account_id,
                    'members' => $enrichedMembers
                ];
            })->toArray();

            return response()->json(['success' => true, 'data' => $teamsWithMembers]);

        } catch (\Throwable $e) {
            Log::error('getTeams Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'data' => [], 'error' => 'Error al obtener equipos'], 500);
        }
    }

    /**
     * Obtener un equipo específico con sus miembros
     */
    public function getTeam($teamId): JsonResponse
    {
        try {
            $chatwootDb = $this->chatwootDb();

            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)
                ->where('account_id', $this->accountId)
                ->first();

            if (!$team) {
                return response()->json(['success' => false, 'message' => 'Equipo no encontrado'], 404);
            }

            $chatwootMembers = $chatwootDb->table('team_members')
                ->join('users', 'team_members.user_id', '=', 'users.id')
                ->where('team_members.team_id', $teamId)
                ->select('users.id', 'users.name', 'users.display_name', 'users.email')
                ->get();

            $emails = $chatwootMembers->pluck('email')->filter()->toArray();
            $localUsers = !empty($emails)
                ? \App\Models\User::whereIn('email', $emails)->get()->keyBy('email')
                : collect();

            $members = $chatwootMembers->map(function ($member) use ($localUsers) {
                $localUser = $localUsers->get($member->email);
                return [
                    'id' => $member->id,
                    'name' => $localUser->full_name ?? $member->display_name ?? $member->name,
                    'email' => $member->email,
                    'thumbnail' => ''
                ];
            })->toArray();

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'description' => $team->description,
                    'allow_auto_assign' => $team->allow_auto_assign,
                    'account_id' => $team->account_id,
                    'members' => $members
                ]
            ]);

        } catch (\Throwable $e) {
            Log::error('getTeam Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al obtener equipo'], 500);
        }
    }

    /**
     * Crear un nuevo equipo
     */
    public function createTeam(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:500',
                'allow_auto_assign' => 'nullable|boolean',
            ]);

            if (empty($this->chatwootToken)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay token de Chatwoot configurado. Contacta al administrador.',
                ], 400);
            }

            $result = $this->chatwootService->createTeam(
                $this->accountId,
                $this->chatwootToken,
                $validated['name'],
                $validated['description'] ?? ''
            );

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'data' => $result['data'] ?? [],
                    'message' => 'Equipo creado exitosamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al crear equipo: ' . ($result['data']['message'] ?? $result['error'] ?? 'Error desconocido'),
            ], 400);

        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Actualizar un equipo existente
     */
    public function updateTeam(Request $request, $teamId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'nullable|string|max:500',
                'allow_auto_assign' => 'nullable|boolean',
            ]);

            $result = $this->chatwootService->updateTeam(
                $this->accountId, $this->chatwootToken, (int) $teamId, $validated
            );

            if ($result['success']) {
                return response()->json(['success' => true, 'data' => $result['data'], 'message' => 'Equipo actualizado exitosamente']);
            }

            return response()->json(['success' => false, 'message' => 'Error al actualizar equipo'], 400);

        } catch (\Throwable $e) {
            Log::error('Chatwoot Update Team Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al actualizar equipo'], 500);
        }
    }

    /**
     * Eliminar un equipo
     */
    public function deleteTeam($teamId): JsonResponse
    {
        try {
            $result = $this->chatwootService->deleteTeam(
                $this->accountId, $this->chatwootToken, (int) $teamId
            );

            if ($result['success']) {
                return response()->json(['success' => true, 'message' => 'Equipo eliminado exitosamente']);
            }

            return response()->json(['success' => false, 'message' => 'Error al eliminar equipo'], 400);

        } catch (\Throwable $e) {
            Log::error('Chatwoot Delete Team Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al eliminar equipo'], 500);
        }
    }

    /**
     * Obtener miembros de un equipo
     */
    public function getTeamMembers($teamId): JsonResponse
    {
        try {
            $chatwootDb = $this->chatwootDb();

            // Validar que el equipo pertenece a la cuenta del usuario
            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)
                ->where('account_id', $this->accountId)
                ->first();

            if (!$team) {
                return response()->json(['success' => false, 'message' => 'Equipo no encontrado'], 404);
            }

            $chatwootMembers = $chatwootDb->table('team_members')
                ->join('users', 'team_members.user_id', '=', 'users.id')
                ->where('team_members.team_id', $teamId)
                ->select('users.id', 'users.name', 'users.display_name', 'users.email')
                ->get();

            // Batch-load local users to avoid N+1 queries
            $emails = $chatwootMembers->pluck('email')->filter()->toArray();
            $localUsers = \App\Models\User::whereIn('email', $emails)
                ->select('email', 'full_name')
                ->get()
                ->keyBy('email');

            $members = $chatwootMembers->map(function ($member) use ($localUsers) {
                    $localUser = $localUsers->get($member->email);
                    return [
                        'id' => $member->id,
                        'name' => $localUser->full_name ?? $member->display_name ?? $member->name,
                        'email' => $member->email,
                        'thumbnail' => ''
                    ];
                })
                ->toArray();

            return response()->json(['success' => true, 'data' => $members]);

        } catch (\Throwable $e) {
            Log::error('getTeamMembers Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'data' => [], 'error' => 'Error al obtener miembros'], 500);
        }
    }

    /**
     * Agregar miembros a un equipo
     */
    public function addTeamMembers(Request $request, $teamId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            $chatwootDb = $this->chatwootDb();

            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)->where('account_id', $this->accountId)->first();

            if (!$team) {
                return response()->json(['success' => false, 'message' => 'Equipo no encontrado'], 404);
            }

            $addedCount = 0;
            $now = now();

            $chatwootDb->transaction(function () use ($chatwootDb, $validated, $teamId, $now, &$addedCount) {
                foreach ($validated['user_ids'] as $userId) {
                    $userExists = $chatwootDb->table('users')->where('id', $userId)->exists();
                    if (!$userExists) continue;

                    $alreadyMember = $chatwootDb->table('team_members')
                        ->where('team_id', $teamId)->where('user_id', $userId)->exists();

                    if (!$alreadyMember) {
                        $chatwootDb->table('team_members')->insert([
                            'team_id' => $teamId, 'user_id' => $userId,
                            'created_at' => $now, 'updated_at' => $now
                        ]);
                        $addedCount++;
                    }
                }
            });

            return response()->json(['success' => true, 'message' => "Se agregaron $addedCount miembros exitosamente"]);

        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Actualizar miembros de un equipo (reemplazar todos)
     */
    public function updateTeamMembers(Request $request, $teamId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            $chatwootDb = $this->chatwootDb();

            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)->where('account_id', $this->accountId)->first();

            if (!$team) {
                return response()->json(['success' => false, 'message' => 'Equipo no encontrado'], 404);
            }

            $chatwootDb->beginTransaction();
            try {
                $chatwootDb->table('team_members')->where('team_id', $teamId)->delete();

                $now = now();
                $insertedCount = 0;
                foreach ($validated['user_ids'] as $userId) {
                    if (!$chatwootDb->table('users')->where('id', $userId)->exists()) continue;
                    $chatwootDb->table('team_members')->insert([
                        'team_id' => $teamId, 'user_id' => $userId,
                        'created_at' => $now, 'updated_at' => $now
                    ]);
                    $insertedCount++;
                }

                $chatwootDb->commit();
            } catch (\Throwable $e) {
                $chatwootDb->rollBack();
                throw $e;
            }

            return response()->json(['success' => true, 'message' => 'Miembros actualizados exitosamente']);

        } catch (\Throwable $e) {
            Log::error('Chatwoot Update Team Members Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al actualizar miembros'], 500);
        }
    }

    /**
     * Eliminar un miembro de un equipo
     */
    public function removeTeamMember(Request $request, $teamId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_ids' => 'required|array',
                'user_ids.*' => 'integer',
            ]);

            $chatwootDb = $this->chatwootDb();

            $team = $chatwootDb->table('teams')
                ->where('id', $teamId)->where('account_id', $this->accountId)->first();

            if (!$team) {
                return response()->json(['success' => false, 'message' => 'Equipo no encontrado'], 404);
            }

            $deletedCount = $chatwootDb->table('team_members')
                ->where('team_id', $teamId)
                ->whereIn('user_id', $validated['user_ids'])
                ->delete();

            return response()->json(['success' => true, 'message' => "Se removieron $deletedCount miembros exitosamente"]);

        } catch (\Throwable $e) {
            Log::error('Chatwoot Remove Team Member Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al remover miembro'], 500);
        }
    }
}
