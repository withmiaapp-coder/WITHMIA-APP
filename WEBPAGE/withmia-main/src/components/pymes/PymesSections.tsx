import { useEffect, useState, useRef, type ReactNode } from "react";
import { trackCTAClick } from "@/lib/analytics";
import { Reveal } from "@/hooks/useAnimations";
import {
  Activity,
  XCircle,
  Clock,
  DollarSign,
  Zap,
  Brain,
  Globe,
  MessageSquare,
  BarChart3,
  Timer,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Star,
  Users,
  AlertTriangle,
  Shield,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Search,
  Layers,
  Award,
  Monitor,
  Smartphone,
  RefreshCw,
  ThumbsDown,
  Gauge,
  Mic,
  Mail,
  Instagram,
  FileSpreadsheet,
  StickyNote,
  Notebook,
  Headphones,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   1. NUMBER DRAMA — Kinetic before/after stats
   ═══════════════════════════════════════════════════════ */
const numberRows = [
  { label: "Tiempo de respuesta", before: "6 horas", after: "5 segundos", color: "#22d3ee" },
  { label: "Tasa de respuesta", before: "34%", after: "99%", color: "#a78bfa" },
  { label: "Costo por agente adicional", before: "$800.000/mes", after: "$0", color: "#f59e0b" },
  { label: "Clientes atendidos simultáneamente", before: "1", after: "Ilimitados", color: "#34d399" },
  { label: "Disponibilidad", before: "Lun-Vie 9-18h", after: "24/7/365", color: "#f43f5e" },
];

export const NumberDrama = () => (
  <section className="py-20 relative overflow-hidden">
    <div className="max-w-5xl mx-auto px-6">
      <Reveal>
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/[0.08] border border-cyan-500/15 mb-6">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400/90 uppercase tracking-widest">El contraste</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
            Los números no mienten
          </h2>
          <p className="text-white/35 max-w-xl mx-auto text-sm">
            Cada fila es un antes y después real de PYMEs que adoptaron WITHMIA.
          </p>
        </div>
      </Reveal>

      <div className="space-y-4">
        {numberRows.map((row, i) => (
          <Reveal key={i} delay={i * 100}>
            <div className="group relative rounded-2xl border border-white/[0.05] bg-white/[0.015] p-5 sm:p-6 hover:border-white/[0.12] transition-all duration-500 overflow-hidden">
              {/* Glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(600px circle at 50% 50%, ${row.color}06, transparent 70%)` }}
              />

              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25 mb-3 relative">{row.label}</p>
              <div className="flex items-center gap-4 sm:gap-6 relative">
                {/* Before */}
                <div className="flex-1 text-right">
                  <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-white/20 line-through decoration-red-500/40 decoration-2">
                    {row.before}
                  </span>
                </div>

                {/* Arrow */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                  style={{ borderColor: `${row.color}30`, backgroundColor: `${row.color}10` }}
                >
                  <ArrowRight className="w-5 h-5" style={{ color: row.color }} />
                </div>

                {/* After */}
                <div className="flex-1">
                  <span
                    className="text-2xl sm:text-4xl lg:text-5xl font-black"
                    style={{ color: row.color }}
                  >
                    {row.after}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);


/* ═══════════════════════════════════════════════════════
   2. HEATMAP 24/7 — Message coverage visualization
   ═══════════════════════════════════════════════════════ */
const heatData = [
  [0,0,0,0,0,1,2,5,8,9,7,6,4,5,7,8,9,7,5,3,2,2,1,0],
  [0,0,0,0,0,1,3,6,9,8,7,5,4,6,7,9,8,6,4,3,2,1,1,0],
  [0,0,0,0,1,1,3,5,7,8,6,5,4,5,8,9,8,7,5,3,2,1,0,0],
  [0,0,0,0,0,1,2,6,8,9,7,6,5,5,7,8,8,6,4,3,2,1,1,0],
  [0,0,0,0,0,1,2,5,7,8,7,5,4,4,6,7,6,5,4,4,3,3,2,1],
  [0,0,0,1,1,1,2,3,4,5,6,7,7,6,5,5,4,4,5,5,4,3,2,1],
  [0,0,0,1,1,1,1,2,3,4,5,6,5,4,4,3,3,4,5,6,5,4,3,1],
];
const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const isTeamOnline = (d: number, h: number) => d < 5 && h >= 9 && h < 18;

export const Heatmap247 = () => {
  const total = heatData.flat().reduce((a, b) => a + b, 0);
  const uncovered = heatData.reduce(
    (s, row, d) => s + row.reduce((rs, v, h) => rs + (isTeamOnline(d, h) ? 0 : v), 0),
    0
  );
  const pct = Math.round((uncovered / total) * 100);

  const cellColor = (val: number, d: number, h: number) => {
    if (val === 0) return "bg-white/[0.02]";
    const covered = isTeamOnline(d, h);
    const intensity = Math.min(val, 9);
    if (covered) {
      const g = [
        "", "bg-emerald-500/10", "bg-emerald-500/15", "bg-emerald-500/20",
        "bg-emerald-500/25", "bg-emerald-500/30", "bg-emerald-500/40",
        "bg-emerald-500/50", "bg-emerald-500/60", "bg-emerald-500/70",
      ];
      return g[intensity];
    }
    const r = [
      "", "bg-red-500/10", "bg-red-500/15", "bg-red-500/20",
      "bg-red-500/25", "bg-red-500/30", "bg-red-500/40",
      "bg-red-500/50", "bg-red-500/60", "bg-red-500/70",
    ];
    return r[intensity];
  };

  return (
    <section className="pt-10 pb-6 relative">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/15 mb-6">
              <Clock className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-violet-400/90 uppercase tracking-widest">Cobertura 24/7</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
              Tus clientes escriben{" "}
              <span className="text-gradient">cuando nadie contesta</span>
            </h2>
            <p className="text-white/35 max-w-xl mx-auto text-sm">
              <span className="text-emerald-400">Verde</span> = tu equipo cubre.{" "}
              <span className="text-red-400">Rojo</span> = mensajes sin respuesta.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="max-w-3xl mx-auto overflow-hidden pb-4">
            {/* Hour labels */}
            <div className="grid min-w-[600px]" style={{ gridTemplateColumns: "44px repeat(24, 1fr)", gap: "2px" }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-center">
                  <span className="text-[8px] text-white/20 font-mono">{String(h).padStart(2, "0")}</span>
                </div>
              ))}
            </div>

            {/* Data rows */}
            {dayLabels.map((day, d) => (
              <div
                key={d}
                className="grid min-w-[600px]"
                style={{ gridTemplateColumns: "44px repeat(24, 1fr)", gap: "2px" }}
              >
                <div className="flex items-center">
                  <span className="text-[10px] text-white/30 font-medium">{day}</span>
                </div>
                {heatData[d].map((val, h) => (
                  <div
                    key={h}
                    className={`aspect-square rounded-[3px] ${cellColor(val, d, h)} transition-colors duration-200 hover:brightness-150 hover:z-10 cursor-crosshair relative hover:ring-1 hover:ring-white/30`}
                    title={`${day} ${String(h).padStart(2, "0")}:00  ${val > 0 ? val + " msgs" : "sin actividad"} ${isTeamOnline(d, h) ? "\u2713 Cubierto" : "\u2717 Sin atender"}`}
                  />
                ))}
              </div>
            ))}

            {/* Legend + stat */}
            <div className="flex items-center justify-between mt-6 min-w-[600px]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500/40" />
                  <span className="text-[10px] text-white/30">Cubierto por equipo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500/40" />
                  <span className="text-[10px] text-white/30">Sin cobertura</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-red-400">{pct}%</p>
                <p className="text-[10px] text-white/25">de mensajes caen en zona muerta</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* WITHMIA covers all */}
        <Reveal delay={200}>
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/[0.06] border border-emerald-500/15">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400/80 font-medium">
                Con WITHMIA, <span className="text-emerald-300 font-bold">cada celda es verde</span>
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};


/* ═══════════════════════════════════════════════════════
   3. LIVE REVENUE TICKER — Real-time loss simulation
   ═══════════════════════════════════════════════════════ */
const tickerNames = ["María G.", "Carlos R.", "Ana P.", "Pedro M.", "Sofía L.", "Diego F.", "Valentina S.", "Tomás H."];
const tickerBiz = ["Clínica dental", "Gimnasio", "Restaurant", "Inmobiliaria", "Tienda online", "Centro educativo", "Peluquería", "Taller mecánico"];

interface LostLead {
  id: number;
  name: string;
  value: number;
  biz: string;
}

export const LiveRevenueTicker = () => {
  const [totalLost, setTotalLost] = useState(0);
  const [leads, setLeads] = useState<LostLead[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setIsVisible(true); }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      const value = (Math.floor(Math.random() * 150) + 25) * 1000;
      setTotalLost((p) => p + value);
      setLeads((p) => [
        ...p.slice(-5),
        {
          id: Date.now(),
          name: tickerNames[Math.floor(Math.random() * tickerNames.length)],
          value,
          biz: tickerBiz[Math.floor(Math.random() * tickerBiz.length)],
        },
      ]);
    }, 2400);
    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="py-20 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/[0.08] border border-red-500/15 mb-6">
              <Activity className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-xs font-semibold text-red-400/90 uppercase tracking-widest">Simulación en vivo</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
              Mientras lees esto,{" "}
              <span className="text-red-400">alguien pierde clientes</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="max-w-3xl mx-auto">
            {/* Big counter */}
            <div className="text-center mb-8">
              <div className="inline-flex flex-col items-center p-6 sm:p-8 rounded-2xl bg-red-500/[0.04] border border-red-500/10">
                <span className="text-[10px] text-red-400/50 font-semibold uppercase tracking-widest mb-3">Ingresos perdidos desde que llegaste</span>
                <span className="text-5xl sm:text-6xl lg:text-7xl font-black text-red-400 font-mono tabular-nums">
                  ${totalLost.toLocaleString("es-CL")}
                </span>
                <span className="text-[10px] text-white/15 mt-2">CLP estimado por segundo sin responder</span>
              </div>
            </div>

            {/* Scrolling feed */}
            <div className="space-y-2 max-h-[260px] overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#0a0a12] to-transparent z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0a0a12] to-transparent z-10 pointer-events-none" />
              {leads.map((lead, i) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                  style={{
                    opacity: 1 - i * 0.1,
                    animation: "fadeSlideUp .5s ease-out",
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/50 truncate">
                      <span className="text-white/70 font-medium">{lead.name}</span>{" "}
                      abandonó  {lead.biz}
                    </p>
                    <p className="text-[10px] text-white/20">Sin respuesta por +15 min</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-red-400/70 shrink-0">
                    -${(lead.value / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
              {leads.length === 0 && (
                <div className="text-center py-10 text-white/15 text-sm">Esperando datos</div>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};


/* ═══════════════════════════════════════════════════════
   4. DOMINO EFFECT — Chain reaction cascade
   ═══════════════════════════════════════════════════════ */
const dominoNeg = [
  { icon: MessageSquare, text: "Un mensaje sin responder", sub: "El cliente esperaba una cotización" },
  { icon: ThumbsDown, text: "Reseña negativa", sub: "\"Nunca me contestaron\" — Google Reviews" },
  { icon: TrendingDown, text: "Menos leads llegan", sub: "Tu reputación online baja" },
  { icon: DollarSign, text: "Ingresos caen", sub: "30% menos facturación en 3 meses" },
  { icon: Users, text: "Recortes de personal", sub: "No hay presupuesto para el equipo" },
];
const dominoPos = [
  { icon: Zap, text: "Respuesta instantánea", sub: "WITHMIA contesta en 5 segundos" },
  { icon: Star, text: "Cliente satisfecho", sub: "\"¡Qué rápidos!\" — 5 estrellas" },
  { icon: Users, text: "Más referidos", sub: "El boca a boca crece" },
  { icon: TrendingUp, text: "Ingresos suben", sub: "+45% en el primer trimestre" },
  { icon: Sparkles, text: "Crecimiento sostenido", sub: "Escalas sin sumar costos" },
];

export const DominoEffect = () => (
  <section className="py-20 relative overflow-hidden">
    <div className="max-w-6xl mx-auto px-6">
      <Reveal>
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/[0.08] border border-amber-500/15 mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-widest">Efecto dominó</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
            Un mensaje sin responder{" "}
            <span className="text-red-400">desata una cadena</span>
          </h2>
          <p className="text-white/35 max-w-xl mx-auto text-sm">
            Todo comienza con un solo cliente ignorado. Mira cómo termina.
          </p>
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Negative cascade */}
        <div>
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400/60 mb-6 text-center lg:text-left">Sin WITHMIA</p>
          </Reveal>
          <div className="space-y-3">
            {dominoNeg.map((d, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="flex items-center gap-4 group">
                  {/* Connector */}
                  {i > 0 && (
                    <div className="absolute -mt-6 ml-5 w-px h-3 bg-gradient-to-b from-red-500/20 to-transparent" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-red-500/[0.08] border border-red-500/15 flex items-center justify-center shrink-0 group-hover:bg-red-500/15 transition-colors">
                    <d.icon className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] group-hover:border-red-500/15 transition-colors">
                    <p className="text-sm font-semibold text-white/70">{d.text}</p>
                    <p className="text-[11px] text-white/25">{d.sub}</p>
                  </div>
                  {i < dominoNeg.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-red-400/30 shrink-0 hidden sm:block rotate-90 lg:rotate-0" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Positive cascade */}
        <div>
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/60 mb-6 text-center lg:text-left">Con WITHMIA</p>
          </Reveal>
          <div className="space-y-3">
            {dominoPos.map((d, i) => (
              <Reveal key={i} delay={i * 120 + 200}>
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                    <d.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] group-hover:border-emerald-500/15 transition-colors">
                    <p className="text-sm font-semibold text-white/70">{d.text}</p>
                    <p className="text-[11px] text-white/25">{d.sub}</p>
                  </div>
                  {i < dominoPos.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-emerald-400/30 shrink-0 hidden sm:block rotate-90 lg:rotate-0" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);


/* ═══════════════════════════════════════════════════════
   5. EXCUSE WALL — Flippable sticky notes
   ═══════════════════════════════════════════════════════ */
const excuses = [
  {
    front: "\"No tenemos presupuesto\"",
    back: "Pierdes $2.4M/año en leads no contestados. WITHMIA cuesta menos que un almuerzo diario.",
    rotation: -2, color: "#fef08a",
  },
  {
    front: "\"Mis clientes prefieren el trato humano\"",
    back: "El 78% prefiere respuesta instantánea antes que esperar por un humano. WITHMIA escala a humano cuando se necesita.",
    rotation: 1.5, color: "#a5f3fc",
  },
  {
    front: "\"Ya tenemos WhatsApp\"",
    back: "WhatsApp personal no tiene métricas, no escala, y si alguien falta, el canal muere. WITHMIA es WhatsApp con superpoderes.",
    rotation: -1, color: "#c4b5fd",
  },
  {
    front: "\"Somos muy chicos para IA\"",
    back: "WITHMIA se diseñó PARA PYMEs. Setup en 10 min, sin código, sin departamento de IT.",
    rotation: 2, color: "#fca5a5",
  },
  {
    front: "\"La IA se equivoca mucho\"",
    back: "WITHMIA aprende TU negocio y escala a humano lo que no sabe. Precisión del 94% en el primer mes.",
    rotation: -1.5, color: "#86efac",
  },
  {
    front: "\"Después lo vemos\"",
    back: "Cada mes que esperas, tu competencia que ya automatizó te quita más clientes. El costo de no actuar crece.",
    rotation: 1, color: "#fdba74",
  },
];

const ExcuseCard = ({ excuse }: { excuse: typeof excuses[0] }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className="cursor-pointer"
      style={{ perspective: "800px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : `rotate(${excuse.rotation}deg)`,
          transition: "transform 0.6s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {/* Front */}
        <div
          className="rounded-xl p-5 sm:p-6 shadow-lg min-h-[140px] flex flex-col justify-between"
          style={{
            backfaceVisibility: "hidden",
            backgroundColor: excuse.color,
          }}
        >
          <p className="text-base sm:text-lg font-bold text-gray-800 leading-snug">{excuse.front}</p>
          <p className="text-[10px] text-gray-500 mt-3 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Toca para ver la realidad
          </p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl p-5 sm:p-6 bg-white/[0.04] border border-white/[0.1] backdrop-blur-md flex items-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p className="text-sm text-white/70 leading-relaxed">{excuse.back}</p>
        </div>
      </div>
    </div>
  );
};

export const ExcuseWall = () => (
  <section className="py-20 relative">
    <div className="max-w-6xl mx-auto px-6">
      <Reveal>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/[0.08] border border-amber-500/15 mb-6">
            <StickyNote className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-widest">Muro de excusas</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
            ¿Cuál es la tuya?
          </h2>
          <p className="text-white/35 max-w-xl mx-auto text-sm">
            Toca cada nota para ver lo que los datos dicen.
          </p>
        </div>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
        {excuses.map((e, i) => (
          <Reveal key={i} delay={i * 80}>
            <ExcuseCard excuse={e} />
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);


/* ═══════════════════════════════════════════════════════
   6. MESSY STACK — Tools chaos vs WITHMIA clean
   ═══════════════════════════════════════════════════════ */
const messyTools = [
  { label: "WhatsApp personal", icon: Smartphone, x: 10, y: 15, rot: -12, color: "#25D366" },
  { label: "Excel", icon: FileSpreadsheet, x: 55, y: 8, rot: 8, color: "#217346" },
  { label: "Libreta", icon: Notebook, x: 25, y: 55, rot: -5, color: "#f59e0b" },
  { label: "Instagram DMs", icon: Instagram, x: 60, y: 50, rot: 15, color: "#E4405F" },
  { label: "Email", icon: Mail, x: 5, y: 75, rot: -8, color: "#4285F4" },
  { label: "Notas adhesivas", icon: StickyNote, x: 70, y: 75, rot: 10, color: "#fef08a" },
];

const cleanFeatures = [
  { label: "Bandeja unificada", icon: MessageSquare },
  { label: "IA conversacional", icon: Brain },
  { label: "CRM integrado", icon: BarChart3 },
  { label: "Métricas en vivo", icon: Activity },
  { label: "Multi-canal", icon: Globe },
  { label: "Automatizaciones", icon: Zap },
];

export const MessyStack = () => (
  <section className="py-20 relative">
    <div className="max-w-6xl mx-auto px-6">
      <Reveal>
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/[0.08] border border-rose-500/15 mb-6">
            <Layers className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-semibold text-rose-400/90 uppercase tracking-widest">Tu stack actual</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
            De <span className="text-red-400">esto</span> a{" "}
            <span className="text-gradient">esto</span>
          </h2>
        </div>
      </Reveal>

      <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* LEFT: Messy */}
        <Reveal delay={100}>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400/50 mb-4 text-center">Antes</p>
            <div className="relative h-[320px] rounded-2xl border border-red-500/10 bg-red-500/[0.02] overflow-hidden">
              {messyTools.map((t, i) => (
                <div
                  key={i}
                  className="absolute flex items-center gap-2 px-3 py-2 rounded-lg border bg-white/[0.04] border-white/[0.08] shadow-lg hover:scale-110 transition-transform cursor-default"
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    transform: `rotate(${t.rot}deg)`,
                  }}
                >
                  <t.icon className="w-4 h-4" style={{ color: t.color }} />
                  <span className="text-[11px] text-white/50 font-medium whitespace-nowrap">{t.label}</span>
                </div>
              ))}
              {/* Floating frustration */}
              <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/15">
                <span className="text-xs text-red-400/70">\ud83e\udd2f 6 herramientas desconectadas</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* RIGHT: Clean WITHMIA */}
        <Reveal delay={200}>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/50 mb-4 text-center">Después</p>
            <div className="relative h-[320px] rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-6 flex flex-col justify-center">
              {/* Central WITHMIA logo/label */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/15 to-violet-500/15 border border-amber-500/20">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white/80">WITHMIA</span>
                </div>
              </div>

              {/* Clean feature grid */}
              <div className="grid grid-cols-3 gap-3">
                {cleanFeatures.map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/20 transition-colors"
                  >
                    <f.icon className="w-5 h-5 text-emerald-400/60" />
                    <span className="text-[10px] text-white/40 text-center leading-tight">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* Happy indicator */}
              <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15">
                <span className="text-xs text-emerald-400/70">\u2728 Todo en un solo lugar</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);


/* ═══════════════════════════════════════════════════════
   7. ROI CALCULATOR — Interactive savings simulator
   ═══════════════════════════════════════════════════════ */
export const ROICalculator = () => {
  const [msgs, setMsgs] = useState(50);
  const [ticket, setTicket] = useState(40);
  const [rate, setRate] = useState(35);

  // Calculations
  const ticketCLP = ticket * 1000;
  const currentMonthlyLeads = msgs * 30;
  const currentConversions = Math.round(currentMonthlyLeads * (rate / 100));
  const currentRevenue = currentConversions * ticketCLP;

  const withMiaRate = Math.min(rate + 45, 98);
  const withMiaConversions = Math.round(currentMonthlyLeads * (withMiaRate / 100));
  const withMiaRevenue = withMiaConversions * ticketCLP;
  const extraRevenue = withMiaRevenue - currentRevenue;
  const hoursSaved = Math.round(currentMonthlyLeads * 3 / 60); // 3 min per manual msg

  return (
    <section className="py-20 relative">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15 mb-6">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400/90 uppercase tracking-widest">Simulador de ahorro</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
              Calcula <span className="text-gradient">tu retorno</span>
            </h2>
            <p className="text-white/35 max-w-xl mx-auto text-sm">
              Mueve los controles y mira cuánto podrías ganar con WITHMIA.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-8">
            {/* Sliders */}
            <div className="space-y-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-white/50">Mensajes por día</label>
                  <span className="text-lg font-bold text-white/80 font-mono">{msgs}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={msgs}
                  onChange={(e) => setMsgs(+e.target.value)}
                  className="w-full h-2 rounded-full appearance-none bg-white/[0.06] accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/15 mt-1">
                  <span>5</span>
                  <span>500</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-white/50">Ticket promedio (CLP miles)</label>
                  <span className="text-lg font-bold text-white/80 font-mono">${ticket}k</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={ticket}
                  onChange={(e) => setTicket(+e.target.value)}
                  className="w-full h-2 rounded-full appearance-none bg-white/[0.06] accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/15 mt-1">
                  <span>$5k</span>
                  <span>$500k</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-white/50">Tasa de conversión actual</label>
                  <span className="text-lg font-bold text-white/80 font-mono">{rate}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={80}
                  step={1}
                  value={rate}
                  onChange={(e) => setRate(+e.target.value)}
                  className="w-full h-2 rounded-full appearance-none bg-white/[0.06] accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/15 mt-1">
                  <span>5%</span>
                  <span>80%</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.06] to-emerald-500/[0.02] border border-emerald-500/15">
                <p className="text-[10px] text-emerald-400/50 font-semibold uppercase tracking-widest mb-2">Ingresos adicionales / mes</p>
                <p className="text-4xl font-black text-emerald-400 font-mono">
                  +${extraRevenue.toLocaleString("es-CL")}
                </p>
                <p className="text-xs text-white/20 mt-1">CLP estimado con WITHMIA</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-1">Horas ahorradas</p>
                  <p className="text-2xl font-bold text-amber-400 font-mono">{hoursSaved}h</p>
                  <p className="text-[10px] text-white/15">por mes</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-1">Conversión</p>
                  <p className="text-2xl font-bold text-violet-400 font-mono">{rate}% \u2192 {withMiaRate}%</p>
                  <p className="text-[10px] text-white/15">mejora proyectada</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-white/50">
                    De <span className="text-white/70 font-bold">{currentConversions}</span> a{" "}
                    <span className="text-emerald-400 font-bold">{withMiaConversions}</span> ventas/mes
                  </p>
                  <p className="text-[10px] text-white/20">+{withMiaConversions - currentConversions} conversiones mensuales</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};


/* ═══════════════════════════════════════════════════════
   8. THE RACE — Animated metric bars competing
   ═══════════════════════════════════════════════════════ */
const raceMetrics = [
  { label: "Velocidad de respuesta", without: 15, withMia: 95, unitWithout: "6 horas", unitWith: "5 seg" },
  { label: "Tasa de conversión", without: 35, withMia: 80, unitWithout: "35%", unitWith: "80%" },
  { label: "Satisfacción del cliente", without: 40, withMia: 92, unitWithout: "3.2", unitWith: "4.8" },
  { label: "Cobertura horaria", without: 38, withMia: 100, unitWithout: "9h/día", unitWith: "24/7" },
];

export const TheRace = () => {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setAnimated(true); },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="py-20 relative" ref={ref}>
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/15 mb-6">
              <Gauge className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-violet-400/90 uppercase tracking-widest">La carrera</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
              Tu negocio vs{" "}
              <span className="text-gradient">tu negocio con WITHMIA</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="max-w-3xl mx-auto space-y-8">
            {raceMetrics.map((m, i) => (
              <div key={i}>
                <p className="text-sm text-white/40 font-medium mb-3">{m.label}</p>
                <div className="space-y-2">
                  {/* Without */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-red-400/60 font-medium w-16 shrink-0 text-right">Manual</span>
                    <div className="flex-1 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500/40 to-red-500/20 flex items-center justify-end pr-3 transition-all ease-out"
                        style={{ width: animated ? `${m.without}%` : "0%", transitionDuration: "1500ms" }}
                      >
                        <span className="text-[10px] font-bold text-red-300/80 font-mono whitespace-nowrap">{m.unitWithout}</span>
                      </div>
                    </div>
                  </div>
                  {/* With WITHMIA */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-emerald-400/60 font-medium w-16 shrink-0 text-right">WITHMIA</span>
                    <div className="flex-1 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500/50 to-emerald-400/30 flex items-center justify-end pr-3 transition-all ease-out"
                        style={{
                          width: animated ? `${m.withMia}%` : "0%",
                          transitionDuration: "2000ms",
                          transitionDelay: `${300 + i * 100}ms`,
                        }}
                      >
                        <span className="text-[10px] font-bold text-emerald-300/90 font-mono whitespace-nowrap">{m.unitWith}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};


/* ═══════════════════════════════════════════════════════
   9. MATURITY QUIZ — Self-assessment with gauge
   ═══════════════════════════════════════════════════════ */
const quizQuestions = [
  {
    q: "¿Cómo respondes los mensajes de clientes?",
    opts: [
      { label: "Desde mi celular personal cuando puedo", pts: 0 },
      { label: "Tengo a alguien dedicado en horario laboral", pts: 1 },
      { label: "Uso un CRM o plataforma multicanal", pts: 2 },
      { label: "Automatizado con IA + humano cuando escala", pts: 3 },
    ],
  },
  {
    q: "¿Qué pasa con un mensaje a las 11pm?",
    opts: [
      { label: "Se queda sin leer hasta mañana", pts: 0 },
      { label: "Respuesta automática genérica", pts: 1 },
      { label: "Chatbot básico responde", pts: 2 },
      { label: "IA atiende y resuelve en tiempo real", pts: 3 },
    ],
  },
  {
    q: "¿Cómo mides la satisfacción del cliente?",
    opts: [
      { label: "No la mido", pts: 0 },
      { label: "Reseñas en Google/redes", pts: 1 },
      { label: "Encuestas manuales", pts: 2 },
      { label: "CSAT y NPS automatizados post-atención", pts: 3 },
    ],
  },
  {
    q: "¿Qué canales atiendes?",
    opts: [
      { label: "Solo WhatsApp personal", pts: 0 },
      { label: "WhatsApp + Instagram, pero separados", pts: 1 },
      { label: "3+ canales con herramienta centralizada", pts: 2 },
      { label: "Omnicanal con historial unificado e IA", pts: 3 },
    ],
  },
];

const maturityLevels = [
  { min: 0, max: 3, label: "Principiante", color: "#f43f5e", desc: "Tu negocio opera como en 2010. Cada día pierdes clientes." },
  { min: 4, max: 6, label: "Básico", color: "#f59e0b", desc: "Tienes lo mínimo pero tu competencia ya te superó." },
  { min: 7, max: 9, label: "Intermedio", color: "#22d3ee", desc: "Vas bien, pero aún hay brechas que te cuestan ventas." },
  { min: 10, max: 12, label: "Avanzado", color: "#34d399", desc: "¡Excelente! WITHMIA puede llevarte al siguiente nivel." },
];

export const MaturityQuiz = () => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answered = Object.keys(answers).length;
  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const done = answered === quizQuestions.length;
  const level = maturityLevels.find((l) => totalScore >= l.min && totalScore <= l.max) || maturityLevels[0];
  const gaugePct = done ? (totalScore / 12) * 100 : 0;

  return (
    <section className="py-20 relative">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/[0.08] border border-cyan-500/15 mb-6">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400/90 uppercase tracking-widest">Autoevaluación</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
              ¿Qué tan digital es{" "}
              <span className="text-gradient">tu atención al cliente?</span>
            </h2>
            <p className="text-white/35 max-w-xl mx-auto text-sm">
              4 preguntas. 30 segundos. Descubre tu nivel.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="max-w-3xl mx-auto">
            {/* Questions */}
            <div className="space-y-6 mb-10">
              {quizQuestions.map((q, qi) => (
                <div key={qi} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-sm font-semibold text-white/70 mb-4">
                    <span className="text-white/20 mr-2">{qi + 1}.</span>
                    {q.q}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {q.opts.map((opt, oi) => {
                      const selected = answers[qi] === opt.pts;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers((p) => ({ ...p, [qi]: opt.pts }))}
                          className={`text-left px-4 py-2.5 rounded-xl border text-[12px] transition-all duration-300 ${
                            selected
                              ? "bg-white/[0.06] border-cyan-500/30 text-white/80"
                              : "bg-white/[0.01] border-white/[0.05] text-white/35 hover:border-white/[0.1] hover:text-white/50"
                          }`}
                        >
                          {selected && <CheckCircle2 className="w-3 h-3 text-cyan-400 inline mr-1.5" />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Result gauge */}
            {done && (
              <div
                className="text-center p-8 rounded-2xl border"
                style={{
                  borderColor: `${level.color}25`,
                  backgroundColor: `${level.color}06`,
                  animation: "fadeSlideUp .6s ease-out",
                }}
              >
                {/* Gauge bar */}
                <div className="max-w-xs mx-auto mb-6">
                  <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${gaugePct}%`, backgroundColor: level.color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-white/15">0</span>
                    <span className="text-[9px] text-white/15">12</span>
                  </div>
                </div>

                <p className="text-3xl font-black mb-1" style={{ color: level.color }}>
                  {level.label}
                </p>
                <p className="text-lg font-bold text-white/60 mb-2">Puntaje: {totalScore}/12</p>
                <p className="text-sm text-white/35 max-w-md mx-auto">{level.desc}</p>

                {totalScore < 10 && (
                  <a
                    href="https://app.withmia.com"
                    onClick={() => trackCTAClick("mejorar_puntaje", "pymes_quiz")}
                    className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all"
                  >
                    Mejorar mi puntaje con WITHMIA
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};


/* ═══════════════════════════════════════════════════════
   10. BOLD GUARANTEE — Risk-free commitment
   ═══════════════════════════════════════════════════════ */
export const BoldGuarantee = () => (
  <section className="py-20 relative">
    <div className="max-w-5xl mx-auto px-6">
      <Reveal>
        <div className="max-w-2xl mx-auto text-center">
          {/* Floating card with glow */}
          <div className="relative group">
            {/* Glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/20 via-violet-500/20 to-emerald-500/20 blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-700" />

            <div className="relative p-8 sm:p-12 rounded-3xl bg-[#0d0d18] border border-white/[0.08] overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }} />

              {/* Shield icon */}
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-emerald-500/15 border border-amber-500/20 flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-amber-400" />
              </div>

              <h2 className="relative text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight mb-4">
                Si no ves resultados en 30 días,
                <br />
                <span className="text-gradient">no pagas</span>
              </h2>

              <p className="relative text-sm text-white/35 leading-relaxed max-w-lg mx-auto mb-8">
                Sin letra chica. Sin compromisos de permanencia. Prueba WITHMIA con tu negocio real
                y si no mejoran tus métricas de atención, cancelas sin costo.
              </p>

              {/* Trust points */}
              <div className="relative flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8">
                {[
                  { icon: CheckCircle2, text: "Sin tarjeta requerida" },
                  { icon: Clock, text: "Setup en 10 minutos" },
                  { icon: Headphones, text: "Soporte incluido" },
                  { icon: Shield, text: "Google Verified App" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <t.icon className="w-4 h-4 text-emerald-400/60" />
                    <span className="text-xs text-white/40 font-medium">{t.text}</span>
                  </div>
                ))}
              </div>

              <a
                href="https://app.withmia.com"
                onClick={() => trackCTAClick("empezar_gratis_pymes", "pymes_cta")}
                className="relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_50px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 group/btn overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
                <span className="relative flex items-center gap-2">
                  Empezar gratis
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </span>
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);
