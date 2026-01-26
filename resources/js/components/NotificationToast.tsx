import React from 'react';
import { X, AlertTriangle, MessageCircle } from 'lucide-react';

interface Toast {
  id: number;
  conversationId: number;
  avatar: string;
  name: string;
  message: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  timestamp: Date;
}

interface NotificationToastProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  onClickToast?: (conversationId: number) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ 
  toasts, 
  onDismiss,
  onClickToast 
}) => {
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-red-500 bg-red-50/95';
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50/95';
      case 'medium':
        return 'border-l-4 border-blue-500 bg-blue-50/95';
      case 'low':
        return 'border-l-4 border-gray-500 bg-gray-50/95';
      default:
        return 'border-l-4 border-blue-500 bg-blue-50/95';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
    return <MessageCircle className="w-5 h-5 text-blue-600" />;
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {(toasts || []).map((toast) => (
        <div
          key={toast.id}
          className={`
            ${getPriorityStyles(toast.priority)}
            pointer-events-auto
            w-96 max-w-full
            backdrop-blur-xl
            rounded-lg shadow-2xl
            transform transition-all duration-300 ease-out
            animate-slide-in-right
            hover:scale-105 hover:shadow-3xl
            cursor-pointer
          `}
          onClick={() => {
            if (onClickToast) {
              onClickToast(toast.conversationId);
            }
          }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Avatar o Icono */}
              <div className="flex-shrink-0">
                {toast.avatar ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {toast.avatar}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    {getPriorityIcon(toast.priority)}
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {toast.name}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(toast.id);
                    }}
                    className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-700 line-clamp-2">
                  {toast.message}
                </p>

                {/* Timestamp */}
                <p className="text-xs text-gray-500 mt-1">
                  Justo ahora
                </p>
              </div>
            </div>

            {/* Indicador de prioridad */}
            {(toast.priority === 'urgent' || toast.priority === 'high') && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    {toast.priority === 'urgent' ? 'Urgente' : 'Prioridad Alta'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Barra de progreso (auto-dismiss) */}
          <div className="h-1 bg-gray-200 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 animate-progress"
              style={{
                animation: `progress ${toast.priority === 'urgent' ? '8s' : '5s'} linear forwards`
              }}
            />
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }

        .animate-progress {
          animation: progress 5s linear forwards;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;
