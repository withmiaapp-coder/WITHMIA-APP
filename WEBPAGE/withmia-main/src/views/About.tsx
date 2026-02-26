import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";
import { useScrollReveal } from "@/hooks/useAnimations";

/* ═══════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════ */

const colorMap: Record<string, { border: string; bg: string; icon: string; gradient: string }> = {
  violet: { border: "border-violet-500/15", bg: "bg-violet-500/10", icon: "text-violet-400", gradient: "from-violet-500/25 via-violet-500/5 to-transparent" },
  amber: { border: "border-amber-500/15", bg: "bg-amber-500/10", icon: "text-amber-400", gradient: "from-amber-500/25 via-amber-500/5 to-transparent" },
  emerald: { border: "border-emerald-500/15", bg: "bg-emerald-500/10", icon: "text-emerald-400", gradient: "from-emerald-500/25 via-emerald-500/5 to-transparent" },
  cyan: { border: "border-cyan-500/15", bg: "bg-cyan-500/10", icon: "text-cyan-400", gradient: "from-cyan-500/25 via-cyan-500/5 to-transparent" },
};

const founderSkills = [
  {
    icon: Code2,
    title: "Full-Stack",
    desc: "5 años construyendo software de forma independiente. MVP completo sin equipos externos",
    color: "violet",
  },
  {
    icon: Brain,
    title: "UX conductual",
    desc: "Psicología Organizacional aplicada al diseño de experiencias No-Code sin fricción",
    color: "amber",
  },
  {
    icon: LineChart,
    title: "Estrategia financiera",
    desc: "Economía aplicada a modelos SaaS con Unit Economics positivos desde el día uno",
    color: "emerald",
  },
];

const pillars = [
  { icon: Zap, label: "Ejecución real", desc: "La IA no solo conversa: descuenta stock, bloquea horarios y procesa cobranzas en tiempo real", color: "violet" },
  { icon: Workflow, label: "No-Code", desc: "Despliega IA avanzada en menos de 1 hora, sin equipo técnico", color: "amber" },
  { icon: Timer, label: "Golden Window", desc: "Respuesta automática en menos de 5 minutos para maximizar la conversión", color: "cyan" },
  { icon: Lock, label: "IP propia", desc: "100% del código fuente propio con prompts adaptados al mercado LATAM", color: "emerald" },
];

const values = [
  {
    title: "Pasión por el impacto",
    desc: "Nuestro motor es el efecto real que generamos en los negocios y en las personas que los componen. Cada feature existe porque resuelve un dolor concreto.",
    icon: Heart,
    color: "violet",
  },
  {
    title: "Innovación disruptiva",
    desc: "No seguimos un camino trazado, lo inventamos con tecnología propietaria, valentía y visión a largo plazo. Arquitectura de IA Generativa que evoluciona con feedback real.",
    icon: Zap,
    color: "amber",
  },
  {
    title: "Compromiso total",
    desc: "Damos todo en la cancha. Somos un equipo que va más allá de lo esperado para asegurar el éxito de nuestros clientes, de principio a fin.",
    icon: Shield,
    color: "emerald",
  },
  {
    title: "Empatía y cercanía",
    desc: "Creemos en la humanidad detrás de la tecnología, construyendo relaciones significativas y duraderas con cada cliente que confía en nosotros.",
    icon: MessageSquare,
    color: "cyan",
  },
];

const timeline = [
  {
    period: "Mar 2025",
    title: "Nace la idea",
    desc: "Identificamos que las PYMEs perdían ventas por responder tarde y operar con herramientas desconectadas",
    icon: MessageSquare,
    color: "violet",
  },
  {
    period: "Abr – Jun 2025",
    title: "Desarrollo del MVP",
    desc: "Construcción de la plataforma propietaria No-Code con IA generativa desplegada en AWS",
    icon: Code2,
    color: "amber",
  },
  {
    period: "Jul 2025",
    title: "Constitución legal",
    desc: "MIA Marketing & Intelligence Artificial SpA se constituye en Providencia, Santiago",
    icon: FileCheck,
    color: "emerald",
  },
  {
    period: "2025 – Hoy",
    title: "Operación comercial",
    desc: "Primeros clientes B2B en Chile con modelo Product-Led Growth",
    icon: TrendingUp,
    color: "cyan",
  },
];

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const hero = useScrollReveal();
  const founder = useScrollReveal();
  const mission = useScrollReveal();
  const valuesSection = useScrollReveal();
  const story = useScrollReveal();
  const backed = useScrollReveal();
  const ctaSection = useScrollReveal();

  const [imgError, setImgError] = useState(false);

  return (
    <div className="min-h-screen relative">
      <div className="pt-20 relative overflow-hidden">

        {/* ════════════════ HERO ════════════════ */}
        <div className="relative pt-16 md:pt-24 pb-16 md:pb-24 px-4">
          {/* Aurora mesh */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-violet-500/[0.07] via-amber-500/[0.03] to-transparent rounded-full blur-3xl" />
          </div>

          <div
            ref={hero.ref}
            className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${
              hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/50 font-semibold mb-6">
              <Building2 className="w-3.5 h-3.5 text-white/30" />
              Santiago, Chile · Desde 2025
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6">
              Hecha por y para{" "}
              <span className="text-gradient">la PYME</span>
            </h1>

            <p className="text-base md:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed">
              En 2026, automatizar tu negocio no debería costarte cientos de
              dólares al mes. WITHMIA unifica IA conversacional, CRM, cobranzas
              y atención omnicanal en una sola plataforma pensada para PYMEs
              que necesitan responder rápido, vender más y crecer sin depender
              de un equipo técnico ni de presupuestos enterprise
            </p>
          </div>
        </div>

        {/* ════════════════ FUNDADOR ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={founder.ref}
            className={`max-w-5xl mx-auto transition-all duration-700 ${
              founder.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Founder card */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="grid lg:grid-cols-[280px,1fr]">
                {/* Photo */}
                <div className="relative aspect-[3/4] lg:aspect-auto bg-white/[0.03]">
                  {!imgError ? (
                    <img
                      src="/images/founder.webp"
                      alt="Ángel Díaz Castro — CEO & Fundador, WITHMIA"
                      className="w-full h-full object-cover object-[center_15%]"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/[0.08] via-amber-500/[0.05] to-transparent">
                      <User className="w-16 h-16 text-white/15" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-8 md:p-10 flex flex-col justify-center">
                  <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-2">
                    Fundador
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    Ángel Díaz Castro
                  </h2>
                  <p className="text-[13px] text-white/30 mb-6">
                    CEO & Fundador Técnico
                  </p>

                  <p className="text-[15px] text-white/40 leading-relaxed mb-4">
                    Fundador técnico con 5 años de experiencia en desarrollo
                    de software, formación en Economía y Psicología
                    Organizacional. Esa combinación me permitió diseñar
                    WITHMIA desde cero: arquitectura propia de IA, experiencia
                    No-Code sin fricción y un modelo SaaS rentable desde el
                    primer día
                  </p>
                  <p className="text-[15px] text-white/35 leading-relaxed mb-6">
                    En marzo de 2025 identifiqué que las PYMEs perdían ventas
                    por no responder a tiempo y operaban con herramientas
                    desconectadas. Ahí nació la idea que hoy es WITHMIA
                  </p>

                  {/* Skill tags + LinkedIn */}
                  <div className="flex flex-wrap items-center gap-2">
                    {founderSkills.map((skill, i) => {
                      const Icon = skill.icon;
                      const c = colorMap[skill.color];
                      return (
                        <span
                          key={skill.title}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${c.bg} border ${c.border} text-[12px] font-medium text-white/50`}
                          style={{
                            opacity: founder.isVisible ? 1 : 0,
                            transform: founder.isVisible ? "translateY(0)" : "translateY(8px)",
                            transition: `all 0.4s ease ${i * 80 + 200}ms`,
                          }}
                        >
                          <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
                          {skill.title}
                        </span>
                      );
                    })}

                    <a
                      href="https://www.linkedin.com/in/angel-felipe-diaz-castro/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[12px] font-medium text-white/50 transition-all duration-300"
                      style={{
                        opacity: founder.isVisible ? 1 : 0,
                        transform: founder.isVisible ? "translateY(0)" : "translateY(8px)",
                        transition: "all 0.4s ease 440ms",
                      }}
                    >
                      <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                      LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ HISTORIA ════════════════ */}
        <div className="relative px-4 pb-24 md:pb-32">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-br from-violet-500/[0.03] via-amber-500/[0.02] to-transparent rounded-full blur-3xl" />
          </div>

          <div
            ref={story.ref}
            className={`max-w-5xl mx-auto relative z-10 transition-all duration-700 ${
              story.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Two-column: narrative left + vertical timeline right */}
            <div className="grid lg:grid-cols-[1fr,1fr] gap-12 lg:gap-16 items-start">
              {/* Left: narrative */}
              <div className="lg:sticky lg:top-32">
                <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.25em] font-semibold mb-3">
                  Nuestra Historia
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
                  De una idea clara a{" "}
                  <span className="text-gradient">una plataforma real</span>
                </h2>
                <div className="space-y-4">
                  <p className="text-[15px] text-white/40 leading-relaxed">
                    En marzo de 2025 identificamos un problema repetido en
                    las PYMEs latinoamericanas: perdían ventas por no responder
                    a tiempo, gestionaban clientes desde WhatsApp personal y
                    operaban con herramientas que no se conectaban entre sí
                  </p>
                  <p className="text-[15px] text-white/35 leading-relaxed">
                    En menos de 4 meses construimos una plataforma SaaS
                    completa con IA generativa, CRM y automatización. En julio
                    de 2025 constituimos legalmente MIA Marketing &
                    Intelligence Artificial SpA
                  </p>
                  <p className="text-[15px] text-white/35 leading-relaxed">
                    Hoy operamos con nuestros primeros clientes B2B en Chile,
                    enfocados en PYMEs con alto volumen transaccional
                  </p>
                </div>
              </div>

              {/* Right: vertical timeline */}
              <div className="relative pl-8">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-violet-500/20 via-amber-500/15 to-cyan-500/10" />

                <div className="space-y-10">
                  {timeline.map((step, i) => {
                    const Icon = step.icon;
                    const c = colorMap[step.color];
                    return (
                      <div
                        key={step.period}
                        className="relative"
                        style={{
                          opacity: story.isVisible ? 1 : 0,
                          transform: story.isVisible ? "translateY(0)" : "translateY(16px)",
                          transition: `all 0.5s ease ${i * 120}ms`,
                        }}
                      >
                        {/* Dot */}
                        <div className={`absolute -left-8 top-0 w-[31px] h-[31px] rounded-full ${c.bg} border-2 ${c.border} flex items-center justify-center z-10`}>
                          <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
                        </div>

                        {/* Content */}
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-[16px] font-bold text-white">{step.title}</h3>
                            <span className={`text-[11px] font-semibold ${c.icon} opacity-60`}>{step.period}</span>
                          </div>
                          <p className="text-[13px] text-white/30 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ MISIÓN ════════════════ */}
        <div className="relative px-4 pb-24 md:pb-32">
          {/* Background accent */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-amber-500/[0.04] rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-3xl" />
          </div>

          <div
            ref={mission.ref}
            className={`max-w-5xl mx-auto relative z-10 transition-all duration-700 ${
              mission.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Mission statement - big, centered */}
            <div className="text-center mb-20">
              <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.25em] font-semibold mb-5">
                Nuestra misión
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-8 max-w-3xl mx-auto">
                Eliminar la{" "}
                <span className="text-gradient">digitalización{"\n"}desconectada</span>
              </h2>
              <div className="max-w-2xl mx-auto space-y-4">
                <p className="text-[15px] md:text-base text-white/40 leading-relaxed">
                  Las PYMEs gestionan clientes con WhatsApp personal, Excel y
                  herramientas que no se conectan entre sí. Pierden ventas por
                  no responder a tiempo y operan con procesos que no escalan
                </p>
                <p className="text-[15px] md:text-base text-white/50 leading-relaxed font-medium">
                  WITHMIA unifica IA generativa, CRM, cobranzas y automatización
                  en una sola plataforma para PYMEs con 5K-50K mensajes mensuales
                </p>
              </div>
            </div>

            {/* Pillar strip - horizontal full-width */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/[0.06]">
              {pillars.map((item, i) => {
                const Icon = item.icon;
                const c = colorMap[item.color];
                return (
                  <div
                    key={item.label}
                    className="relative bg-white/[0.02] p-6 md:p-8"
                    style={{
                      opacity: mission.isVisible ? 1 : 0,
                      transform: mission.isVisible ? "translateY(0)" : "translateY(20px)",
                      transition: `all 0.6s ease ${i * 80}ms`,
                    }}
                  >
                    {/* Top accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.gradient}`} />
                    
                    <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-5`}>
                      <Icon className={`w-5 h-5 ${c.icon}`} />
                    </div>
                    <h3 className="text-[14px] font-bold text-white mb-2 tracking-tight">{item.label}</h3>
                    <p className="text-[12px] text-white/25 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════ VALORES ════════════════ */}
        <div className="px-4 pb-24 md:pb-32">
          <div
            ref={valuesSection.ref}
            className={`max-w-5xl mx-auto transition-all duration-700 ${
              valuesSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Centered header */}
            <div className="text-center mb-14">
              <p className="text-[11px] text-violet-400/60 uppercase tracking-[0.25em] font-semibold mb-3">
                Nuestros Valores
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                Los principios que{" "}
                <span className="text-gradient">nos guían</span>
              </h2>
              <p className="text-[14px] text-white/30 max-w-lg mx-auto leading-relaxed">
                Estos valores fundamentan cada decisión que tomamos y definen
                cómo interactuamos con nuestros clientes
              </p>
            </div>

            {/* Value cards grid — 4 equal cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {values.map((v, i) => {
                const Icon = v.icon;
                const c = colorMap[v.color];
                return (
                  <div
                    key={v.title}
                    className={`text-center rounded-2xl border ${c.border} bg-white/[0.02] p-7 transition-all duration-300`}
                    style={{
                      opacity: valuesSection.isVisible ? 1 : 0,
                      transform: valuesSection.isVisible ? "translateY(0)" : "translateY(16px)",
                      transition: `all 0.5s ease ${i * 100}ms`,
                    }}
                  >
                    <div className={`w-10 h-10 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center mx-auto mb-5`}>
                      <Icon className={`w-5 h-5 ${c.icon}`} />
                    </div>
                    <h3 className="text-[15px] font-bold text-white mb-3">{v.title}</h3>
                    <p className="text-[13px] text-white/30 leading-[1.7]">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════ EMPRESA ════════════════ */}
        <div className="px-4 pb-24 md:pb-32">
          <div
            ref={backed.ref}
            className={`max-w-5xl mx-auto transition-all duration-700 ${
              backed.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="grid lg:grid-cols-[1fr,1fr] gap-8">
              {/* Left: company card */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="px-7 py-5 border-b border-white/[0.05] flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white leading-tight">MIA Marketing & Intelligence Artificial SpA</h3>
                    <p className="text-[11px] text-white/25 mt-0.5">Sociedad por Acciones · Chile</p>
                  </div>
                </div>

                <div className="p-7 space-y-4">
                  {[
                    { icon: FileCheck, label: "RUT", value: "78.199.687-4", mono: true },
                    { icon: BarChart3, label: "Actividad", value: "Consultoría de informática y gestión de instalaciones informáticas" },
                    { icon: MapPin, label: "Domicilio", value: "Antonio Bellet 193, Of. 1210, Providencia, Santiago" },
                    { icon: CalendarDays, label: "Inicio", value: "14 de julio de 2025" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start gap-3">
                      <row.icon className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-semibold text-white/20 uppercase tracking-wider block mb-0.5">{row.label}</span>
                        <span className={`text-[13px] text-white/50 leading-relaxed ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: verification + origin */}
              <div className="flex flex-col gap-5">
                {/* SII Verification */}
                <div className="flex-1 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-7 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white">Verificada por el SII</h4>
                      <p className="text-[11px] text-white/25">Servicio de Impuestos Internos · Chile</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/15 text-[12px] font-semibold text-emerald-400">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Empresa verificada
                    </span>
                    <span className="text-[12px] text-white/25">desde 21 jul 2025</span>
                  </div>
                  <p className="text-[12px] text-white/25 leading-relaxed">
                    Autorizada para emitir facturas electrónicas y documentos
                    tributarios. Infraestructura alojada en AWS.
                  </p>
                </div>

                {/* Atlantis origin */}
                <a
                  href="https://atlantisproducciones.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] p-7 flex items-center gap-5 transition-all duration-300 group"
                >
                  <img
                    src="/Logo-Atlantis.webp"
                    alt="Atlantis Producciones"
                    className="w-12 h-12 object-contain opacity-40 group-hover:opacity-60 transition-opacity rounded-lg"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-white/50 group-hover:text-white/70 transition-colors mb-0.5">
                      Originada en Atlantis Producciones
                    </p>
                    <p className="text-[11px] text-white/20">
                      Agencia de servicios digitales · Santiago, Chile
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/15 ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ CTA ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={ctaSection.ref}
            className={`max-w-4xl mx-auto transition-all duration-700 ${
              ctaSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-violet-500/[0.06] to-transparent" />
                <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-amber-500/10 rounded-full blur-3xl" />
              </div>

              <div className="relative border border-white/[0.08] rounded-3xl p-10 md:p-14 text-center">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Prueba WITHMIA gratis
                </h2>
                <p className="text-[14px] text-white/40 max-w-md mx-auto mb-8 leading-relaxed">
                  Crea tu cuenta en 2 minutos, sin tarjeta de crédito.
                  Conecta tu primer canal y deja que la IA trabaje por ti.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="https://app.withmia.com"
                    onClick={() => trackCTAClick('comenzar_ahora', 'about_cta', 'https://app.withmia.com')}
                    className="relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-semibold text-black hover:brightness-110 transition-all group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative z-10 flex items-center gap-2">
                      Comenzar ahora
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </a>
                  <Link
                    to="/contacto"
                    onClick={() => trackCTAClick('contactar_equipo', 'about_cta', '/contacto')}
                    className="flex items-center justify-center px-8 py-3.5 rounded-xl border border-white/[0.1] text-[14px] font-medium text-white/60 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.03] transition-all"
                  >
                    Contactar al equipo
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-6 mt-8 text-white/20 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Datos seguros
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Soporte 24/7
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="w-3 h-3" /> Sin tarjeta requerida
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;
