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
  ShoppingCart,
  ShoppingBag,
  Calendar,
  CalendarDays,
  Cloud,
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
  ExternalLink,
  Copy,
  Code,
  Palette,
  AtSign,
  Send,
  Shield,
  Smartphone,
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
  onIntegrationChange?: () => void;
  onNavigateToProducts?: () => void;
}

const IntegrationSection: React.FC<IntegrationSectionProps> = ({
  whatsAppStatus,
  whatsAppSettings,
  onConnectWhatsApp,
  onDisconnectWhatsApp,
  onUpdateSettings,
  isUpdatingSettings = false,
  onIntegrationChange,
  onNavigateToProducts,
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

  // Calendly state
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [calendlyConnecting, setCalendlyConnecting] = useState(false);
  const [calendlyIntegration, setCalendlyIntegration] = useState<any>(null);
  const [calendlyLoading, setCalendlyLoading] = useState(true);

  // Outlook state
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookConnecting, setOutlookConnecting] = useState(false);
  const [outlookIntegration, setOutlookIntegration] = useState<any>(null);
  const [outlookLoading, setOutlookLoading] = useState(true);
  const [outlookError, setOutlookError] = useState('');

  // Reservo state
  const [reservoConnected, setReservoConnected] = useState(false);
  const [reservoIntegration, setReservoIntegration] = useState<any>(null);
  const [reservoLoading, setReservoLoading] = useState(true);
  const [reservoApiKey, setReservoApiKey] = useState('');
  const [reservoSubdomain, setReservoSubdomain] = useState('');
  const [reservoConnecting, setReservoConnecting] = useState(false);
  const [reservoError, setReservoError] = useState('');

  // AgendaPro state
  const [agendaproConnected, setAgendaproConnected] = useState(false);
  const [agendaproIntegration, setAgendaproIntegration] = useState<any>(null);
  const [agendaproLoading, setAgendaproLoading] = useState(true);
  const [agendaproApiKey, setAgendaproApiKey] = useState('');
  const [agendaproConnecting, setAgendaproConnecting] = useState(false);
  const [agendaproError, setAgendaproError] = useState('');

  // Product integrations state
  const [productIntegrations, setProductIntegrations] = useState<Record<string, any>>({});
  const [productIntegrationsLoading, setProductIntegrationsLoading] = useState(true);

  // Chatwoot channels state (Instagram, Messenger, Web Chat, Email, WhatsApp Cloud API)
  const [chatwootChannels, setChatwootChannels] = useState<Record<string, any>>({});
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelConnecting, setChannelConnecting] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [channelSuccess, setChannelSuccess] = useState<string | null>(null);

  // Web Chat Widget form
  const [webChatUrl, setWebChatUrl] = useState('');
  const [webChatColor, setWebChatColor] = useState('#6366f1');
  const [webChatTitle, setWebChatTitle] = useState('¡Hola! 👋');
  const [webChatTagline, setWebChatTagline] = useState('Estamos aquí para ayudarte');
  const [widgetScript, setWidgetScript] = useState('');

  // Email form
  const [emailForm, setEmailForm] = useState({
    email: '', imap_address: 'imap.gmail.com', imap_port: 993, imap_login: '',
    imap_password: '', imap_enable_ssl: true, smtp_address: 'smtp.gmail.com',
    smtp_port: 587, smtp_login: '', smtp_password: '', smtp_enable_ssl_tls: true,
  });

  // Facebook/Instagram form
  const [fbPageToken, setFbPageToken] = useState('');
  const [fbPageId, setFbPageId] = useState('');
  const [fbPageName, setFbPageName] = useState('');
  const [igId, setIgId] = useState('');

  // WhatsApp Cloud API form
  const [waCloudPhone, setWaCloudPhone] = useState('');
  const [waCloudPhoneId, setWaCloudPhoneId] = useState('');
  const [waCloudBusinessId, setWaCloudBusinessId] = useState('');
  const [waCloudApiKey, setWaCloudApiKey] = useState('');

  // Unified product provider state: { [providerId]: { fields: {fieldKey: value}, connecting: bool, error: string } }
  const [providerForms, setProviderForms] = useState<Record<string, { fields: Record<string, string>; connecting: boolean; error: string }>>({});
  const [syncingProductProvider, setSyncingProductProvider] = useState<string | null>(null);
  const [customConnectionType, setCustomConnectionType] = useState<'api' | 'mysql'>('mysql');

  const getProviderForm = (id: string) => providerForms[id] || { fields: {}, connecting: false, error: '' };
  const setProviderField = (id: string, key: string, value: string) => setProviderForms(prev => ({ ...prev, [id]: { ...getProviderForm(id), ...prev[id], fields: { ...(prev[id]?.fields || {}), [key]: value } } }));
  const setProviderConnecting = (id: string, v: boolean) => setProviderForms(prev => ({ ...prev, [id]: { ...(prev[id] || { fields: {}, connecting: false, error: '' }), connecting: v } }));
  const setProviderError = (id: string, v: string) => setProviderForms(prev => ({ ...prev, [id]: { ...(prev[id] || { fields: {}, connecting: false, error: '' }), error: v } }));
  const resetProviderFields = (id: string) => setProviderForms(prev => ({ ...prev, [id]: { fields: {}, connecting: false, error: '' } }));

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
            onIntegrationChange?.();
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
            onIntegrationChange?.();
          }, 500);
        }
      }, 1000);

      setTimeout(() => { clearInterval(pollInterval); window.removeEventListener('message', handleMessage); setGcalConnecting(false); }, 300000);
    } catch (err) {
      console.error('Error connecting Google Calendar:', err);
      setGcalConnecting(false);
    }
  }, [gcalApiFetch, loadGcalStatus, onIntegrationChange]);

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = useCallback(async () => {
    if (!confirm('¿Desconectar Google Calendar? WITHMIA perderá acceso al calendario.')) return;
    try {
      await gcalApiFetch('/api/calendar/google/disconnect', { method: 'POST' });
      setGcalConnected(false);
      setGcalIntegration(null);
      onIntegrationChange?.();
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, [gcalApiFetch, onIntegrationChange]);

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

  // ========== CALENDLY ==========
  const loadCalendlyStatus = useCallback(async () => {
    try {
      setCalendlyLoading(true);
      const data = await gcalApiFetch('/api/calendly/status');
      setCalendlyConnected(data.connected);
      setCalendlyIntegration(data.integration);
    } catch (err) { console.error('Error loading Calendly status:', err); }
    finally { setCalendlyLoading(false); }
  }, [gcalApiFetch]);

  const connectCalendly = useCallback(async () => {
    try {
      setCalendlyConnecting(true);
      const data = await gcalApiFetch('/api/calendly/auth-url');
      const authWindow = window.open(data.auth_url, 'calendly_auth', 'width=600,height=700,left=200,top=100');
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'calendly_oauth_result') {
          window.removeEventListener('message', handleMessage);
          setCalendlyConnecting(false);
          if (event.data.status === 'success') { await loadCalendlyStatus(); onIntegrationChange?.(); }
        }
      };
      window.addEventListener('message', handleMessage);
      const pollInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollInterval);
          setTimeout(async () => { setCalendlyConnecting(false); window.removeEventListener('message', handleMessage); await loadCalendlyStatus(); onIntegrationChange?.(); }, 500);
        }
      }, 1000);
      setTimeout(() => { clearInterval(pollInterval); window.removeEventListener('message', handleMessage); setCalendlyConnecting(false); }, 300000);
    } catch (err) { console.error('Error connecting Calendly:', err); setCalendlyConnecting(false); }
  }, [gcalApiFetch, loadCalendlyStatus, onIntegrationChange]);

  const disconnectCalendly = useCallback(async () => {
    if (!confirm('¿Desconectar Calendly? WITHMIA perderá acceso.')) return;
    try {
      await gcalApiFetch('/api/calendly/disconnect', { method: 'POST' });
      setCalendlyConnected(false);
      setCalendlyIntegration(null);
      onIntegrationChange?.();
    } catch (err) { console.error('Error disconnecting Calendly:', err); }
  }, [gcalApiFetch, onIntegrationChange]);

  const toggleCalendlyBotAccess = useCallback(async () => {
    if (!calendlyIntegration) return;
    try {
      const data = await gcalApiFetch('/api/calendly/settings', {
        method: 'PUT',
        body: JSON.stringify({ bot_access_enabled: !calendlyIntegration.bot_access_enabled }),
      });
      setCalendlyIntegration(data.integration);
    } catch (err) { console.error('Error toggling Calendly bot access:', err); }
  }, [calendlyIntegration, gcalApiFetch]);

  // ========== OUTLOOK ==========
  const loadOutlookStatus = useCallback(async () => {
    try {
      setOutlookLoading(true);
      const data = await gcalApiFetch('/api/outlook/status');
      setOutlookConnected(data.connected);
      setOutlookIntegration(data.integration);
    } catch (err) { console.error('Error loading Outlook status:', err); }
    finally { setOutlookLoading(false); }
  }, [gcalApiFetch]);

  const connectOutlook = useCallback(async () => {
    try {
      setOutlookConnecting(true);
      const data = await gcalApiFetch('/api/outlook/auth-url');
      const authWindow = window.open(data.auth_url, 'outlook_auth', 'width=600,height=700,left=200,top=100');
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'outlook_oauth_result') {
          window.removeEventListener('message', handleMessage);
          setOutlookConnecting(false);
          if (event.data.status === 'success') { await loadOutlookStatus(); onIntegrationChange?.(); }
        }
      };
      window.addEventListener('message', handleMessage);
      const pollInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollInterval);
          setTimeout(async () => { setOutlookConnecting(false); window.removeEventListener('message', handleMessage); await loadOutlookStatus(); onIntegrationChange?.(); }, 500);
        }
      }, 1000);
      setTimeout(() => { clearInterval(pollInterval); window.removeEventListener('message', handleMessage); setOutlookConnecting(false); }, 300000);
    } catch (err: any) {
      console.error('Error connecting Outlook:', err);
      const msg = err?.message || '';
      if (msg.includes('500') || msg.includes('not configured')) {
        setOutlookError('Outlook Calendar no está configurado aún. Contacta al administrador para configurar las credenciales de Microsoft.');
      } else {
        setOutlookError('Error al conectar Outlook Calendar');
      }
      setOutlookConnecting(false);
    }
  }, [gcalApiFetch, loadOutlookStatus, onIntegrationChange]);

  const disconnectOutlook = useCallback(async () => {
    if (!confirm('¿Desconectar Outlook Calendar? WITHMIA perderá acceso.')) return;
    try {
      await gcalApiFetch('/api/outlook/disconnect', { method: 'POST' });
      setOutlookConnected(false);
      setOutlookIntegration(null);
      onIntegrationChange?.();
    } catch (err) { console.error('Error disconnecting Outlook:', err); }
  }, [gcalApiFetch, onIntegrationChange]);

  const toggleOutlookBotAccess = useCallback(async () => {
    if (!outlookIntegration) return;
    try {
      const data = await gcalApiFetch('/api/outlook/settings', {
        method: 'PUT',
        body: JSON.stringify({ bot_access_enabled: !outlookIntegration.bot_access_enabled }),
      });
      setOutlookIntegration(data.integration);
    } catch (err) { console.error('Error toggling Outlook bot access:', err); }
  }, [outlookIntegration, gcalApiFetch]);

  // ========== RESERVO ==========
  const loadReservoStatus = useCallback(async () => {
    try {
      setReservoLoading(true);
      const data = await gcalApiFetch('/api/reservo/status');
      setReservoConnected(data.connected);
      setReservoIntegration(data.integration);
    } catch (err) { console.error('Error loading Reservo status:', err); }
    finally { setReservoLoading(false); }
  }, [gcalApiFetch]);

  const connectReservo = useCallback(async () => {
    if (!reservoApiKey || !reservoSubdomain) {
      setReservoError('Ingresa tu API Key y subdominio de Reservo');
      return;
    }
    setReservoConnecting(true);
    setReservoError('');
    try {
      const data = await gcalApiFetch('/api/reservo/connect', {
        method: 'POST',
        body: JSON.stringify({ api_key: reservoApiKey, subdomain: reservoSubdomain }),
      });
      if (data.success) {
        setReservoApiKey('');
        setReservoSubdomain('');
        await loadReservoStatus();
        onIntegrationChange?.();
      }
    } catch (err: any) {
      setReservoError('API Key o subdominio inválido');
    } finally { setReservoConnecting(false); }
  }, [reservoApiKey, reservoSubdomain, gcalApiFetch, loadReservoStatus, onIntegrationChange]);

  const disconnectReservo = useCallback(async () => {
    if (!confirm('¿Desconectar Reservo?')) return;
    try {
      await gcalApiFetch('/api/reservo/disconnect', { method: 'POST' });
      setReservoConnected(false);
      setReservoIntegration(null);
      onIntegrationChange?.();
    } catch (err) { console.error('Error disconnecting Reservo:', err); }
  }, [gcalApiFetch, onIntegrationChange]);

  const toggleReservoBotAccess = useCallback(async () => {
    if (!reservoIntegration) return;
    try {
      const data = await gcalApiFetch('/api/reservo/settings', {
        method: 'PUT',
        body: JSON.stringify({ bot_access_enabled: !reservoIntegration.bot_access_enabled }),
      });
      setReservoIntegration(data.integration);
    } catch (err) { console.error('Error toggling Reservo bot access:', err); }
  }, [reservoIntegration, gcalApiFetch]);

  // ========== AGENDAPRO ==========
  const loadAgendaproStatus = useCallback(async () => {
    try {
      setAgendaproLoading(true);
      const data = await gcalApiFetch('/api/agendapro/status');
      setAgendaproConnected(data.connected);
      setAgendaproIntegration(data.integration);
    } catch (err) { console.error('Error loading AgendaPro status:', err); }
    finally { setAgendaproLoading(false); }
  }, [gcalApiFetch]);

  const connectAgendapro = useCallback(async () => {
    if (!agendaproApiKey) {
      setAgendaproError('Ingresa tu API Key de AgendaPro');
      return;
    }
    setAgendaproConnecting(true);
    setAgendaproError('');
    try {
      const data = await gcalApiFetch('/api/agendapro/connect', {
        method: 'POST',
        body: JSON.stringify({ api_key: agendaproApiKey }),
      });
      if (data.success) {
        setAgendaproApiKey('');
        await loadAgendaproStatus();
        onIntegrationChange?.();
      }
    } catch (err: any) {
      setAgendaproError('API Key inválida');
    } finally { setAgendaproConnecting(false); }
  }, [agendaproApiKey, gcalApiFetch, loadAgendaproStatus, onIntegrationChange]);

  const disconnectAgendapro = useCallback(async () => {
    if (!confirm('¿Desconectar AgendaPro?')) return;
    try {
      await gcalApiFetch('/api/agendapro/disconnect', { method: 'POST' });
      setAgendaproConnected(false);
      setAgendaproIntegration(null);
      onIntegrationChange?.();
    } catch (err) { console.error('Error disconnecting AgendaPro:', err); }
  }, [gcalApiFetch, onIntegrationChange]);

  const toggleAgendaproBotAccess = useCallback(async () => {
    if (!agendaproIntegration) return;
    try {
      const data = await gcalApiFetch('/api/agendapro/settings', {
        method: 'PUT',
        body: JSON.stringify({ bot_access_enabled: !agendaproIntegration.bot_access_enabled }),
      });
      setAgendaproIntegration(data.integration);
    } catch (err) { console.error('Error toggling AgendaPro bot access:', err); }
  }, [agendaproIntegration, gcalApiFetch]);

  // ========== PRODUCT INTEGRATIONS ==========
  const loadProductIntegrations = useCallback(async () => {
    try {
      setProductIntegrationsLoading(true);
      const data = await gcalApiFetch('/api/product-integrations/status');
      setProductIntegrations(data.integrations || {});
    } catch (err) {
      console.error('Error loading product integrations:', err);
    } finally {
      setProductIntegrationsLoading(false);
    }
  }, [gcalApiFetch]);

  const connectProductProvider = useCallback(async (provider: string, credentials: Record<string, string>) => {
    try {
      const result = await gcalApiFetch('/api/product-integrations/connect', {
        method: 'POST',
        body: JSON.stringify({ provider, ...credentials }),
      });
      if (result.success) {
        await loadProductIntegrations();
        onIntegrationChange?.();
        // Auto-sync after connecting
        syncProductProvider(provider);
      }
    } catch (err: any) {
      throw err;
    }
  }, [gcalApiFetch, loadProductIntegrations, onIntegrationChange]);

  const disconnectProductProvider = useCallback(async (provider: string) => {
    if (!confirm('¿Desconectar esta tienda? Los productos sincronizados se mantendrán.')) return;
    try {
      await gcalApiFetch('/api/product-integrations/disconnect', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      await loadProductIntegrations();
      onIntegrationChange?.();
    } catch (err) { console.error('Error disconnecting product provider:', err); }
  }, [gcalApiFetch, loadProductIntegrations, onIntegrationChange]);

  const syncProductProvider = useCallback(async (provider: string) => {
    try {
      setSyncingProductProvider(provider);
      await gcalApiFetch('/api/product-integrations/sync', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      await loadProductIntegrations();
    } catch (err) { console.error('Error syncing product provider:', err); }
    finally { setSyncingProductProvider(null); }
  }, [gcalApiFetch, loadProductIntegrations]);

  const toggleProductBotAccess = useCallback(async (provider: string) => {
    try {
      await gcalApiFetch('/api/product-integrations/toggle-bot-access', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      await loadProductIntegrations();
    } catch (err) { console.error('Error toggling product bot access:', err); }
  }, [gcalApiFetch, loadProductIntegrations]);

  // Generic connect function for any product provider
  const connectProvider = useCallback(async (providerId: string, credentialMap: Record<string, string>, requiredFields: string[], extraParams?: Record<string, string>) => {
    const form = getProviderForm(providerId);
    const missing = requiredFields.filter(f => !form.fields[f]?.trim());
    if (missing.length > 0) {
      setProviderError(providerId, 'Completa todos los campos requeridos');
      return;
    }
    setProviderConnecting(providerId, true);
    setProviderError(providerId, '');
    try {
      const creds: Record<string, string> = { ...(extraParams || {}) };
      for (const [apiKey, formKey] of Object.entries(credentialMap)) {
        creds[apiKey] = form.fields[formKey] || '';
      }
      await connectProductProvider(providerId, creds);
      resetProviderFields(providerId);
    } catch (err: any) {
      setProviderError(providerId, 'No se pudo conectar. Verifica tus credenciales.');
    } finally {
      setProviderConnecting(providerId, false);
    }
  }, [connectProductProvider]);

  useEffect(() => {
    loadGcalStatus();
    loadCalendlyStatus();
    loadOutlookStatus();
    loadReservoStatus();
    loadAgendaproStatus();
    loadProductIntegrations();
    loadChatwootChannels();
  }, [loadGcalStatus, loadCalendlyStatus, loadOutlookStatus, loadReservoStatus, loadAgendaproStatus, loadProductIntegrations]);

  // Load Chatwoot channel statuses
  const loadChatwootChannels = useCallback(async () => {
    try {
      setChannelsLoading(true);
      const data = await gcalApiFetch('/api/channels');
      const channelMap: Record<string, any> = {};
      (data.channels || []).forEach((ch: any) => {
        channelMap[ch.id] = ch;
      });
      setChatwootChannels(channelMap);
    } catch (err) {
      console.error('Error loading channels:', err);
    } finally {
      setChannelsLoading(false);
    }
  }, [gcalApiFetch]);

  // Connect a new channel
  const connectChannel = async (channelId: string, endpoint: string, payload: any) => {
    setChannelConnecting(channelId);
    setChannelError(null);
    setChannelSuccess(null);
    try {
      const data = await gcalApiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.success) {
        setChannelSuccess(`¡${channelId === 'web-chat' ? 'Widget' : 'Canal'} conectado exitosamente!`);
        if (data.inbox?.website_token && channelId === 'web-chat') {
          // Fetch widget script
          const scriptData = await gcalApiFetch(`/api/channels/${data.inbox.id}/widget-script`);
          setWidgetScript(scriptData.script || '');
        }
        await loadChatwootChannels();
        onIntegrationChange?.();
      } else {
        setChannelError(data.error || 'Error al conectar canal');
      }
    } catch (err: any) {
      setChannelError(err.message || 'Error de conexión');
    } finally {
      setChannelConnecting(null);
    }
  };

  // Disconnect a channel
  const disconnectChannel = async (channelId: string) => {
    const channel = chatwootChannels[channelId];
    if (!channel?.inbox_id) return;
    setChannelConnecting(channelId);
    setChannelError(null);
    try {
      await gcalApiFetch(`/api/channels/${channel.inbox_id}`, { method: 'DELETE' });
      setChannelSuccess('Canal desconectado');
      await loadChatwootChannels();
      onIntegrationChange?.();
    } catch (err: any) {
      setChannelError(err.message || 'Error al desconectar');
    } finally {
      setChannelConnecting(null);
    }
  };

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
  const getChannelStatus = (id: string) => chatwootChannels[id] ? 'connected' : 'disconnected';
  
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
      id: 'web-chat',
      name: 'Chat Web / Widget',
      description: 'Agrega un widget de chat en vivo a tu sitio web',
      icon: null,
      fallbackIcon: Globe,
      iconBg: 'from-indigo-500 to-purple-600',
      status: getChannelStatus('web-chat'),
      available: true
    },
    {
      id: 'gmail',
      name: 'Email / Gmail',
      description: 'Conecta tu correo electrónico para gestionar soporte por email',
      icon: null,
      fallbackIcon: Mail,
      iconBg: 'from-red-500 to-orange-500',
      status: getChannelStatus('email'),
      available: true
    },
    {
      id: 'instagram',
      name: 'Instagram Direct',
      description: 'Recibe y responde mensajes directos de Instagram',
      icon: '/icons/instagram-new.webp',
      fallbackIcon: MessageSquare,
      iconBg: 'from-pink-500 to-rose-500',
      status: getChannelStatus('instagram'),
      available: true
    },
    {
      id: 'messenger',
      name: 'Facebook Messenger',
      description: 'Conecta tu página de Facebook para atender por Messenger',
      icon: '/icons/facebook-new.webp',
      fallbackIcon: Mail,
      iconBg: 'from-blue-500 to-indigo-500',
      status: getChannelStatus('messenger'),
      available: true
    },
    {
      id: 'whatsapp-api',
      name: 'WhatsApp Cloud API',
      description: 'API oficial de WhatsApp Business de Meta (sin QR, números verificados)',
      icon: null,
      fallbackIcon: Smartphone,
      iconBg: 'from-emerald-600 to-teal-600',
      status: getChannelStatus('whatsapp-api'),
      available: true
    },
  ];

  // Herramientas
  const tools = [
    { id: 'woocommerce', name: 'WooCommerce', icon: ShoppingCart, color: '#96588A', description: 'Conecta tu tienda WooCommerce' },
    { id: 'shopify', name: 'Shopify', icon: ShoppingBag, color: '#96BF48', description: 'Sincroniza con tu tienda Shopify' },
    { id: 'reservo', name: 'Reservo', icon: Calendar, color: '#F59E0B', description: 'Sistema de reservas y citas' },
    { id: 'agendapro', name: 'AgendaPro', icon: Calendar, color: '#00C4B4', description: 'Gestión de citas con AgendaPro' },
    { id: 'calendar', name: 'Google Calendar', icon: CalendarDays, color: '#DC2626', description: 'Integra con Google Calendar' },
    { id: 'outlook', name: 'Outlook Calendar', icon: CalendarDays, color: '#0078D4', description: 'Integra con Outlook Calendar' },
    { id: 'calendly', name: 'Calendly', icon: CalendarDays, color: '#006BFF', description: 'Agenda reuniones con Calendly' },
    { id: 'mercadolibre', name: 'MercadoLibre', icon: Store, color: '#FFE600', description: 'Conecta tu tienda MercadoLibre' },
    { id: 'custom_api', name: 'Base de datos / API', icon: Database, color: '#0ea5e9', description: 'MySQL directo o endpoint REST' },
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

                {/* Expanded Content - Web Chat Widget */}
                {expandedChannel === channel.id && channel.id === 'web-chat' && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                    {chatwootChannels['web-chat'] ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 mb-4">
                          <Check className="w-5 h-5" />
                          <span className="font-semibold">Widget conectado</span>
                        </div>
                        {widgetScript && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-neutral-700">
                              <Code className="w-4 h-4 inline mr-1" />
                              Código para insertar en tu sitio web:
                            </label>
                            <div className="relative">
                              <pre className="bg-neutral-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">{widgetScript}</pre>
                              <button
                                onClick={() => { navigator.clipboard.writeText(widgetScript); setChannelSuccess('¡Código copiado!'); setTimeout(() => setChannelSuccess(null), 2000); }}
                                className="absolute top-2 right-2 p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-white transition-colors"
                                title="Copiar código"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-neutral-500">Pega este código antes de la etiqueta &lt;/body&gt; en tu sitio web.</p>
                          </div>
                        )}
                        <button
                          onClick={() => { if (confirm('¿Desconectar el widget de chat web?')) disconnectChannel('web-chat'); }}
                          disabled={channelConnecting === 'web-chat'}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Unlink className="w-4 h-4" />
                          Desconectar Widget
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-5 h-5 text-indigo-600" />
                          <h4 className="font-semibold text-neutral-800">Configurar Widget de Chat Web</h4>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">Agrega un widget de chat en vivo a tu sitio web para que tus visitantes puedan escribirte directamente.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">URL de tu sitio web *</label>
                            <input
                              type="url"
                              value={webChatUrl}
                              onChange={(e) => setWebChatUrl(e.target.value)}
                              placeholder="https://tusitio.com"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              <Palette className="w-3.5 h-3.5 inline mr-1" />
                              Color del widget
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={webChatColor}
                                onChange={(e) => setWebChatColor(e.target.value)}
                                className="w-10 h-10 rounded-lg border border-neutral-300 cursor-pointer"
                              />
                              <span className="text-sm text-neutral-500">{webChatColor}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Título de bienvenida</label>
                            <input
                              type="text"
                              value={webChatTitle}
                              onChange={(e) => setWebChatTitle(e.target.value)}
                              placeholder="¡Hola! 👋"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Subtítulo</label>
                            <input
                              type="text"
                              value={webChatTagline}
                              onChange={(e) => setWebChatTagline(e.target.value)}
                              placeholder="Estamos aquí para ayudarte"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                            />
                          </div>
                        </div>

                        {channelError && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError}
                          </div>
                        )}

                        <button
                          onClick={() => connectChannel('web-chat', '/api/channels/web-widget', {
                            website_url: webChatUrl,
                            widget_color: webChatColor,
                            welcome_title: webChatTitle,
                            welcome_tagline: webChatTagline,
                          })}
                          disabled={channelConnecting === 'web-chat' || !webChatUrl}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          {channelConnecting === 'web-chat' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                          ) : (
                            <><Globe className="w-4 h-4" /> Crear Widget</>
                          )}
                        </button>
                      </div>
                    )}

                    {channelSuccess && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {channelSuccess}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Content - Email / Gmail */}
                {expandedChannel === channel.id && channel.id === 'gmail' && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                    {chatwootChannels['email'] ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <Check className="w-5 h-5" />
                          <span className="font-semibold">Correo conectado</span>
                        </div>
                        <p className="text-sm text-neutral-600">
                          Email: <span className="font-medium">{chatwootChannels['email']?.email || 'Configurado'}</span>
                        </p>
                        <button
                          onClick={() => { if (confirm('¿Desconectar el canal de email?')) disconnectChannel('email'); }}
                          disabled={channelConnecting === 'gmail'}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Unlink className="w-4 h-4" />
                          Desconectar Email
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-5 h-5 text-red-500" />
                          <h4 className="font-semibold text-neutral-800">Configurar Email / Gmail</h4>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">Conecta tu correo electrónico para recibir y responder emails como conversaciones. Los campos vienen preconfigurados para Gmail.</p>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Dirección de email *</label>
                            <input
                              type="email"
                              value={emailForm.email}
                              onChange={(e) => { setEmailForm(p => ({ ...p, email: e.target.value, imap_login: e.target.value, smtp_login: e.target.value })); }}
                              placeholder="tu@gmail.com"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                            />
                          </div>

                          {/* IMAP Settings */}
                          <div className="p-4 bg-white border border-neutral-200 rounded-lg">
                            <h5 className="text-sm font-semibold text-neutral-700 mb-3">📥 Configuración IMAP (recepción)</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Servidor IMAP</label>
                                <input type="text" value={emailForm.imap_address} onChange={(e) => setEmailForm(p => ({ ...p, imap_address: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Puerto</label>
                                <input type="number" value={emailForm.imap_port} onChange={(e) => setEmailForm(p => ({ ...p, imap_port: parseInt(e.target.value) || 993 }))}
                                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-neutral-500 mb-1">Contraseña de aplicación *</label>
                                <input type="password" value={emailForm.imap_password}
                                  onChange={(e) => setEmailForm(p => ({ ...p, imap_password: e.target.value, smtp_password: e.target.value }))}
                                  placeholder="Contraseña de app de Gmail"
                                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                                <p className="text-xs text-neutral-400 mt-1">
                                  Para Gmail: usa una <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">contraseña de aplicación</a>.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* SMTP Settings */}
                          <div className="p-4 bg-white border border-neutral-200 rounded-lg">
                            <h5 className="text-sm font-semibold text-neutral-700 mb-3">📤 Configuración SMTP (envío)</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Servidor SMTP</label>
                                <input type="text" value={emailForm.smtp_address} onChange={(e) => setEmailForm(p => ({ ...p, smtp_address: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Puerto</label>
                                <input type="number" value={emailForm.smtp_port} onChange={(e) => setEmailForm(p => ({ ...p, smtp_port: parseInt(e.target.value) || 587 }))}
                                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {channelError && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError}
                          </div>
                        )}

                        <button
                          onClick={() => connectChannel('email', '/api/channels/email', emailForm)}
                          disabled={channelConnecting === 'gmail' || !emailForm.email || !emailForm.imap_password}
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          {channelConnecting === 'gmail' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                          ) : (
                            <><Mail className="w-4 h-4" /> Conectar Email</>
                          )}
                        </button>
                      </div>
                    )}

                    {channelSuccess && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {channelSuccess}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Content - Instagram */}
                {expandedChannel === channel.id && channel.id === 'instagram' && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                    {chatwootChannels['instagram'] ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <Check className="w-5 h-5" />
                          <span className="font-semibold">Instagram conectado</span>
                        </div>
                        <button
                          onClick={() => { if (confirm('¿Desconectar Instagram?')) disconnectChannel('instagram'); }}
                          disabled={channelConnecting === 'instagram'}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Unlink className="w-4 h-4" />
                          Desconectar Instagram
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AtSign className="w-5 h-5 text-pink-500" />
                          <h4 className="font-semibold text-neutral-800">Conectar Instagram Direct</h4>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">Requisitos:</p>
                            <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                              <li>Cuenta de Instagram <strong>Business</strong> o <strong>Creator</strong></li>
                              <li>Página de Facebook conectada a tu cuenta de Instagram</li>
                              <li>Page Access Token con permisos <code className="bg-amber-100 px-1 rounded">instagram_manage_messages</code></li>
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook Page Access Token *</label>
                            <input
                              type="password"
                              value={fbPageToken}
                              onChange={(e) => setFbPageToken(e.target.value)}
                              placeholder="EAAxxxxxxxx..."
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook Page ID *</label>
                              <input
                                type="text"
                                value={fbPageId}
                                onChange={(e) => setFbPageId(e.target.value)}
                                placeholder="123456789..."
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram Business ID</label>
                              <input
                                type="text"
                                value={igId}
                                onChange={(e) => setIgId(e.target.value)}
                                placeholder="17841400..."
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {channelError && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError}
                          </div>
                        )}

                        <button
                          onClick={() => connectChannel('instagram', '/api/channels/instagram', {
                            page_access_token: fbPageToken,
                            page_id: fbPageId,
                            instagram_id: igId || undefined,
                          })}
                          disabled={channelConnecting === 'instagram' || !fbPageToken || !fbPageId}
                          className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                        >
                          {channelConnecting === 'instagram' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                          ) : (
                            <><AtSign className="w-4 h-4" /> Conectar Instagram</>
                          )}
                        </button>
                      </div>
                    )}

                    {channelSuccess && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {channelSuccess}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Content - Facebook Messenger */}
                {expandedChannel === channel.id && channel.id === 'messenger' && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                    {chatwootChannels['messenger'] ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <Check className="w-5 h-5" />
                          <span className="font-semibold">Messenger conectado</span>
                        </div>
                        <button
                          onClick={() => { if (confirm('¿Desconectar Facebook Messenger?')) disconnectChannel('messenger'); }}
                          disabled={channelConnecting === 'messenger'}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Unlink className="w-4 h-4" />
                          Desconectar Messenger
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Send className="w-5 h-5 text-blue-500" />
                          <h4 className="font-semibold text-neutral-800">Conectar Facebook Messenger</h4>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">Conecta tu página de Facebook para recibir y responder mensajes de Messenger directamente en WITHMIA.</p>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Page Access Token *</label>
                            <input
                              type="password"
                              value={fbPageToken}
                              onChange={(e) => setFbPageToken(e.target.value)}
                              placeholder="EAAxxxxxxxx..."
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Page ID *</label>
                              <input
                                type="text"
                                value={fbPageId}
                                onChange={(e) => setFbPageId(e.target.value)}
                                placeholder="123456789..."
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre de la Página</label>
                              <input
                                type="text"
                                value={fbPageName}
                                onChange={(e) => setFbPageName(e.target.value)}
                                placeholder="Mi Página de Facebook"
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p>Necesitas un Page Access Token con permisos <code className="bg-blue-100 px-1 rounded">pages_messaging</code>. Puedes obtenerlo desde <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Meta Graph API Explorer</a>.</p>
                        </div>

                        {channelError && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError}
                          </div>
                        )}

                        <button
                          onClick={() => connectChannel('messenger', '/api/channels/facebook-messenger', {
                            page_access_token: fbPageToken,
                            page_id: fbPageId,
                            page_name: fbPageName || 'Mi Página',
                          })}
                          disabled={channelConnecting === 'messenger' || !fbPageToken || !fbPageId}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          {channelConnecting === 'messenger' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                          ) : (
                            <><Send className="w-4 h-4" /> Conectar Messenger</>
                          )}
                        </button>
                      </div>
                    )}

                    {channelSuccess && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {channelSuccess}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Content - WhatsApp Cloud API */}
                {expandedChannel === channel.id && channel.id === 'whatsapp-api' && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                    {chatwootChannels['whatsapp-api'] ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <Check className="w-5 h-5" />
                          <span className="font-semibold">WhatsApp Cloud API conectado</span>
                        </div>
                        <p className="text-sm text-neutral-600">
                          Teléfono: <span className="font-medium">{chatwootChannels['whatsapp-api']?.phone || 'Configurado'}</span>
                        </p>
                        <button
                          onClick={() => { if (confirm('¿Desconectar WhatsApp Cloud API?')) disconnectChannel('whatsapp-api'); }}
                          disabled={channelConnecting === 'whatsapp-api'}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Unlink className="w-4 h-4" />
                          Desconectar WhatsApp Cloud API
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Smartphone className="w-5 h-5 text-emerald-600" />
                          <h4 className="font-semibold text-neutral-800">Conectar WhatsApp Cloud API</h4>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">Usa la API oficial de Meta para WhatsApp Business. No requiere QR, solo números verificados con Meta Business Suite.</p>

                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2">
                          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">¿Cuándo usar WhatsApp Cloud API en vez de WhatsApp QR?</p>
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                              <li>Para enviar mensajes masivos (campañas, templates)</li>
                              <li>Usar un número verificado sin escanear QR</li>
                              <li>Escala empresarial con la API oficial de Meta</li>
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Número de teléfono *</label>
                            <input
                              type="tel"
                              value={waCloudPhone}
                              onChange={(e) => setWaCloudPhone(e.target.value)}
                              placeholder="+56912345678"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number ID *</label>
                              <input
                                type="text"
                                value={waCloudPhoneId}
                                onChange={(e) => setWaCloudPhoneId(e.target.value)}
                                placeholder="103xxxxxxxx"
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">Business Account ID *</label>
                              <input
                                type="text"
                                value={waCloudBusinessId}
                                onChange={(e) => setWaCloudBusinessId(e.target.value)}
                                placeholder="102xxxxxxxx"
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">API Key / Permanent Token *</label>
                            <input
                              type="password"
                              value={waCloudApiKey}
                              onChange={(e) => setWaCloudApiKey(e.target.value)}
                              placeholder="EAAxxxxxxxx..."
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
                            />
                            <p className="text-xs text-neutral-400 mt-1">
                              Obtén tu token permanente en <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">Meta Business Suite → System Users</a>.
                            </p>
                          </div>
                        </div>

                        {channelError && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError}
                          </div>
                        )}

                        <button
                          onClick={() => connectChannel('whatsapp-api', '/api/channels/whatsapp-cloud', {
                            phone_number: waCloudPhone,
                            phone_number_id: waCloudPhoneId,
                            business_account_id: waCloudBusinessId,
                            api_key: waCloudApiKey,
                          })}
                          disabled={channelConnecting === 'whatsapp-api' || !waCloudPhone || !waCloudPhoneId || !waCloudBusinessId || !waCloudApiKey}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          {channelConnecting === 'whatsapp-api' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                          ) : (
                            <><Smartphone className="w-4 h-4" /> Conectar WhatsApp Cloud API</>
                          )}
                        </button>
                      </div>
                    )}

                    {channelSuccess && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {channelSuccess}
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

          {/* Tip de buenas prácticas */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-800 font-medium mb-0.5">Conecta solo lo que uses</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Activa únicamente los servicios que tu negocio utiliza en el día a día. Conectar herramientas que no usas o duplicar funciones (ej. dos calendarios distintos) puede generar conflictos, citas duplicadas o errores de sincronización.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">

            {/* ==================== AGENDAPRO ==================== */}
            <div className={`bg-white rounded-xl border transition-all duration-200 ${
              expandedTool === 'agendapro' ? 'border-teal-300 shadow-lg ring-1 ring-teal-100' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'agendapro' ? null : 'agendapro')}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md bg-white border border-slate-200">
                    <img src="/icons/agendapro-icon.svg" alt="AgendaPro" className="w-5 h-5 object-contain" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800">AgendaPro</h3>
                    <p className="text-sm text-neutral-500">Gestión de citas con AgendaPro</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {agendaproLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : agendaproConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Conectado</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>Desconectado</span>
                  )}
                  {expandedTool === 'agendapro' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'agendapro' && (
                <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                  {agendaproConnected ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">AgendaPro conectado</span></div>
                          {agendaproIntegration?.provider_email && <span className="text-xs text-green-600">{agendaproIntegration.provider_email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${agendaproIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
                          <div>
                            <p className="font-medium text-neutral-700">Acceso de WITHMIA</p>
                            <p className="text-sm text-neutral-500">{agendaproIntegration?.bot_access_enabled ? 'WITHMIA puede crear reservas automáticamente' : 'Activa para que WITHMIA agende en AgendaPro'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={agendaproIntegration?.bot_access_enabled || false} onChange={toggleAgendaproBotAccess} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectAgendapro} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-teal-50 rounded-lg flex-shrink-0">
                            <Calendar className="w-8 h-8 text-teal-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-800 mb-1">Conecta tu AgendaPro</h4>
                            <p className="text-sm text-neutral-500 mb-3">Integra AgendaPro para que WITHMIA gestione citas y reservas automáticamente.</p>
                            <ul className="text-xs text-neutral-500 space-y-1">
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Consultar disponibilidad por servicio</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Crear reservas automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Múltiples sucursales y profesionales</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">API Key de AgendaPro</label>
                          <input
                            type="password"
                            value={agendaproApiKey}
                            onChange={(e) => setAgendaproApiKey(e.target.value)}
                            placeholder="Tu API Key de AgendaPro"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        {agendaproError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {agendaproError}</p>}
                        <button onClick={connectAgendapro} disabled={agendaproConnecting} className="w-full py-3 bg-white border-2 border-slate-200 hover:border-teal-300 text-neutral-700 hover:text-teal-600 font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          {agendaproConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>) : (<><Link2 className="w-4 h-4" /> Conectar AgendaPro</>)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== CALENDLY ==================== */}
            <div className={`bg-white rounded-xl border transition-all duration-200 ${
              expandedTool === 'calendly' ? 'border-blue-300 shadow-lg ring-1 ring-blue-100' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'calendly' ? null : 'calendly')}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #006BFF, #006BFFDD)' }}>
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800">Calendly</h3>
                    <p className="text-sm text-neutral-500">Agenda reuniones con Calendly</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {calendlyLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : calendlyConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Conectado</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>Desconectado</span>
                  )}
                  {expandedTool === 'calendly' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'calendly' && (
                <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                  {calendlyConnected ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">Calendly conectado</span></div>
                          {calendlyIntegration?.provider_email && <span className="text-xs text-green-600">{calendlyIntegration.provider_email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${calendlyIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
                          <div>
                            <p className="font-medium text-neutral-700">Acceso de WITHMIA</p>
                            <p className="text-sm text-neutral-500">{calendlyIntegration?.bot_access_enabled ? 'WITHMIA puede enviar links de agendamiento' : 'Activa para que WITHMIA agende vía Calendly'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={calendlyIntegration?.bot_access_enabled || false} onChange={toggleCalendlyBotAccess} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectCalendly} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <CalendarDays className="w-8 h-8 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-800 mb-1">Conecta tu Calendly</h4>
                            <p className="text-sm text-neutral-500 mb-3">Integra Calendly para que WITHMIA envíe links de agendamiento a tus clientes automáticamente.</p>
                            <ul className="text-xs text-neutral-500 space-y-1">
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Links de agendamiento personalizados</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Tipos de evento configurables</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Sincronización automática</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button onClick={connectCalendly} disabled={calendlyConnecting} className="w-full py-3 bg-white border-2 border-slate-200 hover:border-blue-300 text-neutral-700 hover:text-blue-600 font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {calendlyConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>) : (<><Link2 className="w-4 h-4" /> Conectar con Calendly</>)}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== GOOGLE CALENDAR ==================== */}
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      Desconectado
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
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${gcalIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
                          <div>
                            <p className="font-medium text-neutral-700">Acceso de WITHMIA</p>
                            <p className="text-sm text-neutral-500">
                              {gcalIntegration?.bot_access_enabled ? 'WITHMIA puede consultar y crear eventos' : 'Activa para que WITHMIA agende citas'}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={gcalIntegration?.bot_access_enabled || false} onChange={toggleGcalBotAccess} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectGoogleCalendar} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                          <Unlink className="w-4 h-4" /> Desconectar
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
                            <p className="text-sm text-neutral-500 mb-3">Sincroniza tu calendario para que WITHMIA consulte disponibilidad y agende citas.</p>
                            <ul className="text-xs text-neutral-500 space-y-1">
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Ver disponibilidad en tiempo real</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Agendar reuniones automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Sincronización bidireccional</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button onClick={connectGoogleCalendar} disabled={gcalConnecting} className="w-full py-3 bg-white border-2 border-slate-200 hover:border-rose-300 text-neutral-700 hover:text-rose-600 font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {gcalConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>) : (<><Link2 className="w-4 h-4" /> Conectar con Google</>)}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== OUTLOOK CALENDAR ==================== */}
            <div className={`bg-white rounded-xl border transition-all duration-200 ${
              expandedTool === 'outlook' ? 'border-blue-400 shadow-lg ring-1 ring-blue-100' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'outlook' ? null : 'outlook')}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #0078D4, #0078D4DD)' }}>
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800">Outlook Calendar</h3>
                    <p className="text-sm text-neutral-500">Integra con Outlook/Microsoft Calendar</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {outlookLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : outlookConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Conectado</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>Desconectado</span>
                  )}
                  {expandedTool === 'outlook' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'outlook' && (
                <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                  {outlookConnected ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">Outlook Calendar conectado</span></div>
                          {outlookIntegration?.provider_email && <span className="text-xs text-green-600">{outlookIntegration.provider_email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${outlookIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
                          <div>
                            <p className="font-medium text-neutral-700">Acceso de WITHMIA</p>
                            <p className="text-sm text-neutral-500">{outlookIntegration?.bot_access_enabled ? 'WITHMIA puede consultar y crear eventos' : 'Activa para que WITHMIA agende citas'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={outlookIntegration?.bot_access_enabled || false} onChange={toggleOutlookBotAccess} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectOutlook} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                              <path d="M21.5 5H8.5C7.67 5 7 5.67 7 6.5V17.5C7 18.33 7.67 19 8.5 19H21.5C22.33 19 23 18.33 23 17.5V6.5C23 5.67 22.33 5 21.5 5Z" fill="#0078D4"/>
                              <path d="M23 8L15 13L7 8V6L15 11L23 6V8Z" fill="white" opacity="0.9"/>
                              <path d="M1 7H6V18H2.5C1.67 18 1 17.33 1 16.5V7Z" fill="#0078D4" opacity="0.7"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-800 mb-1">Conecta tu Outlook Calendar</h4>
                            <p className="text-sm text-neutral-500 mb-3">Sincroniza tu calendario de Microsoft para que WITHMIA agende citas automáticamente.</p>
                            <ul className="text-xs text-neutral-500 space-y-1">
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Ver disponibilidad en tiempo real</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Crear eventos automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Microsoft 365 y Outlook.com</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button onClick={connectOutlook} disabled={outlookConnecting} className="w-full py-3 bg-white border-2 border-slate-200 hover:border-blue-400 text-neutral-700 hover:text-blue-600 font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {outlookConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>) : (<><Link2 className="w-4 h-4" /> Conectar con Microsoft</>)}
                      </button>
                      {outlookError && (
                        <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{outlookError}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== RESERVO ==================== */}
            <div className={`bg-white rounded-xl border transition-all duration-200 ${
              expandedTool === 'reservo' ? 'border-amber-300 shadow-lg ring-1 ring-amber-100' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'reservo' ? null : 'reservo')}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md bg-gradient-to-br from-teal-400 to-teal-600 overflow-hidden flex items-center justify-center">
                    <img src="/icons/reservo.webp" alt="Reservo" className="w-5 h-auto object-contain brightness-0 invert" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800">Reservo</h3>
                    <p className="text-sm text-neutral-500">Sistema de reservas y citas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {reservoLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : reservoConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Conectado</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>Desconectado</span>
                  )}
                  {expandedTool === 'reservo' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'reservo' && (
                <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                  {reservoConnected ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">Reservo conectado</span></div>
                          {reservoIntegration?.provider_email && <span className="text-xs text-green-600">{reservoIntegration.provider_email}.reservo.cl</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${reservoIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
                          <div>
                            <p className="font-medium text-neutral-700">Acceso de WITHMIA</p>
                            <p className="text-sm text-neutral-500">{reservoIntegration?.bot_access_enabled ? 'WITHMIA puede crear reservas automáticamente' : 'Activa para que WITHMIA agende en Reservo'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={reservoIntegration?.bot_access_enabled || false} onChange={toggleReservoBotAccess} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectReservo} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                            <Calendar className="w-8 h-8 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-800 mb-1">Conecta tu Reservo</h4>
                            <p className="text-sm text-neutral-500 mb-3">Integra Reservo para que WITHMIA gestione reservas y citas de tus clientes.</p>
                            <ul className="text-xs text-neutral-500 space-y-1">
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Consultar disponibilidad</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Crear reservas automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Gestión de servicios</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Subdominio de Reservo</label>
                          <input
                            type="text"
                            value={reservoSubdomain}
                            onChange={(e) => setReservoSubdomain(e.target.value)}
                            placeholder="tu-negocio"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                          <p className="text-xs text-neutral-400 mt-1">tu-negocio.reservo.cl</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">API Key</label>
                          <input
                            type="password"
                            value={reservoApiKey}
                            onChange={(e) => setReservoApiKey(e.target.value)}
                            placeholder="Tu API Key de Reservo"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>
                        {reservoError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {reservoError}</p>}
                        <button onClick={connectReservo} disabled={reservoConnecting} className="w-full py-3 bg-white border-2 border-slate-200 hover:border-amber-300 text-neutral-700 hover:text-amber-600 font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          {reservoConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>) : (<><Link2 className="w-4 h-4" /> Conectar Reservo</>)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

{/* ==================== PRODUCT PROVIDERS (unified) ==================== */}
            {(() => {
              const providers = [
                {
                  id: 'woocommerce', name: 'WooCommerce', icon: ShoppingCart,
                  gradient: 'linear-gradient(135deg, #96588A, #96588ADD)',
                  subtitle: 'Importa tus productos automáticamente',
                  fields: [
                    { key: 'store_url', label: 'Dirección de tu tienda', placeholder: 'Ej: https://mitienda.com', hint: 'Copia la URL de tu página principal', type: 'text' },
                    { key: 'consumer_key', label: 'Clave pública', placeholder: 'Empieza con ck_...', hint: '', type: 'password' },
                    { key: 'consumer_secret', label: 'Clave secreta', placeholder: 'Empieza con cs_...', hint: '', type: 'password' },
                  ],
                  requiredFields: ['store_url', 'consumer_key', 'consumer_secret'],
                  credentialMap: { store_url: 'store_url', consumer_key: 'consumer_key', consumer_secret: 'consumer_secret' },
                  steps: [
                    'Entra al panel de tu WordPress/WooCommerce',
                    'Ve a WooCommerce → Ajustes → Avanzado → API REST',
                    'Haz clic en "Agregar clave" y copia las dos claves aquí',
                  ],
                },
                {
                  id: 'shopify', name: 'Shopify', icon: ShoppingBag,
                  gradient: 'linear-gradient(135deg, #96BF48, #96BF48DD)',
                  subtitle: 'Importa tus productos automáticamente',
                  fields: [
                    { key: 'store_url', label: 'Nombre de tu tienda', placeholder: 'Ej: mi-tienda', hint: 'Solo el nombre, sin .myshopify.com', type: 'text' },
                    { key: 'access_token', label: 'Token de acceso', placeholder: 'Empieza con shpat_...', hint: '', type: 'password' },
                  ],
                  requiredFields: ['store_url', 'access_token'],
                  credentialMap: { store_url: 'store_url', access_token: 'access_token' },
                  steps: [
                    'Entra a tu panel de Shopify (admin)',
                    'Ve a Configuración → Apps → Desarrollar apps',
                    'Crea una app y copia el "Admin API access token"',
                  ],
                },
                {
                  id: 'mercadolibre', name: 'MercadoLibre', icon: Store,
                  gradient: 'linear-gradient(135deg, #FFE600, #FFE600DD)',
                  subtitle: 'Importa tus publicaciones activas',
                  fields: [
                    { key: 'user_id', label: 'Tu número de vendedor', placeholder: 'Ej: 123456789', hint: 'Lo encuentras en Mi cuenta → Mis datos', type: 'text' },
                    { key: 'access_token', label: 'Token de acceso', placeholder: 'Empieza con APP_USR-...', hint: '', type: 'password' },
                  ],
                  requiredFields: ['user_id', 'access_token'],
                  credentialMap: { user_id: 'user_id', access_token: 'access_token' },
                  steps: [
                    'Entra a developers.mercadolibre.com',
                    'Ve a "Mis aplicaciones" y crea una app',
                    'Copia tu User ID y el Access Token aquí',
                  ],
                },
                {
                  id: 'custom_api', name: customConnectionType === 'mysql' ? 'Base de datos MySQL' : 'API REST propia', icon: Database,
                  gradient: 'linear-gradient(135deg, #0ea5e9, #0ea5e9DD)',
                  subtitle: customConnectionType === 'mysql' ? 'Conecta directo a tu base de datos' : 'Conecta cualquier endpoint REST',
                  fields: customConnectionType === 'mysql' ? [
                    { key: 'db_host', label: 'Host del servidor', placeholder: 'Ej: mysql.miempresa.com o 192.168.1.100', hint: 'La dirección de tu servidor MySQL', type: 'text' },
                    { key: 'db_port', label: 'Puerto (opcional)', placeholder: '3306', hint: 'Normalmente es 3306', type: 'text' },
                    { key: 'db_name', label: 'Nombre de la base de datos', placeholder: 'Ej: mi_tienda', hint: '', type: 'text' },
                    { key: 'db_user', label: 'Usuario', placeholder: 'Ej: admin', hint: '', type: 'text' },
                    { key: 'db_password', label: 'Contraseña', placeholder: 'Contraseña del usuario MySQL', hint: '', type: 'password' },
                    { key: 'db_table', label: 'Tabla de productos', placeholder: 'Ej: productos, products, items', hint: 'La tabla donde están guardados tus productos', type: 'text' },
                  ] : [
                    { key: 'api_url', label: 'Link donde están tus productos', placeholder: 'Ej: https://misite.com/api/productos.php', hint: 'Debe devolver tus productos en formato JSON', type: 'text' },
                    { key: 'api_key', label: 'Contraseña de la API (si tiene)', placeholder: 'Déjalo vacío si no requiere contraseña', hint: '', type: 'password' },
                  ],
                  requiredFields: customConnectionType === 'mysql' ? ['db_host', 'db_name', 'db_user', 'db_password', 'db_table'] : ['api_url'],
                  credentialMap: customConnectionType === 'mysql'
                    ? { db_host: 'db_host', db_port: 'db_port', db_name: 'db_name', db_user: 'db_user', db_password: 'db_password', db_table: 'db_table' }
                    : { api_url: 'api_url', api_key: 'api_key' },
                  steps: customConnectionType === 'mysql' ? [
                    'Pídele a tu programador los datos de acceso a MySQL',
                    'Necesitas: host, base de datos, usuario y contraseña',
                    'Indica la tabla donde están guardados tus productos',
                  ] : [
                    'Pídele a tu programador el link de tu API de productos',
                    'Si tiene contraseña/API Key, pégala abajo',
                    'Nosotros importamos todo automáticamente',
                  ],
                },
              ];

              return providers.map(prov => {
                const integration = productIntegrations[prov.id];
                const isConnected = integration?.connected;
                const isExpanded = expandedTool === prov.id;
                const form = getProviderForm(prov.id);
                const ProvIcon = prov.icon;
                const iconTextColor = prov.id === 'mercadolibre' ? 'text-neutral-800' : 'text-white';

                return (
                  <div key={prov.id} className={`bg-white rounded-xl border transition-all duration-200 ${
                    isExpanded ? 'border-blue-300 shadow-lg ring-1 ring-blue-100' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
                  }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(isExpanded ? null : prov.id)}>
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl shadow-md" style={{ background: prov.gradient }}>
                          <ProvIcon className={`w-5 h-5 ${iconTextColor}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-800">{prov.name}</h3>
                          <p className="text-sm text-neutral-500">{isConnected ? `${integration.products_count || 0} productos sincronizados` : prov.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {productIntegrationsLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : isConnected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />Conectado</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" />Desconectado</span>
                        )}
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                        {isConnected ? (
                          <div className="space-y-4">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">{prov.name} conectado</span></div>
                                <div className="flex items-center gap-2">
                                  {integration.store_url && <span className="text-xs text-green-600">{integration.store_url}</span>}
                                  <span className="text-xs text-green-600 font-medium">{integration.products_count || 0} productos</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                              <div className="flex items-center gap-3">
                                <Bot className={`w-5 h-5 ${integration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
                                <div>
                                  <p className="font-medium text-neutral-700">Que WITHMIA use estos productos</p>
                                  <p className="text-sm text-neutral-500">{integration?.bot_access_enabled ? 'WITHMIA recomienda estos productos a tus clientes' : 'Activa para que WITHMIA recomiende tus productos'}</p>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={integration?.bot_access_enabled || false} onChange={() => toggleProductBotAccess(prov.id)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                              </label>
                            </div>
                            <div className="flex justify-between items-center">
                              <button onClick={() => syncProductProvider(prov.id)} disabled={syncingProductProvider === prov.id}
                                className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-400 text-neutral-700 text-sm font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50">
                                <RefreshCw className={`w-4 h-4 ${syncingProductProvider === prov.id ? 'animate-spin' : ''}`} />
                                {syncingProductProvider === prov.id ? 'Actualizando...' : 'Actualizar productos'}
                              </button>
                              <button onClick={() => disconnectProductProvider(prov.id)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"><Unlink className="w-4 h-4" /> Desconectar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {/* Mode toggle for custom_api */}
                            {prov.id === 'custom_api' && (
                              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                                <button
                                  onClick={() => { setCustomConnectionType('mysql'); resetProviderFields('custom_api'); }}
                                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                    customConnectionType === 'mysql'
                                      ? 'bg-white text-blue-700 shadow-sm'
                                      : 'text-neutral-500 hover:text-neutral-700'
                                  }`}
                                >
                                  <Database className="w-4 h-4" />
                                  MySQL directo
                                </button>
                                <button
                                  onClick={() => { setCustomConnectionType('api'); resetProviderFields('custom_api'); }}
                                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                    customConnectionType === 'api'
                                      ? 'bg-white text-blue-700 shadow-sm'
                                      : 'text-neutral-500 hover:text-neutral-700'
                                  }`}
                                >
                                  <Globe className="w-4 h-4" />
                                  API REST
                                </button>
                              </div>
                            )}
                            {/* Step-by-step guide */}
                            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">¿Cómo lo hago?</p>
                              <div className="space-y-2.5">
                                {prov.steps.map((step, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                    <p className="text-sm text-blue-800 leading-relaxed">{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Fields */}
                            <div className="space-y-3">
                              {prov.fields.map(field => (
                                <div key={field.key}>
                                  <label className="block text-sm font-medium text-neutral-700 mb-1">{field.label}</label>
                                  <input
                                    type={field.type}
                                    value={form.fields[field.key] || ''}
                                    onChange={e => setProviderField(prov.id, field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  {field.hint && <p className="text-xs text-neutral-400 mt-1 ml-1">{field.hint}</p>}
                                </div>
                              ))}
                            </div>
                            {form.error && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {form.error}</p>
                              </div>
                            )}
                            <button
                              onClick={() => connectProvider(prov.id, prov.credentialMap, prov.requiredFields, prov.id === 'custom_api' ? { connection_type: customConnectionType } : undefined)}
                              disabled={form.connecting}
                              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-200/50"
                            >
                              {form.connecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>) : (<><Link2 className="w-4 h-4" /> Conectar {prov.name}</>)}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}

          </div>
        </div>

      </div>
    </div>
  );
};

export default IntegrationSection;
