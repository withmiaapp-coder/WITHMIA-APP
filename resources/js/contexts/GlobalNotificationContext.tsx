import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';

// ============================================================================
// CONTEXTO GLOBAL DE NOTIFICACIONES
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
  removeNotificationsByConversation: (conversationId: number) => void;  showDesktopNotification: (title: string, body: string) => void;
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
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalTitle = useRef<string>('');

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

  // Reproducir sonido
  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/notification.mp3');
        audioRef.current.volume = settings.volumeLevel / 100;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.warn('No se pudo reproducir el sonido:', err);
      });
    } catch (error) {
      console.warn('Error al reproducir sonido:', error);
    }
  }, [settings.soundEnabled, settings.volumeLevel]);

  // Mostrar notificación de escritorio
  const showDesktopNotification = useCallback((title: string, body: string) => {
    if (!settings.desktopEnabled) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo-withmia.png',
        badge: '/logo-withmia.png',
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  }, [settings.desktopEnabled]);

  // Agregar notificación
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!settings.enabled) return;

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);

    // Efectos
    playNotificationSound();
    showDesktopNotification(
      `Nuevo mensaje de ${notification.contactName}`,
      notification.message
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
  // Escuchar eventos de tiempo real
  useRealtimeConversations({
    inboxId,
    enabled: settings.enabled && inboxId !== null,
    onNewMessage: (event) => {
      console.log('🔔 [GLOBAL] Nuevo mensaje recibido:', event);

      // Extraer información del evento
      const contactName = event.conversation?.meta?.sender?.name || 
                         event.conversation?.contact?.name || 
                         'Contacto desconocido';
      const messageContent = event.message?.content || event.content || 'Nuevo mensaje';
      const conversationId = event.conversation?.id || event.conversation_id;

      if (conversationId) {
        addNotification({
          conversationId,
          contactName,
          message: messageContent.substring(0, 100),
          priority: event.conversation?.priority || 'medium',
          avatar: contactName.charAt(0).toUpperCase(),
        });
      }
    },
    onConversationUpdated: (event) => {
      console.log('🔄 [GLOBAL] Conversación actualizada:', event);
    },
    onConnectionChange: (connected) => {
      console.log(`🔌 [GLOBAL] WebSocket ${connected ? 'conectado' : 'desconectado'}`);
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
    removeNotificationsByConversation,    updateSettings,
    playNotificationSound,
    showDesktopNotification,
  };

  return (
    <GlobalNotificationContext.Provider value={value}>
      {children}
    </GlobalNotificationContext.Provider>
  );
};
