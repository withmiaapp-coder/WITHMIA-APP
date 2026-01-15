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

            // Invalidar cualquier sesión anterior
            $request->session()->invalidate();
            
            Auth::login($user, true);
            
            // Regenerar la sesión para seguridad
            $request->session()->regenerate();
            $request->session()->regenerateToken();
            
            error_log('Session created - ID: ' . session()->getId() . ', User: ' . $user->id);

            // Si es un form submit (no JSON), mostrar pantalla de transición
            if (!$request->expectsJson() && !$request->isJson()) {
                return response()->view('transition', ['redirect' => '/onboarding'])->withCookie(
                    cookie()->forever(config('session.cookie'), session()->getId())
                );
            }

            return response()->json([
                'success' => true,
                'redirect' => '/onboarding',
                'user' => $user->only(['id', 'name', 'email'])
            ]);

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

    public function checkSession()
    {
        $sessionId = session()->getId();
        $hasSession = !empty($sessionId) && strlen($sessionId) > 10;
        
        error_log('Check session - ID: ' . $sessionId . ', Auth: ' . (Auth::check() ? 'YES' : 'NO'));
        
        return response()->json([
            'authenticated' => Auth::check(),
            'user' => Auth::user(),
            'session_id' => substr($sessionId, 0, 10) . '...',
            'has_valid_session' => $hasSession
        ]);
    }
}