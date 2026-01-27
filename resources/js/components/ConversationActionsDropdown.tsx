import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Pause, 
  ChevronDown,
  AlertCircle,
  Loader2 
} from 'lucide-react';

interface ConversationActionsDropdownProps {
  conversationId: number;
  currentStatus: 'open' | 'resolved' | 'pending' | 'snoozed';
  onChangeStatus: (status: string, snoozedUntil?: number) => Promise<void>;
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
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      console.error('Error al cambiar estado:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = statusConfig[currentStatus]?.icon || AlertCircle;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
          {/* Resolver */}
          <button
            onClick={() => handleStatusChange('resolved')}
            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 transition-colors ${currentStatus === 'resolved' ? 'bg-green-50' : ''}`}
          >
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-gray-700">Resolver</span>
          </button>

          {/* Marcar como Pendiente */}
          <button
            onClick={() => handleStatusChange('pending')}
            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 transition-colors ${currentStatus === 'pending' ? 'bg-blue-50' : ''}`}
          >
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Marcar como pendiente</span>
          </button>

          {/* Posponer (con submenu) */}
          <div 
            className="relative"
            onMouseEnter={() => setShowSnoozeOptions(true)}
            onMouseLeave={() => setShowSnoozeOptions(false)}
          >
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${currentStatus === 'snoozed' ? 'bg-purple-50' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <Pause className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">Posponer</span>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400 -rotate-90" />
            </button>

            {/* Submenu de opciones de posponer */}
            {showSnoozeOptions && (
              <div className="absolute left-full top-0 ml-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {snoozeOptions.map((option) => (
                  <button
                    key={option.hours}
                    onClick={() => {
                      const snoozedUntil = Math.floor(Date.now() / 1000) + (option.hours * 3600);
                      handleStatusChange('snoozed', snoozedUntil);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separador */}
          <div className="border-t border-gray-100 my-1"></div>

          {/* Reabrir */}
          {currentStatus !== 'open' && (
            <button
              onClick={() => handleStatusChange('open')}
              className="w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 transition-colors"
            >
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-gray-700">Reabrir</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationActionsDropdown;
