import React, { useMemo, useEffect, useState } from 'react';
import debugLog from '@/utils/debugLogger';
import {
  TrendingUp,
  MessageCircle,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Activity,
  Loader2,
  ShoppingCart,
  DollarSign,
  Package,
  Link2,
  ExternalLink,
  BarChart3,
  Zap,
  Target,
  Mail,
  Eye,
} from 'lucide-react';

interface MetricsDashboardProps {
  conversations: any[];
  timeRange?: 'today' | 'week' | 'month' | 'all';
}

interface BackendStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  agentMessages: number;
  clientMessages: number;
  topContacts: { name: string; phone: string; count: number }[];
  avgResponseTime: string;
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  conversations,
  timeRange = 'all'
}) => {
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [salesStats, setSalesStats] = useState<any>(null);
  const [loadingSales, setLoadingSales] = useState(true);
  
  // Cargar estadísticas reales del backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const response = await fetch('/api/chatwoot-proxy/dashboard-stats', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setBackendStats(data.data);
          }
        }
      } catch (error) {
        debugLog.error('Error fetching dashboard stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchSalesStats = async () => {
      try {
        setLoadingSales(true);
        const period = timeRange === 'all' ? 'year' : timeRange;
        const response = await fetch(`/api/sales/stats?period=${period}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSalesStats(data);
        }
      } catch (error) {
        debugLog.error('Error fetching sales stats:', error);
      } finally {
        setLoadingSales(false);
      }
    };
    
    fetchStats();
    fetchSalesStats();
  }, [timeRange]);
  
  const metrics = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Si tenemos estadísticas del backend, usarlas
    if (backendStats) {
      // Calcular datos adicionales desde conversations para gráficos
      let filteredConvs = conversations;
      if (timeRange !== 'all') {
        const cutoff = timeRange === 'today' ? now - dayMs :
                       timeRange === 'week' ? now - (7 * dayMs) :
                       timeRange === 'month' ? now - (30 * dayMs) : 0;
        
        filteredConvs = conversations.filter(conv => {
          const timestamp = conv.created_at || 0;
          const convTime = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
          return convTime >= cutoff;
        });
      }
      
      const resolved = filteredConvs.filter(c => c.status === 'resolved').length;
      const pending = filteredConvs.filter(c => c.status === 'pending').length;
      const unread = filteredConvs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      const resolutionRate = backendStats.totalConversations > 0 
        ? ((resolved / backendStats.totalConversations) * 100).toFixed(1) 
        : '0';
      
      // Actividad por hora
      const hourlyActivity = new Array(24).fill(0);
      const dailyActivity = new Array(7).fill(0).map((_, i) => ({
        day: new Date(now - (6 - i) * dayMs).toLocaleDateString('es-ES', { weekday: 'short' }),
        count: 0
      }));
      
      return {
        total: backendStats.totalConversations,
        open: backendStats.activeConversations,
        resolved,
        pending,
        unread,
        totalMessages: backendStats.totalMessages,
        agentMessages: backendStats.agentMessages,
        clientMessages: backendStats.clientMessages,
        avgResponseTime: 0, // El backend lo devuelve como string
        topContacts: backendStats.topContacts,
        hourlyActivity,
        dailyActivity,
        resolutionRate
      };
    }
    
    // Filtrar por rango de tiempo
    let filteredConvs = conversations;
    if (timeRange !== 'all') {
      const cutoff = timeRange === 'today' ? now - dayMs :
                     timeRange === 'week' ? now - (7 * dayMs) :
                     timeRange === 'month' ? now - (30 * dayMs) : 0;
      
      filteredConvs = conversations.filter(conv => {
        const timestamp = conv.created_at || 0;
        const convTime = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
        return convTime >= cutoff;
      });
    }

    // Métricas básicas
    const total = filteredConvs.length;
    const open = filteredConvs.filter(c => c.status === 'open').length;
    const resolved = filteredConvs.filter(c => c.status === 'resolved').length;
    const pending = filteredConvs.filter(c => c.status === 'pending').length;
    const unread = filteredConvs.reduce((sum, c) => sum + (c.unread_count || 0), 0);

    // Total de mensajes - usar messages_count si está disponible, sino estimar
    const totalMessages = filteredConvs.reduce((sum, c) => {
      // Priorizar messages_count de la API, luego messages.length, luego estimar basado en actividad
      return sum + (c.messages_count || c.messages?.length || (c.last_message ? 1 : 0));
    }, 0);

    // Mensajes por tipo - usar datos de last_message si no hay messages array
    let agentMessages = 0;
    let clientMessages = 0;
    
    filteredConvs.forEach(conv => {
      if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach((msg: any) => {
          if (msg.message_type === 1 || msg.sender === 'agent') {
            agentMessages++;
          } else {
            clientMessages++;
          }
        });
      } else if (conv.last_message) {
        // Estimar basado en el último mensaje y el conteo de unread
        const lastMsgType = conv.last_message.message_type;
        const isAgentLast = lastMsgType === 1 || conv.last_message.sender === 'agent';
        // Aproximación: el agente responde a cada mensaje del cliente
        const estimatedTotal = conv.messages_count || 2;
        const half = Math.floor(estimatedTotal / 2);
        agentMessages += half;
        clientMessages += estimatedTotal - half;
      }
    });

    // Tiempo promedio de respuesta (simplificado)
    let totalResponseTime = 0;
    let responseCount = 0;
    
    filteredConvs.forEach(conv => {
      if (conv.messages && conv.messages.length > 1) {
        for (let i = 1; i < conv.messages.length; i++) {
          const prevMsg = conv.messages[i - 1];
          const currentMsg = conv.messages[i];
          
          // Si mensaje anterior es del cliente y actual del agente
          const prevIsClient = prevMsg.message_type === 0 || prevMsg.sender === 'contact';
          const currentIsAgent = currentMsg.message_type === 1 || currentMsg.sender === 'agent';
          
          if (prevIsClient && currentIsAgent) {
            const prevTime = typeof prevMsg.created_at === 'number' 
              ? prevMsg.created_at 
              : new Date(prevMsg.created_at).getTime() / 1000;
            const currentTime = typeof currentMsg.created_at === 'number'
              ? currentMsg.created_at
              : new Date(currentMsg.created_at).getTime() / 1000;
            
            const diff = currentTime - prevTime;
            if (diff > 0 && diff < 86400) { // Menos de 24 horas
              totalResponseTime += diff;
              responseCount++;
            }
          }
        }
      }
    });

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    // Top 5 contactos más activos - usar messages_count o estimar
    const contactActivity = new Map<string, { name: string; count: number; phone: string }>();
    
    filteredConvs.forEach(conv => {
      const contactId = conv.contact?.id || conv.meta?.sender?.id || conv.id;
      const existing = contactActivity.get(String(contactId));
      // Usar messages_count de la API, o contar mensajes si existen, o estimar 1 por conversación
      const messageCount = conv.messages_count || conv.messages?.length || 1;
      
      // Obtener nombre del contacto desde varias fuentes posibles
      const contactName = conv.contact?.name || 
                          conv.meta?.sender?.name || 
                          conv.contact?.phone_number || 
                          conv.meta?.sender?.phone_number ||
                          'Sin nombre';
      
      const contactPhone = conv.contact?.phone_number || 
                           conv.meta?.sender?.phone_number ||
                           conv.meta?.sender?.identifier || '';
      
      if (existing) {
        existing.count += messageCount;
      } else {
        contactActivity.set(String(contactId), {
          name: contactName,
          phone: contactPhone,
          count: messageCount
        });
      }
    });

    const topContacts = Array.from(contactActivity.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Actividad por hora (últimas 24 horas si es 'today')
    const hourlyActivity = new Array(24).fill(0);
    
    if (timeRange === 'today') {
      filteredConvs.forEach(conv => {
        if (conv.messages) {
          conv.messages.forEach((msg: any) => {
            const timestamp = typeof msg.created_at === 'number' 
              ? msg.created_at * 1000 
              : new Date(msg.created_at).getTime();
            const hour = new Date(timestamp).getHours();
            hourlyActivity[hour]++;
          });
        }
      });
    }

    // Conversaciones por día (última semana si es 'week')
    const dailyActivity = new Array(7).fill(0).map((_, i) => ({
      day: new Date(now - (6 - i) * dayMs).toLocaleDateString('es-ES', { weekday: 'short' }),
      count: 0
    }));

    if (timeRange === 'week') {
      filteredConvs.forEach(conv => {
        const timestamp = conv.created_at || 0;
        const convTime = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
        const daysDiff = Math.floor((now - convTime) / dayMs);
        
        if (daysDiff >= 0 && daysDiff < 7) {
          dailyActivity[6 - daysDiff].count++;
        }
      });
    }

    // Tasa de resolución
    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0';

    return {
      total,
      open,
      resolved,
      pending,
      unread,
      totalMessages,
      agentMessages,
      clientMessages,
      avgResponseTime,
      topContacts,
      hourlyActivity,
      dailyActivity,
      resolutionRate
    };
  }, [conversations, timeRange, backendStats]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbols: Record<string, string> = {
      'USD': 'US$', 'EUR': '€', 'CLP': '$',
      'ARS': 'AR$', 'MXN': 'MX$', 'BRL': 'R$',
      'COP': 'COL$', 'PEN': 'S/',
    };
    const symbol = symbols[currency] || '$';
    const noDecimals = ['CLP', 'COP'].includes(currency);
    if (amount >= 1000000) {
      return `${symbol}${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 10000) {
      return `${symbol}${(amount / 1000).toFixed(1)}K`;
    }
    return `${symbol}${amount.toLocaleString('es-CL', { minimumFractionDigits: noDecimals ? 0 : 2, maximumFractionDigits: noDecimals ? 0 : 2 })}`;
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: { value: number; isUp: boolean };
    subtitle?: string;
  }> = ({ title, value, icon, color, trend, subtitle }) => (
    <div className="group relative bg-white rounded-2xl p-5 border border-gray-100/80 hover:border-gray-200 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/50 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{title}</p>
          <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{value}</h3>
          {trend && (
            <div className={`flex items-center mt-2 text-xs font-medium ${trend.isUp ? 'text-emerald-600' : 'text-red-500'}`}>
              <div className={`flex items-center justify-center w-4 h-4 rounded-full mr-1 ${trend.isUp ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {trend.isUp ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              </div>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color} shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  );

  // Mostrar loading mientras carga las estadísticas
  if (loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-gray-100" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-blue-500 animate-spin" />
          </div>
          <p className="text-sm text-gray-400 mt-4 font-medium">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Panel de Métricas</h2>
            <p className="text-sm text-gray-400 font-medium">Análisis de actividad y rendimiento</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-gray-600">
            {timeRange === 'today' && 'Hoy'}
            {timeRange === 'week' && 'Última semana'}
            {timeRange === 'month' && 'Último mes'}
            {timeRange === 'all' && 'Todo el tiempo'}
          </span>
        </div>
      </div>

      {/* ═══════════ MÉTRICAS PRINCIPALES ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Conversaciones"
          value={metrics.total}
          icon={<MessageCircle className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25"
        />
        <MetricCard
          title="Abiertas"
          value={metrics.open}
          icon={<AlertCircle className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-amber-500 to-orange-500 shadow-orange-500/25"
        />
        <MetricCard
          title="Resueltas"
          value={metrics.resolved}
          icon={<CheckCircle2 className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25"
        />
        <MetricCard
          title="No Leídos"
          value={metrics.unread}
          icon={<Eye className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/25"
        />
      </div>

      {/* ═══════════ MÉTRICAS SECUNDARIAS ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Tiempo de Respuesta"
          value={backendStats?.avgResponseTime || formatTime(metrics.avgResponseTime)}
          icon={<Zap className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25"
          subtitle="Promedio últimos 7 días"
        />
        <MetricCard
          title="Mensajes Totales"
          value={metrics.totalMessages.toLocaleString()}
          icon={<Mail className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-500/25"
        />
        <MetricCard
          title="Tasa de Resolución"
          value={`${metrics.resolutionRate}%`}
          icon={<Target className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/25"
        />
      </div>

      {/* ═══════════ CONTACTOS + DISTRIBUCIÓN ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Contactos */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100/80 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Top 5 Contactos</h3>
          </div>
          <div className="space-y-4">
            {metrics.topContacts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sin datos aún</p>
              </div>
            ) : (
              metrics.topContacts.map((contact, index) => {
                const maxCount = metrics.topContacts[0].count;
                const percentage = (contact.count / maxCount) * 100;
                const colors = [
                  'from-blue-500 to-indigo-500',
                  'from-violet-500 to-purple-500',
                  'from-emerald-500 to-teal-500',
                  'from-amber-500 to-orange-500',
                  'from-rose-500 to-pink-500',
                ];
                
                return (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[index]} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-[10px] font-bold text-white">{index + 1}</span>
                        </div>
                        <span className="font-semibold text-gray-800 truncate">{contact.name}</span>
                        <span className="text-gray-300 text-xs hidden sm:inline">{contact.phone}</span>
                      </div>
                      <span className="font-bold text-gray-600 text-xs bg-gray-50 px-2 py-0.5 rounded-md">{contact.count} msgs</span>
                    </div>
                    <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${colors[index]} h-full rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Distribución de Mensajes */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100/80 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Distribución de Mensajes</h3>
          </div>
          
          {/* Visual ratio bar */}
          <div className="mb-6">
            <div className="flex rounded-xl h-10 overflow-hidden shadow-inner bg-gray-50">
              {metrics.totalMessages > 0 ? (
                <>
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-green-400 flex items-center justify-center transition-all duration-700"
                    style={{ width: `${(metrics.agentMessages / metrics.totalMessages) * 100}%` }}
                  >
                    {(metrics.agentMessages / metrics.totalMessages) * 100 > 15 && (
                      <span className="text-xs font-bold text-white">{Math.round((metrics.agentMessages / metrics.totalMessages) * 100)}%</span>
                    )}
                  </div>
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-400 flex items-center justify-center transition-all duration-700"
                    style={{ width: `${(metrics.clientMessages / metrics.totalMessages) * 100}%` }}
                  >
                    {(metrics.clientMessages / metrics.totalMessages) * 100 > 15 && (
                      <span className="text-xs font-bold text-white">{Math.round((metrics.clientMessages / metrics.totalMessages) * 100)}%</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-center">
                  <span className="text-xs text-gray-300">Sin datos</span>
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
                <span className="text-xs text-gray-500">Agentes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400" />
                <span className="text-xs text-gray-500">Clientes</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50/80 rounded-xl">
              <p className="text-2xl font-extrabold text-gray-900">{metrics.totalMessages.toLocaleString()}</p>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Total</p>
            </div>
            <div className="text-center p-3 bg-emerald-50/60 rounded-xl">
              <p className="text-2xl font-extrabold text-emerald-600">{metrics.agentMessages.toLocaleString()}</p>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mt-0.5">Agentes</p>
            </div>
            <div className="text-center p-3 bg-blue-50/60 rounded-xl">
              <p className="text-2xl font-extrabold text-blue-600">{metrics.clientMessages.toLocaleString()}</p>
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mt-0.5">Clientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ ACTIVIDAD POR HORA ═══════════ */}
      {timeRange === 'today' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100/80 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Actividad por Hora</h3>
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">Hoy</span>
          </div>
          <div className="flex items-end justify-between gap-0.5 h-40">
            {metrics.hourlyActivity.map((count, hour) => {
              const maxCount = Math.max(...metrics.hourlyActivity, 1);
              const height = (count / maxCount) * 100;
              const isCurrentHour = new Date().getHours() === hour;
              
              return (
                <div key={hour} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t-md transition-all cursor-pointer relative group ${
                      isCurrentHour
                        ? 'bg-gradient-to-t from-violet-600 to-violet-400 shadow-sm shadow-violet-300'
                        : count > 0
                        ? 'bg-gradient-to-t from-violet-400 to-violet-200 hover:from-violet-500 hover:to-violet-300'
                        : 'bg-gray-50'
                    }`}
                    style={{ height: `${Math.max(height, count > 0 ? 6 : 2)}%` }}
                  >
                    {count > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {count} msgs
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1.5 ${isCurrentHour ? 'text-violet-600 font-bold' : 'text-gray-300'}`}>
                    {hour % 3 === 0 ? `${hour}h` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════ ACTIVIDAD DIARIA ═══════════ */}
      {timeRange === 'week' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100/80 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Conversaciones por Día</h3>
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">Última semana</span>
          </div>
          <div className="flex items-end justify-between gap-3 h-40">
            {metrics.dailyActivity.map((day, index) => {
              const maxCount = Math.max(...metrics.dailyActivity.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              const isToday = index === 6;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-lg transition-all cursor-pointer relative group ${
                      isToday
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-200'
                        : day.count > 0
                        ? 'bg-gradient-to-t from-indigo-400 to-indigo-200 hover:from-indigo-500 hover:to-indigo-300'
                        : 'bg-gray-50'
                    }`}
                    style={{ height: `${Math.max(height, day.count > 0 ? 8 : 4)}%` }}
                  >
                    {day.count > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {day.count} convs
                      </div>
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${isToday ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════ VENTAS ═══════════ */}
      {!loadingSales && (
        <>
          {/* Empty state when no sales data */}
          {(!salesStats || (salesStats.metrics.links_generated === 0 && salesStats.all_time.total_sales === 0)) ? (
            <div className="relative overflow-hidden rounded-2xl border border-gray-100/80 bg-white">
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)', backgroundSize: '20px 20px' }} />
              
              <div className="relative p-8">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Ventas y Transacciones</h2>
                    <p className="text-sm text-gray-400 font-medium">Seguimiento en tiempo real de tus ventas</p>
                  </div>
                </div>

                {/* Preview Metric Cards (zeroed out) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                  {[
                    { title: 'VENTAS', value: '0', icon: <ShoppingCart className="w-4 h-4" />, gradient: 'from-emerald-500 to-green-600' },
                    { title: 'INGRESOS', value: '$0', icon: <DollarSign className="w-4 h-4" />, gradient: 'from-green-500 to-teal-600' },
                    { title: 'TICKET PROMEDIO', value: '$0', icon: <TrendingUp className="w-4 h-4" />, gradient: 'from-cyan-500 to-blue-600' },
                    { title: 'CONVERSIÓN', value: '0%', icon: <Link2 className="w-4 h-4" />, gradient: 'from-violet-500 to-purple-600' },
                  ].map((card, i) => (
                    <div key={i} className="rounded-xl p-4 border border-gray-50 bg-gray-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{card.title}</span>
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white opacity-30`}>
                          {card.icon}
                        </div>
                      </div>
                      <p className="text-2xl font-extrabold text-gray-200">{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-50/80 border border-emerald-100/80">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700">
                      Las ventas aparecerán aquí cuando tus clientes usen los enlaces de pago
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <>

          {/* Header de Ventas con datos */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Ventas y Transacciones</h2>
                <p className="text-sm text-gray-400 font-medium">Seguimiento en tiempo real de tus ventas</p>
              </div>
            </div>
            {salesStats?.all_time?.total_sales > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50/80 rounded-xl border border-emerald-100/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">
                  {salesStats.all_time.total_sales} ventas totales
                </span>
              </div>
            )}
          </div>

          {/* Métricas de Ventas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Ventas Completadas"
              value={salesStats.metrics.total_sales}
              icon={<ShoppingCart className="w-5 h-5 text-white" />}
              color="bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25"
            />
            <MetricCard
              title="Ingresos"
              value={formatCurrency(salesStats.metrics.total_revenue, salesStats.currency)}
              icon={<DollarSign className="w-5 h-5 text-white" />}
              color="bg-gradient-to-br from-green-500 to-teal-600 shadow-green-500/25"
            />
            <MetricCard
              title="Ticket Promedio"
              value={formatCurrency(salesStats.metrics.avg_ticket, salesStats.currency)}
              icon={<TrendingUp className="w-5 h-5 text-white" />}
              color="bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/25"
            />
            <MetricCard
              title="Conversión"
              value={`${salesStats.metrics.conversion_rate}%`}
              icon={<Link2 className="w-5 h-5 text-white" />}
              color="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25"
            />
          </div>

          {/* Pendientes */}
          {salesStats.metrics.pending_count > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard
                title="Ventas Pendientes"
                value={salesStats.metrics.pending_count}
                icon={<Clock className="w-5 h-5 text-white" />}
                color="bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25"
              />
              <MetricCard
                title="Valor Pendiente"
                value={formatCurrency(salesStats.metrics.pending_value, salesStats.currency)}
                icon={<DollarSign className="w-5 h-5 text-white" />}
                color="bg-gradient-to-br from-yellow-500 to-amber-500 shadow-yellow-500/25"
              />
            </div>
          )}

          {/* Top Productos + Ventas Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Productos */}
            {salesStats.top_products && salesStats.top_products.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100/80 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Top Productos</h3>
                </div>
                <div className="space-y-4">
                  {salesStats.top_products.slice(0, 5).map((product: any, index: number) => {
                    const maxRevenue = salesStats.top_products[0]?.revenue || 1;
                    const percentage = (product.revenue / maxRevenue) * 100;
                    
                    return (
                      <div key={index} className="group">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-white">{index + 1}</span>
                            </div>
                            <span className="font-semibold text-gray-800 truncate">{product.product_name}</span>
                            {product.product_category && (
                              <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md font-medium">{product.product_category}</span>
                            )}
                          </div>
                          <div className="text-right ml-2 flex items-center gap-2">
                            <span className="font-bold text-gray-700 text-xs">{formatCurrency(product.revenue, salesStats.currency)}</span>
                            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">{product.units_sold} uds</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-50 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ventas Recientes */}
            {salesStats.recent_sales && salesStats.recent_sales.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100/80 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                    <ShoppingCart className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Ventas Recientes</h3>
                </div>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {salesStats.recent_sales.slice(0, 10).map((sale: any) => (
                    <div key={sale.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50/80 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{sale.product_name}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                          {sale.customer_name && <span>{sale.customer_name}</span>}
                          {sale.customer_phone && <span>· {sale.customer_phone}</span>}
                          <span>· {sale.quantity}x</span>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-bold text-gray-900">{sale.formatted_total}</p>
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          sale.status_color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                          sale.status_color === 'blue' ? 'bg-blue-50 text-blue-600' :
                          sale.status_color === 'yellow' ? 'bg-amber-50 text-amber-600' :
                          sale.status_color === 'red' ? 'bg-red-50 text-red-600' :
                          'bg-gray-50 text-gray-500'
                        }`}>{sale.status_label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ventas por Día (gráfico de barras) */}
          {salesStats.daily_sales && salesStats.daily_sales.length > 1 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100/80 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Ingresos por Día</h3>
              </div>
              <div className="flex items-end justify-between gap-1 h-40">
                {salesStats.daily_sales.map((day: any, index: number) => {
                  const maxRevenue = Math.max(...salesStats.daily_sales.map((d: any) => d.revenue), 1);
                  const height = (day.revenue / maxRevenue) * 100;
                  const dateLabel = new Date(day.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className={`w-full rounded-md transition-all cursor-pointer relative group ${
                          day.revenue > 0
                            ? 'bg-gradient-to-t from-emerald-500 to-green-300 hover:from-emerald-600 hover:to-green-400'
                            : 'bg-gray-50'
                        }`}
                        style={{ height: `${Math.max(height, day.revenue > 0 ? 6 : 2)}%` }}
                      >
                        {day.revenue > 0 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {formatCurrency(day.revenue, salesStats.currency)} · {day.count} ventas
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1.5 truncate w-full text-center">{dateLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
          )}
        </>
      )}
    </div>
  );
};

export default MetricsDashboard;
