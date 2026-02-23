import { Check, X, Minus, Zap } from "lucide-react";

type FeatureStatus = "full" | "partial" | "none";

interface CompetitorRow {
  feature: string;
  withmia: FeatureStatus;
  manual: FeatureStatus;
  zendesk: FeatureStatus;
  chatbot: FeatureStatus;
}

const rows: CompetitorRow[] = [
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

const StatusIcon = ({ status }: { status: FeatureStatus }) => {
  if (status === "full")
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      </div>
    );
  if (status === "partial")
    return (
      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Minus className="w-3.5 h-3.5 text-amber-400" />
      </div>
    );
  return (
    <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center">
      <X className="w-3.5 h-3.5 text-red-400" />
    </div>
  );
};

const competitors = [
  { key: "withmia" as const, label: "WITHMIA", highlight: true },
  { key: "manual" as const, label: "Manual / WhatsApp Business", highlight: false },
  { key: "zendesk" as const, label: "Zendesk / HubSpot", highlight: false },
  { key: "chatbot" as const, label: "Chatbot genérico", highlight: false },
];

export const ComparisonTable = () => {
  return (
    <section className="py-14 px-4 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 font-medium">
            <Zap className="w-4 h-4" />
            Comparativa
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            ¿Por qué elegir{" "}
            <span className="text-gradient">WITH<span className="font-bold">MIA</span></span>?
          </h2>
          <p className="text-base text-white/50 max-w-xl mx-auto">
            Compara funcionalidades reales, no promesas de marketing.
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-2xl overflow-hidden border border-white/[0.06]">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="text-left py-4 px-6 text-sm font-medium text-white/40 w-[280px]">
                  Funcionalidad
                </th>
                {competitors.map((c) => (
                  <th
                    key={c.key}
                    className={`py-4 px-4 text-center text-sm font-semibold ${
                      c.highlight
                        ? "text-amber-400 bg-amber-500/[0.05]"
                        : "text-white/60"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-4 px-6 text-sm text-white/70">
                    {row.feature}
                  </td>
                  {competitors.map((c) => (
                    <td
                      key={c.key}
                      className={`py-4 px-4 ${
                        c.highlight ? "bg-amber-500/[0.03]" : ""
                      }`}
                    >
                      <div className="flex justify-center">
                        <StatusIcon status={row[c.key]} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {rows.map((row, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3"
            >
              <p className="text-sm text-white font-medium">{row.feature}</p>
              <div className="grid grid-cols-2 gap-2">
                {competitors.map((c) => (
                  <div
                    key={c.key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      c.highlight
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-white/[0.02]"
                    }`}
                  >
                    <StatusIcon status={row[c.key]} />
                    <span
                      className={
                        c.highlight ? "text-amber-400" : "text-white/50"
                      }
                    >
                      {c.label.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-sm text-white/30 mb-4">
            10/10 en funcionalidades clave — Los demás no llegan ni a 6.
          </p>
          <a
            href="https://app.withmia.com"
          >
            <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold text-sm shadow-[0_4px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_35px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-300">
              Probar WITH<span className="font-bold">MIA</span> gratis →
            </button>
          </a>
        </div>
      </div>
    </section>
  );
};
