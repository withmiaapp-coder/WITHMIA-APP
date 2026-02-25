import { Quote, Sparkles, Star, Building2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  industry: string;
  avatar: string;
  quote: string;
  metric: string;
  metricLabel: string;
  accent: string;
  gradient: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Valentina Rojas",
    role: "Gerente Comercial",
    company: "SmileDent",
    industry: "Odontología",
    avatar: "VR",
    quote:
      "Antes perdíamos el 60% de las consultas porque nadie respondía fuera de horario. WITHMIA atiende 24/7, agenda directo en Dentalink y hasta confirma las citas. Nuestros pacientes creen que es humana.",
    metric: "+182%",
    metricLabel: "Citas agendadas",
    accent: "#22d3ee",
    gradient: "from-cyan-500/20 to-cyan-600/5",
  },
  {
    name: "Andrés Fuentes",
    role: "CEO",
    company: "UrbanShop",
    industry: "E-commerce",
    avatar: "AF",
    quote:
      "Conectamos WhatsApp, Instagram y el chat web en una sola bandeja. WITHMIA responde preguntas de productos, hace seguimiento de pedidos y rescata carritos abandonados. Las ventas subieron un 45%.",
    metric: "+45%",
    metricLabel: "Ventas mensuales",
    accent: "#fbbf24",
    gradient: "from-amber-500/20 to-amber-600/5",
  },
  {
    name: "Catalina Muñoz",
    role: "Directora de Operaciones",
    company: "PropMax",
    industry: "Inmobiliaria",
    avatar: "CM",
    quote:
      "Teníamos 3 personas solo para responder WhatsApp. Ahora WITHMIA califica leads automáticamente y solo nos pasa los calientes. Redujimos el equipo de soporte y cerramos más negocios.",
    metric: "-70%",
    metricLabel: "Costo operativo",
    accent: "#34d399",
    gradient: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    name: "Diego Herrera",
    role: "Fundador",
    company: "FitZone",
    industry: "Fitness",
    avatar: "DH",
    quote:
      "La gente pregunta horarios, precios y disponibilidad a las 11pm. WITHMIA contesta todo, inscribe alumnos y hasta cobra la membresía. Es como tener un vendedor que nunca duerme.",
    metric: "24/7",
    metricLabel: "Atención continua",
    accent: "#a78bfa",
    gradient: "from-violet-500/20 to-violet-600/5",
  },
];

export const Testimonials = () => {
  const [active, setActive] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const current = testimonials[active];

  const goTo = useCallback((index: number) => {
    if (index === active || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActive(index);
      setIsTransitioning(false);
    }, 250);
  }, [active, isTransitioning]);

  const next = useCallback(() => goTo((active + 1) % testimonials.length), [active, goTo]);
  const prev = useCallback(() => goTo((active - 1 + testimonials.length) % testimonials.length), [active, goTo]);

  /* Auto-rotate */
  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => {
        const nextIdx = (prev + 1) % testimonials.length;
        return nextIdx;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-8 md:py-10 px-4 relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative">
        {/* ── Header ── */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-amber-500/20 border border-violet-500/30 text-xs text-violet-300 font-semibold animate-fade-in backdrop-blur-sm">
            <div className="relative">
              <Sparkles className="w-3.5 h-3.5" />
              <Sparkles className="w-3.5 h-3.5 absolute inset-0 animate-ping opacity-30" />
            </div>
            Casos de éxito
          </div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight text-white">
            Resultados que{" "}
            <span className="text-gradient">hablan por sí solos</span>
          </h2>
          <p className="text-sm md:text-base text-white/55 max-w-xl mx-auto">
            Empresas reales que transformaron su operación con WITHMIA.
          </p>
        </div>

        {/* ── Featured testimonial card ── */}
        <div className="relative rounded-2xl border border-white/[0.08] overflow-hidden mb-6">
          {/* Top gradient accent */}
          <div
            className="h-[2px] transition-all duration-500"
            style={{ background: `linear-gradient(90deg, transparent, ${current.accent}40, transparent)` }}
          />

          <div className={`grid lg:grid-cols-[1fr,380px] transition-opacity duration-250 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
            {/* Left — Quote */}
            <div className="p-6 md:p-8 flex flex-col justify-between relative">
              {/* Background accent glow */}
              <div
                className="absolute top-0 left-0 w-[300px] h-[200px] rounded-full blur-[100px] pointer-events-none opacity-30 transition-colors duration-500"
                style={{ backgroundColor: `${current.accent}15` }}
              />

              <div className="relative space-y-5">
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote icon */}
                <Quote className="w-8 h-8 opacity-[0.06] fill-current text-white" />

                {/* Quote text */}
                <blockquote className="text-base md:text-lg text-white/85 leading-relaxed font-light max-w-2xl -mt-2">
                  "{current.quote}"
                </blockquote>
              </div>

              {/* Author + metric row */}
              <div className="flex items-center justify-between flex-wrap gap-4 mt-6 pt-5 border-t border-white/[0.06] relative">
                <div className="flex items-center gap-4">
                  {/* Avatar with accent ring */}
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${current.accent}30, ${current.accent}10)`,
                        border: `2px solid ${current.accent}40`,
                      }}
                    >
                      {current.avatar}
                    </div>
                    {/* Online dot */}
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[hsl(var(--background))]"
                      style={{ backgroundColor: current.accent }}
                    />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-[15px]">{current.name}</p>
                    <p className="text-xs text-white/40">
                      {current.role} · {current.company}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  {/* Industry tag */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <Building2 className="w-3 h-3 text-white/40" />
                    <span className="text-[11px] text-white/40 font-medium">{current.industry}</span>
                  </div>

                  {/* Metric highlight */}
                  <div
                    className="relative text-right px-4 py-2.5 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${current.accent}12, transparent)`,
                      border: `1px solid ${current.accent}20`,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 opacity-70" style={{ color: current.accent }} />
                      <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: current.accent }}>
                        {current.metric}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                      {current.metricLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Testimonial selector */}
            <div className="border-t lg:border-t-0 lg:border-l border-white/[0.06] flex flex-col">
              {/* Navigation header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <span className="text-[10px] text-white/30 font-semibold uppercase tracking-[0.15em]">
                  Testimonios
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prev}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-white/40" />
                  </button>
                  <span className="text-[10px] font-mono text-white/30 min-w-[28px] text-center">
                    {String(active + 1).padStart(2, "0")}/{String(testimonials.length).padStart(2, "0")}
                  </span>
                  <button
                    onClick={next}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                  </button>
                </div>
              </div>

              {/* Selector items */}
              {testimonials.map((t, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-full text-left px-5 py-4 flex items-center gap-3.5 transition-all duration-300 relative ${
                    i < testimonials.length - 1 ? "border-b border-white/[0.04]" : ""
                  } ${
                    i === active
                      ? "bg-white/[0.04]"
                      : "bg-transparent hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Active indicator bar */}
                  {i === active && (
                    <div
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-all duration-300"
                      style={{ backgroundColor: t.accent }}
                    />
                  )}

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300"
                    style={
                      i === active
                        ? {
                            background: `linear-gradient(135deg, ${t.accent}25, ${t.accent}10)`,
                            border: `1px solid ${t.accent}35`,
                            color: t.accent,
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid transparent",
                            color: "rgba(255,255,255,0.4)",
                          }
                    }
                  >
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold transition-colors duration-300 ${
                      i === active ? "text-white" : "text-white/50"
                    }`}>
                      {t.name}
                    </p>
                    <p className="text-[11px] text-white/30 mt-0.5">{t.company} · {t.industry}</p>
                  </div>
                  {i === active && (
                    <span
                      className="text-sm font-bold font-mono shrink-0"
                      style={{ color: t.accent }}
                    >
                      {t.metric}
                    </span>
                  )}
                </button>
              ))}

              {/* Progress bar */}
              <div className="px-5 py-3 mt-auto">
                <div className="flex gap-1.5">
                  {testimonials.map((t, i) => (
                    <div
                      key={i}
                      className="h-[3px] rounded-full flex-1 transition-all duration-500 cursor-pointer"
                      onClick={() => goTo(i)}
                      style={{
                        backgroundColor: i === active ? t.accent : "rgba(255,255,255,0.06)",
                        opacity: i === active ? 0.8 : 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom metrics summary ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {testimonials.map((t, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`group relative rounded-xl p-4 text-center transition-all duration-300 border cursor-pointer ${
                i === active
                  ? "border-white/[0.1] bg-white/[0.03]"
                  : "border-white/[0.04] bg-transparent hover:border-white/[0.08] hover:bg-white/[0.02]"
              }`}
            >
              <p
                className="text-xl md:text-2xl font-bold font-mono tracking-tight mb-1 transition-colors duration-300"
                style={{ color: i === active ? t.accent : "rgba(255,255,255,0.3)" }}
              >
                {t.metric}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                {t.metricLabel}
              </p>
              <p className="text-[10px] text-white/20 mt-1">{t.company}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
