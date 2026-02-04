<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ChatwootProvisioningService;
use App\Services\ChatwootService;
use App\Models\Company;
use App\Models\User;
use App\Models\AgentInvitation;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
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
    }

    /**
     * Provisionar cuenta de Chatwoot para la empresa del usuario
     */
    public function provisionAccount(Request $request)
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
            return response()->json([
                'success' => false,
                'error' => 'Error en el provisionamiento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener configuración de la empresa
     */
    public function getConfiguration(Request $request)
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
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo configuración: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Invitar agente a la cuenta de Chatwoot
     */
    public function inviteAgent(Request $request)
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
            $existingInvitation = AgentInvitation::where('company_id', $company->id)
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
            $invitation = AgentInvitation::create([
                'company_id' => $company->id,
                'invited_by_user_id' => $user->id,
                'email' => $request->email,
                'name' => $request->name,
                'role' => $request->role,
                'chatwoot_user_id' => $chatwootUser['id'] ?? null,
                'invitation_token' => Str::random(32),
                'status' => 'pending',
                'expires_at' => Carbon::now()->addDays(7)
            ]);

            // Aquí podrías enviar un email de invitación
            // Mail::to($request->email)->send(new AgentInvitationMail($invitation));

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
            return response()->json([
                'success' => false,
                'error' => 'Error enviando invitación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener invitaciones de agentes
     */
    public function getInvitations(Request $request)
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

            $invitations = AgentInvitation::where('company_id', $company->id)
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
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo invitaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancelar invitación de agente
     */
    public function cancelInvitation(Request $request, $invitationId)
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

            $invitation = AgentInvitation::where('id', $invitationId)
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
            return response()->json([
                'success' => false,
                'error' => 'Error cancelando invitación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener dashboard empresarial
     */
    public function getEnterpriseDashboard(Request $request)
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
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo dashboard: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar interfaz de prueba (solo para desarrollo)
     */
    public function showTestInterface()
    {
        $user = auth()->user();
        $company = $user->company;

        return view('enterprise', compact('user', 'company'));
    }

    /**
     * Provisionamiento masivo (solo para super admin)
     */
    public function bulkProvision(Request $request)
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
            return response()->json([
                'success' => false,
                'message' => 'Error en provisionamiento masivo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener equipos de Chatwoot
     */
    public function getTeams(Request $request)
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

            $apiKey = $company->chatwoot_api_key;

            if (!$apiKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'API key de Chatwoot no configurada'
                ], 400);
            }

            $result = $this->chatwootService->getTeams($company->chatwoot_account_id, $apiKey);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error obteniendo equipos: ' . ($result['error'] ?? 'Unknown')
                ], 500);
            }

            return response()->json([
                'success' => true,
                'teams' => $result['data']
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo equipos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear nuevo equipo en Chatwoot
     */
    public function createTeam(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000'
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

            $apiKey = $company->chatwoot_api_key;

            if (!$apiKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'API key de Chatwoot no configurada'
                ], 400);
            }

            $result = $this->chatwootService->createTeam(
                $company->chatwoot_account_id,
                $apiKey,
                $request->name,
                $request->description
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error creando equipo: ' . ($result['error'] ?? 'Unknown')
                ], 500);
            }

            return response()->json([
                'success' => true,
                'team' => $result['data']
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error creando equipo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener agentes de Chatwoot
     */
    public function getAgents(Request $request)
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

            $apiKey = $company->chatwoot_api_key;

            if (!$apiKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'API key de Chatwoot no configurada'
                ], 400);
            }

            $result = $this->chatwootService->getAgents($company->chatwoot_account_id, $apiKey);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error obteniendo agentes: ' . ($result['error'] ?? 'Unknown')
                ], 500);
            }

            return response()->json([
                'success' => true,
                'agents' => $result['data']
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo agentes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener conversaciones de Chatwoot
     */
    public function getConversations(Request $request)
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

            $apiKey = $company->chatwoot_api_key;

            if (!$apiKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'API key de Chatwoot no configurada'
                ], 400);
            }

            $result = $this->chatwootService->getConversations($company->chatwoot_account_id, $apiKey);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error obteniendo conversaciones: ' . ($result['error'] ?? 'Unknown')
                ], 500);
            }

            return response()->json([
                'success' => true,
                'conversations' => $result['data']
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error obteniendo conversaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener webhooks configurados en Chatwoot
     */
    public function getWebhooks(Request $request)
    {
        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company || !$company->chatwoot_account_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'Empresa no tiene cuenta de Chatwoot'
                ], 400);
            }

            // Usar token del usuario (tiene permisos de agente/admin)
            $apiKey = $user->chatwoot_agent_token ?? $company->chatwoot_api_key;

            $result = $this->chatwootService->listAccountWebhooks($company->chatwoot_account_id, $apiKey);

            return response()->json([
                'success' => $result['success'],
                'webhooks' => $result['data'] ?? [],
                'debug' => [
                    'account_id' => $company->chatwoot_account_id,
                    'user_has_token' => !empty($user->chatwoot_agent_token)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear webhook en Chatwoot para recibir eventos en tiempo real
     */
    public function createWebhook(Request $request)
    {
        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company || !$company->chatwoot_account_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'Empresa no tiene cuenta de Chatwoot'
                ], 400);
            }

            // Usar token del usuario (tiene permisos de agente/admin)
            $apiKey = $user->chatwoot_agent_token ?? $company->chatwoot_api_key;
            
            // URL del webhook de Laravel (donde Chatwoot enviará los eventos)
            $appUrl = config('app.url', 'https://app.withmia.com');
            $webhookUrl = $request->input('url', "{$appUrl}/api/chatwoot/webhook");

            // Eventos que queremos recibir
            $subscriptions = $request->input('subscriptions', [
                'message_created',
                'message_updated',
                'conversation_created',
                'conversation_updated',
                'conversation_status_changed'
            ]);

            $result = $this->chatwootService->createAccountWebhook(
                $company->chatwoot_account_id,
                $apiKey,
                $webhookUrl,
                $subscriptions
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error creando webhook: ' . ($result['error'] ?? 'Unknown'),
                    'status' => $result['status'] ?? 500
                ], $result['status'] ?? 500);
            }

            Log::debug('✅ Webhook de Chatwoot creado exitosamente', [
                'company_id' => $company->id,
                'webhook_url' => $webhookUrl,
                'subscriptions' => $subscriptions
            ]);

            return response()->json([
                'success' => true,
                'webhook' => $result['data'],
                'message' => 'Webhook creado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar webhook de Chatwoot
     */
    public function deleteWebhook(Request $request, $webhookId)
    {
        try {
            $user = auth()->user();
            $company = $user->company;

            if (!$company || !$company->chatwoot_account_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'Empresa no tiene cuenta de Chatwoot'
                ], 400);
            }

            // Usar token del usuario
            $apiKey = $user->chatwoot_agent_token ?? $company->chatwoot_api_key;

            $result = $this->chatwootService->deleteAccountWebhook(
                $company->chatwoot_account_id,
                $apiKey,
                (int) $webhookId
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error eliminando webhook: ' . ($result['error'] ?? 'Unknown')
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Webhook eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
