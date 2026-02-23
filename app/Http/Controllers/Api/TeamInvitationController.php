<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\TeamInvitationMail;
use App\Models\TeamInvitation;
use App\Models\User;
use App\Services\ChatwootService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class TeamInvitationController extends Controller
{
    private ChatwootService $chatwootService;

    public function __construct(ChatwootService $chatwootService)
    {
        $this->chatwootService = $chatwootService;
    }

    /**
     * Listar invitaciones de la empresa
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            
            if (!$user) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }
            
            $company = $user->company;
            
            if (!$company) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }

            $invitations = TeamInvitation::where('company_id', $company->id)
                ->with(['invitedBy:id,name,email'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $invitations
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching invitations: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
    }

    /**
     * Crear y enviar una nueva invitación
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'name' => 'nullable|string|max:255',
            'role' => 'required|in:agent,administrator',
            'team_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = auth()->user();
        $company = $user->company;

        if (!$company) {
            return response()->json(['error' => 'No company associated'], 403);
        }

        $email = strtolower($request->email);

        // Verificar si ya existe un usuario con ese email en esta empresa (usando company_slug)
        $existingUser = User::where('email', $email)
            ->where('company_slug', $company->slug)
            ->first();

        if ($existingUser) {
            return response()->json([
                'success' => false,
                'message' => 'Este usuario ya pertenece a tu empresa'
            ], 400);
        }

        // Verificar si ya hay una invitación pendiente
        $existingInvitation = TeamInvitation::where('email', $email)
            ->where('company_id', $company->id)
            ->pending()
            ->first();

        if ($existingInvitation) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe una invitación pendiente para este email'
            ], 400);
        }

        // Crear la invitación
        $invitation = TeamInvitation::create([
            'company_id' => $company->id,
            'invited_by' => $user->id,
            'email' => $email,
            'name' => $request->name,
            'role' => $request->role,
            'team_id' => $request->team_id,
            'token' => TeamInvitation::generateToken(),
            'status' => 'pending',
            'expires_at' => now()->addDays(7), // Expira en 7 días
        ]);

        // Enviar el email
        try {
            Mail::to($email)->send(new TeamInvitationMail($invitation));
            
            Log::debug('Team invitation sent', [
                'invitation_id' => $invitation->id,
                'email' => $email,
                'company_id' => $company->id,
                'invited_by' => $user->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send invitation email', [
                'error' => $e->getMessage(),
                'email' => $email,
            ]);
            
            // No fallamos la creación, solo avisamos
        }

        return response()->json([
            'success' => true,
            'message' => 'Invitación enviada correctamente',
            'data' => $invitation
        ], 201);
    }

    /**
     * Reenviar una invitación
     */
    public function resend(Request $request, $id): JsonResponse
    {
        $user = auth()->user();
        $company = $user->company;

        $invitation = TeamInvitation::where('id', $id)
            ->where('company_id', $company->id)
            ->first();

        if (!$invitation) {
            return response()->json(['error' => 'Invitation not found'], 404);
        }

        // Regenerar token y extender expiración
        $invitation->update([
            'token' => TeamInvitation::generateToken(),
            'expires_at' => now()->addDays(7),
            'status' => 'pending',
        ]);

        // Reenviar email
        try {
            Mail::to($invitation->email)->send(new TeamInvitationMail($invitation));
        } catch (\Exception $e) {
            Log::error('Failed to resend invitation email', [
                'error' => $e->getMessage(),
                'invitation_id' => $id,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Invitación reenviada correctamente'
        ]);
    }

    /**
     * Cancelar una invitación
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        $user = auth()->user();
        $company = $user->company;

        $invitation = TeamInvitation::where('id', $id)
            ->where('company_id', $company->id)
            ->where('status', 'pending')
            ->first();

        if (!$invitation) {
            return response()->json(['error' => 'Invitation not found'], 404);
        }

        $invitation->markAsCancelled();

        return response()->json([
            'success' => true,
            'message' => 'Invitación cancelada'
        ]);
    }

    /**
     * Validar token de invitación (público)
     */
    public function validateToken(Request $request, $token): JsonResponse
    {
        $invitation = TeamInvitation::where('token', $token)
            ->with(['company:id,name,slug'])
            ->first();

        if (!$invitation) {
            return response()->json([
                'valid' => false,
                'message' => 'Invitación no encontrada'
            ], 404);
        }

        if (!$invitation->isValid()) {
            return response()->json([
                'valid' => false,
                'message' => $invitation->status === 'accepted' 
                    ? 'Esta invitación ya fue utilizada' 
                    : 'Esta invitación ha expirado'
            ], 400);
        }

        return response()->json([
            'valid' => true,
            'invitation' => [
                'email' => $invitation->email,
                'name' => $invitation->name,
                'role' => $invitation->role,
                'company_name' => $invitation->company->name,
                'expires_at' => $invitation->expires_at,
            ]
        ]);
    }

    /**
     * Aceptar invitación y crear usuario (público)
     */
    public function accept(Request $request, $token): JsonResponse
    {
        $invitation = TeamInvitation::where('token', $token)
            ->with(['company'])
            ->first();

        if (!$invitation || !$invitation->isValid()) {
            return response()->json([
                'success' => false,
                'message' => 'Invitación inválida o expirada'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Verificar si el email ya está registrado
        $existingUser = User::where('email', $invitation->email)->first();
        if ($existingUser) {
            return response()->json([
                'success' => false,
                'message' => 'Este email ya está registrado. Por favor inicia sesión.'
            ], 400);
        }

        try {
            // Crear usuario en nuestra BD - IMPORTANTE: usar company_slug
            $user = User::create([
                'name' => $request->name,
                'email' => $invitation->email,
                'password' => Hash::make($request->password),
                'company_slug' => $invitation->company->slug,
                'email_verified_at' => now(),
            ]);
            $user->role = $invitation->role === 'administrator' ? 'admin' : 'agent';
            $user->save();

            // Crear agente en Chatwoot
            $chatwootAgent = $this->createChatwootAgent($invitation->company, $user);

            if ($chatwootAgent) {
                $user->update([
                    'chatwoot_agent_id' => $chatwootAgent['id'] ?? null,
                ]);

                // Si hay team_id, agregar al equipo en Chatwoot
                if ($invitation->team_id) {
                    $this->addToTeam($invitation->company, $chatwootAgent['id'], $invitation->team_id);
                }
            }

            // Marcar invitación como aceptada
            $invitation->markAsAccepted();

            Log::debug('Invitation accepted', [
                'user_id' => $user->id,
                'email' => $user->email,
                'company_id' => $invitation->company_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cuenta creada exitosamente. Ya puedes iniciar sesión.',
                'redirect' => '/login'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to accept invitation', [
                'error' => $e->getMessage(),
                'invitation_id' => $invitation->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear la cuenta. Intenta nuevamente.'
            ], 500);
        }
    }

    /**
     * Crear agente en Chatwoot
     */
    private function createChatwootAgent($company, $user)
    {
        if (!$company->chatwoot_account_id || !$company->chatwoot_api_key) {
            return null;
        }
        
        try {
            $role = $user->role === 'administrator' ? 'administrator' : 'agent';
            $result = $this->chatwootService->createAgent(
                $company->chatwoot_account_id,
                $company->chatwoot_api_key,
                $user->name,
                $user->email,
                $role
            );

            if ($result['success']) {
                return $result['data'];
            }

            Log::warning('Failed to create Chatwoot agent', [
                'status' => $result['status'] ?? 'N/A',
                'error' => $result['error'] ?? 'Unknown',
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('Error creating Chatwoot agent', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Agregar agente a un equipo en Chatwoot
     */
    private function addToTeam($company, $agentId, $teamId)
    {
        if (!$company->chatwoot_account_id || !$company->chatwoot_api_key) {
            return;
        }

        try {
            $this->chatwootService->addAgentsToTeam(
                $company->chatwoot_account_id,
                $company->chatwoot_api_key,
                (int) $teamId,
                [$agentId]
            );
        } catch (\Exception $e) {
            Log::error('Error adding agent to team', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Sincronizar usuarios de la empresa con Chatwoot
     * Crea agentes en Chatwoot para usuarios que no tienen chatwoot_agent_id
     * Puede ser llamado con autenticación o con clave secreta
     */
    public function syncUsersWithChatwoot(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $secretKey = $request->header('X-Admin-Key') ?? $request->input('admin_key');
            
            // Verificar autenticación: usuario admin o clave secreta
            if (!$user && $secretKey !== config('app.admin_secret_key')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }
            
            if ($user && !in_array($user->role, ['admin', 'superadmin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }

            // Si hay usuario, usar su empresa; si no, sincronizar todas las empresas
            if ($user) {
                $companies = [$user->company];
            } else {
                // Sincronizar todas las empresas con configuración de Chatwoot
                $companies = \App\Models\Company::whereNotNull('chatwoot_account_id')
                    ->whereNotNull('chatwoot_api_key')
                    ->get();
            }

            $allSynced = [];
            $allFailed = [];

            $baseUrl = config('chatwoot.url');

            foreach ($companies as $company) {
                if (!$company || !$company->chatwoot_account_id || !$company->chatwoot_api_key) {
                    continue;
                }

                // Obtener usuarios de la empresa sin chatwoot_agent_id
                $usersToSync = User::where('company_slug', $company->slug)
                    ->whereNull('chatwoot_agent_id')
                    ->get();

                if ($usersToSync->isEmpty()) {
                    continue;
                }

                // 🚀 OPTIMIZACIÓN: Usar Http::pool() para llamadas paralelas (hasta 10x más rápido)
                $responses = Http::pool(function (\Illuminate\Http\Client\Pool $pool) use ($usersToSync, $company, $baseUrl) {
                    foreach ($usersToSync as $syncUser) {
                        $pool->as("user_{$syncUser->id}")
                            ->withHeaders([
                                'api_access_token' => $company->chatwoot_api_key,
                                'Content-Type' => 'application/json',
                            ])
                            ->timeout(15)
                            ->post("{$baseUrl}/api/v1/accounts/{$company->chatwoot_account_id}/agents", [
                                'name' => $syncUser->name ?: $syncUser->full_name ?: 'Usuario',
                                'email' => $syncUser->email,
                                'role' => in_array($syncUser->role, ['admin', 'superadmin']) ? 'administrator' : 'agent',
                                'auto_offline' => true,
                            ]);
                    }
                });

                // Procesar respuestas del pool
                foreach ($usersToSync as $syncUser) {
                    $key = "user_{$syncUser->id}";
                    try {
                        $response = $responses[$key] ?? null;
                        
                        if ($response && $response->successful()) {
                            $agentData = $response->json();
                            $syncUser->update([
                                'chatwoot_agent_id' => $agentData['id'] ?? null,
                            ]);
                            $allSynced[] = [
                                'company' => $company->name,
                                'user_id' => $syncUser->id,
                                'email' => $syncUser->email,
                                'chatwoot_agent_id' => $agentData['id'] ?? null,
                            ];
                        } else {
                            $allFailed[] = [
                                'company' => $company->name,
                                'user_id' => $syncUser->id,
                                'email' => $syncUser->email,
                                'error' => $response ? $response->body() : 'No response',
                            ];
                        }
                    } catch (\Exception $e) {
                        $allFailed[] = [
                            'company' => $company->name,
                            'user_id' => $syncUser->id,
                            'email' => $syncUser->email,
                            'error' => $e->getMessage(),
                        ];
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Sincronización completada',
                'synced' => $allSynced,
                'failed' => $allFailed,
                'total_synced' => count($allSynced),
                'total_failed' => count($allFailed),
            ]);

        } catch (\Exception $e) {
            Log::error('Error syncing users with Chatwoot', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error al sincronizar'
            ], 500);
        }
    }

    /**
     * Endpoint de diagnóstico para verificar estado de usuarios y agentes de Chatwoot
     */
    public function diagnosticAgents(Request $request): JsonResponse
    {
        try {
            $secretKey = $request->header('X-Admin-Key') ?? $request->input('admin_key');
            $user = auth()->user();
            
            // Verificar autenticación
            if (!$user && $secretKey !== config('app.admin_secret_key')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }
            
            // Listar todas las empresas para diagnóstico
            $allCompanies = \App\Models\Company::select('id', 'name', 'slug', 'chatwoot_account_id')
                ->get()
                ->map(function($c) {
                    return [
                        'id' => $c->id,
                        'name' => $c->name,
                        'slug' => $c->slug,
                        'chatwoot_account_id' => $c->chatwoot_account_id,
                        'has_api_key' => !empty($c->chatwoot_api_key),
                    ];
                });
            
            // Si hay usuario autenticado, usar su empresa
            if ($user) {
                $company = $user->company;
            } else {
                // Buscar empresa por slug si se proporciona
                $companySlug = $request->input('company_slug');
                if ($companySlug) {
                    $company = \App\Models\Company::findBySlugCached($companySlug);
                } else {
                    // Si es con clave secreta, obtener primera empresa con Chatwoot configurado
                    $company = \App\Models\Company::whereNotNull('chatwoot_account_id')
                        ->whereNotNull('chatwoot_api_key')
                        ->first();
                }
            }
            
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay empresa configurada con Chatwoot',
                    'all_companies' => $allCompanies,
                    'all_users' => User::select('id', 'name', 'email', 'company_slug', 'chatwoot_agent_id')->get(),
                ]);
            }
            
            // Obtener usuarios de la empresa en nuestra BD
            $localUsers = User::where('company_slug', $company->slug)
                ->select('id', 'name', 'email', 'role', 'chatwoot_agent_id', 'chatwoot_inbox_id', 'created_at')
                ->get();
            
            // Obtener agentes de Chatwoot usando el servicio
            $chatwootAgents = [];
            
            try {
                $result = $this->chatwootService->getAgents($company->chatwoot_account_id, $company->chatwoot_api_key);
                if ($result['success']) {
                    $chatwootAgents = $result['data'] ?? [];
                }
            } catch (\Exception $e) {
                Log::error('Error fetching Chatwoot agents for diagnostic', ['error' => $e->getMessage()]);
            }
            
            // Obtener equipos de Chatwoot usando el servicio
            $chatwootTeams = [];
            try {
                $result = $this->chatwootService->getTeams($company->chatwoot_account_id, $company->chatwoot_api_key);
                if ($result['success']) {
                    $chatwootTeams = $result['data'] ?? [];
                }
            } catch (\Exception $e) {
                Log::error('Error fetching Chatwoot teams for diagnostic', ['error' => $e->getMessage()]);
            }
            
            // Obtener invitaciones pendientes
            $pendingInvitations = TeamInvitation::where('company_id', $company->id)
                ->where('status', 'pending')
                ->select('id', 'email', 'name', 'role', 'status', 'created_at', 'expires_at')
                ->get();
            
            // Obtener invitaciones aceptadas
            $acceptedInvitations = TeamInvitation::where('company_id', $company->id)
                ->where('status', 'accepted')
                ->select('id', 'email', 'name', 'role', 'status', 'created_at')
                ->get();
            
            return response()->json([
                'success' => true,
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'slug' => $company->slug,
                    'chatwoot_account_id' => $company->chatwoot_account_id,
                    'has_api_key' => !empty($company->chatwoot_api_key),
                ],
                'local_users' => $localUsers,
                'local_users_count' => $localUsers->count(),
                'users_with_chatwoot_id' => $localUsers->whereNotNull('chatwoot_agent_id')->count(),
                'users_without_chatwoot_id' => $localUsers->whereNull('chatwoot_agent_id')->count(),
                'chatwoot_agents' => $chatwootAgents,
                'chatwoot_agents_count' => count($chatwootAgents),
                'chatwoot_teams' => $chatwootTeams,
                'chatwoot_teams_count' => count($chatwootTeams),
                'pending_invitations' => $pendingInvitations,
                'accepted_invitations' => $acceptedInvitations,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in diagnostic', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error en diagnóstico'
            ], 500);
        }
    }

    /**
     * Arreglar empresa con API key de Chatwoot desde config/env
     * Y sincronizar usuarios existentes como agentes
     */
    public function fixCompanyChatwoot(Request $request): JsonResponse
    {
        try {
            $secretKey = $request->header('X-Admin-Key') ?? $request->input('admin_key');
            
            if ($secretKey !== config('app.admin_secret_key')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }
            
            $companySlug = $request->input('company_slug', 'withmia-nfudrg');
            
            $company = \App\Models\Company::findBySlugCached($companySlug);
            
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Empresa no encontrada: ' . $companySlug
                ]);
            }
            
            // Obtener API key desde config/env
            $apiKey = config('chatwoot.api_key') 
                ?? config('chatwoot.platform_token') 
                ?? $request->input('api_key');
            
            $baseUrl = config('chatwoot.url');
            $accountId = $company->chatwoot_account_id ?? config('chatwoot.account_id', 1);
            
            if (!$apiKey) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró API key de Chatwoot en la configuración. Proporciona api_key en el request.'
                ]);
            }
            
            // Actualizar empresa con el API key
            $company->update([
                'chatwoot_api_key' => $apiKey,
                'chatwoot_account_id' => $accountId,
            ]);
            
            // Ahora sincronizar todos los usuarios de la empresa
            $users = User::where('company_slug', $company->slug)
                ->whereNull('chatwoot_agent_id')
                ->get();
            
            $synced = [];
            $failed = [];
            
            foreach ($users as $user) {
                try {
                    // Verificar si ya existe un agente con ese email en Chatwoot
                    $agentsResult = $this->chatwootService->getAgents($accountId, $apiKey);
                    
                    $existingAgent = null;
                    if ($agentsResult['success']) {
                        $agents = $agentsResult['data'] ?? [];
                        foreach ($agents as $agent) {
                            if (strtolower($agent['email']) === strtolower($user->email)) {
                                $existingAgent = $agent;
                                break;
                            }
                        }
                    }
                    
                    if ($existingAgent) {
                        // Ya existe, solo actualizar el ID local
                        $user->update([
                            'chatwoot_agent_id' => $existingAgent['id'],
                        ]);
                        $synced[] = [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'chatwoot_agent_id' => $existingAgent['id'],
                            'action' => 'linked_existing'
                        ];
                    } else {
                        // Crear nuevo agente en Chatwoot usando el servicio
                        $role = in_array($user->role, ['admin', 'superadmin']) ? 'administrator' : 'agent';
                        $result = $this->chatwootService->createAgent(
                            $accountId,
                            $apiKey,
                            $user->name ?: $user->full_name ?: 'Usuario',
                            $user->email,
                            $role
                        );
                        
                        if ($result['success']) {
                            $agentData = $result['data'] ?? [];
                            $user->update([
                                'chatwoot_agent_id' => $agentData['id'] ?? null,
                            ]);
                            
                            $synced[] = [
                                'user_id' => $user->id,
                                'email' => $user->email,
                                'chatwoot_agent_id' => $agentData['id'] ?? null,
                                'action' => 'created'
                            ];
                        } else {
                            $failed[] = [
                                'user_id' => $user->id,
                                'email' => $user->email,
                                'error' => $result['error'] ?? 'Unknown error',
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    $failed[] = [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'error' => $e->getMessage(),
                    ];
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Empresa actualizada y usuarios sincronizados',
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'slug' => $company->slug,
                    'chatwoot_account_id' => $company->chatwoot_account_id,
                    'has_api_key' => !empty($company->chatwoot_api_key),
                ],
                'synced' => $synced,
                'failed' => $failed,
                'total_synced' => count($synced),
                'total_failed' => count($failed),
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fixing company chatwoot', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error al reparar la configuración de Chatwoot'
            ], 500);
        }
    }

    /**
     * Corregir rol de un usuario específico
     */
    public function fixUserRole(Request $request): JsonResponse
    {
        try {
            $secretKey = $request->input('secret') ?? $request->header('X-Admin-Key');
            
            if ($secretKey !== config('app.admin_secret_key')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }
            
            $email = $request->input('email');
            $newRole = $request->input('role', 'admin');
            
            if (!$email) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email requerido'
                ], 400);
            }
            
            $user = User::where('email', $email)->first();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado: ' . $email
                ], 404);
            }
            
            $oldRole = $user->role;
            
            // Actualizar rol
            $user->role = $newRole;
            $user->save();
            
            // Si tiene chatwoot_agent_id, actualizar también en Chatwoot
            if ($user->chatwoot_agent_id) {
                $company = $user->company;
                if ($company && $company->chatwoot_api_key && $company->chatwoot_account_id) {
                    $accountId = $company->chatwoot_account_id;
                    
                    $this->chatwootService->updateAgent(
                        $accountId,
                        $company->chatwoot_api_key,
                        (int) $user->chatwoot_agent_id,
                        ['role' => in_array($newRole, ['admin', 'superadmin']) ? 'administrator' : 'agent']
                    );
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Rol actualizado correctamente',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'old_role' => $oldRole,
                    'new_role' => $newRole,
                    'chatwoot_agent_id' => $user->chatwoot_agent_id,
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fixing user role', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar rol'
            ], 500);
        }
    }

    /**
     * Provisionar Chatwoot para una empresa que no lo tiene
     */
    public function provisionCompanyChatwoot(Request $request): JsonResponse
    {
        try {
            $secretKey = $request->input('secret') ?? $request->header('X-Admin-Key');
            
            if ($secretKey !== config('app.admin_secret_key')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }
            
            $companySlug = $request->input('company_slug');
            
            if (!$companySlug) {
                return response()->json([
                    'success' => false,
                    'message' => 'company_slug requerido'
                ], 400);
            }
            
            $company = \App\Models\Company::findBySlugCached($companySlug);
            
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Empresa no encontrada: ' . $companySlug
                ], 404);
            }
            
            if ($company->chatwoot_account_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta empresa ya tiene Chatwoot configurado',
                    'chatwoot_account_id' => $company->chatwoot_account_id
                ]);
            }
            
            // Obtener el owner de la empresa
            $owner = User::where('company_slug', $companySlug)
                ->where('role', 'admin')
                ->first();
            
            if (!$owner) {
                $owner = User::where('company_slug', $companySlug)->first();
            }
            
            if (!$owner) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró un usuario para esta empresa'
                ], 404);
            }
            
            // Provisionar Chatwoot
            $chatwootService = app(\App\Services\ChatwootProvisioningService::class);
            $result = $chatwootService->provisionCompanyAccount($company, $owner);
            
            if ($result['success'] ?? false) {
                // Refrescar datos
                $company->refresh();
                $owner->refresh();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Chatwoot provisionado exitosamente',
                    'company' => [
                        'id' => $company->id,
                        'name' => $company->name,
                        'slug' => $company->slug,
                        'chatwoot_account_id' => $company->chatwoot_account_id,
                        'chatwoot_inbox_id' => $company->chatwoot_inbox_id,
                    ],
                    'owner' => [
                        'id' => $owner->id,
                        'email' => $owner->email,
                        'chatwoot_agent_id' => $owner->chatwoot_agent_id,
                    ],
                    'chatwoot' => $result
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al provisionar Chatwoot',
                    'error' => $result['error'] ?? 'Unknown'
                ], 500);
            }
            
        } catch (\Exception $e) {
            Log::error('Error provisioning company chatwoot', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error al provisionar Chatwoot'
            ], 500);
        }
    }
}
