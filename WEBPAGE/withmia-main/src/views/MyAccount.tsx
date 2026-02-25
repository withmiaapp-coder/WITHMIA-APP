import { trackFormSubmit } from "@/lib/analytics";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import {
  User as UserIcon,
  Ticket,
  CreditCard,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Crown,
  Calendar,
  Mail,
  Building2,
  ExternalLink,
  RefreshCw,
  Send,
  ChevronDown,
  Settings,
  LayoutDashboard,
  MessageSquare,
  Bell,
  Palette,
  KeyRound,
  ArrowUpRight,
  Users,
} from "lucide-react";

/* ── Types ── */
interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

interface TicketData {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionData {
  plan_name: string;
  price: number;
  billing_cycle: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  trial_ends_at: string | null;
  is_trialing: boolean;
  trial_days_remaining: number;
  max_agents: number | null;
  payment_info: {
    card_brand: string | null;
    card_last_four: string | null;
  };
}

interface CompanyData {
  name: string;
  slug: string;
  logo: string | null;
  assistant_name: string | null;
  timezone: string | null;
  is_active: boolean;
}

interface AccountData {
  name: string;
  email: string;
  role: string;
  onboarding_completed: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

interface AppLinks {
  dashboard: string;
  conversations: string;
  settings: string;
  profile: string;
  password: string;
  notifications: string;
  appearance: string;
  login: string;
}

interface PortalData {
  tickets: TicketData[];
  subscription: SubscriptionData | null;
  company: CompanyData | null;
  account: AccountData | null;
  app_links: AppLinks | null;
  has_account: boolean;
}

/* ── Constants ── */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const API_URL = import.meta.env.VITE_API_URL || "https://app.withmia.com";
const APP_URL = import.meta.env.VITE_APP_URL || "https://app.withmia.com";

/* ── Reveal (shared) ── */
import { Reveal } from "@/hooks/useAnimations";

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
  return JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
}

/* ── Helpers ── */
const statusLabel: Record<string, string> = {
  abierto: "Abierto",
  en_progreso: "En progreso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};
const statusColor: Record<string, string> = {
  abierto: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  en_progreso: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  resuelto: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cerrado: "text-white/30 bg-white/5 border-white/10",
};

const roleLabel: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Administrador",
  agent: "Agente",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Category options (for new ticket form) ── */
const categoryOptions = [
  "General",
  "Canales (WhatsApp, IG, etc.)",
  "IA y automatización",
  "Facturación",
  "API e integraciones",
  "Cuenta y acceso",
  "Otro",
];

/* ── Tab type ── */
type Tab = "overview" | "tickets" | "subscription";

/* ── AppLink component ── */
const AppLink = ({ href, icon: Icon, label, description }: { href: string; icon: any; label: string; description?: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group"
  >
    <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-amber-500/[0.06] group-hover:border-amber-500/15 transition-all">
      <Icon className="w-4 h-4 text-white/25 group-hover:text-amber-400/60 transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium text-white/50 group-hover:text-white/70 transition-colors">{label}</p>
      {description && <p className="text-[10px] text-white/15 mt-0.5">{description}</p>}
    </div>
    <ArrowUpRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors shrink-0" />
  </a>
);

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
const MyAccount = () => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loginError, setLoginError] = useState("");
  const gsiButtonRef = useRef<HTMLDivElement>(null);

  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  /* New ticket form */
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /* Restore user from sessionStorage */
  useEffect(() => {
    window.scrollTo(0, 0);
    const saved = sessionStorage.getItem("support_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  /* Fetch portal data when user is set */
  const fetchPortalData = useCallback(async (email: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/client-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Error");
      setPortalData(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email) fetchPortalData(user.email);
  }, [user, fetchPortalData]);

  /* Google Sign-In */
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      const payload = parseJwt(response.credential);
      const googleUser: GoogleUser = { email: payload.email, name: payload.name || payload.email, picture: payload.picture };
      setUser(googleUser);
      sessionStorage.setItem("support_user", JSON.stringify(googleUser));
      setLoginError("");
    } catch {
      setLoginError("Error al iniciar sesión con Google.");
    }
  }, []);

  useEffect(() => {
    if (user) return;
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
          theme: "outline", size: "large", shape: "pill", width: 320, text: "continue_with", locale: "es",
        });
      }
    };
    document.head.appendChild(script);
  }, [user, handleCredentialResponse]);

  const handleLogout = () => {
    setUser(null);
    setPortalData(null);
    sessionStorage.removeItem("support_user");
    if ((window as any).google?.accounts?.id) (window as any).google.accounts.id.disableAutoSelect();
  };

  /* Submit new ticket */
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/support-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: user.email, name: user.name, subject: subject.trim(), description: description.trim(), category }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Error");
      setSubmitSuccess(true);
      trackFormSubmit("support_ticket_account", { category });
      setSubject("");
      setDescription("");
      setCategory("General");
      setTimeout(() => {
        fetchPortalData(user.email);
        setSubmitSuccess(false);
        setShowNewTicket(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* Helper: app link with fallback */
  const appLink = (key: keyof AppLinks, fallback?: string): string => {
    return portalData?.app_links?.[key] || fallback || APP_URL;
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "General", icon: LayoutDashboard },
    { id: "tickets", label: "Tickets", icon: Ticket },
    { id: "subscription", label: "Suscripción", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen">
      <main className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="max-w-3xl mx-auto px-6 pt-24 pb-12">
            <Reveal>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/15 bg-amber-500/[0.04] mb-8">
                  <UserIcon className="w-3.5 h-3.5 text-amber-400/70" />
                  <span className="text-[11px] font-semibold text-amber-300/60 uppercase tracking-widest">
                    Mi cuenta
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.08] mb-5">
                  Tu <span className="text-gradient">portal</span> de cliente
                </h1>

                <p className="text-[16px] text-white/40 max-w-md mx-auto leading-relaxed">
                  Revisa tus tickets, suscripción y accede directamente a tu cuenta en la aplicación.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CONTENT ── */}
        <section className="py-6 pb-24">
          <div className="max-w-2xl mx-auto px-6">

            {!user ? (
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
                      Usa la misma cuenta de Google con la que accedes a WITHMIA.
                    </p>
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
              /* ── PORTAL ── */
              <Reveal>
                {/* User bar + app access */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {user.picture ? (
                      <img src={user.picture} alt="Foto de perfil" className="w-10 h-10 rounded-full border border-white/[0.08]" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-500/[0.08] border border-amber-500/15 flex items-center justify-center">
                        <span className="text-sm font-bold text-amber-400/60">{user.email.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-[14px] font-medium text-white/70">{user.name}</p>
                      <p className="text-[11px] text-white/25">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {portalData?.has_account && (
                      <a
                        href={appLink("dashboard")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white hover:-translate-y-px transition-all"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                      >
                        <LayoutDashboard className="w-3 h-3" />
                        Abrir app
                      </a>
                    )}
                    <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.04] text-[11px] text-white/25 hover:text-white/50 transition-all">
                      <LogOut className="w-3 h-3" />
                      Salir
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-white/[0.06] text-white/80 border border-white/[0.06]"
                          : "text-white/25 hover:text-white/40 border border-transparent"
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-5 h-5 text-white/15 animate-spin" />
                  </div>
                ) : error && !portalData ? (
                  <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-6 text-center">
                    <AlertCircle className="w-5 h-5 text-red-400/60 mx-auto mb-3" />
                    <p className="text-[13px] text-red-400/70 mb-3">{error}</p>
                    <button onClick={() => fetchPortalData(user.email)} className="text-[11px] text-amber-400/50 hover:text-amber-300 font-medium transition-colors">
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <>
                    {/* ═══════════════════════════════════════
                        OVERVIEW TAB — Account + Quick Access
                        ═══════════════════════════════════════ */}
                    {activeTab === "overview" && (
                      <div className="space-y-5">

                        {/* Account card */}
                        <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-5">
                          <div className="flex items-center gap-4 mb-5">
                            {user.picture ? (
                              <img src={user.picture} alt="Foto de perfil" className="w-14 h-14 rounded-full border-2 border-white/[0.06]" />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-amber-500/[0.08] border-2 border-amber-500/15 flex items-center justify-center">
                                <span className="text-lg font-bold text-amber-400/60">{user.email.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold text-white/70">{portalData?.account?.name || user.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3 text-white/20" />
                                <span className="text-[12px] text-white/30">{user.email}</span>
                              </div>
                              {portalData?.account?.role && (
                                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-amber-500/[0.06] border border-amber-500/15 text-[10px] font-medium text-amber-400/60">
                                  {roleLabel[portalData.account.role] || portalData.account.role}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                              <p className="text-[18px] font-bold text-white/60">{portalData?.tickets.length || 0}</p>
                              <p className="text-[10px] text-white/20 mt-0.5">Tickets</p>
                            </div>
                            <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                              <p className="text-[18px] font-bold text-white/60">
                                {portalData?.subscription
                                  ? portalData.subscription.is_trialing ? "Trial" : "Activo"
                                  : "—"}
                              </p>
                              <p className="text-[10px] text-white/20 mt-0.5">Plan</p>
                            </div>
                            <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                              <p className="text-[18px] font-bold text-white/60">
                                {portalData?.has_account ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400/60 mx-auto" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 text-white/15 mx-auto" />
                                )}
                              </p>
                              <p className="text-[10px] text-white/20 mt-0.5">Cuenta</p>
                            </div>
                          </div>
                        </div>

                        {/* Company info */}
                        {portalData?.company && (
                          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-5">
                            <div className="flex items-center gap-3 mb-3">
                              {portalData.company.logo ? (
                                <img src={portalData.company.logo} alt="Logo de la empresa" className="w-10 h-10 rounded-lg border border-white/[0.06] object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-amber-400/50" />
                                </div>
                              )}
                              <div>
                                <p className="text-[14px] font-semibold text-white/60">{portalData.company.name}</p>
                                {portalData.company.assistant_name && (
                                  <p className="text-[11px] text-white/20">Asistente: {portalData.company.assistant_name}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-white/15">
                              {portalData.company.timezone && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {portalData.company.timezone}
                                </span>
                              )}
                              <span className={`flex items-center gap-1 ${portalData.company.is_active ? "text-emerald-400/40" : "text-red-400/40"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${portalData.company.is_active ? "bg-emerald-400/60" : "bg-red-400/60"}`} />
                                {portalData.company.is_active ? "Activa" : "Inactiva"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Quick access — app deep links */}
                        {portalData?.has_account && (
                          <div>
                            <h3 className="text-[11px] font-semibold text-white/25 uppercase tracking-wider mb-3 px-1">
                              Acceso rápido a la app
                            </h3>
                            <div className="space-y-2">
                              <AppLink
                                href={appLink("dashboard")}
                                icon={LayoutDashboard}
                                label="Dashboard"
                                description="Panel principal de tu empresa"
                              />
                              <AppLink
                                href={appLink("conversations")}
                                icon={MessageSquare}
                                label="Conversaciones"
                                description="Chats y mensajes de clientes"
                              />
                              <AppLink
                                href={appLink("profile")}
                                icon={UserIcon}
                                label="Mi perfil"
                                description="Editar nombre, foto y datos personales"
                              />
                              <AppLink
                                href={appLink("settings")}
                                icon={Settings}
                                label="Configuración general"
                                description="Zona horaria, empresa y preferencias"
                              />
                              <AppLink
                                href={appLink("notifications")}
                                icon={Bell}
                                label="Notificaciones"
                                description="Gestionar alertas y avisos"
                              />
                              <AppLink
                                href={appLink("password")}
                                icon={KeyRound}
                                label="Cambiar contraseña"
                                description="Actualizar credenciales de acceso"
                              />
                              <AppLink
                                href={appLink("appearance")}
                                icon={Palette}
                                label="Apariencia"
                                description="Tema y personalización visual"
                              />
                            </div>
                          </div>
                        )}

                        {/* No account CTA */}
                        {!portalData?.has_account && (
                          <div className="rounded-xl border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.04] to-transparent p-6 text-center">
                            <Building2 className="w-8 h-8 text-amber-400/30 mx-auto mb-3" />
                            <p className="text-[14px] font-semibold text-white/60 mb-2">
                              ¿Aún no tienes cuenta en WITHMIA?
                            </p>
                            <p className="text-[12px] text-white/25 mb-5 max-w-xs mx-auto">
                              Crea tu empresa y accede a todas las funcionalidades de la plataforma.
                            </p>
                            <a
                              href={APP_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white hover:-translate-y-px transition-all"
                              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                            >
                              Comenzar ahora
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ═══════════════════════════════════════
                        TICKETS TAB
                        ═══════════════════════════════════════ */}
                    {activeTab === "tickets" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[13px] font-semibold text-white/50">
                            Mis tickets ({portalData?.tickets.length || 0})
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => fetchPortalData(user.email)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/20 hover:text-white/40 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => { setShowNewTicket(!showNewTicket); setSubmitSuccess(false); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all hover:-translate-y-px"
                              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                            >
                              <Send className="w-3 h-3" />
                              Nuevo ticket
                            </button>
                          </div>
                        </div>

                        {/* New ticket form */}
                        {showNewTicket && (
                          <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.02] p-5">
                            {submitSuccess ? (
                              <div className="text-center py-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mx-auto mb-3" />
                                <p className="text-[13px] font-medium text-white/70">¡Ticket enviado!</p>
                              </div>
                            ) : (
                              <form onSubmit={handleSubmitTicket} className="space-y-3">
                                <input
                                  type="text"
                                  required
                                  value={subject}
                                  onChange={(e) => setSubject(e.target.value)}
                                  placeholder="Asunto"
                                  className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/80 placeholder-white/15 text-[13px] focus:outline-none focus:border-amber-500/25 transition-colors"
                                />
                                <div className="relative">
                                  <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full appearance-none px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/60 text-[13px] focus:outline-none focus:border-amber-500/25 transition-colors"
                                  >
                                    {categoryOptions.map((opt) => (
                                      <option key={opt} value={opt} className="bg-[#0a0a12] text-white">{opt}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15 pointer-events-none" />
                                </div>
                                <textarea
                                  required
                                  value={description}
                                  onChange={(e) => setDescription(e.target.value)}
                                  rows={4}
                                  placeholder="Describe tu problema..."
                                  className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/80 placeholder-white/15 text-[13px] focus:outline-none focus:border-amber-500/25 transition-colors resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => setShowNewTicket(false)} className="px-3 py-2 text-[11px] text-white/30 hover:text-white/50 transition-colors">
                                    Cancelar
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-medium text-white disabled:opacity-50"
                                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                                  >
                                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                    {submitting ? "Enviando..." : "Enviar"}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}

                        {/* Tickets list */}
                        {(!portalData?.tickets.length) ? (
                          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-10 text-center">
                            <Ticket className="w-8 h-8 text-white/8 mx-auto mb-3" />
                            <p className="text-[13px] text-white/25 mb-1">No tienes tickets aún</p>
                            <p className="text-[11px] text-white/12">Crea uno si necesitas ayuda</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {portalData.tickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 hover:bg-white/[0.025] transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-white/70 truncate">{ticket.subject}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                      <span className="text-[10px] text-white/20">{ticket.category}</span>
                                      <span className="text-[10px] text-white/15">·</span>
                                      <span className="text-[10px] text-white/20">{formatDate(ticket.created_at)}</span>
                                    </div>
                                  </div>
                                  <span className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-medium ${statusColor[ticket.status] || statusColor.abierto}`}>
                                    {statusLabel[ticket.status] || ticket.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ═══════════════════════════════════════
                        SUBSCRIPTION TAB
                        ═══════════════════════════════════════ */}
                    {activeTab === "subscription" && (
                      <div className="space-y-4">
                        {!portalData?.has_account ? (
                          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-10 text-center">
                            <Building2 className="w-8 h-8 text-white/8 mx-auto mb-3" />
                            <p className="text-[13px] text-white/30 mb-2">No tienes cuenta en WITHMIA aún</p>
                            <p className="text-[11px] text-white/15 mb-5 max-w-xs mx-auto">
                              Crea tu empresa para acceder a planes y funcionalidades.
                            </p>
                            <a
                              href={APP_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white hover:-translate-y-px transition-all"
                              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                            >
                              Crear cuenta
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : !portalData?.subscription ? (
                          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-10 text-center">
                            <CreditCard className="w-8 h-8 text-white/8 mx-auto mb-3" />
                            <p className="text-[13px] text-white/30 mb-2">Sin suscripción activa</p>
                            <p className="text-[11px] text-white/15 mb-5 max-w-xs mx-auto">
                              {portalData?.company ? `Tu empresa "${portalData.company.name}" no tiene un plan activo.` : "No se encontró una suscripción vinculada a tu cuenta."}
                            </p>
                            <a
                              href={appLink("dashboard")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white hover:-translate-y-px transition-all"
                              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                            >
                              Ver planes en la app
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <>
                            {/* Plan card */}
                            <div className="rounded-xl border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.04] to-transparent p-6">
                              <div className="flex items-start justify-between mb-5">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Crown className="w-4 h-4 text-amber-400/70" />
                                    <span className="text-[14px] font-bold text-white/80">{portalData.subscription.plan_name}</span>
                                  </div>
                                  {portalData.company && (
                                    <p className="text-[11px] text-white/25">{portalData.company.name}</p>
                                  )}
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wider ${
                                  portalData.subscription.status === "active"
                                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/15"
                                    : portalData.subscription.is_trialing
                                    ? "text-blue-400 bg-blue-500/10 border-blue-500/15"
                                    : "text-white/30 bg-white/5 border-white/10"
                                }`}>
                                  {portalData.subscription.is_trialing
                                    ? `Trial · ${portalData.subscription.trial_days_remaining}d`
                                    : portalData.subscription.status === "active"
                                    ? "Activo"
                                    : portalData.subscription.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                                  <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Precio</p>
                                  <p className="text-[18px] font-bold text-white/70">
                                    ${portalData.subscription.price}
                                    <span className="text-[10px] font-normal text-white/25">
                                      /{portalData.subscription.billing_cycle === "monthly" ? "mes" : "año"}
                                    </span>
                                  </p>
                                </div>
                                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                                  <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Ciclo</p>
                                  <p className="text-[13px] font-medium text-white/60">
                                    {portalData.subscription.billing_cycle === "monthly" ? "Mensual" : "Anual"}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                                  <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Agentes</p>
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-white/30" />
                                    <p className="text-[13px] font-medium text-white/60">
                                      {portalData.subscription.max_agents ?? "∞"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Dates */}
                              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                                {portalData.subscription.starts_at && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-white/20">
                                    <Calendar className="w-3 h-3" />
                                    Desde {formatDate(portalData.subscription.starts_at)}
                                  </div>
                                )}
                                {portalData.subscription.ends_at && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-white/20">
                                    <Clock className="w-3 h-3" />
                                    Hasta {formatDate(portalData.subscription.ends_at)}
                                  </div>
                                )}
                                {portalData.subscription.is_trialing && portalData.subscription.trial_ends_at && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-blue-400/50">
                                    <Clock className="w-3 h-3" />
                                    Trial hasta {formatDate(portalData.subscription.trial_ends_at)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Payment info */}
                            {(portalData.subscription.payment_info.card_brand || portalData.subscription.payment_info.card_last_four) && (
                              <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-5">
                                <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">Método de pago</h4>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-white/25" />
                                  </div>
                                  <div>
                                    <p className="text-[13px] text-white/60 font-medium">
                                      {portalData.subscription.payment_info.card_brand || "Tarjeta"} ····{portalData.subscription.payment_info.card_last_four || "****"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Manage in app */}
                            <div className="rounded-xl border border-amber-500/8 bg-amber-500/[0.02] p-4">
                              <p className="text-[11px] text-white/20 mb-3">
                                Para cambiar de plan, actualizar método de pago o cancelar, accede desde la aplicación:
                              </p>
                              <a
                                href={appLink("dashboard")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-[12px] font-semibold text-white hover:-translate-y-px transition-all"
                                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                              >
                                <Settings className="w-3.5 h-3.5" />
                                Gestionar suscripción en la app
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Reveal>
            )}

          </div>
        </section>

      </main>
    </div>
  );
};

export default MyAccount;
