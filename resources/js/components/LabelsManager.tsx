import React, { useState, useRef, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  X,
  Check,
  Loader2,
  Palette 
} from 'lucide-react';
import { useLabels } from '../hooks/useChatwoot';

interface Label {
  id?: number;
  title: string;
  color: string;
  description?: string;
}

interface LabelsManagerProps {
  conversationId: number;
  currentLabels: string[];
  onUpdateLabels: (labels: string[]) => Promise<void>;
  onOpenPanel?: () => void;
  className?: string;
}

const colorOptions = [
  '#1f93ff', // Blue
  '#22c55e', // Green
  '#ef4444', // Red
  '#f59e0b', // Yellow/Orange
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6b7280', // Gray
];

const LabelsManager: React.FC<LabelsManagerProps> = ({
  conversationId,
  currentLabels,
  onUpdateLabels,
  onOpenPanel,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelTitle, setNewLabelTitle] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#1f93ff');
  const [selectedLabels, setSelectedLabels] = useState<string[]>(currentLabels || []);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { labels, loading: labelsLoading, fetchLabels, createLabel } = useLabels();

  // Sincronizar labels cuando cambian externamente
  useEffect(() => {
    setSelectedLabels(currentLabels || []);
  }, [currentLabels]);

  // Cargar etiquetas al abrir
  useEffect(() => {
    if (isOpen && labels.length === 0) {
      fetchLabels();
    }
  }, [isOpen, labels.length, fetchLabels]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLabels]);

  const handleClose = async () => {
    // Guardar cambios si hay diferencias
    const currentSet = new Set(currentLabels || []);
    const selectedSet = new Set(selectedLabels);
    const hasChanges = currentLabels.length !== selectedLabels.length || 
      selectedLabels.some(l => !currentSet.has(l)) ||
      currentLabels.some(l => !selectedSet.has(l));

    if (hasChanges) {
      setLoading(true);
      try {
        await onUpdateLabels(selectedLabels);
      } catch (error) {
        console.error('Error al actualizar etiquetas:', error);
      } finally {
        setLoading(false);
      }
    }
    
    setIsOpen(false);
    setShowCreateForm(false);
    setSearchTerm('');
  };

  const toggleLabel = (labelTitle: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelTitle) 
        ? prev.filter(l => l !== labelTitle)
        : [...prev, labelTitle]
    );
  };

  const handleCreateLabel = async () => {
    if (!newLabelTitle.trim()) return;

    setLoading(true);
    try {
      await createLabel({
        title: newLabelTitle.trim(),
        color: newLabelColor,
        description: ''
      });
      // Agregar automáticamente a seleccionados
      setSelectedLabels(prev => [...prev, newLabelTitle.trim()]);
      setNewLabelTitle('');
      setNewLabelColor('#1f93ff');
      setShowCreateForm(false);
      fetchLabels(); // Refrescar lista
    } catch (error) {
      console.error('Error al crear etiqueta:', error);
    } finally {
      setLoading(false);
    }
  };

  // Asegurar que labels siempre sea un array
  const safeLabels = Array.isArray(labels) ? labels : [];
  const filteredLabels = safeLabels.filter((label: Label) => 
    label?.title?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false
  );

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Botón principal */}
      <button
        onClick={() => {
          const willOpen = !isOpen;
          setIsOpen(willOpen);
          if (willOpen && onOpenPanel) {
            onOpenPanel();
          }
        }}
        disabled={loading}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 
          ${selectedLabels.length > 0 
            ? 'bg-violet-100 text-violet-800 hover:bg-violet-200' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Tag className="w-4 h-4" />
        )}
        <span>
          {selectedLabels.length > 0 
            ? `${selectedLabels.length} etiqueta${selectedLabels.length > 1 ? 's' : ''}`
            : 'Etiquetas'
          }
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-[9999] animate-fade-in">
          {/* Header */}
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Etiquetas</span>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-1 text-xs text-violet-600 hover:text-violet-700"
            >
              <Plus className="w-3 h-3" />
              <span>Nueva</span>
            </button>
          </div>

          {/* Formulario de crear nueva etiqueta */}
          {showCreateForm && (
            <div className="px-3 py-2 border-t border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="Nombre de etiqueta"
                  value={newLabelTitle}
                  onChange={(e) => setNewLabelTitle(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400"
                  autoFocus
                />
              </div>
              
              {/* Selector de color */}
              <div className="flex items-center space-x-1 mb-2">
                <Palette className="w-3 h-3 text-gray-500" />
                {colorOptions.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewLabelColor(color)}
                    className={`w-5 h-5 rounded-full transition-all ${newLabelColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreateLabel}
                  disabled={!newLabelTitle.trim() || loading}
                  className="flex-1 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  Crear
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewLabelTitle('');
                  }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Barra de búsqueda */}
          <div className="px-3 py-2">
            <input
              type="text"
              placeholder="Buscar etiqueta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            />
          </div>

          {/* Lista de etiquetas */}
          <div className="max-h-48 overflow-y-auto">
            {labelsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
              </div>
            ) : filteredLabels.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchTerm ? 'No se encontraron etiquetas' : 'No hay etiquetas. Crea una nueva.'}
              </div>
            ) : (
              filteredLabels.map((label: Label) => (
                <button
                  key={label.title}
                  onClick={() => toggleLabel(label.title)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
                    selectedLabels.includes(label.title) ? 'bg-violet-50' : ''
                  }`}
                >
                  {/* Color badge */}
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: label.color || '#1f93ff' }}
                  />
                  
                  {/* Título */}
                  <span className="flex-1 text-gray-700">{label.title}</span>

                  {/* Check si está seleccionada */}
                  {selectedLabels.includes(label.title) && (
                    <Check className="w-4 h-4 text-violet-600" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Etiquetas seleccionadas */}
          {selectedLabels.length > 0 && (
            <div className="px-3 pt-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map(labelTitle => {
                  const label = labels.find((l: Label) => l.title === labelTitle);
                  return (
                    <span 
                      key={labelTitle}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs text-white"
                      style={{ backgroundColor: label?.color || '#1f93ff' }}
                    >
                      <span>{labelTitle}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLabel(labelTitle);
                        }}
                        className="hover:bg-white/20 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botón de guardar */}
          <div className="px-3 pt-2 border-t border-gray-100 mt-2">
            <button
              onClick={handleClose}
              disabled={loading}
              className="w-full px-3 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Guardar cambios</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelsManager;
