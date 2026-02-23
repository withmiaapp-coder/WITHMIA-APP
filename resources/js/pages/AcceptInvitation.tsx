import React, { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import { CheckCircle, XCircle, Loader2, Mail, AlertCircle, Sparkles, Users } from 'lucide-react';

// Declare google globally for TypeScript
declare global {
  interface Window {
    google: { accounts: { id: { initialize: (config: Record<string, unknown>) => void; renderButton: (element: HTMLElement | null, config: Record<string, unknown>) => void } } };
    handleInvitationCredentialResponse: (response: { credential: string }) => void;
  }
}

interface AcceptInvitationProps {
  token: string;
}

interface InvitationData {
  email: string;
  name: string | null;
  role: string;
  company_name: string;
  expires_at: string;
}

// Estilos CSS para el fondo (igual que login.html - blanco con gradientes suaves)
const backgroundStyles = `
  @keyframes gasMovement {
    0% { transform: translateX(0px) translateY(0px) rotate(0deg); }
    20% { transform: translateX(25px) translateY(15px) rotate(5deg) scale(1.1); }
    40% { transform: translateX(-15px) translateY(30px) rotate(-3deg) scale(1.2); }
    60% { transform: translateX(35px) translateY(-10px) rotate(8deg) scale(0.9); }
    80% { transform: translateX(-20px) translateY(25px) rotate(-5deg) scale(1.15); }
    100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
  }
  
  @keyframes borderShimmer {
    0% { filter: hue-rotate(0deg) brightness(1); }
    25% { filter: hue-rotate(90deg) brightness(1.05); }
    50% { filter: hue-rotate(180deg) brightness(1.02); }
    75% { filter: hue-rotate(270deg) brightness(1.05); }
    100% { filter: hue-rotate(360deg) brightness(1); }
  }

  html, body {
    background-color: #fff;
  }

  .invitation-background {
    background-color: #fff;
    background-image: 
      radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%),
      radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%),
      radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%),
      radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%),
      radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%),
      radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
  }

  .invitation-container {
    position: relative;
    background: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    border-radius: 30px;
    overflow: hidden;
  }

  .invitation-container::before {
    content: "";
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, rgba(255,215,0,0.6), rgba(255,165,0,0.4), rgba(255,255,0,0.5), rgba(255,215,0,0.6));
    background-size: 300% 300%;
    border-radius: 32px;
    z-index: -1;
    animation: borderShimmer 6s ease-in-out infinite;
  }
`;

export default function AcceptInvitation({ token }: AcceptInvitationProps) {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Parse JWT for getting user info
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map((c) => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  // Handle Google Sign-In response
  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    setLoading(true);
    setError(null);

    try {
      const payload = parseJwt(response.credential);
      
      // Verify email matches invitation
      if (payload.email.toLowerCase() !== invitation?.email.toLowerCase()) {
        setError(`Debes iniciar sesión con ${invitation?.email}. Has usado ${payload.email}.`);
        setLoading(false);
        return;
      }

      // Send to backend with invitation token
      const formData = new FormData();
      formData.append('credential', response.credential);
      formData.append('google_id', payload.sub);
      formData.append('email', payload.email);
      formData.append('name', payload.name);
      formData.append('picture', payload.picture || '');
      formData.append('invitation_token', token);

      const res = await fetch('/auth/google/invitation', {
        method: 'POST',
        body: formData,
      });

      // Check if it's a redirect (HTML response)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        // Success - backend returned auth-loading view
        setSuccess(true);
        document.open();
        document.write(await res.text());
        document.close();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        if (data.redirect) {
          window.location.href = data.redirect;
        }
      } else {
        setError(data.error || 'Error al procesar la invitación');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [invitation, token]);

  // Load Google Sign-In script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Initialize Google Sign-In when loaded and invitation is available
  useEffect(() => {
    if (googleLoaded && invitation && window.google) {
      // Set up global callback
      window.handleInvitationCredentialResponse = handleCredentialResponse;

      window.google.accounts.id.initialize({
        client_id: '870525180915-5reas32antlqnj9ie3gadpr7n28prk0e.apps.googleusercontent.com',
        callback: handleCredentialResponse,
        auto_select: false,
        context: 'signin',
      });

      // Render button
      const buttonContainer = document.getElementById('google-signin-button');
      if (buttonContainer) {
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'rectangular',
          width: 300,
        });
      }
    }
  }, [googleLoaded, invitation, handleCredentialResponse]);

  // Validar token al cargar
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Get CSRF token
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';
        
        const response = await fetch(`/api/invitation/validate/${token}`, {
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken || '',
          }
        });
        const data = await response.json();

        if (data.valid) {
          setInvitation(data.invitation);
        } else {
          setError(data.message || 'Invitación inválida');
        }
      } catch (err) {
        setError('Error al validar la invitación');
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Loading state
  if (validating) {
    return (
      <>
        <style>{backgroundStyles}</style>
        <div className="min-h-screen invitation-background flex items-center justify-center p-4">
          <div className="invitation-container p-8 text-center">
            <img src="/logo-mia-original.webp" alt="WITHMIA" className="w-24 h-24 mx-auto mb-4" />
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Validando invitación...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state (no invitation)
  if (error && !invitation) {
    return (
      <>
        <style>{backgroundStyles}</style>
        <div className="min-h-screen invitation-background flex items-center justify-center p-4">
          <Head title="Invitación Inválida - WITHMIA" />
          <div className="invitation-container p-8 max-w-md w-full text-center">
            <img src="/logo-mia-original.webp" alt="WITHMIA" className="w-24 h-24 mx-auto mb-4" />
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitación Inválida</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-semibold rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all shadow-lg"
            >
              Ir a Iniciar Sesión
            </a>
          </div>
        </div>
      </>
    );
  }

  // Success state
  if (success) {
    return (
      <>
        <style>{backgroundStyles}</style>
        <div className="min-h-screen invitation-background flex items-center justify-center p-4">
          <Head title="¡Cuenta Creada! - WITHMIA" />
          <div className="invitation-container p-8 max-w-md w-full text-center">
            <img src="/logo-mia-original.webp" alt="WITHMIA" className="w-24 h-24 mx-auto mb-4" />
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido a WITHMIA!</h1>
            <p className="text-gray-600 mb-4">Tu cuenta ha sido creada exitosamente.</p>
            <p className="text-sm text-gray-500">Redirigiendo al login...</p>
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin mx-auto mt-4" />
          </div>
        </div>
      </>
    );
  }

  // Main content - Google Sign-In
  return (
    <>
      <style>{backgroundStyles}</style>
      <div className="min-h-screen invitation-background flex items-center justify-center p-4">
        <Head title="Únete a WITHMIA" />
        
        <div className="invitation-container max-w-md w-full">
          {/* Header con logo */}
          <div className="p-6 text-center border-b border-gray-100">
            <img src="/logo-mia-original.webp" alt="WITHMIA" className="w-20 h-20 mx-auto mb-3" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h1 className="text-2xl font-bold text-gray-900">¡Te han invitado!</h1>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-gray-600">
              Únete al equipo de <strong className="text-gray-900">{invitation?.company_name}</strong>
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Info box */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-gray-900">{invitation?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-gray-600">
                  Rol: <span className="font-medium text-gray-900">
                    {invitation?.role === 'administrator' ? 'Administrador' : 'Agente'}
                  </span>
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Para continuar, inicia sesión con tu cuenta de Google:
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Usa el mismo email: <strong className="text-gray-700">{invitation?.email}</strong>
              </p>
            </div>

            {/* Google Sign-In Button */}
            <div className="flex flex-col items-center gap-3">
              <div 
                id="google-signin-button"
                className="flex justify-center"
                style={{ minHeight: '44px', opacity: loading && !validating ? 0.5 : 1, pointerEvents: loading && !validating ? 'none' : 'auto' }}
              />
              {loading && !validating && (
                <div className="flex items-center gap-2 text-amber-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Procesando tu cuenta...</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>

            <p className="text-center text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-amber-600 font-semibold hover:underline">
                Inicia sesión
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
