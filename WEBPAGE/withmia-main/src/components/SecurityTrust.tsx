import { Shield, Lock, Server, Eye, BadgeCheck, Globe, Sparkles } from "lucide-react";
import logo from "@/assets/logo-withmia.png";

const features = [
  {
    icon: Lock,
    title: "Cifrado de extremo a extremo",
    description: "TLS 1.3 en tránsito y AES-256 en reposo. Cada conversación viaja y se almacena con cifrado de grado militar.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  {
    icon: Eye,
    title: "Privacidad por diseño",
    description: "Cumplimos con la Ley 19.628 de Chile y principios GDPR. Tú decides qué datos se recopilan y cómo se procesan.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Server,
    title: "Infraestructura redundante",
    description: "Servidores distribuidos con 99.9% de uptime garantizado. Backups automáticos cada 6 horas en múltiples regiones.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: BadgeCheck,
    title: "Acceso basado en roles",
    description: "Control granular de permisos por equipo y usuario. Cada agente accede solo a la información que necesita.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Globe,
    title: "Sin vendor lock-in",
    description: "Exporta tus datos completos en cualquier momento. Tu información es tuya, siempre, sin restricciones.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  {
    icon: Shield,
    title: "Auditoría completa",
    description: "Registro inmutable de cada acción, mensaje y cambio en la plataforma. Trazabilidad total para compliance.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
];

const trustBadges = ["GDPR Ready", "Ley 19.628", "SOC 2 Type II", "ISO 27001"];

export const SecurityTrust = () => {
  return (
    <section className="pt-8 md:pt-10 pb-8 md:pb-10 px-4 relative overflow-hidden">
      {/* Background shield glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <Shield className="w-[500px] h-[500px] text-white/[0.015] stroke-[0.3]" />
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 object-contain opacity-[0.04] grayscale select-none"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.04] to-transparent rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* ── Header ── */}
        <div className="text-center mb-16 space-y-5">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold animate-fade-in backdrop-blur-sm">
            <div className="relative">
              <Sparkles className="w-4 h-4" />
              <Sparkles className="w-4 h-4 absolute inset-0 animate-ping opacity-30" />
            </div>
            Seguridad & Confianza
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Tu información está
            <br />
            <span className="text-gradient">blindada</span>
          </h2>
          <p className="text-base md:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed">
            Construimos WITHMIA pensando primero en seguridad, después en funcionalidad.
            Cada capa está diseñada para proteger tu negocio.
          </p>
        </div>

        {/* ── Features grid — 2 rows of 3 ── */}
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden mb-16">
          <div className="grid md:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`group p-7 transition-all duration-300 hover:bg-white/[0.03] ${
                  /* Right borders for columns 0,1 */ i % 3 !== 2 ? "md:border-r md:border-white/[0.06]" : ""
                } ${
                  /* Bottom border for first row */ i < 3 ? "border-b border-white/[0.06]" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${feature.bg} border ${feature.border} flex items-center justify-center shrink-0 mt-0.5`}>
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-white mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-[13px] text-white/35 leading-relaxed group-hover:text-white/45 transition-colors">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust bar ── */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/30">
          {trustBadges.map((badge, i) => (
            <span key={badge} className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400/50" />
                <span className="font-medium tracking-wide">{badge}</span>
              </span>
              {i < trustBadges.length - 1 && (
                <span className="text-white/10">|</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
