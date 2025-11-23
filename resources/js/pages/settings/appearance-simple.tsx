import React from 'react';
import { Palette, Sun, Moon } from 'lucide-react';

const AppearanceSettingsSimple: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Apariencia</h1>
        <p className="text-gray-500 mt-2">Personaliza la interfaz de tu aplicación</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <Palette className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tema de la Aplicación</h2>
            <p className="text-sm text-gray-500">Elige el tema que prefieras</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <Sun className="w-6 h-6 text-blue-600" />
              <span className="font-medium text-gray-900">Claro</span>
            </div>
            <p className="text-sm text-gray-600">Tema claro y brillante</p>
          </div>

          <div className="p-4 border-2 border-gray-300 bg-gray-50 rounded-lg cursor-pointer opacity-50">
            <div className="flex items-center gap-3 mb-2">
              <Moon className="w-6 h-6 text-gray-600" />
              <span className="font-medium text-gray-900">Oscuro</span>
            </div>
            <p className="text-sm text-gray-600">Tema oscuro (próximamente)</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 Actualmente usando el tema claro. Más opciones de personalización próximamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettingsSimple;
