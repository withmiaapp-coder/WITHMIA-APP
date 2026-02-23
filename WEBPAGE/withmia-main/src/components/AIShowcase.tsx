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

/* ═══════════════════════════════════════
   STAGE 1 — Knowledge Base: Data ingestion pipeline
   ═══════════════════════════════════════ */
const KnowledgeBaseVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-4">
    {/* Ambient glow */}
    <div className="absolute w-40 h-40 rounded-full blur-[60px] opacity-[0.1] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: accent }} />

    {/* Central database hub */}
    <div className="relative flex flex-col items-center gap-6 w-full max-w-[260px]">
      {/* Data sources row */}
      <div className="flex items-center justify-center gap-3 w-full">
        {[
          { icon: FileText, label: "Documentos", ext: ".pdf" },
          { icon: Globe, label: "URLs", ext: ".html" },
          { icon: Server, label: "Databases", ext: ".sql" },
          { icon: Type, label: "Texto", ext: ".txt" },
        ].map((src, i) => {
          const Icon = src.icon;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5" style={{ animation: `kb-fade-in 0.6s ease-out ${i * 0.15}s both` }}>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center relative"
                style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}20` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: `${accent}80` }} />
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-xl" style={{ border: `1px solid ${accent}30`, animation: `kb-pulse ${2.5 + i * 0.3}s ease-in-out infinite` }} />
              </div>
              <span className="text-[7px] font-mono font-semibold tracking-wider uppercase" style={{ color: `${accent}50` }}>{src.ext}</span>
            </div>
          );
        })}
      </div>

      {/* Data flow lines */}
      <svg className="w-full h-8" viewBox="0 0 260 32" fill="none">
        {[40, 100, 160, 220].map((x, i) => (
          <g key={i}>
            <line x1={x} y1="0" x2="130" y2="30" stroke={accent} strokeOpacity={0.12} strokeWidth={1} />
            {/* Animated particle */}
            <circle r="2" fill={accent} opacity={0.6}>
              <animateMotion dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" path={`M${x},0 L130,30`} />
              <animate attributeName="opacity" values="0;0.8;0" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>

      {/* Central processing hub */}
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
          style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}30`, boxShadow: `0 0 30px ${accent}20` }}
        >
          <Database className="w-7 h-7" style={{ color: accent }} />
        </div>
        {/* Spinning ring */}
        <div className="absolute -inset-3 rounded-2xl" style={{ border: `1px dashed ${accent}20`, animation: "kb-spin 12s linear infinite" }} />
        {/* Status badge */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[7px] font-mono font-bold whitespace-nowrap" style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}25`, color: `${accent}90` }}>
          RAG vectorizado
        </div>
      </div>

      {/* Output indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl mt-1" style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}15` }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent, animation: "kb-blink 2s ease-in-out infinite" }} />
        <span className="text-[8px] font-mono" style={{ color: `${accent}55` }}>4 fuentes indexadas · 12,847 vectores</span>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════
   STAGE 2 — Contextual: Neural network graph
   ═══════════════════════════════════════ */
const ContextualVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-4">
    <div className="absolute w-36 h-36 rounded-full blur-[50px] opacity-[0.08] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: accent }} />

    <div className="relative w-full max-w-[260px] flex flex-col items-center gap-2">
      {/* Input layer */}
      <div className="flex items-center gap-2 w-full">
        <div className="px-3 py-1.5 rounded-xl flex-1 text-[9px] font-mono" style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}15`, color: `${accent}70` }}>
          <span className="text-white/30">input:</span> "Necesito agendar una hora"
        </div>
      </div>

      {/* Neural network SVG */}
      <svg className="w-full h-[100px]" viewBox="0 0 260 100" fill="none">
        <defs>
          <filter id="nn-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Layer 1 — Input (3 nodes) */}
        {[18, 48, 78].map((y, i) => (
          <g key={`l1-${i}`}>
            {/* Connections to layer 2 */}
            {[12, 30, 48, 66, 84].map((y2, j) => (
              <line key={j} x1="40" y1={y} x2="130" y2={y2} stroke={accent} strokeOpacity={0.06} strokeWidth={0.5}>
                <animate attributeName="stroke-opacity" values="0.03;0.15;0.03" dur={`${2 + (i + j) * 0.2}s`} repeatCount="indefinite" />
              </line>
            ))}
            <circle cx="40" cy={y} r="6" fill={accent} opacity={0.08} />
            <circle cx="40" cy={y} r="3" fill={accent} opacity={0.4} filter="url(#nn-glow)">
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* Layer 2 — Hidden (5 nodes) */}
        {[12, 30, 48, 66, 84].map((y, i) => (
          <g key={`l2-${i}`}>
            {/* Connections to layer 3 */}
            {[25, 48, 72].map((y3, j) => (
              <line key={j} x1="130" y1={y} x2="220" y2={y3} stroke={accent} strokeOpacity={0.06} strokeWidth={0.5}>
                <animate attributeName="stroke-opacity" values="0.03;0.15;0.03" dur={`${2.5 + (i + j) * 0.15}s`} repeatCount="indefinite" />
              </line>
            ))}
            <circle cx="130" cy={y} r="5" fill={accent} opacity={0.06} />
            <circle cx="130" cy={y} r="2.5" fill={accent} opacity={0.3} filter="url(#nn-glow)">
              <animate attributeName="opacity" values="0.15;0.5;0.15" dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* Layer 3 — Output (3 nodes) */}
        {[25, 48, 72].map((y, i) => (
          <g key={`l3-${i}`}>
            <circle cx="220" cy={y} r="6" fill={accent} opacity={0.08} />
            <circle cx="220" cy={y} r="3" fill={accent} opacity={0.4} filter="url(#nn-glow)">
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* Traveling particles */}
        {[0, 1, 2, 3].map((i) => (
          <circle key={`p${i}`} r="1.5" fill={accent} opacity={0.7} filter="url(#nn-glow)">
            <animateMotion dur={`${2 + i * 0.5}s`} repeatCount="indefinite" path={`M40,${18 + i * 20} Q130,${48} 220,${25 + i * 16}`} />
            <animate attributeName="opacity" values="0;0.9;0" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Layer labels */}
        <text x="40" y="97" textAnchor="middle" fill={accent} fillOpacity={0.3} fontSize="6" fontFamily="monospace">entrada</text>
        <text x="130" y="97" textAnchor="middle" fill={accent} fillOpacity={0.3} fontSize="6" fontFamily="monospace">proceso</text>
        <text x="220" y="97" textAnchor="middle" fill={accent} fillOpacity={0.3} fontSize="6" fontFamily="monospace">salida</text>
      </svg>

      {/* Output analysis */}
      <div className="flex items-center gap-2 w-full">
        {[
          { label: "Intención", value: "agendar", conf: "96%" },
          { label: "Tono", value: "neutral", conf: "91%" },
          { label: "Urgencia", value: "media", conf: "88%" },
        ].map((item, i) => (
          <div key={i} className="flex-1 px-2 py-1 rounded-lg text-center" style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}12` }}>
            <div className="text-[7px] font-mono uppercase tracking-wider" style={{ color: `${accent}40` }}>{item.label}</div>
            <div className="text-[9px] font-semibold text-white/60">{item.value}</div>
            <div className="text-[7px] font-mono" style={{ color: `${accent}60` }}>{item.conf}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════
   STAGE 3 — Humanized: Live chat simulation
   ═══════════════════════════════════════ */
const HumanizedVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center gap-2.5 px-5 overflow-hidden">
    {/* Chat window frame */}
    <div className="w-full max-w-[240px] rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Window header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
          <Cpu className="w-2.5 h-2.5" style={{ color: accent }} />
        </div>
        <span className="text-[9px] font-semibold text-white/50">MIA · Asistente IA</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
          <span className="text-[7px] text-emerald-400/50 font-mono">online</span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="p-3 space-y-2.5">
        {/* User message */}
        <div className="flex justify-end" style={{ animation: "chat-msg 0.4s ease-out both" }}>
          <div className="px-3 py-2 rounded-2xl rounded-br-md text-[9px] text-white/70 max-w-[160px]" style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}20` }}>
            Hola, necesito agendar una hora para mañana
          </div>
        </div>

        {/* AI processing indicator */}
        <div className="flex items-start gap-1.5" style={{ animation: "chat-msg 0.4s ease-out 0.3s both" }}>
          <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}20` }}>
            <Cpu className="w-2.5 h-2.5" style={{ color: accent }} />
          </div>
          <div>
            <div className="px-3 py-2 rounded-2xl rounded-bl-md text-[9px] text-white/65 max-w-[150px]" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="mb-1.5">¡Perfecto! 😊 Tengo disponibilidad mañana:</div>
              <div className="space-y-1">
                {["09:00 AM", "11:30 AM", "15:00 PM"].map((time, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}10` }}>
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${accent}60` }} />
                    <span className="text-[8px] font-medium" style={{ color: `${accent}80` }}>{time}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Typing indicator */}
            <div className="flex items-center gap-1 mt-1.5 px-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: accent, opacity: 0.3, animation: `ai-typing 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
              <span className="text-[7px] font-mono ml-1" style={{ color: `${accent}30` }}>escribiendo...</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Analysis bar */}
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg w-full max-w-[240px]" style={{ backgroundColor: `${accent}06`, border: `1px solid ${accent}12` }}>
      <div className="flex items-center gap-1.5 flex-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent, animation: "kb-blink 2s ease-in-out infinite" }} />
        <span className="text-[7px] font-mono" style={{ color: `${accent}50` }}>Tono: empático</span>
      </div>
      <div className="w-px h-3 bg-white/[0.06]" />
      <span className="text-[7px] font-mono" style={{ color: `${accent}50` }}>ES</span>
      <div className="w-px h-3 bg-white/[0.06]" />
      <span className="text-[7px] font-mono" style={{ color: `${accent}50` }}>94%</span>
    </div>
  </div>
);

/* ═══════════════════════════════════════
   STAGE 4 — Optimization: Live dashboard
   ═══════════════════════════════════════ */
const OptimizationVisual = ({ accent }: { accent: string }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 px-5 overflow-hidden">
    {/* Dashboard frame */}
    <div className="w-full max-w-[260px] rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" style={{ color: `${accent}60` }} />
          <span className="text-[8px] font-semibold text-white/40">Panel de rendimiento</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
          <span className="text-[7px] text-white/25 font-mono">live</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.03] p-2">
        {[
          { label: "Satisfacción", value: "94.2%", trend: "+2.1%", up: true },
          { label: "Resolución", value: "89.0%", trend: "+5.3%", up: true },
          { label: "Tiempo resp.", value: "1.2s", trend: "-0.4s", up: true },
          { label: "Precisión", value: "97.1%", trend: "+1.8%", up: true },
        ].map((m, i) => (
          <div key={i} className="px-2.5 py-2 rounded-lg" style={{ backgroundColor: `${accent}06`, border: `1px solid ${accent}10` }}>
            <div className="text-[7px] text-white/30 font-medium mb-1">{m.label}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[14px] font-bold font-mono text-white/80" style={{ animation: `opt-count 0.6s ease-out ${i * 0.1}s both` }}>{m.value}</span>
              <span className="text-[7px] font-mono font-semibold" style={{ color: m.up ? "#34d399" : "#f87171" }}>
                <TrendingUp className="w-2 h-2 inline-block mr-0.5" style={{ transform: m.up ? "none" : "rotate(180deg)" }} />
                {m.trend}
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="w-full h-[2px] rounded-full mt-1.5 bg-white/[0.04]">
              <div className="h-full rounded-full" style={{ width: `${70 + i * 8}%`, backgroundColor: `${accent}40`, animation: `opt-bar 1.2s ease-out ${i * 0.15}s both` }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Chart */}
    <div className="w-full max-w-[260px] h-[50px] rounded-xl relative overflow-hidden px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-mono text-white/25">Rendimiento 30d</span>
        <span className="text-[7px] font-mono" style={{ color: `${accent}50` }}>↑ 12.4%</span>
      </div>
      <svg className="w-full h-[24px]" viewBox="0 0 260 24" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`optGrad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.2} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d="M0,20 C20,18 40,16 60,15 C80,14 100,12 120,10 C140,9 160,7 180,5 C200,4 220,3 240,2 L260,1" fill="none" stroke={accent} strokeOpacity={0.5} strokeWidth={1.5}>
          <animate attributeName="stroke-dasharray" values="0 500;500 0" dur="2s" fill="freeze" />
        </path>
        <path d="M0,20 C20,18 40,16 60,15 C80,14 100,12 120,10 C140,9 160,7 180,5 C200,4 220,3 240,2 L260,1 V24 H0 Z" fill={`url(#optGrad)`}>
          <animate attributeName="opacity" values="0;1" dur="2s" fill="freeze" />
        </path>
      </svg>
    </div>

    {/* Status bar */}
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg w-full max-w-[260px]" style={{ backgroundColor: `${accent}06`, border: `1px solid ${accent}12` }}>
      <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ color: `${accent}50`, animationDuration: "4s" }} />
      <span className="text-[7px] font-mono" style={{ color: `${accent}45` }}>Auto-optimización activa · Modelo v3.2.1</span>
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
              {/* Text side — LEFT */}
              <div className="p-6 md:p-8 flex flex-col justify-center">
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

              {/* Visual side — RIGHT */}
              <div className="relative p-5 md:p-6 flex items-center justify-center md:border-l border-t md:border-t-0 border-white/[0.05]">
                <div
                  className="relative w-full h-[250px] md:h-[340px] rounded-2xl overflow-hidden transition-all duration-500"
                  style={{ backgroundColor: `${step.accent}04`, border: `1px solid ${step.accent}08` }}
                >
                  <Visual accent={step.accent} />
                </div>
              </div>
            </div>
          </div>
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
        @keyframes ai-typing { 0%, 60%, 100% { opacity: 0.15; transform: translateY(0); } 30% { opacity: 0.6; transform: translateY(-3px); } }
        @keyframes kb-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kb-pulse { 0%, 100% { opacity: 0; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }
        @keyframes kb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes kb-blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes chat-msg { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes opt-count { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes opt-bar { from { width: 0; } }
      `}</style>
    </section>
  );
};
