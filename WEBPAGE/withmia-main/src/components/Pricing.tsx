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
  GraduationCap,
  Headphones,
  ChevronDown,
  Star,
  TrendingUp,
  Clock,
  BadgeCheck,
  Globe,
  Brain,
  Database,
  Lock,
  MessageCircle,
  Crown,
  Infinity,
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
  { included: true,  label: "50 mensajes IA / mes" },
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

/* ─── Side-by-side comparison rows ─── */
const comparisonRows = [
  { feature: "Canales",        free: "WhatsApp",          pro: "WhatsApp, IG, FB, Web, Email" },
  { feature: "Mensajes IA",    free: "50 / mes",          pro: "Ilimitados" },
  { feature: "Modelos IA",     free: "Básico",            pro: "GPT-4o, Claude, Gemini" },
  { feature: "Miembros",       free: "1",                 pro: "Ilimitados (+$10/mes c/u)" },
  { feature: "Herramientas",   free: "1",                 pro: "Ilimitadas" },
  { feature: "RAG",            free: false,               pro: true },
  { feature: "CRM",            free: false,               pro: true },
  { feature: "Workflows",      free: false,               pro: true },
  { feature: "Analíticas",     free: false,               pro: true },
  { feature: "Integraciones",  free: false,               pro: "12+ nativas + API" },
  { feature: "Cobranzas IA",   free: false,               pro: true },
  { feature: "Soporte",        free: "Comunidad",         pro: "Prioritario (chat + email)" },
];

/* ─── Detailed features grid ─── */
const detailedFeatures = [
  { icon: Bot,          label: "IA conversacional avanzada",       desc: "GPT-4o y Claude respondiendo 24/7 en todos tus canales" },
  { icon: MessageSquare,label: "Conversaciones ilimitadas",        desc: "Sin límite de mensajes o chats activos simultáneos" },
  { icon: Globe,        label: "Omnicanal unificado",              desc: "WhatsApp, Instagram, Messenger, Web y Email en un inbox" },
  { icon: Users,        label: "CRM con pipeline visual",          desc: "Gestiona contactos, etiquetas y oportunidades de venta" },
  { icon: Zap,          label: "Workflows y automatizaciones",     desc: "Reglas, flujos y triggers sin escribir código" },
  { icon: BarChart3,    label: "Analítica en tiempo real",         desc: "Métricas de equipo, tiempos de respuesta y rendimiento IA" },
  { icon: Brain,        label: "Base de conocimiento (RAG)",       desc: "Entrena tu IA con documentos, PDFs y URLs propios" },
  { icon: Layers,       label: "12+ integraciones + API abierta",  desc: "Conecta Stripe, HubSpot, Sheets, Slack y más" },
  { icon: CreditCard,   label: "Cobranzas inteligentes",           desc: "Cobros automatizados con recordatorios por WhatsApp" },
  { icon: Lock,         label: "Seguridad empresarial",            desc: "Encriptación end-to-end, backups y datos protegidos" },
  { icon: GraduationCap,label: "Onboarding incluido",              desc: "Capacitación personalizada para tu equipo" },
  { icon: Headphones,   label: "Soporte prioritario",              desc: "Respuesta rápida vía chat y email dedicado" },
];

/* ─── Market comparison ─── */
const marketComparisons = [
  { name: "ChatGPT Plus",  price: 20, per: "/usuario/mes", channels: false, crm: false, auto: false, omni: false },
  { name: "ChatGPT Team",  price: 25, per: "/usuario/mes", channels: false, crm: false, auto: false, omni: false },
  { name: "Intercom",      price: 39, per: "/asiento/mes",  channels: true,  crm: false, auto: true,  omni: false },
  { name: "Zendesk Suite", price: 55, per: "/agente/mes",   channels: true,  crm: false, auto: true,  omni: false },
  { name: "WITHMIA Pro",   price: 18, per: "/mes",          channels: true,  crm: true,  auto: true,  omni: true, highlight: true },
];

const marketColumns = [
  { key: "channels" as const, label: "Canales" },
  { key: "crm"      as const, label: "CRM" },
  { key: "auto"     as const, label: "Automatizaciones" },
  { key: "omni"     as const, label: "Omnicanal" },
];

/* ─── FAQs ─── */
const faqs = [
  { q: "¿Qué incluye el Plan Gratuito?", a: "Acceso a WhatsApp como canal, 1 herramienta, 50 mensajes IA al mes y un asistente básico. Ideal para probar la plataforma sin compromiso." },
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

function CellValue({ val }: { val: string | boolean }) {
  if (val === true)  return <div className="w-5 h-5 rounded-full bg-amber-400/15 flex items-center justify-center"><Check className="w-3 h-3 text-amber-400" /></div>;
  if (val === false) return <div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center"><XIcon className="w-3 h-3 text-white/15" /></div>;
  return <span className="text-[13px] text-white/60">{val}</span>;
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
  const market     = useScrollReveal();
  const faqSr      = useScrollReveal();
  const ctaSr      = useScrollReveal();

  return (
    <section id="precios" className="relative overflow-hidden">

      {/* ═══════════ HERO ═══════════ */}
      <div className="relative pt-20 md:pt-28 pb-14 md:pb-18 px-4">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-amber-500/[0.07] via-violet-500/[0.04] to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-violet-500/[0.05] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute top-40 left-0 w-[350px] h-[350px] bg-cyan-500/[0.04] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        </div>

        <div ref={hero.ref} className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold backdrop-blur-sm mb-6">
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
        <div className="inline-flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
          <button onClick={() => setIsAnnual(false)} className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 ${!isAnnual ? "bg-white/10 text-white shadow-sm" : "text-white/35 hover:text-white/50"}`}>
            Mensual
          </button>
          <button onClick={() => setIsAnnual(true)} className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center gap-2 ${isAnnual ? "bg-white/10 text-white shadow-sm" : "text-white/35 hover:text-white/50"}`}>
            Anual
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">−17%</span>
          </button>
        </div>
      </div>

      {/* ═══════════ TWO PLAN CARDS ═══════════ */}
      <div className="px-4 pb-10 md:pb-14">
        <div ref={cards.ref} className={`max-w-5xl mx-auto transition-all duration-700 delay-100 ${cards.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="grid md:grid-cols-2 gap-6 md:gap-0 items-stretch">

            {/* ── FREE ── */}
            <div className="relative rounded-3xl md:rounded-r-none border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="p-7 md:p-9 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white/50" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Plan Gratuito</h3>
                    <p className="text-[11px] text-white/25">Para explorar la plataforma</p>
                  </div>
                </div>

                <div className="mt-6 mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-white/30 font-medium self-start mt-3">$</span>
                    <span className="text-6xl font-extrabold text-white tracking-tight">0</span>
                    <span className="text-sm text-white/20 ml-1">/mes</span>
                  </div>
                  <p className="text-[13px] text-white/20 mt-1.5">Gratis para siempre · sin límite de tiempo</p>
                </div>

                <div className="space-y-3 flex-1">
                  {freePlanFeatures.map((f) => (
                    <div key={f.label} className="flex items-center gap-3">
                      {f.included ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-400/10 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-emerald-400" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0"><XIcon className="w-3 h-3 text-white/15" /></div>
                      )}
                      <span className={`text-[13px] ${f.included ? "text-white/60" : "text-white/20 line-through"}`}>{f.label}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick('comenzar_gratis', 'pricing_free', 'https://app.withmia.com')}
                  className="mt-8 flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl border border-white/[0.1] text-[14px] font-medium text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all"
                >
                  Comenzar gratis
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* ── PRO ── */}
            <div className="relative md:scale-[1.03] md:z-10">
              {/* Glow */}
              <div className="absolute -inset-[2px] rounded-3xl md:rounded-l-none bg-gradient-to-b from-amber-400/30 via-amber-500/10 to-transparent blur-sm" />

              <div className="relative rounded-3xl md:rounded-l-none border border-amber-500/25 bg-gradient-to-b from-amber-500/[0.04] to-transparent backdrop-blur-xl overflow-hidden flex flex-col">
                {/* Top shimmer */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

                {/* Popular ribbon */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-center py-2 px-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-black flex items-center justify-center gap-1.5">
                    <Star className="w-3.5 h-3.5" fill="currentColor" /> Más popular
                  </span>
                </div>

                <div className="p-7 md:p-9 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">WITHMIA Pro</h3>
                      <p className="text-[11px] text-white/25">Todo para escalar tu negocio</p>
                    </div>
                  </div>

                  <div className="mt-6 mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-white/30 font-medium self-start mt-3">$</span>
                      <span className="text-6xl font-extrabold text-white tracking-tight tabular-nums">
                        <AnimatedPrice value={pricing.base} />
                      </span>
                      <div className="ml-1 text-left">
                        <span className="block text-sm text-white/30 font-medium">USD/mes</span>
                        {isAnnual && <span className="block text-[11px] text-white/15">facturado anualmente</span>}
                      </div>
                    </div>
                    <p className="text-[13px] text-white/20 mt-1.5">
                      +${pricing.perMember}/mes por miembro adicional
                    </p>
                    {isAnnual && (
                      <p className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400 mt-2 bg-emerald-400/[0.06] px-3 py-1 rounded-full">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Ahorras ${(PRICING.monthly.base - PRICING.annual.base) * 12} USD/año
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 flex-1 mt-6">
                    {proPlanFeatures.map((f) => (
                      <div key={f.label} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-amber-400" />
                        </div>
                        <span className="text-[13px] text-white/70 leading-snug">{f.label}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href="https://app.withmia.com"
                    onClick={() => trackCTAClick('comenzar_pro', 'pricing_pro', 'https://app.withmia.com')}
                    className="mt-8 relative flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-bold text-black hover:brightness-110 transition-all group/btn overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    <span className="relative z-10 flex items-center gap-2">
                      Comenzar con Pro
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                    </span>
                  </a>
                  <p className="text-[11px] text-white/15 text-center mt-3">
                    Sin tarjeta de crédito · Cancela cuando quieras
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise bar */}
          <div className="mt-6 md:mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
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


      {/* ═══════════ TEAM SIZE CALCULATOR ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={calc.ref} className={`max-w-2xl mx-auto transition-all duration-700 ${calc.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-7 md:p-9">
            <div className="text-center mb-6">
              <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-2">Calculadora</p>
              <h3 className="text-lg font-bold text-white">¿Cuánto pagarás con tu equipo?</h3>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm text-white/30 font-medium self-start mt-3">$</span>
                <span className="text-5xl md:text-6xl font-extrabold text-white tracking-tight tabular-nums">
                  <AnimatedPrice value={totalPrice} />
                </span>
                <span className="text-sm text-white/20 ml-1">USD/mes</span>
              </div>
              <p className="text-[13px] text-white/20 mt-2">
                {teamSize === 1
                  ? `$${pricing.base}/mes — 1 usuario incluido`
                  : `$${pricing.base} base + ${teamSize - 1} × $${pricing.perMember} extra`}
              </p>
              {isAnnual && annualSavings > 0 && (
                <p className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400 mt-2 bg-emerald-400/[0.06] px-3 py-1 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Ahorras ${annualSavings} USD al año
                </p>
              )}
            </div>

            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-white/40 font-medium">Tamaño del equipo</span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-white/[0.06] px-3 py-1.5 rounded-lg">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  {teamSize} {teamSize === 1 ? "usuario" : "usuarios"}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-white/[0.06]">
                <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150" style={{ width: `${sliderPct}%` }} />
                <input type="range" min={1} max={20} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg shadow-amber-500/20 border-2 border-amber-400 pointer-events-none transition-all duration-150" style={{ left: `calc(${sliderPct}% - 10px)` }} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-white/15 font-mono">
                <span>1</span><span>5</span><span>10</span><span>15</span><span>20+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ FREE vs PRO COMPARISON TABLE ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={comparison.ref} className={`max-w-3xl mx-auto transition-all duration-700 ${comparison.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="text-center mb-10">
            <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">Comparación detallada</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Gratuito vs Pro.{" "}
              <span className="text-white/40">Punto por punto.</span>
            </h2>
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
            {/* Header */}
            <div className="grid grid-cols-[1.2fr,1fr,1fr] gap-0 border-b border-white/[0.08] bg-white/[0.03]">
              <div className="px-5 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold">Funcionalidad</div>
              <div className="px-4 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold text-center">Gratuito</div>
              <div className="px-4 py-4 text-[11px] text-amber-400/60 uppercase tracking-wider font-semibold text-center flex items-center justify-center gap-1.5">
                <Crown className="w-3 h-3" /> Pro
              </div>
            </div>
            {/* Rows */}
            {comparisonRows.map((row, i) => (
              <div
                key={row.feature}
                className="grid grid-cols-[1.2fr,1fr,1fr] gap-0 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                style={{ opacity: comparison.isVisible ? 1 : 0, transition: `all 0.4s ease ${i * 40}ms` }}
              >
                <div className="px-5 py-3.5 text-[13px] text-white/50 font-medium">{row.feature}</div>
                <div className="px-4 py-3.5 flex items-center justify-center"><CellValue val={row.free} /></div>
                <div className="px-4 py-3.5 flex items-center justify-center bg-amber-500/[0.02]"><CellValue val={row.pro} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ FEATURES GRID ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={features.ref} className={`max-w-5xl mx-auto transition-all duration-700 ${features.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="text-center mb-12">
            <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">Todo incluido en Pro</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Cada funcionalidad.{" "}
              <span className="text-white/40">Sin costos ocultos.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {detailedFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition-all duration-300"
                  style={{ opacity: features.isVisible ? 1 : 0, transform: features.isVisible ? "translateY(0)" : "translateY(12px)", transition: `all 0.5s ease ${i * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/10 flex items-center justify-center shrink-0 group-hover:border-amber-500/25 transition-colors">
                      <Icon className="w-4 h-4 text-amber-400/70 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-white/80 leading-tight mb-1 group-hover:text-white transition-colors">{f.label}</h4>
                      <p className="text-[12px] text-white/25 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ MARKET COMPARISON ═══════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div ref={market.ref} className={`max-w-4xl mx-auto transition-all duration-700 ${market.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="text-center mb-12">
            <p className="text-[11px] text-violet-400/60 uppercase tracking-[0.2em] font-semibold mb-3">Vs. el mercado</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              ¿Por qué WITHMIA?{" "}
              <span className="text-white/40">Compara y decide.</span>
            </h2>
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
            <div className="hidden md:grid grid-cols-[1.5fr,0.7fr,repeat(4,0.7fr)] gap-0 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="px-6 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold">Plataforma</div>
              <div className="px-4 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold text-center">Precio</div>
              {marketColumns.map((col) => (
                <div key={col.key} className="px-4 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold text-center">{col.label}</div>
              ))}
            </div>
            {marketComparisons.map((c, i) => (
              <div
                key={c.name}
                className={`grid grid-cols-1 md:grid-cols-[1.5fr,0.7fr,repeat(4,0.7fr)] gap-0 border-b border-white/[0.04] last:border-0 transition-colors ${c.highlight ? "bg-amber-500/[0.04] border-l-2 border-l-amber-400" : "hover:bg-white/[0.02]"}`}
                style={{ opacity: market.isVisible ? 1 : 0, transform: market.isVisible ? "translateX(0)" : "translateX(-12px)", transition: `all 0.4s ease ${i * 80}ms` }}
              >
                <div className="px-6 py-4 flex items-center gap-3">
                  {c.highlight && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 hidden md:block" />}
                  <span className={`text-[14px] font-semibold ${c.highlight ? "text-amber-400" : "text-white/60"}`}>{c.name}</span>
                  {c.highlight && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 hidden md:inline">Tú</span>}
                </div>
                <div className="px-6 md:px-4 py-2 md:py-4 flex items-center md:justify-center">
                  <span className="md:hidden text-[11px] text-white/20 mr-2">Precio:</span>
                  <span className={`text-[15px] font-bold tabular-nums ${c.highlight ? "text-amber-400" : "text-white/50"}`}>${c.price}</span>
                  <span className="text-[10px] text-white/20 ml-1">{c.per}</span>
                </div>
                {marketColumns.map((col) => (
                  <div key={col.key} className="px-6 md:px-4 py-2 md:py-4 flex items-center md:justify-center">
                    <span className="md:hidden text-[11px] text-white/20 mr-2">{col.label}:</span>
                    {c[col.key] ? (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${c.highlight ? "bg-amber-400/15" : "bg-emerald-400/10"}`}>
                        <Check className={`w-3 h-3 ${c.highlight ? "text-amber-400" : "text-emerald-400"}`} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center">
                        <div className="w-2 h-[1.5px] bg-white/15 rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
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
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-violet-500/[0.06] to-cyan-500/[0.04]" />
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-violet-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative border border-white/[0.08] rounded-3xl p-10 md:p-14 text-center">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

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
