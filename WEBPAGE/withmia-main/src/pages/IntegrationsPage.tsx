import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
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
} from "lucide-react";

/* ── Data ── */

const channels = [
  { name: "WhatsApp", image: "/icons/whatsapp.webp", color: "#25D366", desc: "Business API oficial con envío masivo, plantillas HSM y respuestas automáticas 24/7." },
  { name: "Instagram", image: "/icons/instagram-new.webp", color: "#E1306C", desc: "DMs, stories y comentarios unificados. Responde desde un solo inbox con IA." },
  { name: "Messenger", image: "/icons/facebook-new.webp", color: "#0084FF", desc: "Facebook Messenger integrado con respuestas automáticas y flujos conversacionales." },
  { name: "Email", image: "/icons/gmail-new.webp", color: "#EA4335", desc: "Gmail, Outlook y SMTP personalizado. Correos entrantes convertidos en conversaciones." },
  { name: "Chat Web", image: "/icons/web-new.webp", color: "#61DAFB", invert: true, desc: "Widget embebible para tu sitio web con IA conversacional y diseño personalizable." },
  { name: "Cloud API", image: "/icons/api-final.webp", color: "#34D399", desc: "API REST para conectar cualquier sistema externo con webhooks bidireccionales." },
];

const integrations = [
  { name: "AgendaPro", desc: "Citas y reservas automáticas sincronizadas con tu calendario profesional.", icon: CalendarCheck, tag: "Productividad", color: "#3B82F6" },
  { name: "Calendly", desc: "Reuniones automáticas con links de agendamiento directo desde el chat.", icon: CalendarDays, tag: "Productividad", color: "#006BFF" },
  { name: "Google Calendar", desc: "Sincronización bidireccional de eventos, recordatorios y disponibilidad.", icon: Calendar, tag: "Productividad", color: "#4285F4" },
  { name: "Outlook", desc: "Microsoft Calendar integrado para gestionar agenda desde cualquier canal.", icon: Mail, tag: "Productividad", color: "#0078D4" },
  { name: "Reservo", desc: "Sistema de reservas online conectado directamente a tus canales de comunicación.", icon: CalendarRange, tag: "Productividad", color: "#10B981" },
  { name: "Dentalink", desc: "Gestión de pacientes para clínicas dentales con recordatorios automáticos.", icon: Stethoscope, tag: "Salud", color: "#22D3EE" },
  { name: "Medilink", desc: "Plataforma médica integrada para agendar, confirmar y recordar citas.", icon: Stethoscope, tag: "Salud", color: "#F43F5E" },
  { name: "Shopify", desc: "Sincroniza productos, pedidos y notificaciones de tu tienda Shopify.", icon: ShoppingCart, tag: "E-commerce", color: "#96BF48" },
  { name: "WooCommerce", desc: "Conecta tu tienda WordPress con alertas de pedidos y seguimiento.", icon: Code2, tag: "E-commerce", color: "#9B5C8F" },
  { name: "MercadoLibre", desc: "Gestiona preguntas y ventas de MercadoLibre desde tu inbox unificado.", icon: ShoppingCart, tag: "E-commerce", color: "#FFE600" },
  { name: "API REST", desc: "Endpoints personalizados y webhooks para integraciones a medida.", icon: Webhook, tag: "Desarrollo", color: "#F59E0B" },
  { name: "MySQL", desc: "Conecta bases de datos para consultas automáticas y actualización de registros.", icon: Database, tag: "Desarrollo", color: "#00758F" },
];

const tags = ["Todos", "Productividad", "Salud", "E-commerce", "Desarrollo"];

const metrics = [
  { value: "6", label: "Canales nativos", icon: MessageSquare, color: "#a78bfa" },
  { value: "12+", label: "Integraciones", icon: Plug, color: "#f59e0b" },
  { value: "99.9%", label: "Uptime SLA", icon: Shield, color: "#34d399" },
  { value: "<200ms", label: "Latencia", icon: Activity, color: "#22d3ee" },
];

/* ── Component ── */

const IntegrationsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTag, setActiveTag] = useState("Todos");
  const [search, setSearch] = useState("");

  const filtered = integrations.filter((i) => {
    const matchTag = activeTag === "Todos" || i.tag === activeTag;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#030507]">
      <Navigation />
      <main className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-500/[0.03] rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-950/30 mb-8">
              <Plug className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-300/80 tracking-wide">Ecosistema conectado</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Todas tus herramientas,
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
                una sola plataforma
              </span>
            </h1>

            <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-12">
              Conecta tus canales de comunicación, agendas, CRMs y herramientas
              de e-commerce. Todo orquestado por IA en tiempo real.
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {metrics.map((m, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <m.icon className="w-4 h-4 mx-auto mb-2" style={{ color: m.color }} />
                  <p className="text-xl font-bold text-white">{m.value}</p>
                  <p className="text-[11px] text-white/30 uppercase tracking-wider mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CANALES ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-violet-400/60 uppercase tracking-widest mb-4">
                Canales de comunicación
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Todos tus canales en un solo inbox
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                Recibe y responde mensajes de WhatsApp, Instagram, Facebook, Email
                y tu sitio web desde una sola bandeja de entrada potenciada por IA.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {channels.map((ch, i) => (
                <div
                  key={i}
                  className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500"
                  style={{ ["--ch-color" as string]: ch.color }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                      style={{
                        backgroundColor: `${ch.color}15`,
                        border: `1px solid ${ch.color}25`,
                      }}
                    >
                      <img
                        src={ch.image}
                        alt={ch.name}
                        className="w-5 h-5 object-contain"
                        style={ch.invert ? { filter: "brightness(0) invert(1)" } : undefined}
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white group-hover:text-white transition-colors">
                        {ch.name}
                      </h3>
                      <span
                        className="text-[10px] font-mono font-medium uppercase tracking-wider"
                        style={{ color: `${ch.color}99` }}
                      >
                        Canal nativo
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-white/35 leading-relaxed">{ch.desc}</p>
                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/50" />
                    <span className="text-[11px] text-white/25">Incluido en todos los planes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTEGRACIONES ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest mb-4">
                Integraciones
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Conecta las herramientas que ya usas
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                Desde agendamiento hasta e-commerce, WITHMIA se integra con las
                plataformas más usadas en Latinoamérica.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      activeTag === tag
                        ? "bg-white/[0.1] text-white border border-white/[0.15]"
                        : "bg-white/[0.02] text-white/40 border border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar integración..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] transition-all"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="group p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: `${item.color}12`,
                          border: `1px solid ${item.color}20`,
                        }}
                      >
                        <Icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                            {item.name}
                          </h3>
                          <span className="text-[9px] font-medium text-white/20 uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] shrink-0">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-xs text-white/30 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-white/30 text-sm">No se encontraron integraciones.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── CÓMO FUNCIONA ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-violet-400/60 uppercase tracking-widest mb-4">
                Así de fácil
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Conectar toma minutos
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Elige tu integración",
                  desc: "Selecciona el canal o herramienta que quieres conectar desde nuestro catálogo.",
                  color: "violet",
                },
                {
                  step: "02",
                  title: "Conecta en un click",
                  desc: "Autoriza la conexión con OAuth o ingresa tus credenciales de API. Sin código necesario.",
                  color: "amber",
                },
                {
                  step: "03",
                  title: "Listo, está funcionando",
                  desc: "Los mensajes fluyen automáticamente. La IA aprende de cada interacción y optimiza respuestas.",
                  color: "emerald",
                },
              ].map((item, i) => (
                <div key={i} className="relative p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] group hover:border-white/[0.1] transition-all duration-500">
                  <span className={`text-4xl font-black text-${item.color}-500/10 block mb-4`}>
                    {item.step}
                  </span>
                  <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ¿NO ENCUENTRAS TU INTEGRACIÓN? ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="p-10 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <Globe className="w-10 h-10 text-violet-400/40 mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                ¿No encuentras tu integración?
              </h2>
              <p className="text-white/40 mb-8 max-w-lg mx-auto">
                Nuestra API REST te permite conectar cualquier sistema. Además, nuestro equipo
                puede desarrollar integraciones personalizadas para tu negocio.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://app.withmia.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)] hover:-translate-y-px"
                >
                  Ver documentación API
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="/contacto"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300"
                >
                  Solicitar integración
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default IntegrationsPage;
