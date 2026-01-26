import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

export interface NotificationConfig {
  enabled: boolean;
  desktopEnabled: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
  toastEnabled: boolean;
  volumeLevel: number; // 0-100
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
  onlyMyConversations: boolean;
  onlyUrgent: boolean;
  groupNotifications: boolean;
  hideContentInNotifications: boolean;
}

export interface Toast {
  id: number;
  conversationId: number;
  avatar: string;
  name: string;
  message: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  timestamp: Date;
  unread?: boolean;
}

export interface NotificationHistoryItem extends Toast {
  read: boolean;
  conversationId: number;
}

// ============================================================================
// HOOK PRINCIPAL: useNotifications
// ============================================================================

export const useNotifications = () => {
  // Estados
  const [config, setConfig] = useState<NotificationConfig>(() => {
    const saved = localStorage.getItem('notificationConfig');
    return saved ? JSON.parse(saved) : {
      enabled: true,
      desktopEnabled: true,
      soundEnabled: true,
      badgeEnabled: true,
      toastEnabled: true,
      volumeLevel: 70,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      onlyMyConversations: false,
      onlyUrgent: false,
      groupNotifications: true,
      hideContentInNotifications: false
    };
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>(() => {
    const saved = localStorage.getItem('notificationHistory');
    return saved ? JSON.parse(saved).slice(0, 50) : [];
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Refs para sonidos
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const lastNotificationTime = useRef<{ [key: number]: number }>({});
  const groupedNotifications = useRef<{ [key: number]: number }>({});

  // ============================================================================
  // SOLICITAR PERMISOS
  // ============================================================================

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      return 'denied';
    }
  }, []);

  // ============================================================================
  // VERIFICAR QUIET HOURS
  // ============================================================================

  const isQuietHours = useCallback(() => {
    if (!config.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { quietHoursStart, quietHoursEnd } = config;

    // Caso: Quiet hours dentro del mismo día (ej: 22:00 - 23:59)
    if (quietHoursStart < quietHoursEnd) {
      return currentTime >= quietHoursStart && currentTime <= quietHoursEnd;
    }
    // Caso: Quiet hours que cruzan medianoche (ej: 22:00 - 08:00)
    else {
      return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
    }
  }, [config.quietHoursEnabled, config.quietHoursStart, config.quietHoursEnd]);

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  const shouldThrottle = useCallback((conversationId: number): boolean => {
    const now = Date.now();
    const lastTime = lastNotificationTime.current[conversationId] || 0;
    
    // Mínimo 3 segundos entre notificaciones de la misma conversación
    if (now - lastTime < 3000) {
      // Incrementar contador para agrupación
      groupedNotifications.current[conversationId] = 
        (groupedNotifications.current[conversationId] || 1) + 1;
      return true;
    }

    lastNotificationTime.current[conversationId] = now;
    return false;
  }, []);

  // ============================================================================
  // REPRODUCIR SONIDO
  // ============================================================================

  const playSound = useCallback((priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium') => {
    if (!config.soundEnabled || isQuietHours()) return;

    try {
      // Mapeo de prioridad a sonido
      const soundMap = {
        urgent: '/sounds/urgent-notification.mp3',
        high: '/sounds/high-notification.mp3',
        medium: '/sounds/notification-oficial-withmia.mp3',
        low: '/sounds/subtle-notification.mp3'
      };

      const soundUrl = soundMap[priority];
      
      // Crear o reutilizar elemento de audio
      if (!audioRefs.current[priority]) {
        audioRefs.current[priority] = new Audio(soundUrl);
      }

      const audio = audioRefs.current[priority];
      audio.volume = config.volumeLevel / 100;
      audio.currentTime = 0;
      
      // Reproducir con fallback
      audio.play().catch(err => {
        console.warn('No se pudo reproducir el sonido:', err);
        // Fallback: usar sonido del sistema
        if (navigator.vibrate) {
          navigator.vibrate(priority === 'urgent' ? [200, 100, 200] : 200);
        }
      });
    } catch (error) {
      console.error('Error al reproducir sonido:', error);
    }
  }, [config.soundEnabled, config.volumeLevel, isQuietHours]);

  // ============================================================================
  // ACTUALIZAR BADGE (TAB TITLE + FAVICON)
  // ============================================================================

  const updateBadge = useCallback((count: number) => {
    if (!config.badgeEnabled) return;

    // Actualizar título del tab SOLAMENTE
    const baseTitle = 'WITHMIA®';
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;

    // NO modificar el favicon - dejarlo como está configurado en el HTML
    // Esto previene que el logo desaparezca temporalmente
  }, [config.badgeEnabled]);

  // ============================================================================
  // MOSTRAR NOTIFICACIÓN DE ESCRITORIO
  // ============================================================================

  const showDesktopNotification = useCallback((
    message: string,
    conversationName: string,
    conversationId: number,
    priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium',
    avatar?: string,
    onClick?: () => void
  ) => {
    if (!config.desktopEnabled || isQuietHours()) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Verificar agrupación
    const groupedCount = groupedNotifications.current[conversationId] || 0;
    const title = groupedCount > 1 
      ? `${conversationName} (${groupedCount} mensajes nuevos)`
      : conversationName;

    const body = config.hideContentInNotifications 
      ? 'Nuevo mensaje recibido'
      : message.substring(0, 100);

    try {
      const notification = new Notification(title, {
        body,
        icon: (avatar && avatar.startsWith('http')) ? avatar : '/logo-withmia.webp',
        tag: `conversation-${conversationId}`, // Reemplaza notificaciones anteriores
        requireInteraction: priority === 'urgent',
        silent: false,
        vibrate: priority === 'urgent' ? [200, 100, 200] : [200]
      });

      notification.onclick = () => {
        console.log('🖱️ [Desktop Notification] Click detectado para conversación:', conversationId);
        window.focus();
        if (onClick) {
          console.log('🚀 [Desktop Notification] Ejecutando callback onClick');
          onClick();
        } else {
          console.log('⚠️ [Desktop Notification] NO hay callback onClick');
        }
        notification.close();
        // Resetear contador de agrupación
        groupedNotifications.current[conversationId] = 0;
      };

      // Auto-cerrar después de 5 segundos (excepto urgentes)
      if (priority !== 'urgent') {
        setTimeout(() => notification.close(), 5000);
      }
    } catch (error) {
      console.error('Error al mostrar notificación de escritorio:', error);
    }
  }, [config.desktopEnabled, config.hideContentInNotifications, isQuietHours]);

  // ============================================================================
  // MOSTRAR TOAST (IN-APP)
  // ============================================================================

  const showToast = useCallback((
    conversationId: number,
    avatar: string,
    name: string,
    message: string,
    priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'
  ) => {
    if (!config.toastEnabled || isQuietHours()) return;

    const toast: Toast = {
      id: Date.now(),
      conversationId,
      avatar,
      name,
      message: config.hideContentInNotifications ? 'Nuevo mensaje' : message,
      priority,
      timestamp: new Date(),
      unread: true
    };

    setToasts(prev => {
      // Limitar a 5 toasts simultáneos
      const newToasts = [toast, ...prev].slice(0, 5);
      return newToasts;
    });

    // Auto-dismiss después de 5 segundos (8 segundos para urgentes)
    const dismissTime = priority === 'urgent' ? 8000 : 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, dismissTime);
  }, [config.toastEnabled, config.hideContentInNotifications, isQuietHours]);

  // ============================================================================
  // AGREGAR AL HISTORIAL
  // ============================================================================

  const addToHistory = useCallback((
    conversationId: number,
    avatar: string,
    name: string,
    message: string,
    priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium'
  ) => {
    const historyItem: NotificationHistoryItem = {
      id: Date.now(),
      conversationId,
      avatar,
      name,
      message: config.hideContentInNotifications ? 'Mensaje recibido' : message,
      priority,
      timestamp: new Date(),
      read: false
    };

    setNotificationHistory(prev => {
      const newHistory = [historyItem, ...prev].slice(0, 50); // Mantener solo 50
      localStorage.setItem('notificationHistory', JSON.stringify(newHistory));
      return newHistory;
    });

    // Incrementar contador de no leídas
    setUnreadCount(prev => prev + 1);
  }, [config.hideContentInNotifications]);

  // ============================================================================
  // FUNCIÓN PRINCIPAL: NOTIFY
  // ============================================================================

  const notify = useCallback((params: {
    conversationId: number;
    conversationName: string;
    message: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    avatar?: string;
    messageType?: string | number;
    assignedToMe?: boolean;
    onClickNotification?: () => void;
  }) => {
    const {
      conversationId,
      conversationName,
      message,
      priority = 'medium',
      avatar = '',
      assignedToMe = false,
        messageType = 'unknown',
      onClickNotification
    } = params;

    // Verificar si las notificaciones están habilitadas
    if (!config.enabled) return;

    // Verificar filtros
    if (config.onlyMyConversations && !assignedToMe) return;
        
        // Filtrar mensajes salientes
        const isIncoming = messageType === 'incoming' || messageType === 0;
        if (!isIncoming) {
            console.log('🔕 [useNotifications] Mensaje saliente ignorado', { messageType });
            return;
        }
    if (config.onlyUrgent && priority !== 'urgent') return;

    // Rate limiting
    if (shouldThrottle(conversationId)) {
      console.log(`⏱️ Notificación throttled para conversación ${conversationId}`);
      return;
    }

    console.log('🔔 Mostrando notificación:', { conversationName, priority });

    // Reproducir sonido
    playSound(priority);

    // Mostrar notificación de escritorio
    showDesktopNotification(
      message,
      conversationName,
      conversationId,
      priority,
      avatar,
      onClickNotification
    );

    // Mostrar toast in-app
    showToast(conversationId, avatar, conversationName, message, priority);

    // Agregar al historial
    addToHistory(conversationId, avatar, conversationName, message, priority);

    // Actualizar badge
    const newCount = unreadCount + 1;
    updateBadge(newCount);

  }, [
    config,
    shouldThrottle,
    playSound,
    showDesktopNotification,
    showToast,
    addToHistory,
    updateBadge,
    unreadCount
  ]);

  // ============================================================================
  // MARCAR COMO LEÍDA
  // ============================================================================

  const markAsRead = useCallback((notificationId: number) => {
    setNotificationHistory(prev => {
      const updated = prev.map(item => 
        item.id === notificationId ? { ...item, read: true } : item
      );
      localStorage.setItem('notificationHistory', JSON.stringify(updated));
      return updated;
    });

    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotificationHistory(prev => {
      const updated = prev.map(item => ({ ...item, read: true }));
      localStorage.setItem('notificationHistory', JSON.stringify(updated));
      return updated;
    });

    setUnreadCount(0);
    updateBadge(0);
  }, [updateBadge]);

  // ============================================================================
  // DISMISS TOAST
  // ============================================================================

  const dismissToast = useCallback((toastId: number) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  // ============================================================================
  // ACTUALIZAR CONFIGURACIÓN
  // ============================================================================

  const updateConfig = useCallback((newConfig: Partial<NotificationConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('notificationConfig', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  // Verificar permisos al montar
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Actualizar badge cuando cambia unreadCount
  useEffect(() => {
    updateBadge(unreadCount);
  }, [unreadCount, updateBadge]);

  // ============================================================================
  // RETORNO
  // ============================================================================


  // Remover notificación individual
  const removeNotification = useCallback((id: number) => {
    setNotificationHistory(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
    console.log(`🗑️ Notificación ${id} removida`);
  }, []);

  // Remover notificaciones por conversación
  const removeNotificationsByConversation = useCallback((conversationId: number) => {
    setNotificationHistory(prev => {
      const remaining = prev.filter(n => n.conversationId !== conversationId);
      const removedUnread = prev.filter(n => n.conversationId === conversationId && !n.read).length;
      if (removedUnread > 0) {
        setUnreadCount(count => Math.max(0, count - removedUnread));
      }
      return remaining;
    });
    console.log(`🗑️ Notificaciones removidas para conversación ${conversationId}`);
  }, []);
  return {
    // Estado
    config,
    toasts,
    notificationHistory,
    unreadCount,
    permission,
    isQuietHours: isQuietHours(),

    // Métodos
    notify,
    requestPermission,
    dismissToast,
    removeNotificationsByConversation,    markAsRead,
    removeNotification,    markAllAsRead,
    updateConfig,
    playSound
  };
};
