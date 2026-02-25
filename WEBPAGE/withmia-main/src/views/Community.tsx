import { useEffect, useState, useRef, type ReactNode } from "react";
import { Reveal } from "@/hooks/useAnimations";
import {
  ArrowRight,
  Users,
  MessageCircle,
  Zap,
  Lightbulb,
  Headphones,
  BookOpen,
  Code,
  Trophy,
  Hash,
  Heart,
  Shield,
  Globe,
  Calendar,
  Award,
  ExternalLink,
} from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/NwDufG8K";

/* ── Discord SVG ── */
const DiscordIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
  </svg>
);

/* ── Reveal ── */
const Reveal = ({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setV(true), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(28px)", transition: `opacity .65s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .65s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  );
};

/* ── Data ── */
const channels = [
  { icon: Hash, name: "general", desc: "Novedades, conversaciones abiertas y bienvenida a nuevos miembros", color: "#34d399" },
  { icon: Lightbulb, name: "ideas-y-feedback", desc: "Propón funcionalidades y mejoras que impactan el roadmap", color: "#f59e0b" },
  { icon: Headphones, name: "soporte", desc: "Recibe ayuda del equipo WITHMIA y de la comunidad", color: "#60a5fa" },
  { icon: Code, name: "desarrollo-api", desc: "Integraciones, webhooks, scripts y consultas técnicas", color: "#a78bfa" },
  { icon: BookOpen, name: "tutoriales", desc: "Guías paso a paso y mejores prácticas compartidas", color: "#2dd4bf" },
  { icon: Trophy, name: "casos-de-éxito", desc: "Comparte cómo WITHMIA transformó tu negocio", color: "#fb923c" },
];

const benefits = [
  { icon: Zap, title: "Acceso anticipado", desc: "Prueba funcionalidades antes de su lanzamiento oficial." },
  { icon: Users, title: "Networking LATAM", desc: "Conecta con empresarios y equipos de toda la región." },
  { icon: Lightbulb, title: "Influye en el producto", desc: "Tu feedback impacta directamente el roadmap." },
  { icon: Headphones, title: "Soporte directo", desc: "Respuestas del equipo y usuarios experimentados." },
  { icon: BookOpen, title: "Aprende en comunidad", desc: "Tutoriales exclusivos, webinars y Q&A en vivo." },
  { icon: Award, title: "Reconocimiento", desc: "Roles especiales, acceso beta y swag exclusivo." },
];

const events = [
  { title: "Office Hours", desc: "Q&A en vivo con el equipo de producto.", schedule: "Todos los jueves · 18:00 CLT", tag: "Semanal", tagColor: "#34d399" },
  { title: "Demo Day", desc: "La comunidad muestra sus integraciones y automatizaciones.", schedule: "Primer viernes del mes · 17:00 CLT", tag: "Mensual", tagColor: "#60a5fa" },
  { title: "Workshop: IA & Chatbots", desc: "Configura y optimiza tu asistente paso a paso.", schedule: "Próximo: 5 de marzo, 2026", tag: "Especial", tagColor: "#a78bfa" },
];

const rules = [
  { icon: Heart, title: "Sé respetuoso", desc: "Cero tolerancia al acoso, discriminación o lenguaje ofensivo." },
  { icon: Shield, title: "No spam", desc: "Evita la autopromoción excesiva y enlaces no solicitados." },
  { icon: MessageCircle, title: "Canal correcto", desc: "Publica en el canal apropiado para mantener el orden." },
  { icon: Users, title: "Ayuda a otros", desc: "Si puedes resolver una duda, hazlo. Todos crecemos." },
  { icon: Globe, title: "Español primero", desc: "Idioma principal español. Inglés también bienvenido." },
];

/* ══════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════ */
const Community = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [hoveredCh, setHoveredCh] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <main className="pt-20">

        {/* ════════════ HERO ════════════ */}
        <section className="relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
            <Reveal>
              <div className="text-center">
                {/* Discord logo */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8"
                  style={{ background: "linear-gradient(135deg, #5865F2, #7289DA)", boxShadow: "0 0 60px rgba(88,101,242,0.2)" }}>
                  <DiscordIcon className="w-10 h-10 text-white" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-[3px] border-[hsl(230,40%,6%)] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5865F2]/20 bg-[#5865F2]/[0.06] mb-6">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-[#8B9DFF] uppercase tracking-widest">Comunidad activa</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] mb-6">
                  Únete a la comunidad
                  <br />
                  <span className="text-gradient">WITHMIA</span>
                </h1>

                <p className="text-[16px] text-white/40 max-w-xl mx-auto leading-relaxed mb-10">
                  Conecta con cientos de empresas y profesionales que transforman su atención al cliente.
                  Comparte, aprende y crece en nuestro servidor de Discord.
                </p>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
                  <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #5865F2, #4752C4)", boxShadow: "0 0 40px rgba(88,101,242,0.2)" }}>
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <DiscordIcon className="relative w-5 h-5" />
                    <span className="relative">Unirse al Discord</span>
                    <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>

                {/* Stats */}
                <div className="inline-flex flex-wrap items-center justify-center gap-6 sm:gap-10 px-6 py-4 rounded-xl border border-white/[0.05] bg-white/[0.015]">
                  {[
                    { val: "500+", label: "Miembros" },
                    { val: "24/7", label: "Activo" },
                    { val: "15+", label: "Canales" },
                    { val: "100+", label: "Mensajes/día" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-bold text-white/60 font-mono tabular-nums">{s.val}</span>
                      <span className="text-[10px] text-white/20 uppercase tracking-wider">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════════ DISCORD PREVIEW ════════════ */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6">
            <Reveal>
              <div className="max-w-2xl mb-12">
                <h2 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-white mb-4">
                  Explora nuestros <span className="text-gradient">canales</span>
                </h2>
                <p className="text-[14px] text-white/30 leading-relaxed">
                  Un espacio organizado para cada tema. Soporte, desarrollo, ideas y más.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                {/* Server header */}
                <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #5865F2, #34d399)" }}>
                      <span className="text-white font-bold text-xs">W</span>
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-white/70">WITHMIA Community</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] text-white/20">Servidor verificado</span>
                      </div>
                    </div>
                  </div>
                  <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/15 text-[#8B9DFF] text-[10px] font-medium hover:bg-[#5865F2]/20 transition-all">
                    <ExternalLink className="w-3 h-3" />
                    Abrir
                  </a>
                </div>

                {/* Channels */}
                <div className="p-2.5 space-y-0.5">
                  {channels.map((ch) => (
                    <button key={ch.name}
                      onMouseEnter={() => setHoveredCh(ch.name)}
                      onMouseLeave={() => setHoveredCh(null)}
                      onClick={() => window.open(DISCORD_INVITE, "_blank")}
                      className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-left ${hoveredCh === ch.name ? "bg-white/[0.03]" : ""}`}>
                      <ch.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ch.color }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium text-white/50">#{ch.name}</span>
                        <p className="text-[10px] text-white/15 mt-0.5 leading-relaxed">{ch.desc}</p>
                      </div>
                      <ArrowRight className={`w-3 h-3 mt-1 shrink-0 transition-all duration-200 ${hoveredCh === ch.name ? "text-white/15 translate-x-0 opacity-100" : "opacity-0 -translate-x-1"}`} />
                    </button>
                  ))}
                </div>

                <div className="px-5 py-3 border-t border-white/[0.03] flex items-center justify-between">
                  <span className="text-[10px] text-white/10">Y muchos más canales esperándote...</span>
                  <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-[#8B9DFF]/60 hover:text-[#8B9DFF] font-medium transition-colors">
                    Ver todos →
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════════ WHY JOIN ════════════ */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-white mb-4">
                  ¿Por qué <span className="text-gradient">unirte</span>?
                </h2>
                <p className="text-[14px] text-white/30 max-w-lg mx-auto">
                  Más que un servidor, es una comunidad que impulsa tu crecimiento.
                </p>
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {benefits.map((b, i) => (
                <Reveal key={i} delay={i * 60}>
                  <div className="group h-full p-5 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-300">
                    <div className="w-9 h-9 rounded-lg bg-[#5865F2]/[0.08] border border-[#5865F2]/10 flex items-center justify-center mb-3.5 group-hover:border-[#5865F2]/20 transition-colors">
                      <b.icon className="w-4 h-4 text-[#8B9DFF]/70 group-hover:text-[#8B9DFF] transition-colors" />
                    </div>
                    <h3 className="text-[14px] font-semibold text-white/65 mb-1.5">{b.title}</h3>
                    <p className="text-[12px] text-white/25 leading-relaxed">{b.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ EVENTS ════════════ */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6">
            <Reveal>
              <div className="max-w-2xl mb-12">
                <h2 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-white mb-4">
                  Eventos de la <span className="text-gradient">comunidad</span>
                </h2>
                <p className="text-[14px] text-white/30 leading-relaxed">
                  Sesiones en vivo, workshops y demos con el equipo y la comunidad.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-3">
              {events.map((ev, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="group h-full p-5 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-3.5 h-3.5 text-white/15" />
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                        style={{ backgroundColor: `${ev.tagColor}08`, borderColor: `${ev.tagColor}18`, color: `${ev.tagColor}cc` }}>
                        {ev.tag}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-semibold text-white/65 mb-1.5">{ev.title}</h3>
                    <p className="text-[11px] text-white/20 leading-relaxed mb-4">{ev.desc}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/15">
                      <Calendar className="w-3 h-3" />
                      {ev.schedule}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ RULES ════════════ */}
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-white mb-3">
                  Reglas de la comunidad
                </h2>
                <p className="text-[14px] text-white/25 max-w-md mx-auto">
                  Un espacio seguro y productivo para todos.
                </p>
              </div>
            </Reveal>

            <div className="space-y-2">
              {rules.map((r, i) => (
                <Reveal key={i} delay={i * 50}>
                  <div className="flex items-start gap-3.5 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-200">
                    <div className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                      <r.icon className="w-3.5 h-3.5 text-[#8B9DFF]/40" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-white/55 mb-0.5">{r.title}</h3>
                      <p className="text-[11px] text-white/20 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ FINAL CTA ════════════ */}
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-6">
            <Reveal>
              <div className="relative text-center p-10 sm:p-14 rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                {/* Discord icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6"
                  style={{ background: "linear-gradient(135deg, #5865F2, #7289DA)", boxShadow: "0 0 40px rgba(88,101,242,0.15)" }}>
                  <DiscordIcon className="w-7 h-7 text-white" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  ¿Listo para ser parte?
                </h2>
                <p className="text-[14px] text-white/30 max-w-md mx-auto mb-8 leading-relaxed">
                  Únete gratis al servidor de Discord y empieza a conectar con la comunidad hoy mismo.
                </p>

                <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-[15px] transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #5865F2, #4752C4)", boxShadow: "0 0 40px rgba(88,101,242,0.2)" }}>
                  <DiscordIcon className="w-5 h-5" />
                  Unirse ahora
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>

                <p className="text-[10px] text-white/[0.12] mt-5 tracking-wide">
                  Es gratis · Sin compromiso · Acceso inmediato
                </p>
              </div>
            </Reveal>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Community;
