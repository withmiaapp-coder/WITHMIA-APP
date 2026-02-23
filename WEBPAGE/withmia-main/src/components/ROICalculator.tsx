import { useState } from "react";
import { Calculator, DollarSign, TrendingUp, Clock } from "lucide-react";

export const ROICalculator = () => {
  const [leads, setLeads] = useState(100);
  const [avgTicket, setAvgTicket] = useState(50);
  const [responseTime, setResponseTime] = useState(6);

  // Conversion rates based on response time research
  const currentConversion = responseTime > 5 ? 0.03 : responseTime > 1 ? 0.08 : 0.15;
  const miaConversion = 0.21; // <1 min response = up to 391% increase
  const currentRevenue = leads * currentConversion * avgTicket;
  const miaRevenue = leads * miaConversion * avgTicket;
  const additionalRevenue = miaRevenue - currentRevenue;
  const roi = Math.round((additionalRevenue / 18) * 100); // $18/month plan

  const formatCurrency = (n: number) =>
    "$" + Math.round(n).toLocaleString("es-CL");

  return (
    <section className="py-14 px-4 relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium">
            <Calculator className="w-4 h-4" />
            Calculadora de ROI
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            ¿Cuánto dinero estás{" "}
            <span className="text-gradient">dejando en la mesa</span>?
          </h2>
          <p className="text-base text-white/50 max-w-xl mx-auto">
            Ajusta los valores a tu negocio y descubre el impacto real.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sliders */}
          <div className="space-y-6 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            {/* Leads per month */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Leads mensuales</span>
                <span className="text-white font-bold">{leads}</span>
              </div>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={leads}
                onChange={(e) => setLeads(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(245,158,11,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>10</span>
                <span>1,000</span>
              </div>
            </div>

            {/* Avg ticket */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Ticket promedio (USD)</span>
                <span className="text-white font-bold">${avgTicket}</span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={avgTicket}
                onChange={(e) => setAvgTicket(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-violet-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(139,92,246,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>$10</span>
                <span>$500</span>
              </div>
            </div>

            {/* Response time */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Tiempo de respuesta actual (hrs)</span>
                <span className="text-white font-bold">{responseTime}h</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={24}
                step={0.5}
                value={responseTime}
                onChange={(e) => setResponseTime(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(34,211,238,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>0.5h</span>
                <span>24h</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-5">
            {/* Current revenue */}
            <div className="p-4 rounded-xl bg-red-500/[0.05] border border-red-500/15 space-y-1">
              <div className="flex items-center gap-2 text-xs text-red-400">
                <Clock className="w-4 h-4" />
                Ingresos actuales estimados
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(currentRevenue)}
                <span className="text-xs text-white/30 font-normal ml-2">/mes</span>
              </p>
              <p className="text-xs text-white/30">
                Con {(currentConversion * 100).toFixed(0)}% de conversión ({responseTime}h de respuesta)
              </p>
            </div>

            {/* MIA revenue */}
            <div className="p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15 space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                Ingresos con WITHMIA
              </div>
              <p className="text-2xl font-bold text-gradient">
                {formatCurrency(miaRevenue)}
                <span className="text-xs text-white/30 font-normal ml-2">/mes</span>
              </p>
              <p className="text-xs text-white/30">
                Con 21% de conversión (&lt;1 min de respuesta)
              </p>
            </div>

            {/* Additional revenue highlight */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 space-y-1 shimmer-border">
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <DollarSign className="w-4 h-4" />
                Ingresos adicionales con WITHMIA
              </div>
              <p className="text-3xl font-extrabold text-white">
                +{formatCurrency(additionalRevenue)}
                <span className="text-xs text-white/30 font-normal ml-2">/mes</span>
              </p>
              <p className="text-xs text-amber-400/60">
                ROI de {roi.toLocaleString("es-CL")}% sobre el costo del plan
              </p>
            </div>

            <a
              href="https://app.withmia.com"
              className="block"
            >
              <button className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold text-sm shadow-[0_4px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_35px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-300">
                Capturar esos ingresos →
              </button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
