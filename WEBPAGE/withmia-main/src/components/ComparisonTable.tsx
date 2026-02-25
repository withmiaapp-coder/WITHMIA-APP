import { Check, X, Minus, ArrowRight, Shield, Crown, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trackCTAClick } from "@/lib/analytics";

/* ═══════════════════════════════════════
   Data
   ═══════════════════════════════════════ */
type Status = "full" | "partial" | "none";

const features = [
  "Respuesta inteligente con IA",
  "Omnicanal (WhatsApp, IG, FB, Web, Email)",
  "CRM integrado",
  "Agenda citas automáticamente",
  "Aprende del negocio (RAG)",
  "Setup en menos de 10 minutos",
  "Escalamiento a humano",
  "Analítica conversacional",
  "Multi-idioma automático",
  "Precio accesible para PyMEs",
];

const brands: { key: string; label: string; sub: string; highlight: boolean; scores: Status[] }[] = [
  {
    key: "withmia", label: "WITHMIA", sub: "IA conversacional todo-en-uno", highlight: true,
    scores: ["full","full","full","full","full","full","full","full","full","full"],
  },
  {
    key: "vambe", label: "Vambe", sub: "IA + WhatsApp multiagente", highlight: false,
    scores: ["full","full","full","full","full","partial","full","full","partial","none"],
  },
  {
    key: "zendesk", label: "Zendesk", sub: "Help desk empresarial", highlight: false,
    scores: ["partial","full","full","none","none","none","full","full","partial","none"],
  },
  {
    key: "tidio", label: "Tidio", sub: "Live chat + chatbot", highlight: false,
    scores: ["partial","partial","none","none","none","full","full","partial","partial","partial"],
  },
];

const getScore = (scores: Status[]) => scores.filter((s) => s === "full").length;

/* ═══════════════════════════════════════
   Status icon
   ═══════════════════════════════════════ */
const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "full")
    return (
      <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
        <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
      </div>
    );
  if (status === "partial")
    return (
      <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center">
        <Minus className="w-4 h-4 text-amber-400" strokeWidth={3} />
      </div>
    );
  return (
    <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
      <X className="w-4 h-4 text-red-400/60" strokeWidth={3} />
    </div>
  );
};

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */
export const ComparisonTable = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-10 md:py-14 px-4 relative overflow-hidden">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className={`text-center mb-10 transition-all duration-700 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-amber-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            Comparativa con competidores reales
          </div>
          <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-4">
            WITHMIA vs. la competencia
            <br className="hidden md:block" />
            <span className="text-gradient"> real del mercado</span>
          </h2>
          <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto leading-relaxed">
            Comparación honesta con plataformas reales. Sin letra chica.
          </p>
        </div>

        {/* ══════════════════════════════
           Desktop — pure CSS grid
           ══════════════════════════════ */}
        <div className={`hidden md:block transition-all duration-700 delay-200 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="rounded-2xl overflow-hidden border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.015)" }}>

            {/* Header row */}
            <div className="grid grid-cols-[1fr,repeat(4,minmax(0,1fr))]">
              <div className="py-4 px-5 text-[12px] font-medium text-white/25 uppercase tracking-wider flex items-end">
                Funcionalidad
              </div>
              {brands.map((b) => (
                <div
                  key={b.key}
                  className={`py-4 px-3 flex flex-col items-center text-center gap-1 ${
                    b.highlight
                      ? "bg-amber-500/[0.04] border-x border-t border-amber-500/10 rounded-t-xl -mt-px"
                      : ""
                  }`}
                >
                  {b.highlight && (
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase mb-1"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }}
                    >
                      <Crown className="w-2.5 h-2.5" />
                      Recomendado
                    </div>
                  )}
                  <span className={`text-[13px] font-bold ${b.highlight ? "text-amber-400" : "text-white/55"}`}>
                    {b.label}
                  </span>
                  <span className="text-[10px] text-white/20 leading-tight">{b.sub}</span>
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {features.map((feat, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr,repeat(4,minmax(0,1fr))] border-t border-white/[0.04] group hover:bg-white/[0.01] transition-colors"
              >
                <div className="py-3.5 px-5 text-[13px] text-white/50 group-hover:text-white/65 transition-colors font-medium flex items-center">
                  {feat}
                </div>
                {brands.map((b) => (
                  <div
                    key={b.key}
                    className={`py-3.5 px-3 flex items-center justify-center ${
                      b.highlight ? "bg-amber-500/[0.04] border-x border-amber-500/10" : ""
                    }`}
                  >
                    <StatusIcon status={b.scores[i]} />
                  </div>
                ))}
              </div>
            ))}

            {/* Score row */}
            <div className="grid grid-cols-[1fr,repeat(4,minmax(0,1fr))] border-t border-white/[0.06]">
              <div className="py-5 px-5 text-[11px] font-semibold text-white/20 uppercase tracking-wider flex items-center">
                Puntuación
              </div>
              {brands.map((b) => {
                const score = getScore(b.scores);
                const pct = (score / 10) * 100;
                return (
                  <div
                    key={b.key}
                    className={`py-5 px-4 flex flex-col items-center gap-2 ${
                      b.highlight ? "bg-amber-500/[0.04] border-x border-b border-amber-500/10 rounded-b-xl -mb-px" : ""
                    }`}
                  >
                    <span className={`text-lg font-bold font-mono tabular-nums ${b.highlight ? "text-amber-400" : "text-white/35"}`}>
                      {score}/10
                    </span>
                    <div className="w-full max-w-[80px] h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: vis ? `${pct}%` : "0%",
                          background: b.highlight
                            ? "linear-gradient(90deg, #f59e0b, #f97316)"
                            : "rgba(255,255,255,0.12)",
                          transitionDelay: "400ms",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-5">
            {[
              { icon: <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />, label: "Incluido", bg: "bg-emerald-500/15" },
              { icon: <Minus className="w-3 h-3 text-amber-400" strokeWidth={3} />, label: "Parcial", bg: "bg-amber-500/15" },
              { icon: <X className="w-3 h-3 text-red-400/60" strokeWidth={3} />, label: "No incluido", bg: "bg-red-500/10" },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-4.5 h-4.5 rounded-full ${l.bg} flex items-center justify-center`}>{l.icon}</div>
                <span className="text-[10px] text-white/25 font-medium">{l.label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[9px] text-white/10 mt-2 font-mono">
            Basado en funcionalidades públicas de cada plataforma · Febrero 2026
          </p>
        </div>

        {/* ══════════════════════════════
           Mobile
           ══════════════════════════════ */}
        <div className={`md:hidden space-y-2.5 transition-all duration-700 delay-200 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {features.map((feat, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl space-y-2.5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-[13px] text-white/75 font-medium">{feat}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {brands.map((b) => (
                  <div
                    key={b.key}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
                      b.highlight
                        ? "bg-amber-500/[0.06] border border-amber-500/15"
                        : "bg-white/[0.02] border border-white/[0.04]"
                    }`}
                  >
                    <StatusIcon status={b.scores[i]} />
                    <span className={b.highlight ? "text-amber-400 font-semibold" : "text-white/40"}>
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Mobile scores */}
          <div className="p-4 rounded-xl mt-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-3">Puntuación</p>
            <div className="space-y-2.5">
              {brands.map((b) => {
                const score = getScore(b.scores);
                return (
                  <div key={b.key} className="flex items-center gap-3">
                    <span className={`text-[11px] font-medium w-16 ${b.highlight ? "text-amber-400" : "text-white/35"}`}>
                      {b.label}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: vis ? `${(score / 10) * 100}%` : "0%",
                          background: b.highlight ? "linear-gradient(90deg, #f59e0b, #f97316)" : "rgba(255,255,255,0.12)",
                          transitionDelay: "600ms",
                        }}
                      />
                    </div>
                    <span className={`text-[11px] font-bold font-mono ${b.highlight ? "text-amber-400" : "text-white/25"}`}>
                      {score}/10
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className={`text-center mt-12 transition-all duration-700 delay-500 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.06]">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
            </div>
            <span className="text-[11px] text-white/40 font-medium ml-1">10/10 funcionalidades cubiertas</span>
          </div>
          <div className="block">
            <a href="https://app.withmia.com" onClick={() => trackCTAClick("empieza_gratis_comparacion", "comparison")} className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)]">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative">Empieza gratis — 14 días sin compromiso</span>
                <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
