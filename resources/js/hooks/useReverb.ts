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
            window.Pusher = Pusher;

            window.Echo = new Echo({
                broadcaster: 'pusher',
                key: import.meta.env.VITE_REVERB_APP_KEY,
                wsHost: import.meta.env.VITE_REVERB_HOST,
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
