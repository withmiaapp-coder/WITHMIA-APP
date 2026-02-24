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
  Search,
  ExternalLink,
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

  const [activeTag, setActiveTag] = useState("Todos");
  const [search, setSearch] = useState("");
  const filtered = integrations.filter((i) => {
    const matchTag = activeTag === "Todos" || i.tag === activeTag;
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.desc.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

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
        <section className="py-20 md:py-28 px-4 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] max-w-xl h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <div className="max-w-5xl mx-auto relative">
            {/* Header — centered, minimal */}
            <Reveal className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/50 mb-5">Ecosistema de integraciones</p>
              <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-5">
                Tu stack completo,
                <span className="text-gradient"> conectado</span>
              </h2>
              <p className="text-[14px] text-white/30 max-w-md mx-auto leading-relaxed">
                Agendamiento, e-commerce, salud y desarrollo. Todo sincronizado con WITHMIA en tiempo real.
              </p>
            </Reveal>

            {/* Filter bar — inline pills + search */}
            <Reveal delay={60} className="mb-8">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1 overflow-x-auto pb-1 scrollbar-none">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(tag)}
                      className={`px-4 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all duration-300 ${
                        activeTag === tag
                          ? "bg-white/[0.08] text-white"
                          : "text-white/25 hover:text-white/50 hover:bg-white/[0.03]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-56 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[12px] text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.12] transition-all duration-300"
                  />
                </div>
              </div>
            </Reveal>

            {/* Table-style integration list */}
            <Reveal delay={100}>
              {/* Column headers */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto] gap-6 px-5 py-3 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/15">Integración</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/15 w-24 text-center">Categoría</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/15 w-20 text-right">Estado</span>
              </div>

              <div className="border border-white/[0.05] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                {filtered.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.name}
                      className="group grid sm:grid-cols-[1fr_auto_auto] gap-4 sm:gap-6 items-center px-5 py-4 transition-colors duration-300 hover:bg-white/[0.02] cursor-pointer"
                    >
                      {/* Left: icon + name + desc */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-400 group-hover:scale-105"
                          style={{
                            backgroundColor: `${item.color}0c`,
                            border: `1px solid ${item.color}15`,
                          }}
                        >
                          <Icon className="w-[17px] h-[17px]" style={{ color: `${item.color}aa` }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-semibold text-white/75 group-hover:text-white transition-colors duration-300 mb-0.5">
                            {item.name}
                          </h3>
                          <p className="text-[11px] text-white/20 leading-relaxed truncate group-hover:text-white/30 transition-colors duration-300">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      {/* Center: category tag */}
                      <span
                        className="text-[10px] font-medium px-2.5 py-1 rounded-md w-24 text-center whitespace-nowrap"
                        style={{ backgroundColor: `${item.color}08`, color: `${item.color}60` }}
                      >
                        {item.tag}
                      </span>

                      {/* Right: status */}
                      <div className="flex items-center justify-end gap-2 w-20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
                        <span className="text-[10px] text-white/20 font-medium">Activa</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-16 border border-white/[0.05] rounded-2xl">
                  <Search className="w-5 h-5 text-white/10 mx-auto mb-3" />
                  <p className="text-white/25 text-sm mb-1">Sin resultados</p>
                  <button
                    onClick={() => { setSearch(""); setActiveTag("Todos"); }}
                    className="text-amber-400/50 text-[11px] mt-1 hover:text-amber-400 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </Reveal>

            {/* Bottom note */}
            <Reveal delay={120}>
              <div className="flex items-center justify-between mt-8 px-1">
                <p className="text-[11px] text-white/15">
                  {filtered.length} integración{filtered.length !== 1 ? "es" : ""} disponible{filtered.length !== 1 ? "s" : ""}
                </p>
                <a href="/contacto" className="text-[11px] text-white/25 hover:text-amber-400/70 transition-colors duration-300 flex items-center gap-1.5">
                  ¿No encuentras tu herramienta?
                  <ArrowRight className="w-3 h-3" />
                </a>
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
