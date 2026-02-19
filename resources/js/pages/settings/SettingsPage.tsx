import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Globe, Bell, Shield, Clock, Check, Loader2, Building2,
  Save, ChevronRight, Smartphone, MessageCircle, AlertCircle,
  Moon, Sun, Palette, Eye, Volume2, VolumeX, Lock, Key
} from 'lucide-react';
import axios from 'axios';

// ====== TIPOS ======
interface CompanySettings {
  timezone: string;
  company_name?: string;
}

interface NotificationSettings {
  whatsappConnection: boolean;
  whatsappDisconnection: boolean;
  newLeads: boolean;
  newMessages: boolean;
  mentionsOnly: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

// Timezones más comunes
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

// ====== TABS CONFIG ======
type SettingsTab = 'general' | 'notifications' | 'security';

const TABS: { id: SettingsTab; label: string; icon: any; description: string }[] = [
  { id: 'general', label: 'General', icon: Settings, description: 'Empresa, zona horaria y preferencias' },
  { id: 'notifications', label: 'Notificaciones', icon: Bell, description: 'Alertas, sonidos y avisos' },
  { id: 'security', label: 'Seguridad', icon: Shield, description: 'Contraseña y acceso' },
];

// ====== TOGGLE COMPONENT ======
function Toggle({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-orange-500' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ====== NOTIFICATION ITEM ======
function NotificationItem({ 
  icon: Icon, title, description, enabled, onChange, iconColor = 'text-blue-600', iconBg = 'bg-blue-100' 
}: { 
  icon: any; title: string; description: string; enabled: boolean; onChange: () => void;
  iconColor?: string; iconBg?: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100/80 transition-colors">
      <div className={`flex-shrink-0 w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}


// ====== MAIN COMPONENT ======
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-1">Administra las preferencias de tu cuenta y empresa</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-gray-100 rounded-xl p-1.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}


// ====== TAB: GENERAL ======
function GeneralTab() {
  const [settings, setSettings] = useState<CompanySettings>({ timezone: 'UTC', company_name: '' });
  const [originalSettings, setOriginalSettings] = useState<CompanySettings>({ timezone: 'UTC', company_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('--:--:--');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        setCurrentTime(new Date().toLocaleTimeString('es-CL', {
          timeZone: settings.timezone,
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }));
      } catch { setCurrentTime('--:--:--'); }
    }, 1000);
    return () => clearInterval(interval);
  }, [settings.timezone]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/company/settings');
      if (response.data.success) {
        const loaded = {
          timezone: response.data.data.timezone || 'UTC',
          company_name: response.data.data.name || ''
        };
        setSettings(loaded);
        setOriginalSettings(loaded);
      }
    } catch { setError('Error al cargar la configuración'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await axios.put('/api/company/settings', { timezone: settings.timezone });
      if (response.data.success) {
        setOriginalSettings({ ...settings });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(response.data.message || 'Error al guardar');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">Configuración guardada exitosamente</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm font-medium text-red-800">{error}</span>
        </div>
      )}

      {/* Company Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-orange-500" />
          Información de la Empresa
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Nombre de la empresa
          </label>
          <input
            type="text"
            value={settings.company_name || ''}
            disabled
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 cursor-not-allowed text-sm"
          />
          <p className="text-xs text-gray-400 mt-2">
            El nombre de la empresa se configura desde el asistente de entrenamiento
          </p>
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Globe className="w-5 h-5 text-orange-500" />
          Zona Horaria
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Selecciona tu zona horaria
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-gray-400 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm text-gray-900"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 flex items-center gap-4 border border-orange-100">
            <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Hora actual en la zona seleccionada</p>
              <p className="text-2xl font-mono font-bold text-gray-900">{currentTime}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Esta zona horaria se usará para mostrar las fechas y horas de los mensajes,
            conversaciones y otras actividades en tu plataforma.
          </p>
        </div>
      </div>

      {/* Language (placeholder) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-orange-500" />
          Idioma
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Idioma de la plataforma
          </label>
          <select
            value="es"
            disabled
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 cursor-not-allowed text-sm"
          >
            <option value="es">🇪🇸 Español</option>
          </select>
          <p className="text-xs text-gray-400 mt-2">
            Más idiomas estarán disponibles próximamente
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all text-sm ${
            hasChanges && !saving
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
          ) : (
            <><Save className="w-4 h-4" /> Guardar cambios</>
          )}
        </button>
      </div>
    </div>
  );
}


// ====== TAB: NOTIFICATIONS ======
function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>({
    whatsappConnection: true,
    whatsappDisconnection: true,
    newLeads: true,
    newMessages: true,
    mentionsOnly: false,
    soundEnabled: true,
    desktopNotifications: true,
  });
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  return (
    <div className="space-y-6">
      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">Preferencias guardadas exitosamente</span>
        </div>
      )}

      {/* Desktop Permission Banner */}
      {permission !== 'granted' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-amber-800">Notificaciones de escritorio desactivadas</h4>
            <p className="text-xs text-amber-600 mt-0.5">Actívalas para recibir alertas incluso cuando no estés en la pestaña</p>
          </div>
          <button
            onClick={requestPermission}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
          >
            Activar
          </button>
        </div>
      )}

      {/* WhatsApp */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-600" />
          WhatsApp
        </h3>
        <div className="space-y-3">
          <NotificationItem
            icon={Check}
            title="Conexión exitosa"
            description="Notificar cuando WhatsApp se conecta correctamente"
            enabled={settings.whatsappConnection}
            onChange={() => handleToggle('whatsappConnection')}
            iconColor="text-green-600"
            iconBg="bg-green-100"
          />
          <NotificationItem
            icon={AlertCircle}
            title="Desconexión"
            description="Alertar cuando WhatsApp se desconecta"
            enabled={settings.whatsappDisconnection}
            onChange={() => handleToggle('whatsappDisconnection')}
            iconColor="text-red-600"
            iconBg="bg-red-100"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          Mensajes
        </h3>
        <div className="space-y-3">
          <NotificationItem
            icon={MessageCircle}
            title="Nuevos Leads"
            description="Cuando una persona te contacta por primera vez"
            enabled={settings.newLeads}
            onChange={() => handleToggle('newLeads')}
          />
          <NotificationItem
            icon={MessageCircle}
            title="Nuevos mensajes"
            description="Recibir notificación de todos los mensajes nuevos"
            enabled={settings.newMessages}
            onChange={() => handleToggle('newMessages')}
          />
          <NotificationItem
            icon={AlertCircle}
            title="Solo menciones"
            description="Notificar únicamente cuando te mencionan"
            enabled={settings.mentionsOnly}
            onChange={() => handleToggle('mentionsOnly')}
          />
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-600" />
          Preferencias
        </h3>
        <div className="space-y-3">
          <NotificationItem
            icon={settings.soundEnabled ? Volume2 : VolumeX}
            title="Sonido"
            description="Reproducir un sonido cuando llegue una notificación"
            enabled={settings.soundEnabled}
            onChange={() => handleToggle('soundEnabled')}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          />
          <NotificationItem
            icon={Bell}
            title="Notificaciones de escritorio"
            description="Mostrar notificaciones del sistema operativo"
            enabled={settings.desktopNotifications}
            onChange={() => handleToggle('desktopNotifications')}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 text-sm"
        >
          <Save className="w-4 h-4" />
          Guardar preferencias
        </button>
      </div>
    </div>
  );
}


// ====== TAB: SECURITY ======
function SecurityTab() {
  return (
    <div className="space-y-6">
      {/* Auth method */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Key className="w-5 h-5 text-orange-500" />
          Método de Autenticación
        </h3>
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-blue-100">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900">Google Sign-In</h4>
            <p className="text-xs text-gray-500 mt-0.5">Tu cuenta está vinculada con Google. Inicia sesión de forma segura sin contraseña.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold border border-green-200">
            <Check className="w-3.5 h-3.5" />
            Activo
          </span>
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" />
          Sesiones Activas
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Sesión actual</h4>
              <p className="text-xs text-gray-500 mt-0.5">Navegador web · Activa ahora</p>
            </div>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Si sospechas de actividad no autorizada, cierra sesión y vuelve a iniciar desde Google.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-red-600 mb-5 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Zona de Peligro
        </h3>
        <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900">Cerrar todas las sesiones</h4>
            <p className="text-xs text-red-600 mt-0.5">Esto cerrará tu sesión en todos los dispositivos</p>
          </div>
          <button 
            onClick={() => { window.location.href = '/logout'; }}
            className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
