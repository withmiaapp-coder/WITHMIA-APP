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
    period: "2024",
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
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-br from-violet-500/[0.03] via-amber-500/[0.02] to-transparent rounded-full blur-3xl" />
          </div>

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
                En 2024, dentro de Atlantis Producciones, detectamos que las PYMEs
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
              <div className="flex flex-col md:flex-row items-end gap-4 md:gap-2 lg:gap-3 min-h-[400px] md:min-h-[460px] relative pb-4">
                {timeline.map((step, i) => {
                  const c = colorMap[step.color];
                  const heights = ["h-[220px]", "h-[255px]", "h-[290px]", "h-[325px]", "h-[360px]", "h-[400px]"];
                  const mdHeights = ["md:h-[200px]", "md:h-[235px]", "md:h-[270px]", "md:h-[305px]", "md:h-[345px]", "md:h-[390px]"];
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
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-amber-500/10 border border-violet-500/15 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-violet-500/5"
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
