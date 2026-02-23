import {
  Brain,
  MessageSquare,
  Database,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  FileText,
  Globe,
  Server,
  Type,
  Cpu,
  BarChart3,
  TrendingUp,
  Zap,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════
   AI Pipeline steps
   ═══════════════════════════════════════ */
const steps = [
  {
    icon: Database,
    num: "01",
    label: "Base de conocimiento",
    title: "Base de conocimiento",
    subtitle: "Tu negocio, indexado y listo para consultar",
    description:
      "Sube catálogos, políticas, FAQs y precios. WITHMIA los transforma en conocimiento vectorizado con RAG para que la IA responda con datos reales — nunca genéricos.",
    capabilities: ["PDFs y documentos", "URLs y sitios web", "Bases de datos", "Texto libre"],
    accent: "#22d3ee",
  },
  {
    icon: Brain,
    num: "02",
    label: "Comprensión contextual",
    title: "Comprensión contextual",
    subtitle: "Entiende intención, no solo palabras",
    description:
      "Analiza intención, tono emocional y contexto entre mensajes. Cruza información del historial para generar respuestas coherentes y alineadas con cada conversación.",
    capabilities: ["RAG avanzado", "Embeddings semánticos", "Memoria conversacional", "Detección de intención"],
    accent: "#a78bfa",
  },
  {
    icon: MessageSquare,
    num: "03",
    label: "Respuesta humanizada",
    title: "Respuesta humanizada",
    subtitle: "Tu cliente no distingue la IA de un humano",
    description:
      "Genera respuestas empáticas, precisas y en el tono de tu marca. Cada mensaje se siente auténtico y profesional, adaptado al contexto emocional del cliente.",
    capabilities: ["Tono de marca", "Empatía contextual", "Adaptación cultural", "Multiidioma nativo"],
    accent: "#fbbf24",
  },
  {
    icon: RefreshCw,
    num: "04",
    label: "Optimización continua",
    title: "Optimización continua",
    subtitle: "Mejora automática con cada interacción",
    description:
      "Cada conversación perfecciona el modelo. Identifica patrones exitosos, detecta fallos y ajusta respuestas de forma autónoma.",
    capabilities: ["Feedback loop", "Métricas en tiempo real", "A/B testing", "Auto-optimización"],
    accent: "#34d399",
  },
];

/* ═══════════════════════════════════════
   STAGE VISUALS
   ═══════════════════════════════════════ */

const KnowledgeBaseVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center z-10" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}>
      <Database className="w-7 h-7" style={{ color: accent }} />
      <div className="absolute inset-0 rounded-2xl animate-ping opacity-10" style={{ backgroundColor: accent }} />
    </div>
    {[
      { icon: FileText, label: "PDF", delay: "0s", x: -80, y: -50 },
      { icon: Globe, label: "URL", delay: "0.3s", x: 80, y: -40 },
      { icon: Server, label: "SQL", delay: "0.6s", x: -70, y: 55 },
      { icon: Type, label: "TXT", delay: "0.9s", x: 75, y: 50 },
    ].map((item, i) => {
      const Icon = item.icon;
      return (
        <div
          key={i}
          className="absolute flex flex-col items-center gap-1"
          style={{
            left: `calc(50% + ${item.x}px)`,
            top: `calc(50% + ${item.y}px)`,
            transform: "translate(-50%, -50%)",
            animation: `ai-float 3s ease-in-out ${item.delay} infinite alternate`,
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: `${accent}0A`, border: `1px solid ${accent}18` }}>
            <Icon className="w-4 h-4" style={{ color: `${accent}90` }} />
          </div>
          <span className="text-[8px] font-mono font-bold" style={{ color: `${accent}50` }}>{item.label}</span>
        </div>
      );
    })}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
      {[
        { x1: "50%", y1: "50%", x2: "28%", y2: "30%" },
        { x1: "50%", y1: "50%", x2: "72%", y2: "33%" },
        { x1: "50%", y1: "50%", x2: "30%", y2: "70%" },
        { x1: "50%", y1: "50%", x2: "70%", y2: "68%" },
      ].map((line, i) => (
        <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={accent} strokeOpacity={0.12} strokeWidth={1} strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1.5s" repeatCount="indefinite" />
        </line>
      ))}
    </svg>
  </div>
);

const ContextualVisual = ({ accent }: { accent: string }) => {
  const nodes = [
    { x: 50, y: 20, size: 8, main: true },
    { x: 22, y: 42, size: 6 },
    { x: 78, y: 42, size: 6 },
    { x: 32, y: 70, size: 5 },
    { x: 68, y: 70, size: 5 },
    { x: 50, y: 50, size: 7, main: true },
    { x: 12, y: 62, size: 4 },
    { x: 88, y: 62, size: 4 },
  ];
  const connections = [[0,1],[0,2],[1,3],[2,4],[1,5],[2,5],[3,5],[4,5],[1,6],[2,7],[3,6],[4,7]];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-32 h-32 rounded-full blur-3xl opacity-[0.08] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: accent }} />
      <svg className="w-full h-full max-w-[220px] max-h-[200px]" viewBox="0 0 100 90">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {connections.map(([a, b], i) => (
          <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={accent} strokeOpacity={0.15} strokeWidth={0.6}>
            <animate attributeName="stroke-opacity" values="0.06;0.35;0.06" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </line>
        ))}
        {[0, 2, 4, 7].map((ci, i) => {
          const [a, b] = connections[ci];
          return (
            <circle key={`p${i}`} r="1" fill={accent} opacity={0.6} filter="url(#glow)">
              <animateMotion dur={`${2 + i * 0.5}s`} repeatCount="indefinite" path={`M${nodes[a].x},${nodes[a].y} L${nodes[b].x},${nodes[b].y}`} />
              <animate attributeName="opacity" values="0;0.7;0" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.size} fill={accent} opacity={0.06}>
              <animate attributeName="opacity" values="0.03;0.12;0.03" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r={n.size / 2} fill={accent} opacity={(n as any).main ? 0.4 : 0.2} filter="url(#glow)">
              <animate attributeName="opacity" values={(n as any).main ? "0.2;0.55;0.2" : "0.1;0.3;0.1"} dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
            </circle>
            {(n as any).main && (
              <circle cx={n.x} cy={n.y} r={n.size / 2 + 2} fill="none" stroke={accent} strokeOpacity={0.2}>
                <animate attributeName="r" values={`${n.size / 2 + 1};${n.size / 2 + 5};${n.size / 2 + 1}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.25;0.02;0.25" dur="3s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}
        <text x="50" y="13" textAnchor="middle" fill={accent} fillOpacity={0.5} fontSize="3.5" fontFamily="monospace" fontWeight="bold">intención</text>
        <text x="50" y="60" textAnchor="middle" fill={accent} fillOpacity={0.5} fontSize="3.5" fontFamily="monospace" fontWeight="bold">contexto</text>
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}30`, boxShadow: `0 0 20px ${accent}30` }}>
        <Brain className="w-5 h-5" style={{ color: accent }} />
      </div>
    </div>
  );
};

const HumanizedVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-6 overflow-hidden">
    <div className="w-full max-w-[200px] space-y-2">
      <div className="flex justify-end">
        <div className="px-3 py-2 rounded-2xl rounded-br-md text-[10px] text-white/70 max-w-[140px]" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}>
          Hola, necesito agendar una hora para mañana
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}>
          <Cpu className="w-3 h-3" style={{ color: accent }} />
        </div>
        <div className="px-3 py-2 rounded-2xl rounded-bl-md text-[10px] text-white/70 max-w-[150px]" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="mb-1">¡Perfecto! 😊 Tengo disponibilidad mañana a las:</div>
          <div className="space-y-0.5 text-[9px]" style={{ color: `${accent}90` }}>
            <div>• 09:00 AM</div>
            <div>• 11:30 AM</div>
            <div>• 15:00 PM</div>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <div className="w-6 h-6" />
        <div className="px-3 py-2.5 rounded-2xl rounded-bl-md inline-flex gap-1" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent, opacity: 0.4, animation: `ai-typing 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mt-1" style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}20` }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
      <span className="text-[8px] font-mono" style={{ color: `${accent}60` }}>Tono: empático · Idioma: ES · Confianza: 94%</span>
    </div>
  </div>
);

const OptimizationVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center gap-2.5 px-6 overflow-hidden">
    <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
      {[
        { label: "Satisfacción", value: "94.2%", icon: TrendingUp, trend: "+2.1%" },
        { label: "Resolución", value: "89%", icon: Zap, trend: "+5.3%" },
        { label: "Tiempo resp.", value: "1.2s", icon: BarChart3, trend: "-0.4s" },
        { label: "Precisión", value: "97%", icon: CheckCircle2, trend: "+1.8%" },
      ].map((m, i) => {
        const MIcon = m.icon;
        return (
          <div key={i} className="px-2.5 py-2 rounded-xl" style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}18` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <MIcon className="w-3 h-3" style={{ color: `${accent}60` }} />
              <span className="text-[8px] text-white/40 font-medium">{m.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-bold font-mono text-white/80">{m.value}</span>
              <span className="text-[8px] font-mono" style={{ color: accent }}>{m.trend}</span>
            </div>
          </div>
        );
      })}
    </div>
    <div className="w-full max-w-[200px] h-12 rounded-xl relative overflow-hidden" style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}18` }}>
      <svg className="w-full h-full" viewBox="0 0 200 48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.15} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d="M0,40 Q20,38 40,35 T80,28 T120,20 T160,15 T200,8" fill="none" stroke={accent} strokeOpacity={0.4} strokeWidth={1.5} />
        <path d="M0,40 Q20,38 40,35 T80,28 T120,20 T160,15 T200,8 V48 H0 Z" fill="url(#cGrad)" />
      </svg>
      <div className="absolute bottom-1 right-2 text-[7px] font-mono" style={{ color: `${accent}50` }}>Últimos 30 días</div>
    </div>
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}20` }}>
      <RefreshCw className="w-3 h-3 animate-spin" style={{ color: accent, animationDuration: "4s" }} />
      <span className="text-[8px] font-mono" style={{ color: `${accent}60` }}>Modelo actualizado hace 3min</span>
    </div>
  </div>
);

const stageVisuals = [KnowledgeBaseVisual, ContextualVisual, HumanizedVisual, OptimizationVisual];

/* ═══════════════════════════════════════
   Scroll-reveal helper
   ═══════════════════════════════════════ */
const Reveal = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-[800ms] ease-out ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════
   AUTO-ADVANCE INTERVAL (ms)
   ═══════════════════════════════════════ */
const AUTO_INTERVAL = 6000;

/* ═══════════════════════════════════════
   MAIN COMPONENT — Single-section carousel
   ═══════════════════════════════════════ */
export const AIShowcase = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [paused, setPaused] = useState(false);

  /* Auto-advance */
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!paused) {
        setIsTransitioning(true);
        setTimeout(() => {
          setActiveStep((p) => (p + 1) % steps.length);
          setIsTransitioning(false);
        }, 200);
      }
    }, AUTO_INTERVAL);
  }, [paused]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (i: number) => {
    if (i === activeStep) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveStep(i);
      setIsTransitioning(false);
    }, 200);
    resetTimer();
  };

  const goPrev = () => goTo((activeStep - 1 + steps.length) % steps.length);
  const goNext = () => goTo((activeStep + 1) % steps.length);

  const step = steps[activeStep];
  const Visual = stageVisuals[activeStep];

  /* Progress for auto-advance bar */
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / AUTO_INTERVAL, 1));
      if (elapsed < AUTO_INTERVAL) requestAnimationFrame(frame);
    };
    const raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [activeStep, paused]);

  return (
    <section ref={sectionRef} className="py-10 md:py-14 px-4 relative overflow-hidden">
      {/* Background accent — follows active step color */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-700">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.04] transition-colors duration-700" style={{ backgroundColor: step.accent }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.03] transition-colors duration-700" style={{ backgroundColor: steps[(activeStep + 2) % steps.length].accent }} />
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <Reveal className="text-center mb-14 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/12 to-amber-500/12 border border-violet-500/20 text-[11px] text-violet-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Motor de inteligencia artificial
          </div>
          <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-4">
            Cómo funciona la IA
            <br />
            <span className="text-gradient">detrás de cada respuesta</span>
          </h2>
          <p className="text-sm md:text-base text-white/40 max-w-lg mx-auto leading-relaxed">
            Cuatro etapas que transforman la información de tu negocio en
            respuestas inteligentes, empáticas y con datos reales.
          </p>
        </Reveal>

        {/* ── CAROUSEL TAB BAR ── */}
        <div
          className="relative mb-8"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Tab buttons — horizontal pipeline style */}
          <div className="relative flex items-stretch rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
            {steps.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = i === activeStep;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`relative flex-1 flex items-center justify-center gap-2.5 px-3 py-4 md:py-5 transition-all duration-500 group ${
                    isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Active top accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500"
                    style={{
                      background: isActive
                        ? `linear-gradient(90deg, transparent, ${s.accent}70, transparent)`
                        : "transparent",
                    }}
                  />

                  {/* Auto-advance progress bar (only on active tab) */}
                  {isActive && !paused && (
                    <div className="absolute bottom-0 left-0 h-[2px] transition-none" style={{
                      width: `${progress * 100}%`,
                      background: `linear-gradient(90deg, ${s.accent}40, ${s.accent}60)`,
                    }} />
                  )}

                  {/* Step number */}
                  <span
                    className="text-[10px] font-bold font-mono hidden md:block transition-colors duration-300"
                    style={{ color: isActive ? `${s.accent}` : "rgba(255,255,255,0.15)" }}
                  >
                    {s.num}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0"
                    style={{
                      backgroundColor: isActive ? `${s.accent}18` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? `${s.accent}30` : "rgba(255,255,255,0.06)"}`,
                      boxShadow: isActive ? `0 0 16px ${s.accent}20` : "none",
                    }}
                  >
                    <StepIcon
                      className="w-4 h-4 transition-colors duration-500"
                      style={{ color: isActive ? s.accent : "rgba(255,255,255,0.25)" }}
                    />
                  </div>

                  {/* Label — only on md+ */}
                  <span
                    className="text-[11px] font-semibold hidden lg:block transition-colors duration-300 whitespace-nowrap"
                    style={{ color: isActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)" }}
                  >
                    {s.label}
                  </span>

                  {/* Vertical separator */}
                  {i < steps.length - 1 && (
                    <div className="absolute right-0 top-[20%] bottom-[20%] w-px bg-white/[0.05]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CAROUSEL CARD ── */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${
              isTransitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
            }`}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Top gradient accent line */}
            <div
              className="h-[2px] transition-all duration-700"
              style={{ background: `linear-gradient(90deg, transparent, ${step.accent}50, transparent)` }}
            />

            {/* Hover glow */}
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-700"
              style={{ background: `radial-gradient(ellipse at 30% 50%, ${step.accent}06, transparent 60%)` }}
            />

            {/* Large watermark number */}
            <span
              className="absolute top-2 right-6 text-[6rem] md:text-[8rem] font-black leading-none pointer-events-none select-none transition-colors duration-500"
              style={{ color: `${step.accent}05` }}
            >
              {step.num}
            </span>

            <div className="grid md:grid-cols-[1.1fr,1fr] gap-0">
              {/* Text side */}
              <div className="p-7 md:p-10 flex flex-col justify-center">
                {/* Step badge */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500"
                    style={{
                      backgroundColor: `${step.accent}12`,
                      border: `1px solid ${step.accent}20`,
                      boxShadow: `0 0 20px ${step.accent}10`,
                    }}
                  >
                    <step.icon className="w-5 h-5" style={{ color: step.accent }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-0.5 transition-colors duration-500" style={{ color: `${step.accent}80` }}>
                      Etapa {step.num}
                    </p>
                    <h3 className="text-lg md:text-xl font-bold text-white leading-tight">{step.title}</h3>
                  </div>
                </div>

                {/* Subtitle callout */}
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 transition-all duration-500"
                  style={{ backgroundColor: `${step.accent}08`, border: `1px solid ${step.accent}12` }}
                >
                  <div className="w-1 h-6 rounded-full transition-colors duration-500" style={{ backgroundColor: `${step.accent}40` }} />
                  <p className="text-[12px] text-white/50 font-medium">{step.subtitle}</p>
                </div>

                <p className="text-[13px] text-white/45 leading-[1.8] mb-6">{step.description}</p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-2">
                  {step.capabilities.map((cap, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-500"
                      style={{
                        backgroundColor: `${step.accent}08`,
                        border: `1px solid ${step.accent}12`,
                      }}
                    >
                      <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: `${step.accent}70` }} />
                      <span className="text-[10px] text-white/50 font-medium">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical divider */}
              <div className="md:border-l border-t md:border-t-0 border-white/[0.05]" />

              {/* Visual side */}
              <div className="p-6 md:p-8 flex items-center justify-center">
                <div
                  className="relative w-full h-[240px] md:h-[280px] rounded-2xl overflow-hidden transition-all duration-500"
                  style={{ backgroundColor: `${step.accent}04`, border: `1px solid ${step.accent}08` }}
                >
                  <Visual accent={step.accent} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Navigation arrows ── */}
          <button
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hidden md:flex"
            aria-label="Etapa anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hidden md:flex"
            aria-label="Siguiente etapa"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Dot indicators (mobile) ── */}
        <div className="flex items-center justify-center gap-2 mt-6 md:hidden">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all duration-300"
              aria-label={`Etapa ${s.num}`}
            >
              <div
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === activeStep ? 24 : 8,
                  height: 8,
                  backgroundColor: i === activeStep ? s.accent : "rgba(255,255,255,0.1)",
                }}
              />
            </button>
          ))}
        </div>

        {/* ── Step counter ── */}
        <div className="flex items-center justify-center mt-6">
          <span className="text-[11px] font-mono text-white/20">
            {String(activeStep + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
        </div>

        {/* Bottom CTA */}
        <Reveal className="text-center mt-12">
          <p className="text-[13px] text-white/30 mb-5">
            Todo este motor trabaja 24/7, sin pausas, sin errores humanos.
          </p>
          <a href="https://app.withmia.com">
            <button className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(167,139,250,0.35)]">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative">Ver la IA en acción</span>
              <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
            </button>
          </a>
        </Reveal>
      </div>

      <style>{`
        @keyframes ai-float { 0% { transform: translate(-50%, -50%) translateY(0); } 100% { transform: translate(-50%, -50%) translateY(-6px); } }
        @keyframes ai-typing { 0%, 60%, 100% { opacity: 0.15; transform: translateY(0); } 30% { opacity: 0.6; transform: translateY(-3px); } }
      `}</style>
    </section>
  );
};
