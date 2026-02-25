import { useEffect, useState } from "react";
import { trackFormSubmit } from "@/lib/analytics";
import { TrendingUp, Globe, Users, Zap, Shield, BarChart3, ArrowRight, Mail, Building2, User, MessageSquare, CheckCircle2, Rocket, GraduationCap, Target, DollarSign, Calendar, Award, Lightbulb } from "lucide-react";

const Investors = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackFormSubmit("investor_interest", { company: formData.company });
    const subject = encodeURIComponent("Interés de Inversión — WITHMIA");
    const body = encodeURIComponent(
      `Nombre: ${formData.name}\nEmpresa: ${formData.company}\nEmail: ${formData.email}\n\nMensaje:\n${formData.message}`
    );
    window.location.href = `mailto:investors@withmia.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-[#030507]">
      <div className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-300/80 tracking-wide">En proceso de levantamiento</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Financiamiento e
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Inversión
              </span>
            </h1>

            <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-12">
              Llevamos más de un año profesionalizando WITHMIA a través de procesos
              de levantamiento de fondos, mentorías y validaciones que han fortalecido
              nuestro modelo de negocio y nuestra visión a largo plazo.
            </p>

            <a
              href="#contacto"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(52,211,153,0.2)]"
            >
              Conversa con nosotros
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* ── NUESTRA HISTORIA ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-emerald-400/60 uppercase tracking-widest mb-4">
                Nuestra historia
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Un año de profesionalización
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                Desde nuestros inicios hemos recorrido un camino de constante evolución.
                El proceso de levantamiento de fondos nos ha obligado a pensar en grande,
                validar cada supuesto y construir una empresa sólida.
              </p>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/30 via-emerald-500/10 to-transparent" />

              {[
                {
                  icon: Lightbulb,
                  title: "Ideación y Construcción",
                  desc: "Desarrollo del MVP de la plataforma WITHMIA con IA conversacional propia, integraciones omnicanal y arquitectura escalable.",
                  side: "left",
                },
                {
                  icon: GraduationCap,
                  title: "Mentorías y Validación",
                  desc: "Participación en programas de mentoría con expertos de la industria tech y levantamiento de capital. Validación del modelo de negocio con clientes reales.",
                  side: "right",
                },
                {
                  icon: Target,
                  title: "Tracción Inicial",
                  desc: "Primeros clientes operando con la plataforma, validando el product-market fit y generando ingresos recurrentes que demuestran el potencial del modelo SaaS.",
                  side: "left",
                },
                {
                  icon: Rocket,
                  title: "Levantamiento de Fondos",
                  desc: "En proceso de aplicación a programas de aceleración e inversión como Startup Chile Ignite, buscando impulsar el crecimiento y la expansión de WITHMIA en LATAM.",
                  side: "right",
                },
              ].map((step, i) => (
                <div key={i} className={`relative flex items-start gap-6 mb-12 last:mb-0 ${step.side === "right" ? "md:flex-row-reverse md:text-right" : ""}`}>
                  <div className={`hidden md:block flex-1 ${step.side === "left" ? "pr-12" : "pl-12"}`}>
                    <div className={`p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/15 hover:bg-emerald-950/10 transition-all duration-500`}>
                      <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>

                  <div className="relative z-10 shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>

                  <div className="flex-1 md:hidden">
                    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                      <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>

                  <div className="hidden md:block flex-1" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── QUÉ NOS HA DADO ESTE PROCESO ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-emerald-400/60 uppercase tracking-widest mb-4">
                Qué nos ha dado este proceso
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Más que capital: profesionalización
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                El proceso de levantar fondos nos ha transformado como empresa,
                obligándonos a operar con los más altos estándares.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: GraduationCap,
                  title: "Mentorías Especializadas",
                  desc: "Acceso a mentores con experiencia en startups de tecnología, SaaS y mercados latinoamericanos que han guiado decisiones estratégicas clave.",
                },
                {
                  icon: CheckCircle2,
                  title: "Validación de Modelo",
                  desc: "Cada etapa del proceso ha requerido demostrar tracción real, métricas sólidas y un modelo de negocio escalable validado por el mercado.",
                },
                {
                  icon: Award,
                  title: "Estándares Profesionales",
                  desc: "Estructura financiera, gobernanza corporativa, proyecciones y KPIs alineados con lo que esperan inversores institucionales y programas de aceleración.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] group hover:border-emerald-500/15 transition-all duration-500"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-500/15 transition-colors duration-500">
                    <item.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POR QUÉ WITHMIA ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-emerald-400/60 uppercase tracking-widest mb-4">
                La oportunidad
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                ¿Por qué invertir en WITHMIA?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { icon: Globe, label: "Mercado Objetivo", value: "$45B", sub: "Omnicanal LATAM" },
                { icon: TrendingUp, label: "Crecimiento", value: "30%", sub: "Tasa anual (YoY)" },
                { icon: Users, label: "PYMEs en LATAM", value: "30M+", sub: "Empresas potenciales" },
                { icon: Zap, label: "Adopción IA", value: "4x", sub: "Crecimiento en 2 años" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/15 hover:bg-emerald-950/10 transition-all duration-500"
                >
                  <stat.icon className="w-5 h-5 text-emerald-400/50 mb-4" />
                  <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-white/60 font-medium">{stat.label}</p>
                  <p className="text-xs text-white/30 mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: "IA Conversacional Propia",
                  desc: "Motor de IA entrenado específicamente para ventas y soporte en español, con comprensión contextual del mercado latinoamericano.",
                },
                {
                  icon: Shield,
                  title: "Plataforma Omnicanal",
                  desc: "WhatsApp, Instagram, Facebook, Email, WebChat y API unificados en un solo dashboard para todo el equipo.",
                },
                {
                  icon: BarChart3,
                  title: "Modelo SaaS Escalable",
                  desc: "Ingresos recurrentes con alta retención. Cada cliente genera revenue que crece con su uso de la plataforma.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] group hover:border-emerald-500/15 transition-all duration-500"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-500/15 transition-colors duration-500">
                    <item.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRACCIÓN ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-emerald-400/60 uppercase tracking-widest mb-4">
                Tracción
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Métricas que importan
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { value: "99.9%", label: "Uptime" },
                { value: "<200ms", label: "Latencia IA" },
                { value: "24/7", label: "Operación Autónoma" },
                { value: "Multi-país", label: "Cobertura LATAM" },
              ].map((m, i) => (
                <div key={i} className="text-center p-6">
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-2">
                    {m.value}
                  </p>
                  <p className="text-xs text-white/40 uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ROADMAP FINANCIERO ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-emerald-400/60 uppercase tracking-widest mb-4">
                Roadmap
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Plan de crecimiento
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                Nuestro plan de financiamiento está diseñado para escalar WITHMIA de forma
                sostenible, priorizando tracción y producto.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  phase: "Fase Actual",
                  title: "Pre-Seed & Aceleración",
                  status: "En progreso",
                  statusColor: "emerald",
                  items: [
                    "Postulación a Startup Chile — Programa Ignite",
                    "Consolidación de métricas de tracción y producto",
                    "Desarrollo de partnerships estratégicos",
                    "Optimización del modelo de pricing y unit economics",
                  ],
                },
                {
                  phase: "Siguiente Fase",
                  title: "Seed Round",
                  status: "Planificado",
                  statusColor: "amber",
                  items: [
                    "Expansión del equipo de desarrollo y ventas",
                    "Escalar a nuevos mercados en LATAM",
                    "Desarrollo de funcionalidades enterprise",
                    "Inversión en infraestructura y seguridad",
                  ],
                },
                {
                  phase: "Visión",
                  title: "Serie A",
                  status: "Futuro",
                  statusColor: "blue",
                  items: [
                    "Liderazgo en comunicación empresarial IA en LATAM",
                    "Expansión a mercados hispanohablantes globales",
                    "Plataforma de marketplace de integraciones",
                    "Programa de partners y revendedores",
                  ],
                },
              ].map((phase, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/10 transition-all duration-500"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                        {phase.phase}
                      </span>
                      <span className="text-white/10">—</span>
                      <h3 className="text-lg font-semibold text-white">{phase.title}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      phase.statusColor === "emerald"
                        ? "border-emerald-500/20 bg-emerald-950/30 text-emerald-300/80"
                        : phase.statusColor === "amber"
                        ? "border-amber-500/20 bg-amber-950/30 text-amber-300/80"
                        : "border-blue-500/20 bg-blue-950/30 text-blue-300/80"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        phase.statusColor === "emerald"
                          ? "bg-emerald-400 animate-pulse"
                          : phase.statusColor === "amber"
                          ? "bg-amber-400"
                          : "bg-blue-400"
                      }`} />
                      {phase.status}
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {phase.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-white/40">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${
                          phase.statusColor === "emerald"
                            ? "text-emerald-500/40"
                            : "text-white/10"
                        }`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTACTO ── */}
        <section id="contacto" className="py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-emerald-400/60 uppercase tracking-widest mb-4">
                Conectemos
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                ¿Quieres ser parte de este camino?
              </h2>
              <p className="text-white/40">
                Si eres inversor, mentor o quieres colaborar con WITHMIA, escríbenos.
                Estamos abiertos a conversar sobre oportunidades de inversión y alianzas estratégicas.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-2">
                    <User className="w-3.5 h-3.5" /> Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-2">
                    <Building2 className="w-3.5 h-3.5" /> Empresa / Fondo
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    placeholder="Nombre del fondo o empresa"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-2">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider mb-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Mensaje
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                  placeholder="Cuéntanos sobre tu interés o cómo quieres colaborar..."
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]"
              >
                Enviar Mensaje
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Investors;
