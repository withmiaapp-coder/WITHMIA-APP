import React, { useState, useRef, useEffect, useMemo } from 'react';
import debugLog from '@/utils/debugLogger';
import { 
  Tag, 
  Plus, 
  X,
  Check,
  Loader2,
  Palette,
  Trash2 
} from 'lucide-react';
import { useLabels } from '../hooks/useChatwoot';
import Portal from './Portal';
import { useTheme } from '../contexts/ThemeContext';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openLeft: false });
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

  const { labels, loading: labelsLoading, fetchLabels, createLabel, deleteLabel } = useLabels();
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<number | null>(null);

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 288; // w-72 = 18rem = 288px
      const viewportWidth = window.innerWidth;
      
      // Si el dropdown se saldría por la derecha, abrirlo hacia la izquierda
      const openLeft = rect.left + dropdownWidth > viewportWidth - 20;
      
      setDropdownPosition({
        top: rect.bottom + 4,
        left: openLeft ? rect.right - dropdownWidth : rect.left,
        openLeft
      });
    }
  }, [isOpen]);

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

  const handleClose = () => {
    // toggleLabel ya persiste cada cambio inmediatamente,
    // no es necesario guardar otra vez al cerrar
    setIsOpen(false);
    setShowCreateForm(false);
    setSearchTerm('');
  };

  const toggleLabel = async (labelTitle: string) => {
    const newLabels = selectedLabels.includes(labelTitle) 
      ? selectedLabels.filter(l => l !== labelTitle)
      : [...selectedLabels, labelTitle];
    
    setSelectedLabels(newLabels);
    
    // Actualizar inmediatamente en el servidor
    try {
      await onUpdateLabels(newLabels);
    } catch (error) {
      debugLog.error('Error al actualizar etiquetas:', error);
      // Revertir en caso de error
      setSelectedLabels(selectedLabels);
    }
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
      // Agregar automáticamente a seleccionados y actualizar en el servidor
      const newLabels = [...selectedLabels, newLabelTitle.trim()];
      setSelectedLabels(newLabels);
      await onUpdateLabels(newLabels);
      setNewLabelTitle('');
      setNewLabelColor('#1f93ff');
      setShowCreateForm(false);
      fetchLabels(); // Refrescar lista
    } catch (error) {
      debugLog.error('Error al crear etiqueta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLabel = async (labelId: number, labelTitle: string) => {
    setLoading(true);
    try {
      // Si la etiqueta está seleccionada en esta conversación, quitarla primero
      if (selectedLabels.includes(labelTitle)) {
        const newLabels = selectedLabels.filter(l => l !== labelTitle);
        setSelectedLabels(newLabels);
        await onUpdateLabels(newLabels);
      }
      await deleteLabel(labelId);
      setConfirmDeleteLabel(null);
    } catch (error) {
      debugLog.error('Error al eliminar etiqueta:', error);
    } finally {
      setLoading(false);
    }
  };

  // Asegurar que labels siempre sea un array
  const safeLabels = Array.isArray(labels) ? labels : [];
  const filteredLabels = safeLabels.filter((label) => 
    label?.title?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false
  );

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
        <Portal>
          <div 
            ref={dropdownRef}
            className={`fixed w-72 rounded-xl shadow-xl border py-2 animate-fade-in ${!t ? 'bg-white border-gray-200' : ''}`}
            style={t ? { top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 99999, backgroundColor: t.dropBg, borderColor: t.border } : { top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 99999 }}
          >
          {/* Header */}
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className={`text-sm font-semibold ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>Etiquetas</span>
            <button
              onClick={() => setShowCreateForm(true)}
              className={`flex items-center space-x-1 text-xs ${!t ? 'text-violet-600 hover:text-violet-700' : ''}`}
              style={t ? { color: t.accent } : undefined}
            >
              <Plus className="w-3 h-3" />
              <span>Nueva</span>
            </button>
          </div>

          {/* Formulario de crear nueva etiqueta */}
          {showCreateForm && (
            <div className={`px-3 py-2 border-t border-b ${!t ? 'border-gray-100 bg-gray-50' : ''}`} style={t ? { borderColor: t.border, backgroundColor: t.hoverBg } : undefined}>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="Nombre de etiqueta"
                  value={newLabelTitle}
                  onChange={(e) => setNewLabelTitle(e.target.value)}
                  className={`flex-1 px-2 py-1.5 text-sm border rounded-lg placeholder:text-gray-500 ${!t ? 'text-gray-900 border-gray-200 focus:ring-2 focus:ring-violet-400' : ''}`}
                  style={t ? { backgroundColor: t.inputBg, borderColor: t.border, color: t.text } : undefined}
                  autoFocus
                />
              </div>
              
              {/* Selector de color */}
              <div className="flex items-center space-x-1 mb-2">
                <Palette className={`w-3 h-3 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined} />
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
                  className="flex-1 px-3 py-1.5 text-white text-xs rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: t ? t.accent : '#7c3aed' }}
                >
                  Crear
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewLabelTitle('');
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg ${!t ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : ''}`}
                  style={t ? { backgroundColor: t.hoverBg, color: t.textSec } : undefined}
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
              className={`w-full px-3 py-2 text-sm border rounded-lg placeholder:text-gray-500 ${!t ? 'text-gray-900 border-gray-200 focus:ring-2 focus:ring-violet-400 focus:border-violet-400' : ''}`}
              style={t ? { backgroundColor: t.inputBg, borderColor: t.border, color: t.text } : undefined}
            />
          </div>

          {/* Lista de etiquetas */}
          <div className="max-h-48 overflow-y-auto">
            {labelsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={t ? { color: t.accent } : undefined} />
              </div>
            ) : filteredLabels.length === 0 ? (
              <div className={`px-4 py-3 text-sm text-center ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                {searchTerm ? 'No se encontraron etiquetas' : 'No hay etiquetas. Crea una nueva.'}
              </div>
            ) : (
              filteredLabels.map((label) => (
                <div
                  key={label.title}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 transition-colors ${!t ? (selectedLabels.includes(label.title) ? 'bg-violet-50 hover:bg-gray-50' : 'hover:bg-gray-50') : ''}`}
                  onMouseEnter={e => t && (e.currentTarget.style.backgroundColor = t.hoverBg)}
                  onMouseLeave={e => t && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {confirmDeleteLabel === label.id ? (
                    /* Confirmación de eliminar */
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-red-600">¿Eliminar "{label.title}"?</span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (label.id) handleDeleteLabel(label.id, label.title);
                          }}
                          className="px-2 py-0.5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Sí
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteLabel(null);
                          }}
                          className={`px-2 py-0.5 text-xs rounded ${!t ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : ''}`}
                          style={t ? { backgroundColor: t.hoverBg, color: t.textSec } : undefined}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Vista normal */
                    <>
                      <button
                        onClick={() => toggleLabel(label.title)}
                        className="flex items-center space-x-3 flex-1 min-w-0"
                      >
                        {/* Color badge */}
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: label.color || '#1f93ff' }}
                        />
                        
                        {/* Título */}
                        <span className={`flex-1 truncate ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>{label.title}</span>

                        {/* Check si está seleccionada */}
                        {selectedLabels.includes(label.title) && (
                          <Check className="w-4 h-4 flex-shrink-0" style={t ? { color: t.accent } : { color: '#7c3aed' }} />
                        )}
                      </button>

                      {/* Botón eliminar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteLabel(label.id || null);
                        }}
                        className={`p-1 rounded transition-colors flex-shrink-0 ${!t ? 'hover:bg-red-100 text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        title="Eliminar etiqueta del sistema"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Etiquetas seleccionadas */}
          {selectedLabels.length > 0 && (
            <div className={`px-3 pt-2 border-t ${!t ? 'border-gray-100' : ''}`} style={t ? { borderColor: t.border } : undefined}>
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map(labelTitle => {
                  const label = safeLabels.find((l) => l.title === labelTitle);
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
          <div className={`px-3 pt-2 border-t mt-2 ${!t ? 'border-gray-100' : ''}`} style={t ? { borderColor: t.border } : undefined}>
            <button
              onClick={handleClose}
              disabled={loading}
              className={`w-full px-3 py-2 text-white text-sm rounded-lg disabled:opacity-50 flex items-center justify-center space-x-2 ${!t ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
              style={t ? { backgroundColor: t.accent } : undefined}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Guardar cambios</span>
            </button>
          </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default LabelsManager;
