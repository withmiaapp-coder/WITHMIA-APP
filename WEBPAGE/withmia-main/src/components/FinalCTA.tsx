import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const FinalCTA = () => {
  return (
    <section className="py-10 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="glass-card-strong p-8 md:p-12 rounded-3xl relative overflow-hidden shimmer-border">
          {/* Animated background blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl animate-gas" style={{ animationDuration: '15s' }} />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] rounded-full bg-gradient-to-tr from-amber-200/30 to-transparent blur-3xl animate-gas" style={{ animationDuration: '18s', animationDelay: '3s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-200/15 to-transparent blur-3xl" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/10 shadow-[var(--shadow-xs)]">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-white/70">14 días gratis</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold leading-tight text-white">
              ¿Listo para dejar de perder{" "}
              <span className="text-gradient">ventas por responder tarde</span>?
            </h2>

            <p className="text-base text-white/50 max-w-xl mx-auto">
              Cientos de negocios ya automatizaron su atención con WITHMIA.
              Tu competencia no duerme — tu negocio tampoco debería.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a href="https://app.withmia.com">
                <Button variant="hero" size="default" className="text-sm px-6 py-3">
                  Comenzar gratis ahora
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
              <a href="/contacto">
                <Button variant="glass" size="default" className="text-sm">
                  Hablar con un experto
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
              <span className="text-sm text-white/40">✓ Sin tarjeta de crédito</span>
              <span className="text-sm text-white/40">✓ Setup en 5 minutos</span>
              <span className="text-sm text-white/40">✓ Cancela cuando quieras</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
