import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useState, useEffect, useRef } from "react";
import {
  Rocket,
  Users,
  Heart,
  Globe,
  Zap,
  Target,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  BadgeCheck,
  Code2,
  MessageSquare,
  BarChart3,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
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
    desc: "Entendemos los desafíos de las empresas en LATAM porque somos parte de este ecosistema. No somos una solución genérica: construimos para y con nuestra comunidad.",
    icon: Heart,
    color: "violet",
  },
  {
    title: "Excelencia Técnica",
    desc: "Cada línea de código importa. Desde la latencia de nuestra IA hasta la experiencia de usuario, buscamos la excelencia en cada detalle técnico.",
    icon: Code2,
    color: "amber",
  },
  {
    title: "Transparencia",
    desc: "Creemos en relaciones honestas con nuestros clientes, inversores y equipo. Comunicamos abiertamente nuestros avances, retos y visión.",
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
  { icon: Rocket, label: "Innovación", desc: "IA conversacional de última generación adaptada al mercado LATAM", color: "violet" },
  { icon: Users, label: "Accesibilidad", desc: "Herramientas enterprise al alcance de cualquier empresa", color: "amber" },
  { icon: Globe, label: "Impacto", desc: "Transformando la comunicación empresarial en toda Latinoamérica", color: "cyan" },
  { icon: Target, label: "Enfoque", desc: "Soluciones pensadas para las necesidades reales de las PYMEs", color: "emerald" },
];

const timeline = [
  {
    period: "El inicio",
    title: "Identificar el problema",
    desc: "Vimos cómo las PYMEs en Chile y LATAM perdían clientes por no poder responder a tiempo o gestionar múltiples canales.",
    icon: MessageSquare,
    color: "violet",
  },
  {
    period: "La construcción",
    title: "Desarrollar la solución",
    desc: "Construimos una plataforma omnicanal con IA conversacional propia, diseñada desde cero para el mercado hispanohablante.",
    icon: Code2,
    color: "amber",
  },
  {
    period: "El crecimiento",
    title: "Validar con el mercado",
    desc: "Empresas reales comenzaron a usar WITHMIA, validando nuestro enfoque. Cada feedback nos hizo mejores.",
    icon: BarChart3,
    color: "emerald",
  },
  {
    period: "Hoy",
    title: "Escalar el impacto",
    desc: "Levantamiento de fondos y aceleración para llevar WITHMIA a toda Latinoamérica.",
    icon: TrendingUp,
    color: "cyan",
  },
];

const stats = [
  { value: 500, suffix: "+", label: "Equipos activos" },
  { value: 6, suffix: "", label: "Canales conectados" },
  { value: 12, suffix: "+", label: "Integraciones nativas" },
  { value: 99, suffix: "%", label: "Uptime garantizado" },
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

  const stat0 = useCountUp(stats[0].value, 1800, statsSection.isVisible);
  const stat1 = useCountUp(stats[1].value, 1200, statsSection.isVisible);
  const stat2 = useCountUp(stats[2].value, 1400, statsSection.isVisible);
  const stat3 = useCountUp(stats[3].value, 1600, statsSection.isVisible);
  const statValues = [stat0, stat1, stat2, stat3];

  return (
    <div className="min-h-screen relative">
      <SEO title="Nosotros" description="Conoce al equipo detrás de WITHMIA. Nuestra misión es democratizar la IA conversacional para potenciar negocios de todos los tamaños." path="/nosotros" />
      <Navigation />
      <main className="pt-20 relative overflow-hidden">

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
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold backdrop-blur-sm mb-6">
              <div className="relative">
                <Heart className="w-4 h-4" />
                <Heart className="w-4 h-4 absolute inset-0 animate-ping opacity-30" />
              </div>
              Nosotros
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6">
              Construimos el futuro de la
              <br />
              <span className="text-gradient">comunicación empresarial</span>
            </h1>

            <p className="text-base md:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed mb-10">
              Somos un equipo apasionado por la tecnología y la inteligencia artificial,
              enfocados en democratizar herramientas de comunicación avanzadas para
              empresas de todos los tamaños en Latinoamérica.
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
                  Que cada empresa pueda comunicarse{" "}
                  <span className="text-gradient">como las grandes</span>
                </h2>
                <p className="text-[15px] text-white/40 leading-relaxed mb-5">
                  En WITHMIA creemos que la tecnología de comunicación inteligente no debería
                  ser un privilegio de las grandes corporaciones. Nuestra misión es empoderar
                  a PYMEs y empresas en crecimiento con herramientas de IA conversacional
                  que transformen cómo se conectan con sus clientes.
                </p>
                <p className="text-[15px] text-white/35 leading-relaxed">
                  Cada interacción cuenta. Cada mensaje es una oportunidad. Y con la IA adecuada,
                  cada empresa puede ofrecer una experiencia excepcional a sus clientes,
                  sin importar su tamaño.
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
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Nuestros valores
              </h2>
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
                De una idea a una{" "}
                <span className="text-gradient">plataforma</span>
              </h2>
              <p className="text-[15px] text-white/35 max-w-2xl mx-auto leading-relaxed">
                WITHMIA nació de una necesidad real: las empresas en Latinoamérica
                necesitan comunicarse mejor con sus clientes.
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

        {/* ════════════════ BACKED BY ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={backed.ref}
            className={`max-w-5xl mx-auto text-center transition-all duration-700 ${
              backed.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <p className="text-[11px] text-white/25 uppercase tracking-[0.2em] font-semibold mb-6">
              Desarrollado por
            </p>
            <a
              href="https://atlantisproducciones.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-5 px-8 py-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:border-amber-500/25 hover:bg-amber-500/[0.03] transition-all duration-300 group"
            >
              <img
                src="/Logo-Atlantis.webp"
                alt="Atlantis Producciones"
                className="w-12 h-12 object-contain opacity-60 group-hover:opacity-100 transition-all duration-300"
              />
              <div className="text-left">
                <p className="text-base font-semibold text-white/70 group-hover:text-white transition-colors">
                  Atlantis Producciones
                </p>
                <p className="text-[12px] text-white/25 group-hover:text-white/40 transition-colors">
                  Innovación tecnológica desde Chile
                </p>
              </div>
            </a>
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
                  ¿Listo para transformar tu comunicación?
                </h2>
                <p className="text-[14px] text-white/40 max-w-md mx-auto mb-8 leading-relaxed">
                  Únete a las empresas que ya confían en WITHMIA para conectar
                  con sus clientes de forma inteligente.
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
                    <BadgeCheck className="w-3 h-3" /> +500 equipos activos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default About;
