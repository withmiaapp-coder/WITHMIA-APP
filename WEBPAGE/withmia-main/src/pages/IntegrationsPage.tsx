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
  Bell,
  Bot,
  Link2,
  BarChart3,
  Clock,
  Shield,
  Globe,
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

  const [expandedCat, setExpandedCat] = useState<string>("productividad");

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
            INTEGRACIONES — Clean table layout
            ══════════════════════════════════════ */}
        <section ref={ecoRef} className="py-16 md:py-24 px-4 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] max-w-xl h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[150px] pointer-events-none" />

          <div className="max-w-6xl mx-auto relative">
            {/* Header */}
            <Reveal className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/15 to-amber-500/15 border border-violet-500/20 text-xs text-violet-300 font-semibold mb-5 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Ecosistema completo
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-[1.15] mb-4">
                Tu stack completo,{" "}
                <span className="text-gradient">conectado</span>
              </h2>
              <p className="text-[14px] md:text-[15px] text-white/35 max-w-lg mx-auto leading-relaxed">
                Canales de mensajería, agendas, CRMs e integraciones custom
                <br className="hidden sm:block" />
                orquestadas por IA en tiempo real.
              </p>
            </Reveal>

            {/* ── Desktop Constellation ── */}
            <div className="relative mb-6">
              <div
                className={`hidden md:block relative w-full transition-opacity duration-1000 ${ecoVisible ? "opacity-100" : "opacity-0"}`}
                style={{ aspectRatio: "700 / 450" }}
              >
                {/* SVG Web Layer */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 700 450" fill="none" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <radialGradient id="ecoCenter" cx="50%" cy="50%" r="42%">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                    </radialGradient>
                    {pgChNodes.map((ch, i) => (
                      <linearGradient key={`eg${i}`} id={`ecoG${i}`} x1="350" y1="225" x2={ch.x} y2={ch.y} gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.25" />
                        <stop offset="100%" stopColor={ch.color} stopOpacity="0.45" />
                      </linearGradient>
                    ))}
                    <filter id="ecoGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Background center glow */}
                  <circle cx="350" cy="225" r="210" fill="url(#ecoCenter)" />

                  {/* Concentric web rings */}
                  {pgRingPaths.map((d, i) => {
                    const colors = ['#a78bfa', '#818cf8', '#6366f1', '#c084fc', '#f59e0b'];
                    return (
                      <path
                        key={`pr${i}`}
                        d={d}
                        stroke={colors[i]}
                        strokeWidth={i === 4 ? 0.5 : 0.3}
                        strokeOpacity={0.03 + i * 0.01}
                        fill="none"
                      />
                    );
                  })}

                  {/* Radial strands */}
                  {pgStrandAngles.map((a, i) => (
                    <line
                      key={`ps${i}`}
                      x1={350 + 12 * Math.cos(a)} y1={225 + 12 * Math.sin(a)}
                      x2={350 + 215 * Math.cos(a)} y2={225 + 215 * Math.sin(a)}
                      stroke="white"
                      strokeWidth={i % 4 === 0 ? 0.3 : 0.15}
                      strokeOpacity={i % 4 === 0 ? 0.05 : 0.025}
                    />
                  ))}

                  {/* Knots at intersections */}
                  {pgKnots.map((k, i) => (
                    <circle
                      key={`pk${i}`}
                      cx={k.x} cy={k.y}
                      r={i % 5 === 0 ? 1 : 0.6}
                      fill="white"
                      fillOpacity={i % 5 === 0 ? 0.07 : 0.025}
                      style={i % 7 === 0 ? { animation: `ecoPulse ${3 + (i % 4)}s ease-in-out infinite`, animationDelay: `${(i * 0.3) % 5}s` } : undefined}
                    />
                  ))}

                  {/* Center pulsing beacon */}
                  <circle cx="350" cy="225" r="8" fill="#a78bfa" fillOpacity="0.04">
                    <animate attributeName="r" values="6;12;6" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="0.04;0.08;0.04" dur="3s" repeatCount="indefinite" />
                  </circle>

                  {/* Center → Channel connection lines */}
                  {pgChNodes.map((ch, i) => (
                    <g key={`cl${i}`}>
                      <line
                        x1="350" y1="225" x2={ch.x} y2={ch.y}
                        stroke={ch.color}
                        strokeWidth={hoveredCh === i ? 2 : 1}
                        strokeOpacity={hoveredCh === i ? 0.06 : 0.02}
                        className="transition-all duration-300"
                      />
                      <line
                        x1="350" y1="225" x2={ch.x} y2={ch.y}
                        stroke={`url(#ecoG${i})`}
                        strokeWidth={hoveredCh === i ? 1.2 : 0.6}
                        strokeOpacity={hoveredCh === i ? 0.5 : 0.18}
                        strokeDasharray="3 4"
                        className="transition-all duration-300"
                        style={{ animation: `ecoDash 3.5s linear infinite`, animationDelay: `${i * 0.5}s` }}
                      />
                    </g>
                  ))}

                  {/* Integration → nearest channel curved connections */}
                  {pgIntNodes.map((node, i) => {
                    let minD = Infinity, nearest = pgChNodes[0];
                    pgChNodes.forEach(ch => {
                      const d = Math.hypot(ch.x - node.x, ch.y - node.y);
                      if (d < minD) { minD = d; nearest = ch; }
                    });
                    const mx = ((node.x + nearest.x) / 2) * 0.88 + 350 * 0.12;
                    const my = ((node.y + nearest.y) / 2) * 0.88 + 225 * 0.12;
                    return (
                      <path
                        key={`ip${i}`}
                        d={`M ${node.x.toFixed(1)} ${node.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${nearest.x.toFixed(1)} ${nearest.y.toFixed(1)}`}
                        stroke={node.color}
                        strokeWidth={hoveredInt === i ? 0.8 : 0.35}
                        strokeOpacity={hoveredInt === i ? 0.35 : 0.08}
                        fill="none"
                        strokeDasharray="2 4"
                        className="transition-all duration-300"
                        style={{ animation: `ecoDash 5s linear infinite`, animationDelay: `${i * 0.3}s` }}
                      />
                    );
                  })}

                  {/* Data flow particles along center→channel paths */}
                  {pgChNodes.map((ch, i) => (
                    <g key={`fp${i}`}>
                      <path id={`ef${i}`} d={`M 350 225 L ${ch.x} ${ch.y}`} fill="none" stroke="none" />
                      <circle r="1.5" fill={ch.color} fillOpacity="0.5">
                        <animateMotion dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.8}s`}>
                          <mpath href={`#ef${i}`} />
                        </animateMotion>
                        <animate attributeName="fill-opacity" values="0;0.5;0.5;0" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.8}s`} />
                        <animate attributeName="r" values="0.5;1.5;1.5;0.5" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.8}s`} />
                      </circle>
                    </g>
                  ))}
                </svg>

                {/* Center hub node (WITHMIA logo) */}
                <div className="absolute z-20" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                  <div className="relative">
                    <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-500/[0.05] to-amber-500/[0.03] animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="relative w-[60px] h-[60px] lg:w-[68px] lg:h-[68px] rounded-2xl bg-gradient-to-br from-violet-500/20 via-[#0a0a12] to-amber-500/15 border border-white/[0.12] flex items-center justify-center overflow-hidden">
                      <video src="/logo-animated.webm" autoPlay loop muted playsInline className="w-[40px] h-[40px] lg:w-[46px] lg:h-[46px] object-contain pointer-events-none" />
                    </div>
                    <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-[3px] rounded-full bg-emerald-400/[0.08] border border-emerald-400/20">
                      <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[7px] font-mono text-emerald-400/90 font-bold tracking-wider">LIVE</span>
                    </div>
                  </div>
                </div>

                {/* Channel nodes (inner ring) */}
                {pgChNodes.map((ch, i) => (
                  <div
                    key={`cn${i}`}
                    className="absolute z-10 group cursor-default"
                    style={{ left: `${(ch.x / 700) * 100}%`, top: `${(ch.y / 450) * 100}%`, transform: "translate(-50%, -50%)" }}
                    onMouseEnter={() => setHoveredCh(i)}
                    onMouseLeave={() => setHoveredCh(null)}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="relative">
                        <div
                          className="absolute -inset-1.5 rounded-xl transition-opacity duration-300"
                          style={{ background: `radial-gradient(circle, ${ch.color}15, transparent 70%)`, opacity: hoveredCh === i ? 1 : 0 }}
                        />
                        <div
                          className="relative w-[44px] h-[44px] lg:w-[50px] lg:h-[50px] rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                          style={{
                            backgroundColor: hoveredCh === i ? `${ch.color}18` : `${ch.color}0c`,
                            border: `1px solid ${hoveredCh === i ? `${ch.color}45` : `${ch.color}15`}`,
                          }}
                        >
                          <img
                            src={ch.image}
                            alt={ch.name}
                            className="w-[19px] h-[19px] lg:w-[22px] lg:h-[22px] object-contain"
                            style={(ch as any).invert ? { filter: "brightness(0) invert(1)" } : undefined}
                          />
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold tracking-wide transition-colors duration-200 ${hoveredCh === i ? "text-white/80" : "text-white/35"}`}>
                        {ch.name}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Integration nodes (outer ring) */}
                {pgIntNodes.map((node, i) => {
                  const Icon = node.icon;
                  const cosA = Math.cos(node.a);
                  const isLeft = cosA < -0.2;
                  return (
                    <div
                      key={`in${i}`}
                      className={`absolute z-10 group cursor-default transition-all duration-500 ${ecoVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
                      style={{
                        left: `${(node.x / 700) * 100}%`,
                        top: `${(node.y / 450) * 100}%`,
                        transform: "translate(-50%, -50%)",
                        transitionDelay: `${150 + i * 50}ms`,
                      }}
                      onMouseEnter={() => setHoveredInt(i)}
                      onMouseLeave={() => setHoveredInt(null)}
                    >
                      <div className={`flex items-center gap-2 ${isLeft ? "flex-row-reverse" : ""}`}>
                        <div className="relative">
                          <div
                            className="absolute -inset-1 rounded-lg transition-opacity duration-300"
                            style={{ background: `radial-gradient(circle, ${node.color}12, transparent 70%)`, opacity: hoveredInt === i ? 1 : 0 }}
                          />
                          <div
                            className="relative w-[34px] h-[34px] lg:w-[38px] lg:h-[38px] rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                            style={{
                              backgroundColor: hoveredInt === i ? `${node.color}14` : `${node.color}0a`,
                              border: `1px solid ${hoveredInt === i ? `${node.color}40` : `${node.color}12`}`,
                            }}
                          >
                            <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" style={{ color: node.color }} />
                          </div>
                        </div>
                        <div className={`min-w-0 ${isLeft ? "text-right" : ""}`}>
                          <p className="text-[10px] font-bold text-white/45 group-hover:text-white/90 whitespace-nowrap transition-colors leading-tight">
                            {node.name}
                          </p>
                          <p className="text-[8px] text-white/15 group-hover:text-white/40 whitespace-nowrap transition-colors">
                            {pgIntShortDescs[node.name]}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Mobile — grouped cards ── */}
              <div className="md:hidden space-y-4">
                <div className="flex justify-center gap-2 mb-3">
                  {channels.map((ch, i) => (
                    <div
                      key={i}
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${ch.color}0c`, border: `1px solid ${ch.color}15` }}
                    >
                      <img
                        src={ch.image}
                        alt={ch.name}
                        className="w-4 h-4 object-contain"
                        style={(ch as any).invert ? { filter: "brightness(0) invert(1)" } : undefined}
                      />
                    </div>
                  ))}
                </div>
                {mobileGroups.map((group) => (
                  <div key={group.label} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-0.5 h-3 rounded-full" style={{ background: `linear-gradient(to bottom, ${group.accent}80, transparent)` }} />
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">{group.label}</span>
                      </div>
                      <span className="text-[7px] font-mono text-emerald-400/50">{group.items.length} activos</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.name} className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg border border-white/[0.03] bg-white/[0.01]">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}0c`, border: `1px solid ${item.color}12` }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-white/70 truncate">{item.name}</p>
                              <p className="text-[8px] text-white/20 truncate">{pgIntShortDescs[item.name]}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

        @keyframes ecoDash {
          from { stroke-dashoffset: 7; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes ecoPulse {
          0%, 100% { opacity: 0.04; transform: scale(1); }
          50% { opacity: 0.12; transform: scale(1.3); }
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
