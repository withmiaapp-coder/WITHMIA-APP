import React, { useState, useEffect, useMemo } from 'react';
import debugLog from '@/utils/debugLogger';
import { useTheme } from '@/contexts/ThemeContext';
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

export interface FilterConfig {
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
  conversations: { labels?: string[]; [key: string]: unknown }[];
  currentUserId?: number;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  conversations,
  currentUserId = 1
}) => {
  const { hasTheme, isDark } = useTheme();
  const th = useMemo(() => {
    if (!hasTheme) return null;
    return {
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      textPrimary: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      cardBg: 'var(--theme-content-card-bg)',
      panelBg: 'var(--theme-content-bg)',
      sidePanelBg: 'var(--theme-content-card-bg)',
      border: 'var(--theme-content-card-border)',
      borderSubtle: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      inputBorder: isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db',
      hoverBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      subtleBg: isDark ? 'var(--theme-accent-light)' : '#f3f4f6',
      badgeBg: isDark ? 'rgba(255,255,255,0.08)' : 'var(--theme-accent-light)',
      badgeText: isDark ? 'var(--theme-text-secondary)' : 'var(--theme-accent)',
    };
  }, [hasTheme, isDark]);

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
        debugLog.error('Error loading saved filters:', e);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${!th ? 'bg-white' : ''}`}
        style={th ? { background: th.panelBg, border: `1px solid ${th.border}` } : undefined}
      >
        {/* Header */}
        <div
          className={`p-4 border-b ${!th ? 'border-gray-300 bg-white' : ''}`}
          style={th ? { borderColor: th.border, background: th.panelBg } : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-lg ${!th ? 'bg-gray-900' : ''}`}
                style={th ? { background: th.accent } : undefined}
              >
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2
                  className={`text-xl font-bold ${!th ? 'text-gray-900' : ''}`}
                  style={th ? { color: th.textPrimary } : undefined}
                >Filtros Avanzados</h2>
                {activeFiltersCount > 0 && (
                  <p
                    className={`text-sm ${!th ? 'text-gray-600' : ''}`}
                    style={th ? { color: th.textSec } : undefined}
                  >
                    {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${!th ? 'hover:bg-gray-100' : ''}`}
              style={th ? { color: th.textMuted } : undefined}
            >
              <X className={`w-5 h-5 ${!th ? 'text-gray-500' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(85vh-140px)]">
          {/* Panel Izquierdo - Filtros */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            
            {/* Rango de Fechas */}
            <div
              className={`rounded-xl overflow-hidden ${!th ? 'border border-gray-200' : ''}`}
              style={th ? { border: `1px solid ${th.border}` } : undefined}
            >
              <button
                onClick={() => toggleSection('date')}
                className={`w-full p-4 flex items-center justify-between transition-colors ${!th ? 'bg-gray-50 hover:bg-gray-100' : ''}`}
                style={th ? { background: th.subtleBg } : undefined}
              >
                <div className="flex items-center space-x-3">
                  <Calendar
                    className={`w-5 h-5 ${!th ? 'text-gray-600' : ''}`}
                    style={th ? { color: th.textSec } : undefined}
                  />
                  <span
                    className={`font-semibold ${!th ? 'text-gray-900' : ''}`}
                    style={th ? { color: th.textPrimary } : undefined}
                  >Rango de Fechas</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${expandedSections.date ? 'rotate-180' : ''} ${!th ? 'text-gray-400' : ''}`}
                  style={th ? { color: th.textMuted } : undefined}
                />
              </button>
              
              {expandedSections.date && (
                <div className="p-4 space-y-2">
                  {(['all', 'today', 'week', 'month', 'custom'] as const).map((range) => (
                    <label
                      key={range}
                      className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${!th ? 'hover:bg-gray-50' : ''}`}
                    >
                      <input
                        type="radio"
                        checked={filters.dateRange === range}
                        onChange={() => handleDateRangeChange(range)}
                        className="w-4 h-4"
                        style={th ? { accentColor: th.accent } : undefined}
                      />
                      <span
                        className={!th ? 'text-gray-700' : ''}
                        style={th ? { color: th.textSec } : undefined}
                      >
                        {range === 'all' && 'Todas las fechas'}
                        {range === 'today' && 'Hoy'}
                        {range === 'week' && 'Última semana'}
                        {range === 'month' && 'Último mes'}
                        {range === 'custom' && 'Personalizado'}
                      </span>
                    </label>
                  ))}
                  
                  {filters.dateRange === 'custom' && (
                    <div
                      className={`mt-3 p-3 rounded-lg space-y-2 ${!th ? 'bg-gray-50' : ''}`}
                      style={th ? { background: th.subtleBg } : undefined}
                    >
                      <div>
                        <label
                          className={`block text-sm font-medium mb-1 ${!th ? 'text-gray-700' : ''}`}
                          style={th ? { color: th.textSec } : undefined}
                        >Desde</label>
                        <input
                          type="date"
                          value={filters.customDateFrom || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, customDateFrom: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg focus:outline-none ${!th ? 'border border-gray-300 focus:ring-2 focus:ring-gray-400' : 'border'}`}
                          style={th ? { background: th.inputBg, borderColor: th.inputBorder, color: th.textPrimary } : undefined}
                        />
                      </div>
                      <div>
                        <label
                          className={`block text-sm font-medium mb-1 ${!th ? 'text-gray-700' : ''}`}
                          style={th ? { color: th.textSec } : undefined}
                        >Hasta</label>
                        <input
                          type="date"
                          value={filters.customDateTo || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, customDateTo: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg focus:outline-none ${!th ? 'border border-gray-300 focus:ring-2 focus:ring-gray-400' : 'border'}`}
                          style={th ? { background: th.inputBg, borderColor: th.inputBorder, color: th.textPrimary } : undefined}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Etiquetas */}
            {availableLabels.length > 0 && (
              <div
                className={`rounded-xl overflow-hidden ${!th ? 'border border-gray-200' : ''}`}
                style={th ? { border: `1px solid ${th.border}` } : undefined}
              >
                <button
                  onClick={() => toggleSection('labels')}
                  className={`w-full p-4 flex items-center justify-between transition-colors ${!th ? 'bg-gray-50 hover:bg-gray-100' : ''}`}
                  style={th ? { background: th.subtleBg } : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <Tag
                      className={`w-5 h-5 ${!th ? 'text-gray-600' : ''}`}
                      style={th ? { color: th.textSec } : undefined}
                    />
                    <span
                      className={`font-semibold ${!th ? 'text-gray-900' : ''}`}
                      style={th ? { color: th.textPrimary } : undefined}
                    >Etiquetas</span>
                    {filters.labels.length > 0 && (
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${!th ? 'bg-gray-200 text-gray-700' : ''}`}
                        style={th ? { background: th.badgeBg, color: th.badgeText } : undefined}
                      >
                        {filters.labels.length}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.labels ? 'rotate-180' : ''} ${!th ? 'text-gray-400' : ''}`}
                    style={th ? { color: th.textMuted } : undefined}
                  />
                </button>
                
                {expandedSections.labels && (
                  <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                    {availableLabels.map((label) => (
                      <label
                        key={label}
                        className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${!th ? 'hover:bg-gray-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={filters.labels.includes(label)}
                          onChange={() => toggleLabel(label)}
                          className="w-4 h-4 rounded"
                          style={th ? { accentColor: th.accent } : undefined}
                        />
                        <span
                          className={!th ? 'text-gray-700' : ''}
                          style={th ? { color: th.textSec } : undefined}
                        >#{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel Derecho - Filtros Guardados */}
          <div
            className={`w-80 border-l p-4 space-y-4 ${!th ? 'border-gray-200 bg-gray-50' : ''}`}
            style={th ? { borderColor: th.border, background: th.sidePanelBg } : undefined}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3
                  className={`font-semibold flex items-center ${!th ? 'text-gray-900' : ''}`}
                  style={th ? { color: th.textPrimary } : undefined}
                >
                  <Star
                    className={`w-4 h-4 mr-2 ${!th ? 'text-gray-500' : ''}`}
                    style={th ? { color: th.textMuted } : undefined}
                  />
                  Filtros Guardados
                </h3>
              </div>

              {savedFilters.length === 0 ? (
                <p
                  className={`text-sm text-center py-8 ${!th ? 'text-gray-500' : ''}`}
                  style={th ? { color: th.textMuted } : undefined}
                >
                  No hay filtros guardados
                </p>
              ) : (
                <div className="space-y-2">
                  {savedFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className={`p-3 rounded-lg transition-colors ${!th ? 'bg-white border border-gray-200 hover:border-gray-400' : ''}`}
                      style={th ? { background: th.inputBg, border: `1px solid ${th.borderSubtle}` } : undefined}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <button
                          onClick={() => handleLoadFilter(filter)}
                          className={`flex-1 text-left font-medium transition-colors ${!th ? 'text-gray-900 hover:text-gray-600' : ''}`}
                          style={th ? { color: th.textPrimary } : undefined}
                        >
                          {filter.name}
                        </button>
                        <button
                          onClick={() => handleDeleteFilter(filter.id)}
                          className={`p-1 rounded transition-colors ${!th ? 'hover:bg-gray-100' : ''}`}
                          title="Eliminar"
                        >
                          <Trash2
                            className={`w-4 h-4 ${!th ? 'text-gray-500' : ''}`}
                            style={th ? { color: th.textMuted } : undefined}
                          />
                        </button>
                      </div>
                      <div
                        className={`text-xs space-y-1 ${!th ? 'text-gray-500' : ''}`}
                        style={th ? { color: th.textMuted } : undefined}
                      >
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
              className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${!th ? 'bg-gray-900 text-white hover:bg-gray-800' : 'text-white'}`}
              style={th ? { background: th.accent } : undefined}
            >
              <Save className="w-4 h-4" />
              <span>Guardar Filtro Actual</span>
            </button>

            {showSaveDialog && (
              <div
                className={`p-3 rounded-lg ${!th ? 'bg-white border border-gray-300' : ''}`}
                style={th ? { background: th.inputBg, border: `1px solid ${th.border}` } : undefined}
              >
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Nombre del filtro..."
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none mb-2 ${!th ? 'border border-gray-300 focus:ring-2 focus:ring-gray-400' : 'border'}`}
                  style={th ? { background: th.subtleBg, borderColor: th.inputBorder, color: th.textPrimary } : undefined}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveFilter}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${!th ? 'bg-gray-900 text-white hover:bg-gray-800' : 'text-white'}`}
                    style={th ? { background: th.accent } : undefined}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setFilterName('');
                    }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${!th ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : ''}`}
                    style={th ? { background: th.subtleBg, color: th.textSec } : undefined}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between ${!th ? 'border-gray-200 bg-gray-50' : ''}`}
          style={th ? { borderColor: th.border, background: th.sidePanelBg } : undefined}
        >
          <button
            onClick={handleReset}
            className={`px-4 py-2 rounded-lg transition-colors ${!th ? 'text-gray-700 hover:bg-gray-200' : ''}`}
            style={th ? { color: th.textSec } : undefined}
          >
            Limpiar Todo
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${!th ? 'text-gray-700 hover:bg-gray-200' : ''}`}
              style={th ? { color: th.textSec } : undefined}
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className={`px-6 py-2 rounded-lg transition-all shadow-lg ${!th ? 'bg-gray-900 text-white hover:bg-gray-800' : 'text-white'}`}
              style={th ? { background: th.accent } : undefined}
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
