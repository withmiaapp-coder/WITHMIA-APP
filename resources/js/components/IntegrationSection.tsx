import React, { useState } from 'react';
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
  Plug
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
            <div className="p-4 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl shadow-lg">
              <Plug className="w-10 h-10 text-white" />
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
            {tools.map((tool) => (
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
