import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// ============================================================================
// CONTEXTO GLOBAL DE NOTIFICACIONES (OPTIMIZADO)
// Este contexto maneja notificaciones globales sin duplicar suscripciones WebSocket.
// Las notificaciones se reciben via eventos de ventana desde ConversationsInterface.
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
        audioCache.current.set(priority, audio);
      }
      
      const audio = audioCache.current.get(priority)!;
      audio.volume = settings.volumeLevel / 100;
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.warn('No se pudo reproducir el sonido:', err);
      });
    } catch (error) {
      console.warn('Error al reproducir sonido:', error);
    }
  }, [settings.soundEnabled, settings.volumeLevel, isQuietHours]);

  // Mostrar notificación de escritorio
  const showDesktopNotification = useCallback((title: string, body: string, options?: { conversationId?: number }) => {
    if (!settings.desktopEnabled || isQuietHours()) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icons/logo-withmia.png',
        badge: '/icons/logo-withmia.png',
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

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    // Agrupar notificaciones si está habilitado
    if (settings.groupNotifications) {
      setNotifications(prev => {
        // Buscar notificación existente de la misma conversación
        const existingIndex = prev.findIndex(n => n.conversationId === notification.conversationId && !n.read);
        if (existingIndex !== -1) {
          // Actualizar la existente en lugar de crear una nueva
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            message: notification.message,
            timestamp: new Date(),
          };
          return updated;
        }
        return [newNotification, ...prev].slice(0, 50);
      });
      
      // Solo incrementar contador si es una nueva conversación
      setNotifications(prev => {
        const hasExisting = prev.some(n => n.conversationId === notification.conversationId && n.id !== newNotification.id && !n.read);
        if (!hasExisting) {
          setUnreadCount(count => count + 1);
        }
        return prev;
      });
    } else {
      setNotifications(prev => [newNotification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    }

    // Efectos con prioridad
    playNotificationSound(notification.priority || 'medium');
    showDesktopNotification(
      `Nuevo mensaje de ${notification.contactName}`,
      notification.message,
      { conversationId: notification.conversationId }
    );

    console.log('🔔 Notificación agregada:', newNotification);
  }, [settings.enabled, settings.groupNotifications, playNotificationSound, showDesktopNotification]);

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
