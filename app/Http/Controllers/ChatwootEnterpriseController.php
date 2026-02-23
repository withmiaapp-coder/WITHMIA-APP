<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ChatwootProvisioningService;
use App\Services\ChatwootService;
use App\Models\Company;
use App\Models\TeamInvitation;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ChatwootEnterpriseController extends Controller
{
    private $provisioningService;
    private $chatwootService;

    public function __construct(
        ChatwootProvisioningService $provisioningService,
        ChatwootService $chatwootService
    ) {
        $this->provisioningService = $provisioningService;
        $this->chatwootService = $chatwootService;

        // Only super-admin users can access enterprise endpoints
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || !$user->isSuperAdmin()) {
                return response()->json(['error' => 'Super admin access required'], 403);
            }

            return $next($request);
        });
    }

    /**
     * Provisionar cuenta de Chatwoot para la empresa del usuario
     */
    public function provisionAccount(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company) {
                return response()->json([
                    'success' => false,
                    'error' => 'Usuario no pertenece a ninguna empresa'
                ], 400);
            }

            if ($company->chatwoot_account_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'La empresa ya tiene una cuenta de Chatwoot provisionada'
                ], 400);
            }

            $result = $this->provisioningService->provisionCompanyAccount($company, $user);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Error en provisionamiento', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Error en el provisionamiento'
            ], 500);
        }
    }

    /**
     * Obtener configuración de la empresa
     */
    public function getConfiguration(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company) {
                return response()->json([
                    'success' => false,
                    'error' => 'Usuario no pertenece a ninguna empresa'
                ], 400);
            }

            $configuration = [
                'is_provisioned' => !empty($company->chatwoot_account_id),
                'account_id' => $company->chatwoot_account_id,
                'api_key_configured' => !empty($company->chatwoot_api_key),
                'company_name' => $company->name,
                'widget_configured' => !empty($company->chatwoot_account_id) && !empty($company->chatwoot_api_key)
            ];

            return response()->json([
                'success' => true,
                'configuration' => $configuration
            ]);

        } catch (\Exception $e) {
            Log::error('Error obteniendo configuración', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo configuración'
            ], 500);
        }
    }

    /**
     * Invitar agente a la cuenta de Chatwoot
     */
    public function inviteAgent(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'name' => 'required|string|max:255',
            'role' => 'required|in:agent,administrator'
        ]);

        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company || !$company->chatwoot_account_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'Empresa no tiene cuenta de Chatwoot provisionada'
                ], 400);
            }

            // Verificar si ya existe una invitación pendiente
            $existingInvitation = TeamInvitation::where('company_id', $company->id)
                ->where('email', $request->email)
                ->where('status', 'pending')
                ->first();

            if ($existingInvitation) {
                return response()->json([
                    'success' => false,
                    'error' => 'Ya existe una invitación pendiente para este email'
                ], 400);
            }

            // Crear la invitación en Chatwoot usando el servicio
            $result = $this->chatwootService->createAccountUser(
                $company->chatwoot_account_id,
                $request->name,
                $request->email,
                $request->role
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error creando usuario en Chatwoot: ' . ($result['error'] ?? 'Unknown')
                ], 500);
            }

            $chatwootUser = $result['data'];

            // Guardar la invitación en nuestra base de datos
            $invitation = TeamInvitation::create([
                'company_id' => $company->id,
                'invited_by' => $user->id,
                'email' => $request->email,
                'name' => $request->name,
                'role' => $request->role,
                'token' => Str::random(32),
                'status' => 'pending',
                'expires_at' => Carbon::now()->addDays(7)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Invitación enviada exitosamente',
                'invitation' => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'name' => $invitation->name,
                    'role' => $invitation->role,
                    'status' => $invitation->status,
                    'expires_at' => $invitation->expires_at->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error enviando invitación', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Error enviando invitación'
            ], 500);
        }
    }

    /**
     * Obtener invitaciones de agentes
     */
    public function getInvitations(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company) {
                return response()->json([
                    'success' => false,
                    'error' => 'Usuario no pertenece a ninguna empresa'
                ], 400);
            }

            $invitations = TeamInvitation::where('company_id', $company->id)
                ->with(['invitedBy:id,name,email'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($invitation) {
                    return [
                        'id' => $invitation->id,
                        'email' => $invitation->email,
                        'name' => $invitation->name,
                        'role' => $invitation->role,
                        'status' => $invitation->status,
                        'expires_at' => $invitation->expires_at->toISOString(),
                        'created_at' => $invitation->created_at->toISOString(),
                        'invited_by' => [
                            'name' => $invitation->invitedBy->name,
                            'email' => $invitation->invitedBy->email
                        ]
                    ];
                });

            return response()->json([
                'success' => true,
                'invitations' => $invitations
            ]);

        } catch (\Exception $e) {
            Log::error('Error obteniendo invitaciones', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo invitaciones'
            ], 500);
        }
    }

    /**
     * Cancelar invitación de agente
     */
    public function cancelInvitation(Request $request, $invitationId): JsonResponse
    {
        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company) {
                return response()->json([
                    'success' => false,
                    'error' => 'Usuario no pertenece a ninguna empresa'
                ], 400);
            }

            $invitation = TeamInvitation::where('id', $invitationId)
                ->where('company_id', $company->id)
                ->first();

            if (!$invitation) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invitación no encontrada'
                ], 404);
            }

            if ($invitation->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'error' => 'Solo se pueden cancelar invitaciones pendientes'
                ], 400);
            }

            $invitation->update(['status' => 'cancelled']);

            return response()->json([
                'success' => true,
                'message' => 'Invitación cancelada exitosamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error cancelando invitación', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Error cancelando invitación'
            ], 500);
        }
    }

    /**
     * Obtener dashboard empresarial
     */
    public function getEnterpriseDashboard(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company || !$company->chatwoot_account_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'Empresa no tiene cuenta de Chatwoot provisionada'
                ], 400);
            }

            // Obtener estadísticas de Chatwoot usando el servicio
            $apiKey = $company->chatwoot_api_key;
            $accountId = $company->chatwoot_account_id;

            $conversationsResult = $this->chatwootService->getConversations($accountId, $apiKey);
            $contactsResult = $this->chatwootService->getContacts($accountId, $apiKey);
            $agentsResult = $this->chatwootService->getAgents($accountId, $apiKey);

            $conversations = $conversationsResult['data'] ?? [];
            $contacts = $contactsResult['data'] ?? [];
            $agents = $agentsResult['data'] ?? [];

            $stats = [
                'total_conversations' => count($conversations),
                'open_conversations' => count(array_filter($conversations, fn($c) => $c['status'] === 'open')),
                'total_contacts' => count($contacts),
                'total_agents' => count($agents)
            ];

            $dashboard = [
                'stats' => $stats,
                'recent_conversations' => array_slice($conversations, 0, 5),
                'account_info' => [
                    'account_id' => $company->chatwoot_account_id,
                    'company_name' => $company->name,
                    'api_configured' => !empty($company->chatwoot_api_key)
                ]
            ];

            return response()->json([
                'success' => true,
                'dashboard' => $dashboard
            ]);

        } catch (\Exception $e) {
            Log::error('Error obteniendo dashboard', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo dashboard'
            ], 500);
        }
    }

    /**
     * Provisionamiento masivo (solo para super admin)
     */
    public function bulkProvision(Request $request): JsonResponse
    {
        // Este método requiere autenticación de super admin
        // Por simplicidad, lo dejamos disponible pero debería tener middleware de admin

        try {
            $companyIds = $request->input('company_ids', []);

            if (empty($companyIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se especificaron empresas para provisionar'
                ], 400);
            }

            $results = [];
            $companies = Company::whereIn('id', $companyIds)
                ->whereNull('chatwoot_account_id')
                ->with(['users'])
                ->get();

            foreach ($companies as $company) {
                $owner = $company->users->first(); // Get first user as owner

                if (!$owner) {
                    $results[] = [
                        'company_id' => $company->id,
                        'company_name' => $company->name,
                        'success' => false,
                        'error' => 'No se encontró usuario propietario'
                    ];
                    continue;
                }

                $result = $this->provisioningService->provisionCompanyAccount($company, $owner);

                $results[] = array_merge([
                    'company_id' => $company->id,
                    'company_name' => $company->name,
                ], $result);
            }

            return response()->json([
                'success' => true,
                'results' => $results,
                'summary' => [
                    'total_processed' => count($results),
                    'successful' => count(array_filter($results, fn($r) => $r['success'])),
                    'failed' => count(array_filter($results, fn($r) => !$r['success']))
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error en provisionamiento masivo', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error en provisionamiento masivo'
            ], 500);
        }
    }
}
