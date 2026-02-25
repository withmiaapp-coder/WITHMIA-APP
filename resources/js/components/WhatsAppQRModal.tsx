import React, { useState, useEffect, useRef, useMemo } from 'react';
import debugLog from '@/utils/debugLogger';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface WhatsAppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
  instanceName: string; // Nombre único de la instancia (ej: "company_123")
}

export const WhatsAppQRModal: React.FC<WhatsAppQRModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  instanceName
}) => {
  const { hasTheme, isDark } = useTheme();
  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      bg: 'var(--theme-content-bg)',
      cardBg: 'var(--theme-content-card-bg)',
      cardBorder: 'var(--theme-content-card-border)',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      inputBg: 'var(--theme-input-bg)',
    };
  }, [hasTheme, isDark]);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('disconnected');

  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const qrRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const hasCalledOnConnected = useRef(false);

  // Limpiar intervalos al desmontar
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (qrRefreshInterval.current) {
        clearInterval(qrRefreshInterval.current);
      }
    };
  }, []);

  // Verificar estado de conexión
  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/evolution-whatsapp/status/${instanceName}`);
      const data = await response.json();

      if (data.success) {
        const connected = data.connected || data.state === 'open';
        setIsConnected(connected);
        setStatus(data.state || 'close');

        if (connected && !hasCalledOnConnected.current) {
          hasCalledOnConnected.current = true;

          // Detener todos los intervalos
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }
          if (qrRefreshInterval.current) {
            clearInterval(qrRefreshInterval.current);
            qrRefreshInterval.current = null;
          }

          // Mostrar pantalla de éxito por 8 segundos antes de cerrar
          setTimeout(() => {
            onClose();
            
            // Notificar conexión exitosa después de cerrar el modal
            if (onConnected) {
              onConnected();
            }
          }, 8000);
        }
      }
    } catch (error) {
      debugLog.error('Error checking WhatsApp status:', error);
    }
  };

  // Obtener QR code
  const fetchQRCode = async () => {
    if (isConnected) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/evolution-whatsapp/connect/${instanceName}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      // Si tiene QR, mostrarlo (sin importar el success)
      if (data.qr) {
        setQrCode(data.qr);
        setError(null);
        setIsLoading(false); // Solo dejar de cargar cuando tengamos el QR
      } else if (!data.success) {
        // No mostrar error inmediatamente, puede estar creando la instancia
        // Mantener loading activo y reintentar
      }
    } catch (error) {
      debugLog.error('Error fetching QR code:', error);
      // No mostrar error en el modal mientras se crea la instancia
      // Solo loguear en consola
    }
  };

  // Iniciar proceso de conexión cuando se abre el modal
  useEffect(() => {
    if (isOpen && !isConnected) {
      hasCalledOnConnected.current = false;

      // Resetear estados para forzar nuevo QR
      setQrCode(null);
      setError(null);
      setIsConnected(false);
      setStatus('disconnected');

      // Obtener QR primero (inmediatamente)
      fetchQRCode();

      // Verificar estado después de un momento
      setTimeout(() => checkStatus(), 1000);

      // Verificar estado cada 2 segundos
      statusCheckInterval.current = setInterval(checkStatus, 2000);
    }

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
      if (qrRefreshInterval.current) {
        clearInterval(qrRefreshInterval.current);
        qrRefreshInterval.current = null;
      }
    };
  }, [isOpen, instanceName]);

  // Auto-refresh del QR basado en si ya existe o no
  useEffect(() => {
    if (isOpen && !isConnected) {
      // Limpiar intervalo anterior si existe
      if (qrRefreshInterval.current) {
        clearInterval(qrRefreshInterval.current);
      }

      // Establecer nuevo intervalo basado en el estado del QR
      const interval = qrCode ? 40000 : 5000; // 40s si hay QR, 5s si no
      
      qrRefreshInterval.current = setInterval(() => {
        if (!isConnected) {
          fetchQRCode();
        }
      }, interval);
    }

    return () => {
      if (qrRefreshInterval.current) {
        clearInterval(qrRefreshInterval.current);
        qrRefreshInterval.current = null;
      }
    };
  }, [isOpen, isConnected, qrCode]);

  // Desconectar WhatsApp
  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/evolution-whatsapp/disconnect/${instanceName}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(false);
        setStatus('disconnected');
        setQrCode(null);
        hasCalledOnConnected.current = false;

        // Reiniciar proceso de conexión
        setTimeout(() => {
          fetchQRCode();

          // Reiniciar intervalos
          if (!qrRefreshInterval.current) {
            qrRefreshInterval.current = setInterval(() => {
              if (!isConnected) {
                fetchQRCode();
              }
            }, 40000);
          }

          if (!statusCheckInterval.current) {
            statusCheckInterval.current = setInterval(checkStatus, 2000);
          }
        }, 1000);
      } else {
        setError(data.error || 'Error al desconectar');
      }
    } catch (error) {
      setError('Error al desconectar WhatsApp');
      debugLog.error('Error disconnecting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl max-w-sm w-full relative overflow-hidden ${!t ? 'bg-white' : ''}`} style={t ? { background: 'var(--theme-content-bg)' } : undefined}>
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 transition-colors z-10 ${!t ? 'text-gray-400 hover:text-gray-600' : 'hover:opacity-80'}`}
          style={t ? { color: t.textMuted } : undefined}
        >
          <X size={20} />
        </button>

        {isConnected ? (
          /* Connected State - Success Message */
          <div className="p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${!t ? 'bg-green-100' : ''}`} style={t ? { background: t.accentLight } : undefined}>
              <svg className="w-10 h-10" style={t ? { color: t.accent } : { color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-3 ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>¡Conectado exitosamente!</h2>
            <p className={`text-base leading-relaxed ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
              Espera que se establezca la conexión en tu celular
            </p>
          </div>
        ) : (
          /* QR Code State */
          <div className="p-6 text-center">
            {/* Icon */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>

            {/* Title */}
            <h2 className={`text-xl font-bold mb-1 ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>WhatsApp Business</h2>
            <p className={`text-sm mb-4 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>Conecta tu cuenta escaneando el código QR</p>

            {/* Error Message */}
            {error && !qrCode && (
              <div className={`mb-3 p-2.5 border rounded-lg text-xs ${!t ? 'bg-red-50 border-red-200 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(239,68,68,0.1)' : 'rgb(254,242,242)', borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgb(254,202,202)', color: isDark ? 'rgb(252,165,165)' : 'rgb(185,28,28)' } : undefined}>
                {error}
              </div>
            )}

            {/* QR Code */}
            {isLoading && !qrCode ? (
              <div className="flex flex-col justify-center items-center h-56 mb-4">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mb-3 ${!t ? 'border-green-500' : ''}`} style={t ? { borderBottomColor: t.accent } : undefined}></div>
                <p className={`text-sm font-medium ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>Creando instancia...</p>
                <p className={`text-xs mt-1 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Esto puede tomar hasta 30 segundos</p>
              </div>
            ) : qrCode ? (
              <div className={`p-2 rounded-lg border-2 mb-4 inline-block ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: t.accentLight, borderColor: isDark ? 'var(--theme-content-card-border)' : t.accentLight } : undefined}>
                <img
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56"
                />
              </div>
            ) : (
              <div className={`h-56 flex items-center justify-center mb-4 text-sm ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                No se pudo generar el código QR
              </div>
            )}

            {/* Instructions */}
            <div className={`rounded-lg p-3 mb-4 text-left ${!t ? 'bg-gray-50' : ''}`} style={t ? { background: t.inputBg } : undefined}>
              <ol className={`text-xs space-y-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.textSec } : undefined}>
                <li className="flex items-start">
                  <span className="font-semibold mr-1.5">1.</span>
                  <span>Abre WhatsApp en tu teléfono</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-1.5">2.</span>
                  <span>Toca Menú → Dispositivos vinculados</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-1.5">3.</span>
                  <span>Toca "Vincular un dispositivo"</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-1.5">4.</span>
                  <span>Escanea este código QR</span>
                </li>
              </ol>
            </div>

            {/* Footer info */}
            <p className={`text-xs mt-3 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
              El código QR se renueva automáticamente cada 40 segundos
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppQRModal;
