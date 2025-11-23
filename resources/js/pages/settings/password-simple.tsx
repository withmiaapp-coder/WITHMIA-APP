import React from 'react';
import { Lock, Shield } from 'lucide-react';

const PasswordSettingsSimple: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Contraseña</h1>
        <p className="text-gray-500 mt-2">Gestiona la seguridad de tu cuenta</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Seguridad de la Cuenta</h2>
            <p className="text-sm text-gray-500">Cambia tu contraseña y configuración de seguridad</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Shield className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900">Cuenta protegida</h3>
              <p className="text-sm text-green-700">Tu cuenta está protegida con una contraseña segura</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 Para cambiar tu contraseña, visita la sección de configuración en el menú principal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordSettingsSimple;
