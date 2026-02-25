import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Sparkles,
  Database,
  Brain,
  MessageSquare,
  CalendarCheck,
  BarChart3,
  Shield,
  Wifi,
  Battery,
  Signal,
  Check,
  CheckCheck,
  Zap,
  Lock,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   SCENARIOS
   ═══════════════════════════════════════════════════════════ */

interface Msg {
  id: number;
  from: "client" | "mia";
  text: string;
  delay: number;
}

interface Scenario {
  id: string;
  label: string;
  emoji: string;
  channel: string;
  channelIcon: string;
  industry: string;
  color: string;
  messages: Msg[];
}

const scenarios: Scenario[] = [
  {
    id: "ecommerce",
    label: "E-commerce",
    emoji: "🛍️",
    channel: "Instagram",
    channelIcon: "/icons/instagram-new.webp",
    industry: "Tienda de ropa",
    color: "#E1306C",
    messages: [
      { id: 1, from: "client", text: "Hola, ¿cuánto cuesta esta polera?", delay: 0 },
      { id: 2, from: "mia", text: "¡Hola! 😊 Esa polera tiene 20% de descuento esta semana, queda en $14.990. ¿Quieres que te envíe el link de pago?", delay: 2000 },
      { id: 3, from: "client", text: "Sí, ¿tienen talla M?", delay: 4500 },
      { id: 4, from: "mia", text: "¡Sí! Talla M disponible en blanco y negro 👕 Te armo el pedido y coordino envío. ¿A qué comuna te lo enviamos? 📦", delay: 6500 },
      { id: 5, from: "client", text: "A Providencia, Santiago", delay: 9000 },
      { id: 6, from: "mia", text: "Envío gratis a Providencia ✅ Tu link de pago: pay.store/x7k2 — Llega en 24-48hrs 🚀", delay: 11000 },
    ],
  },
  {
    id: "clinica",
    label: "Clínica",
    emoji: "🦷",
    channel: "WhatsApp",
    channelIcon: "/icons/whatsapp.webp",
    industry: "Clínica dental",
    color: "#25D366",
    messages: [
      { id: 1, from: "client", text: "Hola, quiero agendar una limpieza dental", delay: 0 },
      { id: 2, from: "mia", text: "¡Hola! 👋 Tenemos disponibilidad mañana a las 10:00 o 15:30 con Dra. Valentina Rojas. ¿Cuál te acomoda?", delay: 2000 },
      { id: 3, from: "client", text: "A las 15:30", delay: 4500 },
      { id: 4, from: "mia", text: "Agendé tu hora para mañana jueves 15:30 ✅ Te enviaré recordatorio 1hr antes. Valor: $35.000 (15% dcto primera visita) 🦷", delay: 6500 },
      { id: 5, from: "client", text: "Perfecto, ¿aceptan tarjeta?", delay: 9000 },
      { id: 6, from: "mia", text: "Sí, aceptamos todas las tarjetas y transferencia. También puedes pagar al llegar. ¡Te esperamos mañana! 😊", delay: 11000 },
    ],
  },
  {
    id: "servicios",
    label: "Servicios B2B",
    emoji: "🎨",
    channel: "Web",
    channelIcon: "/icons/web-new.webp",
    industry: "Agencia creativa",
    color: "#61DAFB",
    messages: [
      { id: 1, from: "client", text: "Necesitamos branding completo para nuestra startup", delay: 0 },
      { id: 2, from: "mia", text: "¡Hola! 👋 ¿Podrías contarme sobre tu marca y vertical? Así preparo una propuesta a medida con casos similares.", delay: 2000 },
      { id: 3, from: "client", text: "Somos fintech, necesitamos logo + manual + web", delay: 4500 },
      { id: 4, from: "mia", text: "Tenemos un pack Fintech desde $1.200 USD que incluye todo. Te comparto 3 casos de startups similares que hemos hecho 🎨", delay: 6500 },
      { id: 5, from: "client", text: "Me interesa, ¿podemos agendar una call?", delay: 9000 },
      { id: 6, from: "mia", text: "Te agendé videollamada con nuestro director creativo mañana 11:00 📅 La invitación llega a tu email en segundos.", delay: 11000 },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════ */

const AnimatedValue = ({ value, isVisible }: { value: string; isVisible: boolean }) => {
  const [display, setDisplay] = useState("—");
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => setDisplay(value), 400);
    return () => clearTimeout(t);
  }, [isVisible, value]);
  return <>{display}</>;
};

/* ═══════════════════════════════════════════════════════════
   WORKFLOW PIPELINE — premium animated flow
   ═══════════════════════════════════════════════════════════ */

const pipelineSteps = [
  { icon: MessageSquare, label: "Recepción", color: "#3B82F6", desc: "Canal omnicanal" },
  { icon: Database, label: "RAG + Vectores", color: "#8B5CF6", desc: "QDRANT embeddings" },
  { icon: Brain, label: "IA Contextual", color: "#F59E0B", desc: "Razonamiento + memoria" },
  { icon: CalendarCheck, label: "Ejecución", color: "#10B981", desc: "Acción automática" },
  { icon: BarChart3, label: "Analytics", color: "#06B6D4", desc: "Métricas y aprendizaje" },
];

const WorkflowPipeline = ({ activeStep, isVisible }: { activeStep: number; isVisible: boolean }) => {
  return (
    <div className={`hidden lg:block mt-8 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-white/10" />
        <span className="text-[10px] text-white/50 font-semibold uppercase tracking-[0.2em]">Workflow en tiempo real</span>
        <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-white/10" />
      </div>

      <div className="flex items-start gap-0 px-4">
        {pipelineSteps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i <= activeStep;
          const isCurrent = i === activeStep;
          return (
            <div key={i} className="flex items-start flex-1">
              {/* Node */}
              <div className="flex flex-col items-center gap-2.5 relative z-10 flex-1">
                <div className="relative">
                  {/* Glow ring */}
                  {isCurrent && (
                    <div
                      className="absolute -inset-3 rounded-2xl opacity-30 blur-md"
                      style={{ background: step.color }}
                    />
                  )}
                  <div
                    className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 backdrop-blur-sm ${
                      isCurrent ? "scale-110" : isActive ? "scale-100" : "scale-90 opacity-30"
                    }`}
                    style={{
                      border: `1px solid ${isActive ? step.color + "40" : "rgba(255,255,255,0.06)"}`,
                      background: isActive
                        ? `linear-gradient(135deg, ${step.color}18, ${step.color}08)`
                        : "rgba(255,255,255,0.02)",
                      boxShadow: isCurrent ? `0 4px 20px ${step.color}30, inset 0 1px 0 ${step.color}15` : "none",
                    }}
                  >
                    <Icon
                      className="w-5 h-5 transition-all duration-300"
                      style={{ color: isActive ? step.color : "rgba(255,255,255,0.15)" }}
                    />
                  </div>
                  {/* Status dot */}
                  {isActive && (
                    <div
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background flex items-center justify-center"
                      style={{ background: isCurrent ? step.color : "#10B981" }}
                    >
                      {!isCurrent && <Check className="w-1.5 h-1.5 text-white" />}
                      {isCurrent && <div className="w-1 h-1 rounded-full bg-white animate-pulse" />}
                    </div>
                  )}
                </div>
                <div className="text-center min-w-[80px]">
                  <p className={`text-[11px] font-semibold transition-colors duration-300 ${isActive ? "text-white/80" : "text-white/35"}`}>
                    {step.label}
                  </p>
                  <p className={`text-[9px] mt-0.5 font-mono transition-colors duration-300 ${isActive ? "text-white/35" : "text-white/20"}`}>
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* Connector */}
              {i < pipelineSteps.length - 1 && (
                <div className="relative h-[2px] flex-1 mt-[23px] mx-1">
                  <div className="absolute inset-0 bg-white/[0.06] rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: i < activeStep ? "100%" : "0%",
                      background: `linear-gradient(to right, ${step.color}80, ${pipelineSteps[i + 1].color}80)`,
                      boxShadow: i < activeStep ? `0 0 8px ${step.color}40` : "none",
                    }}
                  />
                  {/* Glowing particle */}
                  {i < activeStep && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${pipelineSteps[i + 1].color}, transparent)`,
                        boxShadow: `0 0 10px ${pipelineSteps[i + 1].color}80`,
                        animation: "flowParticle 2s ease-in-out infinite",
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export const LiveDemo = () => {
  const [activeScenario, setActiveScenario] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(-1);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const scenario = scenarios[activeScenario];
  const conversation = scenario.messages;

  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) setHasStarted(true);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  // Play conversation
  useEffect(() => {
    setVisibleMessages([]);
    setIsTyping(false);
    setPipelineStep(-1);
    setResponseTime(null);

    if (!hasStarted) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    conversation.forEach((msg, idx) => {
      if (msg.from === "mia") {
        timeouts.push(setTimeout(() => setIsTyping(true), msg.delay - 1200));
        timeouts.push(setTimeout(() => setPipelineStep(Math.min(idx, pipelineSteps.length - 1)), msg.delay - 600));
        // Show random response time
        timeouts.push(setTimeout(() => setResponseTime(Math.floor(Math.random() * 2000 + 800)), msg.delay + 100));
      }
      timeouts.push(
        setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((prev) => [...prev, msg.id]);
        }, msg.delay)
      );
    });

    return () => timeouts.forEach(clearTimeout);
  }, [hasStarted, activeScenario]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [visibleMessages, isTyping]);

  const switchScenario = useCallback((idx: number) => {
    if (idx === activeScenario) return;
    setHasStarted(true);
    setActiveScenario(idx);
  }, [activeScenario]);

  const getTime = (msgIndex: number) => {
    const base = 14; // 2:14 PM
    const min = base + Math.floor(msgIndex / 2);
    return `2:${min.toString().padStart(2, "0")} PM`;
  };

  return (
    <section ref={sectionRef} className="py-8 md:py-10 px-4 relative overflow-hidden" id="demo">
      {/* ── Background atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Single subtle orb like other sections */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-violet-500/[0.06] blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* ── Header ── */}
        <div className="text-center mb-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-amber-500/20 border border-violet-500/30 text-xs text-violet-300 font-semibold animate-fade-in backdrop-blur-sm">
            <div className="relative">
              <Sparkles className="w-3.5 h-3.5" />
              <Sparkles className="w-3.5 h-3.5 absolute inset-0 animate-ping opacity-30" />
            </div>
            Simulación interactiva
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white animate-fade-in" style={{ animationDelay: "100ms" }}>
            WITHMIA en{" "}
            <span className="relative inline-block">
              <span className="text-gradient">acción real</span>
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-amber-400/30" viewBox="0 0 200 12" fill="none">
                <path d="M2 8 C50 2, 150 2, 198 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <p className="text-sm md:text-base text-white/55 max-w-xl mx-auto leading-relaxed animate-fade-in font-light" style={{ animationDelay: "200ms" }}>
            Observa cómo la IA contextual convierte cada conversación en una venta cerrada.
          </p>
        </div>

        {/* ── Scenario Tabs ── */}
        <div className="flex justify-center mb-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="inline-flex gap-1.5 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
            {scenarios.map((s, i) => (
              <button
                key={s.id}
                onClick={() => switchScenario(i)}
                className={`group relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
                  activeScenario === i
                    ? "text-white shadow-lg"
                    : "text-white/55 hover:text-white/60"
                }`}
              >
                {/* Active background */}
                {activeScenario === i && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-amber-500/10 border border-white/[0.1]" />
                )}
                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center gap-2">
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left panel — Stats & info */}
          <div className="lg:col-span-4 space-y-6 hidden lg:block">
            {/* Channel indicator */}
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                <img
                  src={scenario.channelIcon}
                  alt={scenario.channel}
                  loading="lazy"
                  className="w-5 h-5 object-contain"
                  style={scenario.channel === "Web" ? { filter: "brightness(0) invert(1)" } : undefined}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{scenario.industry}</p>
                <p className="text-[11px] text-white/50">Canal: {scenario.channel}</p>
              </div>
            </div>

            {/* Copy */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-white leading-tight">
                Cada mensaje dispara un
                <br />
                <span className="text-gradient">pipeline de IA</span>
              </h3>
              <p className="text-sm text-white/35 leading-relaxed">
                WITHMIA busca en tu base de conocimiento vectorizada, razona con contexto
                conversacional y ejecuta la acción óptima — todo en menos de 3 segundos.
              </p>
            </div>

            {/* Live metrics */}
            <div className="space-y-2.5">
              <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-semibold">Métricas en vivo</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Tiempo respuesta", value: "<2.4s", color: "#10B981", icon: Zap },
                  { label: "Precisión RAG", value: "96.2%", color: "#8B5CF6", icon: Database },
                  { label: "Tasa de cierre", value: "42%", color: "#F59E0B", icon: BarChart3 },
                  { label: "CSAT Score", value: "4.8/5", color: "#06B6D4", icon: CheckCheck },
                ].map((stat, i) => {
                  const SIcon = stat.icon;
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] group hover:border-white/[0.1] transition-all duration-300"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <SIcon className="w-3 h-3" style={{ color: stat.color + "80" }} />
                        <p className="text-[9px] text-white/40 font-medium">{stat.label}</p>
                      </div>
                      <p className="text-lg font-bold font-mono" style={{ color: stat.color }}>
                        <AnimatedValue value={stat.value} isVisible={hasStarted} />
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-white/35 text-[10px]">
                <Lock className="w-3 h-3" />
                <span>Cifrado E2E</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/35 text-[10px]">
                <Shield className="w-3 h-3" />
                <span>SOC 2 Type II</span>
              </div>
            </div>
          </div>

          {/* Center — Phone mockup */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative">
              {/* 3D tilt container */}
              <div
                className="relative transition-transform duration-700 ease-out"
                style={{
                  transform: "perspective(1200px) rotateY(-2deg) rotateX(1deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Phone outer frame — metallic edge */}
                <div className="relative rounded-[3rem] p-[2px] w-[320px]"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.08) 100%)",
                  }}
                >
                  {/* Phone body */}
                  <div className="rounded-[2.9rem] bg-background overflow-hidden relative">
                    {/* Dynamic Island */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-4 py-1 bg-black rounded-full">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a2e] ring-1 ring-white/[0.06]" />
                      <div className="w-[8px] h-[8px] rounded-full bg-[#1a1a2e] ring-1 ring-violet-500/20" />
                    </div>

                    {/* Status bar */}
                    <div className="flex items-center justify-between px-8 pt-4 pb-1.5 relative z-20">
                      <span className="text-[11px] text-white/60 font-semibold tabular-nums">9:41</span>
                      <div className="flex items-center gap-1">
                        <Signal className="w-3.5 h-3.5 text-white/60" />
                        <Wifi className="w-3.5 h-3.5 text-white/60" />
                        <Battery className="w-4 h-4 text-white/60" />
                      </div>
                    </div>

                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                          <img
                            src="/logo-withmia.webp"
                            alt="WITHMIA"
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-[2.5px] border-background shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-bold text-white tracking-tight">WITHMIA</p>
                          <div className="px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/15">
                            <span className="text-[7px] text-amber-400 font-bold tracking-wider">IA VERIFICADA</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-emerald-400/80 font-medium">Respondiendo ahora</p>
                      </div>
                    </div>

                    {/* Chat body */}
                    <div ref={chatRef} className="h-[400px] overflow-y-auto px-4 py-3 space-y-2.5 scroll-smooth scrollbar-hide"
                      style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.01), transparent)" }}
                    >
                      {/* Encryption notice */}
                      <div className="flex justify-center py-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.03]">
                          <Lock className="w-2.5 h-2.5 text-white/25" />
                          <span className="text-[8px] text-white/25 font-medium">Conversación cifrada de extremo a extremo</span>
                        </div>
                      </div>

                      {/* Date chip */}
                      <div className="flex justify-center py-1">
                        <span className="text-[9px] px-3 py-1 rounded-full bg-white/[0.04] text-white/35 font-medium">
                          Hoy
                        </span>
                      </div>

                      {conversation.map((msg) => {
                        if (!visibleMessages.includes(msg.id)) return null;
                        const isClient = msg.from === "client";
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                            style={{ animation: "msgAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
                          >
                            <div className={`max-w-[80%] relative group`}>
                              <div
                                className={`px-3.5 py-2.5 text-[12.5px] leading-[1.55] ${
                                  isClient
                                    ? "bg-gradient-to-br from-blue-500/30 to-blue-600/15 text-white rounded-2xl rounded-br-sm border border-blue-400/15"
                                    : "bg-gradient-to-br from-white/[0.06] to-white/[0.03] text-white/90 rounded-2xl rounded-bl-sm border border-white/[0.08]"
                                }`}
                              >
                                {msg.text}
                                {/* Timestamp + read receipt */}
                                <div className={`flex items-center gap-1 mt-1 ${isClient ? "justify-end" : "justify-start"}`}>
                                  <span className="text-[8px] text-white/25 tabular-nums">{getTime(msg.id - 1)}</span>
                                  {isClient && <CheckCheck className="w-3 h-3 text-blue-400/50" />}
                                  {!isClient && (
                                    <span className="text-[7px] text-amber-400/30 font-bold">IA</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Typing */}
                      {isTyping && (
                        <div className="flex justify-start" style={{ animation: "msgAppear 0.3s ease-out" }}>
                          <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gradient-to-br from-white/[0.06] to-white/[0.03] border border-white/[0.08]">
                            <div className="flex items-center gap-2.5">
                              <div className="flex gap-[3px]">
                                <span className="w-[5px] h-[5px] bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
                                <span className="w-[5px] h-[5px] bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                                <span className="w-[5px] h-[5px] bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.8s" }} />
                              </div>
                              <span className="text-[9px] text-white/25 font-medium">WITHMIA está escribiendo</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input bar */}
                    <div className="px-3.5 py-2.5 border-t border-white/[0.06] bg-background/90 backdrop-blur-lg">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
                          <span className="text-[12px] text-white/35 flex-1">Escribe un mensaje...</span>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-shadow">
                          <Send className="w-3.5 h-3.5 text-white -rotate-45 translate-x-[1px]" />
                        </button>
                      </div>
                    </div>

                    {/* Home bar */}
                    <div className="flex justify-center pt-1 pb-2">
                      <div className="w-[100px] h-[4px] rounded-full bg-white/[0.12]" />
                    </div>
                  </div>
                </div>

                {/* Phone reflection */}
                <div className="absolute inset-0 rounded-[3rem] pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)",
                  }}
                />
              </div>

              {/* Shadow & glow under phone */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[80%] h-[50px] rounded-full blur-2xl"
                style={{ background: `radial-gradient(ellipse, ${scenario.color}15, transparent 70%)` }}
              />
              <div className="absolute -inset-16 rounded-[4rem] blur-[60px] -z-10 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 30%, ${scenario.color}06, rgba(139,92,246,0.03), transparent 70%)` }}
              />
            </div>
          </div>

          {/* Right panel — Response metrics */}
          <div className="lg:col-span-4 space-y-5 hidden lg:block">
            {/* Real-time response card */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Última respuesta</p>
              </div>

              {responseTime !== null ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold font-mono text-white tracking-tight">
                      {(responseTime / 1000).toFixed(1)}s
                    </p>
                    <p className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
                      {responseTime < 1500 ? "Más rápido que el 95% de agentes humanos" : "Respuesta instantánea"}
                    </p>
                  </div>

                  {/* Performance bars */}
                  <div className="space-y-2.5">
                    {[
                      { label: "Búsqueda vectorial", value: 92, color: "#8B5CF6", time: "0.4s" },
                      { label: "Razonamiento IA", value: 88, color: "#F59E0B", time: "0.8s" },
                      { label: "Generación respuesta", value: 95, color: "#10B981", time: "0.3s" },
                    ].map((bar, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-white/40 font-medium">{bar.label}</span>
                          <span className="text-[9px] font-mono" style={{ color: bar.color + "80" }}>{bar.time}</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: hasStarted ? `${bar.value}%` : "0%",
                              background: `linear-gradient(to right, ${bar.color}60, ${bar.color})`,
                              boxShadow: `0 0 8px ${bar.color}30`,
                              transitionDelay: `${i * 200}ms`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-[11px] text-white/25">Esperando primera respuesta...</p>
                </div>
              )}
            </div>

            {/* Action log */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-3">Acciones ejecutadas</p>
              <div className="space-y-2">
                {visibleMessages
                  .filter((id) => conversation.find((m) => m.id === id)?.from === "mia")
                  .slice(-3)
                  .map((id, i) => (
                    <div key={id} className="flex items-center gap-2 animate-fade-in">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-white/50 truncate">
                        {i === 0 && "Contexto recuperado de QDRANT"}
                        {i === 1 && "Intención clasificada + respuesta generada"}
                        {i === 2 && "Acción automatizada ejecutada"}
                      </span>
                    </div>
                  ))}
                {visibleMessages.filter((id) => conversation.find((m) => m.id === id)?.from === "mia").length === 0 && (
                  <p className="text-[10px] text-white/20">Sin acciones todavía</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Workflow Pipeline ── */}
        <WorkflowPipeline activeStep={pipelineStep} isVisible={hasStarted} />
      </div>

      {/* ── CSS ── */}
      <style>{`
        @keyframes flowParticle {
          0% { left: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { left: calc(100% - 8px); opacity: 0; }
        }
        @keyframes msgAppear {
          0% { opacity: 0; transform: translateY(10px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
};
