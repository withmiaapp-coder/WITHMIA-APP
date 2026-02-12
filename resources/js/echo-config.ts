/**
 * Laravel Echo Configuration for Real-time Broadcasting
 *
 * Este archivo configura Laravel Echo con Reverb para recibir
 * eventos en tiempo real del servidor.
 * 
 * Updated: 2026-01-26 - Force rebuild with correct VITE_REVERB_* variables
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import debugLog from '@/utils/debugLogger';

// pusher-js es requerido internamente por Laravel Echo para el protocolo WebSocket de Reverb
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

window.Pusher = Pusher;

// Obtener CSRF token
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// Obtener auth_token de la URL o de los shared props de Inertia
const getAuthToken = (): string | null => {
  // 1) Desde la URL actual
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get('auth_token');
  if (fromUrl) return fromUrl;
  // 2) Desde un meta tag (inyectado por el servidor)
  const meta = document.querySelector('meta[name="auth-token"]');
  if (meta?.getAttribute('content')) return meta.getAttribute('content');
  // 3) Desde las props de Inertia (si están disponibles)
  const inertiaPage = (window as any).__page;
  if (inertiaPage?.props?.railwayAuthToken) return inertiaPage.props.railwayAuthToken;
  return null;
};
const authToken = getAuthToken();

// Configuración de Reverb - Obtener del meta tag del servidor (inyectado por Laravel)
// Esto permite que cada empresa tenga su propia configuración sin hardcodes
const getMetaContent = (name: string): string | null => {
  const meta = document.querySelector(`meta[name="${name}"]`);
  return meta?.getAttribute('content') || null;
};

// Prioridad: 1) Meta tags del servidor, 2) Variables de Vite, 3) Fallback vacío
const reverbHost = getMetaContent('reverb-host') || import.meta.env.VITE_REVERB_HOST;
const reverbKey = getMetaContent('reverb-key') || import.meta.env.VITE_REVERB_APP_KEY;
const reverbPort = getMetaContent('reverb-port') || import.meta.env.VITE_REVERB_PORT || '443';
const reverbScheme = getMetaContent('reverb-scheme') || import.meta.env.VITE_REVERB_SCHEME || 'https';

// Validación: Si no hay host o key, la conexión fallará silenciosamente

// Configurar Laravel Echo con Reverb
const echoConfig: any = {
  broadcaster: 'reverb',
  key: reverbKey,
  wsHost: reverbHost,
  wsPort: parseInt(reverbPort),
  wssPort: parseInt(reverbPort),
  forceTLS: reverbScheme === 'https',
  encrypted: true,
  disableStats: true,
  enabledTransports: ['ws', 'wss'],

  // Autenticación para canales privados
  authEndpoint: '/broadcasting/auth',
  auth: {
    headers: {
      'X-CSRF-TOKEN': csrfToken,
      'Accept': 'application/json',
    },
  },
  
  // CRÍTICO: Habilitar envío de credenciales (cookies de sesión)
  authorizer: (channel: any) => {
    return {
      authorize: (socketId: string, callback: Function) => {
        // Construir URL con auth_token si está disponible
        const authUrl = authToken 
          ? `/broadcasting/auth?auth_token=${encodeURIComponent(authToken)}`
          : '/broadcasting/auth';
        
        fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
            ...(authToken ? { 'X-Railway-Auth-Token': authToken } : {}),
          },
          credentials: 'include', // ⚡ ESTO ES CLAVE - envía cookies
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then(response => {
            if (!response.ok) {
              debugLog.error('❌ Broadcasting auth failed:', response.status, response.statusText);
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          })
          .then(data => {

            callback(null, data);
          })
          .catch(error => {
            debugLog.error('❌ Broadcasting auth error:', error);
            callback(error, null);
          });
      },
    };
  },
};

const echo = new Echo(echoConfig);

// Exportar para uso global
window.Echo = echo;

export default echo;
