import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
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
  CheckCircle2,
  ExternalLink,
  Zap,
  RefreshCw,
  Bot,
  Link2,
  BarChart3,
  Clock,
  Shield,
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

/* ═══════════════════════════════════════════
   Integration categories — expanded data
   ═══════════════════════════════════════════ */
const integrationCategories = [
  {
    id: "productividad",
    label: "Productividad",
    accent: "#3B82F6",
    description: "Agenda, citas y reuniones sincronizadas automáticamente desde cualquier canal.",
    items: [
      { name: "AgendaPro", desc: "Citas y reservas automáticas sincronizadas con tu calendario profesional.", icon: CalendarCheck, color: "#3B82F6", features: ["Reservas desde WhatsApp", "Confirmación automática", "Recordatorios IA"] },
      { name: "Calendly", desc: "Reuniones automáticas con links de agendamiento directo desde el chat.", icon: CalendarDays, color: "#006BFF", features: ["Links en chat", "Zona horaria auto", "Sync bidireccional"] },
      { name: "Google Calendar", desc: "Sincronización bidireccional de eventos, recordatorios y disponibilidad.", icon: Calendar, color: "#4285F4", features: ["Eventos sincronizados", "Disponibilidad real-time", "Multi-calendario"] },
      { name: "Outlook", desc: "Microsoft Calendar integrado para gestionar agenda desde cualquier canal.", icon: Mail, color: "#0078D4", features: ["Microsoft 365", "Teams integrado", "Agenda compartida"] },
      { name: "Reservo", desc: "Sistema de reservas online conectado directamente a tus canales.", icon: CalendarRange, color: "#10B981", features: ["Reservas online", "Pagos integrados", "Notificaciones auto"] },
    ],
  },
  {
    id: "salud",
    label: "Salud",
    accent: "#22D3EE",
    description: "Gestión de pacientes, citas médicas y recordatorios clínicos automatizados.",
    items: [
      { name: "Dentalink", desc: "Gestión de pacientes para clínicas dentales con recordatorios automáticos.", icon: Stethoscope, color: "#22D3EE", features: ["Ficha paciente", "Recordatorios SMS", "Agenda clínica"] },
      { name: "Medilink", desc: "Plataforma médica integrada para agendar, confirmar y recordar citas.", icon: Stethoscope, color: "#F43F5E", features: ["Historial médico", "Confirmación cita", "Seguimiento post-consulta"] },
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    accent: "#F59E0B",
    description: "Productos, pedidos y atención al cliente de tu tienda conectados a tu inbox.",
    items: [
      { name: "Shopify", desc: "Sincroniza productos, pedidos y notificaciones de tu tienda Shopify.", icon: ShoppingCart, color: "#96BF48", features: ["Catálogo sync", "Estado de pedido", "Abandono de carrito"] },
      { name: "WooCommerce", desc: "Conecta tu tienda WordPress con alertas de pedidos y seguimiento.", icon: Code2, color: "#9B5C8F", features: ["WordPress nativo", "Tracking pedidos", "Stock alerts"] },
      { name: "MercadoLibre", desc: "Gestiona preguntas y ventas de MercadoLibre desde tu inbox unificado.", icon: ShoppingCart, color: "#FFE600", features: ["Respuesta preguntas", "Gestión ventas", "Reputación auto"] },
    ],
  },
  {
    id: "desarrollo",
    label: "Desarrollo",
    accent: "#10B981",
    description: "APIs, webhooks y bases de datos para integraciones 100% personalizadas.",
    items: [
      { name: "API REST", desc: "Endpoints personalizados y webhooks para integraciones a medida.", icon: Webhook, color: "#F59E0B", features: ["RESTful API", "Webhooks real-time", "Rate limiting"] },
      { name: "MySQL", desc: "Conecta bases de datos para consultas automáticas y actualización de registros.", icon: Database, color: "#00758F", features: ["Queries automáticas", "CRUD operations", "Data sync"] },
    ],
  },
];

const platformStats = [
  { value: "18+", label: "Conectores nativos", icon: Link2 },
  { value: "99.9%", label: "SLA Uptime", icon: Shield },
  { value: "<200ms", label: "Latencia p95", icon: Clock },
  { value: "2.4M+", label: "Mensajes/mes", icon: BarChart3 },
];

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
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-amber-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm overflow-hidden">
            <video src="/logo-animated.webm" autoPlay loop muted playsInline className="w-14 h-14 md:w-16 md:h-16 object-contain" />
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
                    <button className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
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
          </div>
        </section>

        {/* ══════════════════════════════════════
            CANALES — Premium channel showcase
            ══════════════════════════════════════ */}
        <section className="pt-20 md:pt-28 pb-16 px-4 relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <Reveal className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400/60 mb-4">Canales nativos</p>
              <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-5">
                Todos tus canales
                <span className="text-gradient"> en un solo inbox</span>
              </h2>
              <p className="text-[14px] text-white/30 max-w-md mx-auto leading-relaxed">
                WhatsApp, Instagram, Facebook, Email y Web — una sola bandeja potenciada por IA.
              </p>
            </Reveal>

            {/* Featured card (WhatsApp) + remaining grid */}
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5 mb-5">
              {/* Featured — WhatsApp */}
              <Reveal>
                <div
                  className="group relative h-full p-7 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${channels[0].color}06, transparent 60%)`,
                    border: `1px solid ${channels[0].color}12`,
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${channels[0].color}30, transparent)` }} />
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
                        style={{ backgroundColor: `${channels[0].color}15`, border: `1px solid ${channels[0].color}25` }}
                      >
                        <img src={channels[0].image} alt={channels[0].name} className="w-7 h-7 object-contain" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{channels[0].name}</h3>
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest" style={{ color: `${channels[0].color}80` }}>Canal principal</span>
                      </div>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${channels[0].color}12`, color: channels[0].color, border: `1px solid ${channels[0].color}20` }}
                    >
                      Más popular
                    </div>
                  </div>

                  <p className="text-[13px] text-white/40 leading-relaxed mb-6">{channels[0].desc}</p>

                  <div className="grid grid-cols-3 gap-3">
                    {["Envío masivo", "Plantillas HSM", "Bot 24/7"].map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                        style={{ backgroundColor: `${channels[0].color}06`, border: `1px solid ${channels[0].color}0a` }}
                      >
                        <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: `${channels[0].color}70` }} />
                        <span className="text-[11px] text-white/45 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Top-right pair: Instagram + Messenger */}
              <div className="grid grid-rows-2 gap-5">
                {channels.slice(1, 3).map((ch, i) => (
                  <Reveal key={i} delay={80 + i * 60}>
                    <div
                      className="group relative p-5 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-0.5 h-full"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${ch.color}40, transparent)` }} />
                      <div className="flex items-center gap-4">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundColor: `${ch.color}12`, border: `1px solid ${ch.color}20` }}
                        >
                          <img src={ch.image} alt={ch.name} className="w-5 h-5 object-contain" style={ch.invert ? { filter: "brightness(0) invert(1)" } : undefined} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{ch.name}</h3>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50 shrink-0" />
                          </div>
                          <p className="text-[12px] text-white/30 leading-relaxed line-clamp-2">{ch.desc}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Bottom row: Email, Chat Web, Cloud API */}
            <div className="grid sm:grid-cols-3 gap-5">
              {channels.slice(3).map((ch, i) => (
                <Reveal key={i} delay={200 + i * 60}>
                  <div
                    className="group relative p-5 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-0.5"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${ch.color}40, transparent)` }} />
                    
                    <div className="flex items-center gap-3.5 mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110"
                        style={{ backgroundColor: `${ch.color}12`, border: `1px solid ${ch.color}20` }}
                      >
                        <img src={ch.image} alt={ch.name} className="w-5 h-5 object-contain" style={ch.invert ? { filter: "brightness(0) invert(1)" } : undefined} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{ch.name}</h3>
                        {(ch as any).badge && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: `${ch.color}70` }}>{(ch as any).badge}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-[12px] text-white/30 leading-relaxed mb-4">{ch.desc}</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400/50" />
                      <span className="text-[10px] text-white/20">Incluido en todos los planes</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            INTEGRACIONES — Live system visualization
            ══════════════════════════════════════ */}
        <section className="py-8 md:py-12 px-4 relative overflow-hidden">

          <div className="max-w-6xl mx-auto relative">
            {/* Section header */}
            <Reveal className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/50 mb-5">Ecosistema de integraciones</p>
              <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-[1.12] mb-5">
                Cada herramienta que necesitas,{" "}
                <br className="hidden sm:block" />
                <span className="text-gradient">lista para conectar</span>
              </h2>
              <p className="text-[14px] md:text-[15px] text-white/30 max-w-xl mx-auto leading-relaxed">
                12 integraciones nativas organizadas por industria. Configuración en minutos,
                sincronización en tiempo real, orquestadas por IA.
              </p>
            </Reveal>

            {/* === LIVE SYSTEM VISUALIZATION === */}
            <Reveal delay={40}>
              <div className="relative rounded-2xl border border-white/[0.06] bg-[#07070d] overflow-hidden">
                {/* Top bar — simulated system header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
                    </div>
                    <span className="text-[10px] font-mono text-white/20">withmia.integrations.dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 animate-pulse" style={{ animationDuration: "2s" }} />
                    <span className="text-[9px] font-mono text-emerald-400/50 uppercase tracking-wider">Sistema activo</span>
                  </div>
                </div>

                {/* Main content — split layout */}
                <div className="grid lg:grid-cols-[1fr_340px]">
                  {/* LEFT — Integration node map */}
                  <div className="relative p-6 md:p-8 min-h-[420px]">
                    {/* Background grid */}
                    <div
                      className="absolute inset-0 opacity-[0.03]"
                      style={{
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    />

                    {/* Center hub */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <div className="relative">
                        <div className="absolute -inset-6 rounded-full bg-violet-500/[0.04] animate-pulse" style={{ animationDuration: "4s" }} />
                        <div className="absolute -inset-12 rounded-full border border-violet-500/[0.04]" />
                        <div className="absolute -inset-20 rounded-full border border-white/[0.02]" />
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-amber-500/10 border border-white/[0.1] flex items-center justify-center overflow-hidden">
                          <video src="/logo-animated.webm" autoPlay loop muted playsInline className="w-9 h-9 object-contain pointer-events-none" />
                        </div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="text-[8px] font-mono text-violet-400/40 tracking-wider">ORQUESTADOR</span>
                        </div>
                      </div>
                    </div>

                    {/* SVG connections */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        {integrationCategories.flatMap(cat => cat.items).map((item, i) => (
                          <linearGradient key={`lg${i}`} id={`intg-line-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={item.color} stopOpacity="0.15" />
                            <stop offset="50%" stopColor={item.color} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={item.color} stopOpacity="0.05" />
                          </linearGradient>
                        ))}
                      </defs>
                      {/* Animated connection lines from center to each integration position */}
                      {(() => {
                        const allItems = integrationCategories.flatMap(cat => cat.items);
                        const total = allItems.length;
                        return allItems.map((item, i) => {
                          const angle = (360 / total) * i - 90;
                          const rad = (angle * Math.PI) / 180;
                          const cx = 50;
                          const cy = 50;
                          const r = 36;
                          const ex = cx + r * Math.cos(rad);
                          const ey = cy + r * Math.sin(rad);
                          return (
                            <g key={`conn${i}`}>
                              <line
                                x1={`${cx}%`} y1={`${cy}%`}
                                x2={`${ex}%`} y2={`${ey}%`}
                                stroke={item.color}
                                strokeWidth="0.5"
                                strokeOpacity="0.08"
                              />
                              <line
                                x1={`${cx}%`} y1={`${cy}%`}
                                x2={`${ex}%`} y2={`${ey}%`}
                                stroke={`url(#intg-line-${i})`}
                                strokeWidth="1"
                                strokeDasharray="3 5"
                                className="intg-flow-line"
                                style={{ animationDelay: `${i * 0.4}s` }}
                              />
                            </g>
                          );
                        });
                      })()}
                    </svg>

                    {/* Integration nodes positioned in a circle */}
                    {(() => {
                      const allItems = integrationCategories.flatMap(cat =>
                        cat.items.map(item => ({...item, catAccent: cat.accent, catLabel: cat.label}))
                      );
                      const total = allItems.length;
                      return allItems.map((item, i) => {
                        const angle = (360 / total) * i - 90;
                        const rad = (angle * Math.PI) / 180;
                        const r = 36;
                        const x = 50 + r * Math.cos(rad);
                        const y = 50 + r * Math.sin(rad);
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.name}
                            className="absolute z-10 group"
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            <div className="relative flex flex-col items-center gap-1.5">
                              {/* Pulse ring */}
                              <div
                                className="absolute -inset-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `radial-gradient(circle, ${item.color}10, transparent 70%)` }}
                              />
                              <div
                                className="relative w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                                style={{
                                  backgroundColor: `${item.color}0c`,
                                  border: `1px solid ${item.color}18`,
                                }}
                              >
                                <Icon className="w-4 h-4 md:w-[18px] md:h-[18px]" style={{ color: `${item.color}bb` }} />
                              </div>
                              <span className="text-[8px] md:text-[9px] font-semibold text-white/30 group-hover:text-white/70 transition-colors whitespace-nowrap">
                                {item.name}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* RIGHT — Live event feed */}
                  <div className="border-t lg:border-t-0 lg:border-l border-white/[0.05] bg-white/[0.008]">
                    {/* Feed header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                      <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">Actividad en tiempo real</span>
                      <span className="text-[9px] font-mono text-white/15">hace 2s</span>
                    </div>

                    {/* Simulated events */}
                    <div className="divide-y divide-white/[0.03]">
                      {[
                        { action: "Cita confirmada", source: "AgendaPro", target: "WhatsApp", color: "#3B82F6", time: "ahora" },
                        { action: "Pedido recibido", source: "Shopify", target: "Email", color: "#96BF48", time: "12s" },
                        { action: "Paciente agendado", source: "Dentalink", target: "WhatsApp", color: "#22D3EE", time: "34s" },
                        { action: "Pregunta respondida", source: "MercadoLibre", target: "IA Bot", color: "#FFE600", time: "1m" },
                        { action: "Reunión creada", source: "Calendly", target: "Google Cal", color: "#006BFF", time: "2m" },
                        { action: "Webhook recibido", source: "API REST", target: "Sistema", color: "#F59E0B", time: "3m" },
                        { action: "Carrito abandonado", source: "WooCommerce", target: "WhatsApp", color: "#9B5C8F", time: "4m" },
                        { action: "Sync completado", source: "Google Calendar", target: "Outlook", color: "#4285F4", time: "5m" },
                      ].map((evt, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 px-5 py-3.5 group hover:bg-white/[0.01] transition-colors intg-event-row"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: evt.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-white/50 font-medium truncate">
                              {evt.action}
                            </p>
                            <p className="text-[9px] text-white/20 truncate">
                              {evt.source} <span className="text-white/10 mx-1">→</span> {evt.target}
                            </p>
                          </div>
                          <span className="text-[8px] font-mono text-white/15 shrink-0 mt-0.5">
                            {evt.time}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Feed footer */}
                    <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                      <span className="text-[9px] text-white/15">12 integraciones conectadas</span>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-400/50" />
                        <span className="text-[8px] font-mono text-emerald-400/40">OK</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom status bar */}
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/[0.04] bg-white/[0.01]">
                  <div className="flex items-center gap-4">
                    {integrationCategories.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.accent }} />
                        <span className="text-[9px] text-white/20 font-medium">{cat.label}</span>
                        <span className="text-[8px] text-white/10 font-mono">{cat.items.length}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[8px] font-mono text-white/10">v2.4.1</span>
                </div>
              </div>
            </Reveal>

            {/* How it works — Premium 3-step flow */}
            <Reveal delay={80} className="mt-24">
              <div className="text-center mb-14">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-400/40 mb-4">Implementación</p>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-3">
                  Conecta en <span className="text-gradient">3 pasos</span>
                </h3>
                <p className="text-[13px] text-white/20 max-w-md mx-auto leading-relaxed">
                  Sin código, sin fricción. De cero a producción en menos de 5 minutos.
                </p>
              </div>

              <div className="relative">
                {/* Connecting timeline (desktop) */}
                <div className="hidden md:block absolute top-[52px] left-[16.6%] right-[16.6%] h-px">
                  <div className="w-full h-full bg-gradient-to-r from-violet-500/10 via-amber-400/15 to-emerald-400/10" />
                  {/* Animated pulse along the line */}
                  <div className="absolute top-0 left-0 w-12 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: "intg-timeline-flow 3s ease-in-out infinite" }} />
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                  {[
                    {
                      step: "01",
                      title: "Selecciona",
                      desc: "Elige la integración desde tu panel. Filtros por industria y categoría para encontrar exactamente lo que necesitas.",
                      icon: Zap,
                      accent: "#8B5CF6",
                      detail: "Panel de control",
                    },
                    {
                      step: "02",
                      title: "Autoriza",
                      desc: "Conecta con OAuth 2.0 o API key. Un clic, sin configuración manual, sin necesidad de desarrolladores.",
                      icon: RefreshCw,
                      accent: "#F59E0B",
                      detail: "OAuth / API Key",
                    },
                    {
                      step: "03",
                      title: "Automatiza",
                      desc: "La IA orquesta flujos entre todos tus canales e integraciones. Escala sin intervención humana.",
                      icon: Bot,
                      accent: "#10B981",
                      detail: "IA Orquestadora",
                    },
                  ].map((s, i) => (
                    <div key={i} className="relative group">
                      {/* Step circle on timeline */}
                      <div className="flex justify-center mb-6">
                        <div className="relative">
                          <div
                            className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                            style={{
                              background: `linear-gradient(135deg, ${s.accent}18, ${s.accent}08)`,
                              border: `1.5px solid ${s.accent}25`,
                            }}
                          >
                            <s.icon className="w-4.5 h-4.5 transition-colors duration-500" style={{ color: `${s.accent}90` }} />
                          </div>
                          {/* Pulse ring on hover */}
                          <div
                            className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                            style={{ border: `1px solid ${s.accent}15` }}
                          />
                          {/* Step badge */}
                          <div
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold font-mono"
                            style={{
                              backgroundColor: `${s.accent}20`,
                              color: `${s.accent}cc`,
                              border: `1px solid ${s.accent}30`,
                            }}
                          >
                            {s.step}
                          </div>
                        </div>
                      </div>

                      {/* Card */}
                      <div
                        className="relative p-6 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.08] transition-all duration-500 text-center"
                      >
                        {/* Top accent */}
                        <div
                          className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ background: `linear-gradient(90deg, transparent, ${s.accent}25, transparent)` }}
                        />

                        <h4 className="text-[15px] font-bold text-white/75 mb-2 group-hover:text-white transition-colors duration-300">
                          {s.title}
                        </h4>
                        <p className="text-[12px] text-white/20 leading-[1.8] mb-4 group-hover:text-white/35 transition-colors duration-500">
                          {s.desc}
                        </p>

                        {/* Detail tag */}
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${s.accent}08`,
                            color: `${s.accent}70`,
                            border: `1px solid ${s.accent}12`,
                          }}
                        >
                          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${s.accent}80` }} />
                          {s.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Bottom CTA — enterprise grade */}
            <Reveal delay={100} className="mt-16">
              <div className="relative rounded-2xl border border-white/[0.05] bg-gradient-to-br from-white/[0.02] to-white/[0.005] overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
                {/* Ambient glow */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-amber-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-[200px] h-[200px] bg-violet-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

                <div className="relative p-8 md:p-12">
                  <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                    {/* Left content */}
                    <div className="flex-1 text-center lg:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/[0.06] border border-amber-400/10 mb-5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" style={{ animationDuration: "2.5s" }} />
                        <span className="text-[9px] font-semibold text-amber-400/60 uppercase tracking-wider">Integraciones custom</span>
                      </div>
                      <h3 className="text-lg md:text-2xl font-bold text-white mb-3 tracking-tight">
                        ¿No encuentras tu herramienta?
                      </h3>
                      <p className="text-[13px] text-white/30 max-w-lg leading-relaxed mb-4">
                        Nuestro equipo desarrolla integraciones a medida. API REST documentada, webhooks bidireccionales con retry automático y conectores enterprise.
                      </p>
                      {/* Trust signals */}
                      <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                        {[
                          { label: "API REST", icon: Webhook },
                          { label: "OAuth 2.0", icon: Shield },
                          { label: "Webhooks", icon: RefreshCw },
                        ].map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] text-white/20">
                            <t.icon className="w-3 h-3 text-white/15" />
                            <span>{t.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
                      <a href="/api">
                        <button className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-[13px] transition-all duration-300 hover:-translate-y-0.5">
                          Conoce sobre nuestra API
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </a>
                      <a href="/docs">
                        <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/[0.08] text-[13px] text-white/40 font-medium hover:text-white/70 hover:border-white/[0.15] transition-all duration-300">
                          Documentación
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════
            END — Content sections
            ══════════════════════════════════════ */}
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
          width: 500px; height: 500px;
          top: -250px; left: -80px;
          background: radial-gradient(circle, rgba(167,139,250,0.08), transparent 70%);
          animation: intg-drift-1 18s ease-in-out infinite alternate;
        }
        .intg-aurora-2 {
          width: 400px; height: 400px;
          top: -50px; right: -150px;
          background: radial-gradient(circle, rgba(245,158,11,0.05), transparent 70%);
          animation: intg-drift-2 22s ease-in-out infinite alternate;
        }
        .intg-aurora-3 {
          width: 350px; height: 350px;
          top: 50px; left: 40%;
          background: radial-gradient(circle, rgba(34,211,238,0.03), transparent 70%);
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

        @keyframes intg-timeline-flow {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }

        .intg-flow-line {
          animation: intg-dash-flow 2.5s linear infinite;
        }
        @keyframes intg-dash-flow {
          from { stroke-dashoffset: 16; }
          to { stroke-dashoffset: 0; }
        }

        .intg-event-row {
          animation: intg-event-fade 0.6s ease-out both;
        }
        @keyframes intg-event-fade {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default IntegrationsPage;
