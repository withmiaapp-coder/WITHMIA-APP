import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Unlink,
  RefreshCw,
  Settings,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  Check,
  X,
  Bot,
  Loader2,
  Trash2,
  AlertCircle,
  Globe,
  Video,
  Link2,
} from 'lucide-react';

// ====== TIPOS ======
type CalendarProvider = 'google' | 'outlook' | 'calendly' | 'reservo' | 'agendapro' | 'dentalink' | 'medilink';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  status: string;
  htmlLink: string | null;
  hangoutLink: string | null;
  onlineMeetingUrl: string | null;
  webLink: string | null;
  attendees: { email: string; name: string; status: string }[];
  color: string | null;
  creator: string | null;
  provider: CalendarProvider;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  description: string;
  primary: boolean;
  backgroundColor: string;
  accessRole: string;
}

interface Integration {
  id: number;
  provider: string;
  provider_email: string | null;
  is_active: boolean;
  is_connected: boolean;
  bot_access_enabled: boolean;
  selected_calendar_id: string | null;
  settings: Record<string, any> | null;
  last_sync_at: string | null;
  created_at: string | null;
}

interface Props {
  user: any;
  company: any;
}

// ====== HELPERS ======
function getAuthHeaders(): Record<string, string> {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('auth_token') || '';
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Railway-Auth': token,
  };
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('auth_token') || '';
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}auth_token=${token}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API Error ${res.status}: ${errorBody}`);
  }
  return res.json();
}

// ====== COLORES DE EVENTOS ======
const EVENT_COLORS = [
  '#4285f4', '#7986cb', '#33b679', '#8e24aa', '#e67c73',
  '#f6bf26', '#f4511e', '#039be5', '#616161', '#3f51b5',
  '#0b8043', '#d50000',
];

const PROVIDER_COLORS: Record<CalendarProvider, string> = {
  google: '#4285f4',
  outlook: '#0078D4',
  calendly: '#006BFF',
  reservo: '#14b8a6',
  agendapro: '#6366f1',
  dentalink: '#00bcd4',
  medilink: '#e91e63',
};

const PROVIDER_NAMES: Record<CalendarProvider, string> = {
  google: 'Google Calendar',
  outlook: 'Outlook',
  calendly: 'Calendly',
  reservo: 'Reservo',
  agendapro: 'AgendaPro',
  dentalink: 'Dentalink',
  medilink: 'Medilink',
};

function getEventColor(event: CalendarEvent, index: number): string {
  // Use provider color for non-Google events
  if (event.provider && event.provider !== 'google') {
    return PROVIDER_COLORS[event.provider] || EVENT_COLORS[index % EVENT_COLORS.length];
  }
  if (event.color && EVENT_COLORS[parseInt(event.color) - 1]) {
    return EVENT_COLORS[parseInt(event.color) - 1];
  }
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

function formatTimeStr(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

// ====== COMPONENTE PRINCIPAL ======
export default function CalendarSection({ user, company }: Props) {
  // Estado de integración (Google Calendar como proveedor principal de vista)
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  // Estado de otros proveedores
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookConnecting, setOutlookConnecting] = useState(false);
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [calendlyConnecting, setCalendlyConnecting] = useState(false);
  const [reservoConnected, setReservoConnected] = useState(false);
  const [agendaproConnected, setAgendaproConnected] = useState(false);
  const [dentalinkConnected, setDentalinkConnected] = useState(false);
  const [medilinkConnected, setMedilinkConnected] = useState(false);

  // Panel de conexión
  const [showConnectPanel, setShowConnectPanel] = useState(false);

  // Estado del calendario
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('primary');
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Vista y navegación
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Modal de crear evento
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  // Errores
  const [error, setError] = useState<string | null>(null);

  // ====== CARGAR ESTADO DE INTEGRACIÓN (TODOS LOS PROVEEDORES) ======
  const loadIntegrationStatus = useCallback(async () => {
    try {
      setLoading(true);
      // Cargar todos los proveedores en paralelo
      const [googleRes, outlookRes, calendlyRes, reservoRes, agendaproRes, dentalinkRes, medilinkRes] = await Promise.allSettled([
        apiFetch('/api/calendar/status'),
        apiFetch('/api/outlook/status'),
        apiFetch('/api/calendly/status'),
        apiFetch('/api/reservo/status'),
        apiFetch('/api/agendapro/status'),
        apiFetch('/api/dentalink/status'),
        apiFetch('/api/medilink/status'),
      ]);

      // Google Calendar
      if (googleRes.status === 'fulfilled') {
        const data = googleRes.value;
        setIsConnected(data.connected);
        setIntegration(data.integration);
        if (data.connected) setActiveProvider('google');
        if (data.integration?.selected_calendar_id) {
          setSelectedCalendar(data.integration.selected_calendar_id);
        }
      }
      // Outlook
      if (outlookRes.status === 'fulfilled') {
        setOutlookConnected(outlookRes.value.connected);
        if (outlookRes.value.connected && !isConnected) setActiveProvider('outlook');
      }
      // Calendly
      if (calendlyRes.status === 'fulfilled') {
        setCalendlyConnected(calendlyRes.value.connected);
      }
      // Reservo
      if (reservoRes.status === 'fulfilled') {
        setReservoConnected(reservoRes.value.connected);
      }
      // AgendaPro
      if (agendaproRes.status === 'fulfilled') {
        setAgendaproConnected(agendaproRes.value.connected);
      }
      // Dentalink
      if (dentalinkRes.status === 'fulfilled') {
        setDentalinkConnected(dentalinkRes.value.connected);
      }
      // Medilink
      if (medilinkRes.status === 'fulfilled') {
        setMedilinkConnected(medilinkRes.value.connected);
      }
    } catch (err) {
      console.error('Error loading calendar status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ====== CARGAR CALENDARIOS ======
  const loadCalendars = useCallback(async () => {
    try {
      const data = await apiFetch('/api/calendar/calendars');
      setCalendars(data.calendars || []);
    } catch (err) {
      console.error('Error loading calendars:', err);
    }
  }, []);

  // ====== CARGAR EVENTOS (MULTI-PROVEEDOR) ======
  const loadEvents = useCallback(async () => {
    if (!isConnected && !outlookConnected && !calendlyConnected) return;

    try {
      setLoadingEvents(true);
      setError(null);

      const startOfView = new Date(currentDate);
      const endOfView = new Date(currentDate);

      if (viewMode === 'month') {
        startOfView.setDate(1);
        startOfView.setDate(startOfView.getDate() - startOfView.getDay());
        endOfView.setMonth(endOfView.getMonth() + 1, 0);
        endOfView.setDate(endOfView.getDate() + (6 - endOfView.getDay()));
      } else if (viewMode === 'week') {
        startOfView.setDate(startOfView.getDate() - startOfView.getDay());
        endOfView.setDate(startOfView.getDate() + 6);
      }

      const timeMin = startOfView.toISOString();
      const timeMax = endOfView.toISOString();

      // Fetch from all connected providers in parallel
      const fetches: Promise<{ provider: CalendarProvider; events: any[] }>[] = [];

      if (isConnected) {
        fetches.push(
          apiFetch(`/api/calendar/events?calendar_id=${encodeURIComponent(selectedCalendar)}&time_min=${timeMin}&time_max=${timeMax}`)
            .then(data => ({ provider: 'google' as CalendarProvider, events: data.events || [] }))
            .catch(() => ({ provider: 'google' as CalendarProvider, events: [] }))
        );
      }

      if (outlookConnected) {
        fetches.push(
          apiFetch(`/api/outlook/events?start=${timeMin}&end=${timeMax}`)
            .then(data => ({ provider: 'outlook' as CalendarProvider, events: data.events || [] }))
            .catch(() => ({ provider: 'outlook' as CalendarProvider, events: [] }))
        );
      }

      if (calendlyConnected) {
        fetches.push(
          apiFetch(`/api/calendly/events?min_date=${timeMin}&max_date=${timeMax}`)
            .then(data => ({ provider: 'calendly' as CalendarProvider, events: data.events || [] }))
            .catch(() => ({ provider: 'calendly' as CalendarProvider, events: [] }))
        );
      }

      const results = await Promise.all(fetches);

      // Normalize all events into unified CalendarEvent format
      const allEvents: CalendarEvent[] = [];

      for (const result of results) {
        for (const evt of result.events) {
          if (result.provider === 'google') {
            allEvents.push({ ...evt, provider: 'google', onlineMeetingUrl: null, webLink: null });
          } else if (result.provider === 'outlook') {
            allEvents.push({
              id: evt.id,
              title: evt.title || '(Sin título)',
              description: evt.body?.content || evt.description || '',
              location: evt.location || '',
              start: evt.start,
              end: evt.end,
              allDay: evt.allDay || false,
              status: evt.status || 'confirmed',
              htmlLink: null,
              hangoutLink: null,
              onlineMeetingUrl: evt.onlineMeetingUrl || null,
              webLink: evt.webLink || null,
              attendees: evt.attendees || [],
              color: null,
              creator: null,
              provider: 'outlook',
            });
          } else if (result.provider === 'calendly') {
            allEvents.push({
              id: evt.uri || evt.id || `calendly-${Math.random()}`,
              title: evt.name || '(Sin título)',
              description: '',
              location: evt.location?.location || evt.location || '',
              start: evt.start_time || evt.start || '',
              end: evt.end_time || evt.end || '',
              allDay: false,
              status: evt.status || 'active',
              htmlLink: evt.uri || null,
              hangoutLink: null,
              onlineMeetingUrl: null,
              webLink: null,
              attendees: [],
              color: null,
              creator: null,
              provider: 'calendly',
            });
          }
        }
      }

      // Sort by start time
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setEvents(allEvents);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError('Error al cargar eventos. Intenta reconectar tu calendario desde Integraciones.');
    } finally {
      setLoadingEvents(false);
    }
  }, [isConnected, outlookConnected, calendlyConnected, currentDate, viewMode, selectedCalendar]);

  // ====== CONECTAR GOOGLE CALENDAR ======
  const connectGoogle = useCallback(async () => {
    try {
      setConnecting(true);
      const data = await apiFetch('/api/calendar/google/auth-url');

      const authWindow = window.open(data.auth_url, 'google_auth', 'width=600,height=700,left=200,top=100');

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'gcal_oauth_result') {
          window.removeEventListener('message', handleMessage);
          setConnecting(false);

          if (event.data.status === 'success') {
            await loadIntegrationStatus();
          } else {
            setError(event.data.message || 'Error al conectar Google Calendar');
          }
        }
      };

      window.addEventListener('message', handleMessage);

      const pollInterval = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(pollInterval);
          setTimeout(async () => {
            setConnecting(false);
            window.removeEventListener('message', handleMessage);
            await loadIntegrationStatus();
          }, 500);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(pollInterval);
        window.removeEventListener('message', handleMessage);
        setConnecting(false);
      }, 300000);

    } catch (err) {
      console.error('Error connecting Google Calendar:', err);
      setError('Error al conectar Google Calendar');
      setConnecting(false);
    }
  }, [loadIntegrationStatus]);

  // ====== CONECTAR OUTLOOK ======
  const connectOutlook = useCallback(async () => {
    try {
      setOutlookConnecting(true);
      const data = await apiFetch('/api/outlook/auth-url');
      const authWindow = window.open(data.auth_url, 'outlook_auth', 'width=600,height=700,left=200,top=100');
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'outlook_oauth_result') {
          window.removeEventListener('message', handleMessage);
          setOutlookConnecting(false);
          if (event.data.status === 'success') await loadIntegrationStatus();
          else setError(event.data.message || 'Error al conectar Outlook');
        }
      };
      window.addEventListener('message', handleMessage);
      const pollInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollInterval);
          setTimeout(async () => { setOutlookConnecting(false); window.removeEventListener('message', handleMessage); await loadIntegrationStatus(); }, 500);
        }
      }, 1000);
      setTimeout(() => { clearInterval(pollInterval); window.removeEventListener('message', handleMessage); setOutlookConnecting(false); }, 300000);
    } catch (err: any) {
      console.error('Error connecting Outlook:', err);
      const msg = err?.message || '';
      if (msg.includes('500') || msg.includes('not configured')) {
        setError('Outlook Calendar no está configurado aún. Contacta al administrador para configurar las credenciales de Microsoft.');
      } else {
        setError('Error al conectar Outlook Calendar');
      }
      setOutlookConnecting(false);
    }
  }, [loadIntegrationStatus]);

  // ====== CONECTAR CALENDLY ======
  const connectCalendly = useCallback(async () => {
    try {
      setCalendlyConnecting(true);
      const data = await apiFetch('/api/calendly/auth-url');
      const authWindow = window.open(data.auth_url, 'calendly_auth', 'width=600,height=700,left=200,top=100');
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'calendly_oauth_result') {
          window.removeEventListener('message', handleMessage);
          setCalendlyConnecting(false);
          if (event.data.status === 'success') await loadIntegrationStatus();
          else setError(event.data.message || 'Error al conectar Calendly');
        }
      };
      window.addEventListener('message', handleMessage);
      const pollInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollInterval);
          setTimeout(async () => { setCalendlyConnecting(false); window.removeEventListener('message', handleMessage); await loadIntegrationStatus(); }, 500);
        }
      }, 1000);
      setTimeout(() => { clearInterval(pollInterval); window.removeEventListener('message', handleMessage); setCalendlyConnecting(false); }, 300000);
    } catch (err) {
      console.error('Error connecting Calendly:', err);
      setError('Error al conectar Calendly');
      setCalendlyConnecting(false);
    }
  }, [loadIntegrationStatus]);

  // ====== DESCONECTAR ======
  const disconnectGoogle = useCallback(async () => {
    if (!confirm('¿Estás seguro de desconectar Google Calendar? Se perderá el acceso del bot al calendario.')) return;
    try {
      await apiFetch('/api/calendar/google/disconnect', { method: 'POST' });
      setIsConnected(false);
      setIntegration(null);
      setEvents([]);
      setCalendars([]);
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, []);

  // ====== TOGGLE BOT ACCESS ======
  const toggleBotAccess = useCallback(async () => {
    if (!integration) return;
    try {
      const data = await apiFetch('/api/calendar/settings', {
        method: 'PUT',
        body: JSON.stringify({ bot_access_enabled: !integration.bot_access_enabled }),
      });
      setIntegration(data.integration);
    } catch (err) {
      console.error('Error toggling bot access:', err);
    }
  }, [integration]);

  // ====== SELECCIONAR CALENDARIO ======
  const selectCalendar = useCallback(async (calendarId: string) => {
    try {
      setSelectedCalendar(calendarId);
      await apiFetch('/api/calendar/settings', {
        method: 'PUT',
        body: JSON.stringify({ selected_calendar_id: calendarId }),
      });
    } catch (err) {
      console.error('Error selecting calendar:', err);
    }
  }, []);

  // ====== CREAR EVENTO ======
  const handleCreateEvent = useCallback(async (eventData: {
    title: string;
    description: string;
    location: string;
    start: string;
    end: string;
    allDay: boolean;
  }) => {
    try {
      const data = await apiFetch('/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          ...eventData,
          all_day: eventData.allDay,
          calendar_id: selectedCalendar,
        }),
      });

      if (data.success) {
        setShowCreateModal(false);
        await loadEvents();
      }
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Error al crear el evento');
    }
  }, [selectedCalendar, loadEvents]);

  // ====== ELIMINAR EVENTO (MULTI-PROVEEDOR) ======
  const handleDeleteEvent = useCallback(async (event: CalendarEvent) => {
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      if (event.provider === 'google') {
        await apiFetch(`/api/calendar/events/${event.id}?calendar_id=${encodeURIComponent(selectedCalendar)}`, {
          method: 'DELETE',
        });
      } else if (event.provider === 'outlook') {
        await apiFetch(`/api/outlook/events/${event.id}`, {
          method: 'DELETE',
        });
      } else {
        // Calendly, Reservo, AgendaPro, Dentalink, Medilink don't support delete from here
        return;
      }
      setSelectedEvent(null);
      await loadEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Error al eliminar el evento');
    }
  }, [selectedCalendar, loadEvents]);

  // ====== EFECTOS ======
  useEffect(() => { loadIntegrationStatus(); }, [loadIntegrationStatus]);
  useEffect(() => {
    const anyCalendarConnected = isConnected || outlookConnected || calendlyConnected;
    if (anyCalendarConnected) { loadEvents(); }
    if (isConnected) { loadCalendars(); }
  }, [isConnected, outlookConnected, calendlyConnected, loadCalendars, loadEvents]);

  // ====== HELPERS DE FECHA ======
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayNamesFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + direction);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + direction * 7);
    else newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const days: Date[] = [];
    const current = new Date(startDate);
    while (days.length < 42) { days.push(new Date(current)); current.setDate(current.getDate() + 1); }
    return days;
  }, [currentDate]);

  const getEventsForDay = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = event.start?.split('T')[0];
      const eventEnd = event.end?.split('T')[0];
      return eventStart === dateStr || (eventStart && eventEnd && eventStart <= dateStr && eventEnd >= dateStr);
    });
  }, [events]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  // ====== LOADING ======
  if (loading) {
    return (
      <div className="min-h-[700px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando calendario...</span>
        </div>
      </div>
    );
  }

  // Cualquier proveedor conectado
  const anyConnected = isConnected || outlookConnected || calendlyConnected || reservoConnected || agendaproConnected || dentalinkConnected || medilinkConnected;
  const connectedCount = [isConnected, outlookConnected, calendlyConnected, reservoConnected, agendaproConnected, dentalinkConnected, medilinkConnected].filter(Boolean).length;

  // ====== RENDER: SIEMPRE EL CALENDARIO ======
  return (
    <div className="min-h-[700px] flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-neutral-800">Calendario</h1>
                {anyConnected && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-medium text-emerald-700">{connectedCount} conectado{connectedCount > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              {isConnected && integration?.provider_email && (
                <p className="text-[11px] text-neutral-400">{integration.provider_email}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isConnected && (
              <>
                <button
                  onClick={toggleBotAccess}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    integration?.bot_access_enabled
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                      : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title={integration?.bot_access_enabled ? 'WITHMIA tiene acceso al calendario' : 'Activar acceso de WITHMIA'}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{integration?.bot_access_enabled ? 'Bot activo' : 'Bot'}</span>
                </button>

                <button
                  onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-600"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}

            {anyConnected && (
              <button
                onClick={loadEvents}
                disabled={loadingEvents}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingEvents ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              onClick={() => setShowConnectPanel(!showConnectPanel)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-rose-300 hover:shadow-sm transition-all text-xs font-medium text-neutral-600 hover:text-rose-600"
            >
              <Link2 className="w-3.5 h-3.5" />
              {anyConnected ? 'Integraciones' : 'Conectar calendario'}
            </button>

            <button
              onClick={() => { setCreateDate(new Date()); setShowCreateModal(true); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                isConnected
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              disabled={!isConnected}
              title={!isConnected ? 'Conecta un calendario primero' : 'Crear evento'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo evento</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-2.5">          <div className="flex items-center gap-2">
            <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
              <ChevronLeft className="w-4.5 h-4.5 text-neutral-500" />
            </button>
            <h2 className="text-base font-semibold text-neutral-800 min-w-[180px] text-center">
              {viewMode === 'day'
                ? `${dayNamesFull[currentDate.getDay()]} ${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]}`
                : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              }
            </h2>
            <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
              <ChevronRight className="w-4.5 h-4.5 text-neutral-500" />
            </button>
            <button onClick={goToToday} className="px-2.5 py-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors ml-1">
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            {(['month', 'week', 'day'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  viewMode === mode ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Provider Connection Panel */}
      {showConnectPanel && (
        <div className="mx-4 mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-700">Conectar calendario</h3>
            <button onClick={() => setShowConnectPanel(false)} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Google Calendar */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${isConnected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-rose-400 hover:shadow-md'}`}>
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 48 48">
                  <path d="M34 42H14c-4.4 0-8-3.6-8-8V14c0-4.4 3.6-8 8-8h20c4.4 0 8 3.6 8 8v20c0 4.4-3.6 8-8 8z" fill="#FFF"/>
                  <path d="M34 6H14C9.6 6 6 9.6 6 14v20c0 4.4 3.6 8 8 8h20c4.4 0 8-3.6 8-8V14c0-4.4-3.6-8-8-8zm-4 32H18c-2.2 0-4-1.8-4-4V18h20v16c0 2.2-1.8 4-4 4z" fill="#1E88E5"/>
                  <path d="M34 6H14C9.6 6 6 9.6 6 14v4h36v-4c0-4.4-3.6-8-8-8z" fill="#1565C0"/>
                  <circle cx="33" cy="13" r="2" fill="#E53935"/>
                  <circle cx="15" cy="13" r="2" fill="#E53935"/>
                  <path d="M21 23h-3v3h3v-3zm0 5h-3v3h3v-3zm5-5h-3v3h3v-3zm0 5h-3v3h3v-3zm5-5h-3v3h3v-3zm0 5h-3v3h3v-3z" fill="#1565C0"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800">Google Calendar</p>
                <p className="text-[11px] text-neutral-500 font-medium">{isConnected ? 'Conectado' : 'Sincroniza eventos'}</p>
              </div>
              {isConnected ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-700">Activo</span>
                </div>
              ) : (
                <button onClick={connectGoogle} disabled={connecting}
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-sm">
                  {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Conectar'}
                </button>
              )}
            </div>

            {/* Outlook Calendar */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${outlookConnected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-md'}`}>
              <div className="w-10 h-10 rounded-xl bg-[#0078D4] flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 32 32">
                  <path d="M19.484 7.937v5.477l1.916 1.205a.076.076 0 00.069 0L28 10.169V8.375A1.398 1.398 0 0026.625 7H19.484z" fill="#0364B8"/>
                  <path d="M19.484 15.457l1.747 1.2a.076.076 0 00.069 0l7.2-4.571v8.539A1.375 1.375 0 0127.125 22H19.484z" fill="#0A2767"/>
                  <path d="M10.44 12.932a4.215 4.215 0 011.864-1.213 4.325 4.325 0 013.131.161 4.236 4.236 0 011.713 1.39 4.14 4.14 0 01.67 2.238 4.258 4.258 0 01-.546 2.283 4.282 4.282 0 01-1.67 1.558 4.337 4.337 0 01-2.2.564 4.467 4.467 0 01-2.243-.557 4.232 4.232 0 01-1.614-1.573 4.199 4.199 0 01-.545-2.275 4.107 4.107 0 01.44-1.988 4.174 4.174 0 011-1.588zm1.334 4.612c.27.538.68.973 1.185 1.26a3.018 3.018 0 001.646.459c.608 0 1.174-.156 1.635-.47.462-.315.817-.752 1.05-1.282a4.153 4.153 0 00.37-1.75 3.932 3.932 0 00-.37-1.718 2.973 2.973 0 00-1.03-1.265c-.44-.315-.987-.477-1.583-.477-.624 0-1.195.16-1.655.462a2.954 2.954 0 00-1.062 1.262 4.128 4.128 0 00-.36 1.756c0 .608.064 1.224.174 1.563z" fill="#FFF"/>
                  <path d="M2.153 5.155v21.427L15.3 29.535a.613.613 0 00.178.025.6.6 0 00.283-.067l.017-.009V2.586L15.48 2.5a.541.541 0 00-.176-.028.606.606 0 00-.293.07z" fill="#0364B8"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800">Outlook</p>
                <p className="text-[11px] text-neutral-500 font-medium">{outlookConnected ? 'Conectado' : 'Microsoft Calendar'}</p>
              </div>
              {outlookConnected ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-700">Activo</span>
                </div>
              ) : (
                <button onClick={connectOutlook} disabled={outlookConnecting}
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#0078D4] to-[#005A9E] text-white rounded-lg hover:from-[#005A9E] hover:to-[#004578] transition-all disabled:opacity-50 shadow-sm">
                  {outlookConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Conectar'}
                </button>
              )}
            </div>

            {/* Calendly */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${calendlyConnected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-[#006BFF] hover:shadow-md'}`}>
              <div className="w-10 h-10 rounded-xl bg-[#006BFF] flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                  <path d="M22.195 17.891c-1.027 1.777-2.88 2.779-4.965 2.779-1.174 0-2.32-.328-3.305-.948a6.453 6.453 0 01-2.395-2.586 6.66 6.66 0 01-.035-6.058 6.39 6.39 0 012.322-2.635A6.239 6.239 0 0117.123 7.5c2.123 0 3.98 1.005 5.003 2.77l3.36-1.93C23.72 5.29 20.695 3.5 17.123 3.5c-1.97 0-3.884.534-5.536 1.545a10.481 10.481 0 00-3.806 4.22 10.708 10.708 0 00.051 9.757 10.494 10.494 0 003.738 4.143A10.175 10.175 0 0017.124 24.7c3.538 0 6.564-1.801 8.36-4.87z" fill="#FFF"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800">Calendly</p>
                <p className="text-[11px] text-neutral-500 font-medium">{calendlyConnected ? 'Conectado' : 'Agendamiento online'}</p>
              </div>
              {calendlyConnected ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-700">Activo</span>
                </div>
              ) : (
                <button onClick={connectCalendly} disabled={calendlyConnecting}
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#006BFF] to-[#0052CC] text-white rounded-lg hover:from-[#0052CC] hover:to-[#003D99] transition-all disabled:opacity-50 shadow-sm">
                  {calendlyConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Conectar'}
                </button>
              )}
            </div>

            {/* Reservo */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${reservoConnected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                <img src="/icons/reservo.webp" alt="Reservo" className="w-8 h-auto object-contain brightness-0 invert" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800">Reservo</p>
                <p className="text-[11px] text-neutral-500 font-medium">{reservoConnected ? 'Conectado' : 'Ir a Integraciones'}</p>
              </div>
              {reservoConnected ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-700">Activo</span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">API Key</span>
              )}
            </div>

            {/* AgendaPro */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${agendaproConnected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <img src="/icons/agendapro-icon.svg" alt="AgendaPro" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800">AgendaPro</p>
                <p className="text-[11px] text-neutral-500 font-medium">{agendaproConnected ? 'Conectado' : 'Ir a Integraciones'}</p>
              </div>
              {agendaproConnected ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-700">Activo</span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">API Key</span>
              )}
            </div>

            {/* Dentalink */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${dentalinkConnected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800">Dentalink</p>
                <p className="text-[11px] text-neutral-500 font-medium">{dentalinkConnected ? 'Conectado' : 'Ir a Integraciones'}</p>
              </div>
              {dentalinkConnected ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-700">Activo</span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">API Token</span>
              )}
            </div>

            {/* Medilink */}
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${medilinkConnected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800">Medilink</p>
                <p className="text-[11px] text-neutral-500 font-medium">{medilinkConnected ? 'Conectado' : 'Ir a Integraciones'}</p>
              </div>
              {medilinkConnected ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-emerald-700">Activo</span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">API Token</span>
              )}
            </div>
          </div>
          {/* Tip de buenas prácticas */}
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200/60 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              <span className="font-semibold">Recomendación:</span> Conecta solo el servicio de calendario que uses activamente en tu negocio. Tener múltiples proveedores activos puede generar eventos duplicados o conflictos de disponibilidad.
            </p>
          </div>
          {!anyConnected && (
            <p className="text-[11px] text-neutral-400 mt-2 text-center">Conecta un proveedor para sincronizar eventos y permitir que WITHMIA agende citas por ti</p>
          )}
        </div>
      )}

      {/* Banner cuando no hay nada conectado y el panel cerrado */}
      {!anyConnected && !showConnectPanel && (
        <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200/60 rounded-xl flex items-center gap-3 cursor-pointer hover:shadow-sm transition-all" onClick={() => setShowConnectPanel(true)}>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm -ml-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.154-.352.23-.578.23h-8.26v-6.68l1.316 1.04c.108.086.236.13.382.13s.27-.044.38-.13L24 7.387z" fill="#0072C6"/>
                <path d="M16.92 7.32l-1.664 1.32-7.74-5.32h8.826c.224 0 .414.078.57.232.154.156.23.348.23.576v.002L16.92 7.32z" fill="#0072C6"/>
                <path d="M7.184 2.717L0 5.49v11.38l7.184.803V2.717z" fill="#0072C6"/>
                <path d="M3.592 12.188c0-.85.224-1.56.672-2.128.448-.57 1.04-.854 1.776-.854.71 0 1.282.278 1.716.836.434.558.65 1.266.65 2.124 0 .854-.22 1.568-.658 2.14-.438.572-1.018.858-1.74.858-.72 0-1.304-.282-1.748-.844-.444-.562-.668-1.275-.668-2.132z" fill="white"/>
              </svg>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm -ml-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#006BFF" strokeWidth="2"/>
                <path d="M16 10.5c0-2.2-1.8-4-4-4s-4 1.8-4 4 1.8 4 4 4" stroke="#006BFF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-700">Conecta tu calendario</p>
            <p className="text-xs text-neutral-400">Google, Outlook, Calendly, Reservo, AgendaPro, Dentalink o Medilink</p>
          </div>
          <button className="flex-shrink-0 px-4 py-2 bg-white border border-rose-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm">
            Ver opciones
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Calendar Grid - SIEMPRE VISIBLE */}
      <div className="flex-1 overflow-auto relative">
        {showSettingsPanel && isConnected && (
          <SettingsPanel
            integration={integration}
            calendars={calendars}
            selectedCalendar={selectedCalendar}
            onSelectCalendar={selectCalendar}
            onToggleBotAccess={toggleBotAccess}
            onDisconnect={disconnectGoogle}
            onClose={() => setShowSettingsPanel(false)}
          />
        )}

        {viewMode === 'month' ? (
          <div className="h-full flex flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
              {dayNames.map(day => (
                <div key={day} className="py-2 text-center text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const today = isToday(day);
                const currentMo = isCurrentMonth(day);

                return (
                  <div
                    key={idx}
                    className={`border-b border-r border-slate-100 p-1 min-h-[90px] cursor-pointer hover:bg-slate-50/80 transition-colors ${
                      !currentMo ? 'bg-slate-50/40' : 'bg-white'
                    }`}
                    onClick={() => {
                      if (isConnected) {
                        setCreateDate(day);
                        setShowCreateModal(true);
                      }
                    }}
                  >
                    <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                      today
                        ? 'bg-rose-500 text-white'
                        : currentMo
                          ? 'text-neutral-700'
                          : 'text-neutral-300'
                    }`}>
                      {day.getDate()}
                    </div>

                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event, eIdx) => (
                        <div
                          key={event.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                          className="px-1.5 py-0.5 rounded text-[10px] leading-tight font-medium truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-0.5"
                          style={{
                            backgroundColor: `${getEventColor(event, eIdx)}12`,
                            color: getEventColor(event, eIdx),
                            borderLeft: `2px solid ${getEventColor(event, eIdx)}`,
                          }}
                        >
                          {event.provider !== 'google' && (
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PROVIDER_COLORS[event.provider] }} />
                          )}
                          {!event.allDay && (
                            <span className="opacity-60 mr-0.5">{formatTime(event.start)}</span>
                          )}
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-neutral-400 font-medium pl-1">+{dayEvents.length - 3} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'week' ? (
          <WeekView
            currentDate={currentDate}
            events={events}
            onEventClick={setSelectedEvent}
            onSlotClick={(date) => { if (isConnected) { setCreateDate(date); setShowCreateModal(true); } }}
          />
        ) : (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={setSelectedEvent}
            onSlotClick={(date) => { if (isConnected) { setCreateDate(date); setShowCreateModal(true); } }}
          />
        )}

        {/* Loading overlay */}
        {loadingEvents && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={() => handleDeleteEvent(selectedEvent)}
        />
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          initialDate={createDate || new Date()}
          onSubmit={handleCreateEvent}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

// ====== SUBCOMPONENTES ======

function WeekView({ currentDate, events, onEventClick, onSlotClick }: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
}) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => (e.start?.split('T')[0] || '') === dateStr);
  };

  const todayCheck = (date: Date) => date.toDateString() === new Date().toDateString();

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
        <div className="py-2" />
        {days.map((day, i) => (
          <div key={i} className={`py-2 text-center border-l border-slate-100 ${todayCheck(day) ? 'bg-rose-50/50' : ''}`}>
            <div className="text-[10px] text-neutral-400 font-medium uppercase">{dayLabels[i]}</div>
            <div className={`text-base font-semibold ${todayCheck(day) ? 'text-rose-600' : 'text-neutral-700'}`}>{day.getDate()}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[50px_repeat(7,1fr)]">
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="h-12 text-right pr-2 text-[10px] text-neutral-400 border-b border-slate-50">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map((day, dayIdx) => {
                const hourEvents = getEventsForDay(day).filter(e => new Date(e.start).getHours() === hour);
                return (
                  <div
                    key={dayIdx}
                    className="h-12 border-l border-b border-slate-100 relative cursor-pointer hover:bg-rose-50/20 transition-colors"
                    onClick={() => { const d = new Date(day); d.setHours(hour); onSlotClick(d); }}
                  >
                    {hourEvents.map((event, eIdx) => (
                      <div
                        key={event.id}
                        className="absolute inset-x-0.5 top-0.5 z-10 px-1 py-0.5 rounded text-[9px] font-medium truncate cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: `${getEventColor(event, eIdx)}18`,
                          color: getEventColor(event, eIdx),
                          borderLeft: `2px solid ${getEventColor(event, eIdx)}`,
                        }}
                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayView({ currentDate, events, onEventClick, onSlotClick }: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dateStr = currentDate.toISOString().split('T')[0];
  const dayEvents = events.filter(e => (e.start?.split('T')[0] || '') === dateStr);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {hours.map(hour => {
          const hourEvents = dayEvents.filter(e => new Date(e.start).getHours() === hour);
          return (
            <div key={hour} className="flex border-b border-slate-100">
              <div className="w-16 py-3 text-right pr-3 text-xs text-neutral-400 flex-shrink-0">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div
                className="flex-1 min-h-[48px] py-1 px-2 cursor-pointer hover:bg-rose-50/20 transition-colors"
                onClick={() => { const d = new Date(currentDate); d.setHours(hour); onSlotClick(d); }}
              >
                {hourEvents.map((event, eIdx) => (
                  <div
                    key={event.id}
                    className="mb-1 px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-3"
                    style={{
                      backgroundColor: `${getEventColor(event, eIdx)}10`,
                      borderLeft: `3px solid ${getEventColor(event, eIdx)}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-neutral-800 truncate">{event.title}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {formatTimeStr(event.start)} - {formatTimeStr(event.end)}
                      </div>
                    </div>
                    {(event.hangoutLink || event.onlineMeetingUrl) && <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                    {event.location && <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventDetailModal({ event, onClose, onDelete }: {
  event: CalendarEvent;
  onClose: () => void;
  onDelete: () => void;
}) {
  const providerColor = PROVIDER_COLORS[event.provider] || '#4285f4';
  const providerName = PROVIDER_NAMES[event.provider] || 'Calendario';
  const canDelete = event.provider === 'google' || event.provider === 'outlook';

  // Determine video meeting link (Google Meet, Teams, Zoom, etc.)
  const meetingLink = event.hangoutLink || event.onlineMeetingUrl || null;
  const getMeetingLabel = () => {
    if (event.hangoutLink) return 'Google Meet';
    if (event.onlineMeetingUrl) {
      if (event.onlineMeetingUrl.includes('teams.microsoft')) return 'Microsoft Teams';
      if (event.onlineMeetingUrl.includes('zoom.us')) return 'Zoom';
      return 'Reunión online';
    }
    return '';
  };
  const getMeetingIcon = () => {
    if (event.hangoutLink) return (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-sm">
        <Video className="w-4 h-4 text-white" />
      </div>
    );
    if (event.onlineMeetingUrl?.includes('teams.microsoft')) return (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B5FC7] to-[#4B4EBF] flex items-center justify-center shadow-sm">
        <Video className="w-4 h-4 text-white" />
      </div>
    );
    return (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
        <Video className="w-4 h-4 text-white" />
      </div>
    );
  };

  // Open in provider link
  const externalLink = event.htmlLink || event.webLink || null;
  const getExternalLabel = () => {
    if (event.provider === 'google') return 'Abrir en Google Calendar';
    if (event.provider === 'outlook') return 'Abrir en Outlook';
    if (event.provider === 'calendly') return 'Ver en Calendly';
    return 'Abrir evento';
  };

  // Provider icon
  const ProviderIcon = () => {
    if (event.provider === 'google') return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
        <path d="M34 42H14c-4.4 0-8-3.6-8-8V14c0-4.4 3.6-8 8-8h20c4.4 0 8 3.6 8 8v20c0 4.4-3.6 8-8 8z" fill="#FFF"/>
        <path d="M34 6H14C9.6 6 6 9.6 6 14v20c0 4.4 3.6 8 8 8h20c4.4 0 8-3.6 8-8V14c0-4.4-3.6-8-8-8zm-4 32H18c-2.2 0-4-1.8-4-4V18h20v16c0 2.2-1.8 4-4 4z" fill="#1E88E5"/>
        <path d="M34 6H14C9.6 6 6 9.6 6 14v4h36v-4c0-4.4-3.6-8-8-8z" fill="#1565C0"/>
      </svg>
    );
    if (event.provider === 'outlook') return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 32 32">
        <path d="M19.484 7.937v5.477l1.916 1.205a.076.076 0 00.069 0L28 10.169V8.375A1.398 1.398 0 0026.625 7H19.484z" fill="#0364B8"/>
        <path d="M19.484 15.457l1.747 1.2a.076.076 0 00.069 0l7.2-4.571v8.539A1.375 1.375 0 0127.125 22H19.484z" fill="#0A2767"/>
        <path d="M2.153 5.155v21.427L15.3 29.535a.613.613 0 00.178.025.6.6 0 00.283-.067l.017-.009V2.586L15.48 2.5a.541.541 0 00-.176-.028.606.606 0 00-.293.07z" fill="#0364B8"/>
      </svg>
    );
    if (event.provider === 'calendly') return (
      <svg className="w-3.5 h-3.5" viewBox="0 0 32 32" fill="none">
        <path d="M22.195 17.891c-1.027 1.777-2.88 2.779-4.965 2.779-1.174 0-2.32-.328-3.305-.948a6.453 6.453 0 01-2.395-2.586 6.66 6.66 0 01-.035-6.058 6.39 6.39 0 012.322-2.635A6.239 6.239 0 0117.123 7.5c2.123 0 3.98 1.005 5.003 2.77l3.36-1.93C23.72 5.29 20.695 3.5 17.123 3.5c-1.97 0-3.884.534-5.536 1.545a10.481 10.481 0 00-3.806 4.22 10.708 10.708 0 00.051 9.757 10.494 10.494 0 003.738 4.143A10.175 10.175 0 0017.124 24.7c3.538 0 6.564-1.801 8.36-4.87z" fill="#006BFF"/>
      </svg>
    );
    return <CalendarIcon className="w-3.5 h-3.5" />;
  };

  // Format full date
  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dayNames[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  };

  // Duration calculation
  const getDuration = () => {
    if (event.allDay) return null;
    const start = new Date(event.start);
    const end = new Date(event.end);
    const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
    if (diffMin < 60) return `${diffMin} min`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const duration = getDuration();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Color header bar */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${providerColor}, ${providerColor}88)` }} />

        <div className="p-5">
          {/* Provider badge + Close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase" style={{ backgroundColor: `${providerColor}10`, color: providerColor }}>
              <ProviderIcon />
              <span>{providerName}</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors group">
              <X className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
            </button>
          </div>

          {/* Title */}
          <h3 className="text-[17px] font-bold text-neutral-900 leading-snug mb-4">{event.title}</h3>

          {/* Date & Time */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CalendarIcon className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-neutral-800">{formatFullDate(event.start)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[12px] text-neutral-500">
                    {event.allDay ? 'Todo el día' : `${formatTimeStr(event.start)} – ${formatTimeStr(event.end)}`}
                  </p>
                  {duration && (
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-neutral-400">{duration}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                </div>
                <p className="text-[13px] text-neutral-600 flex-1 min-w-0 truncate">{event.location}</p>
              </div>
            )}

            {/* Video meeting link */}
            {meetingLink && (
              <a href={meetingLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 -mx-1 rounded-xl hover:bg-blue-50/50 transition-colors group">
                {getMeetingIcon()}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">{getMeetingLabel()}</p>
                  <p className="text-[11px] text-neutral-400">Clic para unirse</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </a>
            )}

            {/* Attendees */}
            {event.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{event.attendees.length} participante{event.attendees.length > 1 ? 's' : ''}</p>
                  {event.attendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: EVENT_COLORS[i % EVENT_COLORS.length] }}>
                        {(a.name || a.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] text-neutral-700 truncate block">{a.name || a.email}</span>
                        {a.name && <span className="text-[10px] text-neutral-400 truncate block">{a.email}</span>}
                      </div>
                      {a.status === 'accepted' && (
                        <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0" title="Aceptado">
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                        </div>
                      )}
                      {a.status === 'declined' && (
                        <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0" title="Rechazado">
                          <X className="w-2.5 h-2.5 text-red-500" />
                        </div>
                      )}
                      {a.status === 'tentative' && (
                        <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0" title="Tentativo">
                          <span className="text-[8px] font-bold text-amber-600">?</span>
                        </div>
                      )}
                      {a.status === 'needsAction' && (
                        <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0" title="Pendiente">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="pt-2 mt-1 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 10h16M4 14h10M4 18h7" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[12px] text-neutral-500 leading-relaxed whitespace-pre-line flex-1">{event.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action footer */}
        <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/60">
          {canDelete ? (
            <button onClick={onDelete}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-[12px] font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          ) : (
            <div />
          )}
          {externalLink && (
            <a href={externalLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all hover:shadow-sm"
              style={{ color: providerColor, backgroundColor: `${providerColor}08` }}>
              <ExternalLink className="w-3.5 h-3.5" /> {getExternalLabel()}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateEventModal({ initialDate, onSubmit, onClose }: {
  initialDate: Date;
  onSubmit: (data: any) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState(initialDate.toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(() => {
    const end = new Date(initialDate);
    end.setHours(end.getHours() + 1);
    return end.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start: new Date(startDate).toISOString(),
        end: new Date(endDate).toISOString(),
        allDay,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-neutral-800">Nuevo evento</h3>
              <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="space-y-4">
              <input type="text" placeholder="Título del evento" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 text-lg font-medium border-0 border-b-2 border-slate-200 focus:border-rose-500 focus:ring-0 placeholder:text-neutral-300 text-neutral-800"
                autoFocus required />

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)}
                  className="rounded border-slate-300 text-rose-500 focus:ring-rose-500" />
                <span className="text-neutral-600">Todo el día</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Inicio</label>
                  <input type={allDay ? 'date' : 'datetime-local'} value={allDay ? startDate.slice(0, 10) : startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Fin</label>
                  <input type={allDay ? 'date' : 'datetime-local'} value={allDay ? endDate.slice(0, 10) : endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" required />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <label className="text-xs font-medium text-neutral-500">Ubicación</label>
                </div>
                <input type="text" placeholder="Agregar ubicación" value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-neutral-300" />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Descripción</label>
                <textarea placeholder="Agregar detalles del evento..." value={description} onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-neutral-300 resize-none" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 px-6 py-3 flex justify-end gap-2 bg-slate-50/50">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-slate-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!title.trim() || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsPanel({ integration, calendars, selectedCalendar, onSelectCalendar, onToggleBotAccess, onDisconnect, onClose }: {
  integration: Integration | null;
  calendars: GoogleCalendar[];
  selectedCalendar: string;
  onSelectCalendar: (id: string) => void;
  onToggleBotAccess: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-0 right-0 w-72 h-full bg-white border-l border-slate-200 shadow-xl z-20 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-neutral-800 text-sm">Configuración</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Account */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Cuenta</p>
          <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-neutral-700 truncate">{integration?.provider_email || 'Google Calendar'}</p>
              <p className="text-[10px] text-neutral-400">
                {integration?.created_at ? new Date(integration.created_at).toLocaleDateString('es-CL') : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Selection */}
        {calendars.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Calendario activo</p>
            <div className="space-y-1">
              {calendars.map(cal => (
                <button key={cal.id} onClick={() => onSelectCalendar(cal.id)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${
                    selectedCalendar === cal.id ? 'bg-rose-50 border border-rose-200' : 'hover:bg-slate-50 border border-transparent'
                  }`}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cal.backgroundColor }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-700 truncate">{cal.summary}</p>
                    {cal.primary && <span className="text-[9px] text-neutral-400">Principal</span>}
                  </div>
                  {selectedCalendar === cal.id && <Check className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bot Access */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Acceso de WITHMIA</p>
          <button onClick={onToggleBotAccess}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
              integration?.bot_access_enabled ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'
            }`}>
            <Bot className={`w-4 h-4 ${integration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
            <div className="flex-1 text-left">
              <p className="text-xs font-medium text-neutral-700">
                {integration?.bot_access_enabled ? 'Bot habilitado' : 'Bot deshabilitado'}
              </p>
              <p className="text-[10px] text-neutral-400">
                {integration?.bot_access_enabled
                  ? 'WITHMIA puede consultar y crear eventos'
                  : 'Activa para que WITHMIA agende citas'}
              </p>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${
              integration?.bot_access_enabled ? 'bg-purple-500' : 'bg-slate-300'
            }`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                integration?.bot_access_enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}></div>
            </div>
          </button>
        </div>

        {/* Disconnect */}
        <div className="pt-3 border-t border-slate-100">
          <button onClick={onDisconnect}
            className="w-full flex items-center gap-2 justify-center p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium">
            <Unlink className="w-3.5 h-3.5" />
            Desconectar Google Calendar
          </button>
        </div>
      </div>
    </div>
  );
}
