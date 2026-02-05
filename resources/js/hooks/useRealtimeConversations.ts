import { useEffect, useState, useRef } from 'react';
import debugLog from '@/utils/debugLogger';

// ============================================================================
// HOOK: Tiempo Real con Laravel Echo + Reverb - OPTIMIZADO v2
// ============================================================================

export interface RealtimeConfig {
  inboxId: number | null;
  enabled: boolean;
  onNewMessage?: (message: any) => void;
  onMessageUpdated?: (message: any) => void;
  onConversationUpdated?: (conversation: any) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const useRealtimeConversations = (config: RealtimeConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const channelRef = useRef<any>(null);
  const echoRef = useRef<any>(null);

  useEffect(() => {
    // console.log('🐛 [DEBUG] useRealtimeConversations ejecutado:', { enabled: config.enabled, inboxId: config.inboxId, timestamp: new Date().toISOString() });

    // Solo inicializar si está habilitado y tenemos inbox_id
    if (!config.enabled || !config.inboxId) {
      // console.log('⚠️ Tiempo real deshabilitado o sin inbox_id:', { 
      //   enabled: config.enabled, 
      //   inboxId: config.inboxId 
      // });
      return;
    }

    // Cargar Echo dinámicamente
    const initializeEcho = async () => {
      try {
        // Importar Echo configurado
        const { default: echo } = await import('../echo-config');
        echoRef.current = echo;

        // Suscribirse al canal privado del inbox
        const channelName = `inbox.${config.inboxId}`;
        debugLog.log(`🔌 Conectando a canal: ${channelName}`);

        const channel = echo.private(channelName);
        channelRef.current = channel;

        // Debug: Log cuando el canal se suscribe exitosamente
        channel.subscribed(() => {
          debugLog.log(`✅ Canal ${channelName} SUSCRITO exitosamente`);
        });

        // Debug: Log errores de suscripción
        channel.error((error: any) => {
          debugLog.error(`❌ Error en canal ${channelName}:`, error);
        });

        // ========================================
        // NOTA: Los listeners de mensajes están DESHABILITADOS aquí
        // porque GlobalNotificationContext ya maneja todo centralizadamente
        // y distribuye los eventos a través del sistema de subscribers.
        // Tener listeners aquí causaría mensajes duplicados.
        // ========================================
        
        // Solo monitorear conexión, no escuchar mensajes
        // (GlobalNotificationContext ya lo hace)

        // Monitorear estado de conexión
        if (echo.connector?.pusher?.connection) {
          const pusherConnection = echo.connector.pusher.connection;

          pusherConnection.bind('connected', () => {
            debugLog.log('✅ WebSocket CONECTADO');
            setIsConnected(true);
            if (config.onConnectionChange) {
              config.onConnectionChange(true);
            }
          });

          pusherConnection.bind('disconnected', () => {
            debugLog.log('⚠️ WebSocket DESCONECTADO');
            setIsConnected(false);
            if (config.onConnectionChange) {
              config.onConnectionChange(false);
            }
          });

          pusherConnection.bind('error', (err: any) => {
            debugLog.error('❌ Error en WebSocket:', err);
          });

          // Estado inicial
          if (pusherConnection.state === 'connected') {
            setIsConnected(true);
            if (config.onConnectionChange) {
              config.onConnectionChange(true);
            }
          }
        }

        // console.log('✅ Echo inicializado correctamente');

      } catch (error) {
        debugLog.error('❌ Error inicializando Echo:', error);
        setIsConnected(false);
        if (config.onConnectionChange) {
          config.onConnectionChange(false);
        }
      }
    };

    initializeEcho();

    // Cleanup: desuscribirse al desmontar
    return () => {
      if (channelRef.current && config.inboxId) {
        debugLog.log(`🔌 Desconectando de canal: inbox.${config.inboxId}`);
        
        try {
          // Solo dejar el canal, los listeners ya no existen aquí
          if (echoRef.current) {
            echoRef.current.leave(`inbox.${config.inboxId}`);
          }
        } catch (error) {
          debugLog.error('Error al limpiar suscripciones:', error);
        }
      }
    };
  }, [config.enabled, config.inboxId]); // Solo re-suscribir si cambia enabled o inboxId

  return {
    isConnected,
    lastEventTime,
  };
};

// ============================================================================
// ✅ NUEVO: Polling con Exponential Backoff + Polling Incremental
// ============================================================================

export interface PollingFallbackConfig {
  enabled: boolean;
  onPoll: () => Promise<number>; // Devuelve cantidad de cambios detectados
  minInterval?: number; // Intervalo mínimo (segundos)
  maxInterval?: number; // Intervalo máximo (segundos)
  backoffMultiplier?: number; // Multiplicador para backoff
}

export const useSmartPollingFallback = (config: PollingFallbackConfig) => {
  const {
    enabled,
    onPoll,
    minInterval = 30,
    maxInterval = 300,
    backoffMultiplier = 1.5
  } = config;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalRef = useRef<number>(minInterval);
  const consecutiveEmptyPolls = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      // Limpiar interval si existe
      if (intervalRef.current) {
        debugLog.log('🛑 Smart Polling detenido (WebSocket conectado)');
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
        currentIntervalRef.current = minInterval;
        consecutiveEmptyPolls.current = 0;
      }
      return;
    }

    debugLog.log(`🔄 Iniciando Smart Polling con intervalo inicial de ${minInterval}s`);

    // Función recursiva para polling con backoff
    const scheduleNextPoll = async () => {
      try {
        const startTime = Date.now();
        debugLog.log(`🔄 Polling ejecutado (intervalo: ${currentIntervalRef.current}s)`);

        // Ejecutar polling y obtener cantidad de cambios
        const changesCount = await onPoll();
        
        const executionTime = Date.now() - startTime;
        debugLog.log(`✅ Polling completado en ${executionTime}ms - ${changesCount} cambios detectados`);

        // Ajustar intervalo basado en actividad
        if (changesCount > 0) {
          // Hay actividad: resetear a intervalo mínimo
          consecutiveEmptyPolls.current = 0;
          currentIntervalRef.current = minInterval;
          debugLog.log(`⚡ Actividad detectada - Intervalo reseteado a ${minInterval}s`);
        } else {
          // Sin actividad: aumentar intervalo con backoff
          consecutiveEmptyPolls.current++;
          
          if (consecutiveEmptyPolls.current >= 2) {
            const newInterval = Math.min(
              currentIntervalRef.current * backoffMultiplier,
              maxInterval
            );
            
            if (newInterval !== currentIntervalRef.current) {
              debugLog.log(`📈 Sin actividad (${consecutiveEmptyPolls.current} veces) - Aumentando intervalo a ${newInterval.toFixed(0)}s`);
              currentIntervalRef.current = newInterval;
            }
          }
        }

      } catch (error) {
        debugLog.error('❌ Error en polling:', error);
        // En caso de error, usar intervalo mínimo
        currentIntervalRef.current = minInterval;
      }

      // Programar siguiente polling
      if (enabled) {
        intervalRef.current = setTimeout(scheduleNextPoll, currentIntervalRef.current * 1000);
      }
    };

    // Iniciar primer polling
    scheduleNextPoll();

    return () => {
      if (intervalRef.current) {
        debugLog.log('🛑 Smart Polling limpiado');
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, minInterval, maxInterval, backoffMultiplier]); // onPoll no debe estar en dependencias

  return {
    currentInterval: currentIntervalRef.current,
    consecutiveEmptyPolls: consecutiveEmptyPolls.current
  };
};

// ============================================================================
// Hook combinado para facilitar uso
// ============================================================================

export interface CombinedRealtimeConfig {
  inboxId: number | null;
  enabled: boolean;
  onUpdate: () => Promise<number>; // Función que devuelve cantidad de actualizaciones
  onNewMessage?: (message: any) => void;
  onConversationUpdated?: (conversation: any) => void;
  onMessageUpdated?: (message: any) => void;
  minPollingInterval?: number;
  maxPollingInterval?: number;
}

export const useCombinedRealtime = (config: CombinedRealtimeConfig) => {
  const [wsConnected, setWsConnected] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Delay inicial para dar tiempo al WebSocket de conectarse
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitializing(false);
      // console.log('✅ Período de inicialización completado - Polling puede activarse si WebSocket falla');
    }, 3000); // 3 segundos de gracia para WebSocket
    
    return () => clearTimeout(timer);
  }, []);

  // WebSocket en tiempo real
  const { isConnected, lastEventTime } = useRealtimeConversations({
    inboxId: config.inboxId,
    enabled: config.enabled,
    onNewMessage: (event) => {
      debugLog.log('🔔 [WS] Nuevo mensaje recibido:', event);
      
      // ✅ NO FILTRAR - Dejar que el componente maneje la lógica
      // Los mensajes de Chatwoot WebSocket son legítimos
      if (config.onNewMessage) {
        config.onNewMessage(event);
      }
    },
    onConversationUpdated: (event) => {
      debugLog.log('🔔 [WS] Conversación actualizada:', event);
      if (config.onConversationUpdated) {
        config.onConversationUpdated(event);
      }
      // Ejecutar update
      // config.onUpdate(); // DESHABILITADO - Actualización optimista ya maneja esto
    },
    onMessageUpdated: (event) => {
      debugLog.log('🔔 [WS] Mensaje actualizado (status):', event);
      if (config.onMessageUpdated) {
        config.onMessageUpdated(event);
      }
    },
    onConnectionChange: setWsConnected
  });

  // Polling inteligente como fallback (solo después del período de inicialización)
  const { currentInterval, consecutiveEmptyPolls } = useSmartPollingFallback({
    enabled: false, // DESHABILITADO - Solo Reverb, sin polling
    onPoll: config.onUpdate,
    minInterval: config.minPollingInterval || 30,
    maxInterval: config.maxPollingInterval || 300,
    backoffMultiplier: 1.5
  });

  return {
    isConnected,
    wsConnected,
    lastEventTime,
    pollingInterval: currentInterval,
    consecutiveEmptyPolls,
    usingFallback: !initializing && !isConnected && config.enabled,
    initializing
  };
};
