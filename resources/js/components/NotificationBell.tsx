import React, { useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useGlobalNotifications } from '@/contexts/GlobalNotificationContext';
import { router } from '@inertiajs/react';

export const NotificationBell: React.FC = () => {
  const globalNotifications = useGlobalNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // Si no hay contexto de notificaciones, no renderizar nada o mostrar solo el ícono
  if (!globalNotifications) {
    return (
      <button
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors opacity-50 cursor-not-allowed"
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

  const handleNotificationClick = (conversationId: number, notificationId: string, read: boolean) => {
    if (!read) {
      markAsRead(notificationId);
    }
    setIsOpen(false);
    
    // Verificar la ruta actual
    const currentPath = window.location.pathname;
    const isInConversations = currentPath === '/dashboard' || 
                              currentPath.match(/^\/dashboard\/?$/) ||
                              currentPath.includes('/dashboard?');
    
    // Emitir evento para que ConversationsInterface seleccione la conversación
    window.dispatchEvent(new CustomEvent('selectConversation', {
      detail: { conversationId }
    }));
    
    // Si estamos exactamente en /dashboard (conversaciones), solo actualizar URL
    if (isInConversations) {
      window.history.pushState({}, '', `/dashboard?conversation=${conversationId}`);
    } else {
      // Si estamos en otra sección del dashboard o fuera, navegar a conversaciones
      router.visit(`/dashboard?conversation=${conversationId}`, {
        preserveState: false,
        preserveScroll: false,
      });
    }
  };

  return (
    <>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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

          {/* Panel */}
          <div className="fixed top-14 right-4 w-96 max-h-[80vh] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col animate-slide-down">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-base">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 p-1.5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Acciones rápidas */}
            {notifications.length > 0 && (
              <div className="p-3 border-b border-gray-200 flex gap-2">
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar todas
                </button>
              </div>
            )}

            {/* Lista de notificaciones */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Bell className="w-12 h-12 mb-2" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-50/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification.conversationId, notification.id, notification.read)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold relative">
                            {notification.avatar || notification.contactName.charAt(0)}
                            {!notification.read && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-semibold truncate ${
                              !notification.read ? 'text-gray-900' : 'text-gray-600'
                            }`}>
                              {notification.contactName}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!notification.read) {
                                  markAsRead(notification.id);
                                }
                              }}
                              className="flex-shrink-0 ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Marcar como leída"
                            >
                              {notification.read ? (
                                <CheckCheck className="w-4 h-4" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
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
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
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
    </>
  );
};
