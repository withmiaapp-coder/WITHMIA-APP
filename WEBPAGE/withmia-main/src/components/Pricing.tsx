import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useScrollReveal } from "@/hooks/useAnimations";
import {
  Check,
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { trackCTAClick } from "@/lib/analytics";

/* ═══════════════════════════════════════════════════════════
   PRICING LOGIC (mirrors SubscriptionController.php)
   Base: $18/mo (monthly) · $15/mo (annual)
   Extra member: $10/mo (monthly) · $8/mo (annual)
   1st user included in base price
   ═══════════════════════════════════════════════════════════ */

const PRICING = {
  monthly: { base: 18, perMember: 10 },
  annual: { base: 15, perMember: 8 },
} as const;

const features = [
  { icon: Bot, label: "IA conversacional en todos los canales", desc: "GPT avanzado respondiendo automáticamente" },
  { icon: MessageSquare, label: "Conversaciones ilimitadas", desc: "Sin límite de mensajes o chats activos" },
  { icon: Layers, label: "WhatsApp, Instagram, Messenger, Web, Email", desc: "6 canales conectados desde un inbox" },
  { icon: Users, label: "CRM con pipeline visual", desc: "Gestiona contactos y oportunidades" },
  { icon: Zap, label: "Workflows y automatizaciones", desc: "Reglas y flujos sin código" },
  { icon: BarChart3, label: "Analítica y reportes en tiempo real", desc: "Métricas de equipo y rendimiento IA" },
  { icon: Layers, label: "12+ integraciones nativas + API abierta", desc: "Conecta tus herramientas favoritas" },
  { icon: CreditCard, label: "Gestión de cobranzas inteligente", desc: "Cobros automatizados por WhatsApp" },
  { icon: GraduationCap, label: "Capacitación incluida", desc: "Onboarding y entrenamiento personalizado" },
  { icon: Headphones, label: "Soporte prioritario", desc: "Respuesta rápida vía chat y email" },
];

const comparisons = [
  { name: "ChatGPT Plus", price: 20, per: "/usuario/mes", channels: false, crm: false, automations: false, multichannel: false },
  { name: "ChatGPT Business", price: 25, per: "/usuario/mes", channels: false, crm: false, automations: false, multichannel: false },
  { name: "Intercom", price: 39, per: "/asiento/mes", channels: true, crm: false, automations: true, multichannel: false },
  { name: "Zendesk Suite", price: 55, per: "/agente/mes", channels: true, crm: false, automations: true, multichannel: false },
  { name: "WITHMIA", price: 18, per: "/mes", channels: true, crm: true, automations: true, multichannel: true, highlight: true },
];

const comparisonColumns = [
  { key: "channels" as const, label: "Canales integrados" },
  { key: "crm" as const, label: "CRM incluido" },
  { key: "automations" as const, label: "Automatizaciones" },
  { key: "multichannel" as const, label: "Multicanal unificado" },
];

const faqs = [
  {
    q: "¿Necesito tarjeta de crédito para comenzar?",
    a: "No. Puedes comenzar tu prueba gratuita sin tarjeta de crédito. Solo la necesitarás cuando decidas activar tu suscripción.",
  },
  {
    q: "¿Qué incluye el primer usuario?",
    a: "El precio base ($18/mes o $15/mes anual) incluye 1 usuario con acceso completo a todas las funcionalidades: IA, canales, CRM, automatizaciones y más.",
  },
  {
    q: "¿Cómo funcionan los usuarios adicionales?",
    a: "Cada usuario extra cuesta $10/mes (mensual) o $8/mes (anual). Puedes agregar o quitar usuarios en cualquier momento desde tu dashboard.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí. No hay contratos de permanencia. Si cancelas, mantienes acceso hasta el final de tu período de facturación.",
  },
  {
    q: "¿Hay descuentos para equipos grandes?",
    a: "Sí. Para equipos de más de 20 usuarios ofrecemos planes Enterprise con precios especiales. Contáctanos para una cotización personalizada.",
  },
  {
    q: "¿Qué pasa con mis datos si cancelo?",
    a: "Tus datos se conservan por 30 días después de cancelar. Puedes exportarlos en cualquier momento antes de ese plazo.",
  },
];

/* ─── Animated number ─── */
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

/* ─── FAQ Accordion item ─── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b border-white/[0.06] last:border-0"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 px-1 text-left group"
      >
        <span className="text-[15px] font-medium text-white/80 group-hover:text-white transition-colors pr-4">
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-amber-400" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-40 opacity-100 pb-5" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-[13px] text-white/40 leading-relaxed px-1">{a}</p>
      </div>
    </div>
  );
}

export const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [teamSize, setTeamSize] = useState(1);

  const pricing = isAnnual ? PRICING.annual : PRICING.monthly;

  const totalPrice = useMemo(() => {
    return pricing.base + Math.max(0, teamSize - 1) * pricing.perMember;
  }, [pricing, teamSize]);

  const annualSavings = useMemo(() => {
    const monthlyTotal = PRICING.monthly.base + Math.max(0, teamSize - 1) * PRICING.monthly.perMember;
    const annualTotal = PRICING.annual.base + Math.max(0, teamSize - 1) * PRICING.annual.perMember;
    return (monthlyTotal - annualTotal) * 12;
  }, [teamSize]);

  const sliderPercent = ((teamSize - 1) / 19) * 100;

  /* section scroll-reveals */
  const hero = useScrollReveal();
  const card = useScrollReveal();
  const features_sr = useScrollReveal();
  const compare = useScrollReveal();
  const faq = useScrollReveal();
  const cta = useScrollReveal();

  return (
    <section id="precios" className="relative overflow-hidden">

      {/* ════════════════ HERO ════════════════ */}
      <div className="relative pt-20 md:pt-28 pb-16 md:pb-20 px-4">
        {/* Aurora mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-amber-500/[0.07] via-violet-500/[0.04] to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-violet-500/[0.05] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute top-40 left-0 w-[350px] h-[350px] bg-cyan-500/[0.04] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        </div>

        <div
          ref={hero.ref}
          className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${
            hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold backdrop-blur-sm mb-6">
            <div className="relative">
              <Sparkles className="w-4 h-4" />
              <Sparkles className="w-4 h-4 absolute inset-0 animate-ping opacity-30" />
            </div>
            Precio simple, valor real
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5">
            Un solo plan.
            <br />
            <span className="text-gradient">Todo incluido.</span>
          </h1>
          <p className="text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed mb-8">
            Sin tiers confusos, sin funciones bloqueadas. Un precio transparente
            que escala con tu equipo.
          </p>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 md:gap-8 text-white/25 text-[12px] font-medium">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400/60" />
              Sin tarjeta requerida
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400/60" />
              Setup en 5 min
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-violet-400/60" />
              Cancela cuando quieras
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════ MAIN PRICING CARD ════════════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={card.ref}
          className={`max-w-4xl mx-auto transition-all duration-700 delay-100 ${
            card.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Outer glow wrapper */}
          <div className="relative group">
            {/* Ambient glow */}
            <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-amber-500/20 via-amber-500/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
              {/* Shimmer border top */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

              {/* ── Header: Plan + Toggle + Price ── */}
              <div className="p-6 md:p-10">
                {/* Plan name row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-xl font-bold text-white">WITHMIA Pro</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          Plan único
                        </span>
                      </div>
                      <p className="text-[12px] text-white/30 mt-0.5">Todo lo que necesitas para crecer</p>
                    </div>
                  </div>

                  {/* Billing toggle — pill style */}
                  <div className="inline-flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                    <button
                      onClick={() => setIsAnnual(false)}
                      className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                        !isAnnual
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-white/35 hover:text-white/50"
                      }`}
                    >
                      Mensual
                    </button>
                    <button
                      onClick={() => setIsAnnual(true)}
                      className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center gap-2 ${
                        isAnnual
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-white/35 hover:text-white/50"
                      }`}
                    >
                      Anual
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                        −17%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Price display — big centered */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm text-white/30 font-medium self-start mt-3">$</span>
                    <span className="text-6xl md:text-7xl font-bold text-white tracking-tight tabular-nums">
                      <AnimatedPrice value={totalPrice} />
                    </span>
                    <div className="text-left ml-1">
                      <span className="block text-sm text-white/30 font-medium">USD</span>
                      <span className="block text-[11px] text-white/20">/mes</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-white/25 mt-2">
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

                {/* Team size slider — premium */}
                <div className="max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] text-white/40 font-medium">Tamaño del equipo</span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-white/[0.06] px-3 py-1 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      {teamSize} {teamSize === 1 ? "usuario" : "usuarios"}
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/[0.06]">
                    {/* Filled track */}
                    <div
                      className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-150"
                      style={{ width: `${sliderPercent}%` }}
                    />
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {/* Custom thumb */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg shadow-amber-500/20 border-2 border-amber-400 pointer-events-none transition-all duration-150"
                      style={{ left: `calc(${sliderPercent}% - 10px)` }}
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

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-10 max-w-md mx-auto">
                  <a
                    href="https://app.withmia.com"
                    onClick={() => trackCTAClick('comenzar_gratis', 'pricing_card', 'https://app.withmia.com')}
                    className="relative flex items-center justify-center gap-2 w-full sm:flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-semibold text-black hover:brightness-110 transition-all group overflow-hidden"
                  >
                    {/* Shimmer sweep */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative z-10 flex items-center gap-2">
                      Comenzar gratis
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </a>
                  <Link
                    to="/contacto"
                    onClick={() => trackCTAClick('agendar_demo', 'pricing_card', '/contacto')}
                    className="flex items-center justify-center w-full sm:flex-1 px-6 py-3.5 rounded-xl border border-white/[0.1] text-[14px] font-medium text-white/60 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.03] transition-all"
                  >
                    Agendar demo
                  </Link>
                </div>
                <p className="text-[11px] text-white/20 text-center mt-4">
                  Sin tarjeta de crédito · Cancela cuando quieras · Setup en 5 minutos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════ FEATURES GRID ════════════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={features_sr.ref}
          className={`max-w-5xl mx-auto transition-all duration-700 ${
            features_sr.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="text-center mb-12">
            <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">
              Todo incluido en cada plan
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Cada funcionalidad.{" "}
              <span className="text-white/40">Sin costos ocultos.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition-all duration-300"
                  style={{
                    animationDelay: `${i * 60}ms`,
                    opacity: features_sr.isVisible ? 1 : 0,
                    transform: features_sr.isVisible ? "translateY(0)" : "translateY(12px)",
                    transition: `all 0.5s ease ${i * 60}ms`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/10 flex items-center justify-center shrink-0 group-hover:border-amber-500/25 transition-colors">
                      <Icon className="w-4 h-4 text-amber-400/70 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-white/80 leading-tight mb-1 group-hover:text-white transition-colors">
                        {f.label}
                      </h4>
                      <p className="text-[12px] text-white/25 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════ COMPARISON TABLE ════════════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={compare.ref}
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            compare.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="text-center mb-12">
            <p className="text-[11px] text-violet-400/60 uppercase tracking-[0.2em] font-semibold mb-3">
              Comparativa
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              ¿Por qué WITHMIA?{" "}
              <span className="text-white/40">Compara y decide.</span>
            </h2>
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1.5fr,0.7fr,repeat(4,0.7fr)] gap-0 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="px-6 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold">Plataforma</div>
              <div className="px-4 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold text-center">Precio</div>
              {comparisonColumns.map((col) => (
                <div key={col.key} className="px-4 py-4 text-[11px] text-white/30 uppercase tracking-wider font-semibold text-center">
                  {col.label}
                </div>
              ))}
            </div>
            {/* Table rows */}
            {comparisons.map((c, i) => (
              <div
                key={c.name}
                className={`grid grid-cols-1 md:grid-cols-[1.5fr,0.7fr,repeat(4,0.7fr)] gap-0 border-b border-white/[0.04] last:border-0 transition-colors ${
                  c.highlight
                    ? "bg-amber-500/[0.04] border-l-2 md:border-l-2 border-l-amber-400"
                    : "hover:bg-white/[0.02]"
                }`}
                style={{
                  opacity: compare.isVisible ? 1 : 0,
                  transform: compare.isVisible ? "translateX(0)" : "translateX(-12px)",
                  transition: `all 0.4s ease ${i * 80}ms`,
                }}
              >
                {/* Name */}
                <div className="px-6 py-4 flex items-center gap-3">
                  {c.highlight && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 hidden md:block" />}
                  <span className={`text-[14px] font-semibold ${c.highlight ? "text-amber-400" : "text-white/60"}`}>
                    {c.name}
                  </span>
                  {c.highlight && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 md:inline hidden">
                      Tú
                    </span>
                  )}
                </div>
                {/* Price */}
                <div className="px-6 md:px-4 py-2 md:py-4 flex items-center md:justify-center">
                  <span className="md:hidden text-[11px] text-white/20 mr-2">Precio:</span>
                  <span className={`text-[15px] font-bold tabular-nums ${c.highlight ? "text-amber-400" : "text-white/50"}`}>
                    ${c.price}
                  </span>
                  <span className="text-[10px] text-white/20 ml-1">{c.per}</span>
                </div>
                {/* Feature columns */}
                {comparisonColumns.map((col) => (
                  <div key={col.key} className="px-6 md:px-4 py-2 md:py-4 flex items-center md:justify-center">
                    <span className="md:hidden text-[11px] text-white/20 mr-2">{col.label}:</span>
                    {c[col.key] ? (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        c.highlight ? "bg-amber-400/15" : "bg-emerald-400/10"
                      }`}>
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

      {/* ════════════════ FAQ ════════════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={faq.ref}
          className={`max-w-2xl mx-auto transition-all duration-700 ${
            faq.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="text-center mb-10">
            <p className="text-[11px] text-cyan-400/60 uppercase tracking-[0.2em] font-semibold mb-3">
              Preguntas frecuentes
            </p>
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

      {/* ════════════════ BOTTOM CTA ════════════════ */}
      <div className="px-4 pb-20 md:pb-28">
        <div
          ref={cta.ref}
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            cta.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="relative rounded-3xl overflow-hidden">
            {/* Gradient mesh bg */}
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
                Únete a equipos que ya automatizan su atención al cliente con IA.
                Prueba gratis, sin tarjeta requerida.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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

              {/* Trust strip */}
              <div className="flex items-center justify-center gap-6 mt-8 text-white/20 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Datos seguros
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Soporte 24/7
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="w-3 h-3" /> +500 equipos activos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};
