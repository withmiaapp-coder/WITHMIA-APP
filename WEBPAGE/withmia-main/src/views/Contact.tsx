import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  X,
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

  /* ── Scheduling modal state ── */
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [bookingStep, setBookingStep] = useState<'calendar' | 'confirm' | 'done'>('calendar');
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingCompany, setBookingCompany] = useState('');
  const [bookingMotivo, setBookingMotivo] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const bookingReasons = [
    'Quiero una demo de WITHMIA',
    'Consultar sobre precios y planes',
    'Integrar WITHMIA a mi negocio',
    'Automatizar WhatsApp / canales',
    'Otro',
  ];

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = (() => { const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const canGoPrev = new Date(calMonth.getFullYear(), calMonth.getMonth()) > new Date(today.getFullYear(), today.getMonth());

  const prevMonth = () => { if (canGoPrev) setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1)); };
  const nextMonth = () => { setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1)); };

  const timeSlots = ['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45'];
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const openScheduleModal = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingStep('calendar');
    setBookingName('');
    setBookingEmail('');
    setBookingCompany('');
    setBookingMotivo('');
    setCalMonth(new Date());
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    if (bookingStep === 'done') {
      setShowScheduleModal(false);
    } else {
      setShowScheduleModal(false);
    }
  };

  /* Lock body scroll when modal is open */
  useEffect(() => {
    if (showScheduleModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showScheduleModal]);

  const [bookingLoading, setBookingLoading] = useState(false);

  /* Fetch busy slots when a date is selected */
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const apiUrl = import.meta.env.VITE_API_URL || "https://app.withmia.com";
    setLoadingSlots(true);
    setBusySlots([]);
    fetch(`${apiUrl}/api/website/booking/busy?date=${dateStr}`, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.busy_slots) setBusySlots(data.busy_slots);
      })
      .catch(() => { /* silently fail — show all slots */ })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  async function onBookingSubmit() {
    if (!selectedDate || !selectedTime || !bookingName || !bookingEmail) return;

    setBookingLoading(true);
    const motivoText = bookingMotivo || 'Sesión introductoria';
    const dateStr = selectedDate.toISOString().split('T')[0];

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://app.withmia.com";
      const res = await fetch(`${apiUrl}/api/website/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: bookingName,
          email: bookingEmail,
          company: bookingCompany || undefined,
          motivo: motivoText,
          date: dateStr,
          time: selectedTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Error al agendar", { description: data.message || "Intenta nuevamente" });
        setBookingLoading(false);
        return;
      }

      trackFormSubmit("booking", { date: dateStr, time: selectedTime });
      toast.success("¡Sesión agendada!", {
        description: `${selectedDate.toLocaleDateString('es-CL')} a las ${selectedTime} hrs`,
      });
      setBookingStep('done');
    } catch {
      toast.error("Error de conexión", { description: "No se pudo conectar con el servidor" });
    } finally {
      setBookingLoading(false);
    }
  }

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

                  return (
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
                    onClick={openScheduleModal}
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

      {/* ════════════════ SCHEDULE MODAL ════════════════ */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeScheduleModal(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_200ms_ease]" />

          {/* Modal */}
          <div
            ref={modalRef}
            className="relative w-full max-w-[780px] max-h-[90vh] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c1a] animate-[scaleIn_250ms_ease]"
            style={{ boxShadow: '0 0 80px rgba(139, 92, 246, 0.08), 0 0 2px rgba(255,255,255,0.05)' }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeScheduleModal}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top bar */}
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-white">Sesión introductoria WITHMIA</h3>
                <p className="text-[12px] text-white/30 mt-0.5">15 min · Google Meet · Sin costo</p>
              </div>
            </div>

            {bookingStep === 'done' ? (
              /* ── Success ── */
              <div className="p-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">¡Sesión agendada!</h3>
                <p className="text-[15px] text-white/50 mb-1">
                  {selectedDate && `${dayLabels[(selectedDate.getDay() + 6) % 7]} ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
                  {selectedTime && ` · ${selectedTime} hrs`}
                </p>
                <p className="text-[13px] text-white/25 mt-2 mb-8">
                    Recibirás una invitación con los detalles de la reunión en tu correo.
                </p>
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  className="px-8 py-2.5 rounded-xl border border-white/[0.1] text-[13px] font-medium text-white/50 hover:text-white hover:border-white/[0.2] transition-all"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-[1fr,280px] overflow-y-auto max-h-[calc(90vh-130px)]">
                {/* ── Left: Calendar ── */}
                <div className="p-6 md:border-r border-b md:border-b-0 border-white/[0.05]">
                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="text-[15px] font-semibold text-white">
                      {monthNames[calMonth.getMonth()]} {calMonth.getFullYear()}
                    </h4>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={prevMonth}
                        disabled={!canGoPrev}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayLabels.map((d) => (
                      <div key={d} className="text-center text-[10px] text-white/20 font-semibold uppercase tracking-wider py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
                      date.setHours(0, 0, 0, 0);
                      const dayOfWeek = date.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const isPast = date < today;
                      const isDisabled = isPast || isWeekend;
                      const isToday = date.getTime() === today.getTime();
                      const isSelected = selectedDate && selectedDate.getTime() === date.getTime();

                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedTime(null);
                            setBookingStep('calendar');
                          }}
                          className={`aspect-square rounded-lg text-[13px] font-medium transition-all duration-150 ${
                            isSelected
                              ? "bg-violet-500 text-white"
                              : isDisabled
                              ? "text-white/[0.08] cursor-not-allowed"
                              : isToday
                              ? "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20"
                              : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom info */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 pt-5 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1.5 text-[11px] text-white/15">
                      <Clock className="w-3 h-3" /> 15 min
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-white/15">
                      <Shield className="w-3 h-3" /> Sin compromiso
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-white/15">
                      <Headphones className="w-3 h-3" /> Personalizado
                    </span>
                  </div>
                </div>

                {/* ── Right: Time slots / Confirm ── */}
                <div className="p-5">
                  {bookingStep === 'confirm' && selectedDate && selectedTime ? (
                    /* Confirmation form */
                    <div className="flex flex-col h-full">
                      <h4 className="text-[13px] font-semibold text-white mb-1">Confirmar sesión</h4>
                      <p className="text-[11px] text-violet-400/70 mb-5">
                        {`${dayLabels[(selectedDate.getDay() + 6) % 7]} ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]} · ${selectedTime} hrs`}
                      </p>

                      <div className="space-y-3 flex-1">
                        <div>
                          <label className="text-[11px] text-white/30 font-medium mb-1 block">Nombre *</label>
                          <input
                            type="text"
                            value={bookingName}
                            onChange={(e) => setBookingName(e.target.value)}
                            placeholder="Tu nombre"
                            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-[13px] placeholder:text-white/15 focus:border-violet-500/30 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/30 font-medium mb-1 block">Email *</label>
                          <input
                            type="email"
                            value={bookingEmail}
                            onChange={(e) => setBookingEmail(e.target.value)}
                            placeholder="tu@empresa.com"
                            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-[13px] placeholder:text-white/15 focus:border-violet-500/30 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/30 font-medium mb-1 block">Empresa</label>
                          <input
                            type="text"
                            value={bookingCompany}
                            onChange={(e) => setBookingCompany(e.target.value)}
                            placeholder="Nombre de tu empresa"
                            className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-[13px] placeholder:text-white/15 focus:border-violet-500/30 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/30 font-medium mb-1 block">Motivo de la reunión *</label>
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {bookingReasons.map((reason) => (
                              <button
                                key={reason}
                                type="button"
                                onClick={() => setBookingMotivo(bookingMotivo === reason ? '' : reason)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                                  bookingMotivo === reason
                                    ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                                    : 'border-white/[0.06] text-white/30 hover:border-violet-500/15 hover:text-white/50'
                                }`}
                              >
                                {reason}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        <button
                          type="button"
                          onClick={onBookingSubmit}
                          disabled={!bookingName || !bookingEmail || !bookingMotivo || bookingLoading}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 text-[13px] font-semibold text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {bookingLoading ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              Agendando…
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirmar agendamiento
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingStep('calendar')}
                          className="w-full py-2 text-[12px] text-white/25 hover:text-white/50 transition-colors"
                        >
                          ← Cambiar horario
                        </button>
                      </div>
                    </div>
                  ) : selectedDate ? (
                    /* Time slots */
                    <div className="flex flex-col h-full">
                      <h4 className="text-[13px] font-semibold text-white mb-1">
                        {`${dayLabels[(selectedDate.getDay() + 6) % 7]} ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`}
                      </h4>
                      <p className="text-[10px] text-white/20 mb-4">Horario Chile (GMT-4)</p>
                      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1" style={{ maxHeight: '340px' }}>
                        {loadingSlots ? (
                          <div className="flex items-center justify-center py-10">
                            <svg className="w-5 h-5 animate-spin text-violet-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            <span className="ml-2 text-[12px] text-white/30">Cargando disponibilidad…</span>
                          </div>
                        ) : timeSlots.filter((t) => !busySlots.includes(t)).length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-[13px] text-white/30">Sin horarios disponibles</p>
                            <p className="text-[11px] text-white/15 mt-1">Prueba otro día</p>
                          </div>
                        ) : (
                          timeSlots.map((time) => {
                            const isBusy = busySlots.includes(time);
                            if (isBusy) return null;
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  setSelectedTime(time);
                                  setBookingStep('confirm');
                                }}
                                className={`w-full py-2.5 rounded-lg text-[13px] font-medium border transition-all duration-150 ${
                                  selectedTime === time
                                    ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                                    : "border-white/[0.06] text-white/40 hover:border-violet-500/20 hover:text-white/60 hover:bg-white/[0.03]"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <Calendar className="w-10 h-10 text-white/[0.06] mb-4" />
                      <p className="text-[13px] text-white/20 mb-1">Selecciona un día</p>
                      <p className="text-[11px] text-white/10">para ver horarios disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keyframe styles */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  );
};

export default Contact;