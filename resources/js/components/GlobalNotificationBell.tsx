import React from 'react';
import { Bell } from 'lucide-react';
import { useGlobalNotifications } from '@/contexts/GlobalNotificationContext';

/**
 * Versión simple del botón de notificaciones para usar en el Dashboard
 * Solo muestra el badge, al hacer click abre el panel completo
 */
export const GlobalNotificationBell: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { unreadCount } = useGlobalNotifications();

  return (
    <button
      onClick={onClick}
      className=" relative p-2.5 rounded-lg transition-all duration-50 hover:opacity-95 hover:bg-gray-100\
 title=\Notificaciones\
 >
 <Bell className=\w-5 h-5 text-neutral-500\ />
 {unreadCount > 0 && (
 <div className=\absolute top-2.5 right-2.5 w-4 h-4 bg-gradient-to-r from-rose-400 to-red-500 rounded-full animate-pulse border-2 border-white flex items-center justify-center\>
 <span className=\text-[8px] text-white font-bold\>
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 </div>
 )}
 </button>
 );
};
