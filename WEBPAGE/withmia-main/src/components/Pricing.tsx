import { useState, useMemo, useEffect, useRef } from "react";
import { useScrollReveal } from "@/hooks/useAnimations";
import {
  Check,
  X as XIcon,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Bot,
  BarChart3,
  Zap,
  Shield,
  Users,
  Layers,
  CreditCard,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Clock,
  BadgeCheck,
  Globe,
  Brain,
  Lock,
  Crown,
  Building2,
} from "lucide-react";
import { Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";

/* ═══════════════════════════════════════════════════════════
   PRICING LOGIC  (mirrors SubscriptionController.php)
   Free  : $0 / mo
   Pro   : $18 / mo (monthly)  ·  $15 / mo (annual, -17%)
   Extra : $10 / mo (monthly)  ·  $8  / mo (annual)
   1st user included in Pro base price
   ═══════════════════════════════════════════════════════════ */

const PRICING = {
  monthly: { base: 18, perMember: 10 },
  annual:  { base: 15, perMember: 8 },
} as const;

/* ─── Free plan features ─── */
const freePlanFeatures = [
  { included: true,  label: "1 canal (WhatsApp)" },
  { included: true,  label: "1 herramienta conectada" },
  { included: true,  label: "500 mensajes IA / mes" },
  { included: true,  label: "Asistente IA básico" },
  { included: false, label: "Múltiples miembros" },
  { included: false, label: "GPT-4o / Claude" },
  { included: false, label: "Analíticas y métricas" },
  { included: false, label: "Base de conocimiento (RAG)" },
  { included: false, label: "Soporte prioritario" },
];

/* ─── Pro plan features ─── */
const proPlanFeatures = [
  { label: "Todos los canales (WhatsApp, IG, FB, Web, Email)" },
  { label: "Conversaciones y mensajes ilimitados" },
  { label: "1 miembro incluido · agrega más desde $10/mes" },
  { label: "GPT-4o, Claude y modelos avanzados" },
  { label: "Base de conocimiento RAG" },
  { label: "Workflows y automatizaciones" },
  { label: "CRM con pipeline visual" },
  { label: "Analíticas en tiempo real" },
  { label: "Soporte prioritario" },
  { label: "Seguridad empresarial (E2E)" },
];

/* ─── Side-by-side comparison rows (grouped) ─── */
type ComparisonRow = { feature: string; free: string | boolean; pro: string | boolean };
type ComparisonGroup = { category: string; icon: typeof Globe; rows: ComparisonRow[] };

const comparisonGroups: ComparisonGroup[] = [
  {
    category: "Comunicación",
    icon: Globe,
    rows: [
      { feature: "Canales disponibles",  free: "WhatsApp",   pro: "WhatsApp, IG, FB, Web, Email" },
      { feature: "Mensajes de IA",       free: "500 / mes",  pro: "Ilimitados" },
      { feature: "Modelos de IA",        free: "Básico",     pro: "GPT-4o, Claude, Gemini" },
    ],
  },
  {
    category: "Equipo",
    icon: Users,
    rows: [
      { feature: "Miembros",             free: "1",          pro: "Ilimitados (+$10/mes c/u)" },
      { feature: "CRM con pipeline",     free: false,        pro: true },
      { feature: "Analíticas",           free: false,        pro: true },
    ],
  },
  {
    category: "Automatización",
    icon: Zap,
    rows: [
      { feature: "Herramientas de IA",   free: "1",          pro: "Ilimitadas" },
      { feature: "Base de conocimiento (RAG)", free: false,   pro: true },
      { feature: "Workflows",            free: false,        pro: true },
      { feature: "Cobranzas IA",         free: false,        pro: true },
    ],
  },
  {
    category: "Plataforma",
    icon: Layers,
    rows: [
      { feature: "Integraciones",        free: false,        pro: "n8n, Zapier, Slack + API" },
      { feature: "Soporte",              free: "Comunidad",  pro: "Prioritario (chat + email)" },
    ],
  },
];

/* ─── Detailed features (grouped by category) ─── */
type FeatureItem = { icon: typeof Bot; label: string; desc: string };
type FeatureGroup = { title: string; icon: typeof Bot; features: FeatureItem[] };

const featureGroups: FeatureGroup[] = [
  {
    title: "Inteligencia Artificial",
    icon: Bot,
    features: [
      { icon: Bot,          label: "IA conversacional avanzada",  desc: "GPT-4o y Claude con contexto completo del cliente, 24/7." },
      { icon: MessageSquare, label: "Mensajes ilimitados",         desc: "Sin topes de conversaciones ni chats simultáneos." },
      { icon: Brain,        label: "Base de conocimiento (RAG)",   desc: "Entrena tu IA con documentos, PDFs y URLs propios." },
    ],
  },
  {
    title: "Canales y comunicación",
    icon: Globe,
    features: [
      { icon: Globe,        label: "Inbox omnicanal",              desc: "WhatsApp, IG, Messenger, Web y Email en una bandeja." },
      { icon: CreditCard,   label: "Cobranzas inteligentes",       desc: "Cobros con enlaces de pago y recordatorios automáticos." },
    ],
  },
  {
    title: "Gestión y equipo",
    icon: Users,
    features: [
      { icon: Users,        label: "CRM con pipeline visual",      desc: "Contactos, etapas de venta y oportunidades en un tablero." },
      { icon: BarChart3,    label: "Analítica en tiempo real",     desc: "Tiempos de respuesta, rendimiento IA y conversión." },
      { icon: Zap,          label: "Workflows y automatizaciones", desc: "Reglas, flujos y triggers — sin escribir código." },
    ],
  },
  {
    title: "Plataforma",
    icon: Layers,
    features: [
      { icon: Layers,       label: "Integraciones + API",           desc: "n8n, Zapier, Slack, Google Calendar, Calendly, WooCommerce y API REST abierta." },
      { icon: Lock,         label: "Seguridad empresarial",        desc: "Encriptación E2E, backups automáticos y datos protegidos." },
    ],
  },
];

/* ─── FAQs ─── */
const faqs = [
  { q: "¿Qué incluye el Plan Gratuito?", a: "Acceso a WhatsApp como canal, 1 herramienta, 500 mensajes IA al mes y un asistente básico. Ideal para probar la plataforma sin compromiso." },
  { q: "¿Necesito tarjeta de crédito para empezar?", a: "No. Creas tu cuenta gratis sin tarjeta. Solo la necesitarás si decides activar WITHMIA Pro." },
  { q: "¿Qué incluye el primer usuario de Pro?", a: "El precio base ($18/mes o $15/mes anual) incluye 1 usuario con acceso completo: IA avanzada, todos los canales, CRM, automatizaciones, RAG y más." },
  { q: "¿Cómo agrego usuarios adicionales?", a: "Cada miembro extra cuesta $10/mes (mensual) o $8/mes (anual). Los agregas o quitas al instante desde el dashboard." },
  { q: "¿Puedo pasar de Gratuito a Pro?", a: "Sí, actualiza en cualquier momento desde tu dashboard. Tu historial y configuración se mantienen intactos." },
  { q: "¿Puedo cancelar en cualquier momento?", a: "Sí. Sin contratos. Si cancelas, mantienes acceso hasta el final del período y luego pasas al plan gratuito." },
  { q: "¿Hay planes Enterprise?", a: "Para equipos de más de 20 usuarios ofrecemos precios especiales, SLA dedicado y onboarding premium. Contáctanos." },
  { q: "¿Qué pasa con mis datos si cancelo?", a: "Se conservan por 30 días. Puedes exportar todo antes de ese plazo." },
];


/* ═══════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════ */

function AnimatedPrice({ value, duration = 500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>{display}</>;
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-0" style={{ animationDelay: `${index * 60}ms` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 px-1 text-left group">
        <span className="text-[15px] font-medium text-white/80 group-hover:text-white transition-colors pr-4">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-amber-400" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-48 opacity-100 pb-5" : "max-h-0 opacity-0"}`}>
        <p className="text-[13px] text-white/40 leading-relaxed px-1">{a}</p>
      </div>
    </div>
  );
}

function CellValue({ val, highlight = false }: { val: string | boolean; highlight?: boolean }) {
  if (val === true)  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${highlight ? "bg-amber-400/15" : "bg-emerald-400/10"}`}>
      <Check className={`w-3.5 h-3.5 ${highlight ? "text-amber-400" : "text-emerald-400/70"}`} />
    </div>
  );
  if (val === false) return (
    <span className="text-[12px] text-white/15 font-medium">—</span>
  );
  return <span className={`text-[12.5px] leading-snug ${highlight ? "text-white/70 font-medium" : "text-white/50"}`}>{val}</span>;
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

export const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [teamSize, setTeamSize] = useState(1);

  const pricing   = isAnnual ? PRICING.annual : PRICING.monthly;
  const totalPrice = useMemo(() => pricing.base + Math.max(0, teamSize - 1) * pricing.perMember, [pricing, teamSize]);
  const annualSavings = useMemo(() => {
    const m = PRICING.monthly.base + Math.max(0, teamSize - 1) * PRICING.monthly.perMember;
    const a = PRICING.annual.base  + Math.max(0, teamSize - 1) * PRICING.annual.perMember;
    return (m - a) * 12;
  }, [teamSize]);
  const sliderPct = ((teamSize - 1) / 19) * 100;

  const hero       = useScrollReveal();
  const cards      = useScrollReveal();

  const calc       = useScrollReveal();
  const comparison = useScrollReveal();
  const features   = useScrollReveal();
  const faqSr      = useScrollReveal();
  const ctaSr      = useScrollReveal();

  return (
    <section id="precios" className="relative overflow-hidden">

      {/* ═══════════ HERO ═══════════ */}
      <div className="relative pt-20 md:pt-28 pb-14 md:pb-18 px-4">

        <div ref={hero.ref} className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-violet-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold mb-6">
            <div className="relative">
              <Sparkles className="w-4 h-4" />
              <Sparkles className="w-4 h-4 absolute inset-0 animate-ping opacity-30" />
            </div>
            Precio simple, valor real
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5">
            Empieza gratis.
            <br />
            <span className="text-gradient">Crece sin límites.</span>
          </h1>
          <p className="text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed mb-8">
            Un plan gratuito para explorar y un Pro que escala con tu equipo.
            Sin costos ocultos. Sin sorpresas.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-white/25 text-[12px] font-medium">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400/60" />Sin tarjeta requerida</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400/60" />Activo en 5 min</span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-violet-400/60" />Cancela cuando quieras</span>
          </div>
        </div>
      </div>

      {/* ═══════════ BILLING TOGGLE ═══════════ */}
      <div className="flex justify-center mb-10 px-4">
        <div className="inline-flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <button onClick={() => setIsAnnual(false)} className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 ${!isAnnual ? "bg-white/10 text-white" : "text-white/35 hover:text-white/50"}`}>
            Mensual
          </button>
          <button onClick={() => setIsAnnual(true)} className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center gap-2 ${isAnnual ? "bg-white/10 text-white" : "text-white/35 hover:text-white/50"}`}>
            Anual
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">−17%</span>
          </button>
        </div>
      </div>

      {/* ═══════════ TWO PLAN CARDS ═══════════ */}
      <div className="px-4 pb-10 md:pb-14">
        <div ref={cards.ref} className={`max-w-5xl mx-auto transition-all duration-700 delay-100 ${cards.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="grid md:grid-cols-2 gap-6 items-stretch">

            {/* ── FREE ── */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] flex flex-col">
              <div className="p-7 flex-1 flex flex-col">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Gratis</p>
                  <h3 className="text-xl font-bold text-white">Plan Gratuito</h3>
                  <p className="text-sm text-white/35 mt-2">Para empezar a explorar</p>
                </div>

                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-bold text-white tracking-tight">$0</span>
                  <span className="text-sm text-white/30 mb-1.5">/mes</span>
                </div>

                <div className="space-y-3 flex-1">
                  {freePlanFeatures.map((f) => (
                    <div key={f.label} className="flex items-center gap-2.5">
                      {f.included ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XIcon className="w-4 h-4 text-white/15 shrink-0" />
                      )}
                      <span className={`text-sm ${f.included ? "text-white/70" : "text-white/25"}`}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-7 pb-7">
                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick('comenzar_gratis', 'pricing_free', 'https://app.withmia.com')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-white/[0.1] text-sm font-medium text-white/50 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all"
                >
                  Comenzar gratis
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* ── PRO ── */}
            <div className="rounded-2xl border-2 border-amber-500/40 bg-white/[0.02] flex flex-col relative">
              {/* Badge */}
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                  Recomendado
                </span>
              </div>

              <div className="p-7 flex-1 flex flex-col">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/70 mb-1">Pro</p>
                  <h3 className="text-xl font-bold text-white">WITHMIA Pro</h3>
                  <p className="text-sm text-white/35 mt-2">Todo lo que necesitas para escalar</p>
                </div>

                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white tracking-tight tabular-nums">
                    $<AnimatedPrice value={pricing.base} />
                  </span>
                  <span className="text-sm text-white/30 mb-1.5">USD/mes</span>
                </div>
                <p className="text-xs text-white/30 mb-1">
                  +${pricing.perMember}/mes por miembro adicional
                </p>
                {isAnnual && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-emerald-400 mt-1 mb-4">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Ahorras ${(PRICING.monthly.base - PRICING.annual.base) * 12} USD/año
                  </p>
                )}
                {!isAnnual && <div className="mb-4" />}

                <div className="space-y-3 flex-1">
                  {proPlanFeatures.map((f) => (
                    <div key={f.label} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-sm text-white/70">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-7 pb-7">
                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick('comenzar_pro', 'pricing_pro', 'https://app.withmia.com')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
                >
                  Comenzar con Pro
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>


      {/* ═══════════ TEAM SIZE CALCULATOR ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={calc.ref} className={`max-w-3xl mx-auto transition-all duration-700 ${calc.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-2">Calculadora</p>
            <h3 className="text-xl md:text-2xl font-bold text-white">Calcula el costo de tu equipo</h3>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            {/* Slider section */}
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-white/50 font-medium">Miembros del equipo</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                    className="w-8 h-8 rounded-lg border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-colors text-lg leading-none"
                  >−</button>
                  <span className="w-16 text-center text-lg font-bold text-white tabular-nums">{teamSize}</span>
                  <button
                    onClick={() => setTeamSize(Math.min(20, teamSize + 1))}
                    className="w-8 h-8 rounded-lg border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-colors text-lg leading-none"
                  >+</button>
                </div>
              </div>

              <div className="relative h-2 rounded-full bg-white/[0.06]">
                <div className="absolute top-0 left-0 h-full rounded-full bg-amber-500 transition-all duration-150" style={{ width: `${sliderPct}%` }} />
                <input type="range" min={1} max={20} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-amber-400 pointer-events-none transition-all duration-150" style={{ left: `calc(${sliderPct}% - 10px)` }} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-white/20 font-mono">
                <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06]" />

            {/* Breakdown */}
            <div className="p-6 md:p-8 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Plan base (1 usuario incluido)</span>
                <span className="text-white/70 font-medium tabular-nums">${pricing.base}</span>
              </div>
              {teamSize > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">{teamSize - 1} miembro{teamSize > 2 ? "s" : ""} adicional{teamSize > 2 ? "es" : ""} × ${pricing.perMember}</span>
                  <span className="text-white/70 font-medium tabular-nums">${(teamSize - 1) * pricing.perMember}</span>
                </div>
              )}
              {isAnnual && annualSavings > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-400/70">Descuento anual (−17%)</span>
                  <span className="text-emerald-400 font-medium tabular-nums">−${annualSavings}/año</span>
                </div>
              )}

              <div className="border-t border-white/[0.06] pt-3 flex items-end justify-between">
                <span className="text-sm font-semibold text-white/60">Total mensual</span>
                <div className="text-right">
                  <span className="text-3xl font-bold text-white tabular-nums">
                    $<AnimatedPrice value={totalPrice} />
                  </span>
                  <span className="text-sm text-white/30 ml-1">USD/mes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise bar */}
          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white/80">¿Más de 20 usuarios?</p>
                <p className="text-[12px] text-white/30">Planes Enterprise con SLA dedicado y onboarding premium.</p>
              </div>
            </div>
            <Link
              to="/contacto"
              onClick={() => trackCTAClick('enterprise_contact', 'pricing_enterprise', '/contacto')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-500/20 text-[13px] font-medium text-violet-400 hover:bg-violet-500/10 transition-all shrink-0"
            >
              Hablemos
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════ FREE vs PRO COMPARISON TABLE ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={comparison.ref} className={`max-w-3xl mx-auto transition-all duration-700 ${comparison.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="text-center mb-10">
            <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">Comparación detallada</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Todo lo que incluye cada plan.
            </h2>
            <p className="text-sm text-white/30 mt-2 max-w-md mx-auto">Compara funcionalidades y elige el que mejor se adapte a tu negocio.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {/* Sticky header with plan names + prices */}
            <div className="grid grid-cols-[1.4fr,1fr,1fr] gap-0 border-b border-white/[0.08] bg-white/[0.03]">
              <div className="px-6 py-5" />
              <div className="px-4 py-5 text-center border-l border-white/[0.04]">
                <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold mb-1">Gratuito</p>
                <p className="text-lg font-bold text-white/60">$0<span className="text-[11px] font-normal text-white/20 ml-0.5">/mes</span></p>
              </div>
              <div className="px-4 py-5 text-center bg-amber-500/[0.03] border-l border-amber-500/[0.06]">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Crown className="w-3 h-3 text-amber-400/70" />
                  <p className="text-[11px] text-amber-400/70 uppercase tracking-wider font-semibold">Pro</p>
                </div>
                <p className="text-lg font-bold text-white">$18<span className="text-[11px] font-normal text-white/30 ml-0.5">/mes</span></p>
              </div>
            </div>

            {/* Grouped rows */}
            {comparisonGroups.map((group, gi) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.category}>
                  {/* Category header */}
                  <div className="grid grid-cols-[1.4fr,1fr,1fr] gap-0 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="px-6 py-3 flex items-center gap-2.5">
                      <GroupIcon className="w-3.5 h-3.5 text-white/25" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{group.category}</span>
                    </div>
                    <div className="border-l border-white/[0.04]" />
                    <div className="bg-amber-500/[0.02] border-l border-amber-500/[0.04]" />
                  </div>
                  {/* Feature rows */}
                  {group.rows.map((row, ri) => {
                    const globalIdx = comparisonGroups.slice(0, gi).reduce((acc, g) => acc + g.rows.length, 0) + ri;
                    return (
                      <div
                        key={row.feature}
                        className="grid grid-cols-[1.4fr,1fr,1fr] gap-0 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.015] transition-colors"
                        style={{ opacity: comparison.isVisible ? 1 : 0, transition: `all 0.4s ease ${globalIdx * 40}ms` }}
                      >
                        <div className="px-6 py-3.5 text-[13px] text-white/45 font-medium">{row.feature}</div>
                        <div className="px-4 py-3.5 flex items-center justify-center border-l border-white/[0.04]">
                          <CellValue val={row.free} />
                        </div>
                        <div className="px-4 py-3.5 flex items-center justify-center bg-amber-500/[0.02] border-l border-amber-500/[0.04]">
                          <CellValue val={row.pro} highlight />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Bottom CTA row */}
            <div className="grid grid-cols-[1.4fr,1fr,1fr] gap-0 border-t border-white/[0.06] bg-white/[0.02]">
              <div className="px-6 py-4" />
              <div className="px-4 py-4 flex items-center justify-center border-l border-white/[0.04]">
                <Link
                  to="/registro"
                  onClick={() => trackCTAClick('comparison_free', 'pricing_comparison', '/registro')}
                  className="text-[12px] font-semibold text-white/40 hover:text-white/60 transition-colors"
                >
                  Comenzar gratis
                </Link>
              </div>
              <div className="px-4 py-4 flex items-center justify-center bg-amber-500/[0.03] border-l border-amber-500/[0.06]">
                <Link
                  to="/registro"
                  onClick={() => trackCTAClick('comparison_pro', 'pricing_comparison', '/registro')}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-[12px] font-semibold text-black hover:bg-amber-400 transition-colors"
                >
                  Comenzar con Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ FEATURES GRID ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={features.ref} className={`max-w-4xl mx-auto transition-all duration-700 ${features.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="text-center mb-12">
            <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">Todo incluido en Pro</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Cada funcionalidad que necesitas.
            </h2>
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {featureGroups.map((group, gi) => {
              const GroupIcon = group.icon;
              const baseIdx = featureGroups.slice(0, gi).reduce((acc, g) => acc + g.features.length, 0);
              return (
                <div key={group.title}>
                  {/* Category header */}
                  <div className={`flex items-center gap-3 px-6 py-3 bg-white/[0.02] ${gi > 0 ? "border-t border-white/[0.06]" : ""}`}>
                    <GroupIcon className="w-3.5 h-3.5 text-white/25" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/35">{group.title}</span>
                    <span className="text-[10px] text-white/15 ml-auto tabular-nums">{group.features.length}</span>
                  </div>
                  {/* Feature rows */}
                  {group.features.map((f, fi) => {
                    const Icon = f.icon;
                    const idx = baseIdx + fi;
                    return (
                      <div
                        key={f.label}
                        className="group grid grid-cols-[1fr] sm:grid-cols-[1fr,1.2fr] gap-1 sm:gap-6 px-6 py-4 border-t border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                        style={{ opacity: features.isVisible ? 1 : 0, transition: `all 0.4s ease ${idx * 45}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors shrink-0" />
                          <span className="text-[13.5px] font-semibold text-white/75 group-hover:text-white transition-colors">{f.label}</span>
                        </div>
                        <p className="text-[12.5px] text-white/30 leading-relaxed sm:text-right pl-7 sm:pl-0">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ FAQ ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={faqSr.ref} className={`max-w-2xl mx-auto transition-all duration-700 ${faqSr.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="text-center mb-10">
            <p className="text-[11px] text-cyan-400/60 uppercase tracking-[0.2em] font-semibold mb-3">Preguntas frecuentes</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              ¿Tienes dudas?{" "}
              <span className="text-white/40">Te respondemos.</span>
            </h2>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-6 md:px-8">
            {faqs.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={ctaSr.ref} className={`max-w-4xl mx-auto transition-all duration-700 ${ctaSr.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="relative rounded-3xl overflow-hidden">
            <div className="relative border border-white/[0.08] rounded-3xl p-10 md:p-14 text-center bg-white/[0.02]">

              {/* Guarantee badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/[0.08] border border-emerald-400/15 text-[12px] text-emerald-400 font-semibold mb-6">
                <Shield className="w-4 h-4" />
                Garantía de satisfacción — cancela en cualquier momento
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Comienza hoy. Sin riesgos.
              </h2>
              <p className="text-[14px] text-white/40 max-w-md mx-auto mb-8 leading-relaxed">
                Únete a +500 equipos que automatizan su atención al cliente con IA.
                Empieza gratis o ve directo a Pro.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick('comenzar_gratis', 'pricing_bottom', 'https://app.withmia.com')}
                  className="relative flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-bold text-black hover:brightness-110 transition-all group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10 flex items-center gap-2">
                    Comenzar gratis
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
                <Link
                  to="/contacto"
                  onClick={() => trackCTAClick('hablar_ventas', 'pricing_bottom', '/contacto')}
                  className="flex items-center justify-center px-8 py-4 rounded-xl border border-white/[0.1] text-[14px] font-medium text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all"
                >
                  Hablar con ventas
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-white/20 text-[11px]">
                <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Datos seguros</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Soporte 24/7</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="w-3 h-3" /> +500 equipos activos</span>
              </div>

              <p className="text-[12px] text-white/15 mt-6">
                ¿Dudas sobre tu suscripción?{" "}
                <a href="mailto:soporte@withmia.com" className="text-amber-400/50 hover:text-amber-400 underline underline-offset-2 transition-colors">
                  soporte@withmia.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};
