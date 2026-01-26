<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\TeamInvitationMail;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class TeamInvitationController extends Controller
{
    /**
     * Listar invitaciones de la empresa
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $company = $user->company;
        
        if (!$company) {
            return response()->json(['error' => 'No company associated'], 403);
        }

        $invitations = TeamInvitation::where('company_id', $company->id)
            ->with(['invitedBy:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $invitations
        ]);
    }

    /**
     * Crear y enviar una nueva invitación
     */
    public function store(Request $request)
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

        // Verificar si ya existe un usuario con ese email en esta empresa
        $existingUser = User::where('email', $email)
            ->where('company_id', $company->id)
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
            
            Log::info('Team invitation sent', [
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
    public function resend(Request $request, $id)
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
    public function cancel(Request $request, $id)
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
    public function validate(Request $request, $token)
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
    public function accept(Request $request, $token)
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
                'role' => $invitation->role === 'administrator' ? 'admin' : 'agent',
                'email_verified_at' => now(),
            ]);

            // Crear agente en Chatwoot
            $chatwootAgent = $this->createChatwootAgent($invitation->company, $user);

            if ($chatwootAgent) {
                $user->update([
                    'chatwoot_user_id' => $chatwootAgent['id'] ?? null,
                ]);

                // Si hay team_id, agregar al equipo en Chatwoot
                if ($invitation->team_id) {
                    $this->addToTeam($invitation->company, $chatwootAgent['id'], $invitation->team_id);
                }
            }

            // Marcar invitación como aceptada
            $invitation->markAsAccepted();

            Log::info('Invitation accepted', [
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

        $baseUrl = config('services.chatwoot.base_url');
        $accountId = $company->chatwoot_account_id;
        
        try {
            $response = Http::withHeaders([
                'api_access_token' => $company->chatwoot_api_key,
                'Content-Type' => 'application/json',
            ])->post("{$baseUrl}/api/v1/accounts/{$accountId}/agents", [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role === 'administrator' ? 'administrator' : 'agent',
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning('Failed to create Chatwoot agent', [
                'status' => $response->status(),
                'body' => $response->body(),
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

        $baseUrl = config('services.chatwoot.base_url');
        $accountId = $company->chatwoot_account_id;

        try {
            Http::withHeaders([
                'api_access_token' => $company->chatwoot_api_key,
                'Content-Type' => 'application/json',
            ])->post("{$baseUrl}/api/v1/accounts/{$accountId}/teams/{$teamId}/team_members", [
                'user_ids' => [$agentId],
            ]);
        } catch (\Exception $e) {
            Log::error('Error adding agent to team', ['error' => $e->getMessage()]);
        }
    }
}
