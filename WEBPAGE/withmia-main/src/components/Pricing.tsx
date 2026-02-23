import { useState, useMemo } from "react";
import { Check, Sparkles, ArrowRight, Minus } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   PRICING LOGIC (mirrors SubscriptionController.php)
   Base: $18/mo (monthly) · $15/mo (annual)
   Extra member: $10/mo (monthly) · $8/mo (annual)
   1st user included in base price
   ═══════════════════════════════════════════════════════════ */

const PRICING = {
  monthly: { base: 18, perMember: 10 },
  annual: { base: 15, perMember: 8 },
} as const;

const features = [
  "IA conversacional en todos los canales",
  "Conversaciones ilimitadas",
  "WhatsApp, Instagram, Messenger, Web, Email",
  "CRM con pipeline visual",
  "Workflows y automatizaciones",
  "Analítica y reportes en tiempo real",
  "12+ integraciones nativas + API abierta",
  "Gestión de cobranzas inteligente",
  "Capacitación incluida",
  "Soporte prioritario",
];

const comparisons = [
  { name: "ChatGPT Plus", price: "$20", per: "/usuario/mes", note: "Solo IA general, sin canales, integraciones ni CRM" },
  { name: "ChatGPT Business", price: "$25", per: "/usuario/mes", note: "IA + workspace, sin WhatsApp ni integraciones" },
  { name: "Intercom", price: "$39", per: "/asiento/mes", note: "Chat + tickets, integraciones limitadas" },
  { name: "Zendesk Suite", price: "$55", per: "/agente/mes", note: "Setup complejo, integraciones con costo extra" },
  { name: "WITHMIA", price: "$18", per: "/mes incluye 1 usuario", note: "IA + 6 canales + 12 herramientas + CRM + automatización", highlight: true },
];

export const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [teamSize, setTeamSize] = useState(1);

  const pricing = isAnnual ? PRICING.annual : PRICING.monthly;

  const totalPrice = useMemo(() => {
    return pricing.base + Math.max(0, teamSize - 1) * pricing.perMember;
  }, [pricing, teamSize]);

  const annualSavings = useMemo(() => {
    const monthlyTotal = PRICING.monthly.base + Math.max(0, teamSize - 1) * PRICING.monthly.perMember;
    const annualTotal = PRICING.annual.base + Math.max(0, teamSize - 1) * PRICING.annual.perMember;
    return (monthlyTotal - annualTotal) * 12;
  }, [teamSize]);

  return (
    <section id="precios" className="pt-10 md:pt-14 pb-12 md:pb-16 px-4 relative overflow-hidden">
      <div className="max-w-5xl mx-auto relative">

        {/* ── Header ── */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold animate-fade-in backdrop-blur-sm">
            <div className="relative">
              <Sparkles className="w-4 h-4" />
              <Sparkles className="w-4 h-4 absolute inset-0 animate-ping opacity-30" />
            </div>
            Precio simple
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-[1.15]">
            Un solo plan,{" "}
            <span className="text-gradient">todo incluido</span>
          </h2>
          <p className="text-sm md:text-base text-white/40 max-w-lg mx-auto leading-relaxed">
            Sin sorpresas, sin funciones bloqueadas. Paga solo por el tamaño de tu equipo.
          </p>
        </div>

        {/* ── Main pricing card ── */}
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden mb-8">

          {/* Top bar: toggle + calculator */}
          <div className="border-b border-white/[0.05] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              {/* Left: Plan name + toggle */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold text-white">WITHMIA Pro</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    Plan único
                  </span>
                </div>
                {/* Billing toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAnnual(false)}
                    className={`text-[13px] font-medium transition-colors ${!isAnnual ? "text-white" : "text-white/30 hover:text-white/50"}`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setIsAnnual(!isAnnual)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      isAnnual ? "bg-amber-500" : "bg-white/15"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        isAnnual ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    className={`text-[13px] font-medium transition-colors ${isAnnual ? "text-white" : "text-white/30 hover:text-white/50"}`}
                  >
                    Anual
                  </button>
                  {isAnnual && (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                      −17%
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Price display */}
              <div className="text-left md:text-right">
                <div className="flex items-baseline gap-1 md:justify-end">
                  <span className="text-4xl md:text-5xl font-bold text-white font-mono tracking-tight">
                    ${totalPrice}
                  </span>
                  <span className="text-sm text-white/30 font-medium">/mes</span>
                </div>
                <p className="text-[12px] text-white/25 mt-1">
                  {teamSize === 1
                    ? `$${pricing.base}/mes — 1 usuario incluido`
                    : `$${pricing.base} base + ${teamSize - 1} × $${pricing.perMember} usuarios extra`}
                </p>
                {isAnnual && annualSavings > 0 && (
                  <p className="text-[11px] text-emerald-400/70 mt-0.5">
                    Ahorras ${annualSavings} USD al año
                  </p>
                )}
              </div>
            </div>

            {/* Team size slider */}
            <div className="mt-6 pt-5 border-t border-white/[0.04]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-white/50 font-medium">Tamaño del equipo</span>
                <span className="text-[13px] font-bold text-white font-mono">
                  {teamSize} {teamSize === 1 ? "usuario" : "usuarios"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/[0.08] accent-amber-500
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(245,158,11,0.4)] [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-400 [&::-moz-range-thumb]:cursor-pointer"
              />
              <div className="flex justify-between mt-1.5 text-[10px] text-white/15 font-mono">
                <span>1</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* Features + CTA */}
          <div className="grid md:grid-cols-[1fr,auto] divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">

            {/* Features list */}
            <div className="p-6 md:p-8">
              <p className="text-[11px] text-white/25 uppercase tracking-widest font-semibold mb-4">Todo incluido</p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-amber-400/60 mt-0.5 shrink-0" />
                    <span className="text-[13px] text-white/50 leading-tight">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA column */}
            <div className="p-6 md:p-8 md:w-64 flex flex-col justify-center gap-4">
              <div className="space-y-3">
                <a
                  href="https://app.withmia.com"
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[14px] font-semibold text-black hover:brightness-110 transition-all"
                >
                  Comenzar ahora
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="/contacto"
                  className="flex items-center justify-center w-full px-5 py-2.5 rounded-xl border border-white/[0.08] text-[13px] font-medium text-white/50 hover:text-white/80 hover:border-white/[0.15] transition-all"
                >
                  Agendar demo
                </a>
              </div>
              <p className="text-[10px] text-white/20 text-center leading-relaxed">
                Sin tarjeta de crédito para el trial.
                <br />
                Cancela cuando quieras.
              </p>
            </div>
          </div>
        </div>

        {/* ── Comparison table ── */}
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="p-5 md:p-6 border-b border-white/[0.05]">
            <h4 className="text-sm font-bold text-white">¿Cómo se compara?</h4>
            <p className="text-[11px] text-white/25 mt-0.5">Precio base por usuario. WITHMIA incluye IA + 6 canales + 12 herramientas + CRM.</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {comparisons.map((c) => (
              <div
                key={c.name}
                className={`flex items-center justify-between px-5 md:px-6 py-3.5 ${
                  c.highlight ? "bg-amber-500/[0.04]" : "hover:bg-white/[0.01]"
                } transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {c.highlight ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  ) : (
                    <Minus className="w-3 h-3 text-white/15 shrink-0" />
                  )}
                  <span className={`text-[13px] font-semibold truncate ${c.highlight ? "text-amber-400" : "text-white/60"}`}>
                    {c.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[11px] text-white/20 hidden sm:inline">{c.note}</span>
                  <div className="text-right">
                    <span className={`text-[15px] font-bold font-mono ${c.highlight ? "text-amber-400" : "text-white/50"}`}>
                      {c.price}
                    </span>
                    <span className="text-[10px] text-white/20 ml-1">{c.per}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
