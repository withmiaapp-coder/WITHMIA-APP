import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  Mail, 
  Globe, 
  ChevronDown, 
  ChevronRight,
  Settings,
  Check,
  X,
  Phone,
  Users,
  Eye,
  Clock,
  MessageSquare,
  Database,
  Code,
  ShoppingCart,
  ShoppingBag,
  Calendar,
  CalendarDays,
  HardDrive,
  Cloud,
  FileSpreadsheet,
  Store,
  Lightbulb,
  Zap,
  AlertCircle,
  RefreshCw,
  Loader2,
  QrCode,
  Plug,
  Link2,
  Unlink,
  Bot,
  ExternalLink
} from 'lucide-react';

interface IntegrationSectionProps {
  whatsAppStatus: string;
  whatsAppSettings: {
    rejectCall: boolean;
    groupsIgnore: boolean;
    alwaysOnline: boolean;
    readMessages: boolean;
    syncFullHistory: boolean;
    readStatus: boolean;
    daysLimitImportMessages?: number;
  };
  onConnectWhatsApp: () => void;
  onDisconnectWhatsApp: () => void;
  onUpdateSettings: (settings: any) => Promise<void>;
  isUpdatingSettings?: boolean;
}

const IntegrationSection: React.FC<IntegrationSectionProps> = ({
  whatsAppStatus,
  whatsAppSettings,
  onConnectWhatsApp,
  onDisconnectWhatsApp,
  onUpdateSettings,
  isUpdatingSettings = false
}) => {
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState({
    ...whatsAppSettings,
    daysLimitImportMessages: whatsAppSettings.daysLimitImportMessages || 7
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Google Calendar state
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalConnecting, setGcalConnecting] = useState(false);
  const [gcalIntegration, setGcalIntegration] = useState<any>(null);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  // API helper
  const gcalApiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('auth_token') || '';
    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}auth_token=${token}`;
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Railway-Auth': token,
        ...(options.headers || {}),
      },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`API Error ${res.status}`);
    return res.json();
  }, []);

  // Load Google Calendar status
  const loadGcalStatus = useCallback(async () => {
    try {
      setGcalLoading(true);
      const data = await gcalApiFetch('/api/calendar/status');
      setGcalConnected(data.connected);
      setGcalIntegration(data.integration);
    } catch (err) {
      console.error('Error loading calendar status:', err);
    } finally {
      setGcalLoading(false);
    }
  }, [gcalApiFetch]);

  // Connect Google Calendar
  const connectGoogleCalendar = useCallback(async () => {
    try {
      setGcalConnecting(true);
      const data = await gcalApiFetch('/api/calendar/google/auth-url');
      const authWindow = window.open(data.auth_url, 'google_auth', 'width=600,height=700,left=200,top=100');

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'gcal_oauth_result') {
          window.removeEventListener('message', handleMessage);
          setGcalConnecting(false);
          if (event.data.status === 'success') {
            await loadGcalStatus();
          }
        }
      };
      window.addEventListener('message', handleMessage);

      const pollInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollInterval);
          setTimeout(async () => {
            setGcalConnecting(false);
            window.removeEventListener('message', handleMessage);
            await loadGcalStatus();
          }, 500);
        }
      }, 1000);

      setTimeout(() => { clearInterval(pollInterval); window.removeEventListener('message', handleMessage); setGcalConnecting(false); }, 300000);
    } catch (err) {
      console.error('Error connecting Google Calendar:', err);
      setGcalConnecting(false);
    }
  }, [gcalApiFetch, loadGcalStatus]);

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = useCallback(async () => {
    if (!confirm('¿Desconectar Google Calendar? WITHMIA perderá acceso al calendario.')) return;
    try {
      await gcalApiFetch('/api/calendar/google/disconnect', { method: 'POST' });
      setGcalConnected(false);
      setGcalIntegration(null);
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, [gcalApiFetch]);

  // Toggle bot access
  const toggleGcalBotAccess = useCallback(async () => {
    if (!gcalIntegration) return;
    try {
      const data = await gcalApiFetch('/api/calendar/settings', {
        method: 'PUT',
        body: JSON.stringify({ bot_access_enabled: !gcalIntegration.bot_access_enabled }),
      });
      setGcalIntegration(data.integration);
    } catch (err) {
      console.error('Error toggling bot access:', err);
    }
  }, [gcalIntegration, gcalApiFetch]);

  useEffect(() => { loadGcalStatus(); }, [loadGcalStatus]);

  const isConnected = whatsAppStatus === 'open' || whatsAppStatus === 'connected';

  const toggleChannel = (channelId: string) => {
    setExpandedChannel(expandedChannel === channelId ? null : channelId);
  };

  const handleSettingChange = (key: string, value: boolean | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    await onUpdateSettings(localSettings);
    setHasChanges(false);
  };

  // Canales de comunicación
  const channels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Conecta tu WhatsApp Business para recibir y enviar mensajes',
      icon: '/icons/whatsapp.webp',
      fallbackIcon: MessageCircle,
      iconBg: 'from-green-500 to-emerald-500',
      status: isConnected ? 'connected' : 'disconnected',
      available: true
    },
    {
      id: 'instagram',
      name: 'Instagram Direct',
      description: 'Recibe mensajes directos de Instagram',
      icon: '/icons/instagram-new.webp',
      fallbackIcon: MessageSquare,
      iconBg: 'from-pink-500 to-rose-500',
      status: 'coming_soon',
      available: false
    },
    {
      id: 'messenger',
      name: 'Facebook Messenger',
      description: 'Conecta tu página de Facebook para Messenger',
      icon: '/icons/facebook-new.webp',
      fallbackIcon: Mail,
      iconBg: 'from-blue-500 to-indigo-500',
      status: 'coming_soon',
      available: false
    },
    {
      id: 'whatsapp-api',
      name: 'WhatsApp API Oficial',
      description: 'API oficial de WhatsApp Business (Meta)',
      icon: null,
      fallbackIcon: MessageCircle,
      iconBg: 'from-emerald-600 to-teal-600',
      status: 'coming_soon',
      available: false
    },
    {
      id: 'web-chat',
      name: 'Chat Web / Widget',
      description: 'Widget de chat para tu sitio web',
      icon: null,
      fallbackIcon: Globe,
      iconBg: 'from-blue-600 to-purple-600',
      status: 'coming_soon',
      available: false
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Conecta tu cuenta de Gmail para gestionar emails',
      icon: null,
      fallbackIcon: Mail,
      iconBg: 'from-red-500 to-orange-500',
      status: 'coming_soon',
      available: false
    }
  ];

  // Herramientas
  const tools = [
    { id: 'crm', name: 'CRM', icon: Database, color: '#059669', description: 'Gestiona relaciones con clientes' },
    { id: 'api', name: 'API', icon: Code, color: '#6B7280', description: 'Integración personalizada' },
    { id: 'woocommerce', name: 'WooCommerce', icon: ShoppingCart, color: '#96588A', description: 'Conecta tu tienda WooCommerce' },
    { id: 'shopify', name: 'Shopify', icon: ShoppingBag, color: '#96BF48', description: 'Sincroniza con tu tienda Shopify' },
    { id: 'reservo', name: 'Reservo', icon: Calendar, color: '#F59E0B', description: 'Sistema de reservas y citas' },
    { id: 'calendar', name: 'Google Calendar', icon: CalendarDays, color: '#DC2626', description: 'Integra con Google Calendar' },
    { id: 'drive', name: 'Google Drive', icon: HardDrive, color: '#34A853', description: 'Almacenamiento en la nube' },
    { id: 'excel', name: 'Google Sheets', icon: FileSpreadsheet, color: '#217346', description: 'Conecta con Google Sheets' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Conectado
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            Desconectado
          </span>
        );
      case 'coming_soon':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Próximamente
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
      <div className="max-w-4xl mx-auto pb-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500 to-slate-600 shadow-lg">
              <Plug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-800">Integraciones</h1>
              <p className="text-neutral-500">Conecta tus canales de comunicación y herramientas</p>
            </div>
          </div>
        </div>

        {/* Canales de Comunicación */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-neutral-800">Canales de Comunicación</h2>
          </div>
          
          <div className="space-y-3">
            {channels.map((channel) => (
              <div 
                key={channel.id}
                className={`bg-white rounded-xl border transition-all duration-200 ${
                  expandedChannel === channel.id 
                    ? 'border-purple-300 shadow-lg ring-1 ring-purple-100' 
                    : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Channel Header */}
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer ${
                    channel.available ? '' : 'opacity-75'
                  }`}
                  onClick={() => channel.available && toggleChannel(channel.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${channel.iconBg} shadow-md`}>
                      {channel.icon ? (
                        <img 
                          src={channel.icon} 
                          alt={channel.name}
                          className="w-6 h-6"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <channel.fallbackIcon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="font-semibold text-neutral-800">{channel.name}</h3>
                      <p className="text-sm text-neutral-500">{channel.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(channel.status)}
                    {channel.available && (
                      expandedChannel === channel.id 
                        ? <ChevronDown className="w-5 h-5 text-neutral-400" />
                        : <ChevronRight className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content - WhatsApp */}
                {expandedChannel === channel.id && channel.id === 'whatsapp' && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                    
                    {/* PRE-CONNECTION: Show sync settings BEFORE connecting */}
                    {!isConnected && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Database className="w-5 h-5 text-purple-600" />
                          <h4 className="font-medium text-neutral-700">Configuración de Sincronización</h4>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Antes de conectar</span>
                        </div>
                        
                        <div className="p-4 bg-white rounded-lg border border-purple-200 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <RefreshCw className="w-5 h-5 text-purple-500" />
                              <div>
                                <p className="font-medium text-neutral-700">Importar Historial de Mensajes</p>
                                <p className="text-sm text-neutral-500">Desactiva para conexión instantánea</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={localSettings.syncFullHistory}
                                onChange={(e) => handleSettingChange('syncFullHistory', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                          </div>
                          
                          {localSettings.syncFullHistory && (
                            <div className="pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Clock className="w-5 h-5 text-neutral-400" />
                                  <div>
                                    <p className="font-medium text-neutral-600">Días de historial a importar</p>
                                  </div>
                                </div>
                                <select
                                  value={localSettings.daysLimitImportMessages}
                                  onChange={(e) => handleSettingChange('daysLimitImportMessages', parseInt(e.target.value))}
                                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                  <option value={3}>3 días ⚡ Rápido</option>
                                  <option value={7}>7 días</option>
                                  <option value={14}>14 días</option>
                                  <option value={30}>30 días</option>
                                  <option value={60}>60 días ⏳ Lento</option>
                                </select>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-700 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {localSettings.syncFullHistory 
                                ? `Se importarán ${localSettings.daysLimitImportMessages} días de mensajes al escanear el QR`
                                : 'Solo recibirás mensajes nuevos - conexión instantánea ⚡'}
                            </p>
                          </div>
                        </div>
                        
                        {hasChanges && (
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={handleSaveSettings}
                              disabled={isUpdatingSettings}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                              {isUpdatingSettings ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Guardar Config
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Connection Section */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-neutral-600" />
                          <h4 className="font-medium text-neutral-700">Conexión</h4>
                        </div>
                        {isConnected ? (
                          <button
                            onClick={onDisconnectWhatsApp}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Desconectar
                          </button>
                        ) : (
                          <button
                            onClick={onConnectWhatsApp}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            <QrCode className="w-4 h-4" />
                            Conectar con QR
                          </button>
                        )}
                      </div>
                      
                      {isConnected && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">WhatsApp conectado y funcionando</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Settings Section - Only show when connected */}
                    {isConnected && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-5 h-5 text-neutral-600" />
                        <h4 className="font-medium text-neutral-700">Comportamiento</h4>
                      </div>

                      <div className="space-y-4">
                        {/* Rechazar Llamadas */}
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-neutral-500" />
                            <div>
                              <p className="font-medium text-neutral-700">Rechazar Llamadas</p>
                              <p className="text-sm text-neutral-500">Rechazar todas las llamadas entrantes</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.rejectCall}
                              onChange={(e) => handleSettingChange('rejectCall', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>

                        {/* Ignorar Grupos */}
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-neutral-500" />
                            <div>
                              <p className="font-medium text-neutral-700">Ignorar Grupos</p>
                              <p className="text-sm text-neutral-500">Ignorar todos los mensajes de grupos</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.groupsIgnore}
                              onChange={(e) => handleSettingChange('groupsIgnore', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>

                        {/* Siempre Online */}
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-neutral-500" />
                            <div>
                              <p className="font-medium text-neutral-700">Siempre Online</p>
                              <p className="text-sm text-neutral-500">Permanecer siempre en línea</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.alwaysOnline}
                              onChange={(e) => handleSettingChange('alwaysOnline', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>

                        {/* Ver Mensajes */}
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <Eye className="w-5 h-5 text-neutral-500" />
                            <div>
                              <p className="font-medium text-neutral-700">Ver Mensajes</p>
                              <p className="text-sm text-neutral-500">Marcar todos los mensajes como leídos</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.readMessages}
                              onChange={(e) => handleSettingChange('readMessages', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>

                        {/* Ver Estado */}
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <Eye className="w-5 h-5 text-neutral-500" />
                            <div>
                              <p className="font-medium text-neutral-700">Ver Estado</p>
                              <p className="text-sm text-neutral-500">Marcar todos los estados como vistos</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.readStatus}
                              onChange={(e) => handleSettingChange('readStatus', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Save Button */}
                      {hasChanges && (
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={handleSaveSettings}
                            disabled={isUpdatingSettings}
                            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            {isUpdatingSettings ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Guardar Cambios
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Herramientas */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-neutral-800">Herramientas</h2>
          </div>
          
          <div className="space-y-3">
            {/* Google Calendar - Funcional */}
            <div className={`bg-white rounded-xl border transition-all duration-200 ${
              expandedTool === 'calendar'
                ? 'border-rose-300 shadow-lg ring-1 ring-rose-100'
                : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
            }`}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedTool(expandedTool === 'calendar' ? null : 'calendar')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #DC2626, #DC2626DD)' }}>
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800">Google Calendar</h3>
                    <p className="text-sm text-neutral-500">Integra con Google Calendar para agendar citas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {gcalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                  ) : gcalConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      No conectado
                    </span>
                  )}
                  {expandedTool === 'calendar'
                    ? <ChevronDown className="w-5 h-5 text-neutral-400" />
                    : <ChevronRight className="w-5 h-5 text-neutral-400" />
                  }
                </div>
              </div>

              {expandedTool === 'calendar' && (
                <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                  {gcalConnected ? (
                    <div className="space-y-4">
                      {/* Connected Info */}
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Google Calendar conectado</span>
                          </div>
                          {gcalIntegration?.provider_email && (
                            <span className="text-xs text-green-600">{gcalIntegration.provider_email}</span>
                          )}
                        </div>
                      </div>

                      {/* Bot Access Toggle */}
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${gcalIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
                          <div>
                            <p className="font-medium text-neutral-700">Acceso de WITHMIA</p>
                            <p className="text-sm text-neutral-500">
                              {gcalIntegration?.bot_access_enabled
                                ? 'WITHMIA puede consultar y crear eventos'
                                : 'Activa para que WITHMIA agende citas'}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gcalIntegration?.bot_access_enabled || false}
                            onChange={toggleGcalBotAccess}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {/* Disconnect */}
                      <div className="flex justify-end">
                        <button
                          onClick={disconnectGoogleCalendar}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Unlink className="w-4 h-4" />
                          Desconectar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-rose-50 rounded-lg flex-shrink-0">
                            <svg className="w-8 h-8" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-800 mb-1">Conecta tu Google Calendar</h4>
                            <p className="text-sm text-neutral-500 mb-3">
                              Sincroniza tu calendario de Google para que WITHMIA pueda consultar disponibilidad y agendar citas automáticamente con tus clientes.
                            </p>
                            <ul className="text-xs text-neutral-500 space-y-1">
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Ver disponibilidad en tiempo real</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Agendar reuniones automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Sincronización bidireccional</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={connectGoogleCalendar}
                        disabled={gcalConnecting}
                        className="w-full py-3 bg-white border-2 border-slate-200 hover:border-rose-300 text-neutral-700 hover:text-rose-600 font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {gcalConnecting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                        ) : (
                          <><Link2 className="w-4 h-4" /> Conectar con Google</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Other tools - Coming Soon */}
            {tools.filter(t => t.id !== 'calendar').map((tool) => (
              <div 
                key={tool.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="p-3 rounded-xl shadow-md"
                      style={{ background: `linear-gradient(135deg, ${tool.color}, ${tool.color}DD)` }}
                    >
                      <tool.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-800">{tool.name}</h3>
                      <p className="text-sm text-neutral-500">{tool.description}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                    <Clock className="w-3 h-3" />
                    Próximamente
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default IntegrationSection;
