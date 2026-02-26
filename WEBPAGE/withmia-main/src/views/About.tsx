import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Shield,
  Clock,
  BadgeCheck,
  Code2,
  Heart,
  Building2,
  MapPin,
  FileCheck,
  CalendarDays,
  Zap,
  Timer,
  Workflow,
  Lock,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Brain,
  LineChart,
  User,
  Linkedin,
  Rocket,
  Target,
  Lightbulb,
  ChevronRight,
  ExternalLink,
  Globe,
  Layers,
  Cpu,
  Sparkles,
} from "lucide-react";
import { Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";

/* ═══════════════════════════════════════════════════════════
   Scroll Reveal Hook (inline to keep self-contained)
   ═══════════════════════════════════════════════════════════ */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* Staggered child helper */
function stagger(visible: boolean, i: number, base = 0) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(24px)",
    transition: `all 0.6s cubic-bezier(.22,.61,.36,1) ${base + i * 90}ms`,
  } as React.CSSProperties;
}

/* ═══════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════ */

const differentiators = [
  {
    icon: Zap,
    title: "Ejecución real",
    desc: "La IA no solo conversa: descuenta stock, bloquea horarios y procesa cobranzas en tiempo real.",
  },
  {
    icon: Workflow,
    title: "No-Code",
    desc: "Despliega IA avanzada en menos de 1 hora, sin equipo técnico.",
  },
  {
    icon: Timer,
    title: "Golden Window",
    desc: "Respuesta automática en <5 min para capturar cada lead en su momento de mayor interés.",
  },
  {
    icon: Lock,
    title: "IP 100% propia",
    desc: "Todo el código fuente es nuestro, con prompts diseñados para el mercado LATAM.",
  },
  {
    icon: Cpu,
    title: "Multi-modelo",
    desc: "GPT-4o, Claude y modelos propios. La mejor IA para cada tipo de conversación.",
  },
  {
    icon: Layers,
    title: "Todo-en-uno",
    desc: "Inbox, CRM, cobranzas, analytics y automatización. Una sola plataforma, un solo precio.",
  },
];

const values = [
  { icon: Heart, title: "Servicio", desc: "Customer Success enfocado en adopción real y acompañamiento continuo." },
  { icon: Shield, title: "Privacidad", desc: "Infraestructura AWS, empresa SII-verificada. Datos protegidos de extremo a extremo." },
  { icon: Lightbulb, title: "Innovación", desc: "Arquitectura propietaria de IA Generativa que evoluciona con feedback real." },
  { icon: Target, title: "Transparencia", desc: "Pricing claro, documentación abierta, acceso directo al equipo fundador." },
];

const timeline = [
  { year: "2024", title: "Origen", desc: "Nace como proyecto interno en Atlantis Producciones para resolver ineficiencias operativas en PYMEs." },
  { year: "Ene 2025", title: "Pivote a SaaS", desc: "De agentes manuales a plataforma propietaria No-Code en AWS con arquitectura multi-tenant." },
  { year: "Jul 2025", title: "Constitución legal", desc: "MIA Marketing & Intelligence Artificial SpA se constituye en Providencia, Santiago." },
  { year: "2025 – Hoy", title: "Crecimiento", desc: "Primeros clientes B2B en Chile con modelo Product-Led Growth e iteración continua." },
];

const companyDetails = [
  { icon: FileCheck, label: "RUT", value: "78.199.687-4", mono: true },
  { icon: BarChart3, label: "Actividad", value: "Consultoría de informática y gestión de instalaciones informáticas" },
  { icon: MapPin, label: "Domicilio", value: "Antonio Bellet 193, Of. 1210, Providencia, Santiago" },
  { icon: CalendarDays, label: "Inicio", value: "14 de julio de 2025" },
];

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */
const About = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const hero = useReveal(0.05);
  const missionBlock = useReveal();
  const diffBlock = useReveal();
  const founderBlock = useReveal();
  const valuesBlock = useReveal();
  const timelineBlock = useReveal();
  const companyBlock = useReveal();
  const ctaBlock = useReveal();

  const [imgError, setImgError] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="pt-20 overflow-hidden">

        {/* ══════════════════════════════════════════════════
            HERO — Editorial, cinematic
           ══════════════════════════════════════════════════ */}
        <section className="relative px-5 pt-24 md:pt-36 pb-28 md:pb-40">
          <div
            ref={hero.ref}
            className={`max-w-6xl mx-auto transition-all duration-[1s] ease-out ${hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            {/* Overline */}
            <div className="flex items-center gap-3 mb-8 justify-center md:justify-start">
              <span className="w-8 h-px bg-amber-400/60" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/30">
                Sobre WITHMIA
              </span>
            </div>

            <div className="grid lg:grid-cols-[1.3fr,1fr] gap-14 lg:gap-20 items-end">
              <div>
                <h1 className="text-[clamp(2.2rem,5.5vw,4.5rem)] font-bold text-white leading-[1.05] tracking-tight mb-0">
                  IA conversacional{" "}
                  <span className="block text-gradient">hecha para PYMEs</span>
                </h1>
              </div>

              <div className="lg:pb-2">
                <p className="text-[15px] md:text-base text-white/40 leading-[1.8] max-w-lg">
                  Automatizar ventas, atención y cobranzas ya no requiere miles
                  de dólares ni un equipo de ingenieros. WITHMIA es la
                  plataforma omnicanal que nació en Chile para resolver eso.
                </p>
                <div className="flex items-center gap-5 mt-6">
                  <a
                    href="https://app.withmia.com"
                    onClick={() => trackCTAClick("comenzar_ahora", "about_hero", "https://app.withmia.com")}
                    className="group inline-flex items-center gap-2 text-[13px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Comenzar gratis
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                  <span className="w-px h-4 bg-white/10" />
                  <Link
                    to="/contacto"
                    className="text-[13px] font-medium text-white/30 hover:text-white/60 transition-colors"
                  >
                    Hablar con nosotros
                  </Link>
                </div>
              </div>
            </div>

            {/* Separator line */}
            <div className="mt-16 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.12] to-white/[0.06]" />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            MISIÓN — Two-column asymmetric
           ══════════════════════════════════════════════════ */}
        <section className="px-5 py-24 md:py-32">
          <div
            ref={missionBlock.ref}
            className={`max-w-6xl mx-auto grid lg:grid-cols-[1fr,1.2fr] gap-16 lg:gap-24 items-start transition-all duration-700 ${missionBlock.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            {/* Left */}
            <div className="lg:sticky lg:top-32">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/50 mb-4">
                El problema
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-[1.15] mb-6">
                Las PYMEs pierden ventas por responder tarde y usar herramientas desconectadas
              </h2>
              <p className="text-[15px] text-white/35 leading-[1.8]">
                WhatsApp personal. Excel como CRM. Un bot para cada canal.
                70% de los leads se pierden por falta de respuesta en los
                primeros 5 minutos.
              </p>
            </div>

            {/* Right */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-400/50 mb-4">
                Nuestra solución
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-white leading-tight mb-6">
                Una sola plataforma que unifica IA generativa, CRM, cobranzas,
                y automatización omnicanal
              </h3>
              <p className="text-[15px] text-white/35 leading-[1.8] mb-8">
                WITHMIA reemplaza 5–7 herramientas desconectadas con una plataforma
                No-Code que cualquier equipo puede desplegar en menos de una hora.
                Pensada para PYMEs con 5K–50K mensajes mensuales.
              </p>

              {/* Key numbers */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { num: "5+", label: "Canales" },
                  { num: "<5 min", label: "Respuesta IA" },
                  { num: "100%", label: "IP Propia" },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center"
                    style={stagger(missionBlock.visible, i, 200)}
                  >
                    <span className="block text-xl md:text-2xl font-bold text-white">{item.num}</span>
                    <span className="text-[11px] text-white/25 uppercase tracking-wider font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            QUÉ NOS DIFERENCIA — Clean grid
           ══════════════════════════════════════════════════ */}
        <section className="px-5 py-24 md:py-32 border-t border-white/[0.04]">
          <div ref={diffBlock.ref} className="max-w-6xl mx-auto">
            <div
              className={`mb-14 max-w-xl transition-all duration-700 ${diffBlock.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/50 mb-4">
                Qué nos diferencia
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                Construida desde cero para el mercado LATAM
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.06]">
              {differentiators.map((d, i) => {
                const Icon = d.icon;
                return (
                  <div
                    key={d.title}
                    className="bg-white/[0.015] hover:bg-white/[0.04] p-7 md:p-8 transition-all duration-500 group"
                    style={stagger(diffBlock.visible, i, 100)}
                  >
                    <Icon className="w-5 h-5 text-white/15 mb-5 group-hover:text-amber-400/50 transition-colors duration-500" />
                    <h3 className="text-[15px] font-semibold text-white mb-2">{d.title}</h3>
                    <p className="text-[13px] text-white/25 leading-[1.7] group-hover:text-white/40 transition-colors duration-500">{d.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            FUNDADOR — Cinematic full-width
           ══════════════════════════════════════════════════ */}
        <section className="px-5 py-24 md:py-32 border-t border-white/[0.04]">
          <div
            ref={founderBlock.ref}
            className={`max-w-6xl mx-auto transition-all duration-700 ${founderBlock.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <div className="grid lg:grid-cols-[340px,1fr] gap-0 rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.015]">
              {/* Photo */}
              <div className="relative bg-white/[0.03] overflow-hidden">
                <div className="aspect-[3/4] lg:aspect-auto lg:h-full">
                  {!imgError ? (
                    <img
                      src="/images/founder.webp"
                      alt="Ángel Díaz Castro — CEO & Fundador, WITHMIA"
                      className="w-full h-full object-cover object-[center_15%]"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center min-h-[360px]">
                      <User className="w-20 h-20 text-white/[0.06]" />
                    </div>
                  )}
                </div>
                {/* Fade to card bg on mobile */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[hsl(230,40%,6%)] to-transparent lg:hidden" />
              </div>

              {/* Bio */}
              <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/50 mb-3">
                  Fundador & CEO
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  Ángel Díaz Castro
                </h2>
                <p className="text-[13px] text-white/20 mb-7">
                  Santiago, Chile
                </p>

                <p className="text-[15px] text-white/40 leading-[1.8] mb-4">
                  Fundador técnico con 5 años de desarrollo de software,
                  formación en Economía y Psicología Organizacional.
                  Construí la arquitectura completa de WITHMIA, diseñé la
                  experiencia No-Code y estructuré un modelo SaaS rentable
                  desde el día uno.
                </p>
                <p className="text-[15px] text-white/30 leading-[1.8] mb-8">
                  Anteriormente fundé Atlantis Producciones SpA, donde lideré
                  equipos y gestioné proyectos digitales en el mercado chileno.
                </p>

                {/* Skill chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {[
                    { icon: Code2, label: "Full-Stack" },
                    { icon: Brain, label: "UX Conductual" },
                    { icon: LineChart, label: "Estrategia SaaS" },
                  ].map((s, i) => (
                    <span
                      key={s.label}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] font-medium text-white/40"
                      style={stagger(founderBlock.visible, i, 300)}
                    >
                      <s.icon className="w-3 h-3 text-white/20" />
                      {s.label}
                    </span>
                  ))}
                </div>

                <a
                  href="https://www.linkedin.com/in/angel-felipe-diaz-castro/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-white/30 hover:text-white/60 transition-colors group w-fit"
                >
                  <Linkedin className="w-4 h-4 text-[#0A66C2]/70 group-hover:text-[#0A66C2] transition-colors" />
                  linkedin.com/in/angel-felipe-diaz-castro
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            VALORES — Minimal numbered list
           ══════════════════════════════════════════════════ */}
        <section className="px-5 py-24 md:py-32 border-t border-white/[0.04]">
          <div ref={valuesBlock.ref} className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-[1fr,1.5fr] gap-16 lg:gap-24">
              {/* Left title */}
              <div
                className={`lg:sticky lg:top-32 transition-all duration-700 ${valuesBlock.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-400/50 mb-4">
                  Valores
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-5">
                  Los principios detrás de cada decisión
                </h2>
                <p className="text-[14px] text-white/30 leading-[1.7]">
                  No son frases en una pared. Son filtros que usamos para
                  priorizar features, definir precios y hablar con clientes.
                </p>
              </div>

              {/* Right: value items */}
              <div className="space-y-0 divide-y divide-white/[0.04]">
                {values.map((v, i) => {
                  const Icon = v.icon;
                  const num = String(i + 1).padStart(2, "0");
                  return (
                    <div
                      key={v.title}
                      className="flex gap-5 py-7 group"
                      style={stagger(valuesBlock.visible, i, 100)}
                    >
                      <span className="text-[12px] font-mono text-white/10 pt-1 select-none shrink-0">
                        {num}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-2">
                          <Icon className="w-4 h-4 text-white/15 group-hover:text-amber-400/50 transition-colors duration-500" />
                          <h3 className="text-[15px] font-semibold text-white">{v.title}</h3>
                        </div>
                        <p className="text-[13px] text-white/25 leading-[1.7] group-hover:text-white/40 transition-colors duration-500 pl-[26px]">
                          {v.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            HISTORIA — Horizontal timeline
           ══════════════════════════════════════════════════ */}
        <section className="px-5 py-24 md:py-32 border-t border-white/[0.04]">
          <div ref={timelineBlock.ref} className="max-w-6xl mx-auto">
            <div
              className={`mb-14 transition-all duration-700 ${timelineBlock.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/50 mb-4">
                Nuestra historia
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight max-w-lg">
                De una necesidad real a una empresa propia
              </h2>
            </div>

            {/* Timeline — horizontal on desktop, vertical on mobile */}
            <div className="relative">
              {/* Horizontal line (desktop) */}
              <div className="hidden md:block absolute top-[22px] left-0 right-0 h-px bg-gradient-to-r from-white/[0.08] via-white/[0.08] to-transparent" />

              <div className="grid md:grid-cols-4 gap-10 md:gap-6">
                {timeline.map((step, i) => (
                  <div
                    key={step.year}
                    className="relative"
                    style={stagger(timelineBlock.visible, i, 100)}
                  >
                    {/* Dot */}
                    <div className="flex items-center gap-3 mb-4 md:flex-col md:items-start md:gap-0">
                      <div className="relative z-10">
                        <div className="w-[11px] h-[11px] rounded-full bg-white/[0.06] border-2 border-white/20 md:mb-6" />
                      </div>
                      <span className="text-[12px] font-semibold text-amber-400/50 md:hidden">{step.year}</span>
                    </div>

                    <span className="hidden md:block text-[12px] font-semibold text-amber-400/50 mb-2">
                      {step.year}
                    </span>
                    <h3 className="text-[15px] font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-[13px] text-white/25 leading-[1.7]">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            EMPRESA — Minimal split
           ══════════════════════════════════════════════════ */}
        <section className="px-5 py-24 md:py-32 border-t border-white/[0.04]">
          <div
            ref={companyBlock.ref}
            className={`max-w-6xl mx-auto transition-all duration-700 ${companyBlock.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Company info */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                <div className="px-7 py-5 border-b border-white/[0.04] flex items-center gap-4">
                  <Building2 className="w-5 h-5 text-white/20" />
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">MIA Marketing & Intelligence Artificial SpA</h3>
                    <p className="text-[11px] text-white/20 mt-0.5">Sociedad por Acciones · Chile</p>
                  </div>
                </div>
                <div className="p-7 space-y-5">
                  {companyDetails.map((row) => (
                    <div key={row.label} className="flex items-start gap-3">
                      <row.icon className="w-3.5 h-3.5 text-white/15 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-semibold text-white/15 uppercase tracking-wider block mb-0.5">{row.label}</span>
                        <span className={`text-[13px] text-white/45 leading-relaxed ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification + Origin */}
              <div className="flex flex-col gap-5">
                {/* SII */}
                <div className="flex-1 rounded-2xl border border-emerald-500/[0.08] bg-emerald-500/[0.015] p-7">
                  <div className="flex items-center gap-3 mb-5">
                    <Shield className="w-5 h-5 text-emerald-400/60" />
                    <h4 className="text-[14px] font-semibold text-white">Verificada por el SII</h4>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-400/10 border border-emerald-400/15 text-[11px] font-semibold text-emerald-400">
                      <BadgeCheck className="w-3 h-3" />
                      Verificada
                    </span>
                    <span className="text-[11px] text-white/20">desde julio 2025</span>
                  </div>
                  <p className="text-[12px] text-white/20 leading-relaxed">
                    Habilitada para facturación electrónica. Infraestructura
                    alojada en AWS con estándares de seguridad internacionales.
                  </p>
                </div>

                {/* Atlantis */}
                <a
                  href="https://atlantisproducciones.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] p-6 flex items-center gap-5 transition-all duration-300 group"
                >
                  <img
                    src="/Logo-Atlantis.webp"
                    alt="Atlantis Producciones"
                    className="w-11 h-11 object-contain opacity-30 group-hover:opacity-50 transition-opacity rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white/40 group-hover:text-white/60 transition-colors">
                      Originada en Atlantis Producciones
                    </p>
                    <p className="text-[11px] text-white/15 mt-0.5">Agencia digital · Santiago, Chile</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/10 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            CTA — Prominent, clean
           ══════════════════════════════════════════════════ */}
        <section className="px-5 py-20 md:py-28">
          <div
            ref={ctaBlock.ref}
            className={`max-w-3xl mx-auto text-center transition-all duration-700 ${ctaBlock.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Prueba WITHMIA gratis
            </h2>
            <p className="text-[15px] text-white/30 max-w-md mx-auto mb-10 leading-relaxed">
              Crea tu cuenta en 2 minutos. Conecta tu primer canal y deja que
              la IA trabaje por ti desde el primer día.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://app.withmia.com"
                onClick={() => trackCTAClick("comenzar_ahora", "about_cta", "https://app.withmia.com")}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[14px] font-semibold text-black hover:brightness-110 transition-all shadow-lg shadow-amber-500/20 group"
              >
                Comenzar ahora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <Link
                to="/contacto"
                onClick={() => trackCTAClick("contactar", "about_cta", "/contacto")}
                className="inline-flex items-center px-7 py-3.5 rounded-xl border border-white/[0.08] text-[14px] font-medium text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-all"
              >
                Contactar al equipo
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 text-white/15 text-[11px]">
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Datos seguros</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Soporte 24/7</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="w-3 h-3" /> Sin tarjeta</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default About;
