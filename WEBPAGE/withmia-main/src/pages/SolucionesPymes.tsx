import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  Clock,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Zap,
  Users,
  Rocket,
  CheckCircle2,
  Calendar,
  BarChart3,
  Sparkles,
  Stethoscope,
  ShoppingCart,
  Building2,
  Dumbbell,
  GraduationCap,
  Utensils,
  Target,
  AlertTriangle,
  Shield,
  Headphones,
  XCircle,
  MessageCircle,
  PhoneOff,
  Timer,
  DollarSign,
  Ban,
} from "lucide-react";

/* ─── Scroll‑reveal ─── */
const Reveal = ({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setV(true),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: v ? 1 : 0,
        transform: v ? "translateY(0)" : "translateY(32px)",
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/* ─── Animated counter ─── */
const useCountUp = (end: number, duration = 1800) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            setVal(Math.round(end * p));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration]);
  return { val, ref };
};

/* ─── Data ─── */

/* ─── Lost lead timeline simulation ─── */
const lostLeadTimeline = [
  { time: "10:32", message: "Hola! Vi el anuncio, quiero cotizar 👋", status: "sent" as const },
  { time: "10:34", message: "¿Tienen disponible para hoy?", status: "sent" as const },
  { time: "10:47", message: "Bueno, cuando puedan me avisan...", status: "waiting" as const },
  { time: "11:58", message: "¿Hola? ¿Alguien ahí? 🤔", status: "waiting" as const },
  { time: "13:30", message: "Ya reservé con otra empresa. Gracias.", status: "lost" as const },
];

const painPoints = [
  {
    label: "WhatsApp por un lado, Instagram por otro",
    headline: "Canales\nfragmentados",
    description: "Cada canal es una isla. Tu equipo salta entre apps, pierde contexto y repite las mismas preguntas. El cliente lo nota.",
    icon: MessageCircle, color: "#f59e0b",
    stat: "73%", statLabel: "usa 3+ canales sin integrar",
    consequences: ["Historial perdido entre canales", "Respuestas duplicadas o contradictorias", "Cero visibilidad de métricas"],
  },
  {
    label: "Pagas de más o te quedas corto",
    headline: "Herramientas\nque no escalan",
    description: "Las enterprise cuestan +$500/mes y necesitan implementaciones de semanas. Las gratuitas colapsan con el primer pico.",
    icon: DollarSign, color: "#f43f5e",
    stat: "$500+", statLabel: "USD/mes en soluciones enterprise",
    consequences: ["Implementaciones de semanas o meses", "Funciones que nunca usarás", "Sin soporte en español"],
  },
  {
    label: "Cada mensaje depende de un humano",
    headline: "Atención 100%\nmanual",
    description: "Fuera de horario, feriados, fines de semana — tus leads se van a la competencia que sí responde al instante.",
    icon: PhoneOff, color: "#a78bfa",
    stat: "6h", statLabel: "respuesta promedio sin automatización",
    consequences: ["0 respuestas fuera de horario", "Leads fríos al día siguiente", "Costo creciente al escalar"],
  },
];



const milestones = [
  { day: "Día 1", title: "Crea tu cuenta", description: "Regístrate gratis, conecta tu primer canal (WhatsApp, Instagram o Web) y configura tu perfil de negocio.", highlight: "10 minutos", status: "completed" as const },
  { day: "Día 2-3", title: "Entrena a WITHMIA", description: "Sube tu catálogo, FAQs y políticas. WITHMIA los procesa y aprende todo sobre tu negocio automáticamente.", highlight: "Sin código", status: "completed" as const },
  { day: "Semana 1", title: "Primeras conversaciones", description: "WITHMIA empieza a atender clientes reales. Tú supervisas y ajustas respuestas desde el panel.", highlight: "100% supervisado", status: "completed" as const },
  { day: "Semana 2", title: "Automatización completa", description: "WITHMIA maneja el 80% de consultas sola. Solo te escala las que requieren intervención humana.", highlight: "80% automático", status: "current" as const },
  { day: "Semana 3", title: "Más canales conectados", description: "Agregas Facebook, Email, Chat Web. Todos los canales en una sola bandeja con CRM integrado.", highlight: "Omnicanal", status: "upcoming" as const },
  { day: "Mes 1", title: "Resultados medibles", description: "Dashboard con métricas reales: tiempo de respuesta, conversiones, satisfacción y ROI de WITHMIA.", highlight: "ROI positivo", status: "upcoming" as const },
];

const useCases = [
  {
    industry: "Salud & Odontología", icon: Stethoscope, color: "#34d399",
    scenarios: [
      { title: "Agendamiento automático", description: "Pacientes agendan citas 24/7 directo desde WhatsApp.", icon: Calendar },
      { title: "Seguimiento post-consulta", description: "Envía instrucciones y recuerda medicamentos automáticamente.", icon: MessageSquare },
      { title: "Gestión de cancelaciones", description: "Ofrece horas libres a la lista de espera al instante.", icon: Users },
    ],
    result: "+182% citas agendadas · -60% no-shows",
  },
  {
    industry: "E-commerce & Retail", icon: ShoppingCart, color: "#a78bfa",
    scenarios: [
      { title: "Asesor de ventas 24/7", description: "Recomienda productos y guía al cliente hasta el checkout.", icon: MessageSquare },
      { title: "Recuperación de carritos", description: "Detecta abandonos y envía incentivos personalizados.", icon: ShoppingCart },
      { title: "Tracking de pedidos", description: "Responde estado de envío y gestiona cambios.", icon: BarChart3 },
    ],
    result: "+45% conversión · -80% consultas repetitivas",
  },
  {
    industry: "Inmobiliaria", icon: Building2, color: "#22d3ee",
    scenarios: [
      { title: "Calificación de leads", description: "Filtra interesados por presupuesto y zona automáticamente.", icon: Users },
      { title: "Visitas programadas", description: "Coordina horarios entre compradores y corredores.", icon: Calendar },
      { title: "Info de propiedades", description: "Envía fichas, fotos y precios de propiedades filtradas.", icon: MessageSquare },
    ],
    result: "-70% tiempo en leads fríos · +3x propiedades mostradas",
  },
  {
    industry: "Fitness & Bienestar", icon: Dumbbell, color: "#f59e0b",
    scenarios: [
      { title: "Inscripción de alumnos", description: "Desde la primera consulta hasta el pago, todo automatizado.", icon: Users },
      { title: "Horarios y disponibilidad", description: "Responde clases e instructores disponibles en tiempo real.", icon: Calendar },
      { title: "Retención de miembros", description: "Detecta inactividad y envía mensajes de motivación.", icon: MessageSquare },
    ],
    result: "+35% retención · 24/7 atención sin staff adicional",
  },
  {
    industry: "Educación", icon: GraduationCap, color: "#ec4899",
    scenarios: [
      { title: "Admisiones automatizadas", description: "Responde a prospectos y agenda entrevistas de forma autónoma.", icon: MessageSquare },
      { title: "Soporte estudiantil", description: "Resuelve dudas sobre horarios, notas y trámites.", icon: Users },
      { title: "Comunicación masiva", description: "Envía recordatorios de matrículas y eventos por WhatsApp.", icon: Calendar },
    ],
    result: "+50% admissions rate · -90% consultas repetitivas",
  },
  {
    industry: "Gastronomía", icon: Utensils, color: "#f97316",
    scenarios: [
      { title: "Reservas automáticas", description: "Gestiona reservas y envía el menú del día por WhatsApp.", icon: Calendar },
      { title: "Pedidos por chat", description: "Toma pedidos de delivery directamente desde la conversación.", icon: ShoppingCart },
      { title: "Feedback y reseñas", description: "Solicita opiniones y gestiona reclamos en privado.", icon: MessageSquare },
    ],
    result: "+40% reservas · Pedidos sin apps de terceros",
  },
];



/* ─── Component ─── */
const SolucionesPymes = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState(0);
  const current = useCases[activeTab];

  const counterLeads = useCountUp(40, 1600);
  const counterTime = useCountUp(6, 1400);
  const counterConversion = useCountUp(391, 2000);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20">

        {/* ══════════════════════════════════════════════════
            HERO — Aurora mesh, 2-column
            ══════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 pt-28 pb-16">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left — Copy */}
              <Reveal>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-950/30 mb-8">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-300/80 tracking-wide">Pensado para PYMEs</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] mb-6">
                  Tu PYME merece
                  <br />
                  <span className="relative">
                    <span className="text-gradient">atención automática</span>
                    <span className="absolute -bottom-1 left-0 w-full h-[3px] rounded-full bg-gradient-to-r from-amber-400/60 to-orange-500/0" />
                  </span>
                </h1>

                <p className="text-lg text-white/45 max-w-lg leading-relaxed mb-10">
                  WITHMIA automatiza la atención al cliente de tu negocio con IA conversacional.
                  Responde 24/7, captura cada lead y escala sin contratar más personal.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-4 mb-12">
                  <a
                    href="https://app.withmia.com"
                    className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_50px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <span className="relative flex items-center gap-2">
                      Comenzar prueba gratis
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </a>
                  <a
                    href="#problema"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300 hover:bg-white/[0.03]"
                  >
                    Ver el problema
                  </a>
                </div>

                {/* Animated counters */}
                <div className="flex gap-8 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold text-white"><span ref={counterLeads.ref}>{counterLeads.val}</span>%</p>
                    <p className="text-[11px] text-white/25 uppercase tracking-wider mt-1">Leads perdidos</p>
                  </div>
                  <div className="w-px bg-white/[0.06]" />
                  <div>
                    <p className="text-2xl font-bold text-white"><span ref={counterTime.ref}>{counterTime.val}</span>h</p>
                    <p className="text-[11px] text-white/25 uppercase tracking-wider mt-1">Respuesta promedio</p>
                  </div>
                  <div className="w-px bg-white/[0.06]" />
                  <div>
                    <p className="text-2xl font-bold text-white"><span ref={counterConversion.ref}>{counterConversion.val}</span>%</p>
                    <p className="text-[11px] text-white/25 uppercase tracking-wider mt-1">Más conversiones posibles</p>
                  </div>
                </div>
              </Reveal>

              {/* Right — Phone mockup with lost lead */}
              <Reveal delay={200}>
                <div className="flex justify-center lg:justify-end">
                  <div className="relative w-[280px] sm:w-[300px]">
                    {/* Phone frame */}
                    <div className="relative rounded-[2.5rem] border-[3px] border-white/[0.12] bg-[#0c0c14] shadow-[0_0_80px_rgba(0,0,0,0.6),inset_0_0_30px_rgba(0,0,0,0.3)] overflow-hidden">
                      
                      {/* Notch / Dynamic Island */}
                      <div className="flex justify-center pt-3 pb-1">
                        <div className="w-[90px] h-[26px] rounded-full bg-black border border-white/[0.06]" />
                      </div>

                      {/* Status bar */}
                      <div className="flex items-center justify-between px-7 pb-2">
                        <span className="text-[10px] font-semibold text-white/50">10:32</span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-[2px]">
                            {[1,2,3,4].map(b => (
                              <div key={b} className={`w-[3px] rounded-sm ${b <= 3 ? 'bg-white/40' : 'bg-white/15'}`} style={{ height: `${6 + b * 2}px` }} />
                            ))}
                          </div>
                          <span className="text-[9px] text-white/30 font-medium">5G</span>
                          <div className="w-[22px] h-[10px] rounded-[2px] border border-white/30 relative">
                            <div className="absolute inset-[1.5px] right-[5px] rounded-[1px] bg-white/40" />
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp-style chat header */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1a1a2e]/80 border-y border-white/[0.04]">
                        <div className="text-white/30 text-sm">←</div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 border border-emerald-500/20 flex items-center justify-center">
                          <span className="text-[13px]">🏪</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-white/80">Tu Negocio</p>
                          <p className="text-[10px] text-white/25">en línea</p>
                        </div>
                        <div className="flex items-center gap-3 text-white/25">
                          <span className="text-[14px]">📞</span>
                          <span className="text-[14px]">⋮</span>
                        </div>
                      </div>

                      {/* Chat body */}
                      <div className="relative bg-[#0b0b15] min-h-[300px]">
                        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'white\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px' }} />

                        <div className="flex justify-center pt-4 pb-2">
                          <span className="text-[10px] text-white/20 bg-white/[0.04] px-3 py-1 rounded-md font-medium">HOY</span>
                        </div>

                        <div className="px-3 pb-4 space-y-1.5">
                          {lostLeadTimeline.map((msg, i) => (
                            <div
                              key={i}
                              className="flex justify-start"
                              style={{ animation: `fadeInUp 0.5s ease ${i * 0.15}s both` }}
                            >
                              <div className={`relative max-w-[82%] px-3 py-2 rounded-xl rounded-tl-sm text-[12px] leading-relaxed shadow-sm ${
                                msg.status === "lost"
                                  ? "bg-red-500/[0.12] border border-red-500/15 text-red-200/70"
                                  : msg.status === "waiting"
                                  ? "bg-amber-500/[0.08] border border-amber-500/10 text-amber-100/50"
                                  : "bg-white/[0.06] border border-white/[0.06] text-white/55"
                              }`}>
                                <p>{msg.message}</p>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <span className="text-[9px] text-white/15">{msg.time}</span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Typing indicator that never resolves */}
                          <div className="flex justify-end" style={{ animation: 'fadeInUp 0.5s ease 0.9s both' }}>
                            <div className="bg-white/[0.04] border border-white/[0.05] rounded-xl rounded-tr-sm px-4 py-2.5 flex items-center gap-1">
                              <div className="w-[5px] h-[5px] rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
                              <div className="w-[5px] h-[5px] rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
                              <div className="w-[5px] h-[5px] rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
                            </div>
                          </div>

                          <div className="flex justify-center pt-3" style={{ animation: 'fadeInUp 0.5s ease 1.2s both' }}>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/[0.08] border border-red-500/12">
                              <Ban className="w-3 h-3 text-red-400/70" />
                              <span className="text-[9px] text-red-300/60 font-semibold tracking-wide">NADIE RESPONDIÓ</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Input bar */}
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0c0c14] border-t border-white/[0.04]">
                        <span className="text-white/15 text-sm">😊</span>
                        <div className="flex-1 h-8 rounded-full bg-white/[0.04] border border-white/[0.05] flex items-center px-3">
                          <span className="text-[11px] text-white/15">Escribe un mensaje...</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
                          <span className="text-white/15 text-sm">🎤</span>
                        </div>
                      </div>

                      {/* Home indicator */}
                      <div className="flex justify-center py-2">
                        <div className="w-[120px] h-[4px] rounded-full bg-white/[0.12]" />
                      </div>
                    </div>

                    {/* Bottom badge */}
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/[0.08] border border-red-500/12 backdrop-blur-sm shadow-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-[11px] text-red-300/70 font-medium">Pasa el <span className="text-red-400 font-bold">40%</span> de las veces</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            PROBLEM — Immersive lost-lead narrative
            ══════════════════════════════════════════════════ */}
        <section className="pt-14 pb-28 relative" id="problema">
          {/* Subtle red ambient glow */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-500/[0.015] rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative">

            {/* Header */}
            <Reveal>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-500/15 bg-red-500/[0.04] mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-red-400/80 uppercase tracking-widest">El problema real</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
                  Tu negocio opera digital, pero atiende{" "}
                  <span className="text-gradient">como en 1999</span>
                </h2>
                <p className="text-[15px] text-white/35 leading-relaxed max-w-2xl mx-auto">
                  Tener presencia digital no alcanza. Si no respondes rápido, cada mensaje sin contestar 
                  es un cliente que ya se fue a tu competencia.
                </p>
              </div>
            </Reveal>

            {/* ─── Impact stats grid — full width ─── */}
            <Reveal delay={100}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
                {[
                  { val: "40%", label: "de leads se pierden por demora en responder", color: "#f43f5e", icon: TrendingDown },
                  { val: "6h", label: "respuesta promedio de una PYME sin IA", color: "#f59e0b", icon: Clock },
                  { val: "73%", label: "usa 3+ canales sin integrar entre sí", color: "#a78bfa", icon: AlertTriangle },
                  { val: "3x", label: "más caro operar manualmente vs con IA", color: "#22d3ee", icon: DollarSign },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 group overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent 10%, ${s.color}25 50%, transparent 90%)` }} />
                    <div
                      className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-[35px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ backgroundColor: `${s.color}12` }}
                    />
                    <div className="relative">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${s.color}10`, border: `1px solid ${s.color}18` }}
                      >
                        <s.icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                      <p className="text-3xl font-bold font-mono tabular-nums mb-1.5" style={{ color: s.color }}>{s.val}</p>
                      <p className="text-[11px] text-white/30 leading-relaxed">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* ─── Pain point cards — expanded with consequences ─── */}
            <div className="grid md:grid-cols-3 gap-4">
              {painPoints.map((point, i) => (
                <Reveal key={i} delay={100 + i * 100}>
                  <div className="group relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500 overflow-hidden">
                    {/* Top colored accent line */}
                    <div className="h-px" style={{ background: `linear-gradient(90deg, transparent 5%, ${point.color}30 50%, transparent 95%)` }} />

                    {/* Stat header */}
                    <div className="px-6 pt-5 pb-4 border-b border-white/[0.04]">
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold font-mono" style={{ color: point.color }}>{point.stat}</span>
                        <span className="text-[10px] text-white/20 uppercase tracking-wider leading-tight">{point.statLabel}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 relative">
                      {/* Watermark */}
                      <span className="absolute top-2 right-4 text-[56px] font-bold leading-none select-none pointer-events-none" style={{ color: `${point.color}05` }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundColor: `${point.color}10`, border: `1px solid ${point.color}18` }}
                        >
                          <point.icon className="w-[18px] h-[18px]" style={{ color: point.color }} />
                        </div>
                        <div>
                          <p className="text-[10px] text-white/20 uppercase tracking-wider mb-0.5">{point.label}</p>
                          <h3 className="text-[15px] font-semibold text-white whitespace-pre-line leading-snug">{point.headline}</h3>
                        </div>
                      </div>

                      <p className="text-[13px] text-white/30 leading-relaxed mb-4">{point.description}</p>

                      {/* Consequences list */}
                      <div className="space-y-2">
                        {point.consequences.map((c, ci) => (
                          <div key={ci} className="flex items-start gap-2">
                            <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400/40" />
                            <span className="text-[12px] text-white/25 leading-relaxed">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Transition CTA */}
            <Reveal delay={400}>
              <div className="flex justify-center mt-12">
                <a
                  href="#casos"
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white hover:border-amber-500/20 hover:bg-amber-500/[0.04] transition-all duration-300 text-sm font-medium"
                >
                  ¿Cómo lo resuelve WITHMIA?
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            USE CASES — Industry tabs
            ══════════════════════════════════════════════════ */}
        <section className="py-24 relative overflow-hidden" id="casos">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold backdrop-blur-sm mb-6">
                  <Sparkles className="w-4 h-4" />
                  Casos de Uso
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
                  Una IA,{" "}
                  <span className="text-gradient">todas las industrias</span>
                </h2>
                <p className="text-white/35 max-w-xl mx-auto">
                  WITHMIA se adapta a tu negocio, no al revés.
                </p>
              </div>
            </Reveal>

            {/* Industry tabs */}
            <Reveal delay={100}>
              <div className="flex flex-wrap justify-center gap-2 mb-12">
                {useCases.map((uc, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      i === activeTab
                        ? "text-white border shadow-lg"
                        : "bg-white/[0.02] border border-white/[0.06] text-white/40 hover:bg-white/[0.04] hover:text-white/60"
                    }`}
                    style={
                      i === activeTab
                        ? {
                            backgroundColor: `${uc.color}12`,
                            borderColor: `${uc.color}30`,
                            color: uc.color,
                            boxShadow: `0 0 25px ${uc.color}10`,
                          }
                        : undefined
                    }
                  >
                    <uc.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{uc.industry}</span>
                  </button>
                ))}
              </div>
            </Reveal>

            {/* Content cards */}
            <Reveal delay={150}>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {current.scenarios.map((scenario, i) => (
                  <div
                    key={`${activeTab}-${i}`}
                    className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 overflow-hidden"
                    style={{
                      animation: `fadeInUp 0.4s ease ${i * 0.1}s both`,
                    }}
                  >
                    <div
                      className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${current.color}40, transparent)` }}
                    />

                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: `${current.color}10`, border: `1px solid ${current.color}18` }}
                      >
                        <scenario.icon className="w-[18px] h-[18px]" style={{ color: current.color }} />
                      </div>
                      <h3 className="text-[15px] font-semibold text-white mb-2">{scenario.title}</h3>
                      <p className="text-[13px] text-white/30 leading-relaxed">{scenario.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Result banner */}
            <Reveal delay={200}>
              <div
                className="text-center py-4 px-5 rounded-xl border"
                style={{
                  background: `linear-gradient(135deg, ${current.color}06, ${current.color}03)`,
                  borderColor: `${current.color}15`,
                }}
              >
                <p className="text-[13px] text-white/35 mb-1">Resultados típicos en {current.industry}:</p>
                <p className="text-base font-bold text-gradient">{current.result}</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            TIMELINE — Tu primer mes
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/[0.025] rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-4xl mx-auto px-6 relative">
            <Reveal>
              <div className="text-center mb-20">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/20 bg-orange-950/20 mb-6">
                  <Rocket className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-orange-300/80 tracking-wide">Tu Primer Mes</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
                  De cero a{" "}
                  <span className="text-gradient">automático</span>{" "}
                  en 30 días
                </h2>
                <p className="text-white/35 max-w-xl mx-auto">
                  No necesitas equipo técnico. Este es el camino real que siguen nuestros clientes.
                </p>
              </div>
            </Reveal>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-px overflow-hidden">
                <div className="w-full h-full bg-gradient-to-b from-amber-500/30 via-orange-500/15 to-transparent" />
                {/* Animated light */}
                <div
                  className="absolute left-0 w-px h-20 bg-gradient-to-b from-transparent via-amber-400/60 to-transparent"
                  style={{ animation: "scrollY 4s ease-in-out infinite" }}
                />
              </div>

              <div className="space-y-8">
                {milestones.map((m, i) => {
                  const isLeft = i % 2 === 0;
                  return (
                    <Reveal key={i} delay={i * 80}>
                      <div className="relative">
                        {/* Desktop layout */}
                        <div className="hidden md:grid md:grid-cols-2 gap-8 items-center">
                          <div className={isLeft ? "" : "order-2"}>
                            <div
                              className={`p-6 rounded-2xl transition-all duration-300 backdrop-blur-sm overflow-hidden relative group ${
                                m.status === "current"
                                  ? "bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.08] border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.06)]"
                                  : "bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
                              } ${isLeft ? "text-right" : "text-left"}`}
                            >
                              {/* Watermark number */}
                              <span className={`absolute ${isLeft ? "left-4" : "right-4"} top-2 text-[60px] font-bold text-white/[0.02] leading-none select-none pointer-events-none`}>
                                {String(i + 1).padStart(2, "0")}
                              </span>

                              <div className={`flex items-center gap-2 mb-3 ${isLeft ? "justify-end" : ""}`}>
                                <span className={`text-xs font-mono px-2.5 py-1 rounded-md ${
                                  m.status === "current" ? "bg-amber-500/20 text-amber-400" : "bg-white/[0.06] text-white/40"
                                }`}>
                                  {m.day}
                                </span>
                                <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                                  m.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                                  m.status === "current" ? "bg-amber-500/15 text-amber-400" :
                                  "bg-white/[0.04] text-white/30"
                                }`}>
                                  {m.highlight}
                                </span>
                              </div>
                              <h3 className="text-base font-semibold text-white mb-1.5">{m.title}</h3>
                              <p className="text-xs text-white/35 leading-relaxed">{m.description}</p>
                            </div>
                          </div>
                          <div className={isLeft ? "order-2" : ""} />
                        </div>

                        {/* Dot — desktop */}
                        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                            m.status === "completed"
                              ? "bg-emerald-500/20 border-emerald-500/40"
                              : m.status === "current"
                              ? "bg-amber-500/20 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                              : "bg-white/[0.06] border-white/10"
                          }`}>
                            {m.status === "completed" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : m.status === "current" ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-white/30" />
                            )}
                          </div>
                        </div>

                        {/* Mobile layout */}
                        <div className="md:hidden flex gap-4">
                          <div className="relative z-10 shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                              m.status === "completed"
                                ? "bg-emerald-500/20 border-emerald-500/40"
                                : m.status === "current"
                                ? "bg-amber-500/20 border-amber-500/40"
                                : "bg-white/[0.06] border-white/10"
                            }`}>
                              {m.status === "completed" ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : m.status === "current" ? (
                                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                              ) : (
                                <Clock className="w-4 h-4 text-white/30" />
                              )}
                            </div>
                          </div>
                          <div
                            className={`flex-1 p-5 rounded-2xl backdrop-blur-sm ${
                              m.status === "current"
                                ? "bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.08] border border-amber-500/20"
                                : "bg-white/[0.02] border border-white/[0.06]"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`text-xs font-mono px-2 py-1 rounded-md ${
                                m.status === "current" ? "bg-amber-500/20 text-amber-400" : "bg-white/[0.06] text-white/40"
                              }`}>
                                {m.day}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-md ${
                                m.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                                m.status === "current" ? "bg-amber-500/15 text-amber-400" :
                                "bg-white/[0.04] text-white/30"
                              }`}>
                                {m.highlight}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-white mb-1">{m.title}</h3>
                            <p className="text-xs text-white/35">{m.description}</p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <Reveal delay={400}>
              <div className="text-center mt-14">
                <a
                  href="https://app.withmia.com"
                  className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)] hover:-translate-y-0.5 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    Empezar mi Día 1
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
              </div>
            </Reveal>
          </div>
        </section>



        {/* ══════════════════════════════════════════════════
            CTA — Gradient mesh
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/[0.04] rounded-full blur-[130px]" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[120px]" />
          </div>

          <Reveal>
            <div className="relative max-w-3xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-950/20 mb-8">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-300/70">Empieza gratis</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Tu PYME no puede esperar{" "}
                <span className="text-gradient">más</span>
              </h2>
              <p className="text-white/35 mb-10 max-w-xl mx-auto leading-relaxed">
                Cada minuto sin WITHMIA es un lead que no contestas, una venta que pierdes
                y un cliente que se va a la competencia.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://app.withmia.com"
                  className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_50px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    Comenzar ahora — es gratis
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
                <a
                  href="/contacto"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300 hover:bg-white/[0.03]"
                >
                  <Headphones className="w-4 h-4" />
                  Hablar con ventas
                </a>
              </div>
            </div>
          </Reveal>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default SolucionesPymes;
