import React, { useMemo } from 'react';
import {
  TrendingUp,
  MessageCircle,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react';

interface MetricsDashboardProps {
  conversations: any[];
  timeRange?: 'today' | 'week' | 'month' | 'all';
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  conversations,
  timeRange = 'all'
}) => {
  
  const metrics = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
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

    // Total de mensajes
    const totalMessages = filteredConvs.reduce((sum, c) => {
      return sum + (c.messages?.length || 0);
    }, 0);

    // Mensajes por tipo
    let agentMessages = 0;
    let clientMessages = 0;
    
    filteredConvs.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach((msg: any) => {
          if (msg.message_type === 1 || msg.sender === 'agent') {
            agentMessages++;
          } else {
            clientMessages++;
          }
        });
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

    // Top 5 contactos más activos
    const contactActivity = new Map<string, { name: string; count: number; phone: string }>();
    
    filteredConvs.forEach(conv => {
      const contactId = conv.contact?.id || conv.id;
      const existing = contactActivity.get(contactId);
      const messageCount = conv.messages?.length || 0;
      
      if (existing) {
        existing.count += messageCount;
      } else {
        contactActivity.set(contactId, {
          name: conv.contact?.name || 'Sin nombre',
          phone: conv.contact?.phone_number || '',
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
  }, [conversations, timeRange]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
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
          value={formatTime(metrics.avgResponseTime)}
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
    </div>
  );
};

export default MetricsDashboard;
