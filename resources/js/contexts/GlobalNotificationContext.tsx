import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';

// ============================================================================
// CONTEXTO GLOBAL DE NOTIFICACIONES (OPTIMIZADO)
// Este contexto maneja notificaciones globales con suscripción WebSocket propia.
// Funciona en TODAS las secciones del dashboard, no solo en Chats.
// ============================================================================

interface Notification {
  id: string;
  conversationId: number;
  contactName: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  avatar?: string;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  badgeEnabled: boolean;
  toastEnabled: boolean;
  volumeLevel: number;
  // Nuevas configuraciones
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  groupNotifications?: boolean;
}

interface GlobalNotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  playNotificationSound: () => void;
  removeNotification: (id: string) => void;
  removeNotificationsByConversation: (conversationId: number) => void;
  showDesktopNotification: (title: string, body: string) => void;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  // Cache de audio por prioridad (lazy loading)
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const originalTitle = useRef<string>('');
  const lastNotificationTime = useRef<number>(0);
  const RATE_LIMIT_MS = 1000; // Mínimo 1 segundo entre notificaciones
  
  // 🔒 DEDUPLICACIÓN: Set para trackear mensajes ya procesados
  const processedMessageIds = useRef<Set<string>>(new Set());
  const lastNotificationPerConversation = useRef<Map<number, number>>(new Map());
  const CONVERSATION_RATE_LIMIT_MS = 3000; // Mínimo 3 segundos entre notificaciones de la misma conversación

  // Cargar configuración desde localStorage
  useEffect(() => {
    originalTitle.current = document.title;

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
  }, []);

  // Actualizar badge en el título
  useEffect(() => {
    if (settings.badgeEnabled && unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle.current}`;
    } else {
      document.title = originalTitle.current;
    }
  }, [unreadCount, settings.badgeEnabled]);

  // Guardar notificaciones en localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('globalNotifications', JSON.stringify(notifications.slice(0, 50)));
    }
  }, [notifications]);

  // 🔄 MANEJO DE VISIBILIDAD: Reconectar cuando la pestaña vuelve a ser visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [GLOBAL] Pestaña visible - verificando conexión WebSocket');
        
        // Forzar reconexión del WebSocket si es necesario
        if (window.Echo?.connector?.pusher?.connection) {
          const connection = window.Echo.connector.pusher.connection;
          const state = connection.state;
          
          console.log('👁️ [GLOBAL] Estado WebSocket:', state);
          
          if (state !== 'connected') {
            console.log('🔄 [GLOBAL] Reconectando WebSocket...');
            connection.connect();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Verificar si estamos en horario silencioso
  const isQuietHours = useCallback(() => {
    if (!settings.quietHoursEnabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = (settings.quietHoursStart || '22:00').split(':').map(Number);
    const [endH, endM] = (settings.quietHoursEnd || '08:00').split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // Manejar caso de cruce de medianoche (ej: 22:00 a 08:00)
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime < endMinutes;
    }
    
    return currentTime >= startMinutes && currentTime < endMinutes;
  }, [settings.quietHoursEnabled, settings.quietHoursStart, settings.quietHoursEnd]);

  // Reproducir sonido con lazy loading y prioridad
  const playNotificationSound = useCallback((priority: string = 'medium') => {
    if (!settings.soundEnabled || isQuietHours()) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastNotificationTime.current < RATE_LIMIT_MS) {
      return;
    }
    lastNotificationTime.current = now;

    try {
      const soundPath = SOUND_MAP[priority] || SOUND_MAP.medium;
      
      // Lazy loading: crear audio solo cuando se necesita
      if (!audioCache.current.has(priority)) {
        const audio = new Audio(soundPath);
        audio.preload = 'auto';
        // Add error handler for loading issues
        audio.onerror = () => {
          console.warn(`No se pudo cargar el sonido: ${soundPath}`);
          audioCache.current.delete(priority);
        };
        audioCache.current.set(priority, audio);
      }
      
      const audio = audioCache.current.get(priority);
      if (!audio) return;
      
      audio.volume = settings.volumeLevel / 100;
      audio.currentTime = 0;
      
      // Use a promise with better error handling
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Browser may require user interaction first - this is normal
          if (err.name === 'NotAllowedError' || err.name === 'NotSupportedError') {
            // Silent fail - browser policy, not an error
          } else {
            console.warn('No se pudo reproducir el sonido:', err.message);
          }
        });
      }
    } catch (error) {
      // Silent fail for audio issues
    }
  }, [settings.soundEnabled, settings.volumeLevel, isQuietHours]);

  // Mostrar notificación de escritorio
  const showDesktopNotification = useCallback((title: string, body: string, options?: { conversationId?: number }) => {
    if (!settings.desktopEnabled || isQuietHours()) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo-withmia.webp',
        badge: '/logo-withmia.webp',
        tag: options?.conversationId ? `conv-${options.conversationId}` : undefined, // Agrupa por conversación
        renotify: true,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  }, [settings.desktopEnabled, isQuietHours]);

  // Agregar notificación
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!settings.enabled) return;
    
    // 🔇 Verificar si la conversación está silenciada
    const mutedConversations = (window as any).__mutedConversations as Set<number> | undefined;
    if (mutedConversations?.has(notification.conversationId)) {
      console.log(`🔇 Notificación silenciada para conversación ${notification.conversationId}`);
      return; // No mostrar notificación para conversaciones silenciadas
    }

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    // Siempre agregar nueva notificación (sin agrupar)
    // Mantener máximo 50 notificaciones
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);

    // Efectos con prioridad
    playNotificationSound(notification.priority || 'medium');
    showDesktopNotification(
      `Nuevo mensaje de ${notification.contactName}`,
      notification.message,
      { conversationId: notification.conversationId }
    );

    console.log('🔔 Notificación agregada:', newNotification);
  }, [settings.enabled, playNotificationSound, showDesktopNotification]);

  // Marcar como leída
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  // Limpiar todas
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('globalNotifications');
  }, []);

  // Remover notificación por ID
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  // Remover todas las notificaciones de una conversación
  const removeNotificationsByConversation = useCallback((conversationId: number) => {
    setNotifications(prev => {
      const removedUnread = prev.filter(n => n.conversationId === conversationId && !n.read).length;
      if (removedUnread > 0) {
        setUnreadCount(count => Math.max(0, count - removedUnread));
      }
      return prev.filter(n => n.conversationId !== conversationId);
    });
  }, []);

  // Actualizar configuración
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('globalNotificationSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // DEBUG: Log cuando el contexto se monta
  useEffect(() => {
    console.log(' [GLOBAL] GlobalNotificationContext MONTADO y escuchando eventos');
    return () => {
      console.log(' [GLOBAL] GlobalNotificationContext DESMONTADO');
    };
  }, []);



  // Escuchar eventos de limpieza de notificaciones desde otras partes de la app
  useEffect(() => {
    const handleClearNotifications = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId) {
        removeNotificationsByConversation(conversationId);
        console.log(`🗑️ [GLOBAL] Notificaciones removidas por evento para conversación ${conversationId}`);
      }
    };

    window.addEventListener('clearNotifications', handleClearNotifications as EventListener);
    return () => {
      window.removeEventListener('clearNotifications', handleClearNotifications as EventListener);
    };
  }, [removeNotificationsByConversation]);

  // Escuchar eventos de nuevos mensajes desde ConversationsInterface
  // (Evita suscripción WebSocket duplicada)
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const { conversationId, contactName, message, priority, avatar } = event.detail;
      
      if (conversationId) {
        addNotification({
          conversationId,
          contactName: contactName || 'Contacto',
          message: (message || 'Nuevo mensaje').substring(0, 100),
          priority: priority || 'medium',
          avatar: avatar || contactName?.charAt(0)?.toUpperCase() || 'C',
        });
      }
    };

    window.addEventListener('newChatwootMessage', handleNewMessage as EventListener);
    console.log('🔔 [GLOBAL] GlobalNotificationContext escuchando evento newChatwootMessage');
    
    return () => {
      window.removeEventListener('newChatwootMessage', handleNewMessage as EventListener);
    };
  }, [addNotification]);

  // 🌐 SUSCRIPCIÓN WEBSOCKET DIRECTA
  // Esto asegura que recibas notificaciones en TODAS las secciones del dashboard,
  // no solo cuando estás en la sección de Chats.
  // La deduplicación se maneja en addNotification() (groupNotifications)
  useRealtimeConversations({
    inboxId,
    enabled: settings.enabled && inboxId !== null,
    onNewMessage: (event) => {
      // Solo notificar mensajes INCOMING (no los que tú envías)
      const messageType = event?.message?.message_type;
      const isIncoming = messageType === 0 || messageType === 'incoming';
      
      if (!isIncoming) return;

      // 🔒 DEDUPLICACIÓN POR MESSAGE ID
      const messageId = event?.message?.id || event?.id;
      const conversationId = event?.conversation?.id || event?.conversation_id;
      
      if (!conversationId || conversationId <= 0) {
        console.log('⚠️ [GLOBAL-WS] conversation_id inválido, ignorando');
        return;
      }
      
      // Crear clave única para este mensaje
      const messageKey = `${conversationId}-${messageId}`;
      
      if (processedMessageIds.current.has(messageKey)) {
        console.log('🔄 [GLOBAL-WS] Mensaje ya procesado, ignorando:', messageKey);
        return;
      }
      
      // Marcar como procesado
      processedMessageIds.current.add(messageKey);
      
      // Limpiar mensajes antiguos del Set (mantener máximo 100)
      if (processedMessageIds.current.size > 100) {
        const firstItem = processedMessageIds.current.values().next().value;
        processedMessageIds.current.delete(firstItem);
      }
      
      // 🔒 RATE LIMIT POR CONVERSACIÓN
      const now = Date.now();
      const lastTime = lastNotificationPerConversation.current.get(conversationId) || 0;
      
      if (now - lastTime < CONVERSATION_RATE_LIMIT_MS) {
        console.log(`⏱️ [GLOBAL-WS] Rate limit para conversación ${conversationId}, ignorando`);
        return;
      }
      
      lastNotificationPerConversation.current.set(conversationId, now);
      
      // 🚫 FILTRAR MENSAJES DE SISTEMA/CONEXIÓN DE WHATSAPP
      const messageContent = event?.message?.content || event?.content || '';
      const systemMessages = [
        'Connection successfully established',
        'QRCode successfully generated',
        'Instance created',
        'Connecting...',
        'Disconnected',
        '🚀 Connection',
        '⚡ QRCode',
      ];
      
      const isSystemMessage = systemMessages.some(sm => 
        messageContent.toLowerCase().includes(sm.toLowerCase())
      );
      
      if (isSystemMessage) {
        console.log('🔧 [GLOBAL-WS] Mensaje de sistema detectado, ignorando:', messageContent.substring(0, 50));
        return;
      }

      console.log('🔔 [GLOBAL-WS] Nuevo mensaje recibido vía WebSocket:', conversationId);

      // Extraer información del evento
      const contactName = event?.conversation?.meta?.sender?.name || 
                         event?.conversation?.contact?.name ||
                         event?.sender?.name ||
                         'Contacto';

      if (conversationId) {
        addNotification({
          conversationId,
          contactName,
          message: messageContent.substring(0, 100) || 'Nuevo mensaje',
          priority: (event?.conversation?.unread_count || 0) > 3 ? 'high' : 'medium',
          avatar: contactName.charAt(0).toUpperCase(),
        });
      }
    },
    onConversationUpdated: (event) => {
      // Podemos usar esto para actualizar el estado si necesario
      console.log('🔄 [GLOBAL-WS] Conversación actualizada:', event?.conversation?.id || event?.id);
    },
    onConnectionChange: (connected) => {
      console.log(`🔌 [GLOBAL-WS] WebSocket ${connected ? 'conectado' : 'desconectado'}`);
    },
  });

  const value: GlobalNotificationContextType = {
    notifications,
    unreadCount,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    removeNotificationsByConversation,
    updateSettings,
    playNotificationSound,
    showDesktopNotification,
  };

  return (
    <GlobalNotificationContext.Provider value={value}>
      {children}
    </GlobalNotificationContext.Provider>
  );
};
