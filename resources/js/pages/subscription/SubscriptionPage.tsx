import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  Check,
  Users,
  Zap,
  Crown,
  Shield,
  Clock,
  AlertTriangle,
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
  Copy,
  Gift,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
interface Subscription {
  id: number;
  plan_name: string;
  price: number;
  billing_cycle: 'monthly' | 'annual';
  max_agents: number;
  status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trialing';
  starts_at: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  features: Record<string, unknown> | null;
  payment_info: {
    payment_method?: string;
    last_four?: string;
    card_brand?: string;
  } | null;
}

interface BillingInfo {
  subscription: Subscription | null;
  team_count: number;
  base_price: number;
  per_member_price: number;
  total_price: number;
  trial_days_remaining: number | null;
  is_trial: boolean;
}

/* ═══════════════════════════════════════════
   PLAN DATA
   ═══════════════════════════════════════════ */
const PLAN_FEATURES = [
  { icon: Bot, text: 'Asistente IA ilimitado 24/7' },
  { icon: MessageCircle, text: 'Conversaciones ilimitadas' },
  { icon: Users, text: '1 miembro incluido' },
  { icon: Globe, text: 'WhatsApp, Instagram, Facebook, Web' },
  { icon: Sparkles, text: 'Modelos IA avanzados (GPT-4o, Claude)' },
  { icon: FileText, text: 'Base de conocimiento (RAG)' },
  { icon: BarChart3, text: 'Analíticas y métricas completas' },
  { icon: Headphones, text: 'Soporte prioritario' },
  { icon: Shield, text: 'Seguridad empresarial' },
];

const FREE_PLAN_LIMITS = [
  { icon: Globe, text: 'Solo WhatsApp como canal', included: true },
  { icon: Zap, text: '1 herramienta conectada', included: true },
  { icon: MessageCircle, text: 'Límite de 50 mensajes/mes', included: true },
  { icon: Bot, text: 'Asistente IA básico', included: true },
  { icon: Users, text: 'Múltiples miembros de equipo', included: false },
  { icon: Sparkles, text: 'Modelos IA avanzados', included: false },
  { icon: BarChart3, text: 'Analíticas y métricas', included: false },
  { icon: FileText, text: 'Base de conocimiento (RAG)', included: false },
  { icon: Headphones, text: 'Soporte prioritario', included: false },
];

const FAQ_ITEMS = [
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, puedes cancelar tu suscripción cuando quieras. Mantendrás el acceso hasta el final del período de facturación.' },
  { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, AMEX) a través de nuestra plataforma de pagos segura.' },
  { q: '¿Qué pasa si agrego más miembros al equipo?', a: 'Se cobra un adicional por cada miembro extra. El cobro se prorratea según los días restantes del ciclo.' },
  { q: '¿Hay algún contrato o permanencia mínima?', a: 'No, no hay contratos ni permanencia mínima. Pagas mes a mes o año a año, sin compromiso.' },
];

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
      inputBorder: isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db',
      subtleBg: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
      badgeBg: isDark ? 'rgba(255,255,255,0.08)' : 'var(--theme-accent-light)',
    };
  }, [hasTheme, isDark]);

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [subscribing, setSubscribing] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [showReferral, setShowReferral] = useState(false);

  // Pricing
  const BASE_PRICE_MONTHLY = 18;
  const BASE_PRICE_ANNUAL = 15; // Discount for annual
  const PER_MEMBER_MONTHLY = 10;
  const PER_MEMBER_ANNUAL = 8;

  const basePrice = billingCycle === 'monthly' ? BASE_PRICE_MONTHLY : BASE_PRICE_ANNUAL;
  const perMemberPrice = billingCycle === 'monthly' ? PER_MEMBER_MONTHLY : PER_MEMBER_ANNUAL;

  const fetchBilling = useCallback(async () => {
    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const res = await fetch('/api/subscription', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfMeta?.getAttribute('content') || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBilling(data);
        if (data.subscription?.billing_cycle) {
          setBillingCycle(data.subscription.billing_cycle);
        }
      }
    } catch (err) {
      console.error('Error fetching billing:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfMeta?.getAttribute('content') || '',
        },
        body: JSON.stringify({ billing_cycle: billingCycle }),
      });

      const data = await res.json();

      if (data.checkout_url) {
        // Redirect to dLocal GO checkout
        window.open(data.checkout_url, '_blank');
      } else if (data.message) {
        showNotification('error', data.message);
      }
    } catch (err) {
      showNotification('error', 'Error al procesar. Intenta de nuevo.');
    } finally {
      setSubscribing(false);
    }
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return;
    setApplyingReferral(true);
    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const res = await fetch('/api/subscription/referral', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfMeta?.getAttribute('content') || '',
        },
        body: JSON.stringify({ code: referralCode }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification('success', data.message || 'Código aplicado correctamente');
        setReferralCode('');
        fetchBilling();
      } else {
        showNotification('error', data.message || 'Código inválido');
      }
    } catch {
      showNotification('error', 'Error al aplicar código');
    } finally {
      setApplyingReferral(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfMeta?.getAttribute('content') || '',
        },
      });
      const data = await res.json();
      if (data.portal_url) {
        window.open(data.portal_url, '_blank');
      }
    } catch {
      showNotification('error', 'Error al abrir el portal de pagos');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className={`w-8 h-8 animate-spin ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined} />
      </div>
    );
  }

  const sub = billing?.subscription;
  const isActive = sub?.status === 'active';
  const isTrial = billing?.is_trial || sub?.status === 'trialing';
  const teamCount = billing?.team_count || 1;
  const additionalMembers = Math.max(0, teamCount - 1);
  const computedTotal = basePrice + (additionalMembers * perMemberPrice);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ═══════ HEADER ═══════ */}
        <div>
          <h1 className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
            Planes y facturación
          </h1>
          <p className={`text-sm mt-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
            Gestiona tu suscripción, método de pago y facturación.
          </p>
        </div>

        {/* ═══════ CURRENT PLAN BANNER ═══════ */}
        <div
          className={`rounded-xl p-4 flex items-center justify-between flex-wrap gap-4 ${!t ? 'bg-white border border-slate-200' : ''}`}
          style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
        >
          <div className="flex items-center gap-3">
            <div
              className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : isTrial
                    ? 'bg-amber-100 text-amber-700'
                    : (!t ? 'bg-slate-100 text-slate-600' : '')
              }`}
              style={!isActive && !isTrial && t ? { background: t.subtleBg, color: t.textMuted } : undefined}
            >
              {isActive ? 'Activo' : isTrial ? 'Trial' : 'Gratis'}
            </div>
            <span className={`text-sm font-medium ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
              {isActive ? 'WITHMIA Pro' : isTrial ? 'Prueba Gratuita' : 'Plan Gratuito'}
            </span>
            {isActive && sub && (
              <span className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                · ${sub.price} USD/{sub.billing_cycle === 'monthly' ? 'mes' : 'año'}
              </span>
            )}
            {isTrial && billing?.trial_days_remaining != null && (
              <span className="text-sm text-amber-600 font-medium">
                · {billing.trial_days_remaining} días restantes
              </span>
            )}
          </div>
          {isActive && (
            <button
              onClick={handleManageSubscription}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${!t ? 'text-indigo-600 hover:bg-indigo-50' : ''}`}
              style={t ? { color: t.accent } : undefined}
            >
              Gestionar <ExternalLink className="w-3 h-3 inline ml-0.5" />
            </button>
          )}
        </div>

        {/* ═══════ PLAN SELECTION (when no active sub) ═══════ */}
        {!isActive && (
          <>
            {/* Billing cycle toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!t ? (billingCycle === 'monthly' ? 'text-neutral-800' : 'text-neutral-400') : ''}`}
                style={t ? { color: billingCycle === 'monthly' ? t.textPrimary : t.textMuted } : undefined}
              >Mensual</span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
                style={{ background: billingCycle === 'annual' ? (t ? t.accent : '#6366f1') : (t ? (isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db') : '#d1d5db') }}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${billingCycle === 'annual' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className={`text-sm font-medium ${!t ? (billingCycle === 'annual' ? 'text-neutral-800' : 'text-neutral-400') : ''}`}
                style={t ? { color: billingCycle === 'annual' ? t.textPrimary : t.textMuted } : undefined}
              >Anual</span>
              {billingCycle === 'annual' && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  -17%
                </span>
              )}
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">

              {/* ── Free Plan Card ── */}
              <div
                className={`rounded-2xl flex flex-col ${!t ? 'bg-white border border-slate-200' : ''}`}
                style={t ? { background: isDark ? 'rgba(0,0,0,0.5)' : '#ffffff', border: `1px solid ${t.cardBorder}` } : undefined}
              >
                <div className="p-7 flex-1 flex flex-col">
                  <div className="mb-6">
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${!t ? 'text-slate-500' : ''}`} style={t ? { color: isDark ? '#94a3b8' : '#64748b' } : undefined}>Gratis</p>
                    <h3 className={`text-xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: isDark ? '#f1f5f9' : '#1e293b' } : undefined}>Plan Gratuito</h3>
                    <p className={`text-sm mt-2 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: isDark ? '#94a3b8' : '#64748b' } : undefined}>Para empezar a explorar</p>
                  </div>

                  <div className="flex items-end gap-1 mb-6">
                    <span className={`text-4xl font-bold tracking-tight ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: isDark ? '#f1f5f9' : '#1e293b' } : undefined}>$0</span>
                    <span className={`text-sm mb-1.5 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: isDark ? '#64748b' : '#94a3b8' } : undefined}>/mes</span>
                  </div>

                  <div className="space-y-3 flex-1">
                    {FREE_PLAN_LIMITS.map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {item.included ? (
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <X className={`w-4 h-4 flex-shrink-0 ${!t ? 'text-neutral-300' : ''}`} style={t ? { color: isDark ? '#475569' : '#cbd5e1' } : undefined} />
                        )}
                        <span
                          className={`text-sm ${
                            item.included
                              ? (!t ? 'text-neutral-700' : '')
                              : (!t ? 'text-neutral-400' : '')
                          }`}
                          style={t ? { color: item.included ? (isDark ? '#e2e8f0' : '#334155') : (isDark ? '#64748b' : '#94a3b8') } : undefined}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-7 pb-7">
                  <div
                    className={`w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 ${!t ? 'bg-slate-100 text-slate-500' : ''}`}
                    style={t ? { background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b' } : undefined}
                  >
                    Plan actual
                  </div>
                </div>
              </div>

              {/* ── Pro Plan Card ── */}
              <div
                className={`rounded-2xl flex flex-col relative ${!t ? 'bg-white border-2 border-indigo-500 shadow-lg shadow-indigo-100' : ''}`}
                style={t ? { background: isDark ? 'rgba(0,0,0,0.5)' : '#ffffff', border: `2px solid ${t.accent}`, boxShadow: `0 10px 40px -10px color-mix(in srgb, ${t.accent} 25%, transparent)` } : undefined}
              >
                {/* Badge */}
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full shadow-sm">
                    Recomendado
                  </span>
                </div>

                <div className="p-7 flex-1 flex flex-col">
                  <div className="mb-6">
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined}>Pro</p>
                    <h3 className={`text-xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: isDark ? '#f1f5f9' : '#1e293b' } : undefined}>WITHMIA Pro</h3>
                    <p className={`text-sm mt-2 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: isDark ? '#94a3b8' : '#64748b' } : undefined}>Todo lo que necesitas para escalar</p>
                  </div>

                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-4xl font-bold tracking-tight ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: isDark ? '#f1f5f9' : '#1e293b' } : undefined}>${basePrice}</span>
                    <span className={`text-sm mb-1.5 ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: isDark ? '#64748b' : '#94a3b8' } : undefined}>USD/mes</span>
                  </div>
                  <p className={`text-xs mb-6 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: isDark ? '#94a3b8' : '#64748b' } : undefined}>
                    +${perMemberPrice}/mes por miembro adicional
                  </p>

                  <div className="space-y-3 flex-1">
                    {PLAN_FEATURES.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <Check className={`w-4 h-4 flex-shrink-0 ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                        <span className={`text-sm ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: isDark ? '#e2e8f0' : '#334155' } : undefined}>{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-7 pb-7">
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className={`w-full py-3 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${!t ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                    style={t ? { background: t.accent } : undefined}
                  >
                    {subscribing ? (
                      <><Loader className="w-4 h-4 animate-spin" /> Procesando...</>
                    ) : (
                      <>Comenzar con Pro <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════ ACTIVE SUBSCRIPTION DETAILS ═══════ */}
        {isActive && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan overview */}
            <div
              className={`rounded-xl p-6 ${!t ? 'bg-white border border-slate-200' : ''}`}
              style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
            >
              <h3 className={`text-sm font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Funcionalidades incluidas</h3>
              <div className="space-y-2.5">
                {PLAN_FEATURES.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className={`text-sm ${!t ? 'text-neutral-600' : ''}`} style={t ? { color: t.textSec } : undefined}>{f.text}</span>
                  </div>
                ))}
                <p className={`text-xs font-medium pt-1 ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined}>
                  + {PLAN_FEATURES.length - 5} más incluidos
                </p>
              </div>

              {additionalMembers > 0 && (
                <div
                  className={`mt-4 p-3 rounded-lg text-xs ${!t ? 'bg-slate-50 text-slate-600' : ''}`}
                  style={t ? { background: t.subtleBg, color: t.textSec } : undefined}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Base + {additionalMembers} extra = <strong>${computedTotal}/mes</strong>
                </div>
              )}
            </div>

            {/* Payment method */}
            <div
              className={`rounded-xl p-6 ${!t ? 'bg-white border border-slate-200' : ''}`}
              style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
            >
              <h3 className={`text-sm font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Método de pago</h3>
              {sub?.payment_info?.last_four ? (
                <div className="space-y-4">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg ${!t ? 'bg-slate-50' : ''}`}
                    style={t ? { background: t.subtleBg } : undefined}
                  >
                    <div
                      className={`w-10 h-7 rounded flex items-center justify-center ${!t ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : ''}`}
                      style={t ? { background: t.accent } : undefined}
                    >
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <p className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textSec } : undefined}>
                      {sub.payment_info.card_brand || 'Tarjeta'} •••• {sub.payment_info.last_four}
                    </p>
                  </div>
                  <button
                    onClick={handleManageSubscription}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${!t ? 'border border-gray-200 text-gray-700 hover:bg-gray-50' : ''}`}
                    style={t ? { border: `1px solid ${t.inputBorder}`, color: t.textPrimary, background: 'transparent' } : undefined}
                  >
                    Cambiar método <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className={`w-8 h-8 mx-auto mb-2 ${!t ? 'text-slate-300' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                  <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                    Sin método registrado
                  </p>
                  <button
                    onClick={handleSubscribe}
                    className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${!t ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                    style={t ? { background: t.accent } : undefined}
                  >
                    Agregar método
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TRUST SIGNALS ═══════ */}
        {!isActive && (
          <div className="flex flex-wrap items-center justify-center gap-6 py-2">
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

        {/* ═══════ REFERRAL ═══════ */}
        <div>
          <button
            onClick={() => setShowReferral(!showReferral)}
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
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Código de referido"
                className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none ${!t ? 'border border-gray-200 text-gray-900 placeholder:text-gray-400 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400' : 'placeholder:opacity-50'}`}
                style={t ? { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary } : undefined}
              />
              <button
                onClick={handleApplyReferral}
                disabled={applyingReferral || !referralCode.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${!t ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-white'}`}
                style={t ? { background: t.accent } : undefined}
              >
                {applyingReferral ? <Loader className="w-4 h-4 animate-spin" /> : 'Aplicar'}
              </button>
            </div>
          )}
        </div>

        {/* ═══════ FAQ ═══════ */}
        <div>
          <h2 className={`text-lg font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
            Preguntas frecuentes
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`rounded-xl overflow-hidden transition-colors ${!t ? 'bg-white border border-slate-200' : ''}`}
                style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${!t ? 'text-neutral-400' : ''} ${faqOpen === i ? 'rotate-180' : ''}`}
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

        {/* ═══════ FOOTER ═══════ */}
        <div className="text-center pb-4">
          <p className={`text-xs ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@withmia.com" className={`font-medium hover:underline ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined}>
              soporte@withmia.com
            </a>
          </p>
        </div>

      </div>

      {/* Notification Toast */}
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
