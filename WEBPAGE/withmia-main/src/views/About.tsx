import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowRight,
  Shield,
  Clock,
  BadgeCheck,
  Code2,
  Heart,
  Building2,
  MapPin,
  FileCheck,
  CalendarDays,
  Zap,
  Timer,
  Workflow,
  Lock,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Brain,
  LineChart,
  User,
  Linkedin,
  Rocket,
  Target,
  Lightbulb,
  ChevronRight,
  ExternalLink,
  Globe,
  Layers,
  Cpu,
  Sparkles,
  CheckCircle2,
  Users,
  Bot,
  Quote,
  Play,
} from "lucide-react";
import { Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";

/* ═══════════════════════════════════════════════════════════
   Hooks
   ═══════════════════════════════════════════════════════════ */

/** Scroll-reveal hook matching PlatformHero pattern */
function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

/** Count-up with easeOutCubic (same as PlatformHero) */
function useCountUp(target: number, duration = 2000, start = false, decimals = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    let raf: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration, decimals]);
  return count;
}

/** Reveal wrapper matching site-wide pattern */
const Reveal = ({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const translate =
    direction === "left"
      ? "translate-x-8"
      : direction === "right"
      ? "-translate-x-8"
      : "translate-y-10";
  return (
    <div
      ref={ref}
      className={`transition-all duration-[800ms] ease-out ${
        vis
          ? "opacity-100 translate-y-0 translate-x-0"
          : `opacity-0 ${translate}`
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════ */

const heroMetrics = [
  { icon: Users, value: 200, suffix: "+", label: "Empresas activas", color: "#a78bfa" },
  { icon: MessageSquare, value: 1.2, suffix: "M+", label: "Mensajes procesados", color: "#22d3ee", decimals: 1 },
  { icon: Bot, value: 97, suffix: "%", label: "Precisión de la IA", color: "#fbbf24" },
  { icon: Clock, value: 2, suffix: "s", prefix: "<", label: "Tiempo de respuesta", color: "#34d399" },
];

const differentiators = [
  {
    icon: Zap,
    title: "Ejecución real",
    desc: "La IA no solo conversa: descuenta stock, bloquea horarios y procesa cobranzas en tiempo real.",
    color: "#fbbf24",
    tag: "Core",
  },
  {
    icon: Workflow,
    title: "No-Code",
    desc: "Despliega IA avanzada en menos de 1 hora, sin equipo técnico.",
    color: "#a78bfa",
    tag: "Setup",
  },
  {
    icon: Timer,
    title: "Golden Window",
    desc: "Respuesta automática en <5 min para capturar cada lead en su momento de mayor interés.",
    color: "#22d3ee",
    tag: "Speed",
  },
  {
    icon: Lock,
    title: "IP 100% propia",
    desc: "Todo el código fuente es nuestro, con prompts diseñados para el mercado LATAM.",
    color: "#f472b6",
    tag: "Security",
  },
  {
    icon: Cpu,
    title: "Multi-modelo",
    desc: "GPT-4o, Claude y modelos propios. La mejor IA para cada tipo de conversación.",
    color: "#34d399",
    tag: "AI",
  },
  {
    icon: Layers,
    title: "Todo-en-uno",
    desc: "Inbox, CRM, cobranzas, analytics y automatización. Una sola plataforma, un solo precio.",
    color: "#fb923c",
    tag: "Platform",
  },
];

const values = [
  {
    icon: Heart,
    title: "Servicio",
    desc: "Customer Success enfocado en adopción real y acompañamiento continuo.",
    color: "#f472b6",
  },
  {
    icon: Shield,
    title: "Privacidad",
    desc: "Infraestructura AWS, empresa SII-verificada. Datos protegidos de extremo a extremo.",
    color: "#22d3ee",
  },
  {
    icon: Lightbulb,
    title: "Innovación",
    desc: "Arquitectura propietaria de IA Generativa que evoluciona con feedback real.",
    color: "#fbbf24",
  },
  {
    icon: Target,
    title: "Transparencia",
    desc: "Pricing claro, documentación abierta, acceso directo al equipo fundador.",
    color: "#a78bfa",
  },
];

const timeline = [
  {
    year: "2024",
    title: "Origen",
    desc: "Nace como proyecto interno en Atlantis Producciones para resolver ineficiencias operativas en PYMEs.",
    accent: "#a78bfa",
  },
  {
    year: "Ene 2025",
    title: "Pivote a SaaS",
    desc: "De agentes manuales a plataforma propietaria No-Code en AWS con arquitectura multi-tenant.",
    accent: "#22d3ee",
  },
  {
    year: "Jul 2025",
    title: "Constitución legal",
    desc: "MIA Marketing & Intelligence Artificial SpA se constituye en Providencia, Santiago.",
    accent: "#fbbf24",
  },
  {
    year: "2025 – Hoy",
    title: "Crecimiento",
    desc: "Primeros clientes B2B en Chile con modelo Product-Led Growth e iteración continua.",
    accent: "#34d399",
  },
];

const founderSkills = [
  { icon: Code2, label: "Full-Stack", color: "#22d3ee" },
  { icon: Brain, label: "UX Conductual", color: "#a78bfa" },
  { icon: LineChart, label: "Estrategia SaaS", color: "#fbbf24" },
];

const companyDetails = [
  { icon: FileCheck, label: "RUT", value: "78.199.687-4", mono: true },
  {
    icon: BarChart3,
    label: "Actividad",
    value: "Consultoría de informática y gestión de instalaciones informáticas",
  },
  {
    icon: MapPin,
    label: "Domicilio",
    value: "Antonio Bellet 193, Of. 1210, Providencia, Santiago",
  },
  { icon: CalendarDays, label: "Inicio", value: "14 de julio de 2025" },
];

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */
const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVis, setHeroVis] = useState(false);
  const metricsRef = useRef<HTMLDivElement>(null);
  const [metricsVis, setMetricsVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setHeroVis(true);
      },
      { threshold: 0.05 }
    );
    if (heroRef.current) obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setMetricsVis(true);
      },
      { threshold: 0.3 }
    );
    if (metricsRef.current) obs.observe(metricsRef.current);
    return () => obs.disconnect();
  }, []);

  const [imgError, setImgError] = useState(false);

  return (
    <div className="min-h-screen">
      {/* ══════════════════════════════════════════════════════
          SECTION 1 — HERO
          ══════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative pt-28 md:pt-36 pb-6 px-4 overflow-hidden">
        {/* ── Aurora mesh background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full animate-gas opacity-60"
            style={{
              background: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 65%)",
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full animate-gas opacity-50"
            style={{
              background: "radial-gradient(circle, rgba(251,191,36,0.10) 0%, transparent 65%)",
              animationDelay: "-8s",
            }}
          />
          <div
            className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full animate-gas opacity-40"
            style={{
              background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 65%)",
              animationDelay: "-14s",
            }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* ── Copy block ── */}
          <div className="text-center mb-14 md:mb-16">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-[11px] text-violet-300 font-semibold tracking-wide mb-8 transition-all duration-700 ${
                heroVis
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-4"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              Sobre WITHMIA
            </div>

            {/* Headline */}
            <h1
              className={`text-[2rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.08] mb-7 transition-all duration-700 delay-100 ${
                heroVis
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <span className="text-white">IA conversacional</span>
              <br />
              <span className="relative inline-block">
                <span className="text-gradient">hecha para PYMEs</span>
                {/* Animated underline */}
                <span
                  className="absolute -bottom-2 left-0 h-[3px] rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 delay-700"
                  style={{ width: heroVis ? "100%" : "0%" }}
                />
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className={`text-[15px] md:text-[17px] text-white/50 max-w-[620px] mx-auto leading-[1.75] mb-10 transition-all duration-700 delay-200 ${
                heroVis
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              Automatizar ventas, atención y cobranzas ya no requiere miles de
              dólares ni un equipo de ingenieros. WITHMIA es la plataforma
              omnicanal que nació en Chile para resolver eso.
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-col sm:flex-row gap-3 justify-center items-center mb-6 transition-all duration-700 delay-300 ${
                heroVis
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <a
                href="https://app.withmia.com"
                onClick={() =>
                  trackCTAClick(
                    "probar_gratis_hero",
                    "about_hero",
                    "https://app.withmia.com"
                  )
                }
                className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)]"
              >
                {/* Shimmer sweep */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative">Probar gratis 14 días</span>
                <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
              </a>
              <Link
                to="/contacto"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-transparent text-white/80 font-semibold text-sm border border-white/15 hover:border-white/30 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300"
              >
                Hablar con nosotros
              </Link>
            </div>

            {/* Fine print */}
            <p
              className={`text-[11px] text-white/25 tracking-wide transition-all duration-700 delay-400 ${
                heroVis ? "opacity-100" : "opacity-0"
              }`}
            >
              Sin tarjeta de crédito · Setup en 5 minutos · Cancela cuando
              quieras
            </p>
          </div>

          {/* ── Animated metrics ── */}
          <div
            ref={metricsRef}
            className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-10 transition-all duration-700 delay-300 ${
              metricsVis
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            {heroMetrics.map((m, i) => {
              const MIcon = m.icon;
              const count = useCountUp(
                m.value,
                2200,
                metricsVis,
                m.decimals ?? 0
              );
              return (
                <div
                  key={i}
                  className="group relative flex items-center gap-4 py-5 px-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  {/* Gradient accent on hover */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 30% 50%, ${m.color}08, transparent 70%)`,
                    }}
                  />
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative"
                    style={{
                      backgroundColor: `${m.color}10`,
                      border: `1px solid ${m.color}18`,
                    }}
                  >
                    <MIcon
                      className="w-[18px] h-[18px]"
                      style={{ color: m.color }}
                    />
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-extrabold text-white leading-none mb-0.5 font-mono tabular-nums">
                      {m.prefix ?? ""}
                      {count}
                      {m.suffix}
                    </p>
                    <p className="text-[11px] text-white/35 font-medium">
                      {m.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — THE PROBLEM / SOLUTION (Asymmetric split)
          ══════════════════════════════════════════════════════ */}
      <section className="pt-20 md:pt-28 pb-16 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/20 text-[11px] text-red-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
              <Target className="w-3.5 h-3.5" />
              El problema que resolvemos
            </div>
            <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-4">
              Las PYMEs pierden ventas por
              <br className="hidden md:block" />
              <span className="text-gradient"> responder tarde</span>
            </h2>
            <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto leading-relaxed">
              WhatsApp personal. Excel como CRM. Un bot genérico para cada canal.
              70% de los leads se pierden en los primeros 5 minutos.
            </p>
          </Reveal>

          {/* Problem → Solution cards */}
          <div className="grid lg:grid-cols-2 gap-5">
            {/* PROBLEM card */}
            <Reveal>
              <div className="group relative h-full p-7 md:p-8 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-0.5 border border-red-500/[0.08]"
                style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.04), transparent 60%)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/15 transition-transform duration-500 group-hover:scale-110">
                    <TrendingUp className="w-5 h-5 text-red-400/80 rotate-180" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Antes de WITHMIA</h3>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-red-400/50">
                      El problema
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {[
                    "Respuestas a leads después de horas (o nunca)",
                    "5-7 herramientas desconectadas sin contexto",
                    "CRM en Excel, seguimiento manual",
                    "Bots genéricos que frustran a los clientes",
                    "Cobranza olvidada, ingresos perdidos",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400/50 mt-2 shrink-0" />
                      <span className="text-[13px] text-white/40 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* SOLUTION card */}
            <Reveal delay={100}>
              <div className="group relative h-full p-7 md:p-8 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-0.5 border border-emerald-500/[0.08]"
                style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.04), transparent 60%)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15 transition-transform duration-500 group-hover:scale-110">
                    <Rocket className="w-5 h-5 text-emerald-400/80" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Con WITHMIA</h3>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-emerald-400/50">
                      La solución
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {[
                    "IA responde en <5 segundos, 24/7, en tu tono",
                    "Una sola plataforma: inbox, CRM, bot, analytics",
                    "CRM inteligente con seguimiento automático",
                    "IA que ejecuta: agenda, cobra, descuenta stock",
                    "Cobranza automatizada con seguimiento proactivo",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-400/70 shrink-0 mt-0.5"
                      />
                      <span className="text-[13px] text-white/50 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Key numbers strip */}
          <Reveal delay={200} className="mt-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { num: "5+", label: "Canales integrados", color: "#a78bfa" },
                { num: "<5 min", label: "Respuesta automática IA", color: "#fbbf24" },
                { num: "100%", label: "IP propia, código nuestro", color: "#22d3ee" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] p-5 text-center transition-all duration-300"
                >
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${item.color}06, transparent 70%)`,
                    }}
                  />
                  <span className="block text-xl md:text-2xl font-bold text-white mb-1">
                    {item.num}
                  </span>
                  <span className="text-[11px] text-white/25 uppercase tracking-wider font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — QUÉ NOS DIFERENCIA (Bento grid with colored accents)
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/60 mb-4">
              Nuestra diferencia
            </p>
            <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-5">
              Construida desde cero
              <br className="hidden md:block" />
              <span className="text-gradient"> para el mercado LATAM</span>
            </h2>
            <p className="text-[14px] text-white/30 max-w-md mx-auto leading-relaxed">
              No somos un wrapper de ChatGPT. WITHMIA es tecnología propietaria
              diseñada para las necesidades reales de PYMEs en Latinoamérica.
            </p>
          </Reveal>

          {/* Bento grid — 2 featured + 4 regular */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {differentiators.map((d, i) => {
              const Icon = d.icon;
              const isFeatured = i < 2;
              return (
                <Reveal
                  key={d.title}
                  delay={i * 70}
                  className={isFeatured ? "lg:row-span-1" : ""}
                >
                  <div
                    className="group relative h-full p-6 md:p-7 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${d.color}06, transparent 60%)`,
                      border: `1px solid ${d.color}12`,
                    }}
                  >
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${d.color}40, transparent)`,
                      }}
                    />

                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${d.color}08, transparent 70%)`,
                      }}
                    />

                    <div className="flex items-center justify-between mb-5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110"
                        style={{
                          backgroundColor: `${d.color}12`,
                          border: `1px solid ${d.color}20`,
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: `${d.color}cc` }}
                        />
                      </div>
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                        style={{
                          backgroundColor: `${d.color}0a`,
                          color: `${d.color}80`,
                          border: `1px solid ${d.color}15`,
                        }}
                      >
                        {d.tag}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-bold text-white mb-2 group-hover:text-white transition-colors">
                      {d.title}
                    </h3>
                    <p className="text-[13px] text-white/30 leading-[1.7] group-hover:text-white/45 transition-colors duration-500">
                      {d.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — FUNDADOR (Premium profile)
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-4">
              Quién está detrás
            </p>
            <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-5">
              Un fundador técnico con
              <br className="hidden md:block" />
              <span className="text-gradient-purple"> visión de negocio</span>
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div
              className="relative rounded-2xl overflow-hidden border border-white/[0.06]"
              style={{
                background: "linear-gradient(135deg, rgba(167,139,250,0.03), transparent 60%)",
              }}
            >
              {/* Top accent */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

              <div className="grid lg:grid-cols-[360px,1fr] gap-0">
                {/* Photo */}
                <div className="relative bg-white/[0.03] overflow-hidden">
                  <div className="aspect-[3/4] lg:aspect-auto lg:h-full">
                    {!imgError ? (
                      <img
                        src="/images/founder.webp"
                        alt="Ángel Díaz Castro — CEO & Fundador, WITHMIA"
                        className="w-full h-full object-cover object-[center_15%]"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center min-h-[400px] bg-gradient-to-br from-violet-500/5 to-transparent">
                        <User className="w-24 h-24 text-white/[0.06]" />
                      </div>
                    )}
                  </div>
                  {/* Fade overlay on mobile */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(230,40%,6%)] to-transparent lg:hidden" />
                  {/* Side fade on desktop */}
                  <div className="hidden lg:block absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-[hsl(230,40%,6%)]/80 to-transparent" />
                </div>

                {/* Bio */}
                <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/15 text-[10px] font-bold uppercase tracking-wider text-violet-400/80">
                      Fundador & CEO
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-400/[0.06] border border-emerald-400/10">
                      <div className="relative">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute inset-0 animate-ping opacity-40" />
                      </div>
                      <span className="text-[9px] text-emerald-400/80 font-mono font-bold tracking-wider">
                        ACTIVO
                      </span>
                    </div>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    Ángel Díaz Castro
                  </h3>
                  <p className="text-[13px] text-white/20 mb-7 flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    Santiago, Chile
                  </p>

                  <p className="text-[15px] text-white/45 leading-[1.8] mb-4">
                    Fundador técnico con 5 años de desarrollo de software,
                    formación en Economía y Psicología Organizacional. Construí
                    la arquitectura completa de WITHMIA, diseñé la experiencia
                    No-Code y estructuré un modelo SaaS rentable desde el día
                    uno.
                  </p>
                  <p className="text-[15px] text-white/30 leading-[1.8] mb-8">
                    Anteriormente fundé Atlantis Producciones SpA, donde lideré
                    equipos y gestioné proyectos digitales en el mercado
                    chileno.
                  </p>

                  {/* Skill chips with colors */}
                  <div className="flex flex-wrap gap-2.5 mb-8">
                    {founderSkills.map((s) => (
                      <span
                        key={s.label}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-300 hover:-translate-y-0.5"
                        style={{
                          backgroundColor: `${s.color}08`,
                          border: `1px solid ${s.color}15`,
                          color: `${s.color}90`,
                        }}
                      >
                        <s.icon className="w-3.5 h-3.5" />
                        {s.label}
                      </span>
                    ))}
                  </div>

                  {/* LinkedIn link */}
                  <a
                    href="https://www.linkedin.com/in/angel-felipe-diaz-castro/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-[#0A66C2]/20 bg-[#0A66C2]/[0.06] text-[13px] font-medium text-[#0A66C2]/80 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] transition-all duration-300 group w-fit"
                  >
                    <Linkedin className="w-4 h-4" />
                    Ver perfil en LinkedIn
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — VALORES (Interactive cards with icons)
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/60 mb-4">
              Nuestros valores
            </p>
            <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-5">
              Los principios detrás de
              <br className="hidden md:block" />
              <span className="text-gradient"> cada decisión</span>
            </h2>
            <p className="text-[14px] text-white/30 max-w-md mx-auto leading-relaxed">
              No son frases en una pared. Son filtros que usamos para priorizar
              features, definir precios y hablar con clientes.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <Reveal key={v.title} delay={i * 80}>
                  <div
                    className="group relative h-full p-6 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1"
                    style={{
                      background: `linear-gradient(160deg, ${v.color}06, transparent 50%)`,
                      border: `1px solid ${v.color}10`,
                    }}
                  >
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${v.color}0a, transparent 60%)`,
                      }}
                    />
                    {/* Top line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${v.color}40, transparent)`,
                      }}
                    />

                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110"
                      style={{
                        backgroundColor: `${v.color}10`,
                        border: `1px solid ${v.color}18`,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: `${v.color}bb` }}
                      />
                    </div>

                    <h3 className="text-[15px] font-bold text-white mb-2">
                      {v.title}
                    </h3>
                    <p className="text-[13px] text-white/25 leading-[1.7] group-hover:text-white/40 transition-colors duration-500">
                      {v.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 6 — TIMELINE (Premium vertical with accent dots)
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16 md:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/50 mb-4">
              Nuestra historia
            </p>
            <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-5">
              De una necesidad real
              <br className="hidden md:block" />
              <span className="text-gradient"> a una empresa propia</span>
            </h2>
          </Reveal>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line (desktop) */}
            <div className="hidden md:block absolute left-8 top-6 bottom-0 w-px">
              <div className="absolute inset-0 bg-gradient-to-b from-[#a78bfa]/30 via-[#22d3ee]/30 via-[#fbbf24]/30 to-[#34d399]/30" />
              {/* Animated glow particle */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-2 h-24 rounded-full blur-sm"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, #a78bfa, transparent)",
                  animation: "scrollY 4s ease-in-out infinite",
                }}
              />
            </div>

            <div className="space-y-12 md:space-y-16">
              {timeline.map((step, i) => (
                <Reveal key={step.year} delay={i * 100}>
                  <div className="relative md:pl-24">
                    {/* Timeline dot (desktop) */}
                    <div className="hidden md:flex absolute left-0 top-5 z-10">
                      <div className="relative">
                        {/* Pulsing ring */}
                        <div
                          className="absolute -inset-2.5 rounded-full animate-ping opacity-20"
                          style={{
                            backgroundColor: step.accent,
                            animationDuration: "3s",
                          }}
                        />
                        {/* Dot */}
                        <div
                          className="w-[18px] h-[18px] rounded-full border-[3px] flex items-center justify-center"
                          style={{
                            borderColor: step.accent,
                            backgroundColor: "hsl(230,40%,6%)",
                            boxShadow: `0 0 12px ${step.accent}40`,
                          }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: step.accent }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card */}
                    <div
                      className="group rounded-2xl p-6 md:p-7 transition-all duration-500 hover:-translate-y-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${step.accent}04, transparent 60%)`,
                        border: `1px solid ${step.accent}10`,
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${step.accent}30, transparent)`,
                        }}
                      />

                      <div className="flex items-center gap-3 mb-3">
                        {/* Mobile dot */}
                        <div
                          className="md:hidden w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: step.accent,
                            boxShadow: `0 0 8px ${step.accent}40`,
                          }}
                        />
                        <span
                          className="text-[12px] font-bold uppercase tracking-wider"
                          style={{ color: `${step.accent}90` }}
                        >
                          {step.year}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        {step.title}
                      </h3>
                      <p className="text-[13px] text-white/30 leading-[1.7] group-hover:text-white/45 transition-colors duration-500">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 7 — EMPRESA (Dashboard-style info panel)
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/25 mb-4">
              Información legal
            </p>
            <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1]">
              Empresa constituida en Chile
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Company info card (dashboard style) */}
              <div className="relative rounded-2xl border border-white/[0.06] overflow-hidden"
                style={{ background: "rgba(255,255,255,0.015)" }}
              >
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-white/[0.015]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/60" />
                    </div>
                    <div className="h-3 w-px bg-white/[0.06]" />
                    <span className="text-[10px] font-mono text-white/25">
                      empresa.info
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-400/[0.06] border border-emerald-400/10">
                    <div className="relative">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute inset-0 animate-ping opacity-40" />
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400/60 font-medium uppercase tracking-wider">
                      Verificada
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-7">
                  <div className="flex items-center gap-4 mb-6">
                    <Building2 className="w-5 h-5 text-white/20" />
                    <div>
                      <h3 className="text-[14px] font-bold text-white">
                        MIA Marketing & Intelligence Artificial SpA
                      </h3>
                      <p className="text-[11px] text-white/20 mt-0.5">
                        Sociedad por Acciones · Chile
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {companyDetails.map((row) => (
                      <div key={row.label} className="flex items-start gap-3">
                        <row.icon className="w-3.5 h-3.5 text-white/15 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] font-semibold text-white/15 uppercase tracking-wider block mb-0.5">
                            {row.label}
                          </span>
                          <span
                            className={`text-[13px] text-white/50 leading-relaxed ${
                              row.mono ? "font-mono" : ""
                            }`}
                          >
                            {row.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column: SII verification + Atlantis origin */}
              <div className="flex flex-col gap-5">
                {/* SII Card */}
                <div
                  className="flex-1 group rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(16,185,129,0.04), transparent 60%)",
                    border: "1px solid rgba(16,185,129,0.08)",
                  }}
                >
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                  <div className="p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/15 transition-transform duration-500 group-hover:scale-110">
                        <Shield className="w-5 h-5 text-emerald-400/80" />
                      </div>
                      <h4 className="text-[15px] font-bold text-white">
                        Verificada por el SII
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/15 text-[11px] font-bold text-emerald-400">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Verificada
                      </span>
                      <span className="text-[11px] text-white/20">
                        desde julio 2025
                      </span>
                    </div>
                    <p className="text-[13px] text-white/25 leading-relaxed">
                      Habilitada para facturación electrónica. Infraestructura
                      alojada en AWS con estándares de seguridad
                      internacionales.
                    </p>
                  </div>
                </div>

                {/* Atlantis origin link */}
                <a
                  href="https://atlantisproducciones.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] p-6 flex items-center gap-5 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden relative"
                >
                  <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <img
                    src="/Logo-Atlantis.webp"
                    alt="Atlantis Producciones"
                    className="w-12 h-12 object-contain opacity-30 group-hover:opacity-60 transition-opacity rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white/40 group-hover:text-white/70 transition-colors">
                      Originada en Atlantis Producciones
                    </p>
                    <p className="text-[11px] text-white/15 mt-0.5">
                      Agencia digital · Santiago, Chile
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/10 shrink-0 group-hover:translate-x-0.5 group-hover:text-white/30 transition-all" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 8 — CTA (Cinematic)
          ══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-[0.08]"
            style={{
              background:
                "linear-gradient(135deg, #a78bfa, #fbbf24, #22d3ee)",
            }}
          />
        </div>

        <Reveal>
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Comienza hoy
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.08] mb-5">
              Prueba WITHMIA
              <br />
              <span className="text-gradient">gratis por 14 días</span>
            </h2>
            <p className="text-[15px] md:text-[17px] text-white/40 max-w-lg mx-auto leading-[1.75] mb-10">
              Crea tu cuenta en 2 minutos. Conecta tu primer canal y deja que la
              IA trabaje por ti desde el primer día.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
              <a
                href="https://app.withmia.com"
                onClick={() =>
                  trackCTAClick(
                    "comenzar_ahora",
                    "about_cta",
                    "https://app.withmia.com"
                  )
                }
                className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative">Comenzar ahora</span>
                <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
              </a>
              <Link
                to="/contacto"
                onClick={() =>
                  trackCTAClick("contactar", "about_cta", "/contacto")
                }
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-transparent text-white/80 font-semibold text-sm border border-white/15 hover:border-white/30 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300"
              >
                Contactar al equipo
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-white/25 text-[12px] font-medium">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400/60" />
                Datos seguros
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400/60" />
                Soporte 24/7
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-violet-400/60" />
                Sin tarjeta requerida
              </span>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default About;
