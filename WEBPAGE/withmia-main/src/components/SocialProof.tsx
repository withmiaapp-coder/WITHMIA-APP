import { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, MessageSquare, Clock, Globe, Award, Sparkles } from "lucide-react";

interface Counter {
  icon: typeof TrendingUp;
  value: number;
  suffix: string;
  label: string;
  color: string;
}

const counters: Counter[] = [
  { icon: MessageSquare, value: 850000, suffix: "+", label: "Mensajes procesados", color: "text-amber-400" },
  { icon: Users, value: 2400, suffix: "+", label: "Negocios activos", color: "text-violet-400" },
  { icon: Clock, value: 0.8, suffix: "s", label: "Tiempo de respuesta promedio", color: "text-cyan-400" },
  { icon: Globe, value: 12, suffix: "", label: "Países en LATAM", color: "text-emerald-400" },
  { icon: TrendingUp, value: 97, suffix: "%", label: "Tasa de satisfacción", color: "text-pink-400" },
  { icon: Award, value: 4.9, suffix: "/5", label: "Calificación promedio", color: "text-orange-400" },
];

const logos = [
  "SmileDent", "UrbanShop", "PropMax", "FitZone", "EduPlus",
  "GastroBar", "AutoFleet", "TechSolutions", "Retail Plus", "Digital Growth",
  "MedCenter", "PetCare", "LegalPro", "FoodExpress", "StyleHub",
];

function AnimatedCounter({
  target,
  suffix,
  isVisible,
}: {
  target: number;
  suffix: string;
  isVisible: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isVisible, target]);

  const display =
    target >= 1000
      ? Math.round(count).toLocaleString("es-CL")
      : target < 10
      ? count.toFixed(1)
      : Math.round(count).toString();

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export const SocialProof = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-14 px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-amber-500/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/[0.03] blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold animate-fade-in backdrop-blur-sm">
            <div className="relative">
              <Sparkles className="w-4 h-4" />
              <Sparkles className="w-4 h-4 absolute inset-0 animate-ping opacity-30" />
            </div>
            Impacto Real
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Los números{" "}
            <span className="text-gradient">hablan solos</span>
          </h2>
        </div>

        {/* Counters grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          {counters.map((counter, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group"
            >
              <counter.icon
                className={`w-6 h-6 ${counter.color} mx-auto mb-3 group-hover:scale-110 transition-transform`}
              />
              <p className="text-xl md:text-2xl font-extrabold text-white mb-1">
                <AnimatedCounter
                  target={counter.value}
                  suffix={counter.suffix}
                  isVisible={isVisible}
                />
              </p>
              <p className="text-xs text-white/40">{counter.label}</p>
            </div>
          ))}
        </div>

        {/* Client logos */}
        <div className="space-y-6">
          <p className="text-center text-sm text-white/30 font-medium tracking-wider uppercase">
            Confían en WITHMIA
          </p>
          <div className="relative overflow-hidden">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            {/* Scrolling logos */}
            <div className="flex animate-scroll-x gap-8 items-center">
              {[...logos, ...logos, ...logos].map((logo, i) => (
                <div
                  key={i}
                  className="shrink-0 px-6 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/20 text-sm font-semibold tracking-wide whitespace-nowrap hover:text-white/40 hover:border-white/10 transition-all"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust statement */}
        <div className="mt-14 text-center">
          <p className="text-white/30 text-sm max-w-lg mx-auto leading-relaxed">
            Desde startups hasta empresas con miles de clientes, WITHMIA escala contigo sin importar el volumen de conversaciones.
          </p>
        </div>
      </div>
    </section>
  );
};
