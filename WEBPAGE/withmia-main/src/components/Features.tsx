import { MessageSquare, Zap, BarChart3, Shield, Clock, Users } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Omnicanal integrado",
    description: "WhatsApp, web, redes sociales y email en un solo lugar. Sin cambiar de plataforma.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Zap,
    title: "IA conversacional",
    description: "Respuestas automáticas con contexto real del cliente. No es un bot genérico.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics en tiempo real",
    description: "Métricas de conversión, tiempos de respuesta y rendimiento por canal.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Clock,
    title: "Atención 24/7",
    description: "Tu negocio nunca duerme. Cada lead recibe respuesta inmediata, siempre.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Users,
    title: "CRM integrado",
    description: "Pipeline visual, etiquetas, notas y seguimiento desde la misma plataforma.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "Seguro y confiable",
    description: "Datos protegidos con encriptación de nivel empresarial. Cumplimiento GDPR.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

export const Features = () => {
  return (
    <section className="py-14 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">Plataforma</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Todo lo que necesitas para vender más
          </h2>
          <p className="text-base text-white/50 max-w-xl mx-auto">
            Una sola herramienta reemplaza tu stack fragmentado.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="glass-card rounded-2xl p-8 group hover:shadow-[var(--shadow-elegant)] hover:-translate-y-1 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mb-5">
                  <div className={`inline-flex p-3 rounded-xl ${feature.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
