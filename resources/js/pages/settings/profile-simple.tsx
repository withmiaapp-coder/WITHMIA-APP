import React from 'react';
import { User, Mail } from 'lucide-react';

const ProfileSettingsSimple: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Perfil</h1>
        <p className="text-gray-500 mt-2">Administra tu información personal</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Información del Usuario</h2>
            <p className="text-sm text-gray-500">Actualiza tu información de perfil</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">Usuario</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">usuario@ejemplo.com</span>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 Para editar tu perfil completo, visita la sección de configuración en el menú principal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsSimple;
