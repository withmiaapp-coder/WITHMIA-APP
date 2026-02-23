import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Headphones,
  Send,
  LogIn,
  LogOut,
  Mail,
  Tag,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Plus,
  Lightbulb,
  LifeBuoy,
  Paperclip,
  ArrowRight,
  Loader2,
  ShieldCheck,
  MessageSquare,
  X,
} from "lucide-react";

/* ─── Ticket types ─── */
const ticketTypes = [
  {
    id: "soporte",
    label: "Soporte técnico",
    desc: "Reportar un problema o solicitar ayuda",
    icon: LifeBuoy,
    color: "#3b82f6",
  },
  {
    id: "sugerencia",
    label: "Sugerencia",
    desc: "Proponer una mejora o nueva funcionalidad",
    icon: Lightbulb,
    color: "#f59e0b",
  },
];

const priorityOptions = [
  { id: "baja", label: "Baja", color: "#6b7280" },
  { id: "media", label: "Media", color: "#f59e0b" },
  { id: "alta", label: "Alta", color: "#ef4444" },
];

const categoryOptions = [
  "General",
  "Canales (WhatsApp, IG, etc.)",
  "IA y automatización",
  "Facturación",
  "API e integraciones",
  "Cuenta y acceso",
  "Rendimiento",
  "Otro",
];

/* ─── Mock tickets for UI ─── */
const mockTickets = [
  {
    id: "TK-001",
    type: "soporte",
    subject: "Error al conectar WhatsApp Business",
    status: "abierto",
    priority: "alta",
    createdAt: "2026-02-20T14:30:00Z",
  },
  {
    id: "TK-002",
    type: "sugerencia",
    subject: "Agregar soporte para Telegram",
    status: "en_progreso",
    priority: "media",
    createdAt: "2026-02-18T09:15:00Z",
  },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  abierto: { bg: "bg-blue-500/[0.1]", text: "text-blue-400", label: "Abierto" },
  en_progreso: { bg: "bg-amber-500/[0.1]", text: "text-amber-400", label: "En progreso" },
  resuelto: { bg: "bg-emerald-500/[0.1]", text: "text-emerald-400", label: "Resuelto" },
  cerrado: { bg: "bg-white/[0.05]", text: "text-white/40", label: "Cerrado" },
};

/* ─── Component ─── */
const Support = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Ticket form
  const [showForm, setShowForm] = useState(false);
  const [ticketType, setTicketType] = useState("soporte");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("media");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail.trim()) {
      setLoginError("Ingresa tu correo electrónico");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: loginEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/soporte`,
        },
      });

      if (error) throw error;
      setLoginSent(true);
    } catch (err: any) {
      setLoginError(err.message || "Error al enviar el enlace");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/soporte`,
        },
      });
    } catch (err: any) {
      setLoginError(err.message || "Error al iniciar sesión con Google");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // TODO: Insert into Supabase tickets table
    // await supabase.from('tickets').insert({
    //   user_id: user?.id,
    //   type: ticketType,
    //   subject,
    //   description,
    //   category,
    //   priority,
    //   status: 'abierto',
    // });

    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubmitting(false);
    setSubmitted(true);
    setSubject("");
    setDescription("");
    setCategory("General");
    setPriority("media");

    setTimeout(() => {
      setSubmitted(false);
      setShowForm(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#030507]">
      <Navigation />
      <main className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-950/10 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/[0.02] rounded-full blur-[140px]" />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8">
              <Headphones className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-white/50 tracking-wide">
                Soporte WITHMIA
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-5">
              ¿En qué podemos
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ayudarte?
              </span>
            </h1>

            <p className="text-lg text-white/45 max-w-xl mx-auto leading-relaxed">
              Crea un ticket de soporte o envíanos una sugerencia.
              Tu solicitud será atendida por nuestro equipo lo antes posible.
            </p>
          </div>
        </section>

        {/* ── AUTH / CONTENT ── */}
        <section className="pb-24 border-t border-white/[0.04]">
          <div className="max-w-4xl mx-auto px-6 pt-16">

            {authLoading ? (
              /* Loading */
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
              </div>
            ) : !user ? (
              /* ── LOGIN ── */
              <div className="max-w-md mx-auto">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/[0.08] border border-blue-500/15 flex items-center justify-center mx-auto mb-4">
                      <LogIn className="w-6 h-6 text-blue-400/70" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      Inicia sesión para continuar
                    </h2>
                    <p className="text-[13px] text-white/35">
                      Necesitamos identificarte para gestionar tu ticket y darte seguimiento.
                    </p>
                  </div>

                  {loginSent ? (
                    /* Magic link sent */
                    <div className="text-center py-6">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/[0.1] border border-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white mb-2">
                        Revisa tu correo
                      </h3>
                      <p className="text-[13px] text-white/35 mb-4">
                        Te enviamos un enlace de acceso a{" "}
                        <span className="text-white/60 font-medium">{loginEmail}</span>
                      </p>
                      <button
                        onClick={() => {
                          setLoginSent(false);
                          setLoginEmail("");
                        }}
                        className="text-[12px] text-blue-400/70 hover:text-blue-300 transition-colors"
                      >
                        Usar otro correo
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Google login */}
                      <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] text-white/70 text-[14px] font-medium transition-all duration-300 mb-5"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar con Google
                      </button>

                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[11px] text-white/20 uppercase tracking-wider">o</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>

                      {/* Magic link form */}
                      <form onSubmit={handleMagicLink}>
                        <label className="block text-[12px] text-white/35 mb-2">
                          Correo electrónico
                        </label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="tu@empresa.com"
                          className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80 placeholder-white/20 text-[14px] focus:outline-none focus:border-blue-500/30 transition-colors mb-4"
                        />

                        {loginError && (
                          <div className="flex items-center gap-2 text-[12px] text-red-400/80 mb-4">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {loginError}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-[14px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:-translate-y-px"
                        >
                          <Mail className="w-4 h-4" />
                          Enviar enlace de acceso
                        </button>
                      </form>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-center mt-6 text-[11px] text-white/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Tu información está protegida con cifrado TLS 1.3
                </div>
              </div>
            ) : (
              /* ── AUTHENTICATED VIEW ── */
              <div>
                {/* User bar */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/[0.08] flex items-center justify-center">
                      <span className="text-[13px] font-bold text-white/60">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white/70">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <p className="text-[11px] text-white/25">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-[11px] text-white/30 hover:text-white/50 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar sesión
                  </button>
                </div>

                {/* Actions bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Mis tickets</h2>
                    <p className="text-[13px] text-white/30">
                      Gestiona tus solicitudes de soporte y sugerencias.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setSubmitted(false);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-[13px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:-translate-y-px shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo ticket
                  </button>
                </div>

                {/* ── NEW TICKET FORM ── */}
                {showForm && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] mb-8 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                      <h3 className="text-[15px] font-semibold text-white">
                        {submitted ? "Ticket enviado" : "Crear nuevo ticket"}
                      </h3>
                      <button
                        onClick={() => setShowForm(false)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.05] text-white/20 hover:text-white/50 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {submitted ? (
                      <div className="p-10 text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/[0.1] border border-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          ¡Ticket creado exitosamente!
                        </h3>
                        <p className="text-[13px] text-white/35">
                          Te notificaremos por correo cuando nuestro equipo responda.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitTicket} className="p-6 space-y-6">
                        {/* Ticket type */}
                        <div>
                          <label className="block text-[12px] text-white/35 uppercase tracking-wider mb-3">
                            Tipo de solicitud
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {ticketTypes.map((type) => (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => setTicketType(type.id)}
                                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-300 ${
                                  ticketType === type.id
                                    ? "border-blue-500/25 bg-blue-500/[0.06]"
                                    : "border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.1]"
                                }`}
                              >
                                <div
                                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: `${type.color}12`,
                                    border: `1px solid ${type.color}20`,
                                  }}
                                >
                                  <type.icon className="w-4.5 h-4.5" style={{ color: type.color }} />
                                </div>
                                <div>
                                  <p className="text-[13px] font-medium text-white/70">
                                    {type.label}
                                  </p>
                                  <p className="text-[11px] text-white/25 mt-0.5">
                                    {type.desc}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Subject */}
                        <div>
                          <label className="block text-[12px] text-white/35 uppercase tracking-wider mb-2">
                            Asunto
                          </label>
                          <input
                            type="text"
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={
                              ticketType === "soporte"
                                ? "Ej: Error al enviar mensajes por WhatsApp"
                                : "Ej: Agregar soporte para Telegram"
                            }
                            className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80 placeholder-white/15 text-[14px] focus:outline-none focus:border-blue-500/30 transition-colors"
                          />
                        </div>

                        {/* Category + Priority row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Category */}
                          <div>
                            <label className="block text-[12px] text-white/35 uppercase tracking-wider mb-2">
                              Categoría
                            </label>
                            <div className="relative">
                              <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full appearance-none px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70 text-[14px] focus:outline-none focus:border-blue-500/30 transition-colors"
                              >
                                {categoryOptions.map((opt) => (
                                  <option key={opt} value={opt} className="bg-[#0a0a12] text-white">
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                            </div>
                          </div>

                          {/* Priority */}
                          <div>
                            <label className="block text-[12px] text-white/35 uppercase tracking-wider mb-2">
                              Prioridad
                            </label>
                            <div className="flex gap-2">
                              {priorityOptions.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setPriority(p.id)}
                                  className={`flex-1 py-3 rounded-xl border text-[13px] font-medium transition-all duration-300 ${
                                    priority === p.id
                                      ? "border-blue-500/25 bg-blue-500/[0.06] text-white/80"
                                      : "border-white/[0.06] bg-white/[0.01] text-white/30 hover:text-white/50 hover:border-white/[0.1]"
                                  }`}
                                >
                                  <div
                                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                                    style={{ backgroundColor: p.color }}
                                  />
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-[12px] text-white/35 uppercase tracking-wider mb-2">
                            Descripción
                          </label>
                          <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            placeholder={
                              ticketType === "soporte"
                                ? "Describe el problema en detalle. Incluye pasos para reproducirlo, mensajes de error, etc."
                                : "Describe tu sugerencia: qué funcionalidad te gustaría ver y cómo crees que mejoraría tu experiencia."
                            }
                            className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80 placeholder-white/15 text-[14px] focus:outline-none focus:border-blue-500/30 transition-colors resize-none leading-relaxed"
                          />
                        </div>

                        {/* Submit */}
                        <div className="flex items-center justify-between pt-2">
                          <p className="text-[11px] text-white/15">
                            Te notificaremos las actualizaciones por correo.
                          </p>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-[13px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Enviar ticket
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* ── TICKETS LIST ── */}
                <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-white/[0.04] bg-white/[0.015]">
                    <div className="hidden sm:grid grid-cols-12 gap-4 text-[10px] text-white/25 uppercase tracking-wider font-semibold">
                      <div className="col-span-1">ID</div>
                      <div className="col-span-1">Tipo</div>
                      <div className="col-span-5">Asunto</div>
                      <div className="col-span-2">Estado</div>
                      <div className="col-span-1">Prioridad</div>
                      <div className="col-span-2">Fecha</div>
                    </div>
                  </div>

                  {/* Rows */}
                  {mockTickets.length > 0 ? (
                    <div className="divide-y divide-white/[0.04]">
                      {mockTickets.map((ticket) => {
                        const status = statusColors[ticket.status] || statusColors.abierto;
                        const prio = priorityOptions.find((p) => p.id === ticket.priority);
                        return (
                          <div
                            key={ticket.id}
                            className="px-6 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                          >
                            <div className="sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
                              <div className="col-span-1">
                                <span className="text-[11px] font-mono text-white/25">
                                  {ticket.id}
                                </span>
                              </div>
                              <div className="col-span-1">
                                {ticket.type === "soporte" ? (
                                  <LifeBuoy className="w-4 h-4 text-blue-400/50" />
                                ) : (
                                  <Lightbulb className="w-4 h-4 text-amber-400/50" />
                                )}
                              </div>
                              <div className="col-span-5">
                                <span className="text-[13px] text-white/60 font-medium">
                                  {ticket.subject}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${status.bg} ${status.text}`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                  {status.label}
                                </span>
                              </div>
                              <div className="col-span-1">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: prio?.color }}
                                  />
                                  <span className="text-[11px] text-white/30">
                                    {prio?.label}
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[11px] text-white/20">
                                  {new Date(ticket.createdAt).toLocaleDateString("es-CL", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-3" />
                      <p className="text-[13px] text-white/25">
                        No tienes tickets aún.
                      </p>
                      <p className="text-[11px] text-white/15 mt-1">
                        Crea un ticket de soporte o envía una sugerencia.
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-6 py-3 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                    <span className="text-[11px] text-white/15">
                      {mockTickets.length} ticket{mockTickets.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] text-white/15">
                      Ordenados por fecha más reciente
                    </span>
                  </div>
                </div>

                {/* Info note */}
                <div className="mt-6 flex items-start gap-3 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <Clock className="w-4 h-4 text-white/15 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[12px] text-white/30">
                      <span className="text-white/50 font-medium">Tiempo de respuesta estimado:</span>{" "}
                      Los tickets de soporte se responden normalmente en menos de 24 horas hábiles.
                      Las sugerencias son revisadas semanalmente por nuestro equipo de producto.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default Support;
