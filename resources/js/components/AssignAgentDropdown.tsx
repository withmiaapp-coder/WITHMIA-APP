import React, { useState, useRef, useEffect, useMemo } from 'react';
import debugLog from '@/utils/debugLogger';
import { 
  UserPlus, 
  User, 
  ChevronDown,
  Check,
  Loader2,
  X 
} from 'lucide-react';
import { useAgents } from '../hooks/useChatwoot';
import Portal from './Portal';
import { useTheme } from '../contexts/ThemeContext';

interface Agent {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  availability_status?: 'online' | 'offline' | 'busy';
}

interface AssignAgentDropdownProps {
  conversationId: number;
  currentAssignee?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  onAssign: (agentId: number | null) => Promise<void>;
  onOpenPanel?: () => void;
  className?: string;
}

const AssignAgentDropdown: React.FC<AssignAgentDropdownProps> = ({
  conversationId,
  currentAssignee,
  onAssign,
  onOpenPanel,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
      textMuted: 'var(--theme-text-muted)',
      hoverBg: 'var(--theme-item-bg)',
      inputBg: 'var(--theme-input-bg)',
      accent: 'var(--theme-accent)',
    };
  }, [hasTheme]);

  const { agents, loading: agentsLoading, fetchAgents } = useAgents();

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

  // Cargar agentes al abrir
  useEffect(() => {
    if (isOpen && agents.length === 0) {
      fetchAgents();
    }
  }, [isOpen, agents.length, fetchAgents]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAssign = async (agentId: number | null) => {
    setLoading(true);
    try {
      await onAssign(agentId);
      setIsOpen(false);
      setSearchTerm('');
    } catch (error) {
      debugLog.error('Error al asignar agente:', error);
    } finally {
      setLoading(false);
    }
  };

  // Asegurar que agents siempre sea un array
  const safeAgents = Array.isArray(agents) ? agents : [];
  const filteredAgents = safeAgents.filter((agent) => 
    (agent?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) ||
    (agent?.email?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false)
  );

  const getAvailabilityColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'busy': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  };

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
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 
          ${currentAssignee 
            ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : currentAssignee ? (
          <User className="w-4 h-4" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        <span className="max-w-24 truncate">
          {currentAssignee?.name || 'Sin asignar'}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <Portal>
          <div 
            ref={dropdownRef}
            className={`fixed w-64 rounded-xl shadow-xl border py-2 animate-fade-in ${!t ? 'bg-white border-gray-200' : ''}`}
            style={t ? { top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 99999, backgroundColor: t.dropBg, borderColor: t.border } : { top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 99999 }}
          >
          {/* Barra de búsqueda */}
          <div className="px-3 pb-2">
            <input
              type="text"
              placeholder="Buscar agente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg placeholder:text-gray-500 ${!t ? 'text-gray-900 border-gray-200 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400' : ''}`}
              style={t ? { backgroundColor: t.inputBg, borderColor: t.border, color: t.text } : undefined}
            />
          </div>

          <div className={`border-t ${!t ? 'border-gray-100' : ''}`} style={t ? { borderColor: t.border } : undefined}></div>

          {/* Opción para quitar asignación */}
          {currentAssignee && (
            <>
              <button
                onClick={() => handleAssign(null)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors text-red-600 ${!t ? 'hover:bg-red-50' : ''}`}
                onMouseEnter={e => t && (e.currentTarget.style.backgroundColor = t.hoverBg)}
                onMouseLeave={e => t && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X className="w-4 h-4" />
                <span>Quitar asignación</span>
              </button>
              <div className={`border-t my-1 ${!t ? 'border-gray-100' : ''}`} style={t ? { borderColor: t.border } : undefined}></div>
            </>
          )}

          {/* Lista de agentes */}
          <div className="max-h-48 overflow-y-auto">
            {agentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className={`px-4 py-3 text-sm text-center ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                No se encontraron agentes
              </div>
            ) : (
              filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAssign(agent.id)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors ${!t ? (currentAssignee?.id === agent.id ? 'bg-indigo-50 hover:bg-gray-50' : 'hover:bg-gray-50') : ''}`}
                  onMouseEnter={e => t && (e.currentTarget.style.backgroundColor = t.hoverBg)}
                  onMouseLeave={e => t && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Avatar */}
                  <div className="relative">
                    {agent.avatar_url ? (
                      <img 
                        src={agent.avatar_url} 
                        alt={agent.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${!t ? 'border-white' : ''} ${getAvailabilityColor(agent.availability_status)}`} style={t ? { borderColor: t.dropBg } : undefined}></div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>{agent.name}</p>
                    <p className={`text-xs truncate ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{agent.email}</p>
                  </div>

                  {/* Check si está seleccionado */}
                  {currentAssignee?.id === agent.id && (
                    <Check className="w-4 h-4" style={t ? { color: t.accent } : undefined} />
                  )}
                </button>
              ))
            )}
          </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default AssignAgentDropdown;
