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
            if ($request->hasSession()) {
                $request->session()->flush();
            }
            
            // Login del usuario con remember
            Auth::login($user, true);
            
            // Regenerar la sesión para seguridad
            $request->session()->regenerate();
            
            // Guardar el user_id en la sesión explícitamente
            $request->session()->put('user_id', $user->id);
            $request->session()->save();
            
            $sessionId = $request->session()->getId();
            $cookieName = config('session.cookie');
            $cookieDomain = config('session.domain');
            $cookieSecure = config('session.secure') ? 'Secure; ' : '';
            $cookieSameSite = config('session.same_site', 'lax');
            $cookieLifetime = config('session.lifetime') * 60; // minutos a segundos
            $expires = gmdate('D, d M Y H:i:s T', time() + $cookieLifetime);
            
            error_log('Session created - ID: ' . $sessionId . ', User: ' . $user->id);
            error_log('Cookie name: ' . $cookieName . ', Domain: ' . $cookieDomain);
            error_log('Auth check after login: ' . (Auth::check() ? 'YES' : 'NO'));

            // Retornar HTML con JavaScript redirect
            $html = '<!DOCTYPE html>
<html>
<head>
    <title>WITHMIA</title>
    <link rel="icon" href="/logo-withmia.webp?v=2025-withmia" type="image/webp">
    <style>
        body {
            margin: 0;
            background: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        video { width: 160px; height: 160px; object-fit: contain; }
    </style>
</head>
<body>
    <video autoplay loop muted playsinline>
        <source src="/logo-animated.webm" type="video/webm" />
    </video>
    <script>setTimeout(function() { window.location.href = "/onboarding"; }, 3000);</script>
</body>
</html>';
            
            // Crear cookie manualmente con header directo
            $cookieValue = $sessionId;
            $cookieHeader = "{$cookieName}={$cookieValue}; Path=/; Domain={$cookieDomain}; Expires={$expires}; {$cookieSecure}HttpOnly; SameSite={$cookieSameSite}";
            
            error_log('Set-Cookie header: ' . $cookieHeader);
            
            return response($html)
                ->header('Set-Cookie', $cookieHeader);

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