import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { CheckCircle, XCircle, Loader2, Mail, User, Lock, AlertCircle } from 'lucide-react';

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validando invitación...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Head title="Invitación Inválida" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invitación Inválida</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all"
          >
            Ir a Iniciar Sesión
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Head title="¡Cuenta Creada!" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Cuenta Creada!</h1>
          <p className="text-gray-600 mb-4">Tu cuenta ha sido creada exitosamente.</p>
          <p className="text-sm text-gray-500">Redirigiendo al login...</p>
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Head title="Aceptar Invitación" />
      
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-1">¡Bienvenido!</h1>
          <p className="text-emerald-100">
            Has sido invitado a unirte a <strong>{invitation?.company_name}</strong>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {invitation?.email}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Rol:</strong> {invitation?.role === 'administrator' ? 'Administrador' : 'Agente'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Tu Nombre
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="¿Cómo te llamas?"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-500 bg-white ${
                  formErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {formErrors.name && <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-500 bg-white ${
                  formErrors.password ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {formErrors.password && <p className="text-sm text-red-600 mt-1">{formErrors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Repite tu contraseña"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-500 bg-white ${
                  formErrors.password_confirmation ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {formErrors.password_confirmation && <p className="text-sm text-red-600 mt-1">{formErrors.password_confirmation}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Crear mi Cuenta</span>
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-emerald-600 hover:underline">
              Inicia sesión
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
