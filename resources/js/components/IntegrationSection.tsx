// IntegrationSection – v2.1
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Download,
  Lock,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemedSelect } from './ui/ThemedSelect';

interface IntegrationInfo {
  id: number;
  provider: string;
  provider_email: string | null;
  is_active: boolean;
  is_connected: boolean;
  bot_access_enabled: boolean;
  selected_calendar_id: string | null;
  settings: Record<string, unknown> | null;
  last_sync_at: string | null;
  created_at: string | null;
}

interface ProductIntegrationInfo {
  connected?: boolean;
  store_url?: string;
  products_count?: number;
  bot_access_enabled?: boolean;
  last_sync_at?: string;
  [key: string]: unknown;
}

interface ChannelInfo {
  id: string;
  inbox_id?: number;
  connected?: boolean;
  name?: string;
  website_url?: string;
  email?: string;
  page_id?: string;
  phone_number?: string;
  [key: string]: unknown;
}

interface WhatsAppSettings {
  rejectCall: boolean;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  syncFullHistory: boolean;
  readStatus: boolean;
  daysLimitImportMessages?: number;
}

interface IntegrationSectionProps {
  whatsAppStatus: string;
  whatsAppSettings: WhatsAppSettings;
  onConnectWhatsApp: () => void;
  onDisconnectWhatsApp: () => void;
  onUpdateSettings: (settings: WhatsAppSettings) => Promise<void>;
  isUpdatingSettings?: boolean;
  onIntegrationChange?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToSubscription?: () => void;
  isPro?: boolean;
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
  onNavigateToSubscription,
  isPro = false,
}) => {
  const { hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      containerBg: 'var(--theme-content-bg)',
      cardBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      cardBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      headerBg: isDark ? 'rgba(255,255,255,0.03)' : 'var(--theme-content-card-bg)',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'var(--theme-content-card-bg)',
      inputBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      expandedBg: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(248,250,252,0.5)',
      accent: 'var(--theme-accent)',
      divider: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
    };
  }, [hasTheme, isDark]);

  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState({
    ...whatsAppSettings,
    daysLimitImportMessages: whatsAppSettings.daysLimitImportMessages || 7
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Google Calendar state
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalConnecting, setGcalConnecting] = useState(false);
  const [gcalIntegration, setGcalIntegration] = useState<IntegrationInfo | null>(null);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  // Calendly state
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [calendlyConnecting, setCalendlyConnecting] = useState(false);
  const [calendlyIntegration, setCalendlyIntegration] = useState<IntegrationInfo | null>(null);
  const [calendlyLoading, setCalendlyLoading] = useState(true);

  // Outlook state
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookConnecting, setOutlookConnecting] = useState(false);
  const [outlookIntegration, setOutlookIntegration] = useState<IntegrationInfo | null>(null);
  const [outlookLoading, setOutlookLoading] = useState(true);
  const [outlookError, setOutlookError] = useState('');

  // Reservo state
  const [reservoConnected, setReservoConnected] = useState(false);
  const [reservoIntegration, setReservoIntegration] = useState<IntegrationInfo | null>(null);
  const [reservoLoading, setReservoLoading] = useState(true);
  const [reservoApiKey, setReservoApiKey] = useState('');
  const [reservoSubdomain, setReservoSubdomain] = useState('');
  const [reservoConnecting, setReservoConnecting] = useState(false);
  const [reservoError, setReservoError] = useState('');

  // AgendaPro state
  const [agendaproConnected, setAgendaproConnected] = useState(false);
  const [agendaproIntegration, setAgendaproIntegration] = useState<IntegrationInfo | null>(null);
  const [agendaproLoading, setAgendaproLoading] = useState(true);
  const [agendaproApiKey, setAgendaproApiKey] = useState('');
  const [agendaproConnecting, setAgendaproConnecting] = useState(false);
  const [agendaproError, setAgendaproError] = useState('');

  // Dentalink state
  const [dentalinkConnected, setDentalinkConnected] = useState(false);
  const [dentalinkIntegration, setDentalinkIntegration] = useState<IntegrationInfo | null>(null);
  const [dentalinkLoading, setDentalinkLoading] = useState(true);
  const [dentalinkApiKey, setDentalinkApiKey] = useState('');
  const [dentalinkConnecting, setDentalinkConnecting] = useState(false);
  const [dentalinkError, setDentalinkError] = useState('');

  // Medilink state
  const [medilinkConnected, setMedilinkConnected] = useState(false);
  const [medilinkIntegration, setMedilinkIntegration] = useState<IntegrationInfo | null>(null);
  const [medilinkLoading, setMedilinkLoading] = useState(true);
  const [medilinkApiKey, setMedilinkApiKey] = useState('');
  const [medilinkConnecting, setMedilinkConnecting] = useState(false);
  const [medilinkError, setMedilinkError] = useState('');

  // Product integrations state
  const [productIntegrations, setProductIntegrations] = useState<Record<string, ProductIntegrationInfo>>({});
  const [productIntegrationsLoading, setProductIntegrationsLoading] = useState(true);

  // Chatwoot channels state (Instagram, Messenger, Web Chat, Email, WhatsApp Cloud API)
  const [chatwootChannels, setChatwootChannels] = useState<Record<string, ChannelInfo>>({});
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelConnecting, setChannelConnecting] = useState<string | null>(null);
  const [channelErrors, setChannelErrors] = useState<Record<string, string | null>>({});
  const [channelSuccesses, setChannelSuccesses] = useState<Record<string, string | null>>({});

  // Per-channel error/success helpers
  const channelError = (id: string) => channelErrors[id] || null;
  const channelSuccess = (id: string) => channelSuccesses[id] || null;
  const setChannelError = (id: string, msg: string | null) => setChannelErrors(prev => ({ ...prev, [id]: msg }));
  const setChannelSuccess = (id: string, msg: string | null) => setChannelSuccesses(prev => ({ ...prev, [id]: msg }));

  // Web Chat Widget form
  const [webChatUrl, setWebChatUrl] = useState('');
  const [webChatColor, setWebChatColor] = useState('#6366f1');
  const [webChatTitle, setWebChatTitle] = useState('¡Hola! 👋');
  const [webChatTagline, setWebChatTagline] = useState('Estamos aquí para ayudarte');
  const [widgetScript, setWidgetScript] = useState('');
  // Advanced widget config
  const [widgetConfig, setWidgetConfig] = useState({
    agentName: '',
    agentIconUrl: '',
    askForPhone: false,
    askForEmail: false,
    askForName: false,
    darkTheme: false,
    primaryColor: '#6366f1',
    secondaryColor: '',
    language: 'es',
    chatWithUsText: '',
    xPosition: 20,
    yPosition: 20,
    suggestedQuestions: [] as string[],
  });
  const [newSuggestedQ, setNewSuggestedQ] = useState('');
  const [showWidgetPreview, setShowWidgetPreview] = useState(false);

  // Email form
  const [emailForm, setEmailForm] = useState({
    email: '', imap_address: 'imap.gmail.com', imap_port: 993, imap_login: '',
    imap_password: '', imap_enable_ssl: true, smtp_address: 'smtp.gmail.com',
    smtp_port: 587, smtp_login: '', smtp_password: '', smtp_enable_ssl_tls: true,
  });

  // (Manual form state removed — replaced by OAuth popup flow)

  // Unified product provider state: { [providerId]: { fields: {fieldKey: value}, connecting: bool, error: string } }
  const [providerForms, setProviderForms] = useState<Record<string, { fields: Record<string, string>; connecting: boolean; error: string }>>({});
  const [syncingProductProvider, setSyncingProductProvider] = useState<string | null>(null);

  const getProviderForm = (id: string) => providerForms[id] || { fields: {}, connecting: false, error: '' };
  const setProviderField = (id: string, key: string, value: string) => setProviderForms(prev => ({ ...prev, [id]: { ...getProviderForm(id), ...prev[id], fields: { ...(prev[id]?.fields || {}), [key]: value } } }));
  const setProviderConnecting = (id: string, v: boolean) => setProviderForms(prev => ({ ...prev, [id]: { ...(prev[id] || { fields: {}, connecting: false, error: '' }), connecting: v } }));
  const setProviderError = (id: string, v: string) => setProviderForms(prev => ({ ...prev, [id]: { ...(prev[id] || { fields: {}, connecting: false, error: '' }), error: v } }));
  const resetProviderFields = (id: string) => setProviderForms(prev => ({ ...prev, [id]: { fields: {}, connecting: false, error: '' } }));

  // API helper
  const gcalApiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    // Token comes from localStorage via window.fetch interceptor (X-Railway-Auth-Token)
    const token = new URLSearchParams(window.location.search).get('auth_token') 
      || localStorage.getItem('railway_auth_token') || '';
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['X-Railway-Auth-Token'] = token;
    }
    // Only add Content-Type for requests with body
    if (options.method && options.method !== 'GET' && options.body) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
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
    } catch (err: unknown) {
      console.error('Error connecting Outlook:', err);
      const msg = err instanceof Error ? err.message : '';
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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

  // ========== DENTALINK ==========
  const loadDentalinkStatus = useCallback(async () => {
    try {
      setDentalinkLoading(true);
      const data = await gcalApiFetch('/api/dentalink/status');
      setDentalinkConnected(data.connected);
      setDentalinkIntegration(data.integration);
    } catch (err) { console.error('Error loading Dentalink status:', err); }
    finally { setDentalinkLoading(false); }
  }, [gcalApiFetch]);

  const connectDentalink = useCallback(async () => {
    if (!dentalinkApiKey) {
      setDentalinkError('Ingresa tu API Token de Dentalink');
      return;
    }
    setDentalinkConnecting(true);
    setDentalinkError('');
    try {
      const data = await gcalApiFetch('/api/dentalink/connect', {
        method: 'POST',
        body: JSON.stringify({ api_key: dentalinkApiKey }),
      });
      if (data.success) {
        setDentalinkApiKey('');
        await loadDentalinkStatus();
        onIntegrationChange?.();
      }
    } catch (err: unknown) {
      setDentalinkError('API Token inválido');
    } finally { setDentalinkConnecting(false); }
  }, [dentalinkApiKey, gcalApiFetch, loadDentalinkStatus, onIntegrationChange]);

  const disconnectDentalink = useCallback(async () => {
    if (!confirm('¿Desconectar Dentalink?')) return;
    try {
      await gcalApiFetch('/api/dentalink/disconnect', { method: 'POST' });
      setDentalinkConnected(false);
      setDentalinkIntegration(null);
      onIntegrationChange?.();
    } catch (err) { console.error('Error disconnecting Dentalink:', err); }
  }, [gcalApiFetch, onIntegrationChange]);

  const toggleDentalinkBotAccess = useCallback(async () => {
    if (!dentalinkIntegration) return;
    try {
      const data = await gcalApiFetch('/api/dentalink/settings', {
        method: 'PUT',
        body: JSON.stringify({ bot_access_enabled: !dentalinkIntegration.bot_access_enabled }),
      });
      setDentalinkIntegration(data.integration);
    } catch (err) { console.error('Error toggling Dentalink bot access:', err); }
  }, [dentalinkIntegration, gcalApiFetch]);

  // ========== MEDILINK ==========
  const loadMedilinkStatus = useCallback(async () => {
    try {
      setMedilinkLoading(true);
      const data = await gcalApiFetch('/api/medilink/status');
      setMedilinkConnected(data.connected);
      setMedilinkIntegration(data.integration);
    } catch (err) { console.error('Error loading Medilink status:', err); }
    finally { setMedilinkLoading(false); }
  }, [gcalApiFetch]);

  const connectMedilink = useCallback(async () => {
    if (!medilinkApiKey) {
      setMedilinkError('Ingresa tu API Token de Medilink');
      return;
    }
    setMedilinkConnecting(true);
    setMedilinkError('');
    try {
      const data = await gcalApiFetch('/api/medilink/connect', {
        method: 'POST',
        body: JSON.stringify({ api_key: medilinkApiKey }),
      });
      if (data.success) {
        setMedilinkApiKey('');
        await loadMedilinkStatus();
        onIntegrationChange?.();
      }
    } catch (err: unknown) {
      setMedilinkError('API Token inválido');
    } finally { setMedilinkConnecting(false); }
  }, [medilinkApiKey, gcalApiFetch, loadMedilinkStatus, onIntegrationChange]);

  const disconnectMedilink = useCallback(async () => {
    if (!confirm('¿Desconectar Medilink?')) return;
    try {
      await gcalApiFetch('/api/medilink/disconnect', { method: 'POST' });
      setMedilinkConnected(false);
      setMedilinkIntegration(null);
      onIntegrationChange?.();
    } catch (err) { console.error('Error disconnecting Medilink:', err); }
  }, [gcalApiFetch, onIntegrationChange]);

  const toggleMedilinkBotAccess = useCallback(async () => {
    if (!medilinkIntegration) return;
    try {
      const data = await gcalApiFetch('/api/medilink/settings', {
        method: 'PUT',
        body: JSON.stringify({ bot_access_enabled: !medilinkIntegration.bot_access_enabled }),
      });
      setMedilinkIntegration(data.integration);
    } catch (err) { console.error('Error toggling Medilink bot access:', err); }
  }, [medilinkIntegration, gcalApiFetch]);

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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    loadDentalinkStatus();
    loadMedilinkStatus();
    loadProductIntegrations();
    loadChatwootChannels();
  }, [loadGcalStatus, loadCalendlyStatus, loadOutlookStatus, loadReservoStatus, loadAgendaproStatus, loadDentalinkStatus, loadMedilinkStatus, loadProductIntegrations]);

  // Load Chatwoot channel statuses
  const loadChatwootChannels = useCallback(async () => {
    try {
      setChannelsLoading(true);
      const data = await gcalApiFetch('/api/channels');
      const channelMap: Record<string, ChannelInfo> = {};
      (data.channels || []).forEach((ch: ChannelInfo) => {
        channelMap[ch.id] = ch;
      });
      setChatwootChannels(channelMap);

      // Auto-load widget script for already-connected web-chat
      if (channelMap['web-chat']?.inbox_id && !widgetScript) {
        try {
          const scriptData = await gcalApiFetch(`/api/channels/${channelMap['web-chat'].inbox_id}/widget-script`);
          setWidgetScript(scriptData.script || '');
        } catch (e) {
          console.error('Error loading widget script:', e);
        }
      }
    } catch (err) {
      console.error('Error loading channels:', err);
    } finally {
      setChannelsLoading(false);
    }
  }, [gcalApiFetch]);

  // ── OAuth popup flow for Messenger / Instagram / WhatsApp Cloud ──
  const connectChannelRef = useRef<((channelId: string, endpoint: string, payload: Record<string, unknown>) => Promise<void>) | null>(null);

  // Open OAuth popup (same pattern as Google Calendar)
  const openOAuthPopup = useCallback(async (channel: string) => {
    const channelId = channel === 'whatsapp-cloud' ? 'whatsapp-api' : channel;
    try {
      setChannelConnecting(channelId);
      setChannelError(channelId, null);
      setChannelSuccess(channelId, null);

      const data = await gcalApiFetch(`/api/channels/oauth/${channel}/auth-url`);
      if (data.error) {
        setChannelError(channelId, data.error);
        setChannelConnecting(null);
        return;
      }

      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.auth_url,
        'channel_oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      // Poll popup close as fallback
      const pollInterval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollInterval);
          setTimeout(async () => {
            setChannelConnecting(null);
            await loadChatwootChannels();
            onIntegrationChange?.();
          }, 500);
        }
      }, 1000);

      setTimeout(() => { clearInterval(pollInterval); setChannelConnecting(null); }, 300000);
    } catch (err: unknown) {
      setChannelError(channelId, err instanceof Error ? err.message : 'Error al iniciar conexión');
      setChannelConnecting(null);
    }
  }, [gcalApiFetch, loadChatwootChannels, onIntegrationChange]);

  // Listen for OAuth popup postMessage results
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'oauth-page-selected') return;

      const { channel, ...payload } = event.data;

      if (channel === 'messenger') {
        connectChannelRef.current?.('messenger', '/api/channels/facebook-messenger', {
          page_access_token: payload.page_access_token,
          user_access_token: payload.user_access_token,
          page_id: payload.page_id,
          page_name: payload.page_name || 'Mi Página',
        });
      } else if (channel === 'instagram') {
        connectChannelRef.current?.('instagram', '/api/channels/instagram', {
          page_access_token: payload.page_access_token,
          user_access_token: payload.user_access_token,
          page_id: payload.page_id,
          instagram_id: payload.instagram_id || undefined,
        });
      } else if (channel === 'whatsapp-cloud') {
        connectChannelRef.current?.('whatsapp-api', '/api/channels/whatsapp-cloud', {
          phone_number: payload.phone_number,
          phone_number_id: payload.phone_number_id,
          business_account_id: payload.business_account_id,
          api_key: payload.api_key,
        });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Connect a new channel
  const connectChannel = async (channelId: string, endpoint: string, payload: Record<string, unknown>) => {
    setChannelConnecting(channelId);
    setChannelError(channelId, null);
    setChannelSuccess(channelId, null);
    try {
      const data = await gcalApiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.success) {
        setChannelSuccess(channelId, `¡${channelId === 'web-chat' ? 'Widget' : 'Canal'} conectado exitosamente!`);
        if (data.inbox?.website_token && channelId === 'web-chat') {
          // Fetch widget script
          const scriptData = await gcalApiFetch(`/api/channels/${data.inbox.id}/widget-script`);
          setWidgetScript(scriptData.script || '');
        }
        await loadChatwootChannels();
        onIntegrationChange?.();
      } else {
        setChannelError(channelId, data.error || 'Error al conectar canal');
      }
    } catch (err: unknown) {
      setChannelError(channelId, err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setChannelConnecting(null);
    }
  };

  // Keep ref in sync so OAuth popup handler can call connectChannel
  useEffect(() => { connectChannelRef.current = connectChannel; });

  // Disconnect a channel
  const disconnectChannel = async (channelId: string) => {
    const channel = chatwootChannels[channelId];
    if (!channel?.inbox_id) return;
    setChannelConnecting(channelId);
    setChannelError(channelId, null);
    try {
      await gcalApiFetch(`/api/channels/${channel.inbox_id}`, { method: 'DELETE' });
      setChannelSuccess(channelId, 'Canal desconectado');
      await loadChatwootChannels();
      onIntegrationChange?.();
    } catch (err: unknown) {
      setChannelError(channelId, err instanceof Error ? err.message : 'Error al desconectar');
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
      description: 'Widget de chat en vivo para tu sitio web (WordPress, Shopify, Wix...)',
      icon: null,
      fallbackIcon: Globe,
      iconBg: 'from-indigo-500 to-purple-600',
      status: getChannelStatus('web-chat'),
      available: true
    },
    {
      id: 'gmail',
      name: 'Email / Gmail',
      description: 'Conecta tu correo (Gmail, Outlook u otro) para gestionar soporte por email',
      icon: null,
      fallbackIcon: Mail,
      iconBg: 'from-red-500 to-orange-500',
      status: getChannelStatus('email'),
      available: true,
      proOnly: true
    },
    {
      id: 'instagram',
      name: 'Instagram Direct',
      description: 'Recibe y responde mensajes directos de Instagram',
      icon: '/icons/instagram-new.webp',
      fallbackIcon: MessageSquare,
      iconBg: 'from-pink-500 to-rose-500',
      status: getChannelStatus('instagram'),
      available: true,
      proOnly: true
    },
    {
      id: 'messenger',
      name: 'Facebook Messenger',
      description: 'Conecta tu página de Facebook para atender por Messenger',
      icon: '/icons/facebook-new.webp',
      fallbackIcon: Mail,
      iconBg: 'from-blue-500 to-indigo-500',
      status: getChannelStatus('messenger'),
      available: true,
      proOnly: true
    },
    {
      id: 'whatsapp-api',
      name: 'WhatsApp Cloud API',
      description: 'API oficial de WhatsApp Business de Meta (sin QR, números verificados)',
      icon: null,
      fallbackIcon: Smartphone,
      iconBg: 'from-emerald-600 to-teal-600',
      status: getChannelStatus('whatsapp-api'),
      available: true,
      proOnly: true
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
    { id: 'mysql_db', name: 'Base de datos MySQL', icon: Database, color: '#00758F', description: 'Conecta directo a tu base de datos' },
    { id: 'api_rest', name: 'API REST', icon: Globe, color: '#F59E0B', description: 'Conecta cualquier endpoint REST' },
    { id: 'dentalink', name: 'Dentalink', icon: Calendar, color: '#00bcd4', description: 'Software de gestión dental' },
    { id: 'medilink', name: 'Medilink', icon: Calendar, color: '#e91e63', description: 'Sistema de fichas médicas' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>
            Conectado
          </span>
        );
      case 'disconnected':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}>
            <span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>
            Desconectado
          </span>
        );
      case 'coming_soon':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-slate-100 text-slate-500' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}>
            <Clock className="w-3 h-3" />
            Próximamente
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`h-full overflow-y-auto p-8 scrollbar-thin scrollbar-track-transparent ${!t ? 'scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400' : ''}`}
      style={t ? { background: t.containerBg } : undefined}
    >
      {t && <style>{`
        .int-toggle { background-color: ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'} !important; }
        .peer:checked ~ .int-toggle { background-color: var(--theme-accent) !important; }
        .peer:focus ~ .int-toggle { --tw-ring-color: color-mix(in srgb, var(--theme-accent) 20%, transparent) !important; }
      `}</style>}
      <div className="max-w-4xl mx-auto pb-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <div className={`p-2 rounded-lg shadow-lg ${!t ? 'bg-gradient-to-r from-gray-500 to-slate-600' : ''}`} style={t ? { background: t.accent } : undefined}>
              <Plug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Integraciones</h1>
              <p className={`${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Conecta tus canales de comunicación y herramientas</p>
            </div>
          </div>
        </div>

        {/* Canales de Comunicación */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className={`w-5 h-5 ${!t ? 'text-purple-600' : ''}`} style={t ? { color: t.accent } : undefined} />
            <h2 className={`text-xl font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Canales de Comunicación</h2>
          </div>
          
          <div className="space-y-3">
            {channels.map((channel) => (
              <div 
                key={channel.id}
                className={`rounded-xl border transition-all duration-200 ${
                  expandedChannel === channel.id 
                    ? !t ? 'border-purple-300 shadow-lg ring-1 ring-purple-100' : 'shadow-lg'
                    : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
                } ${!t ? 'bg-white' : ''}`}
                style={t ? { background: t.cardBg, borderColor: expandedChannel === channel.id ? t.accent : t.cardBorder } : undefined}
              >
                {/* Channel Header */}
                <div 
                  className={`flex items-center justify-between p-4 ${
                    !isPro && channel.proOnly ? 'opacity-50 cursor-pointer' : channel.available ? 'cursor-pointer' : 'opacity-75'
                  }`}
                  onClick={() => {
                    if (!isPro && channel.proOnly) { onNavigateToSubscription?.(); return; }
                    channel.available && toggleChannel(channel.id);
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl shadow-md ${!t ? `bg-gradient-to-r ${channel.iconBg}` : ''}`} style={t ? { background: t.accent } : undefined}>
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
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{channel.name}</h3>
                        {!isPro && channel.proOnly && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
                            <Lock className="w-3 h-3" /> PRO
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{channel.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isPro && channel.proOnly ? (
                      <Lock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <>
                        {getStatusBadge(channel.status)}
                        {channel.available && (
                          expandedChannel === channel.id 
                            ? <ChevronDown className={`w-5 h-5 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                            : <ChevronRight className={`w-5 h-5 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Content - WhatsApp */}
                {expandedChannel === channel.id && channel.id === 'whatsapp' && (
                  <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                    
                    {/* PRE-CONNECTION: Show sync settings BEFORE connecting */}
                    {!isConnected && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Database className={`w-5 h-5 ${!t ? 'text-purple-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                          <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Configuración de Sincronización</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${!t ? 'bg-purple-100 text-purple-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}>Antes de conectar</span>
                        </div>
                        
                        <div className={`p-4 rounded-lg border shadow-sm ${!t ? 'bg-white border-purple-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <RefreshCw className={`w-5 h-5 ${!t ? 'text-purple-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                              <div>
                                <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Importar Historial de Mensajes</p>
                                <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Desactiva para conexión instantánea</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={localSettings.syncFullHistory}
                                onChange={(e) => handleSettingChange('syncFullHistory', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
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
                                <ThemedSelect
                                  value={String(localSettings.daysLimitImportMessages)}
                                  onChange={(val) => handleSettingChange('daysLimitImportMessages', parseInt(val))}
                                  options={[
                                    { value: '3', label: '3 días ⚡ Rápido' },
                                    { value: '7', label: '7 días' },
                                    { value: '14', label: '14 días' },
                                    { value: '30', label: '30 días' },
                                    { value: '60', label: '60 días ⏳ Lento' },
                                  ]}
                                  triggerClassName={`px-3 py-2 border rounded-lg text-sm font-medium ${!t ? 'bg-slate-50 border-slate-200 text-neutral-700' : ''}`}
                                  triggerStyle={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className={`mt-3 p-2 border rounded-lg ${!t ? 'bg-blue-50 border-blue-200' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 10%, transparent)`, borderColor: `color-mix(in srgb, ${t.accent} 25%, transparent)` } : undefined}>
                            <p className={`text-xs flex items-center gap-1 ${!t ? 'text-blue-700' : ''}`} style={t ? { color: t.accent } : undefined}>
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
                              className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400' : 'disabled:opacity-50'}`}
                              style={t ? { background: t.accent } : undefined}
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
                          <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Conexión</h4>
                        </div>
                        {isConnected ? (
                          <button
                            onClick={onDisconnectWhatsApp}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}
                          >
                            <X className="w-4 h-4" />
                            Desconectar
                          </button>
                        ) : (
                          <button
                            onClick={onConnectWhatsApp}
                            className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-green-500 hover:bg-green-600' : 'hover:opacity-90'}`}
                            style={t ? { background: t.accent } : undefined}
                          >
                            <QrCode className="w-4 h-4" />
                            Conectar con QR
                          </button>
                        )}
                      </div>
                      
                      {isConnected && (
                        <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
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
                        <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Comportamiento</h4>
                      </div>

                      <div className="space-y-4">
                        {/* Rechazar Llamadas */}
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                          <div className="flex items-center gap-3">
                            <Phone className={`w-5 h-5 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                            <div>
                              <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Rechazar Llamadas</p>
                              <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Rechazar todas las llamadas entrantes</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.rejectCall}
                              onChange={(e) => handleSettingChange('rejectCall', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                          </label>
                        </div>

                        {/* Ignorar Grupos */}
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                          <div className="flex items-center gap-3">
                            <Users className={`w-5 h-5 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                            <div>
                              <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Ignorar Grupos</p>
                              <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Ignorar todos los mensajes de grupos</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.groupsIgnore}
                              onChange={(e) => handleSettingChange('groupsIgnore', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                          </label>
                        </div>

                        {/* Siempre Online */}
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                          <div className="flex items-center gap-3">
                            <Zap className={`w-5 h-5 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                            <div>
                              <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Siempre Online</p>
                              <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Permanecer siempre en línea</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.alwaysOnline}
                              onChange={(e) => handleSettingChange('alwaysOnline', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                          </label>
                        </div>

                        {/* Ver Mensajes */}
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                          <div className="flex items-center gap-3">
                            <Eye className={`w-5 h-5 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                            <div>
                              <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Ver Mensajes</p>
                              <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Marcar todos los mensajes como leídos</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.readMessages}
                              onChange={(e) => handleSettingChange('readMessages', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                          </label>
                        </div>

                        {/* Ver Estado */}
                        <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                          <div className="flex items-center gap-3">
                            <Eye className={`w-5 h-5 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                            <div>
                              <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Ver Estado</p>
                              <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Marcar todos los estados como vistos</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={localSettings.readStatus}
                              onChange={(e) => handleSettingChange('readStatus', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                          </label>
                        </div>
                      </div>

                      {/* Save Button */}
                      {hasChanges && (
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={handleSaveSettings}
                            disabled={isUpdatingSettings}
                            className={`px-6 py-2.5 text-white font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400' : 'disabled:opacity-50'}`}
                            style={t ? { background: t.accent } : undefined}
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
                  <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                    {chatwootChannels['web-chat'] ? (
                      <div className="space-y-6">
                        {/* Connection Status */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Globe className={`w-5 h-5 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                              <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Conexión</h4>
                            </div>
                            <button
                              onClick={() => { if (confirm('¿Desconectar el widget de chat web?')) disconnectChannel('web-chat'); }}
                              disabled={channelConnecting === 'web-chat'}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}
                            >
                              <X className="w-4 h-4" />
                              Desconectar
                            </button>
                          </div>
                          <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                            <div className="flex items-center gap-2 text-green-700">
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-medium">Widget de chat activo y funcionando</span>
                            </div>
                            {chatwootChannels['web-chat']?.website_url && (
                              <p className="text-xs text-green-600 mt-1 ml-6">{chatwootChannels['web-chat'].website_url}</p>
                            )}
                          </div>
                        </div>

                        {/* Install Script */}
                        {widgetScript && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Code className="w-5 h-5 text-neutral-600" />
                              <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Usa WITHMIA Webchat en tu sitio web</h4>
                            </div>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Copia y pega el siguiente script en tu sitio web para activar el Webchat.</p>
                            <div className="relative">
                              <pre className="bg-neutral-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono">{widgetScript}</pre>
                              <button
                                onClick={() => { navigator.clipboard.writeText(widgetScript); setChannelSuccess('web-chat', '¡Código copiado!'); setTimeout(() => setChannelSuccess('web-chat', null), 2000); }}
                                className="absolute top-2 right-2 p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-colors"
                                title="Copiar código"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-neutral-400">Pega este código antes de la etiqueta <code className="bg-neutral-200 px-1 rounded">&lt;/body&gt;</code> en tu sitio web.</p>

                            {/* WordPress plugin download */}
                            <div className={`p-4 rounded-lg ${!t ? 'bg-indigo-50 border border-indigo-200' : 'border'}`} style={t ? { background: t.expandedBg, borderColor: t.cardBorder } : undefined}>
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${!t ? 'bg-indigo-100' : ''}`} style={t ? { background: t.cardBg } : undefined}>
                                  <Globe className={`w-4 h-4 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm font-semibold mb-1 ${!t ? 'text-indigo-800' : ''}`} style={t ? { color: t.text } : undefined}>¿Usas WordPress?</p>
                                  <p className={`text-xs mb-2 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined}>Instala nuestro plugin y configura todo desde tu panel de WordPress, sin tocar código.</p>
                                  <a
                                    href="/plugins/withmia-chatweb/download"
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${!t ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                    style={t ? { background: t.accent } : undefined}
                                    download
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Descargar WITHMIA ChatWeb
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Widget Configuration */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-neutral-600" />
                            <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Configuraciones</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Agent Name */}
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Nombre del agente</label>
                              <input
                                type="text"
                                value={widgetConfig.agentName}
                                onChange={(e) => setWidgetConfig(p => ({ ...p, agentName: e.target.value }))}
                                placeholder="Ej: MIA"
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                              />
                              <p className="text-xs text-neutral-400 mt-1">El nombre que se mostrará en el webchat.</p>
                            </div>

                            {/* Agent Icon */}
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>URL del ícono del agente</label>
                              <input
                                type="url"
                                value={widgetConfig.agentIconUrl}
                                onChange={(e) => setWidgetConfig(p => ({ ...p, agentIconUrl: e.target.value }))}
                                placeholder="https://tusitio.com/avatar.png"
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                              />
                              <p className="text-xs text-neutral-400 mt-1">URL de una imagen para el avatar del agente.</p>
                            </div>
                          </div>

                          {/* Checkboxes */}
                          <div className="space-y-3">
                            {[
                              { key: 'askForPhone' as const, label: 'Solicitar número de teléfono', desc: 'Pedir el teléfono del usuario antes de iniciar el chat.' },
                              { key: 'askForEmail' as const, label: 'Solicitar email', desc: 'Pedir el correo electrónico del usuario antes de iniciar el chat.' },
                              { key: 'askForName' as const, label: 'Solicitar nombre del usuario', desc: 'Pedir el nombre del usuario antes de iniciar el chat.' },
                              { key: 'darkTheme' as const, label: 'Tema oscuro', desc: 'Usar el tema oscuro para el webchat.' },
                            ].map((opt) => (
                              <label key={opt.key} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${!t ? 'bg-white border-neutral-200 hover:bg-neutral-50' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                                <input
                                  type="checkbox"
                                  checked={widgetConfig[opt.key]}
                                  onChange={(e) => setWidgetConfig(p => ({ ...p, [opt.key]: e.target.checked }))}
                                  className={`mt-0.5 w-4 h-4 rounded border-neutral-300 ${!t ? 'text-indigo-600 focus:ring-indigo-500' : ''}`}
                                  style={t ? { accentColor: t.accent } : undefined}
                                />
                                <div>
                                  <span className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>{opt.label}</span>
                                  <p className="text-xs text-neutral-400 mt-0.5">{opt.desc}</p>
                                </div>
                              </label>
                            ))}
                          </div>

                          {/* Colors */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Color primario</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={widgetConfig.primaryColor}
                                  onChange={(e) => setWidgetConfig(p => ({ ...p, primaryColor: e.target.value }))}
                                  className="w-10 h-10 rounded-lg border border-neutral-300 cursor-pointer" />
                                <input type="text" value={widgetConfig.primaryColor}
                                  onChange={(e) => setWidgetConfig(p => ({ ...p, primaryColor: e.target.value }))}
                                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                              </div>
                            </div>
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Color secundario</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={widgetConfig.secondaryColor || '#000000'}
                                  onChange={(e) => setWidgetConfig(p => ({ ...p, secondaryColor: e.target.value }))}
                                  className="w-10 h-10 rounded-lg border border-neutral-300 cursor-pointer" />
                                <input type="text" value={widgetConfig.secondaryColor}
                                  onChange={(e) => setWidgetConfig(p => ({ ...p, secondaryColor: e.target.value }))}
                                  placeholder="Opcional"
                                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                              </div>
                            </div>
                          </div>

                          {/* Language */}
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Idioma</label>
                            <ThemedSelect
                              value={widgetConfig.language}
                              onChange={(val) => setWidgetConfig(p => ({ ...p, language: val }))}
                              options={[
                                { value: 'es', label: 'Español' },
                                { value: 'en', label: 'English' },
                                { value: 'pt', label: 'Português' },
                                { value: 'fr', label: 'Français' },
                                { value: 'de', label: 'Deutsch' },
                              ]}
                              triggerClassName={`w-full max-w-xs px-3 py-2 border rounded-lg text-sm ${!t ? 'border-neutral-300' : ''}`}
                              triggerStyle={t ? { backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                            />
                          </div>

                          {/* Chat With Us Text */}
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Texto del botón de chat</label>
                            <input
                              type="text"
                              value={widgetConfig.chatWithUsText}
                              onChange={(e) => setWidgetConfig(p => ({ ...p, chatWithUsText: e.target.value }))}
                              placeholder="Ej: Habla con nosotros"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                            />
                          </div>

                          {/* Position */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Posición X del botón</label>
                              <input type="number" value={widgetConfig.xPosition}
                                onChange={(e) => setWidgetConfig(p => ({ ...p, xPosition: parseInt(e.target.value) || 20 }))}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                            </div>
                            <div>
                              <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Posición Y del botón</label>
                              <input type="number" value={widgetConfig.yPosition}
                                onChange={(e) => setWidgetConfig(p => ({ ...p, yPosition: parseInt(e.target.value) || 20 }))}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                            </div>
                          </div>

                          {/* Suggested Questions */}
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Preguntas sugeridas</label>
                            <p className="text-xs text-neutral-400 mb-2">Las preguntas que se mostrarán en el webchat. Máximo 4.</p>
                            <div className="space-y-2">
                              {widgetConfig.suggestedQuestions.map((q, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-700">{q}</span>
                                  <button onClick={() => setWidgetConfig(p => ({ ...p, suggestedQuestions: p.suggestedQuestions.filter((_, idx) => idx !== i) }))}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              {widgetConfig.suggestedQuestions.length < 4 && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={newSuggestedQ}
                                    onChange={(e) => setNewSuggestedQ(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && newSuggestedQ.trim()) {
                                        setWidgetConfig(p => ({ ...p, suggestedQuestions: [...p.suggestedQuestions, newSuggestedQ.trim()] }));
                                        setNewSuggestedQ('');
                                      }
                                    }}
                                    placeholder="Escribe una pregunta..."
                                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      if (newSuggestedQ.trim()) {
                                        setWidgetConfig(p => ({ ...p, suggestedQuestions: [...p.suggestedQuestions, newSuggestedQ.trim()] }));
                                        setNewSuggestedQ('');
                                      }
                                    }}
                                    disabled={!newSuggestedQ.trim()}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${!t ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200' : 'border'}`}
                                    style={t ? { background: t.expandedBg, color: t.accent, borderColor: t.cardBorder } : undefined}
                                  >
                                    + Agregar
                                  </button>
                                </div>
                              )}
                              {widgetConfig.suggestedQuestions.length === 0 && (
                                <p className="text-xs text-neutral-400 italic">+ Agregar pregunta (0/4)</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Live Preview Toggle */}
                        <div className={`flex items-center justify-between p-3 rounded-lg ${!t ? 'bg-indigo-50 border border-indigo-200' : 'border'}`} style={t ? { background: t.expandedBg, borderColor: t.cardBorder } : undefined}>
                          <div className="flex items-center gap-2">
                            <Eye className={`w-4 h-4 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                            <span className={`text-sm font-medium ${!t ? 'text-indigo-700' : ''}`} style={t ? { color: t.accent } : undefined}>Vista previa del widget</span>
                          </div>
                          <button
                            onClick={() => setShowWidgetPreview(!showWidgetPreview)}
                            className={`px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${!t ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                            style={t ? { background: t.accent } : undefined}
                          >
                            {showWidgetPreview ? 'Ocultar' : 'Mostrar'}
                          </button>
                        </div>

                        {/* Widget Preview */}
                        {showWidgetPreview && (
                          <div className={`relative border-2 border-dashed rounded-xl p-4 min-h-[350px] ${!t ? 'border-neutral-300 bg-white' : ''}`} style={t ? { borderColor: t.cardBorder, background: t.inputBg } : undefined}>
                            <p className="text-xs text-neutral-400 mb-2">Vista previa (solo visual, no funcional)</p>
                            {/* Floating Button Preview */}
                            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
                              {widgetConfig.chatWithUsText && (
                                <span className="px-3 py-1.5 bg-white shadow-lg rounded-full text-xs font-medium text-neutral-700 border">{widgetConfig.chatWithUsText}</span>
                              )}
                              <div
                                className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                                style={{ backgroundColor: widgetConfig.primaryColor }}
                              >
                                <MessageCircle className="w-6 h-6 text-white" />
                              </div>
                            </div>
                            {/* Chat Window Preview */}
                            <div className={`absolute bottom-20 right-4 w-80 rounded-xl shadow-2xl overflow-hidden border ${widgetConfig.darkTheme ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'}`}>
                              {/* Header */}
                              <div className="p-4 text-white" style={{ backgroundColor: widgetConfig.primaryColor }}>
                                <div className="flex items-center gap-3">
                                  {widgetConfig.agentIconUrl ? (
                                    <img src={widgetConfig.agentIconUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-white/20" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                      <Bot className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-sm">{widgetConfig.agentName || 'Asistente IA'}</p>
                                    <p className="text-xs opacity-80">En línea</p>
                                  </div>
                                </div>
                              </div>
                              {/* Body */}
                              <div className={`p-4 min-h-[120px] ${widgetConfig.darkTheme ? 'bg-neutral-800' : 'bg-white'}`}>
                                {widgetConfig.suggestedQuestions.length > 0 && (
                                  <div className="space-y-1.5 mb-3">
                                    {widgetConfig.suggestedQuestions.map((q, i) => (
                                      <div key={i} className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${widgetConfig.darkTheme ? 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                                        {q}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Footer */}
                              <div className={`p-3 border-t ${widgetConfig.darkTheme ? 'border-neutral-700' : 'border-neutral-200'}`}>
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${widgetConfig.darkTheme ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
                                  <span className={`text-xs ${widgetConfig.darkTheme ? 'text-neutral-400' : 'text-neutral-400'}`}>Escribe tu mensaje...</span>
                                </div>
                                <p className="text-center mt-2"><span className="text-[10px] text-neutral-400">by © WITHMIA</span></p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className={`w-5 h-5 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                          <h4 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Configurar Widget de Chat Web</h4>
                        </div>
                        <p className={`text-sm mb-4 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Agrega un widget de chat en vivo a tu sitio web para que tus visitantes puedan escribirte directamente. Compatible con WordPress, Shopify, Wix y cualquier sitio web.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>URL de tu sitio web *</label>
                            <input
                              type="url"
                              value={webChatUrl}
                              onChange={(e) => setWebChatUrl(e.target.value)}
                              placeholder="https://tusitio.com"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>
                              <Palette className="w-3.5 h-3.5 inline mr-1" />
                              Color del widget
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={webChatColor}
                                onChange={(e) => { setWebChatColor(e.target.value); setWidgetConfig(p => ({ ...p, primaryColor: e.target.value })); }}
                                className="w-10 h-10 rounded-lg border border-neutral-300 cursor-pointer"
                              />
                              <span className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{webChatColor}</span>
                            </div>
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Título de bienvenida</label>
                            <input
                              type="text"
                              value={webChatTitle}
                              onChange={(e) => setWebChatTitle(e.target.value)}
                              placeholder="¡Hola! 👋"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Subtítulo</label>
                            <input
                              type="text"
                              value={webChatTagline}
                              onChange={(e) => setWebChatTagline(e.target.value)}
                              placeholder="Estamos aquí para ayudarte"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                            />
                          </div>
                        </div>

                        {channelError('web-chat') && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError('web-chat')}
                          </div>
                        )}

                        {/* WordPress plugin download */}
                        <div className={`p-4 rounded-xl ${!t ? 'bg-indigo-50 border border-indigo-200' : 'border'}`} style={t ? { background: t.expandedBg, borderColor: t.cardBorder } : undefined}>
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${!t ? 'bg-indigo-100' : ''}`} style={t ? { background: t.cardBg } : undefined}>
                              <Download className={`w-4.5 h-4.5 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-semibold mb-1 ${!t ? 'text-indigo-800' : ''}`} style={t ? { color: t.text } : undefined}>¿Usas WordPress?</p>
                              <p className={`text-xs mb-2 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined}>Instala nuestro plugin y configura el chat desde tu panel de WordPress sin tocar código.</p>
                              <a
                                href="/plugins/withmia-chatweb/download"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${!t ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                style={t ? { background: t.accent } : undefined}
                                download
                              >
                                <Download className="w-3.5 h-3.5" />
                                Descargar WITHMIA ChatWeb
                              </a>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => connectChannel('web-chat', '/api/channels/web-widget', {
                            website_url: webChatUrl,
                            widget_color: webChatColor,
                            welcome_title: webChatTitle,
                            welcome_tagline: webChatTagline,
                          })}
                          disabled={channelConnecting === 'web-chat' || !webChatUrl}
                          className={`w-full px-6 py-3 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${!t ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-indigo-300 disabled:to-purple-300' : 'disabled:opacity-50'}`}
                          style={t ? { background: t.accent } : undefined}
                        >
                          {channelConnecting === 'web-chat' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Creando widget...</>
                          ) : (
                            <><Globe className="w-4 h-4" /> Crear Widget de Chat</>
                          )}
                        </button>
                      </div>
                    )}

                    {channelSuccess('web-chat') && (
                      <div className={`mt-3 p-3 border rounded-lg text-sm flex items-center gap-2 ${!t ? 'bg-green-50 border-green-200 text-green-600' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)', color: isDark ? 'rgb(74,222,128)' : 'rgb(22,163,74)' } : undefined}>
                        <Check className="w-4 h-4" />
                        {channelSuccess('web-chat')}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Content - Email / Gmail */}
                {expandedChannel === channel.id && channel.id === 'gmail' && (
                  <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                    {chatwootChannels['email'] ? (
                      <div className="space-y-5">
                        {/* Connection Status */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Mail className="w-5 h-5 text-red-500" />
                              <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Conexión</h4>
                            </div>
                            <button
                              onClick={() => { if (confirm('¿Desconectar el canal de email?')) disconnectChannel('email'); }}
                              disabled={channelConnecting === 'email'}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}
                            >
                              <X className="w-4 h-4" />
                              Desconectar
                            </button>
                          </div>
                          <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                            <div className="flex items-center gap-2 text-green-700">
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-medium">Email conectado y funcionando</span>
                            </div>
                            {chatwootChannels['email']?.email && (
                              <p className="text-xs text-green-600 mt-1 ml-6">{chatwootChannels['email'].email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-5 h-5 text-red-500" />
                          <h4 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conectar Email</h4>
                        </div>
                        <p className={`text-sm mb-4 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Conecta tu correo electrónico para recibir y responder emails como conversaciones.</p>

                        {/* Provider selector */}
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Proveedor de correo</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'gmail', label: 'Gmail', imap: 'imap.gmail.com', smtp: 'smtp.gmail.com', imapPort: 993, smtpPort: 587 },
                              { id: 'outlook', label: 'Outlook / Hotmail', imap: 'outlook.office365.com', smtp: 'smtp.office365.com', imapPort: 993, smtpPort: 587 },
                              { id: 'custom', label: 'Otro', imap: '', smtp: '', imapPort: 993, smtpPort: 587 },
                            ].map((provider) => (
                              <button
                                key={provider.id}
                                type="button"
                                onClick={() => setEmailForm(p => ({
                                  ...p,
                                  imap_address: provider.imap,
                                  smtp_address: provider.smtp,
                                  imap_port: provider.imapPort,
                                  smtp_port: provider.smtpPort,
                                }))}
                                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                                  emailForm.imap_address === provider.imap && provider.id !== 'custom'
                                    ? 'border-red-400 bg-red-50 text-red-700'
                                    : emailForm.imap_address !== 'imap.gmail.com' && emailForm.imap_address !== 'outlook.office365.com' && provider.id === 'custom'
                                      ? 'border-red-400 bg-red-50 text-red-700'
                                      : `border-neutral-200 text-neutral-600 hover:border-neutral-300 ${!t ? 'bg-white' : ''}`
                                }`}
                                style={!t ? undefined : { background: t.inputBg, borderColor: t.cardBorder }}
                              >
                                {provider.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Dirección de email *</label>
                            <input
                              type="email"
                              value={emailForm.email}
                              onChange={(e) => { setEmailForm(p => ({ ...p, email: e.target.value, imap_login: e.target.value, smtp_login: e.target.value })); }}
                              placeholder={emailForm.imap_address === 'imap.gmail.com' ? 'tu@gmail.com' : emailForm.imap_address === 'outlook.office365.com' ? 'tu@outlook.com' : 'tu@dominio.com'}
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Contraseña de aplicación *</label>
                            <input type="password" value={emailForm.imap_password}
                              onChange={(e) => setEmailForm(p => ({ ...p, imap_password: e.target.value, smtp_password: e.target.value }))}
                              placeholder="Contraseña de app"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                            {emailForm.imap_address === 'imap.gmail.com' && (
                              <p className="text-xs text-neutral-400 mt-1.5 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Gmail requiere una <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">contraseña de aplicación</a> (no tu contraseña normal).
                              </p>
                            )}
                            {emailForm.imap_address === 'outlook.office365.com' && (
                              <p className="text-xs text-neutral-400 mt-1.5 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Usa tu contraseña de Outlook. Si tienes 2FA, genera una <a href="https://account.live.com/proofs/AppPassword" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">contraseña de app</a>.
                              </p>
                            )}
                          </div>

                          {/* Show IMAP/SMTP fields only for custom provider */}
                          {emailForm.imap_address !== 'imap.gmail.com' && emailForm.imap_address !== 'outlook.office365.com' && (
                            <>
                              <div className={`p-4 border rounded-lg ${!t ? 'bg-white border-neutral-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                                <h5 className={`text-sm font-semibold mb-3 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>📥 IMAP (recepción)</h5>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={`block text-xs mb-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Servidor</label>
                                    <input type="text" value={emailForm.imap_address} onChange={(e) => setEmailForm(p => ({ ...p, imap_address: e.target.value }))}
                                      placeholder="imap.tudominio.com"
                                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                                  </div>
                                  <div>
                                    <label className={`block text-xs mb-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Puerto</label>
                                    <input type="number" value={emailForm.imap_port} onChange={(e) => setEmailForm(p => ({ ...p, imap_port: parseInt(e.target.value) || 993 }))}
                                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                                  </div>
                                </div>
                              </div>
                              <div className={`p-4 border rounded-lg ${!t ? 'bg-white border-neutral-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                                <h5 className={`text-sm font-semibold mb-3 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>📤 SMTP (envío)</h5>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={`block text-xs mb-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Servidor</label>
                                    <input type="text" value={emailForm.smtp_address} onChange={(e) => setEmailForm(p => ({ ...p, smtp_address: e.target.value }))}
                                      placeholder="smtp.tudominio.com"
                                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                                  </div>
                                  <div>
                                    <label className={`block text-xs mb-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Puerto</label>
                                    <input type="number" value={emailForm.smtp_port} onChange={(e) => setEmailForm(p => ({ ...p, smtp_port: parseInt(e.target.value) || 587 }))}
                                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none" />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {channelError('email') && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError('email')}
                          </div>
                        )}

                        <button
                          onClick={() => connectChannel('email', '/api/channels/email', emailForm)}
                          disabled={channelConnecting === 'email' || !emailForm.email || !emailForm.imap_password}
                          className={`w-full px-6 py-3 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${!t ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-red-300 disabled:to-orange-300' : 'disabled:opacity-50 hover:opacity-90'}`}
                          style={t ? { background: t.accent } : undefined}
                        >
                          {channelConnecting === 'email' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                          ) : (
                            <><Mail className="w-4 h-4" /> Conectar Email</>
                          )}
                        </button>
                      </div>
                    )}

                    {channelSuccess('email') && (
                      <div className={`mt-3 p-3 border rounded-lg text-sm flex items-center gap-2 ${!t ? 'bg-green-50 border-green-200 text-green-600' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)', color: isDark ? 'rgb(74,222,128)' : 'rgb(22,163,74)' } : undefined}>
                        <Check className="w-4 h-4" />
                        {channelSuccess('email')}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Content - Instagram */}
                {expandedChannel === channel.id && channel.id === 'instagram' && (
                  <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                    {chatwootChannels['instagram'] ? (
                      <div className="space-y-5">
                        {/* Connection Status */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                              <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Conexión</h4>
                            </div>
                            <button
                              onClick={() => { if (confirm('¿Desconectar Instagram?')) disconnectChannel('instagram'); }}
                              disabled={channelConnecting === 'instagram'}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}
                            >
                              <X className="w-4 h-4" />
                              Desconectar
                            </button>
                          </div>
                          <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                            <div className="flex items-center gap-2 text-green-700">
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-medium">Instagram conectado y funcionando</span>
                            </div>
                            {chatwootChannels['instagram']?.page_id && (
                              <p className="text-xs text-green-600 mt-1 ml-6">Página ID: {chatwootChannels['instagram'].page_id}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <AtSign className="w-5 h-5 text-pink-500" />
                          <h4 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conectar Instagram Direct</h4>
                        </div>
                        <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                          Conecta tu cuenta de Instagram Business para que MIA reciba y responda mensajes directos automáticamente.
                        </p>

                        <div className="p-3 bg-pink-50/60 border border-pink-200 rounded-xl text-sm text-pink-700 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium text-sm">Requisitos:</p>
                            <p>• Cuenta de Instagram <strong>Business</strong> o <strong>Creator</strong></p>
                            <p>• Vinculada a una Página de Facebook</p>
                          </div>
                        </div>

                        {channelError('instagram') && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError('instagram')}
                          </div>
                        )}

                        <button
                          onClick={() => openOAuthPopup('instagram')}
                          disabled={channelConnecting === 'instagram'}
                          className={`w-full py-3 px-4 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${!t ? 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 disabled:opacity-50 shadow-md shadow-pink-200/50' : 'disabled:opacity-50 hover:opacity-90'}`}
                          style={t ? { background: t.accent } : undefined}
                        >
                          {channelConnecting === 'instagram' ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Conectando...</>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                              Conectar con Instagram
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {channelSuccess('instagram') && (
                      <div className={`mt-3 p-3 border rounded-lg text-sm flex items-center gap-2 ${!t ? 'bg-green-50 border-green-200 text-green-600' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)', color: isDark ? 'rgb(74,222,128)' : 'rgb(22,163,74)' } : undefined}>
                        <Check className="w-4 h-4" />
                        {channelSuccess('instagram')}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Content - Facebook Messenger */}
                {expandedChannel === channel.id && channel.id === 'messenger' && (
                  <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                    {chatwootChannels['messenger'] ? (
                      <div className="space-y-5">
                        {/* Connection Status */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.17.15.27.37.28.6l.06 1.87c.02.56.6.93 1.11.7l2.09-.82c.18-.07.38-.09.56-.05.86.24 1.78.37 2.75.37 5.64 0 10-4.13 10-9.7S17.64 2 12 2z"/></svg>
                              <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Conexión</h4>
                            </div>
                            <button
                              onClick={() => { if (confirm('¿Desconectar Facebook Messenger?')) disconnectChannel('messenger'); }}
                              disabled={channelConnecting === 'messenger'}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}
                            >
                              <X className="w-4 h-4" />
                              Desconectar
                            </button>
                          </div>
                          <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                            <div className="flex items-center gap-2 text-green-700">
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-medium">Messenger conectado y funcionando</span>
                            </div>
                            {chatwootChannels['messenger']?.page_id && (
                              <p className="text-xs text-green-600 mt-1 ml-6">Página: {chatwootChannels['messenger'].name || chatwootChannels['messenger'].page_id}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Send className="w-5 h-5 text-blue-500" />
                          <h4 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conectar Facebook Messenger</h4>
                        </div>
                        <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                          Conecta tu Página de Facebook para que MIA reciba y responda mensajes de Messenger automáticamente.
                        </p>

                        {channelError('messenger') && channelConnecting === null && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError('messenger')}
                          </div>
                        )}

                        <button
                          onClick={() => openOAuthPopup('messenger')}
                          disabled={channelConnecting === 'messenger'}
                          className={`w-full py-3 px-4 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${!t ? 'bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 shadow-md shadow-blue-200/50' : 'disabled:opacity-50 hover:opacity-90'}`}
                          style={t ? { background: t.accent } : undefined}
                        >
                          {channelConnecting === 'messenger' ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Conectando...</>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.17.15.27.37.28.6l.06 1.87c.02.56.6.93 1.11.7l2.09-.82c.18-.07.38-.09.56-.05.86.24 1.78.37 2.75.37 5.64 0 10-4.13 10-9.7S17.64 2 12 2z"/></svg>
                              Conectar con Facebook
                            </>
                          )}
                        </button>

                        <p className="text-xs text-neutral-400 text-center">
                          Seleccionarás la Página de Facebook en el paso siguiente
                        </p>
                      </div>
                    )}

                    {channelSuccess('messenger') && (
                      <div className={`mt-3 p-3 border rounded-lg text-sm flex items-center gap-2 ${!t ? 'bg-green-50 border-green-200 text-green-600' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)', color: isDark ? 'rgb(74,222,128)' : 'rgb(22,163,74)' } : undefined}>
                        <Check className="w-4 h-4" />
                        {channelSuccess('messenger')}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Content - WhatsApp Cloud API */}
                {expandedChannel === channel.id && channel.id === 'whatsapp-api' && (
                  <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                    {chatwootChannels['whatsapp-api'] ? (
                      <div className="space-y-5">
                        {/* Connection Status */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-5 h-5 text-emerald-600" />
                              <h4 className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Conexión</h4>
                            </div>
                            <button
                              onClick={() => { if (confirm('¿Desconectar WhatsApp Cloud API?')) disconnectChannel('whatsapp-api'); }}
                              disabled={channelConnecting === 'whatsapp-api'}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}
                            >
                              <X className="w-4 h-4" />
                              Desconectar
                            </button>
                          </div>
                          <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                            <div className="flex items-center gap-2 text-green-700">
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-medium">WhatsApp Cloud API conectado y funcionando</span>
                            </div>
                            {chatwootChannels['whatsapp-api']?.phone_number && (
                              <p className="text-xs text-green-600 mt-1 ml-6">Teléfono: {chatwootChannels['whatsapp-api'].phone_number}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Smartphone className="w-5 h-5 text-emerald-600" />
                          <h4 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conectar WhatsApp Cloud API</h4>
                        </div>
                        <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                          Usa la API oficial de Meta para WhatsApp Business. Conecta tu número verificado sin escanear QR.
                        </p>

                        <div className={`p-3 border rounded-xl text-sm flex items-start gap-2.5 ${!t ? 'bg-emerald-50/60 border-emerald-200 text-emerald-700' : ''}`} style={t ? { background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(236,253,245,0.6)', borderColor: isDark ? 'rgba(16,185,129,0.25)' : 'rgb(167,243,208)', color: isDark ? 'rgb(110,231,183)' : 'rgb(4,120,87)' } : undefined}>
                          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium text-sm">¿Cuándo usar WhatsApp Cloud API?</p>
                            <p>• Mensajes masivos, campañas y templates</p>
                            <p>• Número verificado sin escanear QR</p>
                            <p>• Escala empresarial con la API oficial de Meta</p>
                          </div>
                        </div>

                        {channelError('whatsapp-api') && channelConnecting === null && (
                          <div className={`p-3 border rounded-lg text-sm flex items-center gap-2 ${!t ? 'bg-red-50 border-red-200 text-red-600' : ''}`} style={t ? { background: isDark ? 'rgba(239,68,68,0.1)' : 'rgb(254,242,242)', borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgb(254,202,202)', color: isDark ? 'rgb(252,165,165)' : 'rgb(220,38,38)' } : undefined}>
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {channelError('whatsapp-api')}
                          </div>
                        )}

                        <button
                          onClick={() => openOAuthPopup('whatsapp-cloud')}
                          disabled={channelConnecting === 'whatsapp-api'}
                          className={`w-full py-3 px-4 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${!t ? 'bg-[#25D366] hover:bg-[#20BD5A] disabled:opacity-50 shadow-md shadow-green-200/50' : 'disabled:opacity-50 hover:opacity-90'}`}
                          style={t ? { background: t.accent } : undefined}
                        >
                          {channelConnecting === 'whatsapp-api' ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Conectando...</>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.55-.752-6.337-2.076l-.442-.332-3.17 1.063 1.063-3.17-.332-.442A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                              Conectar WhatsApp Business
                            </>
                          )}
                        </button>

                        <p className={`text-xs text-center ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                          Se abrirá el registro de WhatsApp Business de Meta
                        </p>
                      </div>
                    )}

                    {channelSuccess('whatsapp-api') && (
                      <div className={`mt-3 p-3 border rounded-lg text-sm flex items-center gap-2 ${!t ? 'bg-green-50 border-green-200 text-green-600' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)', color: isDark ? 'rgb(74,222,128)' : 'rgb(22,163,74)' } : undefined}>
                        <Check className="w-4 h-4" />
                        {channelSuccess('whatsapp-api')}
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
            <Settings className={`w-5 h-5 ${!t ? 'text-purple-600' : ''}`} style={t ? { color: t.accent } : undefined} />
            <h2 className={`text-xl font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Herramientas</h2>
            {!isPro && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
                <Lock className="w-3 h-3" /> PRO
              </span>
            )}
          </div>

          {!isPro ? (
            <div className="space-y-3">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white border-slate-200 shadow-sm' : 'shadow-sm'}`}
                  style={t ? { background: t.cardBg, borderColor: t.cardBorder } : undefined}
                >
                  <div
                    className="flex items-center justify-between p-4 opacity-50 cursor-pointer"
                    onClick={() => onNavigateToSubscription?.()}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl shadow-md border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <tool.icon className="w-5 h-5" style={{ color: tool.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{tool.name}</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">
                            <Lock className="w-3 h-3" /> PRO
                          </span>
                        </div>
                        <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{tool.description}</p>
                      </div>
                    </div>
                    <Lock className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <>
          {/* Tip de buenas prácticas */}
          <div className={`mb-4 p-3 border rounded-xl flex items-start gap-2.5 ${!t ? 'bg-amber-50 border-amber-200/60' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
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
            <div className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white' : ''} ${
              expandedTool === 'agendapro'
                ? !t ? 'border-teal-300 shadow-lg ring-1 ring-teal-100' : 'shadow-lg'
                : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
            }`}
            style={t ? { background: t.cardBg, borderColor: expandedTool === 'agendapro' ? t.accent : t.cardBorder } : undefined}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'agendapro' ? null : 'agendapro')}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shadow-md border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                    <img src="/icons/agendapro-icon.svg" alt="AgendaPro" className="w-5 h-5 object-contain" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>AgendaPro</h3>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Gestión de citas con AgendaPro</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {agendaproLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : agendaproConnected ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}><span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>Conectado</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}><span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>Desconectado</span>
                  )}
                  {expandedTool === 'agendapro' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'agendapro' && (
                <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                  {agendaproConnected ? (
                    <div className="space-y-4">
                      <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">AgendaPro conectado</span></div>
                          {agendaproIntegration?.provider_email && <span className="text-xs text-green-600">{agendaproIntegration.provider_email}</span>}
                        </div>
                      </div>
                      <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${!t ? (agendaproIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400') : ''}`} style={t ? { color: agendaproIntegration?.bot_access_enabled ? t.accent : t.textMuted } : undefined} />
                          <div>
                            <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Acceso de WITHMIA</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{agendaproIntegration?.bot_access_enabled ? 'WITHMIA puede crear reservas automáticamente' : 'Activa para que WITHMIA agende en AgendaPro'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={agendaproIntegration?.bot_access_enabled || false} onChange={toggleAgendaproBotAccess} className="sr-only peer" />
                          <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectAgendapro} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-teal-50 rounded-lg flex-shrink-0">
                            <Calendar className="w-8 h-8 text-teal-600" />
                          </div>
                          <div>
                            <h4 className={`font-medium mb-1 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conecta tu AgendaPro</h4>
                            <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Integra AgendaPro para que WITHMIA gestione citas y reservas automáticamente.</p>
                            <ul className={`text-xs space-y-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Consultar disponibilidad por servicio</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Crear reservas automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Múltiples sucursales y profesionales</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>API Key de AgendaPro</label>
                          <input
                            type="password"
                            value={agendaproApiKey}
                            onChange={(e) => setAgendaproApiKey(e.target.value)}
                            placeholder="Tu API Key de AgendaPro"
                            className={`w-full px-3 py-2 border rounded-lg text-sm placeholder-neutral-400 ${!t ? 'bg-white border-slate-300 text-neutral-800' : ''} focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                        </div>
                        {agendaproError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {agendaproError}</p>}
                        <button onClick={connectAgendapro} disabled={agendaproConnecting} className={`w-full py-3 border-2 font-medium rounded-lg ${!t ? 'bg-white border-slate-200 hover:border-teal-300 text-neutral-700 hover:text-teal-600' : 'hover:opacity-80'} transition-all flex items-center justify-center gap-2 disabled:opacity-50`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}>
                          {agendaproConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>) : (<><Link2 className="w-4 h-4" /> Conectar AgendaPro</>)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== DENTALINK ==================== */}
            <div className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white' : ''} ${
              expandedTool === 'dentalink'
                ? !t ? 'border-cyan-300 shadow-lg ring-1 ring-cyan-100' : 'shadow-lg'
                : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
            }`}
            style={t ? { background: t.cardBg, borderColor: expandedTool === 'dentalink' ? t.accent : t.cardBorder } : undefined}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'dentalink' ? null : 'dentalink')}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: t ? t.accent : 'linear-gradient(135deg, #00bcd4, #00bcd4DD)' }}>
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Dentalink</h3>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Software de gestión dental</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {dentalinkLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : dentalinkConnected ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}><span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>Conectado</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}><span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>Desconectado</span>
                  )}
                  {expandedTool === 'dentalink' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'dentalink' && (
                <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                  {dentalinkConnected ? (
                    <div className="space-y-4">
                      <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">Dentalink conectado</span></div>
                          {dentalinkIntegration?.provider_email && <span className="text-xs text-green-600">{dentalinkIntegration.provider_email}</span>}
                        </div>
                      </div>
                      <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${!t ? (dentalinkIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400') : ''}`} style={t ? { color: dentalinkIntegration?.bot_access_enabled ? t.accent : t.textMuted } : undefined} />
                          <div>
                            <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Acceso de WITHMIA</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{dentalinkIntegration?.bot_access_enabled ? 'WITHMIA puede agendar citas dentales automáticamente' : 'Activa para que WITHMIA agende en Dentalink'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={dentalinkIntegration?.bot_access_enabled || false} onChange={toggleDentalinkBotAccess} className="sr-only peer" />
                          <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectDentalink} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-cyan-50 rounded-lg flex-shrink-0">
                            <Calendar className="w-8 h-8 text-cyan-600" />
                          </div>
                          <div>
                            <h4 className={`font-medium mb-1 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conecta tu Dentalink</h4>
                            <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Integra Dentalink para que WITHMIA gestione citas dentales automáticamente.</p>
                            <ul className={`text-xs space-y-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Consultar disponibilidad por dentista</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Agendar citas con pacientes</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Múltiples sucursales y tratamientos</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>API Token de Dentalink</label>
                          <input
                            type="password"
                            value={dentalinkApiKey}
                            onChange={(e) => setDentalinkApiKey(e.target.value)}
                            placeholder="Tu API Token de Dentalink"
                            className={`w-full px-3 py-2 border rounded-lg text-sm placeholder-neutral-400 ${!t ? 'bg-white border-slate-300 text-neutral-800' : ''} focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                        </div>
                        {dentalinkError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {dentalinkError}</p>}
                        <button onClick={connectDentalink} disabled={dentalinkConnecting} className={`w-full py-3 border-2 font-medium rounded-lg ${!t ? 'bg-white border-slate-200 hover:border-cyan-300 text-neutral-700 hover:text-cyan-600' : 'hover:opacity-80'} transition-all flex items-center justify-center gap-2 disabled:opacity-50`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}>
                          {dentalinkConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>) : (<><Link2 className="w-4 h-4" /> Conectar Dentalink</>)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== MEDILINK ==================== */}
            <div className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white' : ''} ${
              expandedTool === 'medilink'
                ? !t ? 'border-pink-300 shadow-lg ring-1 ring-pink-100' : 'shadow-lg'
                : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
            }`}
            style={t ? { background: t.cardBg, borderColor: expandedTool === 'medilink' ? t.accent : t.cardBorder } : undefined}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'medilink' ? null : 'medilink')}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: t ? t.accent : 'linear-gradient(135deg, #e91e63, #e91e63DD)' }}>
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Medilink</h3>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Sistema de fichas médicas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {medilinkLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : medilinkConnected ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}><span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>Conectado</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}><span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>Desconectado</span>
                  )}
                  {expandedTool === 'medilink' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'medilink' && (
                <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                  {medilinkConnected ? (
                    <div className="space-y-4">
                      <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">Medilink conectado</span></div>
                          {medilinkIntegration?.provider_email && <span className="text-xs text-green-600">{medilinkIntegration.provider_email}</span>}
                        </div>
                      </div>
                      <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${!t ? (medilinkIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400') : ''}`} style={t ? { color: medilinkIntegration?.bot_access_enabled ? t.accent : t.textMuted } : undefined} />
                          <div>
                            <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Acceso de WITHMIA</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{medilinkIntegration?.bot_access_enabled ? 'WITHMIA puede agendar citas médicas automáticamente' : 'Activa para que WITHMIA agende en Medilink'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={medilinkIntegration?.bot_access_enabled || false} onChange={toggleMedilinkBotAccess} className="sr-only peer" />
                          <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectMedilink} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-pink-50 rounded-lg flex-shrink-0">
                            <Calendar className="w-8 h-8 text-pink-600" />
                          </div>
                          <div>
                            <h4 className={`font-medium mb-1 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conecta tu Medilink</h4>
                            <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Integra Medilink para que WITHMIA gestione citas médicas automáticamente.</p>
                            <ul className={`text-xs space-y-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Consultar disponibilidad por profesional</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Agendar citas con pacientes</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Múltiples especialidades médicas</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>API Token de Medilink</label>
                          <input
                            type="password"
                            value={medilinkApiKey}
                            onChange={(e) => setMedilinkApiKey(e.target.value)}
                            placeholder="Tu API Token de Medilink"
                            className={`w-full px-3 py-2 border rounded-lg text-sm placeholder-neutral-400 ${!t ? 'bg-white border-slate-300 text-neutral-800' : ''} focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                        </div>
                        {medilinkError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {medilinkError}</p>}
                        <button onClick={connectMedilink} disabled={medilinkConnecting} className={`w-full py-3 border-2 font-medium rounded-lg ${!t ? 'bg-white border-slate-200 hover:border-pink-300 text-neutral-700 hover:text-pink-600' : 'hover:opacity-80'} transition-all flex items-center justify-center gap-2 disabled:opacity-50`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}>
                          {medilinkConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>) : (<><Link2 className="w-4 h-4" /> Conectar Medilink</>)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== CALENDLY ==================== */}
            <div className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white' : ''} ${
              expandedTool === 'calendly'
                ? !t ? 'border-blue-300 shadow-lg ring-1 ring-blue-100' : 'shadow-lg'
                : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
            }`}
            style={t ? { background: t.cardBg, borderColor: expandedTool === 'calendly' ? t.accent : t.cardBorder } : undefined}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'calendly' ? null : 'calendly')}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: t ? t.accent : 'linear-gradient(135deg, #006BFF, #006BFFDD)' }}>
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Calendly</h3>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Agenda reuniones con Calendly</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {calendlyLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : calendlyConnected ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}><span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>Conectado</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}><span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>Desconectado</span>
                  )}
                  {expandedTool === 'calendly' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'calendly' && (
                <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                  {calendlyConnected ? (
                    <div className="space-y-4">
                      <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">Calendly conectado</span></div>
                          {calendlyIntegration?.provider_email && <span className="text-xs text-green-600">{calendlyIntegration.provider_email}</span>}
                        </div>
                      </div>
                      <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${!t ? (calendlyIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400') : ''}`} style={t ? { color: calendlyIntegration?.bot_access_enabled ? t.accent : t.textMuted } : undefined} />
                          <div>
                            <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Acceso de WITHMIA</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{calendlyIntegration?.bot_access_enabled ? 'WITHMIA puede enviar links de agendamiento' : 'Activa para que WITHMIA agende vía Calendly'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={calendlyIntegration?.bot_access_enabled || false} onChange={toggleCalendlyBotAccess} className="sr-only peer" />
                          <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectCalendly} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <CalendarDays className="w-8 h-8 text-blue-600" />
                          </div>
                          <div>
                            <h4 className={`font-medium mb-1 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conecta tu Calendly</h4>
                            <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Integra Calendly para que WITHMIA envíe links de agendamiento a tus clientes automáticamente.</p>
                            <ul className={`text-xs space-y-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Links de agendamiento personalizados</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Tipos de evento configurables</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Sincronización automática</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button onClick={connectCalendly} disabled={calendlyConnecting} className={`w-full py-3 border-2 font-medium rounded-lg ${!t ? 'bg-white border-slate-200 hover:border-blue-300 text-neutral-700 hover:text-blue-600' : 'hover:opacity-80'} transition-all flex items-center justify-center gap-2 disabled:opacity-50`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}>
                        {calendlyConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>) : (<><Link2 className="w-4 h-4" /> Conectar con Calendly</>)}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== GOOGLE CALENDAR ==================== */}
            <div className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white' : ''} ${
              expandedTool === 'calendar'
                ? !t ? 'border-rose-300 shadow-lg ring-1 ring-rose-100' : 'shadow-lg'
                : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
            }`}
            style={t ? { background: t.cardBg, borderColor: expandedTool === 'calendar' ? t.accent : t.cardBorder } : undefined}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedTool(expandedTool === 'calendar' ? null : 'calendar')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: t ? t.accent : 'linear-gradient(135deg, #DC2626, #DC2626DD)' }}>
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Google Calendar</h3>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Integra con Google Calendar para agendar citas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {gcalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                  ) : gcalConnected ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>
                      Conectado
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}>
                      <span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>
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
                <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                  {gcalConnected ? (
                    <div className="space-y-4">
                      <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
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
                      <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${!t ? (gcalIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400') : ''}`} style={t ? { color: gcalIntegration?.bot_access_enabled ? t.accent : t.textMuted } : undefined} />
                          <div>
                            <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Acceso de WITHMIA</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              {gcalIntegration?.bot_access_enabled ? 'WITHMIA puede consultar y crear eventos' : 'Activa para que WITHMIA agende citas'}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={gcalIntegration?.bot_access_enabled || false} onChange={toggleGcalBotAccess} className="sr-only peer" />
                          <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectGoogleCalendar} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}>
                          <Unlink className="w-4 h-4" /> Desconectar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
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
                            <h4 className={`font-medium mb-1 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conecta tu Google Calendar</h4>
                            <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Sincroniza tu calendario para que WITHMIA consulte disponibilidad y agende citas.</p>
                            <ul className={`text-xs space-y-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Ver disponibilidad en tiempo real</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Agendar reuniones automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Sincronización bidireccional</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button onClick={connectGoogleCalendar} disabled={gcalConnecting} className={`w-full py-3 border-2 font-medium rounded-lg ${!t ? 'bg-white border-slate-200 hover:border-rose-300 text-neutral-700 hover:text-rose-600' : 'hover:opacity-80'} transition-all flex items-center justify-center gap-2 disabled:opacity-50`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}>
                        {gcalConnecting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>) : (<><Link2 className="w-4 h-4" /> Conectar con Google</>)}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================== OUTLOOK CALENDAR ==================== */}
            <div className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white' : ''} ${
              expandedTool === 'outlook'
                ? !t ? 'border-blue-400 shadow-lg ring-1 ring-blue-100' : 'shadow-lg'
                : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
            }`}
            style={t ? { background: t.cardBg, borderColor: expandedTool === 'outlook' ? t.accent : t.cardBorder } : undefined}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'outlook' ? null : 'outlook')}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: t ? t.accent : 'linear-gradient(135deg, #0078D4, #0078D4DD)' }}>
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Outlook Calendar</h3>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Integra con Outlook/Microsoft Calendar</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {outlookLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : outlookConnected ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}><span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>Conectado</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}><span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>Desconectado</span>
                  )}
                  {expandedTool === 'outlook' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'outlook' && (
                <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                  {outlookConnected ? (
                    <div className="space-y-4">
                      <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">Outlook Calendar conectado</span></div>
                          {outlookIntegration?.provider_email && <span className="text-xs text-green-600">{outlookIntegration.provider_email}</span>}
                        </div>
                      </div>
                      <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${!t ? (outlookIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400') : ''}`} style={t ? { color: outlookIntegration?.bot_access_enabled ? t.accent : t.textMuted } : undefined} />
                          <div>
                            <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Acceso de WITHMIA</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{outlookIntegration?.bot_access_enabled ? 'WITHMIA puede consultar y crear eventos' : 'Activa para que WITHMIA agende citas'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={outlookIntegration?.bot_access_enabled || false} onChange={toggleOutlookBotAccess} className="sr-only peer" />
                          <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectOutlook} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                              <path d="M21.5 5H8.5C7.67 5 7 5.67 7 6.5V17.5C7 18.33 7.67 19 8.5 19H21.5C22.33 19 23 18.33 23 17.5V6.5C23 5.67 22.33 5 21.5 5Z" fill="#0078D4"/>
                              <path d="M23 8L15 13L7 8V6L15 11L23 6V8Z" fill="white" opacity="0.9"/>
                              <path d="M1 7H6V18H2.5C1.67 18 1 17.33 1 16.5V7Z" fill="#0078D4" opacity="0.7"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className={`font-medium mb-1 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conecta tu Outlook Calendar</h4>
                            <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Sincroniza tu calendario de Microsoft para que WITHMIA agende citas automáticamente.</p>
                            <ul className={`text-xs space-y-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Ver disponibilidad en tiempo real</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Crear eventos automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Microsoft 365 y Outlook.com</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button onClick={connectOutlook} disabled={outlookConnecting} className={`w-full py-3 border-2 font-medium rounded-lg ${!t ? 'bg-white border-slate-200 hover:border-blue-400 text-neutral-700 hover:text-blue-600' : 'hover:opacity-80'} transition-all flex items-center justify-center gap-2 disabled:opacity-50`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}>
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
            <div className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white' : ''} ${
              expandedTool === 'reservo'
                ? !t ? 'border-amber-300 shadow-lg ring-1 ring-amber-100' : 'shadow-lg'
                : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
            }`}
            style={t ? { background: t.cardBg, borderColor: expandedTool === 'reservo' ? t.accent : t.cardBorder } : undefined}>
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(expandedTool === 'reservo' ? null : 'reservo')}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shadow-md overflow-hidden flex items-center justify-center ${!t ? 'bg-gradient-to-br from-teal-400 to-teal-600' : ''}`} style={t ? { background: t.accent } : undefined}>
                    <img src="/icons/reservo.webp" alt="Reservo" className="w-5 h-auto object-contain brightness-0 invert" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Reservo</h3>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Sistema de reservas y citas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {reservoLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : reservoConnected ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}><span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>Conectado</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}><span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>Desconectado</span>
                  )}
                  {expandedTool === 'reservo' ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
              </div>
              {expandedTool === 'reservo' && (
                <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                  {reservoConnected ? (
                    <div className="space-y-4">
                      <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">Reservo conectado</span></div>
                          {reservoIntegration?.provider_email && <span className="text-xs text-green-600">{reservoIntegration.provider_email}.reservo.cl</span>}
                        </div>
                      </div>
                      <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-center gap-3">
                          <Bot className={`w-5 h-5 ${!t ? (reservoIntegration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400') : ''}`} style={t ? { color: reservoIntegration?.bot_access_enabled ? t.accent : t.textMuted } : undefined} />
                          <div>
                            <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Acceso de WITHMIA</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{reservoIntegration?.bot_access_enabled ? 'WITHMIA puede crear reservas automáticamente' : 'Activa para que WITHMIA agende en Reservo'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={reservoIntegration?.bot_access_enabled || false} onChange={toggleReservoBotAccess} className="sr-only peer" />
                          <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={disconnectReservo} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}><Unlink className="w-4 h-4" /> Desconectar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                            <Calendar className="w-8 h-8 text-amber-600" />
                          </div>
                          <div>
                            <h4 className={`font-medium mb-1 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Conecta tu Reservo</h4>
                            <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Integra Reservo para que WITHMIA gestione reservas y citas de tus clientes.</p>
                            <ul className={`text-xs space-y-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Consultar disponibilidad</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Crear reservas automáticamente</li>
                              <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-green-500" /> Gestión de servicios</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Subdominio de Reservo</label>
                          <input
                            type="text"
                            value={reservoSubdomain}
                            onChange={(e) => setReservoSubdomain(e.target.value)}
                            placeholder="tu-negocio"
                            className={`w-full px-3 py-2 border rounded-lg text-sm placeholder-neutral-400 ${!t ? 'bg-white border-slate-300 text-neutral-800' : ''} focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                          <p className="text-xs text-neutral-400 mt-1">tu-negocio.reservo.cl</p>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>API Key</label>
                          <input
                            type="password"
                            value={reservoApiKey}
                            onChange={(e) => setReservoApiKey(e.target.value)}
                            placeholder="Tu API Key de Reservo"
                            className={`w-full px-3 py-2 border rounded-lg text-sm placeholder-neutral-400 ${!t ? 'bg-white border-slate-300 text-neutral-800' : ''} focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                        </div>
                        {reservoError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {reservoError}</p>}
                        <button onClick={connectReservo} disabled={reservoConnecting} className={`w-full py-3 border-2 font-medium rounded-lg ${!t ? 'bg-white border-slate-200 hover:border-amber-300 text-neutral-700 hover:text-amber-600' : 'hover:opacity-80'} transition-all flex items-center justify-center gap-2 disabled:opacity-50`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}>
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
                  id: 'mysql_db', name: 'Base de datos MySQL', icon: Database,
                  gradient: 'linear-gradient(135deg, #00758F, #00758FDD)',
                  subtitle: 'Conecta directo a tu base de datos',
                  fields: [
                    { key: 'db_host', label: 'Host del servidor', placeholder: 'Ej: mysql.miempresa.com o 192.168.1.100', hint: 'La dirección de tu servidor MySQL', type: 'text' },
                    { key: 'db_port', label: 'Puerto (opcional)', placeholder: '3306', hint: 'Normalmente es 3306', type: 'text' },
                    { key: 'db_name', label: 'Nombre de la base de datos', placeholder: 'Ej: mi_tienda', hint: '', type: 'text' },
                    { key: 'db_user', label: 'Usuario', placeholder: 'Ej: admin', hint: '', type: 'text' },
                    { key: 'db_password', label: 'Contraseña', placeholder: 'Contraseña del usuario MySQL', hint: '', type: 'password' },
                    { key: 'db_table', label: 'Tabla de productos', placeholder: 'Ej: productos, products, items', hint: 'La tabla donde están guardados tus productos', type: 'text' },
                  ],
                  requiredFields: ['db_host', 'db_name', 'db_user', 'db_password', 'db_table'],
                  credentialMap: { db_host: 'db_host', db_port: 'db_port', db_name: 'db_name', db_user: 'db_user', db_password: 'db_password', db_table: 'db_table' },
                  steps: [
                    'Pídele a tu programador los datos de acceso a MySQL',
                    'Necesitas: host, base de datos, usuario y contraseña',
                    'Indica la tabla donde están guardados tus productos',
                  ],
                },
                {
                  id: 'api_rest', name: 'API REST', icon: Globe,
                  gradient: 'linear-gradient(135deg, #F59E0B, #F59E0BDD)',
                  subtitle: 'Conecta cualquier endpoint REST',
                  fields: [
                    { key: 'api_url', label: 'Link donde están tus productos', placeholder: 'Ej: https://misite.com/api/productos.php', hint: 'Debe devolver tus productos en formato JSON', type: 'text' },
                    { key: 'api_key', label: 'Contraseña de la API (si tiene)', placeholder: 'Déjalo vacío si no requiere contraseña', hint: '', type: 'password' },
                  ],
                  requiredFields: ['api_url'],
                  credentialMap: { api_url: 'api_url', api_key: 'api_key' },
                  steps: [
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
                  <div key={prov.id} className={`rounded-xl border transition-all duration-200 ${!t ? 'bg-white' : ''} ${
                    isExpanded
                      ? !t ? 'border-blue-300 shadow-lg ring-1 ring-blue-100' : 'shadow-lg'
                      : !t ? 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md' : 'shadow-sm hover:shadow-md'
                  }`}
                  style={t ? { background: t.cardBg, borderColor: isExpanded ? t.accent : t.cardBorder } : undefined}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedTool(isExpanded ? null : prov.id)}>
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl shadow-md" style={{ background: t ? t.accent : prov.gradient }}>
                          <ProvIcon className={`w-5 h-5 ${iconTextColor}`} />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{prov.name}</h3>
                          <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{isConnected ? `${integration.products_count || 0} productos sincronizados` : prov.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {productIntegrationsLoading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : isConnected ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-green-100 text-green-700' : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}><span className={`w-1.5 h-1.5 rounded-full animate-pulse ${!t ? 'bg-green-500' : ''}`} style={t ? { background: t.accent } : undefined}></span>Conectado</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-red-100 text-red-700' : ''}`} style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted } : undefined}><span className={`w-1.5 h-1.5 rounded-full ${!t ? 'bg-red-500' : ''}`} style={t ? { background: t.textMuted } : undefined}></span>Desconectado</span>
                        )}
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className={`border-t p-6 ${!t ? 'border-slate-100 bg-slate-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.expandedBg } : undefined}>
                        {isConnected ? (
                          <div className="space-y-4">
                            <div className={`p-3 border rounded-lg ${!t ? 'bg-green-50 border-green-200' : ''}`} style={t ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgb(240,253,244)', borderColor: isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)' } : undefined}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /><span className="text-sm font-medium">{prov.name} conectado</span></div>
                                <div className="flex items-center gap-2">
                                  {integration.store_url && <span className="text-xs text-green-600">{integration.store_url}</span>}
                                  <span className="text-xs text-green-600 font-medium">{integration.products_count || 0} productos</span>
                                </div>
                              </div>
                            </div>
                            <div className={`flex items-center justify-between p-4 rounded-lg border ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.inputBg, borderColor: t.cardBorder } : undefined}>
                              <div className="flex items-center gap-3">
                                <Bot className={`w-5 h-5 ${!t ? (integration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400') : ''}`} style={t ? { color: integration?.bot_access_enabled ? t.accent : t.textMuted } : undefined} />
                                <div>
                                  <p className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>Que WITHMIA use estos productos</p>
                                  <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{integration?.bot_access_enabled ? 'WITHMIA recomienda estos productos a tus clientes' : 'Activa para que WITHMIA recomiende tus productos'}</p>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={integration?.bot_access_enabled || false} onChange={() => toggleProductBotAccess(prov.id)} className="sr-only peer" />
                                <div className={`w-11 h-6 ${!t ? 'bg-gray-200 peer-focus:ring-purple-100 peer-checked:bg-purple-600' : 'int-toggle'} peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`} />
                              </label>
                            </div>
                            <div className="flex justify-between items-center">
                              <button onClick={() => syncProductProvider(prov.id)} disabled={syncingProductProvider === prov.id}
                                className={`px-4 py-2 border ${!t ? 'bg-white border-slate-200 hover:border-slate-400 text-neutral-700' : ''} text-sm font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50`}
                                style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}>
                                <RefreshCw className={`w-4 h-4 ${syncingProductProvider === prov.id ? 'animate-spin' : ''}`} />
                                {syncingProductProvider === prov.id ? 'Actualizando...' : 'Actualizar productos'}
                              </button>
                              <button onClick={() => disconnectProductProvider(prov.id)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${!t ? 'bg-red-500 hover:bg-red-600 text-white' : 'border text-red-400 hover:bg-red-500/10'}`} style={t ? { borderColor: 'rgba(239,68,68,0.4)' } : undefined}><Unlink className="w-4 h-4" /> Desconectar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {/* Step-by-step guide */}
                            <div className={`p-4 border rounded-xl ${!t ? 'bg-blue-50/60 border-blue-100' : ''}`} style={t ? { background: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(239,246,255,0.6)', borderColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgb(219,234,254)' } : undefined}>
                              <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${!t ? 'text-blue-700' : ''}`} style={t ? { color: isDark ? 'rgb(96,165,250)' : 'rgb(29,78,216)' } : undefined}>¿Cómo lo hago?</p>
                              <div className="space-y-2.5">
                                {prov.steps.map((step, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center mt-0.5 ${!t ? 'bg-blue-500' : ''}`} style={t ? { background: t.accent } : undefined}>{i + 1}</span>
                                    <p className={`text-sm leading-relaxed ${!t ? 'text-blue-800' : ''}`} style={t ? { color: isDark ? 'rgb(147,197,253)' : 'rgb(30,64,175)' } : undefined}>{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Plugin download CTA for WooCommerce */}
                            {prov.id === 'woocommerce' && (
                              <div className={`p-4 border rounded-xl ${!t ? 'bg-purple-50 border-purple-200' : ''}`} style={t ? { background: t.accent + '15', borderColor: t.accent + '30' } : undefined}>
                                <div className="flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${!t ? 'bg-purple-100' : ''}`} style={t ? { background: t.accent + '20' } : undefined}>
                                    <Download className={`w-4 h-4 ${!t ? 'text-purple-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                                  </div>
                                  <div className="flex-1">
                                    <p className={`text-sm font-semibold mb-1 ${!t ? 'text-purple-800' : ''}`} style={t ? { color: t.text } : undefined}>Plugin WITHMIA para WooCommerce</p>
                                    <p className={`text-xs mb-2 ${!t ? 'text-purple-600' : ''}`} style={t ? { color: t.accent } : undefined}>Instala nuestro plugin en WordPress para sincronizar productos, generar carritos por URL, rastrear carritos abandonados y más.</p>
                                    <a
                                      href="/plugins/withmia-for-woocommerce/download"
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${!t ? 'bg-purple-600 hover:bg-purple-700' : ''}`} style={t ? { background: t.accent } : undefined}
                                      download
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Descargar plugin .zip
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="space-y-3">
                              {prov.fields.map(field => (
                                <div key={field.key}>
                                  <label className={`block text-sm font-medium mb-1 ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>{field.label}</label>
                                  <input
                                    type={field.type}
                                    value={form.fields[field.key] || ''}
                                    onChange={e => setProviderField(prov.id, field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm placeholder-neutral-400 ${!t ? 'bg-white border-slate-300 text-neutral-800' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`} style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
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
                              onClick={() => connectProvider(prov.id, prov.credentialMap as unknown as Record<string, string>, prov.requiredFields)}
                              disabled={form.connecting}
                              className={`w-full py-3 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-200/50' : ''}`} style={t ? { background: t.accent } : undefined}
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
          </>
          )}
        </div>

      </div>
    </div>
  );
};

export default IntegrationSection;
