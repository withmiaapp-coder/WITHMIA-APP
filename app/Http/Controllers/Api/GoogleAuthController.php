<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class GoogleAuthController extends Controller
{
    public function authenticate(Request $request)
    {
        try {
            // Log request for debugging
            error_log('=== Google Auth Debug ===');
            error_log('Request body: ' . $request->getContent());

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
                    error_log('Decoded from JWT - Email: ' . $email . ', Name: ' . $name);
                }
            } else {
                // Fallback to direct email/name (for testing)
                $email = $request->input('email');
                $name = $request->input('name', 'Usuario Google');
                error_log('Direct input - Email: ' . $email . ', Name: ' . $name);
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
                error_log('Created new user: ' . $user->id);
            } else {
                error_log('Found existing user: ' . $user->id);
            }

            // 🎯 TRACKING LOGIN: Actualizar last_login_at y login_ip
            // Comentado temporalmente hasta que se agreguen las columnas
            /*
            $loginIp = $request->getClientIp() ?? $request->ip() ?? 'unknown';
            
            $user->update([
                'last_login_at' => now(),
                'login_ip' => $loginIp
            ]);
            
            error_log('Login tracking updated - IP: ' . $loginIp . ', Time: ' . now());
            */

            // Generar auth_token si no existe
            if (empty($user->auth_token)) {
                $user->auth_token = Str::random(60);
                $user->save();
                error_log('Generated new auth_token for user: ' . $user->id);
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
            
            error_log('Session created - ID: ' . $sessionId . ', User: ' . $user->id);
            error_log('Cookie config - Name: ' . $cookieName . ', Domain: ' . $cookieDomain . ', Secure: ' . ($cookieSecure ? 'true' : 'false') . ', SameSite: ' . $cookieSameSite);
            error_log('Auth check after login: ' . (Auth::check() ? 'YES' : 'NO'));
            
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
            error_log('Google Auth Error: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false, 
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    private function decodeGoogleJWT($jwt)
    {
        try {
            // Split the JWT into its parts
            $parts = explode('.', $jwt);
            if (count($parts) !== 3) {
                return null;
            }

            // Decode the payload (second part)
            $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
            $data = json_decode($payload, true);

            error_log('JWT Payload: ' . json_encode($data));
            return $data;

        } catch (\Exception $e) {
            error_log('JWT decode error: ' . $e->getMessage());
            return null;
        }
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
        
        error_log('Check session - ID: ' . $sessionId . ', Auth: ' . (Auth::check() ? 'YES' : 'NO') . ', Cookies: ' . implode(',', $receivedCookies) . ', Has ' . $cookieName . ': ' . ($hasCookie ? 'YES' : 'NO'));
        
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