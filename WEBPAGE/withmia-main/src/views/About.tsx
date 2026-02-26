import { useState, useEffect, useRef } from "react";
import {
  Zap,
  Heart,
  ArrowRight,
  Shield,
  Clock,
  BadgeCheck,
  Code2,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Building2,
  MapPin,
  FileCheck,
  CalendarDays,
  Timer,
  Workflow,
  Lock,
} from "lucide-react";
import { Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";
import { useScrollReveal } from "@/hooks/useAnimations";

/* ─── Animated counter ─── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);
  return val;
}

const values = [
  {
    title: "Cercanía",
    desc: "Entendemos los desafíos de las PYMEs en LATAM porque nacimos dentro de una. No somos una solución genérica: construimos para y con el mercado hispanohablante.",
    icon: Heart,
    color: "violet",
  },
  {
    title: "Excelencia Técnica",
    desc: "100% del código es propietario. Desde la latencia de la IA hasta la arquitectura en AWS, cada detalle está optimizado para rendimiento real.",
    icon: Code2,
    color: "amber",
  },
  {
    title: "Transparencia",
    desc: "Empresa constituida, verificada por el SII y con facturación electrónica. Comunicamos abiertamente nuestros avances, retos y visión.",
    icon: Shield,
    color: "emerald",
  },
];

const colorMap: Record<string, { border: string; bg: string; icon: string; gradient: string }> = {
  violet: { border: "border-violet-500/15", bg: "bg-violet-500/10", icon: "text-violet-400", gradient: "from-violet-500/25 via-violet-500/5 to-transparent" },
  amber: { border: "border-amber-500/15", bg: "bg-amber-500/10", icon: "text-amber-400", gradient: "from-amber-500/25 via-amber-500/5 to-transparent" },
  emerald: { border: "border-emerald-500/15", bg: "bg-emerald-500/10", icon: "text-emerald-400", gradient: "from-emerald-500/25 via-emerald-500/5 to-transparent" },
  cyan: { border: "border-cyan-500/15", bg: "bg-cyan-500/10", icon: "text-cyan-400", gradient: "from-cyan-500/25 via-cyan-500/5 to-transparent" },
};

const pillars = [
  { icon: Zap, label: "Ejecución real", desc: "La IA no solo responde: descuenta stock, bloquea horarios y cobra — en tiempo real", color: "violet" },
  { icon: Workflow, label: "No-Code", desc: "Despliega IA avanzada sin equipo técnico, en menos de 1 hora", color: "amber" },
  { icon: Timer, label: "Golden Window", desc: "Respuesta en <5 min para maximizar conversión de ventas", color: "cyan" },
  { icon: Lock, label: "IP propia", desc: "Código 100% propietario con prompts adaptados a LATAM", color: "emerald" },
];

const timeline = [
  {
    period: "2024",
    title: "Origen en Atlantis Producciones",
    desc: "WITHMIA nace como proyecto interno dentro de Atlantis Producciones SpA, una agencia de servicios digitales. El equipo detectó que la ineficiencia operativa y la fragmentación digital eran problemas críticos generalizados en las PYMEs latinoamericanas.",
    icon: MessageSquare,
    color: "violet",
  },
  {
    period: "Principios de 2025",
    title: "Pivote a plataforma SaaS",
    desc: "Se realiza un pivote tecnológico: de servicios basados en agentes manuales a una plataforma SaaS propietaria. Se desarrolla una arquitectura modular No-Code alojada en AWS.",
    icon: Code2,
    color: "amber",
  },
  {
    period: "7 julio 2025",
    title: "Constitución legal",
    desc: "Se constituye MIA Marketing & Intelligence Artificial SpA como entidad independiente en Providencia, Santiago. El proyecto se separa de la empresa matriz para escalar con dedicación exclusiva.",
    icon: FileCheck,
    color: "emerald",
  },
  {
    period: "Julio 2025 – Hoy",
    title: "Operación y crecimiento",
    desc: "Inicio formal de actividades ante el SII. Lanzamiento de la plataforma con modelo Product-Led Growth y precios Pay-as-you-grow. Primeros clientes en Chile con foco B2B.",
    icon: TrendingUp,
    color: "cyan",
  },
];

const stats = [
  { value: 6, suffix: "", label: "Canales integrados" },
  { value: 10, suffix: "+", label: "Integraciones" },
  { value: 99, suffix: "%", label: "Uptime" },
  { value: 24, suffix: "/7", label: "Soporte" },
];

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const hero = useScrollReveal();
  const mission = useScrollReveal();
  const valuesSection = useScrollReveal();
  const story = useScrollReveal();
  const backed = useScrollReveal();
  const ctaSection = useScrollReveal();
  const statsSection = useScrollReveal();

  const stat0 = useCountUp(stats[0].value, 1200, statsSection.isVisible);
  const stat1 = useCountUp(stats[1].value, 1400, statsSection.isVisible);
  const stat2 = useCountUp(stats[2].value, 1600, statsSection.isVisible);
  const stat3 = useCountUp(stats[3].value, 1000, statsSection.isVisible);
  const statValues = [stat0, stat1, stat2, stat3];

  return (
    <div className="min-h-screen relative">
      <div className="pt-20 relative overflow-hidden">

        {/* ════════════════ HERO ════════════════ */}
        <div className="relative pt-16 md:pt-24 pb-20 md:pb-28 px-4">
          {/* Aurora mesh */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-violet-500/[0.08] via-amber-500/[0.04] to-transparent rounded-full blur-3xl" />
            <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-amber-500/[0.05] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
            <div className="absolute top-40 left-0 w-[350px] h-[350px] bg-violet-500/[0.04] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
          </div>

          <div
            ref={hero.ref}
            className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${
              hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/50 font-semibold backdrop-blur-sm mb-6">
              <Building2 className="w-3.5 h-3.5 text-white/30" />
              Santiago, Chile · Desde 2025
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6">
              IA conversacional para
              <br />
              <span className="text-gradient">empresas reales</span>
            </h1>

            <p className="text-base md:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed mb-10">
              Plataforma SaaS de comunicación inteligente que combina IA generativa,
              CRM, cobranzas y automatización omnicanal en un solo lugar. Diseñada
              para PYMEs con alto volumen de mensajes que necesitan responder
              rápido y vender más — sin equipo técnico.
            </p>

            {/* Stats strip */}
            <div
              ref={statsSection.ref}
              className="inline-flex items-center gap-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
            >
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`px-6 md:px-8 py-4 ${i < stats.length - 1 ? "border-r border-white/[0.06]" : ""}`}
                >
                  <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                    {statValues[i]}{s.suffix}
                  </div>
                  <div className="text-[11px] text-white/25 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════ MISIÓN ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={mission.ref}
            className={`max-w-6xl mx-auto transition-all duration-700 ${
              mission.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: text */}
              <div>
                <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-4">
                  Nuestra misión
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                  Eliminar la{" "}
                  <span className="text-gradient">digitalización desconectada</span>
                </h2>
                <p className="text-[15px] text-white/40 leading-relaxed mb-5">
                  Las PYMEs en Latinoamérica gestionan sus clientes con WhatsApp personal,
                  Excel y herramientas que no se hablan entre sí. Pierden ventas por no
                  responder a tiempo y operan con procesos manuales que no escalan.
                </p>
                <p className="text-[15px] text-white/35 leading-relaxed">
                  WITHMIA resuelve esto con una plataforma unificada: IA que responde,
                  ejecuta y cobra en todos los canales — mientras el equipo se enfoca
                  en lo que importa.
                </p>
              </div>

              {/* Right: pillar cards */}
              <div className="grid grid-cols-2 gap-4">
                {pillars.map((item, i) => {
                  const Icon = item.icon;
                  const c = colorMap[item.color];
                  return (
                    <div
                      key={item.label}
                      className={`relative p-5 rounded-2xl border ${c.border} bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 group overflow-hidden`}
                      style={{
                        opacity: mission.isVisible ? 1 : 0,
                        transform: mission.isVisible ? "translateY(0)" : "translateY(16px)",
                        transition: `all 0.5s ease ${i * 100 + 200}ms`,
                      }}
                    >
                      {/* Top gradient line */}
                      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.gradient}`} />
                      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4 transition-colors`}>
                        <Icon className={`w-5 h-5 ${c.icon}`} />
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1.5">{item.label}</h3>
                      <p className="text-[12px] text-white/25 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ VALORES ════════════════ */}
        <div className="relative px-4 pb-20 md:pb-28">
          {/* Subtle mesh */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-br from-violet-500/[0.04] via-amber-500/[0.03] to-transparent rounded-full blur-3xl" />
          </div>

          <div
            ref={valuesSection.ref}
            className={`max-w-6xl mx-auto relative z-10 transition-all duration-700 ${
              valuesSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="text-center mb-14">
              <p className="text-[11px] text-violet-400/60 uppercase tracking-[0.2em] font-semibold mb-3">
                Lo que nos define
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Nuestros valores
              </h2>
              <p className="text-[15px] text-white/30 max-w-xl mx-auto leading-relaxed">
                Principios que guían cada línea de código y cada decisión de producto.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {values.map((v, i) => {
                const Icon = v.icon;
                const c = colorMap[v.color];
                return (
                  <div
                    key={v.title}
                    className={`relative rounded-2xl border ${c.border} bg-white/[0.02] p-8 overflow-hidden group hover:bg-white/[0.04] transition-all duration-300`}
                    style={{
                      opacity: valuesSection.isVisible ? 1 : 0,
                      transform: valuesSection.isVisible ? "translateY(0)" : "translateY(16px)",
                      transition: `all 0.5s ease ${i * 120}ms`,
                    }}
                  >
                    {/* Top shimmer border */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.gradient}`} />
                    <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-5`}>
                      <Icon className={`w-6 h-6 ${c.icon}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{v.title}</h3>
                    <p className="text-[14px] text-white/35 leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════ NUESTRA HISTORIA ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={story.ref}
            className={`max-w-4xl mx-auto transition-all duration-700 ${
              story.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="text-center mb-14">
              <p className="text-[11px] text-amber-400/60 uppercase tracking-[0.2em] font-semibold mb-3">
                Nuestra historia
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                De proyecto interno a{" "}
                <span className="text-gradient">empresa propia</span>
              </h2>
              <p className="text-[15px] text-white/35 max-w-2xl mx-auto leading-relaxed">
                WITHMIA nació dentro de una agencia digital en Santiago. Al validar
                que el problema que resolvíamos era generalizado, decidimos crear
                una empresa dedicada exclusivamente a esta misión.
              </p>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 md:left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-violet-500/20 via-amber-500/15 to-cyan-500/10" />

              <div className="space-y-6">
                {timeline.map((step, i) => {
                  const Icon = step.icon;
                  const c = colorMap[step.color];
                  return (
                    <div
                      key={step.period}
                      className="relative flex gap-6 md:gap-8 pl-2"
                      style={{
                        opacity: story.isVisible ? 1 : 0,
                        transform: story.isVisible ? "translateX(0)" : "translateX(-20px)",
                        transition: `all 0.5s ease ${i * 150}ms`,
                      }}
                    >
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 md:w-6 md:h-6 ${c.icon}`} />
                      </div>

                      <div className={`flex-1 p-6 rounded-2xl border ${c.border} bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300`}>
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider">
                          {step.period}
                        </span>
                        <h3 className="text-lg font-semibold text-white mt-1 mb-2">{step.title}</h3>
                        <p className="text-[14px] text-white/35 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ EMPRESA ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={backed.ref}
            className={`max-w-4xl mx-auto transition-all duration-700 ${
              backed.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="text-center mb-10">
              <p className="text-[11px] text-white/25 uppercase tracking-[0.2em] font-semibold mb-3">
                Información corporativa
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                La empresa detrás de WITHMIA
              </h2>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              {/* Company header */}
              <div className="px-8 py-6 border-b border-white/[0.05]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">MIA Marketing & Intelligence Artificial SpA</h3>
                    <p className="text-[13px] text-white/30 mt-0.5">Sociedad por Acciones · Chile</p>
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              <div className="divide-y divide-white/[0.04]">
                <div className="grid grid-cols-[auto,1fr] gap-4 px-8 py-4 items-center">
                  <div className="flex items-center gap-2 text-white/25">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">RUT</span>
                  </div>
                  <span className="text-[14px] text-white/60 font-mono">78.199.687-4</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] gap-4 px-8 py-4 items-center">
                  <div className="flex items-center gap-2 text-white/25">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Actividad</span>
                  </div>
                  <span className="text-[14px] text-white/60">Consultoría de informática y gestión de instalaciones informáticas</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] gap-4 px-8 py-4 items-center">
                  <div className="flex items-center gap-2 text-white/25">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Domicilio</span>
                  </div>
                  <span className="text-[14px] text-white/60">Antonio Bellet 193, Of. 1210, Providencia, Santiago</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] gap-4 px-8 py-4 items-center">
                  <div className="flex items-center gap-2 text-white/25">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Inicio actividades</span>
                  </div>
                  <span className="text-[14px] text-white/60">14 de julio de 2025</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] gap-4 px-8 py-4 items-center">
                  <div className="flex items-center gap-2 text-white/25">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Verificación SII</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-400/10 border border-emerald-400/15 text-[11px] font-semibold text-emerald-400">
                      <BadgeCheck className="w-3 h-3" />
                      Verificada
                    </span>
                    <span className="text-[12px] text-white/25">21 julio 2025</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white/[0.01] border-t border-white/[0.05] flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <p className="text-[11px] text-white/20 leading-relaxed">
                  Autorizada para emitir facturas electrónicas y documentos tributarios. Infraestructura en AWS.
                </p>
                <a
                  href="https://atlantisproducciones.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                >
                  <img src="/Logo-Atlantis.webp" alt="Atlantis" className="w-4 h-4 object-contain opacity-40" />
                  Originada en Atlantis Producciones
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ BOTTOM CTA ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={ctaSection.ref}
            className={`max-w-4xl mx-auto transition-all duration-700 ${
              ctaSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="relative rounded-3xl overflow-hidden">
              {/* Gradient mesh */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-violet-500/[0.06] to-cyan-500/[0.04]" />
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-violet-500/10 rounded-full blur-3xl" />
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

                {/* Trust strip */}
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
