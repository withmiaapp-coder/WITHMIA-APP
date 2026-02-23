import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Crea tu cuenta",
    description: "Regístrate en menos de 2 minutos. Sin tarjeta de crédito, sin compromiso.",
  },
  {
    number: "02",
    title: "Conecta tus canales",
    description: "WhatsApp, Instagram, Messenger, web chat, email — conecta los que uses en pocos clics.",
  },
  {
    number: "03",
    title: "Empieza a vender más",
    description: "Tu asistente IA responde al instante, califica leads y agenda citas automáticamente.",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-14 px-4" id="como-funciona">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">Cómo funciona</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Activa tu asistente en minutos
          </h2>
          <p className="text-base text-white/50 max-w-xl mx-auto">
            Tres pasos para dejar de perder oportunidades.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-6 mb-12 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-14 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-amber-300 via-violet-300 to-cyan-300" />

          {steps.map((step, index) => (
            <div
              key={index}
              className="relative text-center space-y-5 animate-fade-in"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              {/* Number circle */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/[0.06] border-2 border-white/[0.06] shadow-[var(--shadow-md)] text-2xl font-bold text-white relative z-10 shimmer-border">
                {step.number}
              </div>

              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="text-white/50 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href="https://app.withmia.com">
            <Button variant="hero" size="lg">
              Comenzar gratis
              <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </a>
          <p className="text-sm text-white/40 mt-4">
            Sin tarjeta de crédito · 14 días gratis
          </p>
        </div>
      </div>
    </section>
  );
};
