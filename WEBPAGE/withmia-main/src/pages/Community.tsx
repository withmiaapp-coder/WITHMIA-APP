import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import {
  Users,
  MessageCircle,
  Zap,
  Trophy,
  Star,
  ArrowRight,
  Hash,
  Volume2,
  BookOpen,
  Code,
  Lightbulb,
  Shield,
  Heart,
  ExternalLink,
  Globe,
  Headphones,
  Sparkles,
  TrendingUp,
  Calendar,
  Award,
} from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/NwDufG8K";

/* ─── Discord channels showcase ─── */
const channels = [
  {
    icon: Hash,
    name: "general",
    desc: "Conversaciones abiertas sobre WITHMIA, novedades y más",
    color: "text-emerald-400",
  },
  {
    icon: Lightbulb,
    name: "ideas-y-sugerencias",
    desc: "Propone funcionalidades y mejoras para la plataforma",
    color: "text-amber-400",
  },
  {
    icon: Headphones,
    name: "soporte-comunidad",
    desc: "Recibe ayuda de otros usuarios y del equipo WITHMIA",
    color: "text-blue-400",
  },
  {
    icon: Code,
    name: "desarrollo-api",
    desc: "Comparte integraciones, scripts y consultas técnicas",
    color: "text-purple-400",
  },
  {
    icon: BookOpen,
    name: "tutoriales",
    desc: "Guías, tips y mejores prácticas compartidas por la comunidad",
    color: "text-teal-400",
  },
  {
    icon: Trophy,
    name: "casos-de-éxito",
    desc: "Comparte cómo WITHMIA ha transformado tu negocio",
    color: "text-orange-400",
  },
];

/* ─── Why join ─── */
const benefits = [
  {
    icon: Zap,
    title: "Acceso anticipado",
    desc: "Sé el primero en probar nuevas funcionalidades antes de su lanzamiento oficial.",
  },
  {
    icon: Users,
    title: "Networking",
    desc: "Conecta con empresarios, desarrolladores y equipos de soporte de toda Latinoamérica.",
  },
  {
    icon: Lightbulb,
    title: "Influye en el producto",
    desc: "Tus ideas y feedback impactan directamente el roadmap de desarrollo de WITHMIA.",
  },
  {
    icon: Headphones,
    title: "Soporte directo",
    desc: "Obtén respuestas rápidas del equipo de WITHMIA y de usuarios experimentados.",
  },
  {
    icon: BookOpen,
    title: "Aprende en comunidad",
    desc: "Accede a tutoriales exclusivos, webinars y sesiones de Q&A en vivo.",
  },
  {
    icon: Award,
    title: "Reconocimiento",
    desc: "Los miembros más activos reciben roles especiales, acceso beta y swag exclusivo.",
  },
];

/* ─── Community events ─── */
const events = [
  {
    title: "Office Hours con el equipo",
    desc: "Sesión de preguntas y respuestas en vivo con el equipo de producto.",
    schedule: "Todos los jueves · 18:00 CLT",
    type: "Semanal",
  },
  {
    title: "Demo Day: Integraciones",
    desc: "Miembros de la comunidad muestran sus integraciones y automatizaciones.",
    schedule: "Primer viernes del mes · 17:00 CLT",
    type: "Mensual",
  },
  {
    title: "Workshop: IA & Chatbots",
    desc: "Aprende a configurar y optimizar el asistente de IA paso a paso.",
    schedule: "Próximo: 5 de marzo, 2026",
    type: "Especial",
  },
];

/* ─── Stats ─── */
const stats = [
  { value: "500+", label: "Miembros" },
  { value: "24/7", label: "Activo" },
  { value: "15+", label: "Canales" },
  { value: "100+", label: "Mensajes/día" },
];

/* ─── Component ─── */
const Community = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#030507]">
      <Navigation />
      <main className="pt-20">

        {/* ════════════ HERO ════════════ */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/10 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-indigo-500/[0.025] rounded-full blur-[150px]" />
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/[0.015] rounded-full blur-[120px]" />
          </div>

          {/* Floating Discord-like decorative shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-32 left-[10%] w-3 h-3 rounded-full bg-indigo-400/10 animate-pulse" />
            <div className="absolute top-48 right-[15%] w-2 h-2 rounded-full bg-emerald-400/15 animate-pulse delay-300" />
            <div className="absolute top-64 left-[25%] w-4 h-4 rounded-full bg-purple-400/8 animate-pulse delay-700" />
            <div className="absolute top-40 right-[30%] w-2.5 h-2.5 rounded-full bg-blue-400/10 animate-pulse delay-500" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8">
              <div className="relative flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-white/50 tracking-wide">
                  Comunidad activa en Discord
                </span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Únete a la comunidad
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                WITHMIA
              </span>
            </h1>

            <p className="text-lg text-white/45 max-w-2xl mx-auto leading-relaxed mb-10">
              Conecta con cientos de empresas y profesionales que están
              transformando su atención al cliente. Comparte, aprende y crece
              junto a nosotros.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-[15px] text-white transition-all duration-500 hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Discord-purple gradient bg */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2] to-[#7289DA] rounded-2xl" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2] to-[#4752C4] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 shadow-[0_0_40px_rgba(88,101,242,0.25)] group-hover:shadow-[0_0_60px_rgba(88,101,242,0.35)] transition-all duration-500 rounded-2xl" />

                {/* Discord logo inline SVG */}
                <svg className="relative w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                <span className="relative">Unirse al Discord</span>
                <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>

              <a
                href="/faq"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white/70 hover:border-white/[0.12] hover:bg-white/[0.04] font-medium text-[14px] transition-all duration-300"
              >
                <MessageCircle className="w-4 h-4" />
                Ver sugerencias
              </a>
            </div>

            {/* Stats bar */}
            <div className="inline-flex items-center gap-8 px-8 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[17px] font-bold text-white/70">{stat.value}</span>
                  <span className="text-[11px] text-white/25">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ DISCORD PREVIEW ════════════ */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Explora nuestros canales
              </h2>
              <p className="text-white/35 max-w-xl mx-auto">
                Encuentra el espacio perfecto para cada tema. Desde soporte hasta
                desarrollo, hay un canal para ti.
              </p>
            </div>

            {/* Mock Discord sidebar */}
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                {/* Server header */}
                <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5865F2] to-emerald-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">W</span>
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-white/80">WITHMIA Community</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-white/25">Servidor verificado</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={DISCORD_INVITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2]/[0.15] border border-[#5865F2]/20 text-[#8B9DFF] text-[11px] font-medium hover:bg-[#5865F2]/[0.25] transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Abrir Discord
                  </a>
                </div>

                {/* Channels list */}
                <div className="p-3 space-y-1">
                  {channels.map((ch) => (
                    <button
                      key={ch.name}
                      onMouseEnter={() => setHoveredChannel(ch.name)}
                      onMouseLeave={() => setHoveredChannel(null)}
                      onClick={() => window.open(DISCORD_INVITE, "_blank")}
                      className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-left ${
                        hoveredChannel === ch.name
                          ? "bg-white/[0.04]"
                          : "bg-transparent"
                      }`}
                    >
                      <div className={`mt-0.5 ${ch.color}`}>
                        <ch.icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-white/60">
                            #{ch.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/20 mt-0.5 leading-relaxed">
                          {ch.desc}
                        </p>
                      </div>
                      <ArrowRight
                        className={`w-3.5 h-3.5 mt-1 shrink-0 transition-all duration-200 ${
                          hoveredChannel === ch.name
                            ? "text-white/20 translate-x-0 opacity-100"
                            : "text-white/0 -translate-x-1 opacity-0"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Bottom bar */}
                <div className="px-5 py-3.5 border-t border-white/[0.04] flex items-center justify-between">
                  <p className="text-[11px] text-white/15">
                    Y muchos más canales esperándote...
                  </p>
                  <a
                    href={DISCORD_INVITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#8B9DFF] hover:text-[#5865F2] font-medium transition-colors"
                  >
                    Ver todos →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════ WHY JOIN ════════════ */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                ¿Por qué unirte?
              </h2>
              <p className="text-white/35 max-w-xl mx-auto">
                Más que un servidor, es una comunidad que impulsa tu crecimiento.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {benefits.map((b, i) => (
                <div
                  key={i}
                  className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.025] hover:border-white/[0.09] transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 group-hover:border-emerald-500/15 transition-colors">
                    <b.icon className="w-5 h-5 text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-white/70 mb-2">{b.title}</h3>
                  <p className="text-[13px] text-white/30 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ EVENTS ════════════ */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Eventos de la comunidad
              </h2>
              <p className="text-white/35 max-w-xl mx-auto">
                Participa en sesiones en vivo, workshops y demostraciones con el
                equipo y la comunidad.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {events.map((ev, i) => (
                <div
                  key={i}
                  className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.025] hover:border-white/[0.09] transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-indigo-400/60" />
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        ev.type === "Semanal"
                          ? "bg-emerald-500/[0.08] border-emerald-500/12 text-emerald-400/70"
                          : ev.type === "Mensual"
                          ? "bg-blue-500/[0.08] border-blue-500/12 text-blue-400/70"
                          : "bg-purple-500/[0.08] border-purple-500/12 text-purple-400/70"
                      }`}
                    >
                      {ev.type}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-white/70 mb-2">{ev.title}</h3>
                  <p className="text-[12px] text-white/25 leading-relaxed mb-4">{ev.desc}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/20">
                    <Calendar className="w-3 h-3" />
                    {ev.schedule}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ COMMUNITY RULES ════════════ */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Reglas de la comunidad
              </h2>
              <p className="text-white/35 max-w-xl mx-auto">
                Queremos que este sea un espacio seguro y productivo para todos.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  icon: Heart,
                  title: "Sé respetuoso",
                  desc: "Trata a todos con respeto. No se tolera acoso, discriminación ni lenguaje ofensivo.",
                },
                {
                  icon: Shield,
                  title: "No spam",
                  desc: "Evita la autopromoción excesiva, enlaces no solicitados o contenido repetitivo.",
                },
                {
                  icon: MessageCircle,
                  title: "Usa el canal correcto",
                  desc: "Publica en el canal apropiado para mantener las conversaciones organizadas.",
                },
                {
                  icon: Users,
                  title: "Ayuda a otros",
                  desc: "Si puedes ayudar a alguien con una duda, hazlo. La comunidad crece cuando compartimos.",
                },
                {
                  icon: Globe,
                  title: "Idioma principal: Español",
                  desc: "Las conversaciones son principalmente en español, pero el inglés también es bienvenido.",
                },
              ].map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.015]"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <rule.icon className="w-4 h-4 text-indigo-400/50" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-white/60 mb-1">{rule.title}</h3>
                    <p className="text-[12px] text-white/25 leading-relaxed">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ FINAL CTA ════════════ */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="relative p-12 rounded-3xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
              {/* Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5865F2]/[0.03] rounded-full blur-[100px]" />

              <div className="relative">
                {/* Discord icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#7289DA] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(88,101,242,0.2)]">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  ¿Listo para ser parte?
                </h2>
                <p className="text-white/35 max-w-md mx-auto mb-8 text-[15px] leading-relaxed">
                  Únete gratis al servidor de Discord de WITHMIA y empieza a
                  conectar con la comunidad hoy mismo.
                </p>

                <a
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#5865F2] to-[#7289DA] text-white font-semibold text-[15px] transition-all duration-300 hover:shadow-[0_0_50px_rgba(88,101,242,0.3)] hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  Unirse ahora
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>

                <p className="text-[11px] text-white/15 mt-5">
                  Es gratis · Sin compromiso · Acceso inmediato
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default Community;
