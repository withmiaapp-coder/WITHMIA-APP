import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  ShieldCheck,
  X,
  Check,
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
  ChevronRight,
  Star,
  Shield,
  Headphones,
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
const stats = [
  { value: "24h", label: "Tiempo promedio de respuesta sin automatización", icon: Clock, color: "#f43f5e" },
  { value: "40%", label: "Oportunidades perdidas por respuestas tardías", icon: TrendingDown, color: "#f59e0b" },
  { value: "100x", label: "Más chances de cerrar si respondes en <5 min", icon: Zap, color: "#22d3ee" },
  { value: "391%", label: "Más conversiones respondiendo en <1 minuto", icon: TrendingUp, color: "#34d399" },
];

const painPoints = [
  { label: "Desarticulación operativa", description: "Datos desperdigados en hojas de cálculo, chats y formularios que no conversan entre sí.", icon: AlertTriangle, color: "#f59e0b" },
  { label: "Barreras de acceso", description: "Soluciones genéricas y costosas que no se adaptan a cómo trabaja una PYME real.", icon: Shield, color: "#f43f5e" },
  { label: "Dependencia humana", description: "Equipos respondiendo manualmente tareas repetitivas 24/7, con alto costo operativo.", icon: Users, color: "#a78bfa" },
];

const beforeItems = [
  { icon: Clock, text: "Respondes en 6+ horas", detail: "El cliente ya le compró a tu competencia" },
  { icon: MessageSquare, text: "Copias y pegas entre 5 apps", detail: "WhatsApp, Excel, email, Instagram, CRM…" },
  { icon: TrendingDown, text: "Pierdes el 40% de leads", detail: "Nadie responde fuera de horario" },
  { icon: Users, text: "Necesitas contratar más personal", detail: "Costos que suben, ventas que no" },
];

const afterItems = [
  { icon: Zap, text: "Respuesta en <1 minuto, 24/7", detail: "IA que responde con contexto real" },
  { icon: MessageSquare, text: "Todo en un solo panel", detail: "Todos los canales unificados" },
  { icon: TrendingUp, text: "Capturas el 100% de leads", detail: "Nadie se queda sin respuesta" },
  { icon: Users, text: "Escala sin contratar", detail: "Tu equipo se enfoca en cerrar ventas" },
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

const pricingFeatures = [
  "Asistente virtual 24/7",
  "Hasta 1,000 conversaciones/mes",
  "Integración WhatsApp + Web",
  "Dashboard de métricas",
  "Soporte prioritario",
  "CRM integrado",
];

/* ─── Component ─── */
const SolucionesPymes = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState(0);
  const current = useCases[activeTab];

  const counterLeads = useCountUp(40, 1600);
  const counterTime = useCountUp(24, 1400);
  const counterConversion = useCountUp(391, 2000);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20">

        {/* ══════════════════════════════════════════════════
            HERO — Aurora mesh, 2-column
            ══════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Aurora mesh */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-[-15%] left-[10%] w-[700px] h-[700px] rounded-full bg-amber-500/[0.04] blur-[140px] animate-pulse" style={{ animationDuration: "6s" }} />
            <div className="absolute bottom-[-10%] right-[5%] w-[600px] h-[600px] rounded-full bg-violet-500/[0.035] blur-[130px] animate-pulse" style={{ animationDuration: "8s" }} />
            <div className="absolute top-[40%] right-[35%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.025] blur-[100px] animate-pulse" style={{ animationDuration: "7s" }} />
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-24">
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

              {/* Right — Visual: stats cards in perspective */}
              <Reveal delay={200}>
                <div className="relative">
                  <div className="absolute -inset-8 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-violet-500/[0.04] rounded-3xl blur-xl" />
                  <div className="relative grid grid-cols-2 gap-4">
                    {stats.map((stat, i) => (
                      <div
                        key={i}
                        className="group p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.14] transition-all duration-500 overflow-hidden relative"
                      >
                        {/* Hover glow */}
                        <div
                          className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                          style={{ backgroundColor: `${stat.color}10` }}
                        />
                        <div className="relative">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                            style={{ backgroundColor: `${stat.color}10`, border: `1px solid ${stat.color}20` }}
                          >
                            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                          </div>
                          <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                          <p className="text-[11px] text-white/30 leading-relaxed">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            PROBLEM — Pain points with glass cards
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative" id="problema">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/[0.02] rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative">
            <Reveal>
              <div className="text-center mb-20">
                <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-4">
                  Brecha en LATAM
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
                  Las PYMEs operan digital, pero{" "}
                  <span className="text-gradient">responden como en 1999</span>
                </h2>
                <p className="text-white/35 max-w-2xl mx-auto leading-relaxed">
                  La mayoría de negocios tiene WhatsApp, Instagram o web, pero todo funciona manual,
                  fragmentado y sin contexto. Eso se traduce en horas perdidas, leads sin respuesta
                  y equipos agotados.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-5">
              {painPoints.map((point, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="group relative h-full p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500 overflow-hidden">
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${point.color}40, transparent)` }}
                    />
                    {/* Watermark */}
                    <span className="absolute top-3 right-4 text-[80px] font-bold text-white/[0.015] leading-none select-none pointer-events-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${point.color}10`, border: `1px solid ${point.color}20` }}
                      >
                        <point.icon className="w-5 h-5" style={{ color: point.color }} />
                      </div>
                      <h3 className="text-base font-semibold text-white mb-2.5">{point.label}</h3>
                      <p className="text-sm text-white/30 leading-relaxed">{point.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            BEFORE / AFTER — Split comparison
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative overflow-hidden">
          {/* Center glow divider */}
          <div className="absolute top-[15%] bottom-[15%] left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-amber-500/20 to-transparent hidden lg:block" />

          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-20">
                <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-4">
                  La diferencia
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
                  Sin WITHMIA <span className="text-white/20">vs</span>{" "}
                  <span className="text-gradient">Con WITHMIA</span>
                </h2>
              </div>
            </Reveal>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* BEFORE */}
              <Reveal delay={0}>
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-medium mb-6">
                    <X className="w-4 h-4" />
                    Sin WITHMIA
                  </div>
                  <div className="space-y-3">
                    {beforeItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <Reveal key={i} delay={i * 80}>
                          <div className="group flex items-start gap-4 p-5 rounded-2xl bg-red-500/[0.03] border border-red-500/[0.08] hover:border-red-500/20 transition-all duration-300">
                            <div className="mt-0.5 p-2.5 rounded-xl bg-red-500/10 shrink-0 group-hover:scale-110 transition-transform duration-300">
                              <Icon className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-white mb-1">{item.text}</p>
                              <p className="text-sm text-white/30">{item.detail}</p>
                            </div>
                          </div>
                        </Reveal>
                      );
                    })}
                  </div>
                </div>
              </Reveal>

              {/* AFTER */}
              <Reveal delay={150}>
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium mb-6">
                    <Check className="w-4 h-4" />
                    Con WITHMIA
                  </div>
                  <div className="space-y-3">
                    {afterItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <Reveal key={i} delay={i * 80 + 150}>
                          <div className="group flex items-start gap-4 p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/[0.08] hover:border-emerald-500/20 transition-all duration-300">
                            <div className="mt-0.5 p-2.5 rounded-xl bg-emerald-500/10 shrink-0 group-hover:scale-110 transition-transform duration-300">
                              <Icon className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-white mb-1">{item.text}</p>
                              <p className="text-sm text-white/30">{item.detail}</p>
                            </div>
                          </div>
                        </Reveal>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Bottom CTA */}
            <Reveal delay={300}>
              <div className="text-center mt-16">
                <a
                  href="https://app.withmia.com"
                  className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_50px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    Quiero el después
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
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
            USE CASES — Industry tabs
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/[0.025] rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative">
            <Reveal>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold backdrop-blur-sm mb-6">
                  <Sparkles className="w-4 h-4" />
                  Casos de Uso
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
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
              <div className="flex flex-wrap justify-center gap-2 mb-14">
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
              <div className="grid md:grid-cols-3 gap-5 mb-8">
                {current.scenarios.map((scenario, i) => (
                  <div
                    key={`${activeTab}-${i}`}
                    className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500 overflow-hidden"
                    style={{
                      animation: `fadeInUp 0.4s ease ${i * 0.1}s both`,
                    }}
                  >
                    {/* Top accent */}
                    <div
                      className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${current.color}40, transparent)` }}
                    />
                    {/* Hover glow */}
                    <div
                      className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ backgroundColor: `${current.color}08` }}
                    />

                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: `${current.color}10`, border: `1px solid ${current.color}20` }}
                      >
                        <scenario.icon className="w-5 h-5" style={{ color: current.color }} />
                      </div>
                      <h3 className="text-base font-semibold text-white mb-2">{scenario.title}</h3>
                      <p className="text-sm text-white/30 leading-relaxed">{scenario.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Result banner */}
            <Reveal delay={200}>
              <div
                className="text-center p-5 rounded-2xl border backdrop-blur-sm"
                style={{
                  background: `linear-gradient(135deg, ${current.color}06, ${current.color}03)`,
                  borderColor: `${current.color}15`,
                }}
              >
                <p className="text-sm text-white/35 mb-1">Resultados típicos en {current.industry}:</p>
                <p className="text-lg font-bold text-gradient">{current.result}</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            PRICING — Glass card
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/[0.03] rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-lg mx-auto px-6 relative">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-4">
                  Inversión
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
                  Planes{" "}
                  <span className="text-gradient">asequibles</span>{" "}
                  para tu PYME
                </h2>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="relative group">
                {/* Glow behind card */}
                <div className="absolute -inset-1 bg-gradient-to-br from-amber-400/20 via-orange-500/10 to-violet-500/10 rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-700" />

                <div className="relative rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  {/* Badge */}
                  <div className="absolute top-0 right-0">
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold rounded-bl-xl">
                      <Star className="w-3 h-3" />
                      Más popular
                    </div>
                  </div>

                  <div className="p-8 pt-10">
                    <h3 className="text-2xl font-bold text-white mb-2">Plan PYME</h3>

                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-4xl font-bold text-gradient">$18</span>
                      <span className="text-white/30">/mes por canal</span>
                    </div>

                    <div className="space-y-3 mb-8">
                      {pricingFeatures.map((feat, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 text-white/50"
                        >
                          <div className="w-5 h-5 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-3 h-3 text-amber-400" />
                          </div>
                          <span className="text-sm">{feat}</span>
                        </div>
                      ))}
                    </div>

                    <a
                      href="https://app.withmia.com"
                      className="group/btn relative w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_50px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
                      <span className="relative flex items-center gap-2">
                        Comenzar prueba gratis
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                    </a>
                    <p className="text-xs text-white/20 text-center mt-4">
                      No requiere tarjeta de crédito
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            TRUST — Indicators strip
            ══════════════════════════════════════════════════ */}
        <Reveal>
          <section className="py-8 border-y border-white/[0.04]">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
                {[
                  { icon: Shield, text: "Sin permanencia" },
                  { icon: Headphones, text: "Soporte prioritario" },
                  { icon: Zap, text: "Setup en 10 minutos" },
                  { icon: Target, text: "Pensado para PYMEs" },
                  { icon: CheckCircle2, text: "Sin tarjeta requerida" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/20">
                    <item.icon className="w-3.5 h-3.5 text-amber-400/30" />
                    <span className="text-[11px] tracking-wide">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

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
