const fs = require('fs');
const path = require('path');

const content = `import { useState, useMemo, useEffect, useRef } from "react";
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
  Wrench,
  Crown,
  Building2,
  Minus,
} from "lucide-react";
import { Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";

/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   PRICING LOGIC (mirrors SubscriptionController.php)
   Free: $0/mo
   Pro Base: $18/mo (monthly) \u00b7 $15/mo (annual, -17%)
   Extra member: $10/mo (monthly) \u00b7 $8/mo (annual)
   1st user included in base price
   \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

const PRICING = {
  monthly: { base: 18, perMember: 10 },
  annual: { base: 15, perMember: 8 },
} as const;

/* \u2500\u2500\u2500 Free plan features \u2500\u2500\u2500 */
const freePlanFeatures = [
  { included: true, label: "1 canal (WhatsApp)" },
  { included: true, label: "1 herramienta conectada" },
  { included: true, label: "50 mensajes IA / mes" },
  { included: true, label: "Asistente IA b\u00e1sico" },
  { included: false, label: "M\u00faltiples miembros" },
  { included: false, label: "GPT-4o / Claude" },
  { included: false, label: "Anal\u00edticas y m\u00e9tricas" },
  { included: false, label: "RAG \u2014 Base de conocimiento" },
  { included: false, label: "Soporte prioritario" },
];

/* \u2500\u2500\u2500 Pro plan features \u2500\u2500\u2500 */
const proPlanFeatures = [
  { label: "Todos los canales (WhatsApp, IG, FB, Web)" },
  { label: "Conversaciones IA ilimitadas" },
  { label: "1 miembro incluido (+extras)" },
  { label: "GPT-4o, Claude y modelos avanzados" },
  { label: "RAG \u2014 Base de conocimiento" },
  { label: "Anal\u00edticas completas en tiempo real" },
  { label: "Workflows y automatizaciones" },
  { label: "CRM con pipeline visual" },
  { label: "Soporte prioritario" },
  { label: "Seguridad empresarial (E2E)" },
];

/* \u2500\u2500\u2500 Side-by-side feature comparison \u2500\u2500\u2500 */
const featureComparison: Array<{ feature: string; free: string | boolean; pro: string | boolean }> = [
  { feature: "Canales conectados", free: "1 (WhatsApp)", pro: "Todos (WhatsApp, IG, FB, Web, Email)" },
  { feature: "Mensajes IA / mes", free: "50", pro: "Ilimitados" },
  { feature: "Modelos IA", free: "B\u00e1sico", pro: "GPT-4o, Claude, Gemini" },
  { feature: "Miembros del equipo", free: "1", pro: "Ilimitados (+$10/mes c/u)" },
  { feature: "Base de conocimiento (RAG)", free: false, pro: true },
  { feature: "CRM y pipeline", free: false, pro: true },
  { feature: "Workflows / automatizaciones", free: false, pro: true },
  { feature: "Anal\u00edticas y reportes", free: false, pro: true },
  { feature: "Integraciones (+12 nativas)", free: "1", pro: "Todas + API" },
  { feature: "Cobranzas por WhatsApp", free: false, pro: true },
  { feature: "Capacitaci\u00f3n incluida", free: false, pro: true },
  { feature: "Soporte", free: "Email", pro: "Prioritario (chat + email)" },
  { feature: "Seguridad (E2E)", free: "Est\u00e1ndar", pro: "Empresarial" },
];

/* \u2500\u2500\u2500 Detailed features grid \u2500\u2500\u2500 */
const detailedFeatures = [
  { icon: Bot, label: "IA conversacional avanzada", desc: "GPT-4o y Claude respondiendo en todos tus canales autom\u00e1ticamente" },
  { icon: MessageSquare, label: "Conversaciones ilimitadas", desc: "Sin l\u00edmite de mensajes o chats activos simult\u00e1neos" },
  { icon: Globe, label: "WhatsApp, Instagram, Messenger, Web", desc: "Todos los canales desde un inbox unificado" },
  { icon: Users, label: "CRM con pipeline visual", desc: "Gestiona contactos, oportunidades y ciclo de ventas" },
  { icon: Zap, label: "Workflows y automatizaciones", desc: "Reglas y flujos sin c\u00f3digo para cualquier proceso" },
  { icon: BarChart3, label: "Anal\u00edtica en tiempo real", desc: "M\u00e9tricas de equipo, rendimiento IA y satisfacci\u00f3n" },
  { icon: Brain, label: "Base de conocimiento (RAG)", desc: "Tu IA entrenada con tus documentos y datos" },
  { icon: Layers, label: "12+ integraciones + API abierta", desc: "Conecta tus herramientas favoritas sin fricci\u00f3n" },
  { icon: CreditCard, label: "Cobranzas inteligentes", desc: "Cobros automatizados por WhatsApp con seguimiento" },
  { icon: Lock, label: "Seguridad empresarial", desc: "Encriptaci\u00f3n end-to-end y datos protegidos" },
  { icon: GraduationCap, label: "Capacitaci\u00f3n incluida", desc: "Onboarding personalizado para todo tu equipo" },
  { icon: Headphones, label: "Soporte prioritario", desc: "Respuesta r\u00e1pida v\u00eda chat y email en espa\u00f1ol" },
];

/* \u2500\u2500\u2500 Competitor comparison \u2500\u2500\u2500 */
const comparisons = [
  { name: "ChatGPT Plus", price: 20, per: "/usuario/mes", channels: false, crm: false, automations: false, multichannel: false },
  { name: "ChatGPT Team", price: 25, per: "/usuario/mes", channels: false, crm: false, automations: false, multichannel: false },
  { name: "Intercom", price: 39, per: "/asiento/mes", channels: true, crm: false, automations: true, multichannel: false },
  { name: "Zendesk Suite", price: 55, per: "/agente/mes", channels: true, crm: false, automations: true, multichannel: false },
  { name: "WITHMIA Pro", price: 18, per: "/mes (todo incl.)", channels: true, crm: true, automations: true, multichannel: true, highlight: true },
];

const comparisonColumns = [
  { key: "channels" as const, label: "Canales" },
  { key: "crm" as const, label: "CRM" },
  { key: "automations" as const, label: "Automations" },
  { key: "multichannel" as const, label: "Multicanal" },
];

/* \u2500\u2500\u2500 FAQs \u2500\u2500\u2500 */
const faqs = [
  {
    q: "\u00bfQu\u00e9 incluye el Plan Gratuito?",
    a: "Incluye WhatsApp como canal, 1 herramienta conectada, 50 mensajes IA al mes y un asistente b\u00e1sico. Ideal para probar la plataforma sin compromiso.",
  },
  {
    q: "\u00bfNecesito tarjeta de cr\u00e9dito para comenzar?",
    a: "No. El Plan Gratuito no requiere tarjeta de cr\u00e9dito. Solo la necesitar\u00e1s si decides activar WITHMIA Pro.",
  },
  {
    q: "\u00bfQu\u00e9 incluye el primer usuario en Pro?",
    a: "El precio base ($18/mes o $15/mes anual) incluye 1 usuario con acceso completo: IA avanzada (GPT-4o, Claude), todos los canales, CRM, automatizaciones, RAG y m\u00e1s.",
  },
  {
    q: "\u00bfC\u00f3mo funcionan los usuarios adicionales?",
    a: "Cada usuario extra cuesta $10/mes (mensual) o $8/mes (anual). Puedes agregar o quitar miembros en cualquier momento desde tu dashboard.",
  },
  {
    q: "\u00bfPuedo migrar del Plan Gratuito a Pro?",
    a: "S\u00ed, puedes actualizar en cualquier momento desde tu dashboard. Tu historial de conversaciones, contactos y configuraci\u00f3n se mantienen intactos.",
  },
  {
    q: "\u00bfPuedo cancelar en cualquier momento?",
    a: "S\u00ed. Sin contratos de permanencia. Si cancelas, mantienes acceso hasta el final del per\u00edodo de facturaci\u00f3n y luego pasas al plan gratuito.",
  },
  {
    q: "\u00bfHay planes Enterprise para equipos grandes?",
    a: "S\u00ed. Para equipos de +20 usuarios ofrecemos precios especiales, SLA dedicado, onboarding personalizado y m\u00e1s. Cont\u00e1ctanos para una cotizaci\u00f3n.",
  },
  {
    q: "\u00bfQu\u00e9 pasa con mis datos si cancelo?",
    a: "Tus datos se conservan 30 d\u00edas despu\u00e9s de cancelar. Puedes exportarlos en cualquier momento antes de ese plazo.",
  },
];

/* \u2500\u2500\u2500 Animated number \u2500\u2500\u2500 */
function AnimatedPrice({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return <>{display}</>;
}

/* \u2500\u2500\u2500 FAQ Accordion \u2500\u2500\u2500 */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-0" style={{ animationDelay: \`\${index * 80}ms\` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 px-1 text-left group">
        <span className="text-[15px] font-medium text-white/80 group-hover:text-white transition-colors pr-4">{q}</span>
        <ChevronDown className={\`w-4 h-4 text-white/30 shrink-0 transition-transform duration-300 \${open ? "rotate-180 text-amber-400" : ""}\`} />
      </button>
      <div className={\`overflow-hidden transition-all duration-300 \${open ? "max-h-60 opacity-100 pb-5" : "max-h-0 opacity-0"}\`}>
        <p className="text-[13px] text-white/40 leading-relaxed px-1">{a}</p>
      </div>
    </div>
  );
}

/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   MAIN COMPONENT
   \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

export const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [teamSize, setTeamSize] = useState(1);

  const pricing = isAnnual ? PRICING.annual : PRICING.monthly;

  const totalPrice = useMemo(() => {
    return pricing.base + Math.max(0, teamSize - 1) * pricing.perMember;
  }, [pricing, teamSize]);

  const annualSavings = useMemo(() => {
    const m = PRICING.monthly.base + Math.max(0, teamSize - 1) * PRICING.monthly.perMember;
    const a = PRICING.annual.base + Math.max(0, teamSize - 1) * PRICING.annual.perMember;
    return (m - a) * 12;
  }, [teamSize]);

  const sliderPercent = ((teamSize - 1) / 19) * 100;

  /* scroll-reveals */
  const hero = useScrollReveal();
  const cards = useScrollReveal();
  const social = useScrollReveal();
  const calculator = useScrollReveal();
  const featureTable = useScrollReveal();
  const features_sr = useScrollReveal();
  const compare = useScrollReveal();
  const faqSr = useScrollReveal();
  const enterpriseSr = useScrollReveal();
  const cta = useScrollReveal();

  return (
    <section id="precios" className="relative overflow-hidden">

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 HERO \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="relative pt-20 md:pt-28 pb-14 md:pb-18 px-4">
        {/* Aurora mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-amber-500/[0.07] via-violet-500/[0.04] to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-violet-500/[0.05] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute top-40 left-0 w-[350px] h-[350px] bg-cyan-500/[0.04] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        </div>

        <div
          ref={hero.ref}
          className={\`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 \${hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}\`}
        >
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
            <span className="text-gradient">Crece sin l\u00edmites.</span>
          </h1>
          <p className="text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed mb-8">
            Un plan gratuito para explorar y un Pro que escala con tu equipo.
            Sin costos ocultos. Sin sorpresas.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-5 md:gap-8 text-white/25 text-[12px] font-medium">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400/60" /> Sin tarjeta requerida</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400/60" /> Setup en 5 min</span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-violet-400/60" /> Cancela cuando quieras</span>
          </div>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 BILLING TOGGLE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="flex justify-center mb-10 px-4">
        <div className="inline-flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
          <button
            onClick={() => setIsAnnual(false)}
            className={\`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 \${!isAnnual ? "bg-white/10 text-white shadow-sm" : "text-white/35 hover:text-white/50"}\`}
          >
            Mensual
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={\`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center gap-2 \${isAnnual ? "bg-white/10 text-white shadow-sm" : "text-white/35 hover:text-white/50"}\`}
          >
            Anual
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">\u221217%</span>
          </button>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 TWO PLAN CARDS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-8 md:pb-10">
        <div
          ref={cards.ref}
          className={\`max-w-5xl mx-auto transition-all duration-700 delay-100 \${cards.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}\`}
        >
          <div className="grid md:grid-cols-2 gap-6 md:gap-0 items-stretch max-w-4xl mx-auto">

            {/* \u2500\u2500 FREE PLAN \u2500\u2500 */}
            <div className="relative rounded-3xl md:rounded-r-none border border-white/[0.08] md:border-r-0 bg-white/[0.02] backdrop-blur-xl overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="p-7 md:p-9 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.04] border border-white/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white/50" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Plan Gratuito</h3>
                    <p className="text-[12px] text-white/30 mt-0.5">Para explorar la plataforma</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-white/30 font-medium self-start mt-3">$</span>
                    <span className="text-6xl font-bold text-white tracking-tight">0</span>
                    <div className="text-left ml-1.5">
                      <span className="block text-sm text-white/30 font-medium">USD</span>
                      <span className="block text-[11px] text-white/20">/mes</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-white/25 mt-2.5">Gratis para siempre \u00b7 1 usuario</p>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-white/[0.06] mb-6" />

                {/* Features */}
                <div className="space-y-3.5 mb-8 flex-1">
                  {freePlanFeatures.map((f) => (
                    <div key={f.label} className="flex items-center gap-3">
                      {f.included ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-400/10 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0">
                          <Minus className="w-3 h-3 text-white/15" />
                        </div>
                      )}
                      <span className={\`text-[13px] leading-snug \${f.included ? "text-white/60" : "text-white/25"}\`}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick('comenzar_gratis', 'pricing_free_card', 'https://app.withmia.com')}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl border border-white/[0.1] text-[14px] font-semibold text-white/60 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.04] transition-all"
                >
                  Comenzar gratis
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* \u2500\u2500 PRO PLAN \u2500\u2500 */}
            <div className="relative md:scale-[1.03] md:z-10">
              {/* Ambient glow */}
              <div className="absolute -inset-[2px] rounded-3xl md:rounded-l-none bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-amber-500/[0.03] blur-sm" />

              <div className="relative rounded-3xl md:rounded-l-none border border-amber-500/25 bg-gradient-to-b from-amber-500/[0.04] via-white/[0.02] to-white/[0.01] backdrop-blur-xl overflow-hidden flex flex-col">
                {/* Top shimmer */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

                {/* "M\u00c1S POPULAR" ribbon */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-center py-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-black">
                    \u2b50 M\u00e1s popular
                  </span>
                </div>

                <div className="p-7 md:p-9 flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-7">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/25 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">WITHMIA Pro</h3>
                      <p className="text-[12px] text-white/30 mt-0.5">Todo lo que necesitas para crecer</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-7">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-white/30 font-medium self-start mt-3">$</span>
                      <span className="text-6xl font-bold text-white tracking-tight tabular-nums">
                        <AnimatedPrice value={pricing.base} />
                      </span>
                      <div className="text-left ml-1.5">
                        <span className="block text-sm text-white/30 font-medium">USD</span>
                        <span className="block text-[11px] text-white/20">/mes</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-white/25 mt-2.5">
                      1 usuario incluido \u00b7 +\${pricing.perMember}/mes por extra
                    </p>
                    {isAnnual && (
                      <p className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400 mt-2 bg-emerald-400/[0.06] px-3 py-1 rounded-full">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Ahorras \${(PRICING.monthly.base - PRICING.annual.base) * 12} USD al a\u00f1o
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-amber-500/10 mb-6" />

                  {/* Features */}
                  <div className="space-y-3.5 mb-8 flex-1">
                    {proPlanFeatures.map((f) => (
                      <div key={f.label} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-amber-400" />
                        </div>
                        <span className="text-[13px] text-white/70 leading-snug">{f.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <a
                    href="https://app.withmia.com"
                    onClick={() => trackCTAClick('comenzar_pro', 'pricing_pro_card', 'https://app.withmia.com')}
                    className="relative flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-bold text-black hover:brightness-110 transition-all group/btn overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    <span className="relative z-10 flex items-center gap-2">
                      Comenzar con Pro
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                    </span>
                  </a>
                  <p className="text-[11px] text-white/20 text-center mt-3">
                    Sin tarjeta de cr\u00e9dito \u00b7 Cancela cuando quieras
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SOCIAL PROOF STRIP \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-16 md:pb-20">
        <div
          ref={social.ref}
          className={\`max-w-3xl mx-auto transition-all duration-700 delay-200 \${social.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}\`}
        >
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 py-6">
            {[
              { num: "500+", label: "Equipos activos" },
              { num: "2M+", label: "Mensajes procesados" },
              { num: "4.9/5", label: "Satisfacci\u00f3n" },
              { num: "< 2h", label: "Respuesta soporte" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl md:text-2xl font-bold text-white tabular-nums">{s.num}</div>
                <div className="text-[11px] text-white/25 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 TEAM SIZE CALCULATOR \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={calculator.ref}
          className={\`max-w-2xl mx-auto transition-all duration-700 \${calculator.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}\`}
        >
          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

            <div className="p-6 md:p-8">
              <div className="text-center mb-8">
                <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-2">Calculadora de precios</p>
                <h3 className="text-xl font-bold text-white">\u00bfCu\u00e1nto cuesta para tu equipo?</h3>
              </div>

              {/* Price display */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm text-white/30 font-medium self-start mt-3">$</span>
                  <span className="text-6xl md:text-7xl font-bold text-white tracking-tight tabular-nums">
                    <AnimatedPrice value={totalPrice} />
                  </span>
                  <div className="text-left ml-1.5">
                    <span className="block text-sm text-white/30 font-medium">USD</span>
                    <span className="block text-[11px] text-white/20">/mes</span>
                  </div>
                </div>
                <p className="text-[13px] text-white/25 mt-2">
                  {teamSize === 1
                    ? \`\$\${pricing.base}/mes \u2014 1 usuario incluido\`
                    : \`\$\${pricing.base} base + \${teamSize - 1} \u00d7 \$\${pricing.perMember} = \$\${totalPrice}/mes\`}
                </p>
                {isAnnual && annualSavings > 0 && (
                  <p className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400 mt-2 bg-emerald-400/[0.06] px-3 py-1 rounded-full">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Ahorras $<AnimatedPrice value={annualSavings} /> USD al a\u00f1o
                  </p>
                )}
              </div>

              {/* Slider */}
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] text-white/40 font-medium">Tama\u00f1o del equipo</span>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-white/[0.06] px-3 py-1 rounded-lg">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    {teamSize} {teamSize === 1 ? "usuario" : "usuarios"}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-white/[0.06]">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150"
                    style={{ width: \`\${sliderPercent}%\` }}
                  />
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={teamSize}
                    onChange={(e) => setTeamSize(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg shadow-amber-500/20 border-2 border-amber-400 pointer-events-none transition-all duration-150"
                    style={{ left: \`calc(\${sliderPercent}% - 10px)\` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-white/15 font-mono">
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                  <span>15</span>
                  <span>20+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 FREE VS PRO COMPARISON TABLE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={featureTable.ref}
          className={\`max-w-3xl mx-auto transition-all duration-700 \${featureTable.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}\`}
        >
          <div className="text-center mb-12">
            <p className="text-[11px] text-emerald-400/60 uppercase tracking-[0.2em] font-semibold mb-3">Comparaci\u00f3n detallada</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Gratuito vs Pro.{" "}
              <span className="text-white/40">Feature por feature.</span>
            </h2>
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
            {/* Header */}
            <div className="grid grid-cols-[1fr,100px,100px] md:grid-cols-[1.5fr,1fr,1fr] border-b border-white/[0.08] bg-white/[0.03]">
              <div className="px-5 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold">Funcionalidad</div>
              <div className="px-4 py-4 text-[11px] text-white/40 uppercase tracking-wider font-semibold text-center">Gratis</div>
              <div className="px-4 py-4 text-[11px] text-amber-400/70 uppercase tracking-wider font-semibold text-center">Pro</div>
            </div>
            {/* Rows */}
            {featureComparison.map((row, i) => (
              <div
                key={row.feature}
                className="grid grid-cols-[1fr,100px,100px] md:grid-cols-[1.5fr,1fr,1fr] border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                style={{
                  opacity: featureTable.isVisible ? 1 : 0,
                  transform: featureTable.isVisible ? "translateY(0)" : "translateY(6px)",
                  transition: \`all 0.3s ease \${i * 40}ms\`,
                }}
              >
                <div className="px-5 py-3.5 text-[13px] text-white/60 font-medium">{row.feature}</div>
                <div className="px-4 py-3.5 flex items-center justify-center">
                  {row.free === true ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-400/10 flex items-center justify-center"><Check className="w-3 h-3 text-emerald-400" /></div>
                  ) : row.free === false ? (
                    <div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center"><Minus className="w-3 h-3 text-white/15" /></div>
                  ) : (
                    <span className="text-[12px] text-white/35 text-center">{row.free}</span>
                  )}
                </div>
                <div className="px-4 py-3.5 flex items-center justify-center">
                  {row.pro === true ? (
                    <div className="w-5 h-5 rounded-full bg-amber-400/15 flex items-center justify-center"><Check className="w-3 h-3 text-amber-400" /></div>
                  ) : row.pro === false ? (
                    <div className="w-5 h-5 rounded-full bg-white/[0.04] flex items-center justify-center"><Minus className="w-3 h-3 text-white/15" /></div>
                  ) : (
                    <span className="text-[12px] text-amber-400/70 font-medium text-center">{row.pro}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 FEATURES GRID \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={features_sr.ref}
          className={\`max-w-5xl mx-auto transition-all duration-700 \${features_sr.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}\`}
        >
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
                  style={{
                    opacity: features_sr.isVisible ? 1 : 0,
                    transform: features_sr.isVisible ? "translateY(0)" : "translateY(12px)",
                    transition: \`all 0.5s ease \${i * 60}ms\`,
                  }}
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

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 COMPETITOR COMPARISON \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={compare.ref}
          className={\`max-w-4xl mx-auto transition-all duration-700 \${compare.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}\`}
        >
          <div className="text-center mb-12">
            <p className="text-[11px] text-violet-400/60 uppercase tracking-[0.2em] font-semibold mb-3">vs Competencia</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              \u00bfPor qu\u00e9 WITHMIA?{" "}
              <span className="text-white/40">Compara y decide.</span>
            </h2>
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
            <div className="hidden md:grid grid-cols-[1.5fr,0.7fr,repeat(4,0.7fr)] gap-0 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="px-6 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold">Plataforma</div>
              <div className="px-4 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold text-center">Precio</div>
              {comparisonColumns.map((col) => (
                <div key={col.key} className="px-4 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold text-center">{col.label}</div>
              ))}
            </div>
            {comparisons.map((c, i) => (
              <div
                key={c.name}
                className={\`grid grid-cols-1 md:grid-cols-[1.5fr,0.7fr,repeat(4,0.7fr)] gap-0 border-b border-white/[0.04] last:border-0 transition-colors \${c.highlight ? "bg-amber-500/[0.04] border-l-2 md:border-l-2 border-l-amber-400" : "hover:bg-white/[0.02]"}\`}
                style={{
                  opacity: compare.isVisible ? 1 : 0,
                  transform: compare.isVisible ? "translateX(0)" : "translateX(-12px)",
                  transition: \`all 0.4s ease \${i * 80}ms\`,
                }}
              >
                <div className="px-6 py-4 flex items-center gap-3">
                  {c.highlight && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 hidden md:block" />}
                  <span className={\`text-[14px] font-semibold \${c.highlight ? "text-amber-400" : "text-white/60"}\`}>{c.name}</span>
                  {c.highlight && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 md:inline hidden">T\u00fa</span>
                  )}
                </div>
                <div className="px-6 md:px-4 py-2 md:py-4 flex items-center md:justify-center">
                  <span className="md:hidden text-[11px] text-white/20 mr-2">Precio:</span>
                  <span className={\`text-[15px] font-bold tabular-nums \${c.highlight ? "text-amber-400" : "text-white/50"}\`}>\${c.price}</span>
                  <span className="text-[10px] text-white/20 ml-1">{c.per}</span>
                </div>
                {comparisonColumns.map((col) => (
                  <div key={col.key} className="px-6 md:px-4 py-2 md:py-4 flex items-center md:justify-center">
                    <span className="md:hidden text-[11px] text-white/20 mr-2">{col.label}:</span>
                    {c[col.key] ? (
                      <div className={\`w-5 h-5 rounded-full flex items-center justify-center \${c.highlight ? "bg-amber-400/15" : "bg-emerald-400/10"}\`}>
                        <Check className={\`w-3 h-3 \${c.highlight ? "text-amber-400" : "text-emerald-400"}\`} />
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

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 FAQ \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={faqSr.ref}
          className={\`max-w-2xl mx-auto transition-all duration-700 \${faqSr.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}\`}
        >
          <div className="text-center mb-10">
            <p className="text-[11px] text-cyan-400/60 uppercase tracking-[0.2em] font-semibold mb-3">Preguntas frecuentes</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              \u00bfTienes dudas?{" "}
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

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 ENTERPRISE BAR \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-16 md:pb-20">
        <div
          ref={enterpriseSr.ref}
          className={\`max-w-4xl mx-auto transition-all duration-700 \${enterpriseSr.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}\`}
        >
          <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-r from-violet-500/[0.04] via-white/[0.02] to-violet-500/[0.04] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-white">\u00bfM\u00e1s de 20 usuarios?</h3>
                <p className="text-[13px] text-white/35 mt-0.5">Planes Enterprise con SLA dedicado, precios especiales y onboarding personalizado.</p>
              </div>
            </div>
            <Link
              to="/contacto"
              onClick={() => trackCTAClick('enterprise_contact', 'pricing_enterprise', '/contacto')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-500/20 text-[14px] font-semibold text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all whitespace-nowrap group"
            >
              Contactar ventas
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 BOTTOM CTA \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={cta.ref}
          className={\`max-w-4xl mx-auto transition-all duration-700 \${cta.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}\`}
        >
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-violet-500/[0.06] to-cyan-500/[0.04]" />
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-violet-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative border border-white/[0.08] rounded-3xl p-10 md:p-14 text-center">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Comienza hoy. Sin riesgos.
              </h2>
              <p className="text-[14px] text-white/40 max-w-md mx-auto mb-8 leading-relaxed">
                \u00danete a los +500 equipos que ya automatizan su atenci\u00f3n al cliente con IA.
                Empieza gratis o ve directo a Pro.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick('comenzar_gratis', 'pricing_bottom', 'https://app.withmia.com')}
                  className="relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-semibold text-black hover:brightness-110 transition-all group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10 flex items-center gap-2">
                    Comenzar gratis
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
                <Link
                  to="/contacto"
                  onClick={() => trackCTAClick('hablar_ventas', 'pricing_bottom', '/contacto')}
                  className="flex items-center justify-center px-8 py-3.5 rounded-xl border border-white/[0.1] text-[14px] font-medium text-white/60 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.03] transition-all"
                >
                  Hablar con ventas
                </Link>
              </div>

              {/* Guarantee badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/[0.06] border border-emerald-400/10 mb-6">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-[12px] text-emerald-400 font-medium">Garant\u00eda de satisfacci\u00f3n \u2014 cancela sin costo en cualquier momento</span>
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-white/20 text-[11px]">
                <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Datos seguros</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Soporte 24/7</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="w-3 h-3" /> +500 equipos activos</span>
              </div>

              <p className="text-[12px] text-white/15 mt-6">
                \u00bfDudas sobre tu suscripci\u00f3n?{" "}
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
`;

fs.writeFileSync(path.join(__dirname, 'src/components/Pricing.tsx'), content, 'utf8');
const lines = content.split('\\n').length;
console.log('Written ' + lines + ' lines');
`;

fs.writeFileSync(path.join(__dirname, 'src/components/Pricing.tsx'), content, 'utf8');
const lines = content.split('\n').length;
console.log('Written ' + lines + ' lines');
