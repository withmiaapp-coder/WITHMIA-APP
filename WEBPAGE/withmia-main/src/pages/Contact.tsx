import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import {
  ArrowRight,
  Mail,
  MessageSquare,
  Clock,
  Sparkles,
  Send,
  Building2,
  Users,
  Headphones,
  Calendar,
  Shield,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

/* ─── Scroll-reveal ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, isVisible: v };
}

/* ─── Form schema ─── */
const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor ingresa un email válido." }),
  company: z.string().optional(),
  teamSize: z.string().optional(),
  interest: z.string().optional(),
  message: z.string().min(10, { message: "El mensaje debe tener al menos 10 caracteres." }),
});

const interests = [
  "Quiero una demo",
  "Tengo preguntas sobre precios",
  "Necesito soporte técnico",
  "Quiero ser partner",
  "Otro",
];

const contactChannels = [
  {
    icon: Mail,
    title: "Email",
    value: "contacto@withmia.com",
    href: "mailto:contacto@withmia.com",
    desc: "Para consultas generales",
    color: "amber",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp",
    value: "+56 9 1234 5678",
    href: "https://wa.me/56912345678",
    desc: "Respuesta inmediata",
    color: "emerald",
  },
  {
    icon: Calendar,
    title: "Agendar reunión",
    value: "Elige un horario",
    href: "https://cal.com/withmia",
    desc: "Demo personalizada de 30 min",
    color: "violet",
  },
];

const reasons = [
  { icon: Clock, text: "Respondemos en < 2 horas" },
  { icon: Headphones, text: "Soporte en español" },
  { icon: Shield, text: "Sin compromiso" },
  { icon: Users, text: "+500 equipos confían en nosotros" },
];

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);

  const hero = useScrollReveal();
  const formSection = useScrollReveal();
  const channels = useScrollReveal();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      teamSize: "",
      interest: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log({ ...values, interest: selectedInterest });
    toast({
      title: "Mensaje enviado",
      description: "Nos pondremos en contacto contigo pronto.",
    });
    form.reset();
    setSelectedInterest(null);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  }

  return (
    <div className="min-h-screen relative">
      <Navigation />
      <main className="pt-20 relative overflow-hidden">

        {/* ════════════════ HERO ════════════════ */}
        <div className="relative pt-16 md:pt-24 pb-14 md:pb-20 px-4">
          {/* Aurora mesh */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-amber-500/[0.07] via-violet-500/[0.04] to-transparent rounded-full blur-3xl" />
            <div className="absolute top-20 right-0 w-[350px] h-[350px] bg-violet-500/[0.05] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
            <div className="absolute top-40 left-0 w-[300px] h-[300px] bg-cyan-500/[0.04] rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
          </div>

          <div
            ref={hero.ref}
            className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${
              hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 text-sm text-violet-400 font-semibold backdrop-blur-sm mb-6">
              <div className="relative">
                <Sparkles className="w-4 h-4" />
                <Sparkles className="w-4 h-4 absolute inset-0 animate-ping opacity-30" />
              </div>
              Hablemos
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5">
              ¿Listo para{" "}
              <span className="text-gradient">transformar</span>
              <br />
              tu atención al cliente?
            </h1>
            <p className="text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
              Cuéntanos sobre tu negocio y te mostraremos cómo WITHMIA puede
              automatizar y escalar tu operación.
            </p>
          </div>
        </div>

        {/* ════════════════ FORM + SIDEBAR ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={formSection.ref}
            className={`max-w-5xl mx-auto transition-all duration-700 delay-100 ${
              formSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="grid lg:grid-cols-[1fr,380px] gap-8 items-start">

              {/* ── Left: Form Card ── */}
              <div className="relative group order-2 lg:order-1">
                {/* Ambient glow */}
                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-amber-500/15 via-amber-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

                <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                  {/* Shimmer top border */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

                  <div className="p-6 md:p-10">
                    {submitted ? (
                      /* ── Success state ── */
                      <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">¡Mensaje enviado!</h3>
                        <p className="text-white/40 max-w-sm mx-auto leading-relaxed">
                          Recibimos tu mensaje. Un miembro de nuestro equipo te contactará
                          en menos de 2 horas hábiles.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-8">
                          <h2 className="text-xl font-bold text-white mb-1">Envíanos un mensaje</h2>
                          <p className="text-[13px] text-white/30">Completa el formulario y te responderemos pronto.</p>
                        </div>

                        {/* Interest pills */}
                        <div className="mb-8">
                          <p className="text-[12px] text-white/25 uppercase tracking-widest font-semibold mb-3">
                            ¿En qué estás interesado?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {interests.map((int) => (
                              <button
                                key={int}
                                type="button"
                                onClick={() => setSelectedInterest(selectedInterest === int ? null : int)}
                                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 border ${
                                  selectedInterest === int
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                    : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/[0.12]"
                                }`}
                              >
                                {int}
                              </button>
                            ))}
                          </div>
                        </div>

                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            {/* Name + Email row */}
                            <div className="grid sm:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <label className="text-[12px] text-white/40 font-medium mb-1.5 block">Nombre *</label>
                                    <FormControl>
                                      <Input
                                        placeholder="Tu nombre"
                                        {...field}
                                        className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-amber-500/30 focus:ring-amber-500/10 rounded-xl h-11"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <label className="text-[12px] text-white/40 font-medium mb-1.5 block">Email *</label>
                                    <FormControl>
                                      <Input
                                        placeholder="tu@empresa.com"
                                        type="email"
                                        {...field}
                                        className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-amber-500/30 focus:ring-amber-500/10 rounded-xl h-11"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Company + Team size row */}
                            <div className="grid sm:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="company"
                                render={({ field }) => (
                                  <FormItem>
                                    <label className="text-[12px] text-white/40 font-medium mb-1.5 block">Empresa</label>
                                    <FormControl>
                                      <Input
                                        placeholder="Nombre de tu empresa"
                                        {...field}
                                        className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-amber-500/30 focus:ring-amber-500/10 rounded-xl h-11"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="teamSize"
                                render={({ field }) => (
                                  <FormItem>
                                    <label className="text-[12px] text-white/40 font-medium mb-1.5 block">Tamaño del equipo</label>
                                    <FormControl>
                                      <select
                                        {...field}
                                        className="w-full h-11 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/60 text-[14px] focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/10 focus:outline-none appearance-none cursor-pointer"
                                      >
                                        <option value="" className="bg-[#0f1420]">Selecciona</option>
                                        <option value="1" className="bg-[#0f1420]">Solo yo</option>
                                        <option value="2-5" className="bg-[#0f1420]">2–5 personas</option>
                                        <option value="6-15" className="bg-[#0f1420]">6–15 personas</option>
                                        <option value="16-50" className="bg-[#0f1420]">16–50 personas</option>
                                        <option value="50+" className="bg-[#0f1420]">50+ personas</option>
                                      </select>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Message */}
                            <FormField
                              control={form.control}
                              name="message"
                              render={({ field }) => (
                                <FormItem>
                                  <label className="text-[12px] text-white/40 font-medium mb-1.5 block">Mensaje *</label>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Cuéntanos sobre tu negocio y cómo podemos ayudarte..."
                                      className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-amber-500/30 focus:ring-amber-500/10 rounded-xl min-h-[130px] resize-none"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-[11px]" />
                                </FormItem>
                              )}
                            />

                            {/* Submit */}
                            <button
                              type="submit"
                              className="relative flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-semibold text-black hover:brightness-110 transition-all group overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                              <span className="relative z-10 flex items-center gap-2">
                                <Send className="w-4 h-4" />
                                Enviar mensaje
                              </span>
                            </button>

                            <p className="text-[11px] text-white/15 text-center">
                              Al enviar, aceptas nuestra{" "}
                              <a href="/privacidad" className="text-white/25 hover:text-white/40 underline">
                                política de privacidad
                              </a>
                            </p>
                          </form>
                        </Form>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Right: Info Sidebar ── */}
              <div className="order-1 lg:order-2 space-y-5">

                {/* Contact channels */}
                {contactChannels.map((ch, i) => {
                  const Icon = ch.icon;
                  const colorMap: Record<string, { border: string; bg: string; icon: string; hover: string }> = {
                    amber: { border: "border-amber-500/15", bg: "bg-amber-500/[0.06]", icon: "text-amber-400", hover: "hover:border-amber-500/25" },
                    emerald: { border: "border-emerald-500/15", bg: "bg-emerald-500/[0.06]", icon: "text-emerald-400", hover: "hover:border-emerald-500/25" },
                    violet: { border: "border-violet-500/15", bg: "bg-violet-500/[0.06]", icon: "text-violet-400", hover: "hover:border-violet-500/25" },
                  };
                  const c = colorMap[ch.color];
                  return (
                    <a
                      key={ch.title}
                      href={ch.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block rounded-2xl border ${c.border} ${c.hover} bg-white/[0.02] p-5 group transition-all duration-300 hover:bg-white/[0.03]`}
                      style={{
                        opacity: formSection.isVisible ? 1 : 0,
                        transform: formSection.isVisible ? "translateY(0)" : "translateY(12px)",
                        transition: `all 0.5s ease ${i * 100 + 200}ms`,
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${c.icon}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[14px] font-semibold text-white/80 group-hover:text-white transition-colors">
                              {ch.title}
                            </h4>
                            <ExternalLink className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
                          </div>
                          <p className={`text-[13px] ${c.icon} font-medium mt-0.5`}>{ch.value}</p>
                          <p className="text-[11px] text-white/25 mt-0.5">{ch.desc}</p>
                        </div>
                      </div>
                    </a>
                  );
                })}

                {/* Why contact us */}
                <div
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
                  style={{
                    opacity: formSection.isVisible ? 1 : 0,
                    transform: formSection.isVisible ? "translateY(0)" : "translateY(12px)",
                    transition: `all 0.5s ease 500ms`,
                  }}
                >
                  <p className="text-[11px] text-white/25 uppercase tracking-widest font-semibold mb-4">
                    ¿Por qué contactarnos?
                  </p>
                  <div className="space-y-3">
                    {reasons.map((r) => {
                      const Icon = r.icon;
                      return (
                        <div key={r.text} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-amber-400/60" />
                          </div>
                          <span className="text-[13px] text-white/40">{r.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick CTA */}
                <div
                  className="rounded-2xl border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.04] to-transparent p-5"
                  style={{
                    opacity: formSection.isVisible ? 1 : 0,
                    transform: formSection.isVisible ? "translateY(0)" : "translateY(12px)",
                    transition: `all 0.5s ease 600ms`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-white/80">¿Prefieres empezar ya?</h4>
                      <p className="text-[11px] text-white/25">Crea tu cuenta en 2 minutos</p>
                    </div>
                  </div>
                  <a
                    href="https://app.withmia.com"
                    className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl border border-amber-500/20 text-[13px] font-medium text-amber-400 hover:bg-amber-500/10 transition-all group"
                  >
                    Crear cuenta gratis
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ BOTTOM CTA ════════════════ */}
        <div className="px-4 pb-20 md:pb-28">
          <div
            ref={channels.ref}
            className={`max-w-4xl mx-auto transition-all duration-700 ${
              channels.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="relative rounded-3xl overflow-hidden">
              {/* Gradient mesh */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-violet-500/[0.06] to-cyan-500/[0.04]" />
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-violet-500/10 rounded-full blur-3xl" />
              </div>

              <div className="relative border border-white/[0.08] rounded-3xl p-10 md:p-14 text-center">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Estamos aquí para ayudarte
                </h2>
                <p className="text-[14px] text-white/40 max-w-md mx-auto mb-8 leading-relaxed">
                  Ya sea que necesites una demo, soporte técnico o simplemente quieras
                  conocer más — nuestro equipo está listo.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="https://app.withmia.com"
                    className="relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-semibold text-black hover:brightness-110 transition-all group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative z-10 flex items-center gap-2">
                      Probar gratis
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </a>
                  <a
                    href="/precios"
                    className="flex items-center justify-center px-8 py-3.5 rounded-xl border border-white/[0.1] text-[14px] font-medium text-white/60 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.03] transition-all"
                  >
                    Ver precios
                  </a>
                </div>

                {/* Trust strip */}
                <div className="flex items-center justify-center gap-6 mt-8 text-white/20 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Datos seguros
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Respuesta en &lt; 2h
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> +500 equipos activos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default Contact;