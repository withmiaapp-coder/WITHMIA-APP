import React, { useState, useEffect } from 'react';
import { Globe, Clock, Check, Loader2, Building2, Save } from 'lucide-react';
import axios from 'axios';

// Timezones más comunes de Latinoamérica y el mundo
const TIMEZONES = [
  { value: 'America/Santiago', label: '🇨🇱 Chile (Santiago) UTC-3/-4' },
  { value: 'America/Argentina/Buenos_Aires', label: '🇦🇷 Argentina (Buenos Aires) UTC-3' },
  { value: 'America/Lima', label: '🇵🇪 Perú (Lima) UTC-5' },
  { value: 'America/Bogota', label: '🇨🇴 Colombia (Bogotá) UTC-5' },
  { value: 'America/Mexico_City', label: '🇲🇽 México (Ciudad de México) UTC-6' },
  { value: 'America/Caracas', label: '🇻🇪 Venezuela (Caracas) UTC-4' },
  { value: 'America/Sao_Paulo', label: '🇧🇷 Brasil (São Paulo) UTC-3' },
  { value: 'America/Guayaquil', label: '🇪🇨 Ecuador (Guayaquil) UTC-5' },
  { value: 'America/La_Paz', label: '🇧🇴 Bolivia (La Paz) UTC-4' },
  { value: 'America/Montevideo', label: '🇺🇾 Uruguay (Montevideo) UTC-3' },
  { value: 'America/Asuncion', label: '🇵🇾 Paraguay (Asunción) UTC-4/-3' },
  { value: 'America/Panama', label: '🇵🇦 Panamá UTC-5' },
  { value: 'America/Costa_Rica', label: '🇨🇷 Costa Rica UTC-6' },
  { value: 'America/Guatemala', label: '🇬🇹 Guatemala UTC-6' },
  { value: 'America/New_York', label: '🇺🇸 Estados Unidos (Nueva York) UTC-5/-4' },
  { value: 'America/Los_Angeles', label: '🇺🇸 Estados Unidos (Los Ángeles) UTC-8/-7' },
  { value: 'Europe/Madrid', label: '🇪🇸 España (Madrid) UTC+1/+2' },
  { value: 'Europe/London', label: '🇬🇧 Reino Unido (Londres) UTC+0/+1' },
  { value: 'UTC', label: '🌍 UTC (Tiempo Universal Coordinado)' },
];

interface CompanySettings {
  timezone: string;
  company_name?: string;
}

export default function GeneralSettings() {
  const [settings, setSettings] = useState<CompanySettings>({
    timezone: 'UTC',
    company_name: ''
  });
  const [originalSettings, setOriginalSettings] = useState<CompanySettings>({
    timezone: 'UTC',
    company_name: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar configuración actual
  useEffect(() => {
    loadSettings();
  }, []);

  // Detectar cambios
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/company/settings');
      if (response.data.success) {
        const loadedSettings = {
          timezone: response.data.data.timezone || 'UTC',
          company_name: response.data.data.name || ''
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (err: unknown) {
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await axios.put('/api/company/settings', {
        timezone: settings.timezone
      });

      if (response.data.success) {
        setOriginalSettings({ ...settings });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(response.data.message || 'Error al guardar');
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj.response?.data?.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentTime = (timezone: string) => {
    try {
      return new Date().toLocaleTimeString('es-CL', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '--:--:--';
    }
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime(settings.timezone));

  // Actualizar hora cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime(settings.timezone));
    }, 1000);
    return () => clearInterval(interval);
  }, [settings.timezone]);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración General</h1>
        <p className="text-sm text-gray-600">
          Configura las preferencias generales de tu empresa
        </p>
      </div>

      {/* Mensajes de estado */}
      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Configuración guardada exitosamente</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Secciones de configuración */}
      <div className="space-y-8">
        {/* Información de la empresa */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Información de la empresa
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la empresa
              </label>
              <input
                type="text"
                value={settings.company_name || ''}
                disabled
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                placeholder="Nombre de tu empresa"
              />
              <p className="text-xs text-gray-400 mt-1">
                El nombre de la empresa no se puede cambiar desde aquí
              </p>
            </div>
          </div>
        </div>

        {/* Zona horaria */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Zona Horaria
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona tu zona horaria
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview de hora actual */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Hora actual en la zona seleccionada</p>
                <p className="text-2xl font-mono font-bold text-gray-900">{currentTime}</p>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Esta zona horaria se usará para mostrar las fechas y horas de los mensajes,
              conversaciones y otras actividades en tu plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* Botón guardar */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            hasChanges && !saving
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
