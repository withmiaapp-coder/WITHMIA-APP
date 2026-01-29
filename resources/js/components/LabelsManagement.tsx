import { useState, useEffect } from 'react';
import { Tag, Plus, Search, Edit3, Trash2, X } from 'lucide-react';

interface Label {
  id: number;
  title: string;
  description?: string;
  color: string;
  show_on_sidebar: boolean;
  created_at: string;
}

interface Props {
  company: any;
  user: any;
}

export default function LabelsManagement({ company: _company, user: _user }: Props) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#3B82F6',
    show_on_sidebar: true
  });

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
  ];

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/accounts/${company?.chatwoot_account_id}/labels`, {
        headers: {
          'Authorization': `Bearer ${company?.chatwoot_api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLabels(data.payload || []);
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/v1/accounts/${company?.chatwoot_account_id}/labels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${company?.chatwoot_api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchLabels();
        setShowCreateForm(false);
        setFormData({ title: '', description: '', color: '#3B82F6', show_on_sidebar: true });
      }
    } catch (error) {
      console.error('Error creating label:', error);
    }
  };

  const handleUpdateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabel) return;

    try {
      const response = await fetch(`/api/v1/accounts/${company?.chatwoot_account_id}/labels/${editingLabel.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${company?.chatwoot_api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchLabels();
        setEditingLabel(null);
        setFormData({ title: '', description: '', color: '#3B82F6', show_on_sidebar: true });
      }
    } catch (error) {
      console.error('Error updating label:', error);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta etiqueta?')) return;

    try {
      const response = await fetch(`/api/v1/accounts/${company?.chatwoot_account_id}/labels/${labelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${company?.chatwoot_api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchLabels();
      }
    } catch (error) {
      console.error('Error deleting label:', error);
    }
  };

  const startEdit = (label: Label) => {
    setEditingLabel(label);
    setFormData({
      title: label.title,
      description: label.description || '',
      color: label.color,
      show_on_sidebar: label.show_on_sidebar
    });
    setShowCreateForm(true);
  };

  const filteredLabels = labels.filter(label =>
    label.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (label.description && label.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header optimizado */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Gestión de Etiquetas</h2>
          <p className="text-sm text-slate-500 mt-1">Organiza y clasifica tus conversaciones</p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2 shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Etiqueta</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar etiquetas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-gray-500"
        />
      </div>

      {/* Labels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLabels.map((label) => (
          <div key={label.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: label.color }}
                ></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{label.title}</h3>
                  {label.description && (
                    <p className="text-sm text-gray-600 mt-1">{label.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>ID: {label.id}</span>
                    {label.show_on_sidebar && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Sidebar</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => startEdit(label)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteLabel(label.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredLabels.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron etiquetas</p>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingLabel ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingLabel(null);
                  setFormData({ title: '', description: '', color: '#3B82F6', show_on_sidebar: true });
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingLabel ? handleUpdateLabel : handleCreateLabel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_on_sidebar"
                  checked={formData.show_on_sidebar}
                  onChange={(e) => setFormData({ ...formData, show_on_sidebar: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="show_on_sidebar" className="ml-2 text-sm text-gray-700">
                  Mostrar en sidebar
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingLabel(null);
                    setFormData({ title: '', description: '', color: '#3B82F6', show_on_sidebar: true });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  {editingLabel ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}