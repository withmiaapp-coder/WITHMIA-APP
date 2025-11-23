import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  X, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Tag, 
  Star,
  MessageSquare,
  ChevronDown,
  Save,
  Trash2
} from 'lucide-react';

interface FilterConfig {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  customDateFrom?: string;
  customDateTo?: string;
  status: ('open' | 'resolved' | 'pending')[];
  priority: ('urgent' | 'high' | 'medium' | 'low')[];
  labels: string[];
  unreadOnly: boolean;
  assignedTo: 'all' | 'me' | 'others' | 'unassigned';
}

interface SavedFilter {
  id: string;
  name: string;
  config: FilterConfig;
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (config: FilterConfig) => void;
  conversations: any[];
  currentUserId?: number;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  conversations,
  currentUserId = 1
}) => {
  const [filters, setFilters] = useState<FilterConfig>({
    dateRange: 'all',
    status: [],
    priority: [],
    labels: [],
    unreadOnly: false,
    assignedTo: 'all'
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    date: true,
    status: true,
    priority: true,
    labels: true,
    other: true
  });

  // Cargar filtros guardados del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedConversationFilters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
  }, []);

  // Extraer todas las etiquetas únicas de las conversaciones
  const availableLabels = React.useMemo(() => {
    const labelsSet = new Set<string>();
    conversations.forEach(conv => {
      if (conv.labels && Array.isArray(conv.labels)) {
        conv.labels.forEach((label: string) => labelsSet.add(label));
      }
    });
    return Array.from(labelsSet).sort();
  }, [conversations]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDateRangeChange = (range: FilterConfig['dateRange']) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const toggleStatus = (status: 'open' | 'resolved' | 'pending') => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const togglePriority = (priority: 'urgent' | 'high' | 'medium' | 'low') => {
    setFilters(prev => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter(p => p !== priority)
        : [...prev.priority, priority]
    }));
  };

  const toggleLabel = (label: string) => {
    setFilters(prev => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter(l => l !== label)
        : [...prev.labels, label]
    }));
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      alert('Por favor ingresa un nombre para el filtro');
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      config: { ...filters }
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('savedConversationFilters', JSON.stringify(updated));
    
    setFilterName('');
    setShowSaveDialog(false);
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    setFilters(filter.config);
  };

  const handleDeleteFilter = (filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem('savedConversationFilters', JSON.stringify(updated));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      dateRange: 'all',
      status: [],
      priority: [],
      labels: [],
      unreadOnly: false,
      assignedTo: 'all'
    });
  };

  const activeFiltersCount = 
    (filters.dateRange !== 'all' ? 1 : 0) +
    filters.status.length +
    filters.priority.length +
    filters.labels.length +
    (filters.unreadOnly ? 1 : 0) +
    (filters.assignedTo !== 'all' ? 1 : 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Filtros Avanzados</h2>
                {activeFiltersCount > 0 && (
                  <p className="text-sm text-gray-600">
                    {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/80 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Panel Izquierdo - Filtros */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            
            {/* Rango de Fechas */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('date')}
                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-gray-900">Rango de Fechas</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.date ? 'rotate-180' : ''}`} />
              </button>
              
              {expandedSections.date && (
                <div className="p-4 space-y-2">
                  {(['all', 'today', 'week', 'month', 'custom'] as const).map((range) => (
                    <label key={range} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="radio"
                        checked={filters.dateRange === range}
                        onChange={() => handleDateRangeChange(range)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-gray-700">
                        {range === 'all' && 'Todas las fechas'}
                        {range === 'today' && 'Hoy'}
                        {range === 'week' && 'Última semana'}
                        {range === 'month' && 'Último mes'}
                        {range === 'custom' && 'Personalizado'}
                      </span>
                    </label>
                  ))}
                  
                  {filters.dateRange === 'custom' && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                        <input
                          type="date"
                          value={filters.customDateFrom || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, customDateFrom: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                        <input
                          type="date"
                          value={filters.customDateTo || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, customDateTo: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Estado */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('status')}
                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-gray-900">Estado</span>
                  {filters.status.length > 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {filters.status.length}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.status ? 'rotate-180' : ''}`} />
              </button>
              
              {expandedSections.status && (
                <div className="p-4 space-y-2">
                  {(['open', 'resolved', 'pending'] as const).map((status) => (
                    <label key={status} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => toggleStatus(status)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-gray-700">
                        {status === 'open' && 'Abiertas'}
                        {status === 'resolved' && 'Resueltas'}
                        {status === 'pending' && 'Pendientes'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Prioridad */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('priority')}
                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-gray-900">Prioridad</span>
                  {filters.priority.length > 0 && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      {filters.priority.length}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.priority ? 'rotate-180' : ''}`} />
              </button>
              
              {expandedSections.priority && (
                <div className="p-4 space-y-2">
                  {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => (
                    <label key={priority} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(priority)}
                        onChange={() => togglePriority(priority)}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span className="text-gray-700">
                        {priority === 'urgent' && 'Urgente'}
                        {priority === 'high' && 'Alta'}
                        {priority === 'medium' && 'Media'}
                        {priority === 'low' && 'Baja'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Etiquetas */}
            {availableLabels.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('labels')}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Tag className="w-5 h-5 text-purple-500" />
                    <span className="font-semibold text-gray-900">Etiquetas</span>
                    {filters.labels.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        {filters.labels.length}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.labels ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedSections.labels && (
                  <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                    {availableLabels.map((label) => (
                      <label key={label} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={filters.labels.includes(label)}
                          onChange={() => toggleLabel(label)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-gray-700">#{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Otros Filtros */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('other')}
                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-gray-900">Otros</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.other ? 'rotate-180' : ''}`} />
              </button>
              
              {expandedSections.other && (
                <div className="p-4 space-y-3">
                  <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.unreadOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, unreadOnly: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700">Solo no leídas</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asignación</label>
                    <select
                      value={filters.assignedTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Todas</option>
                      <option value="me">Asignadas a mí</option>
                      <option value="others">Asignadas a otros</option>
                      <option value="unassigned">Sin asignar</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Derecho - Filtros Guardados */}
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  Filtros Guardados
                </h3>
              </div>

              {savedFilters.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay filtros guardados
                </p>
              ) : (
                <div className="space-y-2">
                  {savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className="p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <button
                          onClick={() => handleLoadFilter(filter)}
                          className="flex-1 text-left font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                        >
                          {filter.name}
                        </button>
                        <button
                          onClick={() => handleDeleteFilter(filter.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        {filter.config.status.length > 0 && (
                          <div>• {filter.config.status.length} estado(s)</div>
                        )}
                        {filter.config.priority.length > 0 && (
                          <div>• {filter.config.priority.length} prioridad(es)</div>
                        )}
                        {filter.config.labels.length > 0 && (
                          <div>• {filter.config.labels.length} etiqueta(s)</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Filtro Actual</span>
            </button>

            {showSaveDialog && (
              <div className="p-3 bg-white border border-indigo-200 rounded-lg">
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Nombre del filtro..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveFilter()}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveFilter}
                    className="flex-1 px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setFilterName('');
                    }}
                    className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Limpiar Todo
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;
