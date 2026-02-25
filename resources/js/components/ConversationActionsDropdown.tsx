import React, { useState, useRef, useEffect, useMemo } from 'react';
import debugLog from '@/utils/debugLogger';
import { 
  CheckCircle2, 
  Clock, 
  Pause, 
  ChevronDown,
  AlertCircle,
  Loader2 
} from 'lucide-react';
import Portal from './Portal';
import { useTheme } from '../contexts/ThemeContext';

interface ConversationActionsDropdownProps {
  conversationId: number;
  currentStatus: 'open' | 'resolved' | 'pending' | 'snoozed';
  onChangeStatus: (status: string, snoozedUntil?: number) => Promise<void>;
  onOpenPanel?: () => void;
  className?: string;
}

const statusConfig = {
  open: { label: 'Abierta', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  resolved: { label: 'Resuelta', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  pending: { label: 'Pendiente', color: 'bg-blue-100 text-blue-800', icon: Clock },
  snoozed: { label: 'Pospuesta', color: 'bg-purple-100 text-purple-800', icon: Pause }
};

const snoozeOptions = [
  { label: '1 hora', hours: 1 },
  { label: '3 horas', hours: 3 },
  { label: 'Mañana', hours: 24 },
  { label: '1 semana', hours: 168 }
];

const ConversationActionsDropdown: React.FC<ConversationActionsDropdownProps> = ({
  conversationId,
  currentStatus,
  onChangeStatus,
  onOpenPanel,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { hasTheme } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      dropBg: 'var(--theme-content-bg)',
      border: 'var(--theme-content-card-border)',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      hoverBg: 'var(--theme-item-bg)',
      accent: 'var(--theme-accent)',
    };
  }, [hasTheme]);

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSnoozeOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (status: string, snoozedUntil?: number) => {
    setLoading(true);
    try {
      await onChangeStatus(status, snoozedUntil);
      setIsOpen(false);
      setShowSnoozeOptions(false);
    } catch (error) {
      debugLog.error('Error al cambiar estado:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = statusConfig[currentStatus]?.icon || AlertCircle;

  return (
    <div className={`relative ${className}`}>
      {/* Botón principal */}
      <button
        ref={buttonRef}
        onClick={() => {
          const willOpen = !isOpen;
          setIsOpen(willOpen);
          if (willOpen && onOpenPanel) {
            onOpenPanel();
          }
        }}
        disabled={loading}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${statusConfig[currentStatus]?.color || 'bg-gray-100 text-gray-700'} hover:opacity-80`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <StatusIcon className="w-4 h-4" />
        )}
        <span>{statusConfig[currentStatus]?.label || 'Estado'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <Portal>
          <div 
            ref={dropdownRef}
            className={`fixed w-48 rounded-xl shadow-xl border py-2 animate-fade-in ${!t ? 'bg-white border-gray-200' : ''}`}
            style={t ? { top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 99999, backgroundColor: t.dropBg, borderColor: t.border } : { top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 99999 }}
          >
          {/* Resolver */}
          <button
            onClick={() => handleStatusChange('resolved')}
            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors ${!t ? (currentStatus === 'resolved' ? 'bg-green-50 hover:bg-gray-50' : 'hover:bg-gray-50') : ''}`}
            style={t ? { color: t.text } : undefined}
            onMouseEnter={e => t && (e.currentTarget.style.backgroundColor = t.hoverBg)}
            onMouseLeave={e => t && (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Resolver</span>
          </button>

          {/* Marcar como Pendiente */}
          <button
            onClick={() => handleStatusChange('pending')}
            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors ${!t ? (currentStatus === 'pending' ? 'bg-blue-50 hover:bg-gray-50' : 'hover:bg-gray-50') : ''}`}
            style={t ? { color: t.text } : undefined}
            onMouseEnter={e => t && (e.currentTarget.style.backgroundColor = t.hoverBg)}
            onMouseLeave={e => t && (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Marcar como pendiente</span>
          </button>

          {/* Posponer (con submenu) */}
          <div 
            className="relative"
            onMouseEnter={() => setShowSnoozeOptions(true)}
            onMouseLeave={() => setShowSnoozeOptions(false)}
          >
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${!t ? (currentStatus === 'snoozed' ? 'bg-purple-50 hover:bg-gray-50' : 'hover:bg-gray-50') : ''}`}
              style={t ? { color: t.text } : undefined}
              onMouseEnter={e => t && (e.currentTarget.style.backgroundColor = t.hoverBg)}
              onMouseLeave={e => t && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div className="flex items-center space-x-3">
                <Pause className="w-4 h-4 text-purple-600" />
                <span>Posponer</span>
              </div>
              <ChevronDown className={`w-3 h-3 ${!t ? 'text-gray-400' : ''} -rotate-90`} style={t ? { color: t.textSec } : undefined} />
            </button>

            {/* Submenu de opciones de posponer */}
            {showSnoozeOptions && (
              <div className={`absolute left-full top-0 ml-1 w-32 rounded-lg shadow-lg border py-1 z-50 ${!t ? 'bg-white border-gray-200' : ''}`}
                style={t ? { backgroundColor: t.dropBg, borderColor: t.border } : undefined}
              >
                {snoozeOptions.map((option) => (
                  <button
                    key={option.hours}
                    onClick={() => {
                      const snoozedUntil = Math.floor(Date.now() / 1000) + (option.hours * 3600);
                      handleStatusChange('snoozed', snoozedUntil);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${!t ? 'text-gray-700 hover:bg-purple-50' : ''}`}
                    style={t ? { color: t.text } : undefined}
                    onMouseEnter={e => t && (e.currentTarget.style.backgroundColor = t.hoverBg)}
                    onMouseLeave={e => t && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separador */}
          <div className={`border-t my-1 ${!t ? 'border-gray-100' : ''}`} style={t ? { borderColor: t.border } : undefined}></div>

          {/* Reabrir */}
          {currentStatus !== 'open' && (
            <button
              onClick={() => handleStatusChange('open')}
              className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors ${!t ? 'hover:bg-gray-50' : ''}`}
              style={t ? { color: t.text } : undefined}
              onMouseEnter={e => t && (e.currentTarget.style.backgroundColor = t.hoverBg)}
              onMouseLeave={e => t && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span>Reabrir</span>
            </button>
          )}
          </div>
        </Portal>
      )}
    </div>
  );
};

export default ConversationActionsDropdown;
