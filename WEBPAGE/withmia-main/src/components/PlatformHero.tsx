import { Link } from "react-router-dom";
import { trackCTAClick } from "@/lib/analytics";
import {
  ArrowRight,
  CalendarCheck,
  Sparkles,
  Brain,
  Zap,
  CheckCircle2,
  MessageSquare,
  Plug,
  Clock,
  Users,
  BarChart3,
  Bot,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

/* ═══════════════════════════════════════════
   Channel logos for trust bar
   ═══════════════════════════════════════════ */
const channels = [
  { name: "WhatsApp", icon: "/icons/whatsapp.webp", size: 22 },
  { name: "Instagram", icon: "/icons/instagram-new.webp", size: 22 },
  { name: "Facebook", icon: "/icons/facebook-new.webp", size: 26 },
  { name: "Gmail", icon: "/icons/gmail-new.webp", size: 36, margin: -6 },
  { name: "Web", icon: "/icons/web-new.webp", size: 22, invert: true },
];

/* ═══════════════════════════════════════════
   Platform modules
   ═══════════════════════════════════════════ */
const platformScreens = [
  {
    id: "chat",
    label: "Conversaciones",
    icon: MessageSquare,
    accent: "#22d3ee",
    accentRgb: "34,211,238",
    image: "/chat.png",
    url: "app.withmia.com/conversations",
    title: "Bandeja de entrada unificada",
    subtitle: "Todos tus canales. Una sola pantalla.",
    description:
      "Gestiona WhatsApp, Instagram, Facebook, Email y Web Chat en una interfaz centralizada con contexto completo, historial y asignación inteligente.",
    highlights: [
      "Todos los canales en tiempo real",
      "Contexto e historial por contacto",
      "Asignación automática inteligente",
      "Colaboración interna con notas",
    ],
  },
  {
    id: "conocimientos",
    label: "Conocimiento",
    icon: Brain,
    accent: "#a78bfa",
    accentRgb: "167,139,250",
    image: "/conocimientos.png",
    url: "app.withmia.com/knowledge",
    title: "Tu negocio, convertido en inteligencia",
    subtitle: "La IA responde con tus datos, no con genéricos.",
    description:
      "Sube catálogos, políticas, FAQs, manuales o URLs. WITHMIA vectoriza todo para dar respuestas precisas basadas en tu realidad operativa.",
    highlights: [
      "Soporta PDF, DOCX y texto libre",
      "Importa sitios web completos",
      "Indexación vectorial automática",
      "Siempre actualizada",
    ],
  },
  {
    id: "entrenamiento",
    label: "Entrenamiento",
    icon: Zap,
    accent: "#fbbf24",
    accentRgb: "251,191,36",
    image: "/entrenamiento.png",
    url: "app.withmia.com/training",
    title: "Un asistente con la voz de tu marca",
    subtitle: "Define cómo habla, responde y se comporta.",
    description:
      "Configura tono, personalidad, límites y directrices. Cada respuesta refleja tu identidad de marca con ajuste basado en conversaciones reales.",
    highlights: [
      "Personalidad configurable",
      "Directrices y límites claros",
      "Tono adaptado a tu marca",
      "Mejora con feedback real",
    ],
  },
  {
    id: "integraciones",
    label: "Integraciones",
    icon: Plug,
    accent: "#34d399",
    accentRgb: "52,211,153",
    image: "/integraciones.png",
    url: "app.withmia.com/integrations",
    title: "Conecta tus canales en minutos",
    subtitle: "Sin código. Sin desarrolladores.",
    description:
      "Activa WhatsApp Business API, Instagram, Facebook Messenger y Gmail con configuración guiada paso a paso.",
    highlights: [
      "WhatsApp Business API oficial",
      "Instagram y Facebook Messenger",
      "Gmail y correo corporativo",
      "Setup guiado paso a paso",
    ],
  },
];

/* ═══════════════════════════════════════════
   Metrics with animated counting
   ═══════════════════════════════════════════ */
const metrics = [
  { icon: Users, value: 200, suffix: "+", label: "Empresas activas", color: "#a78bfa" },
  { icon: MessageSquare, value: 1.2, suffix: "M+", label: "Mensajes procesados", color: "#22d3ee", decimals: 1 },
  { icon: Bot, value: 97, suffix: "%", label: "Precisión de la IA", color: "#fbbf24" },
  { icon: Clock, value: 2, suffix: "s", prefix: "<", label: "Tiempo de respuesta", color: "#34d399" },
];

/* ═══════════════════════════════════════════
   useCountUp hook
   ═══════════════════════════════════════════ */
function useCountUp(target: number, duration = 2000, start = false, decimals = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    let raf: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration, decimals]);
  return count;
}

/* ═══════════════════════════════════════════
   Scroll-reveal wrapper (enhanced: direction)
   ═══════════════════════════════════════════ */
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const translate = direction === "left" ? "translate-x-8" : direction === "right" ? "-translate-x-8" : "translate-y-10";
  return (
    <div
      ref={ref}
      className={`transition-all duration-[800ms] ease-out ${vis ? "opacity-100 translate-y-0 translate-x-0" : `opacity-0 ${translate}`} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════
   3D Browser frame with perspective
   ═══════════════════════════════════════════ */
const BrowserFrame = ({
  url,
  children,
  accent,
  perspective = false,
}: {
  url: string;
  children: React.ReactNode;
  accent?: string;
  perspective?: boolean;
}) => (
  <div
    className={`relative rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 ${
      perspective ? "hover:scale-[1.02]" : ""
    }`}
    style={{
      border: accent ? `1px solid ${accent}20` : "1px solid rgba(255,255,255,0.08)",
      boxShadow: accent
        ? `0 25px 80px rgba(0,0,0,0.5), 0 0 60px ${accent}08`
        : "0 20px 60px rgba(0,0,0,0.45)",
    }}
  >
    {/* Top gradient accent stripe */}
    {accent && (
      <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />
    )}
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.025] backdrop-blur-xl">
      <div className="flex gap-1.5">
        <div className="w-[9px] h-[9px] rounded-full bg-[#ff5f57]" />
        <div className="w-[9px] h-[9px] rounded-full bg-[#febc2e]" />
        <div className="w-[9px] h-[9px] rounded-full bg-[#28c840]" />
      </div>
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white/[0.05] border border-white/[0.06] max-w-[320px] w-full">
          <div className="w-3 h-3 rounded-full border border-emerald-400/30 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="text-[10px] text-white/45 font-mono tracking-wide">{url}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-400/[0.06] border border-emerald-400/10">
        <div className="relative">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute inset-0 animate-ping opacity-40" />
        </div>
        <span className="text-[9px] text-emerald-400/80 font-mono font-bold tracking-wider">LIVE</span>
      </div>
    </div>
    {children}
  </div>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export const PlatformHero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVis, setHeroVis] = useState(false);
  const metricsRef = useRef<HTMLDivElement>(null);
  const [metricsVis, setMetricsVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setHeroVis(true); }, { threshold: 0.05 });
    if (heroRef.current) obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setMetricsVis(true); }, { threshold: 0.3 });
    if (metricsRef.current) obs.observe(metricsRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* ══════════════════════════════════════
          SECTION 1 — HERO
          ══════════════════════════════════════ */}
      <section ref={heroRef} className="relative pt-28 md:pt-36 pb-6 px-4 overflow-hidden">
        {/* ── Aurora mesh background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="aurora-orb aurora-orb-1" />
          <div className="aurora-orb aurora-orb-2" />
          <div className="aurora-orb aurora-orb-3" />
          <div className="aurora-orb aurora-orb-4" />
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
                heroVis ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              Plataforma de atención al cliente con IA
            </div>

            {/* Headline */}
            <h1
              className={`text-[2rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.08] mb-7 transition-all duration-700 delay-100 ${
                heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <span className="text-white">Atiende, automatiza y escala</span>
              <br />
              <span className="relative inline-block">
                <span className="text-gradient">con inteligencia artificial</span>
                {/* Animated underline */}
                <span
                  className="absolute -bottom-2 left-0 h-[3px] rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 delay-700"
                  style={{ width: heroVis ? "100%" : "0%" }}
                />
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className={`text-[15px] md:text-[17px] text-white/50 max-w-[580px] mx-auto leading-[1.75] mb-10 transition-all duration-700 delay-200 ${
                heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              WITHMIA centraliza WhatsApp, Instagram, Email y Web Chat en una
              sola bandeja con IA que responde como un experto de tu equipo.
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-col sm:flex-row gap-3 justify-center items-center mb-6 transition-all duration-700 delay-300 ${
                heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <a href="https://app.withmia.com" onClick={() => trackCTAClick("probar_gratis_hero", "platform_hero")}>
                <button className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)]">
                  {/* Shimmer sweep */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative">Probar gratis 14 días</span>
                  <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
                </button>
              </a>
              <Link to="/contacto">
                <button className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-transparent text-white/80 font-semibold text-sm border border-white/15 hover:border-white/30 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300">
                  <CalendarCheck className="w-4 h-4 text-white/50" />
                  Solicitar demo
                </button>
              </Link>
            </div>

            {/* Fine print */}
            <p
              className={`text-[11px] text-white/25 tracking-wide mb-8 transition-all duration-700 delay-400 ${
                heroVis ? "opacity-100" : "opacity-0"
              }`}
            >
              Sin tarjeta de crédito · Setup en 5 minutos · Cancela cuando quieras
            </p>

            {/* ── Trust bar — channel logos ── */}
            <div
              className={`transition-all duration-700 delay-500 ${
                heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 font-bold mb-3">
                Se integra con
              </p>
              <div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]">
                {channels.map((ch) => (
                  <img
                    key={ch.name}
                    src={ch.icon}
                    alt={ch.name}
                    title={ch.name}
                    className="transition-all duration-300 hover:scale-110 opacity-60 hover:opacity-100"
                    style={{
                      width: ch.size,
                      height: ch.size,
                      margin: ch.margin ?? 0,
                      ...((ch as any).invert ? { filter: "brightness(0) invert(1)" } : {}),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Hero screenshot — 3D perspective ── */}
          <div
            className={`relative transition-all duration-1000 delay-500 ${
              heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
            }`}
            style={{ perspective: "1200px" }}
          >
            {/* Glow behind the screenshot */}
            <div
              className="absolute inset-x-10 -top-10 bottom-0 rounded-3xl blur-[80px] opacity-[0.08] pointer-events-none"
              style={{ background: "linear-gradient(135deg, #a78bfa, #fbbf24, #22d3ee)" }}
            />

            <div
              className="relative transition-transform duration-700"
              style={{
                transform: heroVis ? "rotateX(2deg)" : "rotateX(8deg)",
                transformOrigin: "center bottom",
              }}
            >
              <BrowserFrame url="app.withmia.com" accent="#a78bfa" perspective>
                <div className="relative overflow-hidden max-h-[520px]">
                  <img
                    src="/Captura%20de%20pantalla%202026-02-23%20102740.png"
                    alt="WITHMIA — Plataforma de atención al cliente"
                    className="w-full h-auto block object-cover object-top"
                    loading="eager"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[hsl(230,40%,6%)] to-transparent pointer-events-none" />
                </div>
              </BrowserFrame>
            </div>
          </div>

          {/* ── Animated metrics ── */}
          <div
            ref={metricsRef}
            className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-16 transition-all duration-700 delay-300 ${
              metricsVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {metrics.map((m, i) => {
              const MIcon = m.icon;
              const count = useCountUp(m.value, 2200, metricsVis, m.decimals ?? 0);
              return (
                <div
                  key={i}
                  className="group relative flex items-center gap-4 py-5 px-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  {/* Gradient accent on hover */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(circle at 30% 50%, ${m.color}08, transparent 70%)` }}
                  />
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative"
                    style={{ backgroundColor: `${m.color}10`, border: `1px solid ${m.color}18` }}
                  >
                    <MIcon className="w-[18px] h-[18px]" style={{ color: m.color }} />
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-extrabold text-white leading-none mb-0.5 font-mono tabular-nums">
                      {m.prefix ?? ""}{count}{m.suffix}
                    </p>
                    <p className="text-[11px] text-white/35 font-medium">{m.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 2 — PLATFORM TOUR (TIMELINE)
          ══════════════════════════════════════ */}
      <section className="pt-10 md:pt-14 pb-10 md:pb-14 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-20 md:mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
              <BarChart3 className="w-3.5 h-3.5" />
              Recorrido por la plataforma
            </div>
            <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-4">
              Todo lo que necesitas para
              <br className="hidden md:block" />
              <span className="text-gradient"> no perder ni un cliente</span>
            </h2>
            <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto leading-relaxed">
              Cuatro módulos que cubren desde la primera interacción hasta la
              automatización completa de tu atención al cliente.
            </p>
          </Reveal>

          {/* ── Timeline layout ── */}
          <div className="relative">
            {/* Vertical timeline line (desktop only) */}
            <div className="hidden md:block absolute left-8 top-6 bottom-0 w-px">
              <div className="absolute inset-0 bg-gradient-to-b from-[#22d3ee]/30 via-[#a78bfa]/30 via-[#fbbf24]/30 to-[#34d399]/30" />
              {/* Animated glow particle */}
              <div className="absolute left-1/2 -translate-x-1/2 w-2 h-24 rounded-full blur-sm timeline-particle" style={{ background: "linear-gradient(to bottom, transparent, #a78bfa, transparent)" }} />
            </div>

            <div className="space-y-16 md:space-y-24">
              {platformScreens.map((screen, i) => {
                const SIcon = screen.icon;
                return (
                  <Reveal key={screen.id} delay={i * 100}>
                    <div className="relative md:pl-24">
                      {/* Timeline dot (desktop) */}
                      <div className="hidden md:flex absolute left-0 top-6 z-10">
                        <div className="relative">
                          {/* Pulsing ring */}
                          <div
                            className="absolute -inset-2.5 rounded-full animate-ping opacity-20"
                            style={{ backgroundColor: screen.accent, animationDuration: "3s" }}
                          />
                          {/* Dot */}
                          <div
                            className="w-[18px] h-[18px] rounded-full border-[3px] flex items-center justify-center"
                            style={{
                              borderColor: screen.accent,
                              backgroundColor: "hsl(230,40%,6%)",
                              boxShadow: `0 0 12px ${screen.accent}40`,
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: screen.accent }} />
                          </div>
                        </div>
                      </div>

                      {/* Module card — glass style */}
                      <div
                        className="relative rounded-2xl overflow-hidden group"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: `1px solid rgba(255,255,255,0.06)`,
                        }}
                      >
                        {/* Top gradient accent bar */}
                        <div
                          className="h-[2px]"
                          style={{
                            background: `linear-gradient(90deg, ${screen.accent}00, ${screen.accent}50, ${screen.accent}00)`,
                          }}
                        />

                        {/* Hover glow */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                          style={{
                            background: `radial-gradient(ellipse at 20% 30%, ${screen.accent}06, transparent 60%)`,
                          }}
                        />

                        <div className="grid md:grid-cols-[1fr,1.2fr] gap-0">
                          {/* Left — Text content */}
                          <div className="p-7 md:p-10 flex flex-col justify-center relative">
                            {/* Large watermark number */}
                            <span
                              className="absolute top-4 right-6 md:top-6 md:right-10 text-[5rem] md:text-[7rem] font-black leading-none pointer-events-none select-none"
                              style={{ color: `${screen.accent}06` }}
                            >
                              0{i + 1}
                            </span>

                            <div className="flex items-center gap-3 mb-5">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{
                                  backgroundColor: `${screen.accent}12`,
                                  border: `1px solid ${screen.accent}20`,
                                  boxShadow: `0 0 20px ${screen.accent}10`,
                                }}
                              >
                                <SIcon className="w-5 h-5" style={{ color: screen.accent }} />
                              </div>
                              <div>
                                <span
                                  className="text-[10px] font-bold tracking-[0.2em] uppercase block"
                                  style={{ color: `${screen.accent}80` }}
                                >
                                  Módulo 0{i + 1}
                                </span>
                                <span className="text-[10px] text-white/25 font-medium uppercase tracking-wider">
                                  {screen.label}
                                </span>
                              </div>
                            </div>

                            <h3 className="text-xl md:text-2xl font-bold text-white leading-snug mb-2">
                              {screen.title}
                            </h3>
                            <p className="text-xs font-medium mb-5" style={{ color: `${screen.accent}70` }}>
                              {screen.subtitle}
                            </p>
                            <p className="text-[13px] text-white/45 leading-[1.8] mb-7">
                              {screen.description}
                            </p>

                            {/* Highlights */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 mb-7">
                              {screen.highlights.map((h, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 group/item">
                                  <div
                                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                                    style={{
                                      backgroundColor: `${screen.accent}10`,
                                      border: `1px solid ${screen.accent}15`,
                                    }}
                                  >
                                    <CheckCircle2 className="w-3 h-3" style={{ color: screen.accent }} />
                                  </div>
                                  <span className="text-[12px] text-white/50 leading-snug">{h}</span>
                                </div>
                              ))}
                            </div>

                            <div>
                              <a href="https://app.withmia.com" onClick={() => trackCTAClick("probar_modulo", "platform_features")}>
                                <button
                                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                                  style={{
                                    backgroundColor: `${screen.accent}10`,
                                    border: `1px solid ${screen.accent}20`,
                                    color: screen.accent,
                                  }}
                                >
                                  Probar {screen.label.toLowerCase()}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </a>
                            </div>
                          </div>

                          {/* Right — Screenshot */}
                          <div className="p-5 md:p-6 flex items-center relative">
                            {/* Color glow behind screenshot */}
                            <div
                              className="absolute inset-8 rounded-3xl blur-[50px] pointer-events-none opacity-[0.06]"
                              style={{ backgroundColor: screen.accent }}
                            />
                            <BrowserFrame url={screen.url} accent={screen.accent}>
                              <div className="relative overflow-hidden">
                                <img
                                  src={screen.image}
                                  alt={`WITHMIA — ${screen.title}`}
                                  className="w-full h-auto block object-cover object-top"
                                  loading="lazy"
                                />
                                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(230,40%,6%)] to-transparent pointer-events-none" />
                              </div>
                            </BrowserFrame>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Styles ── */}
      <style>{`
        /* Aurora mesh animated background */
        .aurora-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }
        .aurora-orb-1 {
          width: 600px; height: 600px;
          top: -200px; left: -100px;
          background: radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%);
          animation: aurora-drift-1 18s ease-in-out infinite alternate;
        }
        .aurora-orb-2 {
          width: 500px; height: 500px;
          top: 50px; right: -200px;
          background: radial-gradient(circle, rgba(251,191,36,0.08), transparent 70%);
          animation: aurora-drift-2 22s ease-in-out infinite alternate;
        }
        .aurora-orb-3 {
          width: 450px; height: 450px;
          top: 300px; left: 30%;
          background: radial-gradient(circle, rgba(34,211,238,0.07), transparent 70%);
          animation: aurora-drift-3 20s ease-in-out infinite alternate;
        }
        .aurora-orb-4 {
          width: 350px; height: 350px;
          top: -100px; right: 20%;
          background: radial-gradient(circle, rgba(52,211,153,0.06), transparent 70%);
          animation: aurora-drift-4 25s ease-in-out infinite alternate;
        }
        @keyframes aurora-drift-1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(80px, 60px) scale(1.2); }
          100% { transform: translate(-40px, 30px) scale(0.9); }
        }
        @keyframes aurora-drift-2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-70px, 50px) scale(1.15); }
          100% { transform: translate(50px, -30px) scale(1.05); }
        }
        @keyframes aurora-drift-3 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, -40px) scale(1.1); }
          100% { transform: translate(-50px, 40px) scale(0.95); }
        }
        @keyframes aurora-drift-4 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-60px, 70px) scale(1.2); }
        }

        /* Timeline particle animation */
        .timeline-particle {
          animation: timeline-flow 4s ease-in-out infinite;
        }
        @keyframes timeline-flow {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </>
  );
};
