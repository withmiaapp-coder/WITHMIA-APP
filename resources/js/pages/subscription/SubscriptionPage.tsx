// SubscriptionPage – v6.0 — WITHMIA 1.0.5 (4-tier + international + Smart Fields recurring)
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CreditCard,
  Check,
  Users,
  Zap,
  Crown,
  Shield,
  Clock,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Sparkles,
  MessageCircle,
  Bot,
  Globe,
  Headphones,
  BarChart3,
  FileText,
  Loader,
  X,
  Gift,
  Lock,
  UserPlus,
  Mail,
  Trash2,
  ArrowUpRight,
  Calendar,
  Star,
  TrendingUp,
  Building2,
  Rocket,
  MapPin,
  Repeat,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import DLocalSmartFields from '@/components/DLocalSmartFields';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
interface Subscription {
  id: number;
  plan_name: string;
  price?: number;
  billing_cycle: 'monthly' | 'annual';
  max_agents?: number;
  status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trialing';
  starts_at: string;
  ends_at: string | null;
  trial_ends_at?: string | null;
  features?: Record<string, unknown> | null;
  payment_info?: {
    payment_method?: string;
    last_four?: string;
    card_brand?: string;
  } | null;
}

interface BillingInfo {
  subscription: Subscription | null;
  team_count: number;
  base_price: number;
  per_member_price?: number;
  per_member?: number;
  total_price: number;
  trial_days_remaining?: number | null;
  is_trial?: boolean;
  is_active?: boolean;
  plan?: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string;
}

interface TeamInvitation {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  created_at: string;
  expires_at?: string;
}

/* ═══════════════════════════════════════════
   PLAN DATA (4 tiers)
   ═══════════════════════════════════════════ */
interface PlanDef {
  id: string;
  name: string;
  subtitle: string;
  icon: typeof Zap;
  priceMonthly: number;
  priceAnnual: number;
  aiMessages: string;
  channels: string;
  members: string;
  models: string;
  knowledge: string;
  workflows: string;
  support: string;
  analytics: string;
  highlighted?: boolean;
  badge?: string;
  flowPlanKey?: string;
}

const PLANS: PlanDef[] = [
  {
    id: 'free', name: 'Gratis', subtitle: 'Para explorar', icon: Zap,
    priceMonthly: 0, priceAnnual: 0,
    aiMessages: '500', channels: 'Solo WhatsApp', members: '1',
    models: 'Básico', knowledge: '—', workflows: '—',
    support: 'Comunidad', analytics: 'Básicas',
  },
  {
    id: 'pro', name: 'Pro', subtitle: 'Para emprendedores', icon: Rocket,
    priceMonthly: 24990, priceAnnual: 254990,
    aiMessages: '2.000', channels: '5 canales', members: '1 + extras',
    models: 'GPT-4o-mini, GPT-4o', knowledge: '10 documentos', workflows: '3',
    support: 'Email', analytics: 'Completas',
    highlighted: true, badge: 'Popular',
    flowPlanKey: 'pro',
  },
  {
    id: 'business', name: 'Business', subtitle: 'Para pymes', icon: Building2,
    priceMonthly: 44990, priceAnnual: 459990,
    aiMessages: '8.000', channels: '5 canales + API', members: '3 + extras',
    models: 'GPT-4o, Claude', knowledge: '50 documentos', workflows: '10',
    support: 'Prioritario', analytics: 'Completas + exportación',
    flowPlanKey: 'business',
  },
  {
    id: 'enterprise', name: 'Enterprise', subtitle: 'Para empresas', icon: Crown,
    priceMonthly: 149990, priceAnnual: 1529990,
    aiMessages: '25.000', channels: 'Todos + custom', members: '10 + extras',
    models: 'Todos + fine-tuning', knowledge: 'Ilimitados', workflows: 'Ilimitados',
    support: 'CSM dedicado', analytics: 'Completas + API',
    flowPlanKey: 'enterprise',
  },
];

const PLAN_FEATURES = [
  { label: 'Mensajes IA/mes', key: 'aiMessages' as const },
  { label: 'Canales', key: 'channels' as const },
  { label: 'Miembros', key: 'members' as const },
  { label: 'Modelos IA', key: 'models' as const },
  { label: 'Base de conocimiento', key: 'knowledge' as const },
  { label: 'Workflows', key: 'workflows' as const },
  { label: 'Analíticas', key: 'analytics' as const },
  { label: 'Soporte', key: 'support' as const },
];

const PRO_HIGHLIGHTS = [
  { icon: Bot, text: 'IA 2.000 msgs/mes' },
  { icon: Globe, text: 'Omnicanal completo' },
  { icon: Sparkles, text: 'GPT-4o-mini + GPT-4o' },
  { icon: FileText, text: 'Base de conocimiento' },
  { icon: BarChart3, text: 'Analíticas' },
  { icon: Users, text: 'Multi-agente' },
  { icon: Headphones, text: 'Soporte email' },
  { icon: Shield, text: 'Seguridad empresarial' },
];

interface AiUsageStats {
  messages_used: number;
  messages_limit: number;
  remaining: number;
  percentage: number;
  has_reached_limit: boolean;
  period: string;
  overage_enabled: boolean;
  overage_messages: number;
  overage_packs: number;
  overage_cost_clp: number;
  overage_price_per_pack: number;
}

interface LocationInfo {
  country_code: string;
  country_name: string;
  currency: string;
  currency_name: string;
  gateway: 'flow' | 'dlocal';
  is_chile: boolean;
  smart_fields: boolean;
  document_required: {
    type: string;
    label: string;
    pattern: string;
    placeholder: string;
    mask: string | null;
  } | null;
  local_pricing: Record<string, {
    plan: string;
    currency: string;
    monthly: number;
    annual: number;
    per_member_monthly: number;
    per_member_annual: number;
    overage_per_1000: number;
    exchange_rate: number;
  }> | null;
}

/* Currency symbols for display */
const CURRENCY_SYMBOLS: Record<string, string> = {
  CLP: '$', BRL: 'R$', MXN: '$', ARS: '$', COP: '$', PEN: 'S/',
  UYU: '$', PYG: '₲', BOB: 'Bs', CRC: '₡', GTQ: 'Q', HNL: 'L',
  NIO: 'C$', DOP: 'RD$', USD: 'US$', CAD: 'CA$',
};

const ZERO_DECIMAL_CURRENCIES = ['CLP', 'PYG', 'COP'];

const FAQ_ITEMS = [
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, puedes cancelar tu suscripción cuando quieras. Mantendrás el acceso hasta el final del período de facturación.' },
  { q: '¿Qué métodos de pago aceptan?', a: 'En Chile aceptamos tarjetas de crédito/débito y transferencia bancaria vía Flow.cl. Para pagos internacionales, aceptamos tarjetas de crédito/débito con renovación automática vía dLocal Smart Fields. También PIX (Brasil), OXXO (México) y más métodos locales.' },
  { q: '¿Qué pasa si agrego más miembros al equipo?', a: 'Se cobra un adicional de $10.500/mes (o $107.100/año) por cada miembro extra. El cobro se gestiona automáticamente al invitar desde la sección de equipo.' },
  { q: '¿Qué pasa si excedo mis mensajes IA?', a: 'Puedes continuar enviando mensajes — se cobran como packs extra de 1.000 mensajes a $5.990 CLP cada uno. También puedes comprar packs anticipadamente o subir de plan para obtener más capacidad.' },
  { q: '¿Hay algún contrato o permanencia mínima?', a: 'No, no hay contratos ni permanencia mínima. Pagas mes a mes o año a año, sin compromiso.' },
  { q: '¿Los precios incluyen IVA?', a: 'Sí. Todos los precios publicados en CLP incluyen IVA (19%). Para pagos internacionales, los impuestos locales pueden aplicar según tu país.' },
  { q: '¿Puedo pagar desde otro país?', a: 'Sí. WITHMIA detecta automáticamente tu país y te muestra los precios convertidos a tu moneda local. Si pagas con tarjeta de crédito/débito, tu suscripción se renueva automáticamente cada período. Soportamos más de 15 monedas latinoamericanas.' },
];

function formatCLP(n: number): string {
  return n.toLocaleString('es-CL');
}

function formatLocalPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  if (ZERO_DECIMAL_CURRENCIES.includes(currency) || currency === 'PYG') {
    return `${symbol}${Math.round(amount).toLocaleString('es-CL')}`;
  }
  return `${symbol}${amount.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/* ═══════════════════════════════════════════
   SUBSCRIPTION PAGE
   ═══════════════════════════════════════════ */
export default function SubscriptionPage() {
  const { hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      textPrimary: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      cardBg: 'var(--theme-content-card-bg)',
      cardBorder: isDark ? 'var(--theme-content-card-border)' : 'rgba(0,0,0,0.08)',
      contentBg: 'var(--theme-content-bg)',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      inputBorder: isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
      subtleBg: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
    };
  }, [hasTheme, isDark]);

  // ── State ──
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [subscribing, setSubscribing] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [showReferral, setShowReferral] = useState(false);
  const isAutoTriggered = useRef(false);

  // Team state
  const [agents, setAgents] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'agent' | 'administrator'>('agent');
  const [inviting, setInviting] = useState(false);

  // AI usage state
  const [aiUsage, setAiUsage] = useState<AiUsageStats | null>(null);

  // International location state
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const isInternational = location !== null && !location.is_chile;
  const hasSmartFields = isInternational && location?.smart_fields === true;

  // Smart Fields card form state (for international recurring)
  const [showSmartFields, setShowSmartFields] = useState(false);
  const [smartFieldsPlan, setSmartFieldsPlan] = useState('pro');

  // Pricing (CLP – IVA incluido)
  const BASE_MONTHLY = 24990;
  const BASE_ANNUAL = 254990;
  const MEMBER_MONTHLY = 10500;
  const MEMBER_ANNUAL = 107100;

  const basePrice = billingCycle === 'monthly' ? BASE_MONTHLY : BASE_ANNUAL;
  const perMemberPrice = billingCycle === 'monthly' ? MEMBER_MONTHLY : MEMBER_ANNUAL;

  const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  // ── Fetch billing ──
  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription', {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
      });
      if (res.ok) {
        const data = await res.json();
        setBilling(data);
        if (data.subscription?.billing_cycle) setBillingCycle(data.subscription.billing_cycle);
      }
    } catch (err) { console.error('Error fetching billing:', err); }
    finally { setLoading(false); }
  }, []);

  // ── Fetch team ──
  const fetchTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf() };
      const [aRes, iRes] = await Promise.all([
        fetch('/api/chatwoot-proxy/agents', { credentials: 'include', headers: h }),
        fetch('/api/chatwoot-proxy/invitations', { credentials: 'include', headers: h }),
      ]);
      if (aRes.ok) { const d = await aRes.json(); setAgents(Array.isArray(d) ? d : (d?.data || [])); }
      if (iRes.ok) { const d = await iRes.json(); setInvitations(Array.isArray(d?.data) ? d.data : []); }
    } catch (err) { console.error('Error fetching team:', err); }
    finally { setLoadingTeam(false); }
  }, []);

  useEffect(() => { fetchBilling(); fetchTeam(); }, [fetchBilling, fetchTeam]);

  // ── Detect user location (country, currency, gateway) ──
  const fetchLocation = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription/detect-location', {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
      });
      if (res.ok) {
        const data: LocationInfo = await res.json();
        setLocation(data);
      }
    } catch (err) { console.error('Error detecting location:', err); }
  }, []);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  // ── Fetch AI usage ──
  const fetchAiUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription/usage', {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
      });
      if (res.ok) setAiUsage(await res.json());
    } catch (err) { console.error('Error fetching AI usage:', err); }
  }, []);

  useEffect(() => { fetchAiUsage(); }, [fetchAiUsage]);

  // Auto-subscribe from ?plan= param
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('plan');
    if (p && ['pro-monthly', 'pro-annual', 'business-monthly', 'business-annual', 'enterprise-monthly', 'enterprise-annual'].includes(p) && !isAutoTriggered.current) {
      isAutoTriggered.current = true;
      const cycle = p.endsWith('-annual') ? 'annual' : 'monthly';
      const planId = p.replace(/-monthly$|-annual$/, '');
      setBillingCycle(cycle);
      setTimeout(() => handleSubscribeWithCycle(cycle, planId), 800);
      const url = new URL(window.location.href); url.searchParams.delete('plan');
      window.history.replaceState({}, '', url.toString());
    }
  }, [billing]);

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubscribe = (planId = 'pro') => handleSubscribeWithCycle(billingCycle, planId);

  const handleSubscribeWithCycle = async (cycle: 'monthly' | 'annual', planId = 'pro') => {
    // International users with Smart Fields → show inline card form
    if (hasSmartFields && planId !== 'free') {
      setSmartFieldsPlan(planId);
      setBillingCycle(cycle);
      setShowSmartFields(true);
      return;
    }

    // Chilean users or fallback → redirect-based checkout
    setSubscribing(true);
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ billing_cycle: cycle, plan: planId }),
      });
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
      else if (data.message) showNotif('error', data.message);
    } catch { showNotif('error', 'Error al procesar. Intenta de nuevo.'); }
    finally { setSubscribing(false); }
  };

  const handlePortal = async () => {
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST', credentials: 'include',
        headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
      });
      const data = await res.json();
      if (data.portal_url) window.open(data.portal_url, '_blank');
    } catch { showNotif('error', 'Error al abrir el portal de pagos'); }
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return;
    setApplyingReferral(true);
    try {
      const res = await fetch('/api/subscription/referral', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ code: referralCode }),
      });
      const data = await res.json();
      if (res.ok) { showNotif('success', data.message || 'Código aplicado'); setReferralCode(''); fetchBilling(); }
      else showNotif('error', data.message || 'Código inválido');
    } catch { showNotif('error', 'Error al aplicar código'); }
    finally { setApplyingReferral(false); }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch('/api/subscription/checkout-member', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() || undefined, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al procesar');
      if (data.checkout_url) { window.location.href = data.checkout_url; return; }
      throw new Error('No se obtuvo URL de pago');
    } catch (err: unknown) {
      showNotif('error', err instanceof Error ? err.message : 'Error al invitar');
    } finally { setInviting(false); }
  };

  const handleCancelInvitation = async (id: number) => {
    try {
      await fetch(`/api/chatwoot-proxy/invitations/${id}`, {
        method: 'DELETE', credentials: 'include',
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf() },
      });
      fetchTeam();
    } catch { showNotif('error', 'Error al cancelar invitación'); }
  };

  // ── Derived ──
  const sub = billing?.subscription;
  const isActive = sub?.status === 'active' || billing?.is_active;
  const isTrial = billing?.is_trial || sub?.status === 'trialing';
  const teamCount = billing?.team_count || 1;
  const extraMembers = Math.max(0, teamCount - 1);
  const totalCost = basePrice + (extraMembers * perMemberPrice);
  const pending = invitations.filter(i => i.status === 'pending');

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className={`w-8 h-8 animate-spin ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ════════════════════════════════════════════════════════
           HEADER
           ════════════════════════════════════════════════════════ */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${!t ? 'text-neutral-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
              Planes y facturación
            </h1>
            <p className={`text-sm mt-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
              Gestiona tu suscripción, equipo y método de pago.
            </p>
          </div>
          {isActive && (
            <button
              onClick={handlePortal}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${!t ? 'border-neutral-200 text-neutral-700 hover:bg-neutral-50' : 'hover:opacity-80'}`}
              style={t ? { border: `1px solid ${t.cardBorder}`, color: t.textPrimary } : undefined}
            >
              <ExternalLink className="w-4 h-4" />
              Portal de pagos
            </button>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           CURRENT PLAN CARD
           ════════════════════════════════════════════════════════ */}
        <div
          className={`rounded-2xl overflow-hidden ${!t ? 'bg-white border border-neutral-200 shadow-sm' : ''}`}
          style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
        >
          {/* ── Banner top ── */}
          <div
            className={`px-6 py-5 flex items-center justify-between flex-wrap gap-4 ${
              isActive
                ? (!t ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600' : '')
                : (!t ? 'bg-gradient-to-r from-neutral-800 to-neutral-700' : '')
            }`}
            style={t ? {
              background: isActive
                ? `linear-gradient(135deg, ${t.accent}, color-mix(in srgb, ${t.accent} 70%, #7c3aed))`
                : (isDark ? 'rgba(255,255,255,0.06)' : '#1e293b'),
            } : undefined}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                {isActive ? <Crown className="w-6 h-6 text-white" /> : <Zap className="w-6 h-6 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white">
                    {isActive ? `WITHMIA ${sub?.plan_name || 'Pro'}` : isTrial ? 'Prueba gratuita' : 'Plan Gratuito'}
                  </h2>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    isActive ? 'bg-emerald-400/25 text-emerald-100' : isTrial ? 'bg-amber-400/25 text-amber-100' : 'bg-white/15 text-white/70'
                  }`}>
                    {isActive ? 'Activo' : isTrial ? 'Trial' : 'Free'}
                  </span>
                </div>
                <p className="text-sm text-white/70 mt-0.5">
                  {isActive && sub
                    ? `$${formatCLP(sub.price || basePrice)} CLP/${sub.billing_cycle === 'monthly' ? 'mes' : 'año'}${extraMembers > 0 ? ` · ${teamCount} miembros` : ''}`
                    : isTrial && billing?.trial_days_remaining != null
                      ? `${billing.trial_days_remaining} días restantes de prueba`
                      : 'Sin costo · funcionalidades limitadas'
                  }
                </p>
              </div>
            </div>

            {!isActive && (
              <button
                onClick={() => handleSubscribe()}
                disabled={subscribing}
                className="px-5 py-2.5 bg-white text-neutral-900 font-semibold text-sm rounded-lg hover:bg-white/90 transition-all shadow-lg disabled:opacity-60 flex items-center gap-2"
              >
                {subscribing ? <Loader className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                Actualizar a Pro
              </button>
            )}
          </div>

          {/* ── Body ── */}
          <div className="p-6">
            {isActive ? (
              /* Active: stat cards + AI usage */
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <StatCard
                    icon={Calendar} label="Facturación" t={t} isDark={isDark}
                    value={sub?.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}
                    sub={sub?.ends_at ? `Próxima: ${formatDate(sub.ends_at)}` : sub?.starts_at ? `Desde: ${formatDate(sub.starts_at)}` : undefined}
                  />
                  <StatCard
                    icon={Users} label="Equipo" t={t} isDark={isDark}
                    value={`${teamCount} ${teamCount === 1 ? 'miembro' : 'miembros'}`}
                    sub={extraMembers > 0 ? `1 incluido + ${extraMembers} extra${extraMembers > 1 ? 's' : ''}` : '1 miembro incluido'}
                  />
                  <StatCard
                    icon={CreditCard} label="Total" t={t} isDark={isDark}
                    value={`$${formatCLP(totalCost)} CLP`}
                    sub={extraMembers > 0 ? `$${formatCLP(basePrice)} base + $${formatCLP(extraMembers * perMemberPrice)} extras` : `/${billingCycle === 'monthly' ? 'mes' : 'año'}`}
                  />
                </div>

                {/* AI Usage Bar */}
                {aiUsage && (
                  <div className={`p-4 rounded-xl ${!t ? 'bg-neutral-50' : ''}`} style={t ? { background: t.subtleBg } : undefined}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bot className={`w-4 h-4 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                          Mensajes IA — {aiUsage.period}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${aiUsage.percentage >= 90 ? 'text-red-500' : aiUsage.percentage >= 70 ? 'text-amber-500' : (!t ? 'text-neutral-500' : '')}`}
                        style={aiUsage.percentage < 70 && t ? { color: t.textSec } : undefined}
                      >
                        {aiUsage.messages_used.toLocaleString('es-CL')} / {aiUsage.messages_limit.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${!t ? 'bg-neutral-200' : ''}`}
                      style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' } : undefined}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          aiUsage.percentage >= 90 ? 'bg-red-500' : aiUsage.percentage >= 70 ? 'bg-amber-500' : (!t ? 'bg-indigo-500' : '')
                        }`}
                        style={{
                          width: `${Math.min(aiUsage.percentage, 100)}%`,
                          ...(aiUsage.percentage < 70 && t ? { background: t.accent } : {}),
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-xs ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                        {aiUsage.remaining > 0
                          ? `${aiUsage.remaining.toLocaleString('es-CL')} restantes`
                          : aiUsage.overage_enabled
                            ? `${aiUsage.overage_messages.toLocaleString('es-CL')} msgs de overage`
                            : 'Sin mensajes restantes'
                        }
                      </span>
                      {aiUsage.has_reached_limit && !aiUsage.overage_enabled && (
                        <span className="text-xs font-medium text-red-500">Límite alcanzado — el bot no responderá</span>
                      )}
                    </div>

                    {/* Overage info */}
                    {aiUsage.overage_enabled && aiUsage.overage_messages > 0 && (
                      <div className={`mt-3 p-3 rounded-lg border ${!t ? 'border-amber-200 bg-amber-50' : 'border-amber-500/20'}`}
                        style={t ? { background: isDark ? 'rgba(245,158,11,0.08)' : 'rgb(255,251,235)' } : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-amber-700">
                              Overage: {aiUsage.overage_packs} pack{aiUsage.overage_packs > 1 ? 's' : ''} extra ({aiUsage.overage_messages.toLocaleString('es-CL')} msgs)
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                              Costo adicional: ${aiUsage.overage_cost_clp.toLocaleString('es-CL')} CLP
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Buy overage packs */}
                    {aiUsage.overage_enabled && aiUsage.percentage >= 80 && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/subscription/purchase-overage', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '') },
                              credentials: 'include',
                              body: JSON.stringify({ packs: 1 }),
                            });
                            const data = await res.json();
                            if (data.checkout_url) window.location.href = data.checkout_url;
                          } catch { /* ignore */ }
                        }}
                        className={`mt-3 w-full py-2 px-4 rounded-lg text-xs font-medium transition-colors ${
                          !t ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : ''
                        }`}
                        style={t ? { background: isDark ? 'rgba(245,158,11,0.15)' : 'rgb(254,243,199)', color: '#92400e' } : undefined}
                      >
                        Comprar pack extra — 1.000 msgs por ${aiUsage.overage_price_per_pack?.toLocaleString('es-CL') || '5.990'} CLP
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Free: 4-tier pricing grid + upgrade CTA */
              <div>
                {/* International banner */}
                {isInternational && location && (
                  <div className={`flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg text-xs ${!t ? 'bg-blue-50 text-blue-800 border border-blue-200' : ''}`}
                    style={t ? { background: isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff', color: isDark ? '#93c5fd' : '#1e40af', border: `1px solid ${isDark ? 'rgba(59,130,246,0.25)' : '#bfdbfe'}` } : undefined}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Detectamos que estás en <strong>{location.country_name}</strong>. Los precios se muestran en <strong>{location.currency_name} ({location.currency})</strong> al tipo de cambio actual.
                      {hasSmartFields ? ' Paga con tarjeta y tu suscripción se renueva automáticamente.' : ' Pagos procesados por dLocal.'}
                    </span>
                  </div>
                )}

                {/* Toggle */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? (!t ? 'text-neutral-800' : '') : (!t ? 'text-neutral-400' : '')}`}
                    style={t ? { color: billingCycle === 'monthly' ? t.textPrimary : t.textMuted } : undefined}
                  >Mensual</span>
                  <button
                    onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
                    className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
                    style={{ background: billingCycle === 'annual' ? (t ? t.accent : '#6366f1') : (isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db') }}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${billingCycle === 'annual' ? 'translate-x-5' : ''}`} />
                  </button>
                  <span className={`text-sm font-medium transition-colors ${billingCycle === 'annual' ? (!t ? 'text-neutral-800' : '') : (!t ? 'text-neutral-400' : '')}`}
                    style={t ? { color: billingCycle === 'annual' ? t.textPrimary : t.textMuted } : undefined}
                  >Anual</span>
                  {billingCycle === 'annual' && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Ahorra 15%</span>
                  )}
                </div>

                {/* 4-tier cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {PLANS.map((plan) => {
                    const PlanIcon = plan.icon;
                    const monthlyDisplay = billingCycle === 'annual' && plan.priceAnnual > 0
                      ? Math.round(plan.priceAnnual / 12)
                      : plan.priceMonthly;

                    // International pricing — show local currency
                    const localPricing = isInternational && location?.local_pricing?.[plan.id];
                    const localMonthly = localPricing
                      ? (billingCycle === 'annual' && localPricing.annual > 0 ? Math.round(localPricing.annual / 12) : localPricing.monthly)
                      : null;
                    const localAnnual = localPricing ? localPricing.annual : null;
                    const localCur = location?.currency || 'CLP';

                    const isCurrentFree = plan.id === 'free';
                    const isHighlighted = plan.highlighted;

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl p-5 border relative flex flex-col ${
                          isHighlighted
                            ? (!t ? 'border-indigo-500 border-2 bg-white shadow-lg shadow-indigo-100/60' : '')
                            : isCurrentFree
                              ? (!t ? 'border-neutral-200 bg-neutral-50/60' : '')
                              : (!t ? 'border-neutral-200 bg-white' : '')
                        }`}
                        style={t ? {
                          border: isHighlighted ? `2px solid ${t.accent}` : `1px solid ${t.cardBorder}`,
                          background: isCurrentFree ? t.subtleBg : (isDark ? 'rgba(0,0,0,0.3)' : '#fff'),
                          ...(isHighlighted ? { boxShadow: `0 8px 30px -8px color-mix(in srgb, ${t.accent} 18%, transparent)` } : {}),
                        } : undefined}
                      >
                        {plan.badge && (
                          <div className="absolute -top-3 right-4">
                            <span className="px-3 py-1 bg-amber-400 text-amber-900 text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm">
                              {plan.badge}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-1">
                          <PlanIcon className={`w-4 h-4 ${isHighlighted ? (!t ? 'text-indigo-500' : '') : (!t ? 'text-neutral-400' : '')}`}
                            style={t ? { color: isHighlighted ? t.accent : t.textMuted } : undefined}
                          />
                          <p className={`text-[11px] font-semibold uppercase tracking-wider ${isHighlighted ? (!t ? 'text-indigo-500' : '') : (!t ? 'text-neutral-400' : '')}`}
                            style={t ? { color: isHighlighted ? t.accent : t.textMuted } : undefined}
                          >
                            {plan.name}
                          </p>
                        </div>

                        <p className={`text-xs mb-2 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                          {plan.subtitle}
                        </p>

                        <div className="mb-3">
                          {isInternational && localMonthly !== null && localMonthly > 0 ? (
                            <>
                              <span className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                                {formatLocalPrice(localMonthly, localCur)}
                              </span>
                              <span className={`text-sm font-normal ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}> /mes</span>
                              <p className={`text-[10px] ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                                ≈ ${formatCLP(monthlyDisplay)} CLP
                              </p>
                              {billingCycle === 'annual' && localAnnual !== null && localAnnual > 0 && (
                                <p className={`text-[11px] ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                                  {formatLocalPrice(localAnnual, localCur)} facturado al año
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <span className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                                {monthlyDisplay === 0 ? '$0' : `$${formatCLP(monthlyDisplay)}`}
                              </span>
                              <span className={`text-sm font-normal ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}> /mes</span>
                              {billingCycle === 'annual' && plan.priceAnnual > 0 && (
                                <p className={`text-[11px] ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                                  ${formatCLP(plan.priceAnnual)} facturado al año
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div className="space-y-2 flex-1">
                          {PLAN_FEATURES.map((feat) => {
                            const val = plan[feat.key];
                            const disabled = val === '—';
                            return (
                              <div key={feat.key} className="flex items-start gap-2">
                                {disabled
                                  ? <X className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${!t ? 'text-neutral-300' : ''}`} style={t ? { color: isDark ? '#475569' : '#cbd5e1' } : undefined} />
                                  : <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isHighlighted ? (!t ? 'text-indigo-500' : '') : 'text-emerald-500'}`}
                                      style={isHighlighted && t ? { color: t.accent } : undefined}
                                    />
                                }
                                <span className={`text-xs ${disabled ? (!t ? 'text-neutral-400' : '') : (!t ? 'text-neutral-600' : '')}`}
                                  style={t ? { color: disabled ? t.textMuted : t.textSec } : undefined}
                                >
                                  {feat.label} <span className="opacity-60">· {val}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {isCurrentFree ? (
                          <div className={`mt-4 py-2.5 text-center text-xs font-medium rounded-lg ${!t ? 'bg-neutral-100 text-neutral-400' : ''}`}
                            style={t ? { background: t.subtleBg, color: t.textMuted } : undefined}
                          >
                            Plan actual
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={subscribing}
                            className={`w-full mt-4 py-2.5 text-sm rounded-lg font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
                              isHighlighted
                                ? (!t ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' : 'text-white hover:opacity-90')
                                : (!t ? 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50' : 'hover:opacity-80')
                            }`}
                            style={t ? (isHighlighted
                              ? { background: t.accent }
                              : { border: `1px solid ${t.cardBorder}`, color: t.textPrimary }
                            ) : undefined}
                          >
                            {subscribing ? <Loader className="w-4 h-4 animate-spin" /> : null}
                            {plan.id === 'enterprise' ? 'Contactar ventas' : `Elegir ${plan.name}`}
                            {!subscribing && <ArrowUpRight className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Active plan features pills */}
          {isActive && (
            <div className="px-6 pb-5">
              <p className={`text-xs font-medium mb-2.5 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>Incluido en tu plan:</p>
              <div className="flex flex-wrap gap-2">
                {PRO_HIGHLIGHTS.map((f, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${!t ? 'bg-indigo-50 text-indigo-700' : ''}`}
                    style={t ? { background: isDark ? 'rgba(255,255,255,0.06)' : t.accentLight, color: t.accent } : undefined}
                  >
                    <f.icon className="w-3 h-3" /> {f.text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           TEAM MEMBERS SECTION
           ════════════════════════════════════════════════════════ */}
        <div
          className={`rounded-2xl overflow-hidden ${!t ? 'bg-white border border-neutral-200 shadow-sm' : ''}`}
          style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
        >
          {/* Header */}
          <div className={`px-6 py-4 flex items-center justify-between border-b ${!t ? 'border-neutral-100' : ''}`}
            style={t ? { borderColor: t.cardBorder } : undefined}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${!t ? 'bg-indigo-50' : ''}`}
                style={t ? { background: isDark ? 'rgba(255,255,255,0.06)' : t.accentLight } : undefined}
              >
                <Users className={`w-4.5 h-4.5 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                  Equipo
                </h3>
                <p className={`text-xs ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  {teamCount} {teamCount === 1 ? 'miembro' : 'miembros'}
                  {pending.length > 0 && ` · ${pending.length} pendiente${pending.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            {isActive && (
              <button
                onClick={() => setShowInviteForm(v => !v)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                  showInviteForm
                    ? (!t ? 'bg-neutral-100 text-neutral-500' : '')
                    : (!t ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : '')
                }`}
                style={t ? {
                  background: showInviteForm ? t.subtleBg : (isDark ? 'rgba(255,255,255,0.06)' : t.accentLight),
                  color: showInviteForm ? t.textMuted : t.accent,
                } : undefined}
              >
                {showInviteForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {showInviteForm ? 'Cancelar' : 'Invitar'}
              </button>
            )}
          </div>

          {/* Invite form */}
          {showInviteForm && isActive && (
            <div className={`px-6 py-4 border-b ${!t ? 'bg-neutral-50/80 border-neutral-100' : ''}`}
              style={t ? { borderColor: t.cardBorder, background: t.subtleBg } : undefined}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none ${!t ? 'border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400' : 'placeholder:opacity-50'}`}
                  style={t ? { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary } : undefined}
                />
                <input
                  type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className={`w-full sm:w-40 px-3 py-2 rounded-lg text-sm focus:outline-none ${!t ? 'border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400' : 'placeholder:opacity-50'}`}
                  style={t ? { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary } : undefined}
                />
                <select
                  value={inviteRole} onChange={e => setInviteRole(e.target.value as 'agent' | 'administrator')}
                  className={`w-full sm:w-36 px-3 py-2 rounded-lg text-sm focus:outline-none ${!t ? 'border border-neutral-200 bg-white text-neutral-800' : ''}`}
                  style={t ? { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary } : undefined}
                >
                  <option value="agent">Agente</option>
                  <option value="administrator">Admin</option>
                </select>
                <button
                  onClick={handleInviteMember} disabled={inviting || !inviteEmail.trim()}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap ${!t ? 'bg-indigo-600 hover:bg-indigo-700' : 'hover:opacity-90'}`}
                  style={t ? { background: t.accent } : undefined}
                >
                  {inviting ? <Loader className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Pagar e invitar
                </button>
              </div>
              <p className={`text-[11px] mt-2 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                Cada miembro adicional: ${formatCLP(MEMBER_MONTHLY)}/mes o ${formatCLP(MEMBER_ANNUAL)}/año. Se redirige a Flow.cl para el pago.
              </p>
            </div>
          )}

          {/* Not active: lock */}
          {!isActive && (
            <div className="px-6 py-5 flex items-center gap-3">
              <Lock className={`w-4 h-4 ${!t ? 'text-neutral-300' : ''}`} style={t ? { color: t.textMuted } : undefined} />
              <p className={`text-sm ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                La gestión de equipo está disponible en WITHMIA Pro.
              </p>
            </div>
          )}

          {/* Members list */}
          {isActive && (
            <div>
              {loadingTeam ? (
                <div className="px-6 py-8 flex justify-center">
                  <Loader className={`w-5 h-5 animate-spin ${!t ? 'text-neutral-300' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                </div>
              ) : (
                <>
                  {agents.map(agent => (
                    <div key={agent.id}
                      className={`px-6 py-3.5 flex items-center justify-between border-b last:border-b-0 ${!t ? 'border-neutral-100 hover:bg-neutral-50/60' : ''} transition-colors`}
                      style={t ? { borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' } : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${!t ? 'bg-gradient-to-br from-indigo-500 to-violet-500' : ''}`}
                          style={t ? { background: t.accent } : undefined}
                        >
                          {agent.avatar_url
                            ? <img src={agent.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            : (agent.name?.[0] || agent.email?.[0] || '?').toUpperCase()
                          }
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                            {agent.name || agent.email}
                          </p>
                          {agent.name && (
                            <p className={`text-xs truncate ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                              {agent.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        agent.role === 'administrator' ? 'bg-amber-100 text-amber-700' : (!t ? 'bg-neutral-100 text-neutral-500' : '')
                      }`}
                        style={agent.role !== 'administrator' && t ? { background: t.subtleBg, color: t.textMuted } : undefined}
                      >
                        {agent.role === 'administrator' ? 'Admin' : 'Agente'}
                      </span>
                    </div>
                  ))}

                  {/* Pending invitations */}
                  {pending.map(inv => (
                    <div key={inv.id}
                      className={`px-6 py-3.5 flex items-center justify-between border-b last:border-b-0 ${!t ? 'border-neutral-100' : ''}`}
                      style={t ? { borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' } : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-dashed shrink-0 ${!t ? 'border-neutral-300 bg-neutral-50' : ''}`}
                          style={t ? { borderColor: t.cardBorder, background: t.subtleBg } : undefined}
                        >
                          <Mail className={`w-3.5 h-3.5 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${!t ? 'text-neutral-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                            {inv.name || inv.email}
                          </p>
                          <p className="text-xs text-amber-500">
                            Pendiente · {formatDate(inv.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className={`p-1.5 rounded-lg transition-colors ${!t ? 'text-neutral-400 hover:text-red-500 hover:bg-red-50' : ''}`}
                        style={t ? { color: t.textMuted } : undefined}
                        title="Cancelar invitación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {agents.length === 0 && pending.length === 0 && (
                    <div className="px-6 py-8 text-center">
                      <Users className={`w-8 h-8 mx-auto mb-2 ${!t ? 'text-neutral-200' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                      <p className={`text-sm ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                        Invita a tu primer compañero de equipo.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           PAYMENT METHOD (active only)
           ════════════════════════════════════════════════════════ */}
        {isActive && (
          <div
            className={`rounded-2xl overflow-hidden ${!t ? 'bg-white border border-neutral-200 shadow-sm' : ''}`}
            style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
          >
            <div className={`px-6 py-4 flex items-center gap-3 border-b ${!t ? 'border-neutral-100' : ''}`}
              style={t ? { borderColor: t.cardBorder } : undefined}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${!t ? 'bg-emerald-50' : ''}`}
                style={t ? { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.08)' } : undefined}
              >
                <CreditCard className={`w-4.5 h-4.5 ${!t ? 'text-emerald-600' : ''}`} style={t ? { color: isDark ? '#34d399' : '#059669' } : undefined} />
              </div>
              <h3 className={`text-sm font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                Método de pago
              </h3>
            </div>
            <div className="p-6">
              {sub?.payment_info?.last_four ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-8 rounded-md flex items-center justify-center ${!t ? 'bg-gradient-to-br from-neutral-700 to-neutral-900' : ''}`}
                      style={t ? { background: isDark ? 'rgba(255,255,255,0.1)' : '#1e293b' } : undefined}
                    >
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                        {sub.payment_info.card_brand || 'Tarjeta'} •••• {sub.payment_info.last_four}
                      </p>
                      <p className={`text-xs ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                        Predeterminada
                      </p>
                    </div>
                  </div>
                  <button onClick={handlePortal}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${!t ? 'text-indigo-600 hover:bg-indigo-50' : ''}`}
                    style={t ? { color: t.accent } : undefined}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-8 rounded-md flex items-center justify-center ${!t ? 'bg-neutral-100' : ''}`}
                      style={t ? { background: t.subtleBg } : undefined}
                    >
                      <CreditCard className={`w-5 h-5 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${!t ? 'text-neutral-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                        Pagos gestionados por Flow.cl
                      </p>
                      <p className={`text-xs ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                        Tarjetas, transferencia y más
                      </p>
                    </div>
                  </div>
                  <button onClick={handlePortal}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${!t ? 'text-indigo-600 hover:bg-indigo-50' : ''}`}
                    style={t ? { color: t.accent } : undefined}
                  >
                    Gestionar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
           TRUST SIGNALS (free users)
           ════════════════════════════════════════════════════════ */}
        {!isActive && (
          <div className="flex flex-wrap items-center justify-center gap-6 py-1">
            {[
              { icon: Shield, label: 'Pagos seguros SSL' },
              { icon: RefreshCw, label: 'Cancela cuando quieras' },
              { icon: Clock, label: 'Sin contratos' },
              { icon: Lock, label: 'Datos encriptados' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon className={`w-4 h-4 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                <span className={`text-xs font-medium ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
           REFERRAL CODE
           ════════════════════════════════════════════════════════ */}
        <div>
          <button
            onClick={() => setShowReferral(v => !v)}
            className={`flex items-center gap-2 text-sm font-medium ${!t ? 'text-neutral-600 hover:text-neutral-800' : ''}`}
            style={t ? { color: t.textSec } : undefined}
          >
            <Gift className="w-4 h-4" />
            ¿Tienes un código de referido?
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showReferral ? 'rotate-180' : ''}`} />
          </button>
          {showReferral && (
            <div className="mt-3 flex gap-3 max-w-md">
              <input
                type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)}
                placeholder="Código de referido"
                className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none ${!t ? 'border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400' : 'placeholder:opacity-50'}`}
                style={t ? { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary } : undefined}
              />
              <button
                onClick={handleApplyReferral} disabled={applyingReferral || !referralCode.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${!t ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-white hover:opacity-90'}`}
                style={t ? { background: t.accent } : undefined}
              >
                {applyingReferral ? <Loader className="w-4 h-4 animate-spin" /> : 'Aplicar'}
              </button>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           FAQ
           ════════════════════════════════════════════════════════ */}
        <div>
          <h2 className={`text-lg font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
            Preguntas frecuentes
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}
                className={`rounded-xl overflow-hidden ${!t ? 'bg-white border border-neutral-200' : ''}`}
                style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
              >
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${!t ? 'text-neutral-400' : ''} ${faqOpen === i ? 'rotate-180' : ''}`}
                    style={t ? { color: t.textMuted } : undefined}
                  />
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-4">
                    <p className={`text-sm leading-relaxed ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
           FOOTER
           ════════════════════════════════════════════════════════ */}
        <div className="text-center pb-4">
          <p className={`text-xs ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@withmia.com" className={`font-medium hover:underline ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined}>
              soporte@withmia.com
            </a>
          </p>
        </div>
      </div>

      {/* ═══════ SMART FIELDS CARD FORM MODAL (International recurring) ═══════ */}
      {showSmartFields && t && location && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowSmartFields(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal header */}
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${t.accent}20` }}>
                    <CreditCard className="w-5 h-5" style={{ color: t.accent }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>
                      Suscribirse a {smartFieldsPlan.charAt(0).toUpperCase() + smartFieldsPlan.slice(1)}
                    </h3>
                    <p className="text-xs" style={{ color: t.textSec }}>
                      Pago recurrente con tarjeta · {location.country_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSmartFields(false)}
                  className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ color: t.textMuted }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Recurring badge */}
              <div className="flex items-center gap-2 mt-3 mb-4 px-3 py-2 rounded-lg text-xs"
                style={{ background: isDark ? 'rgba(139,92,246,0.12)' : '#f5f3ff', color: isDark ? '#c4b5fd' : '#6d28d9', border: `1px solid ${isDark ? 'rgba(139,92,246,0.25)' : '#ddd6fe'}` }}
              >
                <Repeat className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Tu tarjeta se guardará de forma segura para <strong>renovación automática</strong>. Puedes cancelar cuando quieras.
                </span>
              </div>
            </div>

            {/* Card form */}
            <div className="p-6 pt-2">
              <DLocalSmartFields
                plan={smartFieldsPlan}
                billingCycle={billingCycle}
                displayAmount={(() => {
                  const lp = location?.local_pricing?.[smartFieldsPlan];
                  if (lp) {
                    const amt = billingCycle === 'annual' ? lp.annual : lp.monthly;
                    return formatLocalPrice(amt, location.currency);
                  }
                  return '$0';
                })()}
                currency={location.currency}
                countryCode={location.country_code}
                isDark={isDark}
                themeColors={{
                  accent: t.accent,
                  cardBg: t.cardBg,
                  cardBorder: t.cardBorder,
                  textPrimary: t.textPrimary,
                  textSec: t.textSec,
                  inputBg: t.inputBg,
                  inputBorder: t.inputBorder,
                }}
                onSuccess={(result) => {
                  setShowSmartFields(false);
                  if (result.status === 'active') {
                    showNotif('success', `¡Suscripción activada! Renovación automática ${billingCycle === 'annual' ? 'anual' : 'mensual'}.`);
                    fetchBilling();
                  } else if (result.status === 'pending') {
                    showNotif('success', result.message || 'Pago en proceso. Te notificaremos cuando se confirme.');
                  }
                }}
                onError={(message) => {
                  showNotif('error', message);
                }}
                onLoadingChange={(loading) => setSubscribing(loading)}
              />

              {/* Option to use redirect checkout instead */}
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
                <button
                  onClick={() => {
                    setShowSmartFields(false);
                    setSubscribing(true);
                    fetch('/api/subscription/checkout', {
                      method: 'POST', credentials: 'include',
                      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
                      body: JSON.stringify({ billing_cycle: billingCycle, plan: smartFieldsPlan }),
                    })
                      .then(r => r.json())
                      .then(data => {
                        if (data.checkout_url) window.location.href = data.checkout_url;
                        else if (data.message) showNotif('error', data.message);
                      })
                      .catch(() => showNotif('error', 'Error al procesar.'))
                      .finally(() => setSubscribing(false));
                  }}
                  className="w-full text-center text-xs py-2 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ color: t.textMuted }}
                >
                  Prefiero pagar con otro método (PIX, OXXO, transferencia, etc.)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ NOTIFICATION TOAST ═══════ */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`px-5 py-3 rounded-lg shadow-2xl backdrop-blur-md border flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-green-50/95 border-green-200 text-green-800'
              : 'bg-red-50/95 border-red-200 text-red-800'
          }`}>
            <p className="font-medium text-sm">{notification.message}</p>
            <button onClick={() => setNotification(null)}>
              <X className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   STAT CARD COMPONENT
   ═══════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, sub, t, isDark }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  sub?: string;
  t: ReturnType<typeof useStatCardTheme> | null;
  isDark: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl ${!t ? 'bg-neutral-50' : ''}`} style={t ? { background: t.subtleBg } : undefined}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
          {label}
        </span>
      </div>
      <p className={`text-sm font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-0.5 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
          {sub}
        </p>
      )}
    </div>
  );
}

// Helper type for StatCard theme
function useStatCardTheme() {
  return null as unknown as {
    subtleBg: string; textMuted: string; textPrimary: string;
  };
}
