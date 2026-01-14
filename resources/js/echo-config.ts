/**
 * Laravel Echo Configuration for Real-time Broadcasting
 *
 * Este archivo configura Laravel Echo con Pusher para recibir
 * eventos en tiempo real del servidor.
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import debugLog from '@/utils/debugLogger';

// Asignar Pusher globalmente para que Echo lo encuentre
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

window.Pusher = Pusher;

// Obtener CSRF token
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// Detectar si estamos usando Pusher real (sin wsHost) o Reverb (con wsHost)
const pusherHost = import.meta.env.VITE_PUSHER_HOST;
const isUsingPusherReal = !pusherHost || pusherHost === '';

// Configurar Laravel Echo con Pusher
const echoConfig: any = {
  broadcaster: 'pusher',
  key: import.meta.env.VITE_PUSHER_APP_KEY || 'local-app-key',
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
  forceTLS: true,
  encrypted: true,
  disableStats: true,

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

// Solo agregar wsHost si estamos usando Reverb (self-hosted)
if (!isUsingPusherReal && pusherHost) {
  echoConfig.wsHost = pusherHost;
  echoConfig.wsPort = 443;
  echoConfig.wssPort = 443;
  echoConfig.enabledTransports = ['ws', 'wss'];
  debugLog.log('🔧 Usando Reverb (self-hosted) en:', pusherHost);
} else {
  debugLog.log('🔧 Usando Pusher real, cluster:', import.meta.env.VITE_PUSHER_APP_CLUSTER);
}

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
