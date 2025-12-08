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
            const appKey = import.meta.env.VITE_PUSHER_APP_KEY;
            const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;
            
            if (!appKey) {
                console.warn('⚠️ VITE_PUSHER_APP_KEY no está configurado. WebSocket deshabilitado.');
                console.warn('📋 Configura Pusher en Railway - Ver PUSHER_SETUP.md');
                return;
            }

            if (!cluster) {
                console.warn('⚠️ VITE_PUSHER_APP_CLUSTER no está configurado. WebSocket deshabilitado.');
                return;
            }

            window.Pusher = Pusher;

            window.Echo = new Echo({
                broadcaster: 'pusher',
                key: appKey,
                cluster: cluster,
                forceTLS: true,
                encrypted: true,
                disableStats: true,
            });

            console.log('✅ Echo conectado a Pusher exitosamente');
            console.log('📍 Cluster:', cluster);
        }

        return () => {
            // Cleanup al desmontar
            if (window.Echo) {
                window.Echo.disconnect();
            }
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
