import React, { useMemo, useEffect, useState, useRef } from 'react';
import debugLog from '@/utils/debugLogger';
import { useTheme } from '@/contexts/ThemeContext';
import type { Conversation, Message } from '@/types/chatwoot';
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

interface SalesProduct {
  product_name: string;
  product_category?: string;
  revenue: number;
  units_sold: number;
}

interface SaleEntry {
  id: number | string;
  product_name: string;
  customer_name?: string;
  customer_phone?: string;
  quantity: number;
  formatted_total: string;
  status_color: string;
  status_label: string;
}

interface DailySale {
  date: string;
  revenue: number;
  orders: number;
  count: number;
}

interface SalesStats {
  currency: string;
  metrics: {
    total_sales: number;
    total_revenue: number;
    avg_ticket: number;
    conversion_rate: number;
    pending_count: number;
    pending_value: number;
    links_generated: number;
  };
  all_time: {
    total_sales: number;
  };
  top_products: SalesProduct[];
  recent_sales: SaleEntry[];
  daily_sales: DailySale[];
}

interface MetricsDashboardProps {
  conversations: Conversation[];
  timeRange?: 'today' | 'week' | 'month' | 'all';
  firstName?: string;
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
  timeRange = 'all',
  firstName = 'Usuario'
}) => {
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [loadingSales, setLoadingSales] = useState(true);

  // Theme
  const { hasTheme, isDark } = useTheme();

  // ═══════════════════════════════════════════════════════════
  // Reusable themed styles — applied via `style` props when hasTheme
  // ═══════════════════════════════════════════════════════════
  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      // Card / container
      cardBg: isDark ? 'rgba(255,255,255,0.04)' : 'var(--theme-content-card-bg)',
      cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'var(--theme-content-card-border)',
      cardHoverShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px var(--theme-content-card-shadow)',
      // Text
      heading: 'var(--theme-text-primary)',
      label: 'var(--theme-text-muted)',
      value: 'var(--theme-text-primary)',
      subtitle: 'var(--theme-text-muted)',
      secondary: 'var(--theme-text-secondary)',
      muted: 'var(--theme-text-muted)',
      // SVG track
      trackStroke: isDark ? '#1e293b' : '#f3f4f6',
      // Section header icon bg (keep gradient, override for subtle glass in dark)
      sectionIconBg: isDark ? 'rgba(255,255,255,0.08)' : undefined,
      // Bars / progress
      emptyBar: isDark ? 'rgba(255,255,255,0.04)' : undefined,
      barTrack: isDark ? 'rgba(255,255,255,0.06)' : undefined,
      // Tooltips
      tooltipBg: isDark ? '#e2e8f0' : '#111827',
      tooltipText: isDark ? '#0f172a' : '#ffffff',
      // Badge / pill background
      badgeBg: isDark ? 'rgba(255,255,255,0.06)' : undefined,
      badgeBorder: isDark ? 'rgba(255,255,255,0.08)' : undefined,
      // Hover row
      rowHover: isDark ? 'rgba(255,255,255,0.04)' : undefined,
      // Empty state
      emptyBg: isDark ? 'rgba(255,255,255,0.04)' : undefined,
      emptyIcon: isDark ? '#475569' : '#e5e7eb',
      emptyText: isDark ? '#64748b' : '#9ca3af',
      // Skeleton
      skelBg: isDark ? 'rgba(255,255,255,0.04)' : undefined,
      skelPulse: isDark ? 'rgba(255,255,255,0.08)' : undefined,
      // Legend boxes (distribution)
      legendAgent: isDark ? { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)' } : undefined,
      legendClient: isDark ? { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.15)' } : undefined,
      // Sales empty cards
      salesPreviewCard: isDark ? { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.04)' } : undefined,
    };
  }, [hasTheme, isDark]);

  // Card style builder — used by every section container
  const cardStyle = (extra?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!t) return extra;
    return {
      background: t.cardBg,
      borderColor: t.cardBorder,
      ...(extra || {}),
    };
  };
  
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
        conv.messages.forEach((msg: Message) => {
          if (msg.message_type === 'outgoing' || msg.sender === 'agent') {
            agentMessages++;
          } else {
            clientMessages++;
          }
        });
      } else if (conv.last_message) {
        // Estimar basado en el último mensaje y el conteo de unread
        const isAgentLast = conv.last_message.sender === 'agent';
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
          const prevIsClient = prevMsg.message_type === 'incoming' || prevMsg.sender === 'contact';
          const currentIsAgent = currentMsg.message_type === 'outgoing' || currentMsg.sender === 'agent';
          
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
          conv.messages.forEach((msg: Message) => {
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

  // ─── Helper Components ─────────────────────────────────────

  const CircularProgress: React.FC<{
    value: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    label?: string;
  }> = ({ value, size = 130, strokeWidth = 10, color = '#6366f1', label }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={t?.trackStroke || '#f3f4f6'} strokeWidth={strokeWidth} />
          <circle
            cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold" style={t ? { color: t.value } : undefined}>{value}%</span>
          {label && <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={t ? { color: t.label } : undefined}>{label}</span>}
        </div>
      </div>
    );
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const generateInsights = (): { text: string; type: 'success' | 'warning' | 'info' }[] => {
    const insights: { text: string; type: 'success' | 'warning' | 'info' }[] = [];
    const rate = parseFloat(metrics.resolutionRate as string);
    if (rate >= 80) insights.push({ text: 'Excelente tasa de resolución', type: 'success' });
    else if (rate < 50 && metrics.total > 0) insights.push({ text: 'La tasa de resolución necesita atención', type: 'warning' });
    if (metrics.open > metrics.resolved && metrics.total > 0) {
      insights.push({ text: `${metrics.open} conversaciones requieren atención`, type: 'warning' });
    }
    if (metrics.unread > 0) insights.push({ text: `${metrics.unread} mensajes sin leer`, type: 'info' });
    if (metrics.totalMessages > 100) insights.push({ text: `${metrics.totalMessages.toLocaleString()} mensajes procesados`, type: 'success' });
    return insights.slice(0, 3);
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: { value: number; isUp: boolean };
    subtitle?: string;
    delay?: number;
  }> = ({ title, value, icon, color, trend, subtitle, delay = 0 }) => (
    <div
      className={`group relative rounded-2xl p-5 border transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:border-gray-300 hover:shadow-gray-300/30' : ''}`}
      style={{ animation: `fadeInUp 0.6s ease-out ${delay}ms both`, ...cardStyle() }}
      onMouseEnter={(e) => { if (t) (e.currentTarget as HTMLDivElement).style.boxShadow = t.cardHoverShadow; }}
      onMouseLeave={(e) => { if (t) (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      {!t && <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 via-white/0 to-gray-50/0 group-hover:from-blue-50/40 group-hover:via-white/0 group-hover:to-purple-50/30 transition-all duration-500 pointer-events-none" />}
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold uppercase tracking-[0.08em] mb-2 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.label } : undefined}>{title}</p>
          <h3 className={`text-[28px] font-extrabold tracking-tight leading-none ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.value } : undefined}>{value}</h3>
          {trend && (
            <div className={`inline-flex items-center mt-2.5 text-xs font-semibold px-2 py-0.5 rounded-full ${trend.isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
              {trend.isUp ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
              {Math.abs(trend.value)}%
            </div>
          )}
          {subtitle && <p className={`text-[11px] mt-1.5 font-medium ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${color} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500`}>
          {icon}
        </div>
      </div>
    </div>
  );

  // Mostrar loading mientras carga las estadísticas
  if (loadingStats) {
    const skelCard: React.CSSProperties | undefined = t ? { background: t.skelBg || 'rgba(255,255,255,0.04)', borderColor: t.cardBorder } : undefined;
    const skelPulse: React.CSSProperties | undefined = t ? { background: t.skelPulse || 'rgba(255,255,255,0.08)' } : undefined;
    return (
      <div className="space-y-6">
        {/* Skeleton welcome banner */}
        <div className={`rounded-3xl p-8 animate-pulse ${!t ? 'bg-gradient-to-r from-slate-200 to-slate-100' : ''}`} style={t ? { background: t.skelBg || 'rgba(255,255,255,0.04)' } : undefined}>
          <div className={`h-4 w-20 rounded-full mb-3 ${!t ? 'bg-slate-300/60' : ''}`} style={skelPulse} />
          <div className={`h-8 w-56 rounded-lg mb-2 ${!t ? 'bg-slate-300/60' : ''}`} style={skelPulse} />
          <div className={`h-4 w-72 rounded-lg ${!t ? 'bg-slate-300/40' : ''}`} style={skelPulse} />
        </div>
        {/* Skeleton metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`rounded-2xl border p-5 animate-pulse ${!t ? 'bg-white border-gray-200/80 shadow-sm' : ''}`} style={skelCard}>
              <div className="flex justify-between">
                <div className="space-y-3 flex-1">
                  <div className={`h-3 w-20 rounded-full ${!t ? 'bg-gray-100' : ''}`} style={skelPulse} />
                  <div className={`h-8 w-16 rounded-lg ${!t ? 'bg-gray-100' : ''}`} style={skelPulse} />
                </div>
                <div className={`w-11 h-11 rounded-2xl ${!t ? 'bg-gray-100' : ''}`} style={skelPulse} />
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton secondary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`rounded-2xl border p-6 flex items-center justify-center animate-pulse ${!t ? 'bg-white border-gray-200/80 shadow-sm' : ''}`} style={skelCard}>
            <div className={`w-[130px] h-[130px] rounded-full border-[10px] ${!t ? 'border-gray-100' : ''}`} style={t ? { borderColor: t.skelPulse || 'rgba(255,255,255,0.08)' } : undefined} />
          </div>
          <div className="lg:col-span-2 grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`rounded-2xl border p-5 animate-pulse ${!t ? 'bg-white border-gray-200/80 shadow-sm' : ''}`} style={skelCard}>
                <div className="space-y-3">
                  <div className={`h-3 w-24 rounded-full ${!t ? 'bg-gray-100' : ''}`} style={skelPulse} />
                  <div className={`h-8 w-14 rounded-lg ${!t ? 'bg-gray-100' : ''}`} style={skelPulse} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <style>{`
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(-12px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes growWidth {
        from { width: 0%; }
      }
    `}</style>
    <div className="space-y-6">
      {/* ═══════════ GREETING + QUICK STATS ═══════════ */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ animation: 'fadeIn 0.6s ease-out' }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-xl font-extrabold tracking-tight ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>
              {getGreeting()}, {firstName} 👋
            </h2>
            <p className={`text-[13px] font-medium ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · Panel de métricas
            </p>
          </div>
        </div>

        {/* Quick stats pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Conversaciones', value: metrics.total, bg: 'bg-blue-50 text-blue-700 border-blue-100', darkBg: 'rgba(59,130,246,0.1)', darkBorder: 'rgba(59,130,246,0.2)', darkText: '#93c5fd' },
            { label: 'Abiertas', value: metrics.open, bg: 'bg-amber-50 text-amber-700 border-amber-100', darkBg: 'rgba(245,158,11,0.1)', darkBorder: 'rgba(245,158,11,0.2)', darkText: '#fcd34d' },
            { label: 'Resolución', value: `${metrics.resolutionRate}%`, bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', darkBg: 'rgba(16,185,129,0.1)', darkBorder: 'rgba(16,185,129,0.2)', darkText: '#6ee7b7' },
          ].map((pill, i) => (
            <div
              key={i}
              className={`px-3.5 py-1.5 rounded-xl border backdrop-blur-sm ${!t ? pill.bg : ''}`}
              style={t ? {
                background: isDark ? pill.darkBg : 'var(--theme-content-card-bg)',
                borderColor: isDark ? pill.darkBorder : 'var(--theme-content-card-border)',
                color: isDark ? pill.darkText : 'var(--theme-text-primary)',
              } : undefined}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{pill.label}</span>
              <p className="text-base font-extrabold leading-tight">{pill.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ MÉTRICAS PRINCIPALES ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Conversaciones"
          value={metrics.total}
          icon={<MessageCircle className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30"
          delay={100}
        />
        <MetricCard
          title="Abiertas"
          value={metrics.open}
          icon={<AlertCircle className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-amber-500 to-orange-500 shadow-orange-500/30"
          delay={200}
        />
        <MetricCard
          title="Resueltas"
          value={metrics.resolved}
          icon={<CheckCircle2 className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30"
          delay={300}
        />
        <MetricCard
          title="No Leídos"
          value={metrics.unread}
          icon={<Eye className="w-5 h-5 text-white" />}
          color="bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30"
          delay={400}
        />
      </div>

      {/* ═══════════ PERFORMANCE + SECONDARY ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ animation: 'fadeInUp 0.6s ease-out 300ms both' }}>
        {/* Circular gauge */}
        <div className={`backdrop-blur-sm rounded-2xl p-6 border flex flex-col items-center justify-center transition-all duration-500 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-300/30' : 'hover:shadow-xl'}`} style={cardStyle()}>
          <CircularProgress
            value={parseFloat(metrics.resolutionRate as string) || 0}
            size={130}
            strokeWidth={10}
            color={parseFloat(metrics.resolutionRate as string) >= 70 ? '#10b981' : parseFloat(metrics.resolutionRate as string) >= 40 ? '#f59e0b' : '#ef4444'}
            label="Resolución"
          />
          <p className={`text-xs mt-3 font-medium text-center ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>Tasa de resolución general</p>
        </div>

        {/* Secondary metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Tiempo Respuesta"
            value={backendStats?.avgResponseTime || formatTime(metrics.avgResponseTime)}
            icon={<Zap className="w-5 h-5 text-white" />}
            color="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30"
            subtitle="Promedio últimos 7 días"
            delay={500}
          />
          <MetricCard
            title="Mensajes Totales"
            value={metrics.totalMessages.toLocaleString()}
            icon={<Mail className="w-5 h-5 text-white" />}
            color="bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-500/30"
            delay={600}
          />
          <MetricCard
            title="Contactos Activos"
            value={metrics.topContacts.length}
            icon={<Users className="w-5 h-5 text-white" />}
            color="bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/30"
            delay={700}
          />
        </div>
      </div>

      {/* ═══════════ QUICK INSIGHTS ═══════════ */}
      {generateInsights().length > 0 && (
        <div className="flex flex-wrap gap-2" style={{ animation: 'fadeInUp 0.6s ease-out 500ms both' }}>
          {generateInsights().map((insight, i) => (
            <div
              key={i}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                insight.type === 'success' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100' :
                insight.type === 'warning' ? 'bg-amber-50/80 text-amber-700 border-amber-100' :
                'bg-blue-50/80 text-blue-700 border-blue-100'
              }`}
              style={{ animation: `slideInRight 0.5s ease-out ${600 + i * 100}ms both` }}
            >
              <span className={`w-2 h-2 rounded-full ${
                insight.type === 'success' ? 'bg-emerald-500' :
                insight.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              {insight.text}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ CONTACTOS + DISTRIBUCIÓN ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ animation: 'fadeInUp 0.6s ease-out 400ms both' }}>
        
        {/* Top Contactos */}
        <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-500 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-300/30' : 'hover:shadow-xl'}`} style={cardStyle()}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Top Contactos</h3>
                <p className={`text-[11px] font-medium ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>Más activos del período</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {metrics.topContacts.length === 0 ? (
              <div className="text-center py-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3`} style={t ? { background: t.emptyBg || 'rgba(255,255,255,0.04)' } : undefined}>
                  <Users className="w-7 h-7" style={t ? { color: t.emptyIcon } : { color: '#e5e7eb' }} />
                </div>
                <p className={`text-sm font-medium ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.emptyText } : undefined}>Sin datos aún</p>
                <p className={`text-xs mt-1 ${!t ? 'text-gray-300' : ''}`} style={t ? { color: t.muted } : undefined}>Los contactos aparecerán aquí</p>
              </div>
            ) : (
              metrics.topContacts.map((contact, index) => {
                const maxCount = metrics.topContacts[0].count;
                const percentage = (contact.count / maxCount) * 100;
                const colors = [
                  { gradient: 'from-blue-500 to-indigo-500', bar: 'from-blue-500 to-indigo-400' },
                  { gradient: 'from-violet-500 to-purple-500', bar: 'from-violet-500 to-purple-400' },
                  { gradient: 'from-emerald-500 to-teal-500', bar: 'from-emerald-500 to-teal-400' },
                  { gradient: 'from-amber-500 to-orange-500', bar: 'from-amber-500 to-orange-400' },
                  { gradient: 'from-rose-500 to-pink-500', bar: 'from-rose-500 to-pink-400' },
                ];
                const c = colors[index] || colors[0];
                
                return (
                  <div
                    key={index}
                    className={`group rounded-xl p-3 transition-all duration-300 ${!t ? 'hover:bg-gray-100/80' : ''}`}
                    style={{ animation: `slideInRight 0.5s ease-out ${index * 80}ms both`, ...(t ? { cursor: 'default' } : {}) }}
                    onMouseEnter={(e) => { if (t && t.rowHover) (e.currentTarget as HTMLDivElement).style.background = t.rowHover; }}
                    onMouseLeave={(e) => { if (t) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300`}>
                        <span className="text-xs font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`font-semibold text-sm truncate ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.heading } : undefined}>{contact.name}</span>
                            <span className={`text-[11px] hidden sm:inline truncate ${!t ? 'text-gray-300' : ''}`} style={t ? { color: t.muted } : undefined}>{contact.phone}</span>
                          </div>
                          <span className={`font-bold text-xs px-2 py-0.5 rounded-lg ml-2 flex-shrink-0 ${!t ? 'text-gray-600 bg-gray-50' : ''}`} style={t ? { color: t.secondary, background: t.badgeBg || 'transparent' } : undefined}>{contact.count} msgs</span>
                        </div>
                        <div className={`w-full rounded-full h-1.5 overflow-hidden ${!t ? 'bg-gray-100' : ''}`} style={t ? { background: t.barTrack || 'rgba(255,255,255,0.06)' } : undefined}>
                          <div
                            className={`bg-gradient-to-r ${c.bar} h-full rounded-full`}
                            style={{ width: `${percentage}%`, animation: 'growWidth 1s ease-out 0.3s both' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Distribución de Mensajes - Donut Chart */}
        <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-500 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-300/30' : 'hover:shadow-xl'}`} style={cardStyle()}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Distribución de Mensajes</h3>
              <p className={`text-[11px] font-medium ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>Agentes vs Clientes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* SVG Donut Chart */}
            <div className="relative flex-shrink-0">
              {(() => {
                const size = 150;
                const strokeWidth = 22;
                const radius = (size - strokeWidth) / 2;
                const circumference = 2 * Math.PI * radius;
                const agentPct = metrics.totalMessages > 0 ? (metrics.agentMessages / metrics.totalMessages) : 0.5;
                const agentOffset = circumference * (1 - agentPct);
                
                return (
                  <svg width={size} height={size} className="transform -rotate-90">
                    <circle cx={size/2} cy={size/2} r={radius} fill="none"
                      stroke="url(#clientGradientDonut)" strokeWidth={strokeWidth} />
                    <circle cx={size/2} cy={size/2} r={radius} fill="none"
                      stroke="url(#agentGradientDonut)" strokeWidth={strokeWidth}
                      strokeDasharray={circumference} strokeDashoffset={agentOffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                    <defs>
                      <linearGradient id="agentGradientDonut" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                      <linearGradient id="clientGradientDonut" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                  </svg>
                );
              })()}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-extrabold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.value } : undefined}>{metrics.totalMessages.toLocaleString()}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.label } : undefined}>Total</span>
              </div>
            </div>
            
            {/* Legend + Stats */}
            <div className="flex-1 space-y-3">
              <div className={`p-3 rounded-xl border transition-colors ${!t ? 'bg-emerald-50/60 border-emerald-100/60 hover:bg-emerald-50' : 'hover:opacity-90'}`} style={t?.legendAgent ? { background: t.legendAgent.bg, borderColor: t.legendAgent.border } : undefined}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
                  <span className={`text-xs font-semibold ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.secondary } : undefined}>Agentes</span>
                </div>
                <p className="text-xl font-extrabold text-emerald-600">{metrics.agentMessages.toLocaleString()}</p>
                <p className="text-[10px] text-emerald-500 font-medium">
                  {metrics.totalMessages > 0 ? Math.round((metrics.agentMessages / metrics.totalMessages) * 100) : 0}% del total
                </p>
              </div>
              <div className={`p-3 rounded-xl border transition-colors ${!t ? 'bg-indigo-50/60 border-indigo-100/60 hover:bg-indigo-50' : 'hover:opacity-90'}`} style={t?.legendClient ? { background: t.legendClient.bg, borderColor: t.legendClient.border } : undefined}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" />
                  <span className={`text-xs font-semibold ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.secondary } : undefined}>Clientes</span>
                </div>
                <p className="text-xl font-extrabold text-indigo-600">{metrics.clientMessages.toLocaleString()}</p>
                <p className="text-[10px] text-indigo-500 font-medium">
                  {metrics.totalMessages > 0 ? Math.round((metrics.clientMessages / metrics.totalMessages) * 100) : 0}% del total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ ACTIVIDAD POR HORA ═══════════ */}
      {timeRange === 'today' && (
        <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-500 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-300/30' : 'hover:shadow-xl'}`} style={{...cardStyle(), animation: 'fadeInUp 0.6s ease-out 500ms both' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <h3 className={`text-base font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Actividad por Hora</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${!t ? 'text-gray-400 bg-gray-50' : ''}`} style={t ? { color: t.muted, background: t.badgeBg || 'transparent' } : undefined}>Hoy</span>
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
                        : ''
                    }`}
                    style={{ height: `${Math.max(height, count > 0 ? 6 : 2)}%`, ...(!isCurrentHour && count === 0 ? { background: t?.emptyBar || undefined } : {}) }}
                  >
                    {count > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {count} msgs
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1.5 ${isCurrentHour ? 'text-violet-600 font-bold' : ''}`} style={!isCurrentHour && t ? { color: t.muted } : (!isCurrentHour ? undefined : undefined)}>
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
        <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-500 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-300/30' : 'hover:shadow-xl'}`} style={{...cardStyle(), animation: 'fadeInUp 0.6s ease-out 500ms both' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className={`text-base font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Conversaciones por Día</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${!t ? 'text-gray-400 bg-gray-50' : ''}`} style={t ? { color: t.muted, background: t.badgeBg || 'transparent' } : undefined}>Última semana</span>
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
                        : ''
                    }`}
                    style={{ height: `${Math.max(height, day.count > 0 ? 8 : 4)}%`, ...(!isToday && day.count === 0 ? { background: t?.emptyBar || undefined } : {}) }}
                  >
                    {day.count > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {day.count} convs
                      </div>
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${isToday ? 'text-indigo-600 font-bold' : ''}`} style={!isToday && t ? { color: t.muted } : (!isToday ? undefined : undefined)}>{day.day}</span>
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
            <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-sm ${!t ? 'border-gray-200/80 bg-white shadow-sm' : ''}`} style={cardStyle()}>
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)', backgroundSize: '20px 20px' }} />
              
              <div className="relative p-8">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-extrabold tracking-tight ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Ventas y Transacciones</h2>
                    <p className={`text-sm font-medium ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>Seguimiento en tiempo real de tus ventas</p>
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
                    <div key={i} className={`rounded-xl p-4 border ${!t ? 'border-gray-50 bg-gray-50/50' : ''}`} style={t?.salesPreviewCard ? { background: t.salesPreviewCard.bg, borderColor: t.salesPreviewCard.border } : undefined}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${!t ? 'text-gray-300' : ''}`} style={t ? { color: t.muted } : undefined}>{card.title}</span>
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white opacity-30`}>
                          {card.icon}
                        </div>
                      </div>
                      <p className={`text-2xl font-extrabold ${!t ? 'text-gray-200' : ''}`} style={t ? { color: t.muted } : undefined}>{card.value}</p>
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
                <h2 className={`text-xl font-extrabold tracking-tight ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Ventas y Transacciones</h2>
                <p className={`text-sm font-medium ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>Seguimiento en tiempo real de tus ventas</p>
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
              <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-500 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-300/30' : 'hover:shadow-xl'}`} style={cardStyle()}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <h3 className={`text-base font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Top Productos</h3>
                </div>
                <div className="space-y-4">
                  {salesStats.top_products.slice(0, 5).map((product: SalesProduct, index: number) => {
                    const maxRevenue = salesStats.top_products[0]?.revenue || 1;
                    const percentage = (product.revenue / maxRevenue) * 100;
                    
                    return (
                      <div key={index} className="group">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-white">{index + 1}</span>
                            </div>
                            <span className={`font-semibold truncate ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.heading } : undefined}>{product.product_name}</span>
                            {product.product_category && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${!t ? 'text-gray-400 bg-gray-50' : ''}`} style={t ? { color: t.muted, background: t.badgeBg || 'transparent' } : undefined}>{product.product_category}</span>
                            )}
                          </div>
                          <div className="text-right ml-2 flex items-center gap-2">
                            <span className={`font-bold text-xs ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.secondary } : undefined}>{formatCurrency(product.revenue, salesStats.currency)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${!t ? 'text-gray-400 bg-gray-50' : ''}`} style={t ? { color: t.muted, background: t.badgeBg || 'transparent' } : undefined}>{product.units_sold} uds</span>
                          </div>
                        </div>
                        <div className={`w-full rounded-full h-1.5 overflow-hidden ${!t ? 'bg-gray-50' : ''}`} style={t ? { background: t.barTrack || 'rgba(255,255,255,0.06)' } : undefined}>
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
              <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-500 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-300/30' : 'hover:shadow-xl'}`} style={cardStyle()}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                    <ShoppingCart className="w-4 h-4 text-white" />
                  </div>
                  <h3 className={`text-base font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Ventas Recientes</h3>
                </div>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {salesStats.recent_sales.slice(0, 10).map((sale: SaleEntry) => (
                    <div key={sale.id} className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${!t ? 'hover:bg-gray-100/80' : ''}`}
                      onMouseEnter={(e) => { if (t && t.rowHover) (e.currentTarget as HTMLDivElement).style.background = t.rowHover; }}
                      onMouseLeave={(e) => { if (t) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.heading } : undefined}>{sale.product_name}</p>
                        <div className={`flex items-center gap-1.5 text-[11px] mt-0.5 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>
                          {sale.customer_name && <span>{sale.customer_name}</span>}
                          {sale.customer_phone && <span>· {sale.customer_phone}</span>}
                          <span>· {sale.quantity}x</span>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className={`text-sm font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.value } : undefined}>{sale.formatted_total}</p>
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
            <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-all duration-500 ${!t ? 'bg-white border-gray-200/80 shadow-sm hover:shadow-xl hover:shadow-gray-300/30' : 'hover:shadow-xl'}`} style={cardStyle()}>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className={`text-base font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.heading } : undefined}>Ingresos por Día</h3>
              </div>
              <div className="flex items-end justify-between gap-1 h-40">
                {salesStats.daily_sales.map((day: DailySale, index: number) => {
                  const maxRevenue = Math.max(...salesStats.daily_sales.map((d: DailySale) => d.revenue), 1);
                  const height = (day.revenue / maxRevenue) * 100;
                  const dateLabel = new Date(day.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className={`w-full rounded-md transition-all cursor-pointer relative group ${
                          day.revenue > 0
                            ? 'bg-gradient-to-t from-emerald-500 to-green-300 hover:from-emerald-600 hover:to-green-400'
                            : ''
                        }`}
                        style={{ height: `${Math.max(height, day.revenue > 0 ? 6 : 2)}%`, ...(day.revenue === 0 ? { background: t?.emptyBar || undefined } : {}) }}
                      >
                        {day.revenue > 0 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {formatCurrency(day.revenue, salesStats.currency)} · {day.count} ventas
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] mt-1.5 truncate w-full text-center ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.muted } : undefined}>{dateLabel}</span>
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
    </>
  );
};

export default MetricsDashboard;
