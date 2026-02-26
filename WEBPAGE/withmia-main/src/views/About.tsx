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
  Sparkles,
  Globe,
  Layers,
  Rocket,
  Lightbulb,
  Eye,
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
    period: "2025",
    title: "Origen en Atlantis",
    desc: "Nace como proyecto interno para resolver ineficiencias operativas en PYMEs latinoamericanas",
    icon: Lightbulb,
    color: "violet",
    emoji: "💡",
  },
  {
    period: "Inicio 2025",
    title: "Pivote a SaaS",
    desc: "De agentes manuales a plataforma propietaria No-Code en AWS",
    icon: Code2,
    color: "amber",
    emoji: "⚡",
  },
  {
    period: "Jul 2025",
    title: "Constitución legal",
    desc: "MIA Marketing & Intelligence Artificial SpA se constituye en Providencia, Santiago",
    icon: FileCheck,
    color: "emerald",
    emoji: "📋",
  },
  {
    period: "2025 – Hoy",
    title: "Operación comercial",
    desc: "Primeros clientes B2B en Chile con modelo Product-Led Growth",
    icon: TrendingUp,
    color: "cyan",
    emoji: "🚀",
  },
  {
    period: "Próximamente",
    title: "Levantamiento de capital",
    desc: "Ronda de inversión para acelerar el crecimiento, expandir infraestructura y fortalecer el equipo",
    icon: BarChart3,
    color: "violet",
    emoji: "💰",
  },
  {
    period: "El objetivo",
    title: "Escalar usuarios",
    desc: "Multiplicar la base de clientes activos en LATAM y consolidar WITHMIA como referente en MarTech para PYMEs",
    icon: LineChart,
    color: "amber",
    emoji: "📈",
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
  const brand = useScrollReveal();
  const founder = useScrollReveal();
  const mission = useScrollReveal();
  const vision = useScrollReveal();
  const valuesSection = useScrollReveal();
  const story = useScrollReveal();
  const backed = useScrollReveal();
  const ctaSection = useScrollReveal();

  const [imgError, setImgError] = useState(false);

  return (
    <div className="min-h-screen relative">
      <div className="pt-20 relative overflow-hidden">

        {/* ════════════════ HERO ════════════════ */}
        <div className="relative pt-16 md:pt-24 pb-20 md:pb-28 px-4">

          <div
            ref={hero.ref}
            className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${
              hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/50 font-semibold mb-6">
              <Building2 className="w-3.5 h-3.5 text-white/30" />
              SaaS B2B · MarTech & Automatización · Santiago, Chile
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5 uppercase">
              With you,{" "}
              <span className="text-gradient">with MIA</span>
            </h1>

            <p className="text-[17px] md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed mb-4 font-medium">
              La fusión entre acompañamiento humano y la potencia de la
              Inteligencia Artificial
            </p>

            <p className="text-[15px] text-white/35 max-w-2xl mx-auto leading-relaxed">
              WITHMIA unifica IA conversacional, CRM, cobranzas y atención
              omnicanal en una sola plataforma pensada para PYMEs que necesitan
              responder rápido, vender más y crecer sin depender de un equipo
              técnico ni de presupuestos enterprise
            </p>
          </div>
        </div>

        {/* ════════════════ IDENTIDAD DE MARCA ════════════════ */}
        <div className="px-4 pb-24 md:pb-32">
          <div
            ref={brand.ref}
            className={`max-w-5xl mx-auto transition-all duration-700 ${
              brand.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Three-column brand breakdown */}
            <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.06]">
              {/* Name meaning */}
              <div className="relative bg-white/[0.02] p-7 md:p-8 flex flex-col">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500/25 via-violet-500/5 to-transparent" />
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/10 flex items-center justify-center mb-5">
                  <span className="text-[18px] font-black text-violet-400 tracking-tight leading-none">W<span className="text-violet-400/50">+</span>M</span>
                </div>
                <h3 className="text-[14px] font-bold text-white mb-2">El nombre</h3>
                <p className="text-[12px] text-white/30 leading-relaxed">
                  <span className="text-white/50 font-medium">WITH</span> (contigo) +{" "}
                  <span className="text-white/50 font-medium">MIA</span> (Marketing &
                  Intelligence Artificial). No es estético, es conceptual: la
                  fusión entre acompañamiento humano y capacidad tecnológica
                </p>
              </div>

              {/* Isotipo — logo in center */}
              <div className="relative bg-white/[0.02] p-7 md:p-8 flex flex-col items-center text-center">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/25 via-amber-500/5 to-transparent" />
                <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5">
                  <img
                    src="/logo-withmia.webp"
                    alt="WITHMIA isotipo — mariposa W+M"
                    className="w-9 h-9 object-contain"
                  />
                </div>
                <h3 className="text-[14px] font-bold text-white mb-2">El isotipo</h3>
                <p className="text-[12px] text-white/30 leading-relaxed">
                  Una mariposa abstracta formada por la fusión de las letras
                  W y M. Simboliza la transformación digital y la simetría entre
                  la lógica del algoritmo y la gestión humana
                </p>
              </div>

              {/* Sector — no nos limitamos */}
              <div className="relative bg-white/[0.02] p-7 md:p-8 flex flex-col">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/25 via-emerald-500/5 to-transparent" />
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center mb-5">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-[14px] font-bold text-white mb-2">No nos limitamos</h3>
                <p className="text-[12px] text-white/30 leading-relaxed">
                  Somos un producto SaaS B2B en la vertical de MarTech y
                  Automatización, no una agencia. Pero si cualquier persona
                  quiere experimentar lo que es tener un asistente con IA,{" "}
                  <span className="text-white/45 font-medium">las puertas están abiertas</span>
                </p>
              </div>
            </div>

            {/* Mission tagline */}
            <div className="mt-8 text-center">
              <p className="text-[13px] text-white/20 italic">
                «Integrar lo que hoy está roto» — la misión central detrás de cada línea de código
              </p>
            </div>
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
        <div className="relative px-4 pb-24 md:pb-32 overflow-hidden">

          <div
            ref={story.ref}
            className={`max-w-5xl mx-auto relative z-10 transition-all duration-700 ${
              story.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Header */}
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.25em] font-semibold mb-3">
                Nuestra Historia
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
                De una necesidad real a{" "}
                <span className="text-gradient">una empresa propia</span>
              </h2>
              <p className="text-[14px] text-white/35 leading-relaxed">
                En 2025, dentro de Atlantis Producciones, detectamos que las PYMEs
                latinoamericanas perdían ventas por no responder a tiempo y operaban
                con herramientas desconectadas. Construimos un prototipo interno que
                evolucionó hasta convertirse en una plataforma SaaS completa
              </p>
            </div>

            {/* Platformer game — side-scrolling platforms */}
            <div className="relative">
              {/* Ground line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

              {/* Platforms — staggered heights like a platformer game */}
              <div className="flex flex-col md:flex-row items-end gap-4 md:gap-2 lg:gap-3 min-h-[440px] md:min-h-[520px] relative pb-4">
                {timeline.map((step, i) => {
                  const c = colorMap[step.color];
                  const heights = ["h-[280px]", "h-[310px]", "h-[340px]", "h-[370px]", "h-[400px]", "h-[440px]"];
                  const mdHeights = ["md:h-[290px]", "md:h-[320px]", "md:h-[350px]", "md:h-[380px]", "md:h-[420px]", "md:h-[460px]"];
                  const delays = [200, 350, 500, 650, 800, 950];
                  const xpPercent = Math.round(((i + 1) / timeline.length) * 100);
                  // Levels 0-3 are completed (solid), 4-5 are upcoming (slightly dimmer)
                  const isCompleted = i <= 3;
                  const isCurrent = i === 4;

                  return (
                    <div
                      key={step.period}
                      className={`flex-1 flex flex-col justify-end relative w-full`}
                      style={{
                        opacity: story.isVisible ? 1 : 0,
                        transform: story.isVisible ? "translateY(0)" : "translateY(40px)",
                        transition: `all 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delays[i]}ms`,
                      }}
                    >
                      {/* Rocket traveling between platform 4 and 5 */}
                      {isCurrent && (
                        <div
                          className="flex justify-center mb-3 relative"
                          style={{
                            opacity: story.isVisible ? 1 : 0,
                            transform: story.isVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.8)",
                            transition: "all 0.5s cubic-bezier(0.34,1.56,0.64,1) 1100ms",
                          }}
                        >
                          {/* Trail particles behind rocket */}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 opacity-40">
                            <div className="w-1 h-1 rounded-full bg-violet-400/60 animate-ping" style={{ animationDuration: "1.5s" }} />
                            <div className="w-0.5 h-2 rounded-full bg-gradient-to-b from-amber-400/30 to-transparent" />
                          </div>
                          {/* Rocket */}
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-amber-500/10 border border-violet-500/15 flex items-center justify-center"
                            style={{ animation: "bounce 2s ease-in-out infinite" }}
                          >
                            <Rocket className="w-4.5 h-4.5 text-violet-400" />
                          </div>
                        </div>
                      )}

                      {/* Arc trail between platforms (desktop only) */}
                      {i > 0 && (
                        <div className="hidden md:block absolute -left-1 bottom-[20%] z-20">
                          <div className={`flex flex-col gap-1 items-center ${isCompleted ? "opacity-20" : "opacity-10"}`}>
                            <div className="w-[3px] h-[3px] rounded-full bg-white" />
                            <div className="w-[2px] h-[2px] rounded-full bg-white/60" />
                            <div className="w-[1px] h-[1px] rounded-full bg-white/30" />
                          </div>
                        </div>
                      )}

                      {/* The platform block */}
                      <div className={`${heights[i]} ${mdHeights[i]} rounded-t-2xl relative overflow-hidden`}>
                        {/* Platform gradient background */}
                        <div className={`absolute inset-0 bg-gradient-to-t ${c.gradient} ${isCompleted ? "opacity-40" : "opacity-20"}`} />
                        <div className={`absolute inset-0 ${isCompleted ? "bg-white/[0.02]" : "bg-white/[0.01]"} border ${isCompleted ? "border-white/[0.06]" : "border-white/[0.04] border-dashed"} rounded-t-2xl`} />

                        {/* Platform top edge */}
                        <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${
                          step.color === "violet" ? "from-violet-500/50 to-violet-500/10" :
                          step.color === "amber" ? "from-amber-500/50 to-amber-500/10" :
                          step.color === "emerald" ? "from-emerald-500/50 to-emerald-500/10" :
                          "from-cyan-500/50 to-cyan-500/10"
                        } ${!isCompleted ? "opacity-50" : ""}`} />

                        {/* Completed checkmark overlay */}
                        {isCompleted && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                            <span className="text-[10px] text-emerald-400/60">✓</span>
                          </div>
                        )}

                        {/* Lock icon for future levels */}
                        {!isCompleted && !isCurrent && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                            <Lock className="w-2.5 h-2.5 text-white/15" />
                          </div>
                        )}

                        {/* Content inside platform */}
                        <div className="relative z-10 p-4 md:p-5 flex flex-col h-full">
                          {/* Level badge */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-xl md:text-2xl ${!isCompleted && !isCurrent ? "grayscale opacity-50" : ""}`}>{step.emoji}</span>
                            <span className={`text-[10px] font-bold ${c.icon} uppercase tracking-[0.15em] ${!isCompleted ? "opacity-40" : "opacity-60"}`}>
                              Lvl {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>

                          {/* Period */}
                          <span className={`text-[11px] font-semibold ${c.icon} mb-1.5 ${!isCompleted ? "opacity-60" : ""}`}>
                            {step.period}
                          </span>

                          {/* Title */}
                          <h3 className={`text-[14px] md:text-[15px] font-bold text-white mb-1.5 leading-snug ${!isCompleted ? "opacity-60" : ""}`}>
                            {step.title}
                          </h3>

                          {/* Description */}
                          <p className={`text-[11px] leading-relaxed mt-auto ${isCompleted ? "text-white/25" : "text-white/15"}`}>
                            {step.desc}
                          </p>

                          {/* XP / progress bar */}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-[3px] rounded-full bg-white/[0.04] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  step.color === "violet" ? "bg-violet-500/40" :
                                  step.color === "amber" ? "bg-amber-500/40" :
                                  step.color === "emerald" ? "bg-emerald-500/40" :
                                  "bg-cyan-500/40"
                                }`}
                                style={{
                                  width: story.isVisible ? (isCompleted ? "100%" : isCurrent ? "35%" : "0%") : "0%",
                                  transition: `width 1s ease ${delays[i] + 400}ms`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-white/15 font-mono">
                              {isCompleted ? "✓" : isCurrent ? "35%" : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status bar — bottom */}
              <div
                className="flex items-center justify-between mt-6 px-2"
                style={{
                  opacity: story.isVisible ? 1 : 0,
                  transition: "all 0.5s ease 1500ms",
                }}
              >
                <span className="text-[11px] text-white/15 font-mono">
                  4/6 completados
                </span>
                <span className="inline-flex items-center gap-2 text-[11px] text-white/20 font-mono">
                  <span className="text-amber-400/50">▸</span>
                  Siguiente: Lvl 05
                  <span className="inline-block w-1 h-3 bg-white/15 animate-pulse rounded-sm" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ MISIÓN ════════════════ */}
        <div className="relative px-4 pb-24 md:pb-32">

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
                Integrar lo que{" "}
                <span className="text-gradient">hoy está roto</span>
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

        {/* ════════════════ VISIÓN ════════════════ */}
        <div className="relative px-4 pb-24 md:pb-32">

          <div
            ref={vision.ref}
            className={`max-w-5xl mx-auto relative z-10 transition-all duration-700 ${
              vision.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="text-center mb-20">
              <p className="text-[11px] text-cyan-400/60 uppercase tracking-[0.25em] font-semibold mb-5">
                Nuestra Visión
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-8 max-w-3xl mx-auto">
                La plataforma de IA para{" "}
                <span className="text-gradient">toda Latinoamérica</span>
              </h2>
              <p className="text-[16px] md:text-[17px] text-white/50 leading-relaxed max-w-2xl mx-auto font-medium mb-6">
                Convertirnos en la plataforma de referencia en LATAM donde
                cualquier negocio — grande o pequeño — pueda operar con
                inteligencia artificial desde el día uno
              </p>
            </div>

            {/* Three pillars of the vision */}
            <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.06]">
              <div className="relative bg-white/[0.02] p-7 md:p-8">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/25 via-cyan-500/5 to-transparent" />
                <span className="text-2xl mb-4 block">🌎</span>
                <h3 className="text-[14px] font-bold text-white mb-2">Sin fronteras</h3>
                <p className="text-[12px] text-white/30 leading-relaxed">
                  Diseñado para el mercado de habla hispana, desde Santiago
                  hasta Ciudad de México
                </p>
              </div>
              <div className="relative bg-white/[0.02] p-7 md:p-8">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500/25 via-violet-500/5 to-transparent" />
                <span className="text-2xl mb-4 block">🔓</span>
                <h3 className="text-[14px] font-bold text-white mb-2">Sin barreras</h3>
                <p className="text-[12px] text-white/30 leading-relaxed">
                  No importa el tamaño, el rubro ni la experiencia técnica.
                  Si tienes clientes, WITHMIA es para ti
                </p>
              </div>
              <div className="relative bg-white/[0.02] p-7 md:p-8">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/25 via-amber-500/5 to-transparent" />
                <span className="text-2xl mb-4 block">⚡</span>
                <h3 className="text-[14px] font-bold text-white mb-2">Desde el día uno</h3>
                <p className="text-[12px] text-white/30 leading-relaxed">
                  IA operativa en menos de una hora, sin equipos técnicos
                  ni integraciones complejas
                </p>
              </div>
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
            {/* Header */}
            <div className="text-center mb-16">
              <p className="text-[11px] text-violet-400/60 uppercase tracking-[0.25em] font-semibold mb-5">
                Nuestros Valores
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-6 max-w-3xl mx-auto">
                Los principios que{" "}
                <span className="text-gradient">nos guían</span>
              </h2>
              <p className="text-[15px] text-white/35 max-w-xl mx-auto leading-relaxed">
                Estos valores fundamentan cada decisión que tomamos y definen
                cómo interactuamos con nuestros clientes
              </p>
            </div>

            {/* 2×2 grid — larger cards, left-aligned content */}
            <div className="grid md:grid-cols-2 gap-5">
              {values.map((v, i) => {
                const Icon = v.icon;
                const c = colorMap[v.color];
                return (
                  <div
                    key={v.title}
                    className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                    style={{
                      opacity: valuesSection.isVisible ? 1 : 0,
                      transform: valuesSection.isVisible ? "translateY(0)" : "translateY(16px)",
                      transition: `all 0.5s ease ${i * 100}ms`,
                    }}
                  >
                    {/* Top accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.gradient}`} />

                    <div className="p-7 md:p-8">
                      {/* Number + icon row */}
                      <div className="flex items-center justify-between mb-5">
                        <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${c.icon}`} />
                        </div>
                        <span className="text-[40px] font-black text-white/[0.03] leading-none">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-[17px] md:text-[18px] font-bold text-white mb-3">{v.title}</h3>

                      {/* Description */}
                      <p className="text-[13px] text-white/30 leading-[1.8]">{v.desc}</p>
                    </div>
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
            {/* Header */}
            <div className="text-center mb-16">
              <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.25em] font-semibold mb-5">
                La empresa
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-6 max-w-3xl mx-auto">
                Constituida,{" "}
                <span className="text-gradient">verificada y operativa</span>
              </h2>
              <p className="text-[15px] text-white/35 max-w-xl mx-auto leading-relaxed">
                No somos una idea en papel. Somos una empresa legalmente constituida
                en Chile, verificada por el SII y con infraestructura productiva en AWS
              </p>
            </div>

            {/* Company info — single clean card */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mb-5">
              {/* Header bar */}
              <div className="px-8 py-6 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-[16px] md:text-[17px] font-bold text-white leading-tight">
                      MIA Marketing & Intelligence Artificial SpA
                    </h3>
                    <p className="text-[12px] text-white/25 mt-0.5">Sociedad por Acciones · Chile</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/15 text-[12px] font-semibold text-emerald-400 shrink-0 self-start sm:self-center">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verificada SII
                </span>
              </div>

              {/* Data grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.03]">
                {[
                  { icon: FileCheck, label: "RUT", value: "78.199.687-4", mono: true },
                  { icon: BarChart3, label: "Actividad", value: "Consultoría de informática y gestión de instalaciones informáticas" },
                  { icon: MapPin, label: "Domicilio", value: "Antonio Bellet 193, Of. 1210, Providencia, Santiago" },
                  { icon: CalendarDays, label: "Inicio actividades", value: "14 de julio de 2025" },
                ].map((row) => (
                  <div key={row.label} className="bg-[#0a0a1a] p-6">
                    <row.icon className="w-4 h-4 text-white/15 mb-3" />
                    <span className="text-[10px] font-semibold text-white/20 uppercase tracking-wider block mb-1.5">
                      {row.label}
                    </span>
                    <span className={`text-[13px] text-white/50 leading-relaxed block ${row.mono ? "font-mono" : ""}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom row: SII detail + Atlantis origin */}
            <div className="grid md:grid-cols-2 gap-5">
              {/* SII Verification */}
              <div className="rounded-2xl border border-emerald-500/10 bg-white/[0.02] p-7">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-white mb-1">Verificada por el SII</h4>
                    <p className="text-[11px] text-white/25 mb-3">
                      Servicio de Impuestos Internos · desde 21 jul 2025
                    </p>
                    <p className="text-[12px] text-white/30 leading-relaxed">
                      Autorizada para emitir facturas electrónicas y documentos
                      tributarios. Infraestructura alojada en AWS
                    </p>
                  </div>
                </div>
              </div>

              {/* Atlantis origin */}
              <a
                href="https://atlantisproducciones.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] p-7 flex items-start gap-4 transition-all duration-300 group"
              >
                <img
                  src="/Logo-Atlantis.webp"
                  alt="Atlantis Producciones"
                  className="w-12 h-12 object-contain opacity-40 group-hover:opacity-60 transition-opacity rounded-lg shrink-0"
                />
                <div className="flex-1">
                  <h4 className="text-[15px] font-bold text-white/50 group-hover:text-white/70 transition-colors mb-1">
                    Originada en Atlantis Producciones
                  </h4>
                  <p className="text-[11px] text-white/20 mb-3">
                    Agencia de servicios digitales · Santiago, Chile
                  </p>
                  <p className="text-[12px] text-white/30 leading-relaxed">
                    WITHMIA nació como proyecto interno de Atlantis en 2025,
                    antes de constituirse como empresa independiente
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/15 shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>



      </div>
    </div>
  );
};

export default About;
