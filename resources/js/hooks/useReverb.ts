import { useEffect, useCallback, useRef } from 'react';
import debugLog from '@/utils/debugLogger';

/**
 * Hook para suscribirse a canales de Reverb usando la instancia global de Echo.
 * Usa echo-config.ts (que configura Reverb) en lugar de crear una instancia separada.
 */
export function useReverb() {
    const echoRef = useRef<InstanceType<typeof import('laravel-echo').default> | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const initEcho = async () => {
            try {
                // Importar la instancia de Echo configurada con Reverb
                const { default: echo } = await import('../echo-config');
                echoRef.current = echo;
                debugLog.log('✅ useReverb: Echo (Reverb) inicializado correctamente');
            } catch (error) {
                debugLog.error('❌ useReverb: Error al inicializar Echo:', error);
            }
        };

        initEcho();
    }, []);

    const subscribe = useCallback((channel: string, event: string, callback: (data: unknown) => void) => {
        if (echoRef.current) {
            echoRef.current.channel(channel)
                .listen(event, callback);
        } else {
            debugLog.warn('⚠️ useReverb.subscribe: Echo no está inicializado aún');
        }
    }, []);

    const subscribePrivate = useCallback((channel: string, event: string, callback: (data: unknown) => void) => {
        if (echoRef.current) {
            echoRef.current.private(channel)
                .listen(event, callback);
        } else {
            debugLog.warn('⚠️ useReverb.subscribePrivate: Echo no está inicializado aún');
        }
    }, []);

    const leave = useCallback((channel: string) => {
        if (echoRef.current) {
            echoRef.current.leave(channel);
        }
    }, []);

    return { subscribe, subscribePrivate, leave };
}
