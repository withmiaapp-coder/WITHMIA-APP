import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';

// ============================================================================
// SISTEMA UNIFICADO DE NOTIFICACIONES v2.0
// 
// Este es el ÚNICO sistema de notificaciones de la aplicación.
// Incluye:
// - Suscripción WebSocket centralizada (siempre activa)
// - Manejo de estado de notificaciones
// - Sonido, vibración, desktop notifications
// - Deduplicación de mensajes
// - Rate limiting
// 
// Otros componentes NO deben tener sus propias suscripciones WebSocket
// para notificaciones. Deben usar subscribeToMessages() de este contexto.
// ============================================================================

// Interfaz compatible con NotificationCenter
interface Notification {
  id: number;
  conversationId: number;
  name: string;        // Nombre del contacto
  avatar: string;      // Avatar/inicial
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

// Interfaz para Toast (compatible con NotificationToast)
interface Toast {
  id: number;
  conversationId: number;
  avatar: string;
  name: string;
  message: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  timestamp: Date;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  badgeEnabled: boolean;
  toastEnabled: boolean;
  volumeLevel: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  groupNotifications?: boolean;
}

// Eventos que el contexto emite para que otros componentes puedan reaccionar
export interface WebSocketMessageEvent {
  type: 'new_message' | 'message_updated' | 'conversation_updated';
  conversationId: number;
  message?: any;
  conversation?: any;
  event: any; // Evento raw del WebSocket
}

interface GlobalNotificationContextType {
  // Estado de notificaciones (historial)
  notifications: Notification[];
  notificationHistory: Notification[]; // Alias para compatibilidad
  unreadCount: number;
  settings: NotificationSettings;
  
  // ✅ Badges por conversación (FUENTE ÚNICA DE VERDAD)
  conversationBadges: Map<number, number>;
  totalUnreadMessages: number;
  updateBadge: (conversationId: number, count: number) => void;
  incrementBadge: (conversationId: number) => void;
  clearBadge: (conversationId: number) => void;
  initializeBadges: (conversations: Array<{ id: number; unread_count?: number }>) => void;
  
  // Toasts (notificaciones efímeras)
  toasts: Toast[];
  dismissToast: (id: number) => void;
  
  // Acciones de notificaciones
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: number) => void;
  removeNotificationsByConversation: (conversationId: number) => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  
  // Efectos
  playNotificationSound: (priority?: string) => void;
  showDesktopNotification: (title: string, body: string, options?: { conversationId?: number }) => void;
  
  // Estado de conexión WebSocket
  isWebSocketConnected: boolean;
  
  // Para componentes que necesitan saber de mensajes nuevos en tiempo real
  subscribeToMessages: (callback: (event: WebSocketMessageEvent) => void) => () => void;
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType | undefined>(undefined);

export const useGlobalNotifications = () => {
  const context = useContext(GlobalNotificationContext);
  return context || null;
};

interface GlobalNotificationProviderProps {
  children: ReactNode;
  inboxId: number | null;
}

// Mapeo de sonidos por prioridad
const SOUND_MAP: Record<string, string> = {
  urgent: '/sounds/urgent-notification.mp3',
  high: '/sounds/high-notification.mp3',
  medium: '/sounds/notification.mp3',
  low: '/sounds/subtle-notification.mp3',
};

export const GlobalNotificationProvider: React.FC<GlobalNotificationProviderProps> = ({ children, inboxId }) => {
  // ============================================================================
  // ESTADO
  // ============================================================================
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  
  // ✅ Badges por conversación - FUENTE ÚNICA DE VERDAD
  const [conversationBadges, setConversationBadges] = useState<Map<number, number>>(new Map());
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    soundEnabled: true,
    desktopEnabled: true,
    badgeEnabled: true,
    toastEnabled: true,
    volumeLevel: 70,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    groupNotifications: true,
  });
  
  // Contador para IDs únicos
  const notificationIdCounter = useRef(Date.now());

  // ============================================================================
  // REFS
  // ============================================================================
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const originalTitle = useRef<string>('');
  const lastNotificationTime = useRef<number>(0);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const lastNotificationPerConversation = useRef<Map<number, number>>(new Map());
  const messageSubscribers = useRef<Set<(event: WebSocketMessageEvent) => void>>(new Set());
  const channelRef = useRef<any>(null);
  const echoRef = useRef<any>(null);
  const addNotificationRef = useRef<typeof addNotification | null>(null);
  const processedConversationUpdates = useRef<Set<string>>(new Set());
  
  // Cola de mensajes perdidos (cuando no hay subscribers)
  const pendingMessages = useRef<WebSocketMessageEvent[]>([]);
  
  // Rate limits
  const RATE_LIMIT_MS = 1000;
  const CONVERSATION_RATE_LIMIT_MS = 3000;

  // ============================================================================
  // UTILIDADES (definidas antes de usarlas)
  // ============================================================================
  const isQuietHours = useCallback(() => {
    if (!settings.quietHoursEnabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = (settings.quietHoursStart || '22:00').split(':').map(Number);
    const [endH, endM] = (settings.quietHoursEnd || '08:00').split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime < endMinutes;
    }
    
    return currentTime >= startMinutes && currentTime < endMinutes;
  }, [settings.quietHoursEnabled, settings.quietHoursStart, settings.quietHoursEnd]);

  // ============================================================================
  // SONIDO
  // ============================================================================
  const playNotificationSound = useCallback((priority: string = 'medium') => {
    if (!settings.soundEnabled || isQuietHours()) return;

    const now = Date.now();
    if (now - lastNotificationTime.current < RATE_LIMIT_MS) return;
    lastNotificationTime.current = now;

    try {
      const soundPath = SOUND_MAP[priority] || SOUND_MAP.medium;
      
      if (!audioCache.current.has(priority)) {
        const audio = new Audio(soundPath);
        audio.preload = 'auto';
        audio.onerror = () => audioCache.current.delete(priority);
        audioCache.current.set(priority, audio);
      }
      
      const audio = audioCache.current.get(priority);
      if (!audio) return;
      
      audio.volume = settings.volumeLevel / 100;
      audio.currentTime = 0;
      
      audio.play().catch(() => {
        // Browser policy - silent fail
      });
    } catch (error) {
      // Silent fail
    }
  }, [settings.soundEnabled, settings.volumeLevel, isQuietHours]);

  // ============================================================================
  // DESKTOP NOTIFICATION
  // ============================================================================
  const showDesktopNotification = useCallback((title: string, body: string, options?: { conversationId?: number }) => {
    if (!settings.desktopEnabled || isQuietHours()) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo-withmia.webp',
        badge: '/logo-withmia.webp',
        tag: options?.conversationId ? `conv-${options.conversationId}` : undefined,
        silent: false,
      } as NotificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  }, [settings.desktopEnabled, isQuietHours]);

  // ============================================================================
  // AGREGAR NOTIFICACIÓN
  // ============================================================================
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!settings.enabled) return;
    
    // Verificar si la conversación está silenciada
    const mutedConversations = (window as any).__mutedConversations as Set<number> | undefined;
    if (mutedConversations?.has(notification.conversationId)) {
      return;
    }

    const id = ++notificationIdCounter.current;
    
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
    };

    // Agregar al historial de notificaciones
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
    
    // Agregar toast si está habilitado
    if (settings.toastEnabled) {
      const newToast: Toast = {
        id,
        conversationId: notification.conversationId,
        avatar: notification.avatar || notification.name.charAt(0).toUpperCase(),
        name: notification.name,
        message: notification.message,
        priority: notification.priority,
        timestamp: new Date(),
      };
      
      setToasts(prev => [...prev, newToast]);
      
      // Auto-dismiss toast después de 5 segundos
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    }

    playNotificationSound(notification.priority || 'medium');
    showDesktopNotification(
      `Nuevo mensaje de ${notification.name}`,
      notification.message,
      { conversationId: notification.conversationId }
    );

    // Notificación agregada
  }, [settings.enabled, settings.toastEnabled, playNotificationSound, showDesktopNotification]);
  
  // Mantener ref actualizada para uso en useEffect sin causar re-renders
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);
  
  // ============================================================================
  // DISMISS TOAST
  // ============================================================================
  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ============================================================================
  // BADGES POR CONVERSACIÓN - FUENTE ÚNICA DE VERDAD
  // ============================================================================
  const updateBadge = useCallback((conversationId: number, count: number) => {
    setConversationBadges(prev => {
      const newMap = new Map(prev);
      const oldCount = newMap.get(conversationId) || 0;
      newMap.set(conversationId, count);
      setTotalUnreadMessages(total => total - oldCount + count);
      return newMap;
    });
  }, []);

  const incrementBadge = useCallback((conversationId: number) => {
    setConversationBadges(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(conversationId) || 0;
      newMap.set(conversationId, current + 1);
      setTotalUnreadMessages(total => total + 1);
      return newMap;
    });
  }, []);

  const clearBadge = useCallback((conversationId: number) => {
    setConversationBadges(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(conversationId) || 0;
      newMap.set(conversationId, 0);
      setTotalUnreadMessages(total => Math.max(0, total - current));
      return newMap;
    });
  }, []);

  // Inicializar badges desde conversaciones (llamado al cargar)
  const initializeBadges = useCallback((conversations: Array<{ id: number; unread_count?: number }>) => {
    const newMap = new Map<number, number>();
    let total = 0;
    conversations.forEach(conv => {
      const count = conv.unread_count || 0;
      newMap.set(conv.id, count);
      total += count;
    });
    setConversationBadges(newMap);
    setTotalUnreadMessages(total);
  }, []);

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================
  useEffect(() => {
    originalTitle.current = document.title;

    // Cargar configuración desde localStorage
    const saved = localStorage.getItem('globalNotificationSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading notification settings:', e);
      }
    }

    // Solicitar permisos de notificación
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cargar notificaciones guardadas
    const savedNotifications = localStorage.getItem('globalNotifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })));
        setUnreadCount(parsed.filter((n: any) => !n.read).length);
      } catch (e) {
        console.error('Error loading notifications:', e);
      }
    }

    // Sistema de notificaciones iniciado
  }, []);

  // ============================================================================
  // WEBSOCKET CENTRALIZADO
  // ============================================================================
  useEffect(() => {
    if (!inboxId) {
      console.log('⚠️ [UNIFIED] No hay inboxId, WebSocket no iniciado');
      return;
    }

    const initializeWebSocket = async () => {
      try {
        const { default: echo } = await import('../echo-config');
        echoRef.current = echo;

        const channelName = `inbox.${inboxId}`;
        // Conectando a canal

        const channel = echo.private(channelName);
        channelRef.current = channel;

        // Suscripción exitosa
        channel.subscribed(() => {
          // Canal suscrito
        });

        // Error en canal
        channel.error((error: any) => {
          console.error(`❌ [UNIFIED] Error en canal ${channelName}:`, error);
        });

        // ========================================
        // LISTENER: Nuevo mensaje
        // ========================================
        channel.listen('.message.received', (event: any) => {
          const messageId = event?.message?.id;
          
          // Filtrar mensajes de prueba o sin ID válido
          if (event?.message?.test === true || event?.test === true) {
            return;
          }
          
          // Validar que el mensaje tenga un ID válido
          if (!messageId || messageId === undefined || messageId === null) {
            return;
          }
          
          const convId = event?.conversation_id || event?.conversation?.id;
          if (!convId || convId <= 0) {
            return;
          }

          // Deduplicación
          const messageKey = `${convId}-${messageId}`;
          if (processedMessageIds.current.has(messageKey)) {
            return;
          }
          processedMessageIds.current.add(messageKey);
          
          // Limpiar IDs antiguos
          if (processedMessageIds.current.size > 200) {
            const iterator = processedMessageIds.current.values();
            const firstItem = iterator.next().value;
            if (firstItem) {
              processedMessageIds.current.delete(firstItem);
            }
          }

          // Notificar a todos los suscriptores (ConversationsInterface, etc.)
          const wsEvent: WebSocketMessageEvent = {
            type: 'new_message',
            conversationId: convId,
            message: event?.message,
            conversation: event?.conversation,
            event,
          };
          
          // Si no hay subscribers, guardar en cola para entregar después
          if (messageSubscribers.current.size === 0) {
            pendingMessages.current.push(wsEvent);
            // Mantener solo los últimos 20 mensajes pendientes
            if (pendingMessages.current.length > 20) {
              pendingMessages.current.shift();
            }
          } else {
            messageSubscribers.current.forEach(callback => {
              try {
                callback(wsEvent);
              } catch (err) {
                console.error('Error en subscriber:', err);
              }
            });
          }

          // Crear notificación solo para mensajes incoming
          const messageType = event?.message?.message_type ?? event?.message_type;
          const isIncoming = messageType === 0 || messageType === 'incoming';
          
          if (isIncoming) {
            // Rate limit por conversación
            const now = Date.now();
            const lastTime = lastNotificationPerConversation.current.get(convId) || 0;
            
            if (now - lastTime >= CONVERSATION_RATE_LIMIT_MS) {
              lastNotificationPerConversation.current.set(convId, now);
              
              // Filtrar mensajes de sistema
              const content = event?.message?.content || '';
              const systemKeywords = ['Connection successfully', 'QRCode', 'Instance created', 'Connecting...'];
              const isSystem = systemKeywords.some(k => content.includes(k));
              
              if (!isSystem && addNotificationRef.current) {
                // Obtener información del contacto
                const sender = event?.conversation?.meta?.sender || event?.sender || event?.message?.sender || {};
                const senderName = sender?.name || '';
                const senderPhone = sender?.phone_number || sender?.identifier || '';
                
                // Determinar el nombre a mostrar:
                // 1. Si tiene nombre guardado (que no sea un número de teléfono), usarlo
                // 2. Si no, usar el número de teléfono
                // 3. Si no hay nada, usar 'Contacto'
                const isPhoneNumber = (str: string) => /^[\+]?[\d\s\-\(\)]+$/.test(str.trim());
                
                let displayName: string;
                if (senderName && !isPhoneNumber(senderName)) {
                  // Tiene un nombre real guardado
                  displayName = senderName;
                } else if (senderPhone) {
                  // Usar el número de teléfono
                  displayName = senderPhone;
                } else if (senderName) {
                  // El nombre es un número, usarlo tal cual
                  displayName = senderName;
                } else {
                  displayName = 'Contacto';
                }
                
                // Agregar notificación usando ref para evitar re-renders
                addNotificationRef.current({
                  conversationId: convId,
                  name: displayName,
                  message: content.substring(0, 100) || 'Nuevo mensaje',
                  priority: 'medium',
                  avatar: displayName.charAt(0).toUpperCase(),
                });
              }
            }
          }
        });

        // ========================================
        // LISTENER: Conversación actualizada
        // ========================================
        channel.listen('.conversation.updated', (event: any) => {
          const convId = event?.conversation?.id || event?.id;
          if (!convId) return;
          
          // Deduplicar actualizaciones de conversación (dentro de 500ms)
          const updateKey = `conv-${convId}-${Math.floor(Date.now() / 500)}`;
          if (processedConversationUpdates.current.has(updateKey)) {
            return;
          }
          processedConversationUpdates.current.add(updateKey);
          
          // Limpiar keys antiguos
          if (processedConversationUpdates.current.size > 50) {
            const iterator = processedConversationUpdates.current.values();
            const firstItem = iterator.next().value;
            if (firstItem) processedConversationUpdates.current.delete(firstItem);
          }
          
          // Conversación actualizada silenciosamente

          const wsEvent: WebSocketMessageEvent = {
            type: 'conversation_updated',
            conversationId: convId,
            conversation: event?.conversation || event,
            event,
          };
          
          messageSubscribers.current.forEach(callback => {
            try {
              callback(wsEvent);
            } catch (err) {
              console.error('Error en subscriber:', err);
            }
          });
        });

        // ========================================
        // LISTENER: Mensaje actualizado (status)
        // ========================================
        channel.listen('.message.updated', (event: any) => {
          // Mensaje actualizado
          
          const convId = event?.conversation_id || event?.message?.conversation_id;
          if (!convId) return;

          const wsEvent: WebSocketMessageEvent = {
            type: 'message_updated',
            conversationId: convId,
            message: event?.message,
            event,
          };
          
          messageSubscribers.current.forEach(callback => {
            try {
              callback(wsEvent);
            } catch (err) {
              console.error('Error en subscriber:', err);
            }
          });
        });

        // ========================================
        // ESTADO DE CONEXIÓN
        // ========================================
        const connector = echo.connector as any;
        if (connector?.pusher?.connection) {
          const connection = connector.pusher.connection;

          connection.bind('connected', () => {
            console.log('✅ [UNIFIED] WebSocket CONECTADO');
            setIsWebSocketConnected(true);
          });

          connection.bind('disconnected', () => {
            console.log('⚠️ [UNIFIED] WebSocket DESCONECTADO');
            setIsWebSocketConnected(false);
          });

          connection.bind('error', (err: any) => {
            console.error('❌ [UNIFIED] Error WebSocket:', err);
          });

          // Estado inicial
          if (connection.state === 'connected') {
            setIsWebSocketConnected(true);
          }
        }

      } catch (error) {
        console.error('❌ [UNIFIED] Error inicializando WebSocket:', error);
        setIsWebSocketConnected(false);
      }
    };

    initializeWebSocket();

    // Cleanup
    return () => {
      if (channelRef.current && inboxId) {
        // Desconectando
        try {
          channelRef.current.stopListening('.message.received');
          channelRef.current.stopListening('.message.updated');
          channelRef.current.stopListening('.conversation.updated');
          if (echoRef.current) {
            echoRef.current.leave(`inbox.${inboxId}`);
          }
        } catch (error) {
          console.error('Error limpiando WebSocket:', error);
        }
      }
    };
  }, [inboxId]); // Solo depende de inboxId, addNotification se accede via ref

  // ============================================================================
  // RECONEXIÓN AL VOLVER A LA PESTAÑA
  // ============================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (window.Echo?.connector?.pusher?.connection) {
          const connection = window.Echo.connector.pusher.connection;
          if (connection.state !== 'connected') {
            // Reconectando
            connection.connect();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ============================================================================
  // ACTUALIZAR BADGE DEL TÍTULO
  // ============================================================================
  useEffect(() => {
    if (settings.badgeEnabled && unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle.current}`;
    } else {
      document.title = originalTitle.current;
    }
  }, [unreadCount, settings.badgeEnabled]);

  // ============================================================================
  // PERSISTIR NOTIFICACIONES
  // ============================================================================
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('globalNotifications', JSON.stringify(notifications.slice(0, 50)));
    }
  }, [notifications]);

  // ============================================================================
  // ACCIONES DE NOTIFICACIONES
  // ============================================================================
  const markAsRead = useCallback((notificationId: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('globalNotifications');
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const removeNotificationsByConversation = useCallback((conversationId: number) => {
    setNotifications(prev => {
      const removedUnread = prev.filter(n => n.conversationId === conversationId && !n.read).length;
      if (removedUnread > 0) {
        setUnreadCount(count => Math.max(0, count - removedUnread));
      }
      return prev.filter(n => n.conversationId !== conversationId);
    });
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('globalNotificationSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ============================================================================
  // SUSCRIPCIÓN A MENSAJES (para ConversationsInterface y otros componentes)
  // ============================================================================
  const subscribeToMessages = useCallback((callback: (event: WebSocketMessageEvent) => void) => {
    messageSubscribers.current.add(callback);
    
    // Entregar mensajes pendientes que llegaron cuando no había subscribers
    if (pendingMessages.current.length > 0) {
      const pendingCount = pendingMessages.current.length;
      const messages = [...pendingMessages.current];
      pendingMessages.current = [];
      
      // Entregar con pequeño delay para asegurar que el componente esté listo
      setTimeout(() => {
        messages.forEach(wsEvent => {
          try {
            callback(wsEvent);
          } catch (err) {
            console.error('Error entregando mensaje pendiente:', err);
          }
        });
        
        // Emitir evento para que ConversationsInterface recargue la lista
        if (pendingCount > 0) {
          window.dispatchEvent(new CustomEvent('refreshConversations'));
        }
      }, 150);
    }
    
    return () => {
      messageSubscribers.current.delete(callback);
    };
  }, []);

  // ============================================================================
  // ESCUCHAR EVENTOS EXTERNOS (para limpiar notificaciones)
  // ============================================================================
  useEffect(() => {
    const handleClearNotifications = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId) {
        removeNotificationsByConversation(conversationId);
      }
    };

    window.addEventListener('clearNotifications', handleClearNotifications as EventListener);
    return () => window.removeEventListener('clearNotifications', handleClearNotifications as EventListener);
  }, [removeNotificationsByConversation]);

  // ============================================================================
  // PROVIDER VALUE
  // ============================================================================
  const value = useMemo<GlobalNotificationContextType>(() => ({
    notifications,
    notificationHistory: notifications,
    unreadCount,
    settings,
    // Badges por conversación
    conversationBadges,
    totalUnreadMessages,
    updateBadge,
    incrementBadge,
    clearBadge,
    initializeBadges,
    // Toasts
    toasts,
    dismissToast,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    removeNotificationsByConversation,
    updateSettings,
    playNotificationSound,
    showDesktopNotification,
    isWebSocketConnected,
    subscribeToMessages,
  }), [
    notifications,
    unreadCount,
    settings,
    conversationBadges,
    totalUnreadMessages,
    updateBadge,
    incrementBadge,
    clearBadge,
    initializeBadges,
    toasts,
    dismissToast,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    removeNotificationsByConversation,
    updateSettings,
    playNotificationSound,
    showDesktopNotification,
    isWebSocketConnected,
    subscribeToMessages,
  ]);

  return (
    <GlobalNotificationContext.Provider value={value}>
      {children}
    </GlobalNotificationContext.Provider>
  );
};