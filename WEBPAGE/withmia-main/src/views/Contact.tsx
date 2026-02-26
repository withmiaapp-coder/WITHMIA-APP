import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@/lib/router";
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
import { toast } from "sonner";
import { trackFormSubmit, trackCTAClick } from "@/lib/analytics";
import { useScrollReveal } from "@/hooks/useAnimations";
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
  "Quiero integrar WITHMIA a mi negocio",
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
    action: "link" as const,
  },
  {
    icon: MessageSquare,
    title: "WhatsApp",
    value: "+56 9 4023 3053",
    href: "https://wa.me/56940233053",
    desc: "Respuesta directa",
    color: "emerald",
    action: "link" as const,
  },
];

const reasons = [
  { icon: Clock, text: "Respondemos en < 2 horas" },
  { icon: MessageSquare, text: "Asesoría personalizada" },
  { icon: Shield, text: "Sin compromiso" },
  { icon: Users, text: "+500 equipos confían en nosotros" },
];

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);

  const hero = useScrollReveal();
  const formSection = useScrollReveal();
  const channels = useScrollReveal();

  /* Load Calendly widget script once */
  useEffect(() => {
    if (document.getElementById("calendly-css")) return;
    const link = document.createElement("link");
    link.id = "calendly-css";
    link.rel = "stylesheet";
    link.href = "https://assets.calendly.com/assets/external/widget.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const openCalendly = useCallback(() => {
    if ((window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: "https://calendly.com/withmia-app/15min" });
    }
  }, []);

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = { ...values, interest: selectedInterest };

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://app.withmia.com";
      await fetch(`${apiUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Silently fail — still show success to user
    }

    trackFormSubmit("contact", { interest: selectedInterest || "none" });

    toast.success("Mensaje enviado", {
      description: "Nos pondremos en contacto contigo pronto.",
    });
    form.reset();
    setSelectedInterest(null);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  }

  return (
    <div className="min-h-screen relative">
      <div className="pt-20 relative overflow-hidden">

        {/* ════════════════ HERO ════════════════ */}
        <div className="relative pt-16 md:pt-24 pb-14 md:pb-20 px-4">

          <div
            ref={hero.ref}
            className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${
              hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/50 font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Hablemos
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5">
              Conversemos sobre{" "}
              <span className="text-gradient">tu negocio</span>
            </h1>
            <p className="text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
              Escríbenos, agenda una llamada o manda un WhatsApp.
              Sin compromiso, sin vendedores agresivos
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
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
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
                              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-[15px] font-semibold text-black hover:brightness-110 transition-all"
                            >
                              <Send className="w-4 h-4" />
                              Enviar mensaje
                            </button>

                            <p className="text-[11px] text-white/15 text-center">
                              Al enviar, aceptas nuestra{" "}
                              <Link to="/privacidad" className="text-white/25 hover:text-white/40 underline">
                                política de privacidad
                              </Link>
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

                  const isCalendly = ch.action === "calendly";

                  const cardContent = (
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
                  );

                  const className = `block w-full text-left rounded-2xl border ${c.border} ${c.hover} bg-white/[0.02] p-5 group transition-all duration-300 hover:bg-white/[0.03] cursor-pointer`;
                  const style = {
                    opacity: formSection.isVisible ? 1 : 0,
                    transform: formSection.isVisible ? "translateY(0)" : "translateY(12px)",
                    transition: `all 0.5s ease ${i * 100 + 200}ms`,
                  };

                  return isCalendly ? (
                    <button
                      key={ch.title}
                      type="button"
                      onClick={openCalendly}
                      className={className}
                      style={style}
                    >
                      {cardContent}
                    </button>
                  ) : (
                    <a
                      key={ch.title}
                      href={ch.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                      style={style}
                    >
                      {cardContent}
                    </a>
                  );
                })}

                {/* Session CTA */}
                <div
                  className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.05] via-amber-500/[0.02] to-transparent p-5"
                  style={{
                    opacity: formSection.isVisible ? 1 : 0,
                    transform: formSection.isVisible ? "translateY(0)" : "translateY(12px)",
                    transition: `all 0.5s ease 500ms`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                    </div>
                    <h4 className="text-[14px] font-semibold text-white/90">¿Listo para que tu empresa fluya?</h4>
                  </div>

                  <p className="text-[13px] text-white/40 leading-relaxed mb-3">
                    En esta sesión de 15 minutos configuraremos tu acceso a WITHMIA para conectar
                    tus canales (WhatsApp, Web, RRSS) y centralizar tu operación
                  </p>
                  <p className="text-[13px] text-white/40 leading-relaxed mb-4">
                    No es un simple chat; es el inicio de tu presencia inteligente que trabaja
                    contigo para vender más y atender mejor, 24/7
                  </p>

                  <div className="space-y-2 mb-5">
                    {[
                      { icon: Shield, text: "Sin compromiso" },
                      { icon: Clock, text: "Solo 15 minutos" },
                      { icon: Headphones, text: "100% personalizado" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.text} className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center shrink-0">
                            <Icon className="w-3 h-3 text-violet-400/70" />
                          </div>
                          <span className="text-[12px] text-white/35">{item.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={openCalendly}
                    className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 text-[13px] font-semibold text-white hover:brightness-110 transition-all group"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Agendar mi sesión gratis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Contact;