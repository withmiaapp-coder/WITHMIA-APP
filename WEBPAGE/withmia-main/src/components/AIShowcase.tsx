import { Brain, MessageSquare, Database, RefreshCw, Sparkles, CheckCircle2, FileText, Globe, Server, Type, Cpu, BarChart3, TrendingUp, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const steps = [
  {
    icon: Database,
    num: "01",
    title: "Base de conocimiento",
    subtitle: "Entrenamiento personalizado",
    description:
      "Carga catálogos, políticas, FAQ y precios. WITHMIA transforma tu información en conocimiento vectorizado listo para consulta instantánea.",
    capabilities: ["PDFs y documentos", "URLs y sitios web", "Bases de datos", "Texto libre"],
    accent: "#22d3ee",
    accentDim: "#22d3ee30",
  },
  {
    icon: Brain,
    num: "02",
    title: "Comprensión contextual",
    subtitle: "Más allá de palabras clave",
    description:
      "Analiza intención, tono emocional y contexto conversacional. Conecta información entre mensajes para respuestas coherentes y relevantes.",
    capabilities: ["RAG avanzado", "Embeddings semánticos", "Memoria de largo plazo", "Análisis de intención"],
    accent: "#a78bfa",
    accentDim: "#a78bfa30",
  },
  {
    icon: MessageSquare,
    num: "03",
    title: "Respuesta humanizada",
    subtitle: "Comunicación natural",
    description:
      "Genera respuestas empáticas y precisas que reflejan la personalidad de tu marca. Cada interacción se siente auténtica y profesional.",
    capabilities: ["Tono personalizable", "Respuestas empáticas", "Adaptación de marca", "Multiidioma"],
    accent: "#fbbf24",
    accentDim: "#fbbf2430",
  },
  {
    icon: RefreshCw,
    num: "04",
    title: "Optimización continua",
    subtitle: "Aprendizaje autónomo",
    description:
      "Cada conversación perfecciona sus respuestas. Identifica patrones exitosos y ajusta su estrategia de forma automática.",
    capabilities: ["Feedback automático", "Métricas de satisfacción", "A/B testing", "Auto-optimización"],
    accent: "#34d399",
    accentDim: "#34d39930",
  },
];

/* ═══════════════════════════════════════
   VISUAL ILLUSTRATIONS FOR EACH STAGE
   ═══════════════════════════════════════ */

const KnowledgeBaseVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
    {/* Central database */}
    <div
      className="relative w-16 h-16 rounded-2xl flex items-center justify-center z-10"
      style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}
    >
      <Database className="w-7 h-7" style={{ color: accent }} />
      <div
        className="absolute inset-0 rounded-2xl animate-ping opacity-10"
        style={{ backgroundColor: accent }}
      />
    </div>

    {/* Orbiting documents */}
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
            animation: `aishowcase-float 3s ease-in-out ${item.delay} infinite alternate`,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: `${accent}0A`, border: `1px solid ${accent}18` }}
          >
            <Icon className="w-4 h-4" style={{ color: `${accent}90` }} />
          </div>
          <span className="text-[8px] font-mono font-bold" style={{ color: `${accent}50` }}>
            {item.label}
          </span>
        </div>
      );
    })}

    {/* Connection lines (SVG) */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
      {[
        { x1: "50%", y1: "50%", x2: "28%", y2: "30%" },
        { x1: "50%", y1: "50%", x2: "72%", y2: "33%" },
        { x1: "50%", y1: "50%", x2: "30%", y2: "70%" },
        { x1: "50%", y1: "50%", x2: "70%", y2: "68%" },
      ].map((line, i) => (
        <line
          key={i}
          x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
          stroke={accent}
          strokeOpacity={0.12}
          strokeWidth={1}
          strokeDasharray="4 4"
        >
          <animate attributeName="stroke-dashoffset" from="8" to="0" dur="1.5s" repeatCount="indefinite" />
        </line>
      ))}
    </svg>

    {/* Vector dots */}
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 rounded-full"
        style={{
          backgroundColor: accent,
          opacity: 0.2,
          left: `${20 + Math.random() * 60}%`,
          top: `${15 + Math.random() * 70}%`,
          animation: `aishowcase-pulse ${2 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite alternate`,
        }}
      />
    ))}
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

  const connections = [
    [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5],
    [3, 5], [4, 5], [1, 6], [2, 7], [3, 6], [4, 7],
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute w-32 h-32 rounded-full blur-3xl opacity-[0.08] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute w-20 h-20 rounded-full blur-2xl opacity-[0.12] top-[30%] left-[35%] -translate-x-1/2 -translate-y-1/2"
        style={{ backgroundColor: accent, animation: "aishowcase-pulse 4s ease-in-out infinite alternate" }}
      />

      <svg className="w-full h-full max-w-[220px] max-h-[200px]" viewBox="0 0 100 90">
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connections with glow */}
        {connections.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            stroke={accent}
            strokeOpacity={0.15}
            strokeWidth={0.6}
          >
            <animate
              attributeName="stroke-opacity"
              values="0.06;0.35;0.06"
              dur={`${2 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}

        {/* Traveling particles along connections */}
        {[0, 2, 4, 7].map((ci, i) => {
          const [a, b] = connections[ci];
          return (
            <circle key={`p${i}`} r="1" fill={accent} opacity={0.6} filter="url(#glowFilter)">
              <animateMotion
                dur={`${2 + i * 0.5}s`}
                repeatCount="indefinite"
                path={`M${nodes[a].x},${nodes[a].y} L${nodes[b].x},${nodes[b].y}`}
              />
              <animate attributeName="opacity" values="0;0.7;0" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Nodes with glow halos */}
        {nodes.map((n, i) => (
          <g key={i}>
            {/* Glow halo */}
            <circle cx={n.x} cy={n.y} r={n.size} fill={accent} opacity={0.06}>
              <animate
                attributeName="opacity"
                values="0.03;0.12;0.03"
                dur={`${3 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </circle>
            {/* Main node */}
            <circle cx={n.x} cy={n.y} r={n.size / 2} fill={accent} opacity={n.main ? 0.4 : 0.2} filter="url(#glowFilter)">
              <animate
                attributeName="opacity"
                values={n.main ? "0.2;0.55;0.2" : "0.1;0.3;0.1"}
                dur={`${2.5 + i * 0.4}s`}
                repeatCount="indefinite"
              />
            </circle>
            {/* Pulse ring for main nodes */}
            {n.main && (
              <circle cx={n.x} cy={n.y} r={n.size / 2 + 2} fill="none" stroke={accent} strokeOpacity={0.2}>
                <animate attributeName="r" values={`${n.size / 2 + 1};${n.size / 2 + 5};${n.size / 2 + 1}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.25;0.02;0.25" dur="3s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}

        {/* Labels */}
        <text x="50" y="13" textAnchor="middle" fill={accent} fillOpacity={0.5} fontSize="3.5" fontFamily="monospace" fontWeight="bold">
          intención
        </text>
        <text x="50" y="60" textAnchor="middle" fill={accent} fillOpacity={0.5} fontSize="3.5" fontFamily="monospace" fontWeight="bold">
          contexto
        </text>
        <text x="12" y="75" textAnchor="middle" fill={accent} fillOpacity={0.35} fontSize="3" fontFamily="monospace">
          tono
        </text>
        <text x="88" y="75" textAnchor="middle" fill={accent} fillOpacity={0.35} fontSize="3" fontFamily="monospace">
          memoria
        </text>
      </svg>

      {/* Center brain icon with glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center"
        style={{
          backgroundColor: `${accent}18`,
          border: `1px solid ${accent}30`,
          boxShadow: `0 0 20px ${accent}30, 0 0 40px ${accent}18`,
        }}
      >
        <Brain className="w-5 h-5" style={{ color: accent }} />
      </div>
    </div>
  );
};

const HumanizedVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-6 overflow-hidden">
    {/* Chat mockup */}
    <div className="w-full max-w-[200px] space-y-2">
      {/* User message */}
      <div className="flex justify-end">
        <div
          className="px-3 py-2 rounded-2xl rounded-br-md text-[10px] text-white/70 max-w-[140px]"
          style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}
        >
          Hola, necesito agendar una hora para mañana
        </div>
      </div>

      {/* Bot thinking */}
      <div className="flex items-end gap-1.5">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30` }}
        >
          <Cpu className="w-3 h-3" style={{ color: accent }} />
        </div>
        <div
          className="px-3 py-2 rounded-2xl rounded-bl-md text-[10px] text-white/70 max-w-[150px]"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="mb-1">¡Perfecto! 😊 Tengo disponibilidad mañana a las:</div>
          <div className="space-y-0.5 text-[9px]" style={{ color: `${accent}90` }}>
            <div>• 09:00 AM</div>
            <div>• 11:30 AM</div>
            <div>• 15:00 PM</div>
          </div>
        </div>
      </div>

      {/* Typing indicator */}
      <div className="flex items-end gap-1.5">
        <div className="w-6 h-6" />
        <div
          className="px-3 py-2.5 rounded-2xl rounded-bl-md inline-flex gap-1"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: accent,
                opacity: 0.4,
                animation: `aishowcase-typing 1.2s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>

    {/* Sentiment indicator */}
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg mt-1"
      style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}20` }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
      <span className="text-[8px] font-mono" style={{ color: `${accent}60` }}>
        Tono: empático · Idioma: ES · Confianza: 94%
      </span>
    </div>
  </div>
);

const OptimizationVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center gap-2.5 px-6 overflow-hidden">
    {/* Mini metrics */}
    <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
      {[
        { label: "Satisfacción", value: "94.2%", icon: TrendingUp, trend: "+2.1%" },
        { label: "Resolución", value: "89%", icon: Zap, trend: "+5.3%" },
        { label: "Tiempo resp.", value: "1.2s", icon: BarChart3, trend: "-0.4s" },
        { label: "Precisión", value: "97%", icon: CheckCircle2, trend: "+1.8%" },
      ].map((m, i) => {
        const MIcon = m.icon;
        return (
          <div
            key={i}
            className="px-2.5 py-2 rounded-xl"
            style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}18` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <MIcon className="w-3 h-3" style={{ color: `${accent}60` }} />
              <span className="text-[8px] text-white/40 font-medium">{m.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-bold font-mono text-white/80">{m.value}</span>
              <span className="text-[8px] font-mono" style={{ color: accent }}>
                {m.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>

    {/* Mini chart */}
    <div
      className="w-full max-w-[200px] h-12 rounded-xl relative overflow-hidden"
      style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}18` }}
    >
      <svg className="w-full h-full" viewBox="0 0 200 48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.15} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d="M0,40 Q20,38 40,35 T80,28 T120,20 T160,15 T200,8"
          fill="none"
          stroke={accent}
          strokeOpacity={0.4}
          strokeWidth={1.5}
        />
        <path
          d="M0,40 Q20,38 40,35 T80,28 T120,20 T160,15 T200,8 V48 H0 Z"
          fill="url(#chartGrad)"
        />
      </svg>
      <div className="absolute bottom-1 right-2 text-[7px] font-mono" style={{ color: `${accent}50` }}>
        Últimos 30 días
      </div>
    </div>

    {/* Auto-learning badge */}
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
      style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}20` }}
    >
      <RefreshCw className="w-3 h-3 animate-spin" style={{ color: accent, animationDuration: "4s" }} />
      <span className="text-[8px] font-mono" style={{ color: `${accent}60` }}>
        Modelo actualizado hace 3min
      </span>
    </div>
  </div>
);

const stageVisuals = [KnowledgeBaseVisual, ContextualVisual, HumanizedVisual, OptimizationVisual];

export const AIShowcase = () => {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(() => setActiveStep((p) => (p + 1) % steps.length), 6000);
    return () => clearInterval(id);
  }, [isVisible]);

  const cur = steps[activeStep];

  return (
    <section ref={sectionRef} className="py-8 md:py-10 px-4 relative overflow-hidden">
      <div className="max-w-5xl mx-auto relative">

        {/* ─── Header ─── */}
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-amber-500/20 border border-violet-500/30 text-xs text-violet-300 font-semibold backdrop-blur-sm mb-5">
            <div className="relative">
              <Sparkles className="w-3.5 h-3.5" />
              <Sparkles className="w-3.5 h-3.5 absolute inset-0 animate-ping opacity-30" />
            </div>
            Motor de inteligencia artificial
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-[1.15] mb-3">
            La inteligencia detrás de
            <br />
            <span className="text-gradient">cada conversación</span>
          </h2>
          <p className="text-sm text-white/50 max-w-lg mx-auto leading-relaxed">
            Un pipeline de cuatro etapas que transforma datos brutos en
            respuestas inteligentes, empáticas y orientadas a resultados.
          </p>
        </div>

        {/* ─── Step navigation ─── */}
        <div className="relative mb-8">
          {/* Desktop: horizontal tabs */}
          <div className="hidden md:grid grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              const active = i === activeStep;
              return (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`relative bg-[hsl(var(--background))] py-4 px-5 text-left transition-all duration-300 cursor-pointer group ${
                    active ? "" : "hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Timer bar at bottom of active tab */}
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06]">
                      <div
                        key={activeStep}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: cur.accent,
                          opacity: 0.6,
                          animation: "aishowcase-grow 6s linear forwards",
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{
                        backgroundColor: active ? `${step.accent}15` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${active ? `${step.accent}30` : "rgba(255,255,255,0.05)"}`,
                      }}
                    >
                      <StepIcon
                        className="w-4 h-4 transition-colors duration-300"
                        style={{ color: active ? step.accent : "rgba(255,255,255,0.2)" }}
                      />
                    </div>
                    <div>
                      <p
                        className="text-[9px] font-bold tracking-[0.2em] uppercase transition-colors duration-300 mb-0.5"
                        style={{ color: active ? `${step.accent}90` : "rgba(255,255,255,0.12)" }}
                      >
                        Etapa {step.num}
                      </p>
                      <p
                        className={`text-[12px] font-semibold transition-colors duration-300 leading-tight ${
                          active ? "text-white" : "text-white/50 group-hover:text-white/45"
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile: compact selector */}
          <div className="flex md:hidden gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              const active = i === activeStep;
              return (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border whitespace-nowrap transition-all duration-300 shrink-0"
                  style={{
                    backgroundColor: active ? `${step.accent}08` : "transparent",
                    borderColor: active ? `${step.accent}25` : "rgba(255,255,255,0.04)",
                  }}
                >
                  <StepIcon
                    className="w-3.5 h-3.5"
                    style={{ color: active ? step.accent : "rgba(255,255,255,0.25)" }}
                  />
                  <span className={`text-[11px] font-semibold ${active ? "text-white" : "text-white/35"}`}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Main content card ─── */}
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
          <div className="grid md:grid-cols-[1.1fr,1px,1fr] min-h-[280px]">

            {/* Left — description */}
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500"
                  style={{
                    backgroundColor: `${cur.accent}20`,
                    border: `1px solid ${cur.accent}25`,
                  }}
                >
                  <cur.icon className="w-6 h-6 transition-colors duration-500" style={{ color: cur.accent }} />
                </div>
                <div>
                  <p
                    className="text-[10px] font-bold tracking-[0.2em] uppercase mb-0.5 transition-colors duration-500"
                    style={{ color: `${cur.accent}80` }}
                  >
                    Etapa {cur.num}
                  </p>
                  <h3 className="text-lg md:text-xl font-bold text-white leading-tight">
                    {cur.title}
                  </h3>
                </div>
              </div>

              <p className="text-[13px] md:text-[14px] text-white/55 leading-[1.7] mb-5">
                {cur.description}
              </p>

              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500"
                style={{
                  backgroundColor: `${cur.accent}12`,
                  border: `1px solid ${cur.accent}20`,
                }}
              >
                <div
                  className="w-1 h-6 rounded-full transition-all duration-500"
                  style={{ backgroundColor: `${cur.accent}50` }}
                />
                <p className="text-[12px] text-white/50 font-medium">
                  {cur.subtitle}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px md:h-auto md:w-px bg-white/[0.06]" />

            {/* Right — visual illustration + capabilities */}
            <div className="p-5 md:p-6 flex flex-col justify-between">
              {/* Stage visual */}
              <div
                className="relative h-[220px] rounded-2xl overflow-hidden mb-4 transition-all duration-500"
                style={{
                  backgroundColor: `${cur.accent}04`,
                  border: `1px solid ${cur.accent}08`,
                }}
              >
                {(() => {
                  const Visual = stageVisuals[activeStep];
                  return <Visual accent={cur.accent} />;
                })()}
              </div>

              {/* Compact capabilities pills */}
              <div className="flex flex-wrap gap-1.5">
                {cur.capabilities.map((cap, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] transition-all duration-200"
                  >
                    <CheckCircle2
                      className="w-3 h-3 shrink-0"
                      style={{ color: `${cur.accent}60` }}
                    />
                    <span className="text-[10px] text-white/55 font-medium">
                      {cap}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress indicator */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.08]">
                <div className="flex gap-2">
                  {steps.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStep(i)}
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: i === activeStep ? "24px" : "6px",
                        backgroundColor: i === activeStep ? cur.accent : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/25 font-mono tracking-wider">
                  {cur.num}
                  <span className="text-white/8 mx-1">/</span>
                  04
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aishowcase-grow {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes aishowcase-float {
          0% { transform: translate(-50%, -50%) translateY(0px); }
          100% { transform: translate(-50%, -50%) translateY(-6px); }
        }
        @keyframes aishowcase-pulse {
          0% { opacity: 0.1; transform: scale(1); }
          100% { opacity: 0.4; transform: scale(1.5); }
        }
        @keyframes aishowcase-typing {
          0%, 60%, 100% { opacity: 0.15; transform: translateY(0); }
          30% { opacity: 0.6; transform: translateY(-3px); }
        }
      `}</style>
    </section>
  );
};
