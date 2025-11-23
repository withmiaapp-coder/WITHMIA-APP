import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, Smartphone, MessageCircle, AlertCircle, Check } from 'lucide-react';

interface NotificationSettings {
  whatsappConnection: boolean;
  whatsappDisconnection: boolean;
  newLeads: boolean;
  newMessages: boolean;
  mentionsOnly: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

export default function NotificationsSettings() {
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

  const notificationsHook = useNotifications();

  useEffect(() => {
    // Cargar configuración guardada
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Solicitar permisos cuando se active las notificaciones de escritorio
  useEffect(() => {
    if (settings.desktopNotifications && notificationsHook.permission !== 'granted') {
      notificationsHook.requestPermission().then(result => {
        if (result === 'denied') {
          alert('⚠️ Has bloqueado las notificaciones de escritorio. Para activarlas, permite las notificaciones en la configuración de tu navegador.');
        }
      });
    }
  }, [settings.desktopNotifications]);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    // Sincronizar con el hook de notificaciones
    notificationsHook.updateConfig({
      desktopEnabled: settings.desktopNotifications,
      soundEnabled: settings.soundEnabled
    });
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const SettingItem = ({
    icon: Icon,
    title,
    description,
    settingKey
  }: {
    icon: any,
    title: string,
    description: string,
    settingKey: keyof NotificationSettings
  }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => handleToggle(settingKey)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          settings[settingKey] ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            settings[settingKey] ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Notificaciones</h1>
        <p className="text-sm text-gray-600">
          Configura qué notificaciones deseas recibir y cómo quieres que te avisen
        </p>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Configuración guardada exitosamente</span>
        </div>
      )}

      {/* Secciones de configuración */}
      <div className="space-y-8">
        {/* Sección WhatsApp QR */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            WhatsApp QR
          </h3>
          <div className="space-y-3">
            <SettingItem
              icon={Check}
              title="Conexión exitosa"
              description="Notificar cuando la instancia de WhatsApp se conecta correctamente con fecha y hora"
              settingKey="whatsappConnection"
            />
            <SettingItem
              icon={AlertCircle}
              title="Desconexión"
              description="Alertar cuando el código QR de WhatsApp se desconecta con fecha y hora"
              settingKey="whatsappDisconnection"
            />
          </div>
        </div>

        {/* Sección Mensajes */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            Mensajes
          </h3>
          <div className="space-y-3">
            <SettingItem
              icon={MessageCircle}
              title="Nuevos Leads"
              description="Notificar cuando una persona te contacta por primera vez con el sistema WITHMIA activado"
              settingKey="newLeads"
            />
            <SettingItem
              icon={MessageCircle}
              title="Nuevos mensajes"
              description="Recibir notificaciones de todos los mensajes nuevos"
              settingKey="newMessages"
            />
            <SettingItem
              icon={AlertCircle}
              title="Solo menciones"
              description="Notificar únicamente cuando te mencionan directamente"
              settingKey="mentionsOnly"
            />
          </div>
        </div>

        {/* Sección Preferencias */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            Preferencias
          </h3>
          <div className="space-y-3">
            <SettingItem
              icon={Bell}
              title="Sonido"
              description="Reproducir un sonido cuando llegue una notificación"
              settingKey="soundEnabled"
            />
            <SettingItem
              icon={Bell}
              title="Notificaciones de escritorio"
              description="Mostrar notificaciones del sistema operativo"
              settingKey="desktopNotifications"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 mt-8 border-t border-gray-200">
        <button
          onClick={() => {
            notificationsHook.notify({
              conversationId: 999,
              conversationName: 'Prueba de Notificación',
              message: '¡Las notificaciones están funcionando correctamente! 🎉',
              priority: 'high',
              avatar: 'P',
              assignedToMe: true
            });
          }}
          className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2 border border-gray-300"
        >
          <Bell className="w-5 h-5" />
          Probar Notificación
        </button>
        
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
        >
          <Check className="w-5 h-5" />
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
