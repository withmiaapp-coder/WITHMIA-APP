import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Settings, Globe, Bell, Shield, Clock, Check, Loader2, Building2,
  Save, ChevronRight, Smartphone, MessageCircle, AlertCircle,
  Moon, Sun, Palette, Eye, Volume2, VolumeX, Lock, Key,
  type LucideIcon
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';

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

const TABS: { id: SettingsTab; label: string; icon: LucideIcon; description: string }[] = [
  { id: 'general', label: 'General', icon: Settings, description: 'Empresa, zona horaria y preferencias' },
  { id: 'notifications', label: 'Notificaciones', icon: Bell, description: 'Alertas, sonidos y avisos' },
  { id: 'security', label: 'Seguridad', icon: Shield, description: 'Contraseña y acceso' },
];

// ====== TOGGLE COMPONENT ======
function Toggle({ enabled, onChange, disabled = false, t }: { enabled: boolean; onChange: () => void; disabled?: boolean; t?: any }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        !t ? (enabled ? 'bg-orange-500' : 'bg-gray-300') : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={t ? { background: enabled ? t.accent : (t.inputBorder || '#6b7280') } : undefined}
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
  icon: Icon, title, description, enabled, onChange, iconColor = 'text-blue-600', iconBg = 'bg-blue-100', t 
}: { 
  icon: LucideIcon; title: string; description: string; enabled: boolean; onChange: () => void;
  iconColor?: string; iconBg?: string; t?: any;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${!t ? 'bg-gray-50 hover:bg-gray-100/80' : ''}`}
      style={t ? { background: t.subtleBg, borderRadius: '0.75rem' } : undefined}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${!t ? iconBg : ''}`}
        style={t ? { background: t.accentLight || t.badgeBg } : undefined}
      >
        <Icon className={`w-5 h-5 ${!t ? iconColor : ''}`} style={t ? { color: t.accent } : undefined} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{title}</h4>
        <p className={`text-xs mt-0.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} t={t} />
    </div>
  );
}


// ====== MAIN COMPONENT ======
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      textPrimary: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      cardBg: 'var(--theme-content-card-bg)',
      cardBorder: isDark ? 'var(--theme-content-card-border)' : 'rgba(0,0,0,0.08)',
      contentBg: 'var(--theme-content-bg)',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      inputBorder: isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db',
      subtleBg: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
      badgeBg: isDark ? 'rgba(255,255,255,0.08)' : 'var(--theme-accent-light)',
    };
  }, [hasTheme, isDark]);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Configuración</h1>
          <p className={`text-sm mt-1 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Administra las preferencias de tu cuenta y empresa</p>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex gap-2 mb-8 rounded-xl p-1.5 ${!t ? 'bg-gray-100' : ''}`}
          style={t ? { background: t.subtleBg } : undefined}
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  !t ? (isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50') : ''
                }`}
                style={t ? {
                  background: isActive ? t.cardBg : 'transparent',
                  color: isActive ? t.textPrimary : t.textMuted,
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                } : undefined}
              >
                <Icon className={`w-4 h-4 ${!t ? (isActive ? 'text-orange-500' : '') : ''}`} style={t ? { color: isActive ? t.accent : undefined } : undefined} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && <GeneralTab t={t} />}
        {activeTab === 'notifications' && <NotificationsTab t={t} />}
        {activeTab === 'security' && <SecurityTab t={t} />}
      </div>
    </div>
  );
}


// ====== TAB: GENERAL ======
function GeneralTab({ t }: { t: any }) {
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
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className={`w-6 h-6 animate-spin ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
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
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : ''}`}
        style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
      >
        <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
          <Building2 className={`w-5 h-5 ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
          Información de la Empresa
        </h3>
        <div>
          <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
            Nombre de la empresa
          </label>
          <input
            type="text"
            value={settings.company_name || ''}
            disabled
            className={`w-full px-4 py-3 rounded-xl cursor-not-allowed text-sm ${!t ? 'bg-gray-50 border border-gray-300 text-gray-700' : ''}`}
            style={t ? { background: t.subtleBg, border: `1px solid ${t.cardBorder}`, color: t.textSec } : undefined}
          />
          <p className={`text-xs mt-2 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
            El nombre de la empresa se configura desde el asistente de entrenamiento
          </p>
        </div>
      </div>

      {/* Timezone */}
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : ''}`}
        style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
      >
        <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
          <Globe className={`w-5 h-5 ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
          Zona Horaria
        </h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
              Selecciona tu zona horaria
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className={`w-full px-4 py-3 rounded-xl text-sm ${!t ? 'bg-white border border-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900' : ''}`}
              style={t ? { background: t.inputBg, border: `1px solid ${t.inputBorder || t.cardBorder}`, color: t.textPrimary } : undefined}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div
            className={`rounded-xl p-4 flex items-center gap-4 ${!t ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100' : ''}`}
            style={t ? { background: t.accentLight || t.subtleBg, border: `1px solid ${t.cardBorder}` } : undefined}
          >
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${!t ? 'bg-orange-100' : ''}`}
              style={t ? { background: t.badgeBg || t.accentLight } : undefined}
            >
              <Clock className={`w-6 h-6 ${!t ? 'text-orange-600' : ''}`} style={t ? { color: t.accent } : undefined} />
            </div>
            <div>
              <p className={`text-xs font-medium ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Hora actual en la zona seleccionada</p>
              <p className={`text-2xl font-mono font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{currentTime}</p>
            </div>
          </div>

          <p className={`text-xs ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
            Esta zona horaria se usará para mostrar las fechas y horas de los mensajes,
            conversaciones y otras actividades en tu plataforma.
          </p>
        </div>
      </div>

      {/* Language (placeholder) */}
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : ''}`}
        style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
      >
        <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
          <MessageCircle className={`w-5 h-5 ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
          Idioma
        </h3>
        <div>
          <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
            Idioma de la plataforma
          </label>
          <select
            value="es"
            disabled
            className={`w-full px-4 py-3 rounded-xl cursor-not-allowed text-sm ${!t ? 'bg-gray-50 border border-gray-300 text-gray-700' : ''}`}
            style={t ? { background: t.subtleBg, border: `1px solid ${t.cardBorder}`, color: t.textSec } : undefined}
          >
            <option value="es">🇪🇸 Español</option>
          </select>
          <p className={`text-xs mt-2 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
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
            !t ? (hasChanges && !saving
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed') : (hasChanges && !saving ? '' : 'cursor-not-allowed')
          }`}
          style={t ? {
            background: hasChanges && !saving ? t.accent : t.subtleBg,
            color: hasChanges && !saving ? '#fff' : t.textMuted,
          } : undefined}
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
function NotificationsTab({ t }: { t: any }) {
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
  const [permission, setPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'granted')
  );

  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
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
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : ''}`}
        style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
      >
        <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
          <Smartphone className={`w-5 h-5 ${!t ? 'text-green-600' : ''}`} style={t ? { color: t.accent } : undefined} />
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
            t={t}
          />
          <NotificationItem
            icon={AlertCircle}
            title="Desconexión"
            description="Alertar cuando WhatsApp se desconecta"
            enabled={settings.whatsappDisconnection}
            onChange={() => handleToggle('whatsappDisconnection')}
            iconColor="text-red-600"
            iconBg="bg-red-100"
            t={t}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : ''}`}
        style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
      >
        <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
          <MessageCircle className={`w-5 h-5 ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined} />
          Mensajes
        </h3>
        <div className="space-y-3">
          <NotificationItem
            icon={MessageCircle}
            title="Nuevos Leads"
            description="Cuando una persona te contacta por primera vez"
            enabled={settings.newLeads}
            onChange={() => handleToggle('newLeads')}
            t={t}
          />
          <NotificationItem
            icon={MessageCircle}
            title="Nuevos mensajes"
            description="Recibir notificación de todos los mensajes nuevos"
            enabled={settings.newMessages}
            onChange={() => handleToggle('newMessages')}
            t={t}
          />
          <NotificationItem
            icon={AlertCircle}
            title="Solo menciones"
            description="Notificar únicamente cuando te mencionan"
            enabled={settings.mentionsOnly}
            onChange={() => handleToggle('mentionsOnly')}
            t={t}
          />
        </div>
      </div>

      {/* Preferences */}
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : ''}`}
        style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
      >
        <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
          <Eye className={`w-5 h-5 ${!t ? 'text-purple-600' : ''}`} style={t ? { color: t.accent } : undefined} />
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
            t={t}
          />
          <NotificationItem
            icon={Bell}
            title="Notificaciones de escritorio"
            description="Mostrar notificaciones del sistema operativo"
            enabled={settings.desktopNotifications}
            onChange={() => handleToggle('desktopNotifications')}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
            t={t}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all text-sm ${!t ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200' : ''}`}
          style={t ? { background: t.accent, color: '#fff' } : undefined}
        >
          <Save className="w-4 h-4" />
          Guardar preferencias
        </button>
      </div>
    </div>
  );
}


// ====== TAB: SECURITY ======
function SecurityTab({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      {/* Auth method */}
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : ''}`}
        style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
      >
        <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
          <Key className={`w-5 h-5 ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
          Método de Autenticación
        </h3>
        <div
          className={`flex items-center gap-4 p-4 rounded-xl ${!t ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100' : ''}`}
          style={t ? { background: t.subtleBg, border: `1px solid ${t.cardBorder}` } : undefined}
        >
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${!t ? 'bg-white border border-blue-100' : ''}`}
            style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-semibold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Google Sign-In</h4>
            <p className={`text-xs mt-0.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Tu cuenta está vinculada con Google. Inicia sesión de forma segura sin contraseña.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold border border-green-200">
            <Check className="w-3.5 h-3.5" />
            Activo
          </span>
        </div>
      </div>

      {/* Sessions */}
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : ''}`}
        style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
      >
        <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
          <Shield className={`w-5 h-5 ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
          Sesiones Activas
        </h3>
        <div className="space-y-3">
          <div
            className={`flex items-center gap-4 p-4 rounded-xl ${!t ? 'bg-gray-50' : ''}`}
            style={t ? { background: t.subtleBg } : undefined}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${!t ? 'bg-green-100' : ''}`}
              style={t ? { background: t.accentLight || t.badgeBg } : undefined}
            >
              <Globe className={`w-5 h-5 ${!t ? 'text-green-600' : ''}`} style={t ? { color: t.accent } : undefined} />
            </div>
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Sesión actual</h4>
              <p className={`text-xs mt-0.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Navegador web · Activa ahora</p>
            </div>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
        <p className={`text-xs mt-4 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
          Si sospechas de actividad no autorizada, cierra sesión y vuelve a iniciar desde Google.
        </p>
      </div>

      {/* Danger Zone */}
      <div
        className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-red-200' : ''}`}
        style={t ? { background: t.cardBg, border: '1px solid #ef4444' } : undefined}
      >
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
