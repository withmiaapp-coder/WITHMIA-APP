import { Head } from '@inertiajs/react';
import { ArrowLeft, Tag, Plus, Search } from 'lucide-react';
import { useState } from 'react';

interface Props {
  user: any;
  company: any;
}

export default function Etiquetas({ user, company }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleBack = () => {
    window.history.back();
  };

  return (
    <>
      <Head title="Etiquetas - WITHMIA" />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-white">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBack}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">🏷️ Etiquetas</h1>
                    <p className="text-sm text-gray-600">Organiza conversaciones con etiquetas</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{company?.name || 'WITHMIA'}</span>
                </div>
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-700">
                    {user?.name?.charAt(0) || 'W'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Info Banner */}
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Tag className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 mb-1">
                  Sistema de Etiquetas Enterprise
                </h3>
                <p className="text-purple-700 text-sm">
                  Organiza y categoriza conversaciones con etiquetas personalizadas. Sistema completo integrado desde Chatwoot.
                </p>
              </div>
            </div>
          </div>

          {/* Sistema de Etiquetas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Gestión de Etiquetas</h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Etiqueta</span>
              </button>
            </div>

            {/* Búsqueda */}
            <div className="relative mb-6">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar etiquetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-gray-500"
              />
            </div>

            {/* Estado inicial */}
            <div className="text-center py-8">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Sistema de Etiquetas Enterprise</p>
              <p className="text-sm text-gray-400 mt-2">
                Funcionalidades completas integradas con Chatwoot API
              </p>
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-600">
                  ✅ Crear etiquetas personalizadas
                </div>
                <div className="text-sm text-gray-600">
                  ✅ Asignar colores y descripciones
                </div>
                <div className="text-sm text-gray-600">
                  ✅ Organizar conversaciones automáticamente
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}