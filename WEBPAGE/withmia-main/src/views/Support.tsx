import { trackFormSubmit } from "@/lib/analytics";
import { Reveal } from "@/hooks/useAnimations";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import {
  Headphones,
  Send,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Loader2,
  ShieldCheck,
} from "lucide-react";

/* ── Types ── */
interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

/* ── Google Client ID (from env) ── */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/* ── Google icon ── */
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/* ── JWT decoder ── */
function parseJwt(token: string): Record<string, any> {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

/* ── Category options ── */
const categoryOptions = [
  "General",
  "Canales (WhatsApp, IG, etc.)",
  "IA y automatización",
  "Facturación",
  "API e integraciones",
  "Cuenta y acceso",
  "Otro",
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
const Support = () => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const gsiButtonRef = useRef<HTMLDivElement>(null);

  /* Ticket form */
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* Restore user from sessionStorage */
  useEffect(() => {
    window.scrollTo(0, 0);
    const saved = sessionStorage.getItem("support_user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  /* Google Sign-In callback */
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      const payload = parseJwt(response.credential);
      const googleUser: GoogleUser = {
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture,
      };
      setUser(googleUser);
      sessionStorage.setItem("support_user", JSON.stringify(googleUser));
      setLoginError("");
    } catch (err: any) {
      // Error handled via UI state
      setLoginError("Error al iniciar sesión con Google. Intenta de nuevo.");
    }
  }, []);

  /* Load Google Identity Services SDK */
  useEffect(() => {
    if (user) return; // already logged in

    // Expose callback globally for GSI
    (window as any).__handleSupportGoogleResponse = handleCredentialResponse;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google && gsiButtonRef.current) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
        });
        (window as any).google.accounts.id.renderButton(gsiButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
          text: "continue_with",
          locale: "es",
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      delete (window as any).__handleSupportGoogleResponse;
    };
  }, [user, handleCredentialResponse]);

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("support_user");
    setSubmitted(false);
    // Revoke Google session
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !user) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://app.withmia.com";
      const res = await fetch(`${apiUrl}/api/support-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          subject: subject.trim(),
          description: description.trim(),
          category,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al enviar el ticket");
      }

      setSubmitted(true);
      trackFormSubmit("support_ticket", { category });
      setSubject("");
      setDescription("");
      setCategory("General");
    } catch (err: any) {
      // Error handled via UI state
      setSubmitError(err.message || "Error al enviar el ticket. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
            <Reveal>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/15 bg-amber-500/[0.04] mb-8">
                  <Headphones className="w-3.5 h-3.5 text-amber-400/70" />
                  <span className="text-[11px] font-semibold text-amber-300/60 uppercase tracking-widest">
                    Soporte
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.08] mb-5">
                  ¿En qué podemos
                  <br />
                  <span className="text-gradient">ayudarte?</span>
                </h1>

                <p className="text-[16px] text-white/40 max-w-md mx-auto leading-relaxed">
                  Inicia sesión con Google y envía tu ticket.
                  Nuestro equipo te responderá lo antes posible.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CONTENT ── */}
        <section className="py-10 pb-24">
          <div className="max-w-lg mx-auto px-6">

            {authLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 text-white/15 animate-spin" />
              </div>
            ) : !user ? (
              /* ── GOOGLE LOGIN ── */
              <Reveal>
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-8 sm:p-10">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                      <GoogleIcon />
                    </div>

                    <h2 className="text-lg font-bold text-white/80 mb-2">
                      Inicia sesión para continuar
                    </h2>
                    <p className="text-[13px] text-white/30 mb-8 max-w-xs mx-auto">
                      Necesitamos tu cuenta de Google para identificarte y dar seguimiento a tu solicitud.
                    </p>

                    {/* Native Google Sign-In button */}
                    <div className="flex justify-center">
                      <div ref={gsiButtonRef} />
                    </div>

                    {loginError && (
                      <div className="flex items-center justify-center gap-2 text-[12px] text-red-400/80 mt-4">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {loginError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center mt-5 text-[10px] text-white/12">
                  <ShieldCheck className="w-3 h-3" />
                  Conexión segura · No almacenamos tu contraseña
                </div>
              </Reveal>
            ) : (
              /* ── TICKET FORM ── */
              <Reveal>
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] overflow-hidden">
                  {/* User bar */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt="Foto de perfil del usuario"
                          className="w-7 h-7 rounded-full border border-white/[0.06]"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-amber-500/[0.08] border border-amber-500/10 flex items-center justify-center">
                          <span className="text-[11px] font-bold text-amber-400/60">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-[12px] font-medium text-white/55">
                          {user.name}
                        </p>
                        {user.name !== user.email && (
                          <p className="text-[10px] text-white/15">{user.email}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] text-[10px] text-white/20 hover:text-white/40 transition-all"
                    >
                      <LogOut className="w-3 h-3" />
                      Salir
                    </button>
                  </div>

                  {submitted ? (
                    /* Success */
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/[0.08] border border-emerald-500/12 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400/80" />
                      </div>
                      <h3 className="text-base font-semibold text-white/80 mb-2">
                        ¡Ticket enviado!
                      </h3>
                      <p className="text-[12px] text-white/30 mb-6 max-w-xs mx-auto">
                        Te notificaremos por correo cuando nuestro equipo responda.
                      </p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="text-[12px] text-amber-400/50 hover:text-amber-300 transition-colors font-medium"
                      >
                        Enviar otro ticket
                      </button>
                    </div>
                  ) : (
                    /* Form */
                    <form onSubmit={handleSubmitTicket} className="p-5 space-y-4">
                      {/* Subject */}
                      <div>
                        <label className="block text-[10px] text-white/25 uppercase tracking-wider mb-1.5">
                          Asunto
                        </label>
                        <input
                          type="text"
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Ej: Error al conectar WhatsApp"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/80 placeholder-white/12 text-[13px] focus:outline-none focus:border-amber-500/25 transition-colors"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-[10px] text-white/25 uppercase tracking-wider mb-1.5">
                          Categoría
                        </label>
                        <div className="relative">
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full appearance-none px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/60 text-[13px] focus:outline-none focus:border-amber-500/25 transition-colors"
                          >
                            {categoryOptions.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#0a0a12] text-white">
                                {opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15 pointer-events-none" />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-[10px] text-white/25 uppercase tracking-wider mb-1.5">
                          Descripción
                        </label>
                        <textarea
                          required
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={5}
                          placeholder="Describe tu problema o solicitud con el mayor detalle posible..."
                          className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/80 placeholder-white/12 text-[13px] focus:outline-none focus:border-amber-500/25 transition-colors resize-none leading-relaxed"
                        />
                      </div>

                      {/* Submit */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-white/12">
                          <Clock className="w-3 h-3" />
                          Respuesta en menos de 24h
                        </div>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-[12px] transition-all duration-300 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              Enviar ticket
                            </>
                          )}
                        </button>
                      </div>

                      {submitError && (
                        <div className="flex items-center gap-2 text-[12px] text-red-400/80 pt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {submitError}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </Reveal>
            )}

          </div>
        </section>

      </main>
    </div>
  );
};

export default Support;
