import { Check, X, Minus, ArrowRight, Shield, Crown, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════
   Data
   ═══════════════════════════════════════ */
type Status = "full" | "partial" | "none";

interface Row {
  feature: string;
  withmia: Status;
  manual: Status;
  zendesk: Status;
  chatbot: Status;
}

const rows: Row[] = [
  { feature: "Respuesta inteligente con IA", withmia: "full", manual: "none", zendesk: "partial", chatbot: "partial" },
  { feature: "Omnicanal (WhatsApp, IG, FB, Web, Email)", withmia: "full", manual: "none", zendesk: "full", chatbot: "partial" },
  { feature: "CRM integrado", withmia: "full", manual: "none", zendesk: "full", chatbot: "none" },
  { feature: "Agenda citas automáticamente", withmia: "full", manual: "none", zendesk: "none", chatbot: "none" },
  { feature: "Aprende del negocio (RAG)", withmia: "full", manual: "none", zendesk: "none", chatbot: "partial" },
  { feature: "Setup en menos de 10 minutos", withmia: "full", manual: "full", zendesk: "none", chatbot: "partial" },
  { feature: "Escalamiento a humano", withmia: "full", manual: "full", zendesk: "full", chatbot: "none" },
  { feature: "Analítica conversacional", withmia: "full", manual: "none", zendesk: "full", chatbot: "none" },
  { feature: "Multi-idioma automático", withmia: "full", manual: "none", zendesk: "partial", chatbot: "partial" },
  { feature: "Precio accesible para PyMEs", withmia: "full", manual: "partial", zendesk: "none", chatbot: "partial" },
];

const competitors = [
  { key: "withmia" as const, label: "WITHMIA", highlight: true },
  { key: "manual" as const, label: "Manual / WhatsApp Business", highlight: false },
  { key: "zendesk" as const, label: "Zendesk / HubSpot", highlight: false },
  { key: "chatbot" as const, label: "Chatbot genérico", highlight: false },
];

/* ═══════════════════════════════════════
   Status icon (enhanced)
   ═══════════════════════════════════════ */
const StatusIcon = ({ status, animate = false, delay = 0 }: { status: Status; animate?: boolean; delay?: number }) => {
  const [show, setShow] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [animate, delay]);

  const base = `transition-all duration-500 ${show ? "opacity-100 scale-100" : "opacity-0 scale-50"}`;

  if (status === "full")
    return (
      <div className={`w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center ${base}`}>
        <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
      </div>
    );
  if (status === "partial")
    return (
      <div className={`w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center ${base}`}>
        <Minus className="w-4 h-4 text-amber-400" strokeWidth={3} />
      </div>
    );
  return (
    <div className={`w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center ${base}`}>
      <X className="w-4 h-4 text-red-400/60" strokeWidth={3} />
    </div>
  );
};

/* ═══════════════════════════════════════
   Score calculation
   ═══════════════════════════════════════ */
const getScore = (key: "withmia" | "manual" | "zendesk" | "chatbot") =>
  rows.filter((r) => r[key] === "full").length;

/* ═══════════════════════════════════════
   Animated score bar
   ═══════════════════════════════════════ */
const ScoreBar = ({ score, total, highlight, animate }: { score: number; total: number; highlight: boolean; animate: boolean }) => {
  const pct = (score / total) * 100;
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`text-lg font-bold font-mono tabular-nums ${highlight ? "text-amber-400" : "text-white/40"}`}>
        {score}/{total}
      </span>
      <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: animate ? `${pct}%` : "0%",
            background: highlight
              ? "linear-gradient(90deg, #f59e0b, #f97316)"
              : "rgba(255,255,255,0.15)",
            boxShadow: highlight ? "0 0 12px rgba(245,158,11,0.3)" : "none",
            transitionDelay: "400ms",
          }}
        />
      </div>
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={`text-center mb-14 transition-all duration-700 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-amber-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 font-semibold backdrop-blur-sm mb-6 tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            Comparativa objetiva
          </div>
          <h2 className="text-2xl md:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1] mb-4">
            WITHMIA vs. las alternativas
            <br className="hidden md:block" />
            <span className="text-gradient"> que ya conoces</span>
          </h2>
          <p className="text-sm md:text-base text-white/40 max-w-lg mx-auto leading-relaxed">
            Funcionalidades reales, lado a lado. Sin letra chica.
          </p>
        </div>

        {/* ═══ Desktop table ═══ */}
        <div className={`hidden md:block transition-all duration-700 delay-200 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Glass card wrapper */}
          <div
            className="relative rounded-2xl overflow-hidden backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-5 px-6 text-[13px] font-medium text-white/30 w-[280px] bg-white/[0.01]">
                    Funcionalidad
                  </th>
                  {competitors.map((c) => (
                    <th
                      key={c.key}
                      className={`py-5 px-4 text-center relative ${c.highlight ? "" : ""}`}
                      style={c.highlight ? { background: "rgba(245,158,11,0.03)" } : {}}
                    >
                      {/* "Recommended" badge for WITHMIA */}
                      {c.highlight && (
                        <div className="absolute -top-px left-0 right-0 flex justify-center">
                          <div
                            className="flex items-center gap-1.5 px-3 py-1 rounded-b-lg text-[9px] font-bold tracking-widest uppercase"
                            style={{
                              background: "linear-gradient(135deg, #f59e0b, #f97316)",
                              color: "white",
                              boxShadow: "0 4px 15px rgba(245,158,11,0.3)",
                            }}
                          >
                            <Crown className="w-3 h-3" />
                            Recomendado
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-1 pt-3">
                        <span className={`text-[13px] font-semibold ${c.highlight ? "text-amber-400" : "text-white/50"}`}>
                          {c.label}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-white/[0.04] group transition-colors duration-300"
                  >
                    <td className="py-4 px-6 text-[13px] text-white/55 group-hover:text-white/70 transition-colors bg-white/[0.01]">
                      {row.feature}
                    </td>
                    {competitors.map((c) => (
                      <td
                        key={c.key}
                        className="py-4 px-4"
                        style={c.highlight ? { background: "rgba(245,158,11,0.03)" } : {}}
                      >
                        <div className="flex justify-center">
                          <StatusIcon status={row[c.key]} animate={vis} delay={300 + i * 80 + (c.highlight ? 0 : 100)} />
                        </div>
                      </td>
                    ))}
                    {/* Hover glow for row */}
                    <td className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.01), transparent)" }} />
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Score row with animated bars */}
            <div className="border-t border-white/[0.06]">
              <div className="grid grid-cols-[280px,1fr,1fr,1fr,1fr]">
                <div className="py-5 px-6 text-[12px] font-semibold text-white/25 uppercase tracking-wider flex items-center bg-white/[0.01]">
                  Puntuación total
                </div>
                {competitors.map((c) => (
                  <div
                    key={c.key}
                    className="py-5 px-6"
                    style={c.highlight ? { background: "rgba(245,158,11,0.03)" } : {}}
                  >
                    <ScoreBar
                      score={getScore(c.key)}
                      total={10}
                      highlight={c.highlight}
                      animate={vis}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* WITHMIA column shimmer border (left side) */}
            {vis && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: "280px",
                  width: "calc(25% - 70px + 50px)",
                  borderLeft: "1px solid rgba(245,158,11,0.12)",
                  borderRight: "1px solid rgba(245,158,11,0.12)",
                }}
              />
            )}
          </div>
        </div>

        {/* ═══ Mobile cards ═══ */}
        <div className={`md:hidden space-y-3 transition-all duration-700 delay-200 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {rows.map((row, i) => (
            <div
              key={i}
              className="p-4 rounded-xl space-y-3 transition-all duration-500"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                transitionDelay: `${i * 50}ms`,
                opacity: vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(12px)",
              }}
            >
              <p className="text-sm text-white/80 font-medium">{row.feature}</p>
              <div className="grid grid-cols-2 gap-2">
                {competitors.map((c) => (
                  <div
                    key={c.key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      c.highlight
                        ? "border border-amber-500/20"
                        : "border border-white/[0.04]"
                    }`}
                    style={{
                      background: c.highlight ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <StatusIcon status={row[c.key]} />
                    <span className={c.highlight ? "text-amber-400 font-semibold" : "text-white/45"}>
                      {c.label.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Mobile score summary */}
          <div
            className="p-5 rounded-xl mt-6"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-4">Puntuación total</p>
            <div className="space-y-3">
              {competitors.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <span className={`text-xs font-medium w-20 ${c.highlight ? "text-amber-400" : "text-white/40"}`}>
                    {c.label.split(" ")[0]}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: vis ? `${(getScore(c.key) / 10) * 100}%` : "0%",
                        background: c.highlight
                          ? "linear-gradient(90deg, #f59e0b, #f97316)"
                          : "rgba(255,255,255,0.15)",
                        transitionDelay: "600ms",
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold font-mono ${c.highlight ? "text-amber-400" : "text-white/30"}`}>
                    {getScore(c.key)}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={`text-center mt-14 transition-all duration-700 delay-500 ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.06]">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
            </div>
            <span className="text-[11px] text-white/40 font-medium ml-1">10/10 funcionalidades cubiertas</span>
          </div>
          <div className="block">
            <a href="https://app.withmia.com">
              <button className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(245,158,11,0.45)]">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative">Empieza gratis — 14 días sin compromiso</span>
                <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
              </button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
