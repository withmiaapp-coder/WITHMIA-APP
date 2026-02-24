import { Rocket, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { trackCTAClick } from "@/lib/analytics";

const milestones = [
  {
    day: "Día 1",
    title: "Crea tu cuenta",
    description: "Regístrate gratis, conecta tu primer canal (WhatsApp, Instagram o Web) y configura tu perfil de negocio.",
    highlight: "10 minutos",
    status: "completed" as const,
  },
  {
    day: "Día 2-3",
    title: "Entrena a WITHMIA",
    description: "Sube tu catálogo, FAQs y políticas. WITHMIA los procesa y aprende todo sobre tu negocio automáticamente.",
    highlight: "Sin código",
    status: "completed" as const,
  },
  {
    day: "Semana 1",
    title: "Primeras conversaciones",
    description: "WITHMIA empieza a atender clientes reales. Tú supervisas y ajustas respuestas desde el panel.",
    highlight: "100% supervisado",
    status: "completed" as const,
  },
  {
    day: "Semana 2",
    title: "Automatización completa",
    description: "WITHMIA maneja el 80% de consultas sola. Solo te escala las que requieren intervención humana.",
    highlight: "80% automático",
    status: "current" as const,
  },
  {
    day: "Semana 3",
    title: "Más canales conectados",
    description: "Agregas Facebook, Email, Chat Web. Todos los canales en una sola bandeja con CRM integrado.",
    highlight: "Omnicanal",
    status: "upcoming" as const,
  },
  {
    day: "Mes 1",
    title: "Resultados medibles",
    description: "Dashboard con métricas reales: tiempo de respuesta, conversiones, satisfacción y ROI de WITHMIA.",
    highlight: "ROI positivo",
    status: "upcoming" as const,
  },
];

export const Timeline = () => {
  return (
    <section className="py-14 px-4 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-sm text-orange-400 font-medium">
            <Rocket className="w-4 h-4" />
            Tu Primer Mes
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            De cero a{" "}
            <span className="text-gradient">automático</span>{" "}
            en 30 días
          </h2>
          <p className="text-base text-white/50 max-w-xl mx-auto">
            No necesitas equipo técnico. Este es el camino real que siguen nuestros clientes.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/40 via-orange-500/20 to-transparent md:-translate-x-px" />

          <div className="space-y-8">
            {milestones.map((m, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div key={i} className="relative">
                  {/* Desktop layout */}
                  <div className="hidden md:grid md:grid-cols-2 gap-8 items-center">
                    {/* Left content */}
                    <div className={`${isLeft ? "" : "order-2"}`}>
                      <div
                        className={`p-6 rounded-2xl transition-all duration-300 ${
                          m.status === "current"
                            ? "bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.08] border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.08)]"
                            : "bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]"
                        } ${isLeft ? "text-right" : "text-left"}`}
                      >
                        <div className={`flex items-center gap-2 mb-2 ${isLeft ? "justify-end" : ""}`}>
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
                        <p className="text-xs text-white/40">{m.description}</p>
                      </div>
                    </div>

                    {/* Right spacer */}
                    <div className={isLeft ? "order-2" : ""} />
                  </div>

                  {/* Dot on line - desktop */}
                  <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      m.status === "completed"
                        ? "bg-emerald-500/20 border-emerald-500/40"
                        : m.status === "current"
                        ? "bg-amber-500/20 border-amber-500/40"
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
                    {/* Dot on line - mobile */}
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
                    {/* Content */}
                    <div
                      className={`flex-1 p-5 rounded-2xl ${
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
                      <p className="text-xs text-white/40">{m.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <a
            href="https://app.withmia.com"
            onClick={() => trackCTAClick("empezar_dia1", "timeline")}
          >
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold text-sm shadow-[0_4px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_35px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-300">
              Empezar mi Día 1
              <ArrowRight className="w-4 h-4" />
            </button>
          </a>
        </div>
      </div>
    </section>
  );
};
