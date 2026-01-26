import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { CheckCircle, XCircle, Loader2, Mail, User, Lock, AlertCircle, Sparkles } from 'lucide-react';

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

// Estilos CSS para el fondo animado (igual que login.html)
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
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
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
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
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
  
  // Form data
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Validar token al cargar
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/invitation/validate/${token}`);
        const data = await response.json();

        if (data.valid) {
          setInvitation(data.invitation);
          setName(data.invitation.name || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validaciones locales
    if (!name.trim()) {
      setFormErrors(prev => ({ ...prev, name: 'El nombre es requerido' }));
      return;
    }
    if (password.length < 8) {
      setFormErrors(prev => ({ ...prev, password: 'La contraseña debe tener al menos 8 caracteres' }));
      return;
    }
    if (password !== passwordConfirmation) {
      setFormErrors(prev => ({ ...prev, password_confirmation: 'Las contraseñas no coinciden' }));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/invitation/accept/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        if (data.errors) {
          setFormErrors(data.errors);
        } else {
          setError(data.message || 'Error al crear la cuenta');
        }
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <>
        <style>{backgroundStyles}</style>
        <div className="min-h-screen invitation-background flex items-center justify-center p-4">
          <div className="invitation-container p-8 text-center">
            <img src="/logo-withmia.webp" alt="WITHMIA" className="w-24 h-24 mx-auto mb-4" />
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Validando invitación...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <>
        <style>{backgroundStyles}</style>
        <div className="min-h-screen invitation-background flex items-center justify-center p-4">
          <Head title="Invitación Inválida - WITHMIA" />
          <div className="invitation-container p-8 max-w-md w-full text-center">
            <img src="/logo-withmia.webp" alt="WITHMIA" className="w-24 h-24 mx-auto mb-4" />
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
            <img src="/logo-withmia.webp" alt="WITHMIA" className="w-24 h-24 mx-auto mb-4" />
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

  // Registration form
  return (
    <>
      <style>{backgroundStyles}</style>
      <div className="min-h-screen invitation-background flex items-center justify-center p-4">
        <Head title="Únete a WITHMIA" />
        
        <div className="invitation-container max-w-lg w-full">
          {/* Header con logo */}
          <div className="p-6 text-center border-b border-gray-100">
            <img src="/logo-withmia.webp" alt="WITHMIA" className="w-20 h-20 mx-auto mb-3" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h1 className="text-2xl font-bold text-gray-900">¡Te han invitado!</h1>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-gray-600">
              Únete al equipo de <strong className="text-gray-900">{invitation?.company_name}</strong>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <div className="text-sm text-gray-600">
                Rol: <span className="font-medium text-gray-900">
                  {invitation?.role === 'administrator' ? 'Administrador' : 'Agente'}
                </span>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tu Nombre
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all text-gray-900 placeholder-gray-400 bg-white ${
                    formErrors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
              </div>
              {formErrors.name && <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>}
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all text-gray-900 placeholder-gray-400 bg-white ${
                    formErrors.password ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
              </div>
              {formErrors.password && <p className="text-sm text-red-600 mt-1">{formErrors.password}</p>}
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all text-gray-900 placeholder-gray-400 bg-white ${
                    formErrors.password_confirmation ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
              </div>
              {formErrors.password_confirmation && <p className="text-sm text-red-600 mt-1">{formErrors.password_confirmation}</p>}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-bold text-lg shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Crear mi Cuenta</span>
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-amber-600 font-semibold hover:underline">
                Inicia sesión
              </a>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
