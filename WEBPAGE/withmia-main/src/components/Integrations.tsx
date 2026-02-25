import { useState, useEffect, useRef } from "react";
import { trackCTAClick } from "@/lib/analytics";
import {
  Terminal,
  Database,
  CalendarRange,
  Sparkles,
  CheckCircle2,
  Calendar,
  Stethoscope,
  ShoppingCart,
  Code2,
  CalendarCheck,
  CalendarDays,
  Mail,
  Webhook,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Shield,
  Globe,
  Activity,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const channels = [
  { name: "WhatsApp", image: "/icons/whatsapp.webp", color: "#25D366" },
  { name: "Instagram", image: "/icons/instagram-new.webp", color: "#E1306C" },
  { name: "Messenger", image: "/icons/facebook-new.webp", color: "#0084FF" },
  { name: "Email", image: "/icons/gmail-new.webp", color: "#EA4335" },
  { name: "Chat Web", image: "/icons/web-new.webp", color: "#61DAFB", invert: true },
  { name: "Cloud API", image: "/icons/api-final.webp", color: "#34D399" },
];

const integrations: {
  name: string;
  desc: string;
  icon: typeof Database;
  tag: string;
  color: string;
}[] = [
  { name: "AgendaPro", desc: "Citas y reservas", icon: CalendarCheck, tag: "Agenda", color: "#3B82F6" },
  { name: "Calendly", desc: "Reuniones automáticas", icon: CalendarDays, tag: "Agenda", color: "#006BFF" },
  { name: "Dentalink", desc: "Clínicas dentales", icon: Stethoscope, tag: "Salud", color: "#22D3EE" },
  { name: "Google Calendar", desc: "Agenda sincronizada", icon: Calendar, tag: "Agenda", color: "#4285F4" },
  { name: "Medilink", desc: "Gestión médica", icon: Stethoscope, tag: "Salud", color: "#F43F5E" },
  { name: "MercadoLibre", desc: "Marketplace", icon: ShoppingCart, tag: "E-commerce", color: "#FFE600" },
  { name: "Outlook", desc: "Microsoft Calendar", icon: Mail, tag: "Agenda", color: "#0078D4" },
  { name: "Reservo", desc: "Reservas online", icon: CalendarRange, tag: "Agenda", color: "#10B981" },
  { name: "Shopify", desc: "E-commerce sync", icon: ShoppingCart, tag: "E-commerce", color: "#96BF48" },
  { name: "WooCommerce", desc: "Tienda WordPress", icon: Code2, tag: "E-commerce", color: "#9B5C8F" },
  { name: "API REST", desc: "Webhooks custom", icon: Webhook, tag: "Dev", color: "#F59E0B" },
  { name: "MySQL", desc: "Base de datos", icon: Database, tag: "Data", color: "#00758F" },
];

const metrics = [
  { value: "2.4M+", label: "Mensajes procesados", icon: Zap, color: "#fbbf24" },
  { value: "99.9%", label: "SLA Uptime", icon: Shield, color: "#34d399" },
  { value: "18+", label: "Conectores nativos", icon: Globe, color: "#a78bfa" },
  { value: "<200ms", label: "Latencia p95", icon: Activity, color: "#22d3ee" },
];

/* Groups for mobile view */
const leftGroup = [
  { label: "Productividad", items: integrations.filter(i => i.tag === "Agenda"), accent: "#3B82F6" },
];
const rightGroup = [
  { label: "Salud", items: integrations.filter(i => i.tag === "Salud"), accent: "#F43F5E" },
  { label: "E-commerce", items: integrations.filter(i => i.tag === "E-commerce"), accent: "#F59E0B" },
  { label: "Dev & Data", items: integrations.filter(i => i.tag === "Dev" || i.tag === "Data"), accent: "#22D3EE" },
];

/* ═══════════════════════════════════════════════════════════
   SPIDER WEB GEOMETRY — pre-computed, static, lightweight
   ═══════════════════════════════════════════════════════════ */

const WB = { W: 600, H: 400, CX: 300, CY: 200 };
const STRANDS = 24;
const RING_RADII = [32, 60, 90, 125, 165];
const CH_R = 75;
const INT_R = 170;

/* Radial strand angles (every 15°) */
const strandAngles = Array.from({ length: STRANDS }, (_, i) =>
  (Math.PI * 2 * i) / STRANDS - Math.PI / 2
);

/* Channel positions — 6 nodes on inner ring */
const chNodes = channels.map((ch, i) => {
  const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
  return { ...ch, x: WB.CX + CH_R * Math.cos(a), y: WB.CY + CH_R * Math.sin(a), a };
});

/* Integration positions — 12 nodes on outer ring, offset 15° from channels */
const intNodes = integrations.map((int, i) => {
  const a = (Math.PI * 2 * i) / 12 - Math.PI / 2 + Math.PI / 12;
  return { ...int, x: WB.CX + INT_R * Math.cos(a), y: WB.CY + INT_R * Math.sin(a), a };
});

/* Concentric ring SVG paths (slightly wobbly for organic spider-web feel) */
const ringPaths = RING_RADII.map((baseR, ri) =>
  Array.from({ length: STRANDS + 1 }, (_, i) => {
    const a = strandAngles[i % STRANDS];
    const wobble = Math.sin(a * 3 + ri * 1.7) * (baseR * 0.03);
    const r = baseR + wobble;
    return `${i === 0 ? "M" : "L"} ${(WB.CX + r * Math.cos(a)).toFixed(1)} ${(WB.CY + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ") + " Z"
);

/* Knot coordinates at ring × strand intersections */
const knots = RING_RADII.flatMap((baseR, ri) =>
  strandAngles.map(a => {
    const wobble = Math.sin(a * 3 + ri * 1.7) * (baseR * 0.03);
    const r = baseR + wobble;
    return { x: +(WB.CX + r * Math.cos(a)).toFixed(1), y: +(WB.CY + r * Math.sin(a)).toFixed(1) };
  })
);

/* ═══════════════════════════════════════════════════════════ */

const CURL_TEXT = `curl -X POST https://api.withmia.com/v1/messages \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "whatsapp",
    "to": "+56912345678",
    "text": "Tu cita fue confirmada ✅"
  }'`;

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export const Integrations = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCh, setHoveredCh] = useState<number | null>(null);
  const [hoveredInt, setHoveredInt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setIsVisible(true); },
      { threshold: 0.05 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CURL_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for insecure contexts
      setCopied(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="py-12 md:py-16 px-4 relative overflow-hidden"
      id="integraciones"
    >
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-violet-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">

        {/* ─── Header ─── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-amber-500/20 border border-violet-500/30 text-xs text-violet-300 font-semibold mb-5 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Ecosistema completo
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-[1.15] mb-4">
            Todas tus herramientas,{" "}
            <br className="hidden sm:block" />
            <span className="text-gradient">una sola plataforma</span>
          </h2>
          <p className="text-sm md:text-[15px] text-white/40 max-w-lg mx-auto leading-relaxed">
            Canales de mensajería, agendas, CRMs e integraciones custom
            <br className="hidden sm:block" />
            orquestadas por IA en tiempo real.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════
           NETWORK
           ═══════════════════════════════════════════════════ */}
        <div className="relative mb-10">

            {/* Desktop spider web */}
            <div
              className={`hidden md:block relative w-full transition-opacity duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}
              style={{ aspectRatio: "3 / 2" }}
            >
              {/* ── SVG Web Layer ── */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${WB.W} ${WB.H}`}
                fill="none"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* ── Rich gradient definitions ── */}
                <defs>
                  <radialGradient id="webCenterGlow" cx="50%" cy="50%" r="42%">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.06" />
                    <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.02" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="60%" stopColor="transparent" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.015" />
                  </radialGradient>
                  {/* Per-channel gradients for connections */}
                  {chNodes.map((ch, i) => (
                    <linearGradient key={`chGrad${i}`} id={`chGrad${i}`}
                      x1={WB.CX} y1={WB.CY} x2={ch.x} y2={ch.y}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
                      <stop offset="100%" stopColor={ch.color} stopOpacity="0.5" />
                    </linearGradient>
                  ))}
                  {/* Glow filter — very lightweight */}
                  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Background layers */}
                <circle cx={WB.CX} cy={WB.CY} r="195" fill="url(#webCenterGlow)" />
                <circle cx={WB.CX} cy={WB.CY} r="195" fill="url(#outerGlow)" />

                {/* Concentric zone rings with subtle color tinting */}
                {ringPaths.map((d, i) => {
                  const ringColors = ['#a78bfa', '#818cf8', '#6366f1', '#c084fc', '#f59e0b'];
                  return (
                    <path
                      key={`ring${i}`}
                      d={d}
                      stroke={ringColors[i]}
                      strokeWidth={i === RING_RADII.length - 1 ? 0.6 : 0.35}
                      strokeOpacity={0.04 + i * 0.012}
                      fill="none"
                      style={i % 2 === 0 ? {
                        animation: `ringPulse ${6 + i * 2}s ease-in-out infinite`,
                        animationDelay: `${i * 0.8}s`,
                      } : undefined}
                    />
                  );
                })}

                {/* Radial strands with gradient fade */}
                {strandAngles.map((a, i) => {
                  const innerR = 15;
                  const outerR = RING_RADII[RING_RADII.length - 1] + 15;
                  return (
                    <line
                      key={`strand${i}`}
                      x1={WB.CX + innerR * Math.cos(a)}
                      y1={WB.CY + innerR * Math.sin(a)}
                      x2={WB.CX + outerR * Math.cos(a)}
                      y2={WB.CY + outerR * Math.sin(a)}
                      stroke="white"
                      strokeWidth={i % 4 === 0 ? 0.35 : 0.2}
                      strokeOpacity={i % 4 === 0 ? 0.06 : 0.03}
                    />
                  );
                })}

                {/* Knots at intersections — every 3rd one pulses */}
                {knots.map((k, i) => (
                  <circle
                    key={`k${i}`}
                    cx={k.x}
                    cy={k.y}
                    r={i % 7 === 0 ? 1.2 : 0.7}
                    fill="white"
                    fillOpacity={i % 7 === 0 ? 0.1 : 0.04}
                    style={i % 7 === 0 ? {
                      animation: `networkPulse ${3 + (i % 4)}s ease-in-out infinite`,
                      animationDelay: `${(i * 0.3) % 5}s`,
                    } : undefined}
                  />
                ))}

                {/* Center pulsing beacon */}
                <circle cx={WB.CX} cy={WB.CY} r="8" fill="#a78bfa" fillOpacity="0.06"
                  style={{ animation: 'centerPulse 3s ease-in-out infinite' }} />
                <circle cx={WB.CX} cy={WB.CY} r="8" fill="#a78bfa" fillOpacity="0.04"
                  style={{ animation: 'centerPulse 3s ease-in-out infinite 1.5s' }} />

                {/* Center → Channel connections — gradient strokes */}
                {chNodes.map((ch, i) => (
                  <g key={`cc${i}`}>
                    {/* Shadow / glow line */}
                    <line
                      x1={WB.CX}
                      y1={WB.CY}
                      x2={ch.x}
                      y2={ch.y}
                      stroke={ch.color}
                      strokeWidth={hoveredCh === i ? 2.5 : 1.2}
                      strokeOpacity={hoveredCh === i ? 0.08 : 0.03}
                      className="transition-all duration-300"
                    />
                    {/* Main dashed line */}
                    <line
                      x1={WB.CX}
                      y1={WB.CY}
                      x2={ch.x}
                      y2={ch.y}
                      stroke={`url(#chGrad${i})`}
                      strokeWidth={hoveredCh === i ? 1.2 : 0.7}
                      strokeOpacity={hoveredCh === i ? 0.6 : 0.2}
                      strokeDasharray="3 4"
                      className="transition-all duration-300"
                      style={{
                        animation: "hubDashFlow 3.5s linear infinite",
                        animationDelay: `${i * 0.5}s`,
                      }}
                    />
                  </g>
                ))}

                {/* Integration → nearest channel connections */}
                {intNodes.map((node, i) => {
                  let minD = Infinity,
                    nearest = chNodes[0];
                  chNodes.forEach((ch) => {
                    const d = Math.hypot(ch.x - node.x, ch.y - node.y);
                    if (d < minD) {
                      minD = d;
                      nearest = ch;
                    }
                  });
                  const mx = ((node.x + nearest.x) / 2) * 0.88 + WB.CX * 0.12;
                  const my = ((node.y + nearest.y) / 2) * 0.88 + WB.CY * 0.12;
                  return (
                    <path
                      key={`ic${i}`}
                      d={`M ${node.x.toFixed(1)} ${node.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${nearest.x.toFixed(1)} ${nearest.y.toFixed(1)}`}
                      stroke={node.color}
                      strokeWidth={hoveredInt === i ? 0.8 : 0.45}
                      strokeOpacity={hoveredInt === i ? 0.4 : 0.1}
                      fill="none"
                      strokeDasharray="2 4"
                      className="transition-all duration-300"
                      style={{
                        animation: "hubDashFlow 5s linear infinite",
                        animationDelay: `${i * 0.35}s`,
                      }}
                    />
                  );
                })}

                {/* Channel glow dots (with soft glow filter) */}
                {chNodes.map((ch, i) => (
                  <g key={`cd${i}`} filter={hoveredCh === i ? 'url(#softGlow)' : undefined}>
                    <circle
                      cx={ch.x}
                      cy={ch.y}
                      r={hoveredCh === i ? 4 : 2}
                      fill={ch.color}
                      fillOpacity={hoveredCh === i ? 0.25 : 0.08}
                      className="transition-all duration-300"
                    />
                  </g>
                ))}

                {/* ─── Animated data-flow particles ─── */}
                {chNodes.map((ch, i) => {
                  const pathD = `M ${WB.CX} ${WB.CY} L ${ch.x} ${ch.y}`;
                  const pathId = `flow${i}`;
                  return (
                    <g key={`particle${i}`}>
                      <path id={pathId} d={pathD} fill="none" stroke="none" />
                      <circle r="1.5" fill={ch.color} fillOpacity="0.6">
                        <animateMotion
                          dur={`${2.5 + i * 0.3}s`}
                          repeatCount="indefinite"
                          begin={`${i * 0.8}s`}
                        >
                          <mpath href={`#${pathId}`} />
                        </animateMotion>
                        <animate
                          attributeName="fillOpacity"
                          values="0;0.6;0.6;0"
                          dur={`${2.5 + i * 0.3}s`}
                          repeatCount="indefinite"
                          begin={`${i * 0.8}s`}
                        />
                        <animate
                          attributeName="r"
                          values="0.5;1.5;1.5;0.5"
                          dur={`${2.5 + i * 0.3}s`}
                          repeatCount="indefinite"
                          begin={`${i * 0.8}s`}
                        />
                      </circle>
                    </g>
                  );
                })}
              </svg>

              {/* ── Center node (MIA) ── */}
              <div
                className="absolute z-20"
                style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
              >
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-500/[0.06] to-amber-500/[0.04] animate-pulse" style={{ animationDuration: '4s' }} />
                  <div className="relative w-[60px] h-[60px] lg:w-[68px] lg:h-[68px] rounded-2xl bg-gradient-to-br from-violet-500/20 via-[#0a0a12] to-amber-500/15 border border-white/[0.15] flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.1),0_0_100px_rgba(139,92,246,0.04)]">
                    <video
                      src="/logo-animated.webm"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-[40px] h-[40px] lg:w-[46px] lg:h-[46px] object-contain pointer-events-none"
                    />
                  </div>
                  <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-[3px] rounded-full bg-emerald-400/[0.08] border border-emerald-400/20 shadow-[0_0_20px_rgba(52,211,153,0.08)]">
                    <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[7px] font-mono text-emerald-400/90 font-bold tracking-wider">
                      LIVE
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Channel nodes ── */}
              {chNodes.map((ch, i) => (
                <div
                  key={`cn${i}`}
                  className="absolute z-10 group cursor-default"
                  style={{
                    left: `${(ch.x / WB.W) * 100}%`,
                    top: `${(ch.y / WB.H) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseEnter={() => setHoveredCh(i)}
                  onMouseLeave={() => setHoveredCh(null)}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      {/* Hover glow ring */}
                      <div
                        className="absolute -inset-1.5 rounded-xl transition-opacity duration-300"
                        style={{
                          background: `radial-gradient(circle, ${ch.color}15, transparent 70%)`,
                          opacity: hoveredCh === i ? 1 : 0,
                        }}
                      />
                      <div
                        className="relative w-[44px] h-[44px] lg:w-[50px] lg:h-[50px] rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: hoveredCh === i ? `${ch.color}1a` : `${ch.color}0c`,
                          border: `1px solid ${hoveredCh === i ? `${ch.color}50` : `${ch.color}15`}`,
                          boxShadow: hoveredCh === i
                            ? `0 0 25px ${ch.color}15, 0 0 50px ${ch.color}08`
                            : `0 0 10px ${ch.color}05`,
                        }}
                      >
                        <img
                          src={ch.image}
                          alt={ch.name}
                          loading="lazy"
                          className="w-[19px] h-[19px] lg:w-[22px] lg:h-[22px] object-contain"
                          style={ch.invert ? { filter: "brightness(0) invert(1)" } : undefined}
                        />
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold tracking-wide transition-all duration-200 ${hoveredCh === i ? "text-white/80" : "text-white/35"}`}>
                      {ch.name}
                    </span>
                  </div>
                </div>
              ))}

              {/* ── Integration nodes ── */}
              {intNodes.map((node, i) => {
                const Icon = node.icon;
                const cosA = Math.cos(node.a);
                const isLeft = cosA < -0.2;
                return (
                  <div
                    key={`in${i}`}
                    className={`absolute z-10 group cursor-default transition-all duration-500 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
                    style={{
                      left: `${(node.x / WB.W) * 100}%`,
                      top: `${(node.y / WB.H) * 100}%`,
                      transform: "translate(-50%, -50%)",
                      transitionDelay: `${150 + i * 60}ms`,
                    }}
                    onMouseEnter={() => setHoveredInt(i)}
                    onMouseLeave={() => setHoveredInt(null)}
                  >
                    <div
                      className={`flex items-center gap-2 ${isLeft ? "flex-row-reverse" : ""}`}
                    >
                      <div className="relative">
                        {/* Hover glow */}
                        <div
                          className="absolute -inset-1 rounded-lg transition-opacity duration-300"
                          style={{
                            background: `radial-gradient(circle, ${node.color}12, transparent 70%)`,
                            opacity: hoveredInt === i ? 1 : 0,
                          }}
                        />
                        <div
                          className="relative w-[34px] h-[34px] lg:w-[38px] lg:h-[38px] rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                          style={{
                            backgroundColor: hoveredInt === i ? `${node.color}14` : `${node.color}0a`,
                            border: `1px solid ${hoveredInt === i ? `${node.color}40` : `${node.color}12`}`,
                            boxShadow: hoveredInt === i
                              ? `0 0 20px ${node.color}10, 0 0 40px ${node.color}05`
                              : `0 0 8px ${node.color}03`,
                          }}
                        >
                          <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" style={{ color: node.color }} />
                        </div>
                      </div>
                      <div className={`min-w-0 ${isLeft ? "text-right" : ""}`}>
                        <p className="text-[10px] font-bold text-white/45 group-hover:text-white/90 whitespace-nowrap transition-colors leading-tight">
                          {node.name}
                        </p>
                        <p className="text-[8px] text-white/15 group-hover:text-white/40 whitespace-nowrap transition-colors">
                          {node.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Mobile — grouped cards ── */}
            <div className="md:hidden py-6 px-4 space-y-4">
              <div className="flex justify-center gap-2 mb-3">
                {channels.map((ch, i) => (
                  <div
                    key={i}
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: `${ch.color}0c`,
                      border: `1px solid ${ch.color}15`,
                    }}
                  >
                    <img
                      src={ch.image}
                      alt={ch.name}
                      loading="lazy"
                      className="w-4.5 h-4.5 object-contain"
                      style={ch.invert ? { filter: "brightness(0) invert(1)" } : undefined}
                    />
                  </div>
                ))}
              </div>
              {[...leftGroup, ...rightGroup].map((group) => (
                <div
                  key={group.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-0.5 h-3 rounded-full"
                        style={{
                          background: `linear-gradient(to bottom, ${group.accent}80, transparent)`,
                        }}
                      />
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">
                        {group.label}
                      </span>
                    </div>
                    <span className="text-[7px] font-mono text-emerald-400/50">
                      {group.items.length} activos
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg border border-white/[0.03] bg-white/[0.01]"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${item.color}0c`,
                              border: `1px solid ${item.color}12`,
                            }}
                          >
                            <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-white/70 truncate">
                              {item.name}
                            </p>
                            <p className="text-[8px] text-white/20 truncate">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
        </div>

        {/* ─── Developer API ─── */}
        <div className="mt-16 mb-4">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/20 text-xs text-amber-300 font-semibold mb-5 backdrop-blur-sm">
              <Terminal className="w-3.5 h-3.5" />
              Developer Experience
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-[1.15] mb-4">
              API que los developers{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">aman usar</span>
            </h2>
            <p className="text-sm md:text-[15px] text-white/40 max-w-lg mx-auto leading-relaxed">
              RESTful, predecible y documentada. Integra WITHMIA en tu stack
              en minutos, no en semanas.
            </p>
          </div>

          {/* API Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "REST API", sub: "Endpoints intuitivos", icon: "⚡", accent: "amber" },
              { label: "Webhooks", sub: "Eventos en tiempo real", icon: "🔄", accent: "cyan" },
              { label: "SDKs", sub: "Node.js · Python · PHP", icon: "📦", accent: "violet" },
              { label: "OAuth 2.0", sub: "Enterprise-grade auth", icon: "🔐", accent: "emerald" },
            ].map((feat) => (
              <div key={feat.label} className={`p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-${feat.accent}-500/20 transition-all duration-300 group`}>
                <span className="text-lg mb-2 block">{feat.icon}</span>
                <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors">{feat.label}</p>
                <p className="text-[11px] text-white/25 mt-0.5">{feat.sub}</p>
              </div>
            ))}
          </div>

          {/* Terminal Card */}
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative bg-[#08080e]">
            {/* Top gradient line */}
            <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

            {/* Status bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-white/[0.015]">
              <div className="flex items-center gap-3">
                <div className="flex gap-[6px]">
                  <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]/80" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]/80" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]/80" />
                </div>
                <div className="h-4 w-px bg-white/[0.06]" />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <div className="w-2 h-2 rounded-full bg-emerald-400/70 animate-pulse" />
                    <span className="text-[11px] font-mono text-white/40">api.withmia.com</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/20">/v1</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] font-mono text-emerald-400/60 px-2 py-0.5 rounded-md bg-emerald-400/[0.06] border border-emerald-400/10 uppercase tracking-wider font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
                <span className="text-[9px] font-mono text-amber-400/50 px-2 py-0.5 rounded-md bg-amber-400/[0.04] border border-amber-400/10 uppercase tracking-wider font-bold">
                  TLS 1.3
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-white/30 hover:text-white/60"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] font-mono text-emerald-400 font-medium">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono font-medium">Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2">
              {/* Left — Request */}
              <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-white/[0.04]">
                {/* Method + Endpoint */}
                <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-white/[0.04]">
                  <span className="px-2.5 py-1 rounded-md bg-amber-400/[0.1] border border-amber-400/20 text-[10px] font-mono text-amber-400 font-bold tracking-wider">POST</span>
                  <span className="text-[12px] font-mono text-white/40">/v1/messages</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
                    <span className="text-[9px] font-mono text-white/20 uppercase tracking-wider">live</span>
                  </div>
                </div>

                {/* Code block */}
                <div className="rounded-lg bg-black/30 border border-white/[0.04] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
                    <span className="text-[9px] font-mono text-white/20 uppercase tracking-wider">Request</span>
                    <span className="text-[9px] font-mono text-amber-400/40">cURL</span>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-[11px] md:text-[12px] text-white/55 leading-[1.85] font-mono">
                      <code>
                        <span className="text-emerald-400/90 font-medium">curl</span>{" "}
                        <span className="text-amber-400/70">-X POST</span>{" "}
                        <span className="text-white/40">/v1/messages</span>
                        {" \\\n"}
                        <span className="text-amber-400/60">{"  "}-H</span>{" "}
                        <span className="text-cyan-400/70">{`"Authorization: Bearer sk_live_..."`}</span>
                        {" \\\n"}
                        <span className="text-amber-400/60">{"  "}-H</span>{" "}
                        <span className="text-cyan-400/70">{`"Content-Type: application/json"`}</span>
                        {" \\\n"}
                        <span className="text-amber-400/60">{"  "}-d</span>{" "}
                        <span className="text-cyan-400/50">{"'{"}</span>
                        {"\n"}
                        <span className="text-violet-400/80">
                          {"    "}
                          {`"channel"`}
                        </span>
                        <span className="text-white/20">:</span>{" "}
                        <span className="text-cyan-400/70">{`"whatsapp"`}</span>
                        <span className="text-white/20">,</span>
                        {"\n"}
                        <span className="text-violet-400/80">
                          {"    "}
                          {`"to"`}
                        </span>
                        <span className="text-white/20">:</span>{" "}
                        <span className="text-cyan-400/70">{`"+56912345678"`}</span>
                        <span className="text-white/20">,</span>
                        {"\n"}
                        <span className="text-violet-400/80">
                          {"    "}
                          {`"text"`}
                        </span>
                        <span className="text-white/20">:</span>{" "}
                        <span className="text-cyan-400/70">{`"Tu cita fue confirmada ✅"`}</span>
                        {"\n"}
                        <span className="text-cyan-400/50">{"  }"}&apos;</span>
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Right — Response */}
              <div className="p-5 md:p-6">
                {/* Response status */}
                <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/[0.04]">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-400/[0.1] border border-emerald-400/15">
                    <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">200 OK</span>
                  </div>
                  <div className="h-3.5 w-px bg-white/[0.06]" />
                  <span className="text-[10px] font-mono text-amber-400/50">48ms</span>
                  <div className="h-3.5 w-px bg-white/[0.06]" />
                  <span className="text-[10px] font-mono text-white/20">application/json</span>
                  <div className="ml-auto hidden sm:flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-400/40" />
                    <span className="text-[8px] font-mono text-white/15 uppercase tracking-wider font-medium">
                      encrypted
                    </span>
                  </div>
                </div>

                {/* JSON Response */}
                <div className="rounded-lg bg-black/30 border border-white/[0.04] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
                    <span className="text-[9px] font-mono text-white/20 uppercase tracking-wider">Response</span>
                    <span className="text-[9px] font-mono text-emerald-400/40">JSON</span>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-[11px] md:text-[12px] leading-[1.85] font-mono">
                      <code>
                        <span className="text-white/15">{"{"}</span>
                        {"\n"}
                        <span className="text-violet-400/60">
                          {"  "}
                          {`"id"`}
                        </span>
                        <span className="text-white/15">:</span>{" "}
                        <span className="text-cyan-400/55">{`"msg_7f3kQ9x..."`}</span>
                        <span className="text-white/15">,</span>
                        {"\n"}
                        <span className="text-violet-400/60">
                          {"  "}
                          {`"status"`}
                        </span>
                        <span className="text-white/15">:</span>{" "}
                        <span className="text-emerald-400/60">{`"delivered"`}</span>
                        <span className="text-white/15">,</span>
                        {"\n"}
                        <span className="text-violet-400/60">
                          {"  "}
                          {`"channel"`}
                        </span>
                        <span className="text-white/15">:</span>{" "}
                        <span className="text-cyan-400/55">{`"whatsapp"`}</span>
                        <span className="text-white/15">,</span>
                        {"\n"}
                        <span className="text-violet-400/60">
                          {"  "}
                          {`"timestamp"`}
                        </span>
                        <span className="text-white/15">:</span>{" "}
                        <span className="text-cyan-400/55">{`"2026-02-22T12:00:00Z"`}</span>
                        {"\n"}
                        <span className="text-white/15">{"}"}</span>
                      </code>
                    </pre>
                  </div>
                </div>

                {/* Extra stats below response */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: "Latencia", value: "<200ms", color: "text-emerald-400/60" },
                    { label: "Rate limit", value: "1000/min", color: "text-amber-400/60" },
                    { label: "Uptime", value: "99.9%", color: "text-cyan-400/60" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center px-2 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <p className={`text-[12px] font-mono font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[8px] font-mono text-white/20 uppercase tracking-wider mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom CTA bar */}
            <div className="border-t border-white/[0.05] px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/[0.015]">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <p className="text-[13px] text-white/50">
                  Documentación completa, sandbox de pruebas y API keys en segundos.
                </p>
              </div>
              <a
                href="https://app.withmia.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCTAClick("ver_documentacion_api", "integrations")}
                className="inline-flex items-center gap-2 text-[12px] font-semibold text-amber-400 hover:text-amber-300 transition-all group px-5 py-2.5 rounded-xl bg-amber-400/[0.06] border border-amber-400/15 hover:bg-amber-400/[0.12] hover:border-amber-400/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] shrink-0"
              >
                Ver documentación
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
