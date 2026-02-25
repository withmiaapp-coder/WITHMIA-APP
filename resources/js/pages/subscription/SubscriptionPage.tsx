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
    <div className="h-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center space-x-4 mb-2">
          <div
            className={`p-4 rounded-xl shadow-lg ${!t ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : ''}`}
            style={t ? { background: t.accent } : undefined}
          >
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Suscripción</h1>
            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Gestiona tu plan y método de pago</p>
          </div>
        </div>

        {/* ────── Current Plan Status ────── */}
        <div
          className={`rounded-2xl shadow-sm overflow-hidden ${!t ? 'bg-white border border-slate-200' : ''}`}
          style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
        >
          <div className="p-6">
            <h2 className={`text-lg font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Detalles de la suscripción</h2>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Plan badge */}
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                    isActive 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : isTrial 
                        ? 'bg-amber-100 text-amber-700' 
                        : (!t ? 'bg-slate-100 text-slate-600' : '')
                  }`}
                  style={!isActive && !isTrial && t ? { background: t.subtleBg, color: t.textMuted } : undefined}
                >
                  {isActive ? 'Activo' : isTrial ? 'Prueba Gratuita' : 'Sin Plan'}
                </div>

                <div>
                  <p className={`text-xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                    {isActive ? 'WITHMIA Pro' : isTrial ? 'Prueba Gratuita' : 'Plan Gratuito'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isActive && sub ? (
                      <>
                        <span className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                          ${sub.price} USD
                        </span>
                        <span className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                          /{sub.billing_cycle === 'monthly' ? 'mes' : 'año'}
                        </span>
                      </>
                    ) : isTrial && billing?.trial_days_remaining != null ? (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {billing.trial_days_remaining} días restantes de la prueba gratuita
                        </span>
                      </div>
                    ) : (
                      <span className={`text-lg font-bold ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>$0 USD</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment method */}
              {isActive && sub?.payment_info?.last_four && (
                <div
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 ${!t ? 'bg-slate-50' : ''}`}
                  style={t ? { background: t.subtleBg } : undefined}
                >
                  <CreditCard className={`w-5 h-5 ${!t ? 'text-slate-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                  <div>
                    <p className={`text-xs ${!t ? 'text-slate-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Método de pago</p>
                    <p className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textSec } : undefined}>
                      {sub.payment_info.card_brand || 'Tarjeta'} •••• {sub.payment_info.last_four}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Team pricing breakdown */}
            {isActive && additionalMembers > 0 && (
              <div
                className={`mt-4 p-3 rounded-xl ${!t ? 'bg-indigo-50/50 border border-indigo-100' : ''}`}
                style={t ? { background: t.accentLight || t.subtleBg, border: `1px solid ${t.cardBorder}` } : undefined}
              >
                <div className={`flex items-center gap-2 text-sm ${!t ? 'text-indigo-700' : ''}`} style={t ? { color: t.accent } : undefined}>
                  <Users className="w-4 h-4" />
                  <span>
                    Plan base ${basePrice}/mes + {additionalMembers} miembro{additionalMembers > 1 ? 's' : ''} adicional{additionalMembers > 1 ? 'es' : ''} (${additionalMembers * perMemberPrice}/mes) = <strong>${computedTotal}/mes</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            {isActive && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleManageSubscription}
                  className={`text-sm font-medium flex items-center gap-1 ${!t ? 'text-indigo-600 hover:text-indigo-800' : ''}`}
                  style={t ? { color: t.accent } : undefined}
                >
                  Gestionar suscripción <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ────── Free Plan Limits (when no active sub) ────── */}
        {!isActive && !isTrial && (
          <div
            className={`rounded-2xl shadow-sm overflow-hidden ${!t ? 'bg-white border border-slate-200' : ''}`}
            style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`p-2.5 rounded-xl ${!t ? 'bg-slate-100' : ''}`}
                  style={t ? { background: t.subtleBg } : undefined}
                >
                  <Shield className={`w-5 h-5 ${!t ? 'text-slate-600' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                </div>
                <div>
                  <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                    Tu Plan Gratuito
                  </h3>
                  <p className={`text-xs ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                    Funcionalidades básicas incluidas
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {FREE_PLAN_LIMITS.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        item.included
                          ? (!t ? 'bg-emerald-100' : '')
                          : (!t ? 'bg-red-100' : '')
                      }`}
                      style={t ? {
                        background: item.included
                          ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)')
                          : (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)')
                      } : undefined}
                    >
                      {item.included ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-500" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        item.included
                          ? (!t ? 'text-neutral-700' : '')
                          : (!t ? 'text-neutral-400 line-through' : 'line-through opacity-50')
                      }`}
                      style={t ? { color: item.included ? t.textSec : t.textMuted } : undefined}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className={`mt-5 p-3 rounded-xl flex items-center gap-2 ${!t ? 'bg-amber-50 border border-amber-200' : ''}`}
                style={t ? { background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)', border: `1px solid ${isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.25)'}` } : undefined}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className={`text-xs ${!t ? 'text-amber-700' : ''}`} style={t ? { color: isDark ? '#fbbf24' : '#92400e' } : undefined}>
                  Actualiza a <strong>WITHMIA Pro</strong> para desbloquear todas las funcionalidades y canales sin límites.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ────── Referral Code ────── */}
        <div
          className={`rounded-2xl shadow-sm p-6 ${!t ? 'bg-white border border-slate-200' : ''}`}
          style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
        >
          <div className="flex items-center gap-3 mb-3">
            <Gift className={`w-5 h-5 ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined} />
            <p className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textSec } : undefined}>
              ¿Tienes un código de referido?
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Código de referido"
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none ${!t ? 'border border-gray-300 text-gray-900 placeholder:text-gray-400 bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400' : 'placeholder:opacity-50'}`}
              style={t ? { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary } : undefined}
            />
            <button
              onClick={handleApplyReferral}
              disabled={applyingReferral || !referralCode.trim()}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${!t ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-white'}`}
              style={t ? { background: t.accent } : undefined}
            >
              {applyingReferral ? <Loader className="w-4 h-4 animate-spin" /> : null}
              Aplicar
            </button>
          </div>
        </div>

        {/* ────── Plan Selection ────── */}
        {!isActive && (
          <>
            {/* Title */}
            <div className="text-center space-y-2 pt-4">
              <h2 className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                Escoge el plan perfecto
              </h2>
              <p className={`text-sm max-w-lg mx-auto ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                Descubre el plan perfecto para el tamaño y necesidad de tu negocio, te ayudamos en el proceso.
              </p>
            </div>

            {/* Billing cycle toggle */}
            <div className="flex justify-center">
              <div
                className={`rounded-full p-1 flex ${!t ? 'bg-slate-100' : ''}`}
                style={t ? { background: t.subtleBg } : undefined}
              >
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    !t ? (billingCycle === 'monthly'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-800') : ''
                  }`}
                  style={t ? {
                    background: billingCycle === 'monthly' ? t.accent : 'transparent',
                    color: billingCycle === 'monthly' ? '#fff' : t.textMuted,
                  } : undefined}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    !t ? (billingCycle === 'annual'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-800') : ''
                  }`}
                  style={t ? {
                    background: billingCycle === 'annual' ? t.accent : 'transparent',
                    color: billingCycle === 'annual' ? '#fff' : t.textMuted,
                  } : undefined}
                >
                  Anual
                  <span className="ml-1.5 text-xs opacity-80">-17%</span>
                </button>
              </div>
            </div>

            {/* Plan Card */}
            <div className="max-w-lg mx-auto">
              <div
                className={`relative rounded-2xl p-[2px] shadow-xl ${!t ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 shadow-indigo-200' : ''}`}
                style={t ? { background: t.accent, boxShadow: `0 20px 25px -5px color-mix(in srgb, ${t.accent} 20%, transparent)` } : undefined}
              >
                {/* Popular badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full shadow-md">
                    RECOMENDADO
                  </div>
                </div>

                <div
                  className={`rounded-[14px] p-8 ${!t ? 'bg-white' : ''}`}
                  style={t ? { background: isDark ? 'rgba(0,0,0,0.85)' : '#ffffff' } : undefined}
                >
                  {/* Plan header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined}>Plan Único</p>
                      <h3 className={`text-2xl font-bold mt-1 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: isDark ? '#f1f5f9' : '#1e293b' } : undefined}>WITHMIA Pro</h3>
                    </div>
                    <div
                      className={`p-3 rounded-xl ${!t ? 'bg-indigo-100' : ''}`}
                      style={t ? { background: t.badgeBg } : undefined}
                    >
                      <Crown className={`w-6 h-6 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: isDark ? '#f1f5f9' : '#1e293b' } : undefined}>${basePrice}</span>
                      <span className={`text-lg mb-1 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: isDark ? '#94a3b8' : '#64748b' } : undefined}>USD/{billingCycle === 'monthly' ? 'mes' : 'mes'}</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <p className="text-sm text-emerald-600 mt-1 font-medium">
                        Ahorras ${(BASE_PRICE_MONTHLY - BASE_PRICE_ANNUAL) * 12} USD/año
                      </p>
                    )}
                    <div
                      className={`mt-2 px-3 py-2 rounded-lg ${!t ? 'bg-indigo-50' : ''}`}
                      style={t ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' } : undefined}
                    >
                      <p className={`text-xs ${!t ? 'text-indigo-700' : ''}`} style={t ? { color: t.accent } : undefined}>
                        <Users className="w-3.5 h-3.5 inline mr-1" />
                        +${perMemberPrice} USD/{billingCycle === 'monthly' ? 'mes' : 'mes'} por cada miembro adicional del equipo
                      </p>
                    </div>
                  </div>

                  {/* Team calc */}
                  {teamCount > 1 && (
                    <div
                      className={`mb-6 p-3 rounded-xl ${!t ? 'bg-slate-50 border border-slate-100' : ''}`}
                      style={t ? { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` } : undefined}
                    >
                      <p className={`text-xs mb-1 ${!t ? 'text-slate-500' : ''}`} style={t ? { color: isDark ? '#94a3b8' : '#64748b' } : undefined}>Tu equipo actual ({teamCount} miembros)</p>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className={`text-sm ${!t ? 'text-neutral-600' : ''}`} style={t ? { color: isDark ? '#cbd5e1' : '#475569' } : undefined}>Base + {additionalMembers} extra</span>
                        </div>
                        <span className={`text-xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: isDark ? '#f1f5f9' : '#1e293b' } : undefined}>${computedTotal}/mes</span>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: isDark ? '#94a3b8' : '#64748b' } : undefined}>Todo incluido</p>
                    {PLAN_FEATURES.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${!t ? 'bg-indigo-100' : ''}`}
                          style={t ? { background: isDark ? 'rgba(255,255,255,0.1)' : t.badgeBg } : undefined}
                        >
                          <Check className={`w-3 h-3 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                        </div>
                        <span className={`text-sm ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: isDark ? '#e2e8f0' : '#334155' } : undefined}>{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Subscribe button */}
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className={`w-full py-3.5 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${!t ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200' : 'shadow-lg'}`}
                    style={t ? { background: t.accent } : undefined}
                  >
                    {subscribing ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Suscribirse ahora
                      </>
                    )}
                  </button>

                  {/* Extra costs */}
                  <div className="mt-4 text-center">
                    <p className={`text-xs ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: isDark ? '#64748b' : '#94a3b8' } : undefined}>
                      USD ${basePrice}.00/{billingCycle === 'monthly' ? 'mes' : 'mes'} por el plan base
                    </p>
                    <p className={`text-xs ${!t ? 'text-neutral-400' : ''}`} style={t ? { color: isDark ? '#64748b' : '#94a3b8' } : undefined}>
                      USD ${perMemberPrice}.00/{billingCycle === 'monthly' ? 'mes' : 'mes'} por miembro adicional
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ────── Active Subscription Management ────── */}
        {isActive && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Plan Card */}
            <div
              className={`rounded-2xl shadow-sm p-6 ${!t ? 'bg-white border border-slate-200' : ''}`}
              style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2 rounded-lg ${!t ? 'bg-indigo-100' : ''}`}
                  style={t ? { background: t.badgeBg } : undefined}
                >
                  <Crown className={`w-5 h-5 ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                </div>
                <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Tu Plan</h3>
              </div>

              <div className="space-y-3">
                {PLAN_FEATURES.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className={`text-sm ${!t ? 'text-neutral-600' : ''}`} style={t ? { color: t.textSec } : undefined}>{f.text}</span>
                  </div>
                ))}
                <p className={`text-xs font-medium pt-1 ${!t ? 'text-indigo-500' : ''}`} style={t ? { color: t.accent } : undefined}>
                  + {PLAN_FEATURES.length - 5} beneficios más incluidos
                </p>
              </div>
            </div>

            {/* Payment Method Card */}
            <div
              className={`rounded-2xl shadow-sm p-6 ${!t ? 'bg-white border border-slate-200' : ''}`}
              style={t ? { background: t.cardBg, border: `1px solid ${t.cardBorder}` } : undefined}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2 rounded-lg ${!t ? 'bg-slate-100' : ''}`}
                  style={t ? { background: t.subtleBg } : undefined}
                >
                  <CreditCard className={`w-5 h-5 ${!t ? 'text-slate-600' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                </div>
                <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Método de Pago</h3>
              </div>

              {sub?.payment_info?.last_four ? (
                <div className="space-y-4">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl ${!t ? 'bg-slate-50' : ''}`}
                    style={t ? { background: t.subtleBg } : undefined}
                  >
                    <div
                      className={`w-10 h-7 rounded flex items-center justify-center ${!t ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : ''}`}
                      style={t ? { background: t.accent } : undefined}
                    >
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textSec } : undefined}>
                        {sub.payment_info.card_brand || 'Tarjeta'} •••• {sub.payment_info.last_four}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleManageSubscription}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${!t ? 'border border-gray-300 text-gray-800 hover:bg-gray-50' : ''}`}
                    style={t ? { border: `1px solid ${t.inputBorder}`, color: t.textPrimary, background: 'transparent' } : undefined}
                  >
                    Cambiar método de pago
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CreditCard className={`w-10 h-10 mx-auto mb-2 ${!t ? 'text-slate-300' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                  <p className={`text-sm mb-3 ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                    No hay método de pago registrado
                  </p>
                  <button
                    onClick={handleSubscribe}
                    className={`px-5 py-2.5 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 mx-auto ${!t ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                    style={t ? { background: t.accent } : undefined}
                  >
                    <CreditCard className="w-4 h-4" />
                    Agregar Método de Pago
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ────── Need Help ────── */}
        <div
          className={`rounded-2xl p-6 text-center ${!t ? 'bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200' : ''}`}
          style={t ? { background: t.subtleBg, border: `1px solid ${t.cardBorder}` } : undefined}
        >
          <p className={`text-sm ${!t ? 'text-neutral-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
            ¿Tienes dudas sobre tu suscripción? Escríbenos a{' '}
            <a href="mailto:soporte@withmia.com" className={`font-medium hover:underline ${!t ? 'text-indigo-600' : ''}`} style={t ? { color: t.accent } : undefined}>
              soporte@withmia.com
            </a>
          </p>
        </div>

      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`px-6 py-4 rounded-lg shadow-2xl backdrop-blur-md border flex items-center gap-3 ${
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
