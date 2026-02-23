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

/* ─── Síntomas de operación obsoleta ─── */
const boomerSymptoms = [
  { text: "Respondes WhatsApp desde tu celular personal", icon: MessageCircle },
  { text: "Tu 'CRM' es un Excel con 47 pestañas", icon: BarChart3 },
  { text: "Los leads del fin de semana se contestan el lunes", icon: Calendar },
  { text: "Tu equipo copia y pega la misma respuesta 50 veces al día", icon: Users },
  { text: "Pagas por anuncios pero nadie contesta los mensajes", icon: DollarSign },
  { text: "Si alguien falta, ese canal queda muerto", icon: PhoneOff },
];

const painPoints = [
  {
    label: "Así se sentía tu competencia... antes de automatizar",
    headline: "Canales\nfragmentados",
    description: "WhatsApp por un lado, Instagram por otro, el correo olvidado. Tu equipo salta entre 5 apps mientras el cliente se aburre de esperar.",
    icon: MessageCircle, color: "#f59e0b",
    stat: "73%", statLabel: "usa 3+ canales sin integrar",
    consequences: ["Historial perdido entre canales", "Respuestas duplicadas o contradictorias", "Cero visibilidad de métricas"],
    oldWay: "📋 Cuaderno + WhatsApp personal",
    newWay: "🤖 Bandeja unificada con IA",
  },
  {
    label: "El ahorro que crees tener te cuesta el triple",
    headline: "Herramientas\nque no escalan",
    description: "'Para qué pagar si lo hago yo mismo'. Sí, y por eso pierdes 40% de tus leads mientras tu competencia los cierra en 5 segundos.",
    icon: DollarSign, color: "#f43f5e",
    stat: "$500+", statLabel: "USD/mes en soluciones enterprise",
    consequences: ["Perder leads = perder plata real", "Tiempo invertido que no escala", "Tu competencia ya automatizó"],
    oldWay: "💸 'Lo hago yo, es gratis'",
    newWay: "📈 IA que paga su propio costo",
  },
  {
    label: "Tu negocio duerme mientras tus clientes compran",
    headline: "Atención\n100% manual",
    description: "Son las 11pm, un cliente quiere reservar. Tu teléfono está en silencio. A las 8am ya reservó con otro. Así todos los días.",
    icon: PhoneOff, color: "#a78bfa",
    stat: "6h", statLabel: "respuesta promedio sin IA",
    consequences: ["0 respuestas fuera de horario", "Leads fríos al día siguiente", "Cada empleado nuevo = +$800/mes"],
    oldWay: "😴 'Mañana le contesto'",
    newWay: "⚡ Respuesta en 5 segundos, 24/7",
  },
];



const milestones = [
  { day: "Día 1", title: "Todo listo para operar", description: "Cuenta creada, canales conectados, dashboard activo. Ya eres omnicanal.", highlight: "10 min", icon: Rocket, status: "completed" as const },
  { day: "Día 2-3", title: "Entrena a WITHMIA", description: "Sube catálogo, FAQs y políticas. WITHMIA aprende tu negocio.", highlight: "Sin código", icon: Zap, status: "completed" as const },
  { day: "Semana 1", title: "Primeras conversaciones reales", description: "WITHMIA responde clientes reales. Tú supervisas y afinas el tono.", highlight: "Supervisado", icon: MessageSquare, status: "completed" as const },
  { day: "Semana 2", title: "Automatización al 80%", description: "Resuelve la mayoría sola. Solo escala lo que realmente necesita a un humano.", highlight: "80% auto", icon: TrendingUp, status: "current" as const },
  { day: "Semana 3", title: "Flujos avanzados", description: "Agendamiento, seguimientos post-venta y campañas automáticas activas.", highlight: "Avanzado", icon: Users, status: "upcoming" as const },
  { day: "Mes 1", title: "ROI comprobado", description: "Compara tus métricas: más respuestas, más conversiones, menos tiempo perdido.", highlight: "Resultados", icon: BarChart3, status: "upcoming" as const },
];

const useCases = [
  {
    industry: "Salud & Odontología", icon: Stethoscope, color: "#34d399",
    tagline: "Tu recepcionista virtual que nunca descansa",
    chat: [
      { from: "client", msg: "Hola, necesito una hora para limpieza dental 🦷" },
      { from: "mia", msg: "¡Hola! 😊 Tengo disponibilidad mañana a las 10:00 o 16:30. ¿Cuál prefieres?" },
      { from: "client", msg: "16:30 por favor" },
      { from: "mia", msg: "✅ Listo! Cita agendada para mañana 16:30 con Dra. López. Te envié la dirección y preparaciones por WhatsApp." },
    ],
    features: [
      { icon: Calendar, label: "Agenda citas 24/7" },
      { icon: MessageSquare, label: "Seguimiento post-consulta" },
      { icon: Users, label: "Lista de espera activa" },
    ],
    result: "+182% citas", result2: "-60% no-shows",
  },
  {
    industry: "E-commerce & Retail", icon: ShoppingCart, color: "#a78bfa",
    tagline: "Tu vendedor estrella que atiende a todos a la vez",
    chat: [
      { from: "client", msg: "¿Tienen esta polera en talla M? 👕" },
      { from: "mia", msg: "¡Sí! Disponible en azul y negro. Basado en tu última compra, te recomiendo la azul. ¿La agrego al carrito?" },
      { from: "client", msg: "Dale, la azul" },
      { from: "mia", msg: "✅ Agregada! Total: $19.990. Aquí tu link de pago 👉 Envío gratis por ser cliente frecuente 🎉" },
    ],
    features: [
      { icon: MessageSquare, label: "Vendedor por WhatsApp" },
      { icon: ShoppingCart, label: "Rescate de carritos" },
      { icon: BarChart3, label: "Tracking de pedidos" },
    ],
    result: "+45% conversión", result2: "-80% consultas",
  },
  {
    industry: "Inmobiliaria", icon: Building2, color: "#22d3ee",
    tagline: "Filtra leads reales y agenda visitas automáticamente",
    chat: [
      { from: "client", msg: "Busco depto 2 dormitorios en Providencia, hasta 120M" },
      { from: "mia", msg: "Encontré 3 opciones para ti 🏠 ¿Tienes pre-aprobación hipotecaria?" },
      { from: "client", msg: "Sí, con Banco Estado" },
      { from: "mia", msg: "Perfecto! Te agendé visita mañana 11:00 al depto de Av. Italia. Te envío fotos y ficha técnica 📋" },
    ],
    features: [
      { icon: Users, label: "Pre-califica leads" },
      { icon: Calendar, label: "Coordina visitas" },
      { icon: MessageSquare, label: "Catálogo por chat" },
    ],
    result: "-70% leads fríos", result2: "+3x visitas",
  },
  {
    industry: "Fitness & Bienestar", icon: Dumbbell, color: "#f59e0b",
    tagline: "Más alumnos, menos abandono, cero papeleo",
    chat: [
      { from: "client", msg: "¿Cuánto sale el plan mensual? 💪" },
      { from: "mia", msg: "Plan Full $29.990/mes — incluye todas las clases + acceso libre. ¿Quieres inscribirte?" },
      { from: "client", msg: "Sí, quiero empezar" },
      { from: "mia", msg: "✅ Inscripción lista! Tu primera clase es mañana — Yoga 7:00am. Te envié el link de pago y acceso al gimnasio 🏋️" },
    ],
    features: [
      { icon: Users, label: "Inscripción por chat" },
      { icon: Calendar, label: "Reserva de clases" },
      { icon: MessageSquare, label: "Anti-deserción" },
    ],
    result: "+35% retención", result2: "24/7 sin staff",
  },
  {
    industry: "Educación", icon: GraduationCap, color: "#ec4899",
    tagline: "Matrícula llena, secretaría libre",
    chat: [
      { from: "client", msg: "¿Tienen vacantes para 3° básico? 📚" },
      { from: "mia", msg: "Sí, quedan 4 vacantes. El proceso incluye: formulario + entrevista. ¿Quieres que te envíe los documentos?" },
      { from: "client", msg: "Por favor" },
      { from: "mia", msg: "📄 Enviados! Te agendé entrevista para el jueves 15:00. Recibirás un recordatorio el día anterior." },
    ],
    features: [
      { icon: MessageSquare, label: "Admisiones automáticas" },
      { icon: Users, label: "Soporte estudiantil" },
      { icon: Calendar, label: "Comunicación masiva" },
    ],
    result: "+50% admisión", result2: "-90% consultas",
  },
  {
    industry: "Gastronomía", icon: Utensils, color: "#f97316",
    tagline: "Más mesas llenas, menos llamadas perdidas",
    chat: [
      { from: "client", msg: "Mesa para 4, viernes 21h 🍝" },
      { from: "mia", msg: "¡Reservado! Mesa junto a la ventana. ¿Quieres ver el menú del viernes?" },
      { from: "client", msg: "Sí porfa" },
      { from: "mia", msg: "🍽️ Aquí va! Destacado: Risotto de hongos y Lomo al merlot. Te recuerdo el viernes a las 19h. ¡Buen provecho!" },
    ],
    features: [
      { icon: Calendar, label: "Reservas por WhatsApp" },
      { icon: ShoppingCart, label: "Pedidos sin comisión" },
      { icon: MessageSquare, label: "Feedback inteligente" },
    ],
    result: "+40% reservas", result2: "0% comisión",
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
        <section className="relative">
          <div className="max-w-7xl mx-auto px-6 pt-28 pb-10">
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

              {/* Right — Phone mockup with lost lead (compact) */}
              <Reveal delay={200}>
                <div className="flex justify-center lg:justify-end">
                  <div className="relative w-[220px] sm:w-[240px]">
                    {/* Phone frame */}
                    <div className="relative rounded-[2rem] border-[2.5px] border-white/[0.12] bg-[#0c0c14] shadow-[0_0_60px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.3)] overflow-hidden">
                      
                      {/* Notch / Dynamic Island */}
                      <div className="flex justify-center pt-2 pb-0.5">
                        <div className="w-[70px] h-[20px] rounded-full bg-black border border-white/[0.06]" />
                      </div>

                      {/* Status bar */}
                      <div className="flex items-center justify-between px-5 pb-1.5">
                        <span className="text-[8px] font-semibold text-white/50">10:32</span>
                        <div className="flex items-center gap-1">
                          <div className="flex gap-[1.5px]">
                            {[1,2,3,4].map(b => (
                              <div key={b} className={`w-[2px] rounded-sm ${b <= 3 ? 'bg-white/40' : 'bg-white/15'}`} style={{ height: `${4 + b * 1.5}px` }} />
                            ))}
                          </div>
                          <span className="text-[7px] text-white/30 font-medium">5G</span>
                          <div className="w-[18px] h-[8px] rounded-[2px] border border-white/30 relative">
                            <div className="absolute inset-[1px] right-[4px] rounded-[1px] bg-white/40" />
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp-style chat header */}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a2e]/80 border-y border-white/[0.04]">
                        <div className="text-white/30 text-xs">←</div>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 border border-emerald-500/20 flex items-center justify-center">
                          <span className="text-[10px]">🏪</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-white/80">Tu Negocio</p>
                          <p className="text-[8px] text-white/25">en línea</p>
                        </div>
                        <div className="flex items-center gap-2 text-white/25">
                          <span className="text-[11px]">📞</span>
                          <span className="text-[11px]">⋮</span>
                        </div>
                      </div>

                      {/* Chat body */}
                      <div className="relative bg-[#0b0b15]">
                        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'white\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px' }} />

                        <div className="flex justify-center pt-2.5 pb-1.5">
                          <span className="text-[8px] text-white/20 bg-white/[0.04] px-2.5 py-0.5 rounded-md font-medium">HOY</span>
                        </div>

                        <div className="px-2.5 pb-3 space-y-1">
                          {lostLeadTimeline.map((msg, i) => (
                            <div
                              key={i}
                              className="flex justify-start"
                              style={{ animation: `fadeInUp 0.5s ease ${i * 0.15}s both` }}
                            >
                              <div className={`relative max-w-[85%] px-2.5 py-1.5 rounded-lg rounded-tl-sm text-[10px] leading-snug shadow-sm ${
                                msg.status === "lost"
                                  ? "bg-red-500/[0.12] border border-red-500/15 text-red-200/70"
                                  : msg.status === "waiting"
                                  ? "bg-amber-500/[0.08] border border-amber-500/10 text-amber-100/50"
                                  : "bg-white/[0.06] border border-white/[0.06] text-white/55"
                              }`}>
                                <p>{msg.message}</p>
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[7px] text-white/15">{msg.time}</span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Typing indicator */}
                          <div className="flex justify-end" style={{ animation: 'fadeInUp 0.5s ease 0.9s both' }}>
                            <div className="bg-white/[0.04] border border-white/[0.05] rounded-lg rounded-tr-sm px-3 py-2 flex items-center gap-1">
                              <div className="w-[4px] h-[4px] rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
                              <div className="w-[4px] h-[4px] rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
                              <div className="w-[4px] h-[4px] rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
                            </div>
                          </div>

                          <div className="flex justify-center pt-2" style={{ animation: 'fadeInUp 0.5s ease 1.2s both' }}>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/[0.08] border border-red-500/12">
                              <Ban className="w-2.5 h-2.5 text-red-400/70" />
                              <span className="text-[8px] text-red-300/60 font-semibold tracking-wide">NADIE RESPONDIÓ</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Input bar */}
                      <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[#0c0c14] border-t border-white/[0.04]">
                        <span className="text-white/15 text-xs">😊</span>
                        <div className="flex-1 h-6 rounded-full bg-white/[0.04] border border-white/[0.05] flex items-center px-2.5">
                          <span className="text-[9px] text-white/15">Escribe un mensaje...</span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center">
                          <span className="text-white/15 text-xs">🎤</span>
                        </div>
                      </div>

                      {/* Home indicator */}
                      <div className="flex justify-center py-1.5">
                        <div className="w-[90px] h-[3px] rounded-full bg-white/[0.12]" />
                      </div>
                    </div>

                    {/* Bottom badge */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/[0.08] border border-red-500/12 backdrop-blur-sm shadow-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-[10px] text-red-300/70 font-medium">Pasa el <span className="text-red-400 font-bold">40%</span> de las veces</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            USE CASES — Industry tabs
            ══════════════════════════════════════════════════ */}
        <section className="pt-10 pb-14 relative" id="casos">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold backdrop-blur-sm mb-6">
                  <Sparkles className="w-4 h-4" />
                  Casos de Uso
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
                  Una IA,{" "}
                  <span className="text-gradient">todas las industrias</span>
                </h2>
                <p className="text-white/35 max-w-xl mx-auto">
                  Mira cómo WITHMIA conversa con tus clientes en cada rubro.
                </p>
              </div>
            </Reveal>

            {/* Industry tabs */}
            <Reveal delay={100}>
              <div className="flex flex-wrap justify-center gap-2 mb-10">
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

            {/* Two-column: Chat simulation + Features */}
            <Reveal delay={150}>
              <div
                key={`uc-${activeTab}`}
                className="grid lg:grid-cols-2 gap-6 items-stretch"
                style={{ animation: 'fadeInUp 0.4s ease both' }}
              >
                {/* Left — Chat simulation */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                  {/* Chat header */}
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]" style={{ backgroundColor: `${current.color}08` }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${current.color}15`, border: `1px solid ${current.color}25` }}
                    >
                      <current.icon className="w-4 h-4" style={{ color: current.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white/80">{current.industry}</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-white/30">WITHMIA activa</span>
                      </div>
                    </div>
                  </div>

                  {/* Chat messages */}
                  <div className="p-4 space-y-3 min-h-[260px]">
                    {current.chat.map((msg, i) => (
                      <div
                        key={`${activeTab}-msg-${i}`}
                        className={`flex ${msg.from === 'client' ? 'justify-start' : 'justify-end'}`}
                        style={{ animation: `fadeInUp 0.35s ease ${i * 0.12}s both` }}
                      >
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                          msg.from === 'client'
                            ? 'bg-white/[0.06] border border-white/[0.06] text-white/60 rounded-tl-sm'
                            : 'rounded-tr-sm text-white/80'
                        }`}
                          style={msg.from === 'mia' ? {
                            backgroundColor: `${current.color}12`,
                            border: `1px solid ${current.color}20`,
                          } : undefined}
                        >
                          {msg.from === 'mia' && (
                            <div className="flex items-center gap-1 mb-1">
                              <Sparkles className="w-2.5 h-2.5" style={{ color: current.color }} />
                              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: `${current.color}90` }}>WITHMIA</span>
                            </div>
                          )}
                          {msg.msg}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input bar */}
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
                    <div className="flex-1 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center px-3">
                      <span className="text-[11px] text-white/20">Escribe un mensaje...</span>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${current.color}15` }}>
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: current.color }} />
                    </div>
                  </div>
                </div>

                {/* Right — Features + Metrics */}
                <div className="flex flex-col gap-4">
                  {/* Tagline */}
                  <div className="px-1">
                    <p className="text-lg font-semibold text-white/80 mb-1">{current.tagline}</p>
                    <p className="text-[12px] text-white/25">Lo que WITHMIA hace por ti en {current.industry.toLowerCase()}</p>
                  </div>

                  {/* Feature pills */}
                  <div className="space-y-2.5 flex-1">
                    {current.features.map((feat, i) => (
                      <div
                        key={`${activeTab}-feat-${i}`}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
                        style={{ animation: `fadeInUp 0.35s ease ${i * 0.1 + 0.15}s both` }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                          style={{ backgroundColor: `${current.color}10`, border: `1px solid ${current.color}18` }}
                        >
                          <feat.icon className="w-[18px] h-[18px]" style={{ color: current.color }} />
                        </div>
                        <span className="text-sm font-medium text-white/70">{feat.label}</span>
                        <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color: `${current.color}60` }} />
                      </div>
                    ))}
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="text-center py-4 rounded-xl border"
                      style={{
                        background: `linear-gradient(135deg, ${current.color}08, ${current.color}03)`,
                        borderColor: `${current.color}18`,
                      }}
                    >
                      <p className="text-xl font-bold text-gradient">{current.result}</p>
                      <TrendingUp className="w-3.5 h-3.5 mx-auto mt-1" style={{ color: `${current.color}60` }} />
                    </div>
                    <div
                      className="text-center py-4 rounded-xl border"
                      style={{
                        background: `linear-gradient(135deg, ${current.color}08, ${current.color}03)`,
                        borderColor: `${current.color}18`,
                      }}
                    >
                      <p className="text-xl font-bold text-gradient">{current.result2}</p>
                      <Zap className="w-3.5 h-3.5 mx-auto mt-1" style={{ color: `${current.color}60` }} />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            PROBLEM — Provocative reality-check section
            ══════════════════════════════════════════════════ */}
        <section className="py-14 relative" id="problema">
          <div className="max-w-6xl mx-auto px-6 relative">

            {/* ─── Header ─── */}
            <Reveal>
              <div className="text-center max-w-3xl mx-auto mb-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-500/20 bg-red-500/[0.06] mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-red-400/90 uppercase tracking-widest">Alerta de realidad</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] mb-5">
                  Si tu negocio atiende así,{" "}
                  <br className="hidden sm:block" />
                  <span className="relative inline-block">
                    <span className="text-red-400">ya estás perdiendo clientes</span>
                    <span className="absolute -bottom-1 left-0 w-full h-[3px] rounded-full bg-gradient-to-r from-red-500/60 to-red-500/0" />
                  </span>
                </h2>
                <p className="text-[15px] text-white/40 leading-relaxed max-w-2xl mx-auto">
                  No es opinión, son datos. Mientras lees esto, alguien te escribió y nadie contestó.{" "}
                  <span className="text-red-400/60 font-medium">Ese cliente ya no vuelve.</span>
                </p>
              </div>
            </Reveal>

            {/* ─── Interactive diagnostic checklist ─── */}
            <Reveal delay={100}>
              {(() => {
                const [checked, setChecked] = useState<Set<number>>(new Set());
                const toggle = (i: number) => setChecked(prev => {
                  const next = new Set(prev);
                  next.has(i) ? next.delete(i) : next.add(i);
                  return next;
                });
                const count = checked.size;
                const verdict = count === 0
                  ? { text: "Selecciona los que aplican a tu negocio", color: "text-white/25", bg: "" }
                  : count <= 2
                  ? { text: `${count}/6 — Podría ser peor, pero estás dejando plata en la mesa`, color: "text-amber-400/80", bg: "bg-amber-500/[0.04] border-amber-500/15" }
                  : count <= 4
                  ? { text: `${count}/6 — Tu competencia que automatizó te está quitando clientes ahora mismo`, color: "text-orange-400/90", bg: "bg-orange-500/[0.04] border-orange-500/15" }
                  : { text: `${count}/6 — Tu negocio necesita WITHMIA. Urgente.`, color: "text-red-400", bg: "bg-red-500/[0.06] border-red-500/20" };

                return (
                  <div className="max-w-3xl mx-auto">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center justify-center">
                            <Target className="w-4 h-4 text-red-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white/80">Diagnóstico rápido</p>
                            <p className="text-[11px] text-white/25">¿Cuántos de estos síntomas tiene tu negocio?</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                          count > 0 ? "bg-red-500/[0.08] border-red-500/15" : "bg-transparent border-transparent"
                        }`}>
                          <span className={`text-lg font-black font-mono transition-colors duration-300 ${
                            count > 0 ? "text-red-400" : "text-transparent"
                          }`}>{count || 0}</span>
                          <span className={`text-[10px] font-medium transition-colors duration-300 ${
                            count > 0 ? "text-red-400/60" : "text-transparent"
                          }`}>/6</span>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2.5 mb-6">
                        {boomerSymptoms.map((symptom, i) => {
                          const isChecked = checked.has(i);
                          return (
                            <button
                              key={i}
                              onClick={() => toggle(i)}
                              className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-300 ${
                                isChecked
                                  ? "bg-red-500/[0.06] border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]"
                                  : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03]"
                              }`}
                            >
                              <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                                isChecked
                                  ? "bg-red-500/20 border-red-400/60"
                                  : "border-white/[0.12] bg-transparent"
                              }`}>
                                {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />}
                              </div>
                              <div className="flex items-start gap-2.5 min-w-0">
                                <symptom.icon className={`w-4 h-4 mt-0.5 shrink-0 transition-colors duration-300 ${
                                  isChecked ? "text-red-400/70" : "text-white/15"
                                }`} />
                                <span className={`text-[12.5px] leading-relaxed transition-colors duration-300 ${
                                  isChecked ? "text-white/70" : "text-white/35"
                                }`}>{symptom.text}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dynamic verdict */}
                      <div className={`rounded-xl border px-4 py-3 min-h-[44px] flex items-center justify-center transition-all duration-500 ${
                        count > 0 ? verdict.bg : "border-white/[0.04] bg-white/[0.01]"
                      }`}>
                        <p className={`text-[13px] font-medium text-center transition-colors duration-500 ${verdict.color}`}>
                          {verdict.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Reveal>

            {/* CTA buttons */}
            <Reveal delay={200}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
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
            </Reveal>
          </div>
        </section>


      </main>
      <Footer />
    </div>
  );
};

export default SolucionesPymes;
