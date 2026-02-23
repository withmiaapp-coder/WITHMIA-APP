import { useState } from "react";
import {
  Stethoscope,
  ShoppingCart,
  Building2,
  Dumbbell,
  GraduationCap,
  Utensils,
  MessageSquare,
  Calendar,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";

interface UseCase {
  industry: string;
  icon: typeof Stethoscope;
  color: string;
  bg: string;
  border: string;
  scenarios: {
    title: string;
    description: string;
    icon: typeof MessageSquare;
  }[];
  result: string;
}

const useCases: UseCase[] = [
  {
    industry: "Salud & Odontología",
    icon: Stethoscope,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    scenarios: [
      {
        title: "Agendamiento automático",
        description: "Pacientes agendan citas 24/7 directo desde WhatsApp. WITHMIA valida horarios, confirma y recuerda.",
        icon: Calendar,
      },
      {
        title: "Seguimiento post-consulta",
        description: "Envía instrucciones, recuerda medicamentos y recopila feedbacks automáticamente.",
        icon: MessageSquare,
      },
      {
        title: "Gestión de cancelaciones",
        description: "Cuando alguien cancela, WITHMIA ofrece la hora a pacientes en lista de espera al instante.",
        icon: Users,
      },
    ],
    result: "+182% citas agendadas · -60% no-shows",
  },
  {
    industry: "E-commerce & Retail",
    icon: ShoppingCart,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    scenarios: [
      {
        title: "Asesor de ventas 24/7",
        description: "Recomienda productos, compara opciones y guía al cliente hasta el checkout.",
        icon: MessageSquare,
      },
      {
        title: "Recuperación de carritos",
        description: "Detecta abandonos y envía mensajes personalizados con incentivos para completar compra.",
        icon: ShoppingCart,
      },
      {
        title: "Tracking de pedidos",
        description: "Responde estado de envío, gestiona cambios y resuelve problemas de entrega.",
        icon: BarChart3,
      },
    ],
    result: "+45% conversión · -80% consultas repetitivas",
  },
  {
    industry: "Inmobiliaria",
    icon: Building2,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    scenarios: [
      {
        title: "Calificación de leads",
        description: "Filtra interesados por presupuesto, zona y tipo de propiedad antes de pasarlos al corredor.",
        icon: Users,
      },
      {
        title: "Visitas programadas",
        description: "Coordina horarios de visita entre compradores y corredores automáticamente.",
        icon: Calendar,
      },
      {
        title: "Info de propiedades",
        description: "Envía fichas, fotos, planos y precios de propiedades que coinciden con lo que busca el cliente.",
        icon: MessageSquare,
      },
    ],
    result: "-70% tiempo en leads fríos · +3x propiedades mostradas",
  },
  {
    industry: "Fitness & Bienestar",
    icon: Dumbbell,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    scenarios: [
      {
        title: "Inscripción de alumnos",
        description: "Desde la primera consulta hasta el pago de membresía, todo automatizado por WhatsApp.",
        icon: Users,
      },
      {
        title: "Horarios y disponibilidad",
        description: "Responde disponibilidad de clases, instructores y planes en tiempo real.",
        icon: Calendar,
      },
      {
        title: "Retención de miembros",
        description: "Detecta inactividad y envía mensajes motivacionales personalizados para recuperar asistentes.",
        icon: MessageSquare,
      },
    ],
    result: "+35% retención · 24/7 atención sin staff adicional",
  },
  {
    industry: "Educación",
    icon: GraduationCap,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    scenarios: [
      {
        title: "Admisiones automatizadas",
        description: "Responde a prospectos, envía brochures y agenda entrevistas de forma autónoma.",
        icon: MessageSquare,
      },
      {
        title: "Soporte estudiantil",
        description: "Resuelve dudas sobre horarios, notas, trámites y requisitos sin intervención humana.",
        icon: Users,
      },
      {
        title: "Comunicación masiva",
        description: "Envía recordatorios de matrículas, eventos y fechas importantes por WhatsApp.",
        icon: Calendar,
      },
    ],
    result: "+50% admissions rate · -90% consultas repetitivas",
  },
  {
    industry: "Gastronomía",
    icon: Utensils,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    scenarios: [
      {
        title: "Reservas automáticas",
        description: "Gestiona reservas, confirma mesas y envía el menú del día por WhatsApp.",
        icon: Calendar,
      },
      {
        title: "Pedidos por chat",
        description: "Toma pedidos de delivery o para llevar directamente desde la conversación.",
        icon: ShoppingCart,
      },
      {
        title: "Feedback y reseñas",
        description: "Solicita opiniones después de cada visita y gestiona reclamos en privado.",
        icon: MessageSquare,
      },
    ],
    result: "+40% reservas · Pedidos sin apps de terceros",
  },
];

export const UseCases = () => {
  const [activeTab, setActiveTab] = useState(0);
  const current = useCases[activeTab];

  return (
    <section className="py-14 px-4 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold animate-fade-in backdrop-blur-sm">
            <div className="relative">
              <Sparkles className="w-4 h-4" />
              <Sparkles className="w-4 h-4 absolute inset-0 animate-ping opacity-30" />
            </div>
            Casos de Uso
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Una IA,{" "}
            <span className="text-gradient">todas las industrias</span>
          </h2>
          <p className="text-base text-white/50 max-w-xl mx-auto">
            WITHMIA se adapta a tu negocio, no al revés.
          </p>
        </div>

        {/* Industry tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {useCases.map((uc, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                i === activeTab
                  ? `${uc.bg} ${uc.border} border ${uc.color}`
                  : "bg-white/[0.02] border border-white/[0.06] text-white/40 hover:bg-white/[0.04] hover:text-white/60"
              }`}
            >
              <uc.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{uc.industry}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {current.scenarios.map((scenario, i) => (
            <div
              key={`${activeTab}-${i}`}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group"
              style={{ animation: `fadeInUp 0.4s ease ${i * 0.1}s both` }}
            >
              <div
                className={`w-10 h-10 rounded-xl ${current.bg} ${current.border} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <scenario.icon className={`w-5 h-5 ${current.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {scenario.title}
              </h3>
              <p className="text-sm text-white/40 leading-relaxed">
                {scenario.description}
              </p>
            </div>
          ))}
        </div>

        {/* Result banner */}
        <div className="text-center p-5 rounded-2xl bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.06] border border-amber-500/15">
          <p className="text-sm text-white/40 mb-1">Resultados típicos en {current.industry}:</p>
          <p className="text-lg font-bold text-gradient">{current.result}</p>
        </div>
      </div>
    </section>
  );
};
