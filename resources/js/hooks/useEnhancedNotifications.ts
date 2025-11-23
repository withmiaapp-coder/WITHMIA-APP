import { useState, useEffect, useCallback, useRef } from 'react';

interface NotificationSettings {
  soundEnabled: boolean;
  desktopEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
  volume: number;
}

interface Notification {
  id: string;
  type: 'message' | 'mention' | 'assignment' | 'status';
  title: string;
  message: string;
  conversationId?: number;
  timestamp: number;
  read: boolean;
  icon?: string;
}

export const useEnhancedNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    desktopEnabled: false,
    vibrationEnabled: true,
    badgeEnabled: true,
    volume: 0.5
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalTitle = useRef<string>('');

  // Inicializar
  useEffect(() => {
    // Guardar título original
    originalTitle.current = document.title;

    // Cargar configuración desde localStorage
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading notification settings:', e);
      }
    }

    // Crear elemento de audio para notificaciones
    audioRef.current = new Audio('/sounds/notification.mp3'); // Asegúrate de tener este archivo
    audioRef.current.volume = settings.volume;

    // Solicitar permiso para notificaciones de escritorio
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup
    return () => {
      document.title = originalTitle.current;
    };
  }, []);

  // Actualizar volumen cuando cambie el setting
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.volume;
    }
  }, [settings.volume]);

  // Actualizar badge en el título
  useEffect(() => {
    if (settings.badgeEnabled && unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle.current}`;
    } else {
      document.title = originalTitle.current;
    }
  }, [unreadCount, settings.badgeEnabled]);

  // Reproducir sonido
  const playSound = useCallback(() => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.warn('No se pudo reproducir el sonido:', err);
      });
    }
  }, [settings.soundEnabled]);

  // Vibración (solo móviles)
  const vibrate = useCallback(() => {
    if (settings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [settings.vibrationEnabled]);

  // Notificación de escritorio
  const showDesktopNotification = useCallback((notification: Notification) => {
    if (!settings.desktopEnabled) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      const desktopNotif = new window.Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/logo-withmia.png',
        badge: '/logo-withmia.png',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      });

      desktopNotif.onclick = () => {
        window.focus();
        if (notification.conversationId) {
          // Aquí puedes agregar lógica para navegar a la conversación
          console.log('Abrir conversación:', notification.conversationId);
        }
        desktopNotif.close();
      };

      // Auto-cerrar después de 5 segundos
      setTimeout(() => desktopNotif.close(), 5000);
    }
  }, [settings.desktopEnabled]);

  // Agregar notificación
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Mantener solo 50 más recientes
    setUnreadCount(prev => prev + 1);

    // Efectos de notificación
    playSound();
    vibrate();
    showDesktopNotification(newNotification);

    return newNotification.id;
  }, [playSound, vibrate, showDesktopNotification]);

  // Marcar como leída
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  }, []);

  // Eliminar notificación
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notif = prev.find(n => n.id === notificationId);
      if (notif && !notif.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // Limpiar todas
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Actualizar configuración
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('notificationSettings', JSON.stringify(updated));
      return updated;
    });

    // Si se habilitan notificaciones de escritorio, solicitar permiso
    if (newSettings.desktopEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Test de notificación
  const testNotification = useCallback(() => {
    addNotification({
      type: 'message',
      title: 'Notificación de Prueba',
      message: 'Esta es una notificación de prueba. ¡Funciona correctamente! ✅',
      icon: '/logo-withmia.png'
    });
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateSettings,
    testNotification
  };
};

export default useEnhancedNotifications;
