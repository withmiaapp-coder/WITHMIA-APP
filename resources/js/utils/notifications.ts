// ============================================================================
// UTILIDAD: Sistema de notificaciones
// ============================================================================

export class NotificationService {
  private static hasPermission = false;
  private static notificationSound: HTMLAudioElement | null = null;

  // Solicitar permisos de notificación
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  // Mostrar notificación de escritorio
  static showNotification(
    title: string,
    options?: {
      body?: string;
      icon?: string;
      tag?: string;
      onClick?: () => void;
    }
  ): void {
    if (!this.hasPermission || Notification.permission !== 'granted') {
      console.log('Sin permisos de notificación');
      return;
    }

    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/logo-withmia.png',
      tag: options?.tag || 'chatwoot-notification',
      requireInteraction: false,
      silent: false,
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    // Auto-cerrar después de 5 segundos
    setTimeout(() => notification.close(), 5000);
  }

  // Reproducir sonido de notificación
  static playNotificationSound(): void {
    try {
      if (!this.notificationSound) {
        // Crear audio inline con data URI (sonido simple)
        this.notificationSound = new Audio(
          'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjOM1fPTgjMGHm7A7+OZSA0PVanp8LFYGAo+kunzu3IdBzGJ0fPQgTQGHWi/7+OYSAwMUqTn77RaGQo6jOvywnogBTKH0PPPeiwEH2fA7+OYRwwLT6Lm7rdbGQo4i+ryxmwhBTWD0fLPeioEHGS/7eSXRgwKT6Dj7rFYFwo3i+vwxmweBzB9zvHMdycEG2G87uKWRgwLUJ7j77JWFgo3iujwxmwdBzB8zfHLeScDHGC97OOVRQsMUJzi7bJVFgo2iOjvxmwbBy98zvDKeScDG1687uKURAoNUZvi7bJVFgo2h+fvxmwaBzB7zO/JeCcDGl+87eKURAoNUpri7bNUFgo2hefvxmwZBjB8y+/JeCcDGl687eGTRAoNUpni7rNUFgo2hOfvx2sZBzF8yu/KdycCGl687eGTRAoNUpfi7rNUFgo2hObuxmsZBzF7ye/KdycCGl287eKTRAoNUpfi7rNTFgo2g+buxmoYBzF7yO/KdycCGl+87eKTRAoNUpfi7rNTFgo2g+buxWoYBzF7ye/KdycCGl687eOSRAoMU5bh77RUFQk4g+buxWoYBzF7yO7KdycCGl687eOSRAoMU5bh77NTFQk4g+buxmsYBzF8yO7LeicCGl+87uOSQwkNU5bh8LJUFQk4g+buxmsYBzF8yO7LeScCGl+87uSRQwoOU5bh8LJTFAk4guXuxmsYBzF8ye7LeScBGl+87uOSQwoOU5bh77NTFAk4guXuxmsYBzF8ye7LeicBGl+87uOSQwoOU5bh8LJTFAk4guXuxmsYBzF8ye7Ldy='
        );
        this.notificationSound.volume = 0.5;
      }

      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(err => {
        console.warn('Error reproduciendo sonido:', err);
      });
    } catch (error) {
      console.warn('Error al crear audio:', error);
    }
  }

  // Notificar nuevo mensaje
  static notifyNewMessage(contactName: string, messagePreview: string): void {
    this.showNotification(`Nuevo mensaje de ${contactName}`, {
      body: messagePreview,
      tag: 'new-message',
    });
    this.playNotificationSound();
  }

  // Notificar conversación actualizada
  static notifyConversationUpdate(contactName: string, status: string): void {
    this.showNotification(`Conversación actualizada: ${contactName}`, {
      body: `Estado: ${status}`,
      tag: 'conversation-update',
    });
  }
}
