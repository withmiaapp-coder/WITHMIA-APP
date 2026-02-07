<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Services\ChatwootService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class GoogleAuthController extends Controller
{
    private ChatwootService $chatwootService;

    public function __construct(ChatwootService $chatwootService)
    {
        $this->chatwootService = $chatwootService;
    }

    public function authenticate(Request $request)
    {
        try {
            $request->validate([
                'credential' => 'nullable|string',
                'email' => 'nullable|email',
                'name' => 'nullable|string|max:255',
            ]);

            Log::debug('GoogleAuth: Request received');

            $email = null;
            $name = null;

            // Check if we have a Google JWT credential
            $credential = $request->input('credential');
            if ($credential) {
                // Decode the JWT token from Google
                $payload = $this->decodeGoogleJWT($credential);
                if ($payload) {
                    $email = $payload['email'] ?? null;
                    $name = $payload['name'] ?? 'Usuario Google';

                }
            } else {
                // Fallback to direct email/name (for testing)
                $email = $request->input('email');
                $name = $request->input('name', 'Usuario Google');

            }

            if (empty($email)) {
                return response()->json(['success' => false, 'error' => 'Email requerido'], 400);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return response()->json(['success' => false, 'error' => 'Email inválido: ' . $email], 400);
            }

            $user = User::where('email', $email)->first();

            if (!$user) {
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => Hash::make(Str::random(32)),
                    'email_verified_at' => now(),
                    'phone_country' => 'CL',
                ]);

            } else {

            }

            // Generar auth_token si no existe
            if (empty($user->auth_token)) {
                $user->auth_token = Str::random(60);
                $user->save();

            }
            
            // Login del usuario con remember=true para persistencia
            Auth::login($user, true);
            
            // Regenerar la sesión DESPUÉS del login para prevenir session fixation
            $request->session()->regenerate();
            
            $sessionId = $request->session()->getId();
            $cookieName = config('session.cookie');
            $cookieDomain = config('session.domain');
            $cookieSecure = config('session.secure');
            $cookieSameSite = config('session.same_site');
            
            Log::debug('GoogleAuth: Session created', [
                'cookie_name' => $cookieName,
                'auth_check' => Auth::check()
            ]);
            
            // Guardar sesión explícitamente
            $request->session()->save();
            
            // Determinar a dónde redirigir según el estado del usuario
            if ($user->company_slug && $user->onboarding_completed) {
                // Usuario ya completó onboarding - ir al dashboard con auth_token
                $redirectUrl = route('dashboard.company', ['companySlug' => $user->company_slug]) . '?auth_token=' . $user->auth_token;
            } else {
                // Usuario nuevo o sin completar onboarding - ir a onboarding con auth_token
                $redirectUrl = route('onboarding') . '?auth_token=' . $user->auth_token;
            }
            
            // Mostrar pantalla de carga con video
            return view('auth-loading', ['redirect' => $redirectUrl]);

        } catch (\Exception $e) {
            Log::error('GoogleAuth: Error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false, 
                'error' => 'Error en autenticación'
            ], 500);
        }
    }

    private function decodeGoogleJWT($jwt)
    {
        try {
            // Verify the JWT via Google's OAuth2 tokeninfo endpoint
            $response = \Illuminate\Support\Facades\Http::get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $jwt,
            ]);

            if (!$response->successful()) {
                Log::warning('GoogleAuth: Token verification failed', [
                    'status' => $response->status(),
                ]);
                return null;
            }

            $data = $response->json();

            // Validate audience matches our Google Client ID
            $expectedClientId = config('services.google.client_id');
            if ($expectedClientId && ($data['aud'] ?? '') !== $expectedClientId) {
                Log::warning('GoogleAuth: Token audience mismatch', [
                    'expected' => $expectedClientId,
                    'got' => $data['aud'] ?? 'missing',
                ]);
                return null;
            }

            return $data;

        } catch (\Exception $e) {
            Log::error('GoogleAuth: JWT verification error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Authenticate with Google and accept team invitation
     */
    public function authenticateWithInvitation(Request $request)
    {
        try {
            $request->validate([
                'invitation_token' => 'required|string',
                'credential' => 'nullable|string',
            ]);

            
            $invitationToken = $request->input('invitation_token');
            if (!$invitationToken) {
                return response()->json(['success' => false, 'error' => 'Token de invitación requerido'], 400);
            }

            // Validate invitation
            $invitation = \App\Models\TeamInvitation::where('token', $invitationToken)
                ->with(['company'])
                ->first();

            if (!$invitation || !$invitation->isValid()) {
                return response()->json(['success' => false, 'error' => 'Invitación inválida o expirada'], 400);
            }

            // Get email from Google credential
            $email = null;
            $name = null;
            $credential = $request->input('credential');
            
            if ($credential) {
                $payload = $this->decodeGoogleJWT($credential);
                if ($payload) {
                    $email = $payload['email'] ?? null;
                    $name = $payload['name'] ?? 'Usuario';

                }
            }

            if (empty($email)) {
                return response()->json(['success' => false, 'error' => 'Email requerido'], 400);
            }

            // Verify email matches invitation
            if (strtolower($email) !== strtolower($invitation->email)) {
                return response()->json([
                    'success' => false, 
                    'error' => 'Debes iniciar sesión con ' . $invitation->email
                ], 400);
            }

            // Check if user already exists
            $user = User::where('email', $email)->first();

            if ($user) {
                // User exists - check if they belong to this company
                if ($user->company_slug === $invitation->company->slug) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Ya perteneces a esta empresa. Inicia sesión normalmente.'
                    ], 400);
                }
                
                // User exists but for different company - update to new company
                $user->company_slug = $invitation->company->slug;
                $user->role = $invitation->role === 'administrator' ? 'admin' : 'agent';
                $user->save();

            } else {
                // Create new user
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => Hash::make(Str::random(32)),
                    'email_verified_at' => now(),
                    'company_slug' => $invitation->company->slug,
                    'phone_country' => 'CL',
                    'onboarding_completed' => true, // Skip onboarding for invited users
                ]);
                $user->role = $invitation->role === 'administrator' ? 'admin' : 'agent';
                $user->save();

            }

            // Create Chatwoot agent if needed
            $this->createChatwootAgentForInvitation($invitation, $user);

            // Mark invitation as accepted
            $invitation->markAsAccepted();

            // Generate auth_token
            if (empty($user->auth_token)) {
                $user->auth_token = Str::random(60);
                $user->save();
            }

            // Login the user
            Auth::login($user, true);
            $request->session()->regenerate();
            $request->session()->save();



            // Redirect to dashboard
            $redirectUrl = route('dashboard.company', ['companySlug' => $user->company_slug]) . '?auth_token=' . $user->auth_token;
            
            return view('auth-loading', ['redirect' => $redirectUrl]);

        } catch (\Exception $e) {
            Log::error('GoogleAuth: Invitation error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false, 
                'error' => 'Error al procesar la invitación'
            ], 500);
        }
    }

    /**
     * Create Chatwoot agent for invited user
     */
    private function createChatwootAgentForInvitation($invitation, $user)
    {
        try {
            $company = $invitation->company;
            
            if (!$company->chatwoot_account_id || !$company->chatwoot_api_key) {
                return null;
            }

            // Crear agente usando el servicio
            $result = $this->chatwootService->createAgent(
                $company->chatwoot_account_id,
                $company->chatwoot_api_key,
                [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $invitation->role === 'administrator' ? 'administrator' : 'agent',
                    'auto_offline' => true,
                ]
            );

            Log::debug('Chatwoot: Agent creation response', ['success' => $result['success']]);

            if ($result['success']) {
                $agentData = $result['data'];
                $user->update([
                    'chatwoot_agent_id' => $agentData['id'] ?? null,
                ]);
                Log::debug('Chatwoot: Agent created', ['agent_id' => $agentData['id'] ?? 'unknown']);
                
                // Add to team if specified
                if ($invitation->team_id && isset($agentData['id'])) {
                    $this->chatwootService->addAgentsToTeam(
                        $company->chatwoot_account_id,
                        $company->chatwoot_api_key,
                        $invitation->team_id,
                        [$agentData['id']]
                    );
                    Log::debug('Chatwoot: Added agent to team', ['team_id' => $invitation->team_id]);
                }
                
                return $agentData;
            } else {
                Log::warning('Chatwoot: Failed to create agent', ['error' => $result['error'] ?? 'unknown']);
            }
        } catch (\Exception $e) {
            Log::error('Chatwoot: Agent creation error', ['error' => $e->getMessage()]);
        }
        
        return null;
    }

    public function login()
    {
        return response()->json(['message' => 'Google OAuth login endpoint']);
    }

    public function checkSession(Request $request)
    {
        $sessionId = session()->getId();
        $hasSession = !empty($sessionId) && strlen($sessionId) > 10;
        $cookieName = config('session.cookie');
        $receivedCookies = array_keys($request->cookies->all());
        $hasCookie = in_array($cookieName, $receivedCookies);
        
        Log::debug('Session check', [
            'auth' => Auth::check(),
            'has_cookie' => $hasCookie
        ]);
        
        return response()->json([
            'authenticated' => Auth::check(),
            'user' => Auth::user(),
            'session_id' => substr($sessionId, 0, 10) . '...',
            'has_valid_session' => $hasSession,
            'received_cookies' => $receivedCookies,
            'expected_cookie' => $cookieName
        ]);
    }
}
