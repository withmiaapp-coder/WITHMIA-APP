import React, { useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useGlobalNotifications } from '@/contexts/GlobalNotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from '@inertiajs/react';

export const NotificationBell: React.FC = () => {
  const globalNotifications = useGlobalNotifications();
  const { hasTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Si no hay contexto de notificaciones, no renderizar nada o mostrar solo el ícono
  if (!globalNotifications) {
    return (
      <button
        className="relative p-2 rounded-lg transition-colors opacity-50 cursor-not-allowed"
        style={{
          color: hasTheme
            ? isDark ? 'var(--theme-text-secondary)' : 'var(--theme-icon-inactive)'
            : '#9ca3af',
        }}
        aria-label="Notificaciones no disponibles"
        title="Sistema de notificaciones no disponible"
      >
        <Bell className="w-5 h-5" />
      </button>
    );
  }

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    clearBadge,
  } = globalNotifications;

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Justo ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return new Date(date).toLocaleDateString('es-ES');
  };

  const handleNotificationClick = (conversationId: number, notificationId: number | string, read: boolean) => {
    // ✅ Limpiar TODO para esta conversación: badges + notificaciones + toasts
    if (clearBadge) {
      clearBadge(conversationId);
    }
    
    setIsOpen(false);
    
    // Navegar a la conversación sin recargar
    window.dispatchEvent(new CustomEvent('navigateToConversation', {
      detail: { conversationId }
    }));
  };

  // Dark-aware panel colors
  const panelBg = isDark ? '#1a1f2e' : 'white';
  const panelBorder = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const headerBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(249,250,251,0.8)';
  const headerBorder = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6';
  const headerText = isDark ? '#f1f5f9' : '#1f2937';
  const headerIconColor = isDark ? '#94a3b8' : '#4b5563';
  const closeBtnHover = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(229,231,235,0.6)';
  const actionBg1 = isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff';
  const actionText1 = isDark ? '#60a5fa' : '#2563eb';
  const actionBg2 = isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2';
  const actionText2 = isDark ? '#f87171' : '#dc2626';
  const itemHover = isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb';
  const unreadBg = isDark ? 'rgba(59,130,246,0.06)' : 'rgba(219,234,254,0.3)';
  const nameColor = isDark ? '#f1f5f9' : '#111827';
  const nameReadColor = isDark ? '#94a3b8' : '#4b5563';
  const messageColor = isDark ? '#94a3b8' : '#4b5563';
  const timestampColor = isDark ? '#64748b' : '#6b7280';
  const dividerColor = isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6';
  const footerBg = isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb';
  const footerBorder = isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';
  const footerText = isDark ? '#64748b' : '#6b7280';
  const emptyColor = isDark ? '#64748b' : '#9ca3af';

  return (
    <div className="relative">
      {/* Botón de campana — themed */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-all duration-150"
        style={{
          color: hasTheme
            ? isDark ? 'var(--theme-text-secondary)' : 'var(--theme-icon-inactive)'
            : '#9ca3af',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hasTheme
            ? isDark ? 'rgba(255,255,255,0.08)' : 'var(--theme-sidebar-hover)'
            : '#f3f4f6';
          e.currentTarget.style.color = hasTheme
            ? isDark ? '#f1f5f9' : 'var(--theme-primary)'
            : '#4b5563';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '';
          e.currentTarget.style.color = hasTheme
            ? isDark ? 'var(--theme-text-secondary)' : 'var(--theme-icon-inactive)'
            : '#9ca3af';
        }}
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel — anchored to button */}
          <div
            className="absolute right-0 top-full mt-2 w-96 max-h-[80vh] rounded-xl shadow-2xl z-50 flex flex-col animate-slide-down"
            style={{
              background: panelBg,
              border: `1px solid ${panelBorder}`,
              boxShadow: isDark
                ? '0 20px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 20px 60px -12px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div className="p-4" style={{ borderBottom: `1px solid ${headerBorder}`, background: headerBg }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5" style={{ color: headerIconColor }} />
                  <h3 className="font-semibold text-base" style={{ color: headerText }}>Notificaciones</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: headerIconColor }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = closeBtnHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Acciones rápidas */}
            {notifications.length > 0 && (
              <div className="p-3 flex gap-2" style={{ borderBottom: `1px solid ${headerBorder}` }}>
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: actionBg1, color: actionText1 }}
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: actionBg2, color: actionText2 }}
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar todas
                </button>
              </div>
            )}

            {/* Lista de notificaciones */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40" style={{ color: emptyColor }}>
                  <Bell className="w-12 h-12 mb-2" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className="p-4 transition-colors cursor-pointer"
                      style={{
                        background: !notification.read ? unreadBg : 'transparent',
                        borderBottom: index < notifications.length - 1 ? `1px solid ${dividerColor}` : 'none',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = !notification.read ? unreadBg : itemHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = !notification.read ? unreadBg : 'transparent'; }}
                      onClick={() => handleNotificationClick(notification.conversationId, notification.id, notification.read)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold relative">
                            {notification.avatar || notification.name.charAt(0)}
                            {!notification.read && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" style={{ border: `2px solid ${panelBg}` }} />
                            )}
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold truncate" style={{ color: !notification.read ? nameColor : nameReadColor }}>
                              {notification.name}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!notification.read) {
                                  markAsRead(notification.id);
                                }
                              }}
                              className="flex-shrink-0 ml-2 transition-colors"
                              style={{ color: isDark ? '#64748b' : '#9ca3af' }}
                              title="Marcar como leída"
                            >
                              {notification.read ? (
                                <CheckCheck className="w-4 h-4" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-sm line-clamp-2 mb-2" style={{ color: messageColor }}>
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: timestampColor }}>
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 text-center" style={{ borderTop: `1px solid ${footerBorder}`, background: footerBg }}>
              <p className="text-xs" style={{ color: footerText }}>
                Mostrando {notifications.length} notificaciones
              </p>
            </div>
          </div>

          <style>{`
            @keyframes slide-down {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .animate-slide-down {
              animation: slide-down 0.2s ease-out;
            }

            .line-clamp-2 {
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          `}</style>
        </>
      )}
    </div>
  );
};
