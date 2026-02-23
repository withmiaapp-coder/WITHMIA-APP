import { BarChart3, Users, TrendingUp, Activity, Sparkles, MessageSquare, Zap, Clock, Shield, ArrowUpRight, ArrowRight, CalendarCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const features = [
  {
    icon: BarChart3,
    title: "Analíticas avanzadas",
    desc: "Conversiones, engagement y rendimiento por canal en una sola vista.",
    accent: "#fbbf24",
  },
  {
    icon: Users,
    title: "CRM integrado",
    desc: "Historial completo de cada cliente con contexto de cada interacción.",
    accent: "#a78bfa",
  },
  {
    icon: TrendingUp,
    title: "ROI en tiempo real",
    desc: "Mide el impacto de tu IA en ingresos, retención y satisfacción.",
    accent: "#34d399",
  },
  {
    icon: Activity,
    title: "Monitoreo 24/7",
    desc: "Alertas inteligentes y métricas de salud de tus conversaciones.",
    accent: "#22d3ee",
  },
];

/* Floating stat cards that overlay the screenshot */
const floatingCards = [
  {
    icon: TrendingUp,
    label: "Conversiones",
    value: "12.5%",
    trend: "+15%",
    accent: "#fbbf24",
    pos: "top-[12%] left-[3%]",
    delay: "0s",
  },
  {
    icon: MessageSquare,
    label: "Mensajes hoy",
    value: "1,847",
    trend: "+342",
    accent: "#22d3ee",
    pos: "top-[8%] right-[3%]",
    delay: "0.5s",
  },
  {
    icon: Zap,
    label: "Precisión IA",
    value: "97.3%",
    trend: "+2.1%",
    accent: "#34d399",
    pos: "bottom-[28%] left-[4%]",
    delay: "1s",
  },
  {
    icon: Clock,
    label: "Tiempo resp.",
    value: "1.2s",
    trend: "-0.3s",
    accent: "#a78bfa",
    pos: "bottom-[22%] right-[4%]",
    delay: "1.5s",
  },
];

/* Toast-style notifications that appear and disappear */
const notifications = [
  { text: "Nuevo lead capturado desde WhatsApp", icon: MessageSquare, accent: "#22d3ee" },
  { text: "IA resolvió 3 tickets automáticamente", icon: Zap, accent: "#34d399" },
  { text: "Satisfacción del cliente: 98%", icon: TrendingUp, accent: "#fbbf24" },
  { text: "Sistema operando con 99.9% uptime", icon: Shield, accent: "#a78bfa" },
];

export const Dashboard = () => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [activeNotif, setActiveNotif] = useState(0);
  const [notifVisible, setNotifVisible] = useState(true);

  /* Cycle notifications */
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifVisible(false);
      setTimeout(() => {
        setActiveNotif((p) => (p + 1) % notifications.length);
        setNotifVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const curNotif = notifications[activeNotif];
  const NotifIcon = curNotif.icon;

  return (
    <section className="py-8 md:py-10 px-4 relative overflow-hidden">

      <div className="max-w-6xl mx-auto relative">

        {/* ─── Header — Invitation style ─── */}
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-amber-500/20 border border-violet-500/30 text-xs text-violet-300 font-semibold backdrop-blur-sm mb-5">
            <div className="relative">
              <Sparkles className="w-3.5 h-3.5" />
              <Sparkles className="w-3.5 h-3.5 absolute inset-0 animate-ping opacity-30" />
            </div>
            Conoce la plataforma
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-[1.15] mb-3">
            Todo tu negocio en
            <br />
            <span className="text-gradient">un solo lugar</span>
          </h2>
          <p className="text-sm text-white/50 max-w-lg mx-auto leading-relaxed">
            Dashboard inteligente con analíticas, CRM y monitoreo en tiempo real.
            Toma decisiones basadas en datos, no en suposiciones.
          </p>
        </div>

        {/* ─── Two-column layout: Features (1/4) + Screenshot (3/4) ─── */}
        <div className="grid md:grid-cols-[1fr,3fr] gap-4 items-stretch">

          {/* Left — Feature cards stacked */}
          <div className="flex flex-row md:flex-col gap-2 order-2 md:order-1">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="relative flex-1 rounded-xl p-4 md:p-5 group hover:bg-white/[0.04] transition-all duration-300 overflow-hidden border border-white/[0.08] hover:border-white/[0.1]"
                  style={{ background: 'hsl(var(--background))' }}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full opacity-40 group-hover:opacity-80 transition-opacity duration-300"
                    style={{ backgroundColor: f.accent }}
                  />
                  <div className="pl-3">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: `${f.accent}20`,
                          border: `1px solid ${f.accent}30`,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: f.accent }} />
                      </div>
                      <h4 className="text-[12px] font-semibold text-white leading-tight">
                        {f.title}
                      </h4>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed group-hover:text-white/45 transition-colors duration-300 hidden md:block">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — Screenshot (3/4) */}
          <div className="relative order-1 md:order-2">

          {/* Browser frame */}
          <div
            ref={frameRef}
            className="relative rounded-2xl overflow-hidden bg-[hsl(230,40%,5%)] group/frame flex flex-col"
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.08] bg-white/[0.03] relative z-10">
              <div className="flex gap-1.5">
                <div className="w-[9px] h-[9px] rounded-full bg-[#ff5f57] hover:brightness-125 transition-all" />
                <div className="w-[9px] h-[9px] rounded-full bg-[#febc2e] hover:brightness-125 transition-all" />
                <div className="w-[9px] h-[9px] rounded-full bg-[#28c840] hover:brightness-125 transition-all" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] max-w-[300px] w-full">
                  <div className="w-3 h-3 rounded-full border border-emerald-400/30 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/90" />
                  </div>
                  <span className="text-[10px] text-white/50 font-mono tracking-wide">app.withmia.com/dashboard</span>
                </div>
              </div>
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-400/[0.06] border border-emerald-400/10">
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute inset-0 animate-ping opacity-40" />
                </div>
                <span className="text-[9px] text-emerald-400/90 font-mono font-bold tracking-wider">LIVE</span>
              </div>
            </div>

            {/* Screenshot with floating overlays */}
            <div className="relative overflow-hidden max-h-[520px]">
              <img
                src="/dashboard-preview.png"
                alt="WITHMIA Dashboard"
                className="w-full h-auto block object-cover object-top"
                loading="lazy"
              />

              {/* Floating stat cards */}
              {floatingCards.map((card, i) => {
                const CardIcon = card.icon;
                return (
                  <div
                    key={i}
                    className={`absolute ${card.pos} hidden md:flex items-center gap-2.5 px-3 py-2.5 rounded-xl backdrop-blur-2xl border z-10`}
                    style={{
                      backgroundColor: "rgba(12, 12, 28, 0.88)",
                      borderColor: `${card.accent}30`,
                      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${card.accent}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
                      animation: `dashboard-float 5s ease-in-out ${card.delay} infinite alternate`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${card.accent}20`,
                        boxShadow: `0 0 12px ${card.accent}18`,
                      }}
                    >
                      <CardIcon className="w-3.5 h-3.5" style={{ color: card.accent }} />
                    </div>
                    <div>
                      <div className="text-[8px] text-white/40 font-medium tracking-wide uppercase">{card.label}</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[14px] font-bold text-white/90 font-mono tracking-tight">{card.value}</span>
                        <span className="text-[9px] font-mono font-semibold flex items-center gap-0.5" style={{ color: card.accent }}>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                          {card.trend}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Toast notification — cycles through */}
              <div
                className={`absolute top-[3%] left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-2xl border z-20 transition-all duration-400 ${
                  notifVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                }`}
                style={{
                  backgroundColor: "rgba(12, 12, 28, 0.9)",
                  borderColor: `${curNotif.accent}18`,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 15px ${curNotif.accent}12`,
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${curNotif.accent}15` }}
                >
                  <NotifIcon className="w-3 h-3" style={{ color: curNotif.accent }} />
                </div>
                <span className="text-[10px] text-white/60 font-medium">{curNotif.text}</span>
                <div className="w-1 h-1 rounded-full ml-1" style={{ backgroundColor: curNotif.accent }} />
              </div>

            </div>
          </div>

        </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-8">
          <a href="https://app.withmia.com">
            <button className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold text-sm shadow-[0_4px_25px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_35px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-300">
              <ArrowRight className="w-4 h-4" />
              Prueba gratis
            </button>
          </a>
          <a href="/contacto">
            <button className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-transparent text-white font-semibold text-sm border border-white/25 hover:border-white/50 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all duration-300">
              <CalendarCheck className="w-4 h-4" />
              Agenda una demo
            </button>
          </a>
        </div>
      </div>

      <style>{`
        @keyframes dashboard-float {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-10px); }
        }
      `}</style>
    </section>
  );
};
