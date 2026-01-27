import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Coffee,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UserMenuDropdownProps {
  user: {
    firstName: string;
    email: string;
    plan?: string;
    logo_url?: string;
    company?: string;
  };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateToSettings?: (page?: string) => void;
  onNavigateToProfile?: (page?: string) => void;
}

interface MenuItem {
  icon: React.ComponentType<any>;
  label: string;
  onClick: (() => void) | null;
  className: string;
  isEmail?: boolean;
  isDisabled?: boolean;
  hasSubmenu?: boolean;
  isDanger?: boolean;
  type?: 'divider';
}

// ============================================================================
// COMPONENTE: UserMenuDropdown - OPTIMIZADO
// ============================================================================

const UserMenuDropdown = React.memo<UserMenuDropdownProps>(({
  user,
  isCollapsed,
  onToggleCollapse,
  onNavigateToSettings,
  onNavigateToProfile
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { role, isAdmin } = usePermissions();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Obtener label del rol
  const getRoleLabel = () => {
    if (isAdmin || role === 'admin') return 'Administrador';
    if (role === 'agent') return 'Agente';
    return 'Usuario';
  };

  // Items del menú
  const menuItems: MenuItem[] = [
    {
      icon: Mail,
      label: user.email,
      onClick: null,
      className: 'text-neutral-500 cursor-default hover:bg-transparent pointer-events-none',
      isEmail: true
    },
    {
      icon: Coffee,
      label: 'Perfil',
      onClick: () => {
        if (onNavigateToProfile) {
          onNavigateToProfile('profile');
          setIsOpen(false);
        }
      },
      className: 'text-neutral-700 hover:bg-neutral-50'
    },
    {
      icon: Settings,
      label: 'Configuración',
      onClick: () => {
        if (onNavigateToSettings) {
          onNavigateToSettings('notifications');
          setIsOpen(false);
        }
      },
      className: 'text-neutral-700 hover:bg-neutral-50'
    },
    {
      type: 'divider',
      icon: Mail,
      label: '',
      onClick: null,
      className: ''
    },
    {
      icon: ChevronRight,
      label: 'Cerrar sesión',
      onClick: () => {
        window.location.href = '/logout';
      },
      className: 'text-red-600 hover:bg-red-50',
      isDanger: true
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-[100]"
          style={{
            minWidth: isCollapsed ? '320px' : 'auto',
            animation: 'slideUpMenu 0.2s ease-out'
          }}
        >
          <div className="py-2">
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={`divider-${index}`} className="h-px bg-neutral-200 my-2 mx-3" />;
              }

              const Icon = item.icon;
              const isDisabled = item.isDisabled || item.onClick === null;

              return (
                <button
                  key={index}
                  onClick={item.onClick || undefined}
                  disabled={isDisabled}
                  className={`
                    w-full px-4 py-3 flex items-center gap-3 transition-all duration-200 text-left
                    ${item.className}
                    ${isDisabled ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl
          hover:bg-neutral-100 transition-all duration-200
          border border-transparent hover:border-neutral-200
          ${isCollapsed ? 'justify-center' : ''}
        `}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {user.firstName?.[0]?.toUpperCase() || 'U'}
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-sm font-semibold text-neutral-800 truncate">
              {user.firstName || 'Usuario'}
            </p>
            <p className="text-neutral-600 font-semibold" style={{ fontSize: '11px' }}>
              {getRoleLabel()}
            </p>
          </div>
        )}

        {/* Chevron */}
        {!isCollapsed && (
          <ChevronRight 
            className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        )}
      </button>
    </div>
  );
});

UserMenuDropdown.displayName = 'UserMenuDropdown';

export default UserMenuDropdown;
