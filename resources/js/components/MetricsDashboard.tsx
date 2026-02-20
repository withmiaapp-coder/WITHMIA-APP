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
  }> = ({ title, value, icon, color, trend }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isUp ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
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
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard de Métricas</h2>
          <p className="text-gray-600">Análisis de actividad y rendimiento</p>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            {timeRange === 'today' && 'Hoy'}
            {timeRange === 'week' && 'Última semana'}
            {timeRange === 'month' && 'Último mes'}
            {timeRange === 'all' && 'Todo el tiempo'}
          </span>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Conversaciones"
          value={metrics.total}
          icon={<MessageCircle className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <MetricCard
          title="Conversaciones Abiertas"
          value={metrics.open}
          icon={<AlertCircle className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
        />
        <MetricCard
          title="Resueltas"
          value={metrics.resolved}
          icon={<CheckCircle2 className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <MetricCard
          title="Mensajes No Leídos"
          value={metrics.unread}
          icon={<MessageCircle className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-red-500 to-red-600"
        />
      </div>

      {/* Fila secundaria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Tiempo Promedio Respuesta"
          value={backendStats?.avgResponseTime || formatTime(metrics.avgResponseTime)}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <MetricCard
          title="Total Mensajes"
          value={metrics.totalMessages}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-indigo-500 to-indigo-600"
        />
        <MetricCard
          title="Tasa de Resolución"
          value={`${metrics.resolutionRate}%`}
          icon={<CheckCircle2 className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-teal-500 to-teal-600"
        />
      </div>

      {/* Gráficos y tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Contactos */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Contactos Más Activos</h3>
          </div>
          <div className="space-y-3">
            {metrics.topContacts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay datos disponibles</p>
            ) : (
              metrics.topContacts.map((contact, index) => {
                const maxCount = metrics.topContacts[0].count;
                const percentage = (contact.count / maxCount) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <span className="font-medium text-gray-900 truncate">{contact.name}</span>
                        <span className="text-gray-400 text-xs">{contact.phone}</span>
                      </div>
                      <span className="font-semibold text-gray-700">{contact.count} msgs</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <MessageCircle className="w-5 h-5 text-green-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Distribución de Mensajes</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Mensajes de Agentes</span>
                <span className="text-sm font-semibold text-gray-900">{metrics.agentMessages}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${metrics.totalMessages > 0 
                      ? (metrics.agentMessages / metrics.totalMessages) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Mensajes de Clientes</span>
                <span className="text-sm font-semibold text-gray-900">{metrics.clientMessages}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${metrics.totalMessages > 0 
                      ? (metrics.clientMessages / metrics.totalMessages) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalMessages}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{metrics.agentMessages}</p>
                  <p className="text-xs text-gray-500">Agentes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{metrics.clientMessages}</p>
                  <p className="text-xs text-gray-500">Clientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actividad por hora (solo para 'today') */}
      {timeRange === 'today' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-purple-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Actividad por Hora (Hoy)</h3>
          </div>
          <div className="flex items-end justify-between space-x-1 h-40">
            {metrics.hourlyActivity.map((count, hour) => {
              const maxCount = Math.max(...metrics.hourlyActivity, 1);
              const height = (count / maxCount) * 100;
              
              return (
                <div key={hour} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-t hover:from-purple-600 hover:to-purple-400 transition-all cursor-pointer relative group"
                    style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0' }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {count} msgs
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{hour}h</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actividad diaria (solo para 'week') */}
      {timeRange === 'week' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Conversaciones por Día (Última Semana)</h3>
          </div>
          <div className="flex items-end justify-between space-x-2 h-40">
            {metrics.dailyActivity.map((day, index) => {
              const maxCount = Math.max(...metrics.dailyActivity.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-t hover:from-indigo-600 hover:to-indigo-400 transition-all cursor-pointer relative group"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '8px' : '0' }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {day.count} convs
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{day.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════ VENTAS ══════════════════ */}
      {!loadingSales && (
        <>
          {/* Header de Ventas */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              <h2 className="text-xl font-bold text-gray-900">Ventas y Transacciones</h2>
            </div>
            {salesStats?.all_time?.total_sales > 0 && (
              <span className="text-sm text-gray-500">
                Total histórico: {salesStats.all_time.total_sales} ventas
              </span>
            )}
          </div>

          {/* Empty state when no sales data */}
          {(!salesStats || (salesStats.metrics.links_generated === 0 && salesStats.all_time.total_sales === 0)) ? (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aún no hay ventas registradas</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                Cuando tus clientes usen los enlaces de pago generados por WITHMIA, las ventas aparecerán aquí automáticamente con métricas en tiempo real.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" />
                  <span>Enlaces de pago</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>Conversión</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Ingresos</span>
                </div>
              </div>
            </div>
          ) : (
          <>

          {/* Métricas de Ventas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Ventas Completadas"
              value={salesStats.metrics.total_sales}
              icon={<ShoppingCart className="w-6 h-6 text-white" />}
              color="bg-gradient-to-r from-emerald-500 to-emerald-600"
            />
            <MetricCard
              title="Ingresos"
              value={formatCurrency(salesStats.metrics.total_revenue, salesStats.currency)}
              icon={<DollarSign className="w-6 h-6 text-white" />}
              color="bg-gradient-to-r from-green-500 to-green-600"
            />
            <MetricCard
              title="Ticket Promedio"
              value={formatCurrency(salesStats.metrics.avg_ticket, salesStats.currency)}
              icon={<TrendingUp className="w-6 h-6 text-white" />}
              color="bg-gradient-to-r from-cyan-500 to-cyan-600"
            />
            <MetricCard
              title="Conversión de Enlaces"
              value={`${salesStats.metrics.conversion_rate}%`}
              icon={<Link2 className="w-6 h-6 text-white" />}
              color="bg-gradient-to-r from-violet-500 to-violet-600"
            />
          </div>

          {/* Pendientes */}
          {salesStats.metrics.pending_count > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard
                title="Ventas Pendientes"
                value={salesStats.metrics.pending_count}
                icon={<Clock className="w-6 h-6 text-white" />}
                color="bg-gradient-to-r from-amber-500 to-amber-600"
              />
              <MetricCard
                title="Valor Pendiente"
                value={formatCurrency(salesStats.metrics.pending_value, salesStats.currency)}
                icon={<DollarSign className="w-6 h-6 text-white" />}
                color="bg-gradient-to-r from-yellow-500 to-yellow-600"
              />
            </div>
          )}

          {/* Top Productos + Ventas Recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Productos */}
            {salesStats.top_products && salesStats.top_products.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <Package className="w-5 h-5 text-emerald-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Top Productos</h3>
                </div>
                <div className="space-y-3">
                  {salesStats.top_products.slice(0, 5).map((product: any, index: number) => {
                    const maxRevenue = salesStats.top_products[0]?.revenue || 1;
                    const percentage = (product.revenue / maxRevenue) * 100;
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <span className="font-medium text-gray-900 truncate">{product.product_name}</span>
                            {product.product_category && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{product.product_category}</span>
                            )}
                          </div>
                          <div className="text-right ml-2">
                            <span className="font-semibold text-gray-700">{formatCurrency(product.revenue, salesStats.currency)}</span>
                            <span className="text-xs text-gray-500 ml-1">({product.units_sold} uds)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-500"
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
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <ShoppingCart className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Ventas Recientes</h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {salesStats.recent_sales.slice(0, 10).map((sale: any) => (
                    <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{sale.product_name}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {sale.customer_name && <span>{sale.customer_name}</span>}
                          {sale.customer_phone && <span>· {sale.customer_phone}</span>}
                          <span>· {sale.quantity}x</span>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-semibold text-gray-900">{sale.formatted_total}</p>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                          sale.status_color === 'green' ? 'bg-green-100 text-green-700' :
                          sale.status_color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          sale.status_color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                          sale.status_color === 'red' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
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
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Ingresos por Día</h3>
              </div>
              <div className="flex items-end justify-between space-x-1 h-40">
                {salesStats.daily_sales.map((day: any, index: number) => {
                  const maxRevenue = Math.max(...salesStats.daily_sales.map((d: any) => d.revenue), 1);
                  const height = (day.revenue / maxRevenue) * 100;
                  const dateLabel = new Date(day.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t hover:from-emerald-600 hover:to-emerald-400 transition-all cursor-pointer relative group"
                        style={{ height: `${height}%`, minHeight: day.revenue > 0 ? '8px' : '0' }}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {formatCurrency(day.revenue, salesStats.currency)} · {day.count} ventas
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2 truncate w-full text-center">{dateLabel}</span>
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
