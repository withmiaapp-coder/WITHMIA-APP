import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Link2,
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
  Shield,
} from 'lucide-react';

// ====== TIPOS ======
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
  attendees: { email: string; name: string; status: string }[];
  color: string | null;
  creator: string | null;
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
    'Accept': 'application/json',
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

function getEventColor(event: CalendarEvent, index: number): string {
  if (event.color && EVENT_COLORS[parseInt(event.color) - 1]) {
    return EVENT_COLORS[parseInt(event.color) - 1];
  }
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

// ====== COMPONENTE PRINCIPAL ======
export default function CalendarSection({ user, company }: Props) {
  // Estado de integración
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  
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

  // ====== CARGAR ESTADO DE INTEGRACIÓN ======
  const loadIntegrationStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/calendar/status');
      setIsConnected(data.connected);
      setIntegration(data.integration);
      if (data.integration?.selected_calendar_id) {
        setSelectedCalendar(data.integration.selected_calendar_id);
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

  // ====== CARGAR EVENTOS ======
  const loadEvents = useCallback(async () => {
    if (!isConnected) return;
    
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
      
      const data = await apiFetch(
        `/api/calendar/events?calendar_id=${encodeURIComponent(selectedCalendar)}&time_min=${timeMin}&time_max=${timeMax}`
      );
      setEvents(data.events || []);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError('Error al cargar eventos. Intenta reconectar tu calendario.');
    } finally {
      setLoadingEvents(false);
    }
  }, [isConnected, currentDate, viewMode, selectedCalendar]);

  // ====== CONECTAR GOOGLE CALENDAR ======
  const connectGoogle = useCallback(async () => {
    try {
      setConnecting(true);
      const data = await apiFetch('/api/calendar/google/auth-url');
      
      // Abrir ventana de OAuth
      const authWindow = window.open(data.auth_url, 'google_auth', 'width=600,height=700,left=200,top=100');
      
      // Escuchar postMessage del popup cuando OAuth complete
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'gcal_oauth_result') {
          window.removeEventListener('message', handleMessage);
          setConnecting(false);
          
          if (event.data.status === 'success') {
            // Recargar estado de integración
            await loadIntegrationStatus();
          } else {
            setError(event.data.message || 'Error al conectar Google Calendar');
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Polling de respaldo por si el popup se cierra sin postMessage
      const pollInterval = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(pollInterval);
          // Esperar un poco para que el postMessage llegue primero
          setTimeout(async () => {
            setConnecting(false);
            window.removeEventListener('message', handleMessage);
            // Recargar por si se conectó y el postMessage no llegó
            await loadIntegrationStatus();
          }, 500);
        }
      }, 1000);
      
      // Timeout de 5 minutos
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

  // ====== DESCONECTAR ======
  const disconnectGoogle = useCallback(async () => {
    if (!confirm('¿Estás seguro de desconectar Google Calendar? Se perderá el acceso del bot al calendario.')) {
      return;
    }
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
        body: JSON.stringify({
          bot_access_enabled: !integration.bot_access_enabled,
        }),
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

  // ====== ELIMINAR EVENTO ======
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      await apiFetch(`/api/calendar/events/${eventId}?calendar_id=${encodeURIComponent(selectedCalendar)}`, {
        method: 'DELETE',
      });
      setSelectedEvent(null);
      await loadEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  }, [selectedCalendar, loadEvents]);

  // ====== EFECTOS ======
  useEffect(() => {
    loadIntegrationStatus();
  }, [loadIntegrationStatus]);

  useEffect(() => {
    if (isConnected) {
      loadCalendars();
      loadEvents();
    }
  }, [isConnected, loadCalendars, loadEvents]);

  // ====== HELPERS DE FECHA ======
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayNamesFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  // ====== OBTENER DÍAS DEL MES ======
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  // ====== OBTENER EVENTOS POR DÍA ======
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
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateRange = (start: string, end: string, allDay: boolean) => {
    if (allDay) return 'Todo el día';
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // ====== LOADING ======
  if (loading) {
    return (
      <div className="min-h-[700px] p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando calendario...</span>
        </div>
      </div>
    );
  }

  // ====== RENDER: NO CONECTADO ======
  if (!isConnected) {
    return (
      <div className="min-h-[700px] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-2">
              <div className="p-4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl shadow-lg">
                <CalendarIcon className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-neutral-800">Calendario</h1>
                <p className="text-lg text-neutral-500">Gestiona tus citas y eventos</p>
              </div>
            </div>
          </div>

          {/* Connect Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-12 text-center max-w-lg mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-pink-100 rounded-3xl flex items-center justify-center">
                <CalendarIcon className="w-12 h-12 text-rose-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-neutral-800 mb-3">
                Conecta tu Google Calendar
              </h2>
              <p className="text-neutral-500 mb-8 leading-relaxed">
                Sincroniza tus citas, reuniones y eventos. Tu bot MIA podrá consultar tu disponibilidad 
                y agendar citas directamente desde WhatsApp.
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl">
                  <CalendarIcon className="w-6 h-6 text-rose-500" />
                  <span className="text-sm font-medium text-neutral-700">Ver eventos</span>
                  <span className="text-xs text-neutral-400">Calendario sincronizado</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl">
                  <Bot className="w-6 h-6 text-purple-500" />
                  <span className="text-sm font-medium text-neutral-700">Bot inteligente</span>
                  <span className="text-xs text-neutral-400">Agenda desde WhatsApp</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl">
                  <Shield className="w-6 h-6 text-emerald-500" />
                  <span className="text-sm font-medium text-neutral-700">Seguro</span>
                  <span className="text-xs text-neutral-400">OAuth 2.0 de Google</span>
                </div>
              </div>

              <button
                onClick={connectGoogle}
                disabled={connecting}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-xl hover:border-rose-300 hover:shadow-lg transition-all duration-200 group disabled:opacity-50"
              >
                {connecting ? (
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                ) : (
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                <span className="text-lg font-semibold text-neutral-700 group-hover:text-rose-600 transition-colors">
                  {connecting ? 'Conectando...' : 'Conectar con Google Calendar'}
                </span>
              </button>

              <p className="mt-4 text-xs text-neutral-400">
                Se abrirá una ventana para autorizar el acceso. Solo lectura y escritura de eventos.
              </p>
            </div>

            {/* Platforms Coming Soon */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-12 py-6">
              <p className="text-sm text-neutral-400 mb-4 font-medium">Próximas integraciones</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'Outlook', color: '#0078D4' },
                  { name: 'Apple Calendar', color: '#000000' },
                  { name: 'Calendly', color: '#006BFF' },
                  { name: 'Cal.com', color: '#111827' },
                  { name: 'Reservo', color: '#F59E0B' },
                ].map(platform => (
                  <div key={platform.name} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 opacity-60">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: platform.color }}></div>
                    <span className="text-xs font-medium text-neutral-500">{platform.name}</span>
                    <span className="text-[10px] text-neutral-400">Pronto</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: CONECTADO - CALENDARIO COMPLETO ======
  return (
    <div className="min-h-[700px] flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header compacto */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-800">Calendario</h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[11px] font-medium text-emerald-700">Google Calendar</span>
                </div>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {integration?.provider_email || 'Conectado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bot Access Toggle */}
            <button
              onClick={toggleBotAccess}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                integration?.bot_access_enabled 
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100' 
                  : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
              title={integration?.bot_access_enabled ? 'El bot tiene acceso al calendario' : 'Activar acceso del bot'}
            >
              <Bot className="w-3.5 h-3.5" />
              {integration?.bot_access_enabled ? 'Bot activo' : 'Bot inactivo'}
            </button>

            <button
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-600"
              title="Configuración"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={loadEvents}
              disabled={loadingEvents}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-600 disabled:opacity-50"
              title="Refrescar"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${loadingEvents ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => { setCreateDate(new Date()); setShowCreateModal(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Nuevo evento
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-500" />
            </button>
            <h2 className="text-lg font-semibold text-neutral-800 min-w-[200px] text-center">
              {viewMode === 'day' 
                ? `${dayNamesFull[currentDate.getDay()]} ${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]}`
                : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              }
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-neutral-500" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {(['month', 'week', 'day'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-white text-neutral-800 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto relative">
        {showSettingsPanel && (
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
                <div key={day} className="py-2 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">
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
                    className={`border-b border-r border-slate-100 p-1 min-h-[100px] cursor-pointer hover:bg-slate-50/80 transition-colors ${
                      !currentMo ? 'bg-slate-50/40' : 'bg-white'
                    }`}
                    onClick={() => {
                      setCreateDate(day);
                      setShowCreateModal(true);
                    }}
                  >
                    <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                      today 
                        ? 'bg-rose-500 text-white' 
                        : currentMo 
                          ? 'text-neutral-800' 
                          : 'text-neutral-300'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event, eIdx) => (
                        <div
                          key={event.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                          className="px-1.5 py-0.5 rounded text-[11px] leading-tight font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ 
                            backgroundColor: `${getEventColor(event, eIdx)}15`,
                            color: getEventColor(event, eIdx),
                            borderLeft: `2px solid ${getEventColor(event, eIdx)}`,
                          }}
                        >
                          {!event.allDay && (
                            <span className="opacity-70 mr-1">{formatTime(event.start)}</span>
                          )}
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-neutral-400 font-medium pl-1">
                          +{dayEvents.length - 3} más
                        </div>
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
            onSlotClick={(date) => { setCreateDate(date); setShowCreateModal(true); }}
          />
        ) : (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={setSelectedEvent}
            onSlotClick={(date) => { setCreateDate(date); setShowCreateModal(true); }}
          />
        )}

        {/* Loading overlay */}
        {loadingEvents && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={() => handleDeleteEvent(selectedEvent.id)}
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

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => (e.start?.split('T')[0] || '') === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
        <div className="py-2" />
        {days.map((day, i) => (
          <div key={i} className={`py-2 text-center border-l border-slate-100 ${isToday(day) ? 'bg-rose-50' : ''}`}>
            <div className="text-xs text-neutral-400 font-medium">{dayNames[i]}</div>
            <div className={`text-lg font-semibold ${isToday(day) ? 'text-rose-600' : 'text-neutral-700'}`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="h-14 text-right pr-2 text-xs text-neutral-400 pt-0 border-b border-slate-50">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map((day, dayIdx) => {
                const dayEvents = getEventsForDay(day);
                const hourEvents = dayEvents.filter(e => {
                  const eventHour = new Date(e.start).getHours();
                  return eventHour === hour;
                });

                return (
                  <div
                    key={dayIdx}
                    className="h-14 border-l border-b border-slate-100 relative cursor-pointer hover:bg-rose-50/30 transition-colors"
                    onClick={() => {
                      const d = new Date(day);
                      d.setHours(hour);
                      onSlotClick(d);
                    }}
                  >
                    {hourEvents.map((event, eIdx) => (
                      <div
                        key={event.id}
                        className="absolute inset-x-0.5 top-0.5 z-10 px-1 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: `${getEventColor(event, eIdx)}20`,
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
              <div className="w-20 py-3 text-right pr-4 text-sm text-neutral-400 flex-shrink-0">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div
                className="flex-1 min-h-[56px] py-1 px-2 cursor-pointer hover:bg-rose-50/30 transition-colors"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setHours(hour);
                  onSlotClick(d);
                }}
              >
                {hourEvents.map((event, eIdx) => (
                  <div
                    key={event.id}
                    className="mb-1 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-3"
                    style={{
                      backgroundColor: `${getEventColor(event, eIdx)}10`,
                      borderLeft: `3px solid ${getEventColor(event, eIdx)}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-neutral-800 truncate">{event.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {formatTimeStr(event.start)} - {formatTimeStr(event.end)}
                      </div>
                    </div>
                    {event.hangoutLink && <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />}
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

function formatTimeStr(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function EventDetailModal({ event, onClose, onDelete }: {
  event: CalendarEvent;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-800 pr-4">{event.title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg flex-shrink-0">
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <span className="text-neutral-600">
                {event.allDay ? 'Todo el día' : `${formatTimeStr(event.start)} - ${formatTimeStr(event.end)}`}
              </span>
            </div>

            {event.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span className="text-neutral-600">{event.location}</span>
              </div>
            )}

            {event.hangoutLink && (
              <a
                href={event.hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700"
              >
                <Video className="w-4 h-4 flex-shrink-0" />
                <span>Unirse a Google Meet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {event.attendees.length > 0 && (
              <div className="flex items-start gap-3 text-sm">
                <Users className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {event.attendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-neutral-600">{a.name || a.email}</span>
                      {a.status === 'accepted' && <Check className="w-3 h-3 text-emerald-500" />}
                      {a.status === 'declined' && <X className="w-3 h-3 text-red-500" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.description && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-sm text-neutral-500 whitespace-pre-line">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between bg-slate-50/50">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 text-sm px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir en Google
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
  const [startDate, setStartDate] = useState(
    initialDate.toISOString().slice(0, 16)
  );
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
              <div>
                <input
                  type="text"
                  placeholder="Título del evento"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 text-lg font-medium border-0 border-b-2 border-slate-200 focus:border-rose-500 focus:ring-0 placeholder:text-neutral-300 text-neutral-800"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={e => setAllDay(e.target.checked)}
                    className="rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-neutral-600">Todo el día</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Inicio</label>
                  <input
                    type={allDay ? 'date' : 'datetime-local'}
                    value={allDay ? startDate.slice(0, 10) : startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Fin</label>
                  <input
                    type={allDay ? 'date' : 'datetime-local'}
                    value={allDay ? endDate.slice(0, 10) : endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <label className="text-xs font-medium text-neutral-500">Ubicación</label>
                </div>
                <input
                  type="text"
                  placeholder="Agregar ubicación"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-neutral-300"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1 block">Descripción</label>
                <textarea
                  placeholder="Agregar detalles del evento..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-neutral-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-neutral-300 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 px-6 py-3 flex justify-end gap-2 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
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
    <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-slate-200 shadow-xl z-20 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-neutral-800">Configuración</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Account */}
        <div className="mb-6">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Cuenta conectada</p>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <Globe className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-700 truncate">
                {integration?.provider_email || 'Google Calendar'}
              </p>
              <p className="text-xs text-neutral-400">
                Conectado {integration?.created_at ? new Date(integration.created_at).toLocaleDateString('es-CL') : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Selection */}
        {calendars.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Calendario activo</p>
            <div className="space-y-1">
              {calendars.map(cal => (
                <button
                  key={cal.id}
                  onClick={() => onSelectCalendar(cal.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                    selectedCalendar === cal.id
                      ? 'bg-rose-50 border border-rose-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.backgroundColor }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-700 truncate">{cal.summary}</p>
                    {cal.primary && <span className="text-[10px] text-neutral-400">Principal</span>}
                  </div>
                  {selectedCalendar === cal.id && <Check className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bot Access */}
        <div className="mb-6">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Acceso del bot</p>
          <button
            onClick={onToggleBotAccess}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
              integration?.bot_access_enabled
                ? 'bg-purple-50 border-purple-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <Bot className={`w-5 h-5 ${integration?.bot_access_enabled ? 'text-purple-500' : 'text-neutral-400'}`} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-neutral-700">
                {integration?.bot_access_enabled ? 'Bot habilitado' : 'Bot deshabilitado'}
              </p>
              <p className="text-xs text-neutral-400">
                {integration?.bot_access_enabled
                  ? 'MIA puede consultar y crear eventos'
                  : 'Activa para que MIA agende citas por WhatsApp'}
              </p>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${
              integration?.bot_access_enabled ? 'bg-purple-500' : 'bg-slate-300'
            }`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                integration?.bot_access_enabled ? 'translate-x-5' : 'translate-x-1'
              }`}></div>
            </div>
          </button>
        </div>

        {/* Disconnect */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={onDisconnect}
            className="w-full flex items-center gap-2 justify-center p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <Unlink className="w-4 h-4" />
            Desconectar Google Calendar
          </button>
        </div>
      </div>
    </div>
  );
}
