import React, { useState, useRef, useEffect } from 'react';
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
      console.error('Error al asignar agente:', error);
    } finally {
      setLoading(false);
    }
  };

  // Asegurar que agents siempre sea un array
  const safeAgents = Array.isArray(agents) ? agents : [];
  const filteredAgents = safeAgents.filter((agent: Agent) => 
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
            className="fixed w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-fade-in"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 99999 }}
          >
          {/* Barra de búsqueda */}
          <div className="px-3 pb-2">
            <input
              type="text"
              placeholder="Buscar agente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
            />
          </div>

          <div className="border-t border-gray-100"></div>

          {/* Opción para quitar asignación */}
          {currentAssignee && (
            <>
              <button
                onClick={() => handleAssign(null)}
                className="w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-red-50 transition-colors text-red-600"
              >
                <X className="w-4 h-4" />
                <span>Quitar asignación</span>
              </button>
              <div className="border-t border-gray-100 my-1"></div>
            </>
          )}

          {/* Lista de agentes */}
          <div className="max-h-48 overflow-y-auto">
            {agentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No se encontraron agentes
              </div>
            ) : (
              filteredAgents.map((agent: Agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAssign(agent.id)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
                    currentAssignee?.id === agent.id ? 'bg-indigo-50' : ''
                  }`}
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
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getAvailabilityColor(agent.availability_status)}`}></div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{agent.name}</p>
                    <p className="text-xs text-gray-500 truncate">{agent.email}</p>
                  </div>

                  {/* Check si está seleccionado */}
                  {currentAssignee?.id === agent.id && (
                    <Check className="w-4 h-4 text-indigo-600" />
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
