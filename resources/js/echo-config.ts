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

// Pusher-js es requerido por Laravel Echo para conectarse a WebSockets
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

window.Pusher = Pusher;

// Obtener CSRF token
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// Configuración de Reverb - DEBUG
console.log('🔧 VITE_REVERB_HOST:', import.meta.env.VITE_REVERB_HOST);
console.log('🔧 VITE_REVERB_APP_KEY:', import.meta.env.VITE_REVERB_APP_KEY);
console.log('🔧 VITE_REVERB_PORT:', import.meta.env.VITE_REVERB_PORT);
console.log('🔧 VITE_REVERB_SCHEME:', import.meta.env.VITE_REVERB_SCHEME);

// Configuración de Reverb con fallbacks robustos
const reverbHost = import.meta.env.VITE_REVERB_HOST || 'reverb-production-4b5c.up.railway.app';
const reverbKey = import.meta.env.VITE_REVERB_APP_KEY || 'e14571c517c74fa41d385702598de8f9';
const reverbPort = import.meta.env.VITE_REVERB_PORT || '443';
const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'https';

console.log('🔧 Using Reverb config:', { reverbHost, reverbKey, reverbPort, reverbScheme });

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
        fetch('/broadcasting/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
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
            // console.log('✅ Broadcasting auth success for channel:', channel.name);
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

debugLog.log('🔧 Conectando a Reverb en:', reverbHost);

const echo = new Echo(echoConfig);

// Eventos de conexión para debugging
echo.connector.pusher.connection.bind('connected', () => {
  debugLog.log('✅ WebSocket conectado exitosamente');
});

echo.connector.pusher.connection.bind('disconnected', () => {
  debugLog.log('❌ WebSocket desconectado');
});

echo.connector.pusher.connection.bind('error', (err: any) => {
  debugLog.error('❌ Error en WebSocket:', err);
  debugLog.error('Error type:', err?.type);
  debugLog.error('Error code:', err?.code);
  debugLog.error('Error data:', err?.data);
  debugLog.error('Full error:', JSON.stringify(err, null, 2));
});

echo.connector.pusher.connection.bind('state_change', (states: any) => {
  // console.log('🔄 Estado WebSocket:', states.previous, '→', states.current);
});

// Exportar para uso global
window.Echo = echo;

export default echo;
