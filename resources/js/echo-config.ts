/**
 * Laravel Echo Configuration for Real-time Broadcasting
 *
 * Este archivo configura Laravel Echo con Laravel Reverb para recibir
 * eventos en tiempo real del servidor.
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Asignar Pusher globalmente para que Echo lo encuentre (Reverb usa protocolo Pusher)
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

window.Pusher = Pusher;

// Obtener CSRF token
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// Configurar Laravel Echo con Reverb
const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY || 'fyx8y9a8c9pgvp6mbvcq',
  wsHost: import.meta.env.VITE_REVERB_HOST || 'app.withmia.com',
  wsPort: import.meta.env.VITE_REVERB_PORT ? parseInt(import.meta.env.VITE_REVERB_PORT) : 6001,
  wssPort: import.meta.env.VITE_REVERB_PORT ? parseInt(import.meta.env.VITE_REVERB_PORT) : 6001,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
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
              console.error('❌ Broadcasting auth failed:', response.status, response.statusText);
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            // console.log('✅ Broadcasting auth success for channel:', channel.name);
            callback(null, data);
          })
          .catch(error => {
            console.error('❌ Broadcasting auth error:', error);
            callback(error, null);
          });
      },
    };
  },
});

// Eventos de conexión para debugging
echo.connector.pusher.connection.bind('connected', () => {
  // console.log('✅ WebSocket conectado exitosamente');
  // console.log('🔑 Canal activo:', echo.connector.pusher.connection.socket_id);
});

echo.connector.pusher.connection.bind('disconnected', () => {
  // console.log('❌ WebSocket desconectado');
});

echo.connector.pusher.connection.bind('error', (err: any) => {
  console.error('❌ Error en WebSocket:', err);
  console.error('Error type:', err?.type);
  console.error('Error code:', err?.code);
  console.error('Error data:', err?.data);
  console.error('Full error:', JSON.stringify(err, null, 2));
});

echo.connector.pusher.connection.bind('state_change', (states: any) => {
  // console.log('🔄 Estado WebSocket:', states.previous, '→', states.current);
});

// Exportar para uso global
window.Echo = echo;

export default echo;
