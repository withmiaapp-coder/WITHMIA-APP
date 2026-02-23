import { X, Check, ArrowRight, Clock, MessageSquare, TrendingDown, TrendingUp, Zap, Users } from "lucide-react";

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

export const BeforeAfter = () => {
  return (
    <section className="py-14 px-4 relative overflow-hidden">
      {/* Decorative center divider glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[60%] bg-gradient-to-b from-transparent via-amber-500/30 to-transparent hidden lg:block" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">La diferencia</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Sin WITH<span className="font-bold">MIA</span> <span className="text-white/30">vs</span>{" "}
            <span className="text-gradient">Con WITH<span className="font-bold">MIA</span></span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* BEFORE */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-medium mb-4">
              <X className="w-4 h-4" />
              Sin WITH<span className="font-bold">MIA</span>
            </div>
            {beforeItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="group flex items-start gap-4 p-5 rounded-2xl bg-red-500/[0.04] border border-red-500/10 hover:border-red-500/20 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="mt-0.5 p-2.5 rounded-xl bg-red-500/10 shrink-0">
                    <Icon className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{item.text}</p>
                    <p className="text-sm text-white/40">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AFTER */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium mb-4">
              <Check className="w-4 h-4" />
              Con WITH<span className="font-bold">MIA</span>
            </div>
            {afterItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="group flex items-start gap-4 p-5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/10 hover:border-emerald-500/20 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${i * 100 + 200}ms` }}
                >
                  <div className="mt-0.5 p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{item.text}</p>
                    <p className="text-sm text-white/40">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14">
          <a href="https://app.withmia.com">
            <button className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold shadow-[0_4px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_35px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-300">
              Quiero el después
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </a>
        </div>
      </div>
    </section>
  );
};
