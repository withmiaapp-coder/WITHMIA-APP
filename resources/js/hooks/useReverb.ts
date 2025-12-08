import { useEffect, useCallback } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo | undefined;
    }
}

export function useReverb() {
    useEffect(() => {
        if (typeof window !== 'undefined' && !window.Echo) {
            // Validar que existan las variables de entorno requeridas
            const appKey = import.meta.env.VITE_REVERB_APP_KEY;
            
            if (!appKey) {
                console.warn('⚠️ VITE_REVERB_APP_KEY no está configurado. WebSocket deshabilitado.');
                console.warn('📋 Configura las variables en Railway según RAILWAY_REVERB_VARIABLES.md');
                return;
            }

            window.Pusher = Pusher;

            window.Echo = new Echo({
                broadcaster: 'pusher',
                key: appKey,
                wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
                wsPort: import.meta.env.VITE_REVERB_PORT ?? 443,
                wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
                forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
                enabledTransports: ['ws', 'wss'],
                disableStats: true,
            });

            console.log('✅ Echo connected successfully');
        }

        return () => {
            // Cleanup al desmontar (opcional)
        };
    }, []);

    const subscribe = useCallback((channel: string, event: string, callback: (data: any) => void) => {
        if (window.Echo) {
            window.Echo.channel(channel)
                .listen(event, callback);
        }
    }, []);

    const subscribePrivate = useCallback((channel: string, event: string, callback: (data: any) => void) => {
        if (window.Echo) {
            window.Echo.private(channel)
                .listen(event, callback);
        }
    }, []);

    const leave = useCallback((channel: string) => {
        if (window.Echo) {
            window.Echo.leave(channel);
        }
    }, []);

    return { subscribe, subscribePrivate, leave };
}
