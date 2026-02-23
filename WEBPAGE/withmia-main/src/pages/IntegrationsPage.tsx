import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState, useRef } from "react";
import {
  Plug,
  ArrowRight,
  MessageSquare,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Calendar,
  Stethoscope,
  ShoppingCart,
  Code2,
  Mail,
  Webhook,
  Database,
  Zap,
  Shield,
  Globe,
  Activity,
  CheckCircle2,
  Search,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Lock,
  Clock,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Scroll-reveal helper
   ═══════════════════════════════════════════ */
const Reveal = ({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-[800ms] ease-out ${
        vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════
   useCountUp hook
   ═══════════════════════════════════════════ */
function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    let raf: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return count;
}

/* ═══════════════════════════════════════════
   Data
   ═══════════════════════════════════════════ */
const channels = [
  {
    name: "WhatsApp",
    image: "/icons/whatsapp.webp",
    color: "#25D366",
    desc: "Business API oficial con envío masivo, plantillas HSM y respuestas automáticas 24/7.",
    badge: "Más popular",
  },
  {
    name: "Instagram",
    image: "/icons/instagram-new.webp",
    color: "#E1306C",
    desc: "DMs, stories y comentarios unificados. Responde desde un solo inbox con IA.",
  },
  {
    name: "Messenger",
    image: "/icons/facebook-new.webp",
    color: "#0084FF",
    desc: "Facebook Messenger integrado con respuestas automáticas y flujos conversacionales.",
  },
  {
    name: "Email",
    image: "/icons/gmail-new.webp",
    color: "#EA4335",
    desc: "Gmail, Outlook y SMTP personalizado. Correos entrantes convertidos en conversaciones.",
  },
  {
    name: "Chat Web",
    image: "/icons/web-new.webp",
    color: "#61DAFB",
    invert: true,
    desc: "Widget embebible para tu sitio web con IA conversacional y diseño personalizable.",
  },
  {
    name: "Cloud API",
    image: "/icons/api-final.webp",
    color: "#34D399",
    desc: "API REST para conectar cualquier sistema externo con webhooks bidireccionales.",
    badge: "Desarrolladores",
  },
];

const integrations = [
  { name: "AgendaPro", desc: "Citas y reservas automáticas sincronizadas con tu calendario profesional.", icon: CalendarCheck, tag: "Productividad", color: "#3B82F6" },
  { name: "Calendly", desc: "Reuniones automáticas con links de agendamiento directo desde el chat.", icon: CalendarDays, tag: "Productividad", color: "#006BFF" },
  { name: "Google Calendar", desc: "Sincronización bidireccional de eventos, recordatorios y disponibilidad.", icon: Calendar, tag: "Productividad", color: "#4285F4" },
  { name: "Outlook", desc: "Microsoft Calendar integrado para gestionar agenda desde cualquier canal.", icon: Mail, tag: "Productividad", color: "#0078D4" },
  { name: "Reservo", desc: "Sistema de reservas online conectado directamente a tus canales.", icon: CalendarRange, tag: "Productividad", color: "#10B981" },
  { name: "Dentalink", desc: "Gestión de pacientes para clínicas dentales con recordatorios automáticos.", icon: Stethoscope, tag: "Salud", color: "#22D3EE" },
  { name: "Medilink", desc: "Plataforma médica integrada para agendar, confirmar y recordar citas.", icon: Stethoscope, tag: "Salud", color: "#F43F5E" },
  { name: "Shopify", desc: "Sincroniza productos, pedidos y notificaciones de tu tienda Shopify.", icon: ShoppingCart, tag: "E-commerce", color: "#96BF48" },
  { name: "WooCommerce", desc: "Conecta tu tienda WordPress con alertas de pedidos y seguimiento.", icon: Code2, tag: "E-commerce", color: "#9B5C8F" },
  { name: "MercadoLibre", desc: "Gestiona preguntas y ventas de MercadoLibre desde tu inbox unificado.", icon: ShoppingCart, tag: "E-commerce", color: "#FFE600" },
  { name: "API REST", desc: "Endpoints personalizados y webhooks para integraciones a medida.", icon: Webhook, tag: "Desarrollo", color: "#F59E0B" },
  { name: "MySQL", desc: "Conecta bases de datos para consultas automáticas y actualización de registros.", icon: Database, tag: "Desarrollo", color: "#00758F" },
];

const tags = ["Todos", "Productividad", "Salud", "E-commerce", "Desarrollo"];

/* ═══════════════════════════════════════════
   Orbiting logos (visual for hero)
   ═══════════════════════════════════════════ */
const OrbitingLogos = () => {
  const logos = channels.map((ch) => ({
    src: ch.image,
    name: ch.name,
    color: ch.color,
    invert: (ch as any).invert,
  }));

  return (
    <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px]">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border border-white/[0.04]" />
      <div className="absolute inset-8 rounded-full border border-white/[0.06]" />
      <div className="absolute inset-16 rounded-full border border-white/[0.08]" />

      {/* Center hub */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-amber-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
            <Plug className="w-8 h-8 md:w-10 md:h-10 text-white/60" />
          </div>
          {/* Pulsing ring */}
          <div className="absolute -inset-3 rounded-2xl border border-violet-400/20 animate-ping" style={{ animationDuration: "3s" }} />
        </div>
      </div>

      {/* Orbiting logos */}
      {logos.map((logo, i) => {
        const angle = (360 / logos.length) * i - 90;
        const radius = 43; // % of container
        return (
          <div
            key={i}
            className="absolute w-12 h-12 md:w-14 md:h-14 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${50 + radius * Math.cos((angle * Math.PI) / 180)}%`,
              top: `${50 + radius * Math.sin((angle * Math.PI) / 180)}%`,
              animation: `orbit-float 4s ease-in-out ${i * 0.5}s infinite alternate`,
            }}
          >
            <div
              className="w-full h-full rounded-xl flex items-center justify-center backdrop-blur-sm transition-transform duration-300 hover:scale-125"
              style={{
                backgroundColor: `${logo.color}15`,
                border: `1px solid ${logo.color}25`,
                boxShadow: `0 0 20px ${logo.color}10`,
              }}
            >
              <img
                src={logo.src}
                alt={logo.name}
                className="w-5 h-5 md:w-6 md:h-6 object-contain"
                style={logo.invert ? { filter: "brightness(0) invert(1)" } : undefined}
              />
            </div>
          </div>
        );
      })}

      {/* Connecting lines from center to logos (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
        {logos.map((logo, i) => {
          const angle = (360 / logos.length) * i - 90;
          const endX = 200 + 172 * Math.cos((angle * Math.PI) / 180);
          const endY = 200 + 172 * Math.sin((angle * Math.PI) / 180);
          return (
            <line
              key={i}
              x1="200"
              y1="200"
              x2={endX}
              y2={endY}
              stroke={logo.color}
              strokeOpacity={0.08}
              strokeWidth={1}
              strokeDasharray="4 4"
            >
              <animate attributeName="stroke-dashoffset" from="8" to="0" dur="2s" repeatCount="indefinite" />
            </line>
          );
        })}
      </svg>
    </div>
  );
};

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
const IntegrationsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTag, setActiveTag] = useState("Todos");
  const [search, setSearch] = useState("");
  const metricsRef = useRef<HTMLDivElement>(null);
  const [metricsVis, setMetricsVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setMetricsVis(true); },
      { threshold: 0.3 }
    );
    if (metricsRef.current) obs.observe(metricsRef.current);
    return () => obs.disconnect();
  }, []);

  const filtered = integrations.filter((i) => {
    const matchTag = activeTag === "Todos" || i.tag === activeTag;
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.desc.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  const countChannels = useCountUp(6, 1800, metricsVis);
  const countIntegrations = useCountUp(12, 1800, metricsVis);
  const countUptime = useCountUp(99, 1800, metricsVis);
  const countLatency = useCountUp(200, 1800, metricsVis);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* ══════════════════════════════════════
            HERO
            ══════════════════════════════════════ */}
        <section className="relative pt-28 md:pt-36 pb-8 px-4 overflow-hidden">
          {/* Aurora background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="intg-aurora intg-aurora-1" />
            <div className="intg-aurora intg-aurora-2" />
            <div className="intg-aurora intg-aurora-3" />
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: "80px 80px",
              }}
            />
          </div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="grid md:grid-cols-[1.2fr,1fr] gap-12 md:gap-8 items-center">
              {/* Left — Copy */}
              <Reveal>
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-[11px] text-violet-300 font-semibold tracking-wide mb-8">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  Ecosistema conectado
                </div>

                <h1 className="text-[2rem] sm:text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.08] mb-6">
                  <span className="text-white">Todas tus herramientas,</span>
                  <br />
                  <span className="relative inline-block">
                    <span className="text-gradient">una sola plataforma</span>
                    <span
                      className="absolute -bottom-2 left-0 h-[3px] rounded-full bg-gradient-to-r from-violet-400 to-amber-400"
                      style={{ width: "100%", animation: "intg-underline 1s ease-out 0.5s both" }}
                    />
                  </span>
                </h1>

                <p className="text-[15px] md:text-[17px] text-white/50 max-w-[520px] leading-[1.75] mb-10">
                  Conecta tus canales de comunicación, agendas, CRMs y herramientas
                  de e-commerce. Todo orquestado por IA en tiempo real.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <a href="https://app.withmia.com">
                    <button className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)]">
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span className="relative">Probar gratis 14 días</span>
                      <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </a>
                  <a href="/contacto">
                    <button className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-white/80 font-semibold text-sm border border-white/15 hover:border-white/30 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300">
                      Ver documentación API
                      <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  </a>
                </div>

                <p className="text-[11px] text-white/20 tracking-wide">
                  Setup en minutos · Sin código · Soporte incluido
                </p>
              </Reveal>

              {/* Right — Orbiting logos visual */}
              <Reveal delay={200} className="flex justify-center md:justify-end">
                <OrbitingLogos />
              </Reveal>
            </div>

            {/* ── Metrics strip ── */}
            <div
              ref={metricsRef}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-16"
            >
              {[
                { icon: MessageSquare, value: countChannels, suffix: "", label: "Canales nativos", color: "#a78bfa" },
                { icon: Plug, value: countIntegrations, suffix: "+", label: "Integraciones", color: "#f59e0b" },
                { icon: Shield, value: countUptime, suffix: ".9%", label: "Uptime SLA", color: "#34d399" },
                { icon: Activity, value: countLatency, suffix: "ms", prefix: "<",label: "Latencia", color: "#22d3ee" },
              ].map((m, i) => {
                const MIcon = m.icon;
                return (
                  <Reveal key={i} delay={300 + i * 80}>
                    <div className="group relative flex items-center gap-4 py-5 px-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300">
                      <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: `radial-gradient(circle at 30% 50%, ${m.color}08, transparent 70%)` }}
                      />
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${m.color}10`, border: `1px solid ${m.color}18` }}
                      >
                        <MIcon className="w-[18px] h-[18px]" style={{ color: m.color }} />
                      </div>
                      <div>
                        <p className="text-xl md:text-2xl font-extrabold text-white leading-none mb-0.5 font-mono tabular-nums">
                          {(m as any).prefix ?? ""}{m.value}{m.suffix}
                        </p>
                        <p className="text-[11px] text-white/35 font-medium">{m.label}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CANALES — Interactive cards with expanding detail
            ══════════════════════════════════════ */}
        <section className="pt-24 md:pt-32 pb-16 px-4 relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <Reveal className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-[11px] text-violet-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
                <Layers className="w-3.5 h-3.5" />
                Canales de comunicación
              </div>
              <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-4">
                Todos tus canales
                <br className="hidden md:block" />
                <span className="text-gradient"> en un solo inbox</span>
              </h2>
              <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto leading-relaxed">
                Recibe y responde mensajes de WhatsApp, Instagram, Facebook, Email
                y tu sitio web desde una sola bandeja potenciada por IA.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {channels.map((ch, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div
                    className="group relative p-6 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${ch.color}60, transparent)` }}
                    />

                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at 30% 20%, ${ch.color}08, transparent 70%)` }}
                    />

                    {/* Badge */}
                    {(ch as any).badge && (
                      <div
                        className="absolute top-4 right-4 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${ch.color}15`, color: `${ch.color}`, border: `1px solid ${ch.color}20` }}
                      >
                        {(ch as any).badge}
                      </div>
                    )}

                    <div className="relative">
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg"
                          style={{
                            backgroundColor: `${ch.color}12`,
                            border: `1px solid ${ch.color}20`,
                            boxShadow: `0 0 0 ${ch.color}00`,
                          }}
                        >
                          <img
                            src={ch.image}
                            alt={ch.name}
                            className="w-6 h-6 object-contain"
                            style={ch.invert ? { filter: "brightness(0) invert(1)" } : undefined}
                          />
                        </div>
                        <div className="pt-1">
                          <h3 className="text-base font-bold text-white group-hover:text-white transition-colors mb-0.5">
                            {ch.name}
                          </h3>
                          <span className="text-[10px] font-mono font-medium uppercase tracking-wider" style={{ color: `${ch.color}80` }}>
                            Canal nativo
                          </span>
                        </div>
                      </div>

                      <p className="text-[13px] text-white/40 leading-relaxed mb-5">{ch.desc}</p>

                      <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />
                          <span className="text-[11px] text-white/25">Incluido en todos los planes</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 group-hover:translate-x-0.5 transition-all duration-300" />
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            INTEGRACIONES — Filterable grid
            ══════════════════════════════════════ */}
        <section className="py-24 md:py-28 px-4 relative overflow-hidden">
          {/* Background accent */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.03]" style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
          </div>

          <div className="max-w-6xl mx-auto relative">
            <Reveal className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
                <Zap className="w-3.5 h-3.5" />
                Marketplace de integraciones
              </div>
              <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-4">
                Conecta las herramientas
                <br className="hidden md:block" />
                <span className="text-gradient"> que ya usas</span>
              </h2>
              <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto leading-relaxed">
                Desde agendamiento hasta e-commerce, WITHMIA se integra con las
                plataformas más usadas en Latinoamérica.
              </p>
            </Reveal>

            {/* Filters bar */}
            <Reveal delay={100}>
              <div
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 p-4 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(tag)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                        activeTag === tag
                          ? "bg-gradient-to-r from-amber-400/15 to-orange-400/15 text-amber-300 border border-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                          : "bg-transparent text-white/35 border border-transparent hover:bg-white/[0.04] hover:text-white/55"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar integración..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all duration-300"
                  />
                </div>
              </div>
            </Reveal>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.name} delay={i * 60}>
                    <div
                      className="group relative p-5 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-0.5"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {/* Hover accent line */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ background: `linear-gradient(90deg, transparent, ${item.color}50, transparent)` }}
                      />

                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 20% 30%, ${item.color}06, transparent 65%)` }}
                      />

                      <div className="relative flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110"
                          style={{
                            backgroundColor: `${item.color}10`,
                            border: `1px solid ${item.color}18`,
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: item.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h3 className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                              {item.name}
                            </h3>
                            <span
                              className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0"
                              style={{
                                backgroundColor: `${item.color}08`,
                                color: `${item.color}80`,
                                border: `1px solid ${item.color}12`,
                              }}
                            >
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-[12px] text-white/35 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>

                      {/* Bottom status */}
                      <div className="relative flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                        <span className="text-[10px] text-white/20 font-medium">Disponible</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/10 ml-auto group-hover:text-white/30 group-hover:translate-x-0.5 transition-all duration-300" />
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-8 h-8 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 text-sm">No se encontraron integraciones.</p>
                <button
                  onClick={() => { setSearch(""); setActiveTag("Todos"); }}
                  className="text-amber-400/60 text-xs mt-2 hover:text-amber-400 transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════
            CÓMO FUNCIONA — Steps with connecting line
            ══════════════════════════════════════ */}
        <section className="py-24 md:py-28 px-4 relative overflow-hidden">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                Así de fácil
              </div>
              <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-4">
                Conectar toma
                <span className="text-gradient"> minutos</span>
              </h2>
            </Reveal>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-16 left-[16.6%] right-[16.6%] h-px bg-white/[0.06]">
                {/* Animated flow */}
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className="h-full w-1/3 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)",
                      animation: "intg-pipeline-flow 3s linear infinite",
                    }}
                  />
                </div>
              </div>

              {[
                {
                  step: "01",
                  title: "Elige tu integración",
                  desc: "Selecciona el canal o herramienta que quieres conectar desde nuestro catálogo.",
                  icon: Search,
                  color: "#a78bfa",
                },
                {
                  step: "02",
                  title: "Conecta en un click",
                  desc: "Autoriza la conexión con OAuth o ingresa tus credenciales de API. Sin código.",
                  icon: Lock,
                  color: "#f59e0b",
                },
                {
                  step: "03",
                  title: "Listo, está funcionando",
                  desc: "Los mensajes fluyen automáticamente. La IA aprende de cada interacción.",
                  icon: Zap,
                  color: "#34d399",
                },
              ].map((item, i) => {
                const SIcon = item.icon;
                return (
                  <Reveal key={i} delay={i * 120}>
                    <div className="relative group">
                      {/* Step number circle */}
                      <div className="flex justify-center mb-6 relative z-10">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                          style={{
                            backgroundColor: `${item.color}10`,
                            border: `1px solid ${item.color}20`,
                            boxShadow: `0 0 30px ${item.color}08`,
                          }}
                        >
                          <SIcon className="w-6 h-6" style={{ color: item.color }} />
                        </div>
                      </div>

                      <div
                        className="p-7 rounded-2xl text-center transition-all duration-500 group-hover:-translate-y-1"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {/* Large watermark number */}
                        <span
                          className="absolute top-2 right-5 text-[4rem] font-black leading-none pointer-events-none select-none"
                          style={{ color: `${item.color}05` }}
                        >
                          {item.step}
                        </span>

                        <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                        <p className="text-[13px] text-white/40 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            TRUST INDICATORS
            ══════════════════════════════════════ */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <div
                className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05] rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {[
                  { icon: Shield, label: "Cifrado end-to-end", desc: "Todos los datos viajan encriptados", color: "#34d399" },
                  { icon: Clock, label: "Soporte 24/7", desc: "Equipo técnico siempre disponible", color: "#22d3ee" },
                  { icon: Globe, label: "API abierta", desc: "Documentación pública y completa", color: "#a78bfa" },
                ].map((item, i) => {
                  const TIcon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-4 p-6 md:p-8">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${item.color}10`, border: `1px solid ${item.color}15` }}
                      >
                        <TIcon className="w-5 h-5" style={{ color: `${item.color}80` }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-0.5">{item.label}</p>
                        <p className="text-[11px] text-white/30">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CUSTOM INTEGRATION CTA
            ══════════════════════════════════════ */}
        <section className="py-20 md:py-24 px-4 relative overflow-hidden">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <div
                className="relative p-10 md:p-14 rounded-3xl overflow-hidden text-center"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Background gradient mesh */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full blur-[100px] opacity-[0.06]" style={{ background: "#a78bfa" }} />
                  <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full blur-[100px] opacity-[0.06]" style={{ background: "#f59e0b" }} />
                </div>

                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
                    style={{
                      background: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(245,158,11,0.15))",
                      border: "1px solid rgba(167,139,250,0.2)",
                    }}
                  >
                    <Globe className="w-7 h-7 text-violet-400/80" />
                  </div>

                  <h2 className="text-2xl md:text-[2rem] font-bold text-white leading-tight mb-4">
                    ¿No encuentras tu integración?
                  </h2>
                  <p className="text-[14px] text-white/40 max-w-lg mx-auto leading-relaxed mb-10">
                    Nuestra API REST te permite conectar cualquier sistema. Además, nuestro equipo
                    puede desarrollar integraciones personalizadas para tu negocio.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a href="https://app.withmia.com/docs" target="_blank" rel="noopener noreferrer">
                      <button className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)]">
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative">Ver documentación API</span>
                        <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </a>
                    <a href="/contacto">
                      <button className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-white/80 font-semibold text-sm border border-white/15 hover:border-white/30 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300">
                        Solicitar integración
                      </button>
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />

      {/* ── Styles ── */}
      <style>{`
        /* Aurora animated background */
        .intg-aurora {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }
        .intg-aurora-1 {
          width: 550px; height: 550px;
          top: -200px; left: -80px;
          background: radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%);
          animation: intg-drift-1 18s ease-in-out infinite alternate;
        }
        .intg-aurora-2 {
          width: 450px; height: 450px;
          top: 100px; right: -150px;
          background: radial-gradient(circle, rgba(245,158,11,0.08), transparent 70%);
          animation: intg-drift-2 22s ease-in-out infinite alternate;
        }
        .intg-aurora-3 {
          width: 400px; height: 400px;
          top: 250px; left: 40%;
          background: radial-gradient(circle, rgba(34,211,238,0.06), transparent 70%);
          animation: intg-drift-3 20s ease-in-out infinite alternate;
        }

        @keyframes intg-drift-1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 50px) scale(1.15); }
          100% { transform: translate(-30px, 20px) scale(0.9); }
        }
        @keyframes intg-drift-2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 40px) scale(1.1); }
          100% { transform: translate(40px, -20px) scale(1.05); }
        }
        @keyframes intg-drift-3 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -30px) scale(1.1); }
          100% { transform: translate(-40px, 30px) scale(0.95); }
        }

        @keyframes intg-underline {
          from { width: 0%; opacity: 0; }
          to { width: 100%; opacity: 1; }
        }

        @keyframes orbit-float {
          0% { transform: translate(-50%, -50%) translateY(0); }
          100% { transform: translate(-50%, -50%) translateY(-8px); }
        }

        @keyframes intg-pipeline-flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default IntegrationsPage;
