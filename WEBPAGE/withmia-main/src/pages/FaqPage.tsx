import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  ChevronDown,
  MessageCircle,
  Clock,
  Plus,
  Send,
  HelpCircle,
  TrendingUp,
  Flame,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  User,
  X,
  Lightbulb,
  BookOpen,
  ShieldCheck,
  CreditCard,
  Bot,
  Layers,
  Users,
  Code,
  Headphones,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   SECTION 1 – STATIC FAQ DATA (accordion)
   ═══════════════════════════════════════════════════════════ */

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: FaqItem[];
}

const faqCategories: FaqCategory[] = [
  {
    id: "general",
    label: "General",
    icon: HelpCircle,
    items: [
      {
        q: "¿Qué es WITHMIA?",
        a: "WITHMIA es una plataforma omnicanal de atención al cliente potenciada con inteligencia artificial. Centraliza conversaciones de WhatsApp, Instagram, correo y más en un solo lugar, con automatización inteligente y analíticas en tiempo real.",
      },
      {
        q: "¿Necesito conocimientos técnicos para usar WITHMIA?",
        a: "No. WITHMIA fue diseñada para que cualquier equipo pueda configurarla sin programar. El asistente de IA, las automatizaciones y los canales se configuran desde una interfaz visual e intuitiva.",
      },
      {
        q: "¿En qué países está disponible WITHMIA?",
        a: "WITHMIA está disponible en toda Latinoamérica y España. Nuestra infraestructura está alojada en servidores de alta disponibilidad con presencia en múltiples regiones.",
      },
      {
        q: "¿Hay una versión móvil?",
        a: "Actualmente WITHMIA funciona como aplicación web responsive, optimizada para desktop y tablet. La app móvil nativa está en desarrollo y se espera para el segundo semestre de 2026.",
      },
    ],
  },
  {
    id: "canales",
    label: "Canales",
    icon: Layers,
    items: [
      {
        q: "¿Qué canales de comunicación soporta WITHMIA?",
        a: "WhatsApp Business API, Instagram DM, Facebook Messenger, correo electrónico, chat web, y SMS. Estamos trabajando en agregar Telegram y Google Business Messages.",
      },
      {
        q: "¿Cómo conecto mi WhatsApp Business?",
        a: "Ve a Configuración → Canales → WhatsApp y sigue el asistente. Necesitarás acceso a tu cuenta de Meta Business Suite y un número verificado. El proceso toma menos de 5 minutos.",
      },
      {
        q: "¿Puedo enviar campañas masivas por WhatsApp?",
        a: "Sí, a través de plantillas HSM aprobadas por Meta. Puedes segmentar audiencias, programar envíos y medir resultados. Todos los envíos cumplen con las políticas de WhatsApp Business.",
      },
    ],
  },
  {
    id: "ia",
    label: "IA y Bots",
    icon: Bot,
    items: [
      {
        q: "¿La IA puede aprender de mis documentos?",
        a: "Sí. Puedes entrenar el asistente con documentos (PDF, Word, web), base de conocimiento y FAQs. Usa RAG (Retrieval-Augmented Generation) para respuestas precisas basadas en tu información.",
      },
      {
        q: "¿El bot puede transferir a un agente humano?",
        a: "Sí. Detecta automáticamente cuando no puede resolver una consulta y transfiere al agente humano. Puedes configurar reglas de escalamiento, horarios y equipos de asignación.",
      },
      {
        q: "¿Cuánto tarda en aprender la IA?",
        a: "El procesamiento de documentos es casi inmediato. Una vez subidos tus archivos, la IA estará lista para responder en cuestión de minutos, dependiendo del volumen de información.",
      },
    ],
  },
  {
    id: "equipo",
    label: "Equipo",
    icon: Users,
    items: [
      {
        q: "¿Cuántos agentes puede tener mi equipo?",
        a: "Depende del plan: Starter incluye 3 agentes, Professional hasta 15, y Enterprise es ilimitado. Puedes agregar agentes adicionales en cualquier momento.",
      },
      {
        q: "¿Puedo asignar roles y permisos?",
        a: "Sí. WITHMIA tiene un sistema de roles (Administrador, Supervisor, Agente) con permisos granulares para controlar el acceso a funciones, datos y configuraciones.",
      },
    ],
  },
  {
    id: "facturacion",
    label: "Facturación",
    icon: CreditCard,
    items: [
      {
        q: "¿Cómo funciona la facturación?",
        a: "La facturación es mensual o anual (con 20% de descuento). Puedes cambiar de plan en cualquier momento: al subir aplica inmediatamente, al bajar aplica en el siguiente ciclo. Sin contratos de permanencia.",
      },
      {
        q: "¿Qué métodos de pago aceptan?",
        a: "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), transferencia bancaria y, en Chile, WebPay. Las facturas se emiten automáticamente cada mes.",
      },
      {
        q: "¿Hay prueba gratuita?",
        a: "Sí, ofrecemos 14 días de prueba gratuita con acceso completo a todas las funciones del plan Professional. No se requiere tarjeta de crédito para comenzar.",
      },
    ],
  },
  {
    id: "api",
    label: "API e Integraciones",
    icon: Code,
    items: [
      {
        q: "¿Puedo integrar WITHMIA con mi CRM?",
        a: "Sí. Integraciones nativas con HubSpot, Salesforce, Pipedrive y más, a través de conectores directos. También puedes usar la API REST o webhooks para integraciones personalizadas.",
      },
      {
        q: "¿La API tiene límites de uso?",
        a: "Sí. El plan Starter permite 1.000 req/min, Professional 5.000 req/min, y Enterprise 15.000 req/min. Para necesidades mayores, contáctanos para un plan personalizado.",
      },
    ],
  },
  {
    id: "seguridad",
    label: "Seguridad",
    icon: ShieldCheck,
    items: [
      {
        q: "¿WITHMIA cumple con la ley de protección de datos?",
        a: "Sí. Cumplimos con la Ley N° 19.628 (Chile), estamos preparados para GDPR, usamos cifrado TLS 1.3, almacenamiento seguro y políticas de retención configurables. Los usuarios pueden ejercer sus derechos ARCO.",
      },
      {
        q: "¿Dónde se almacenan los datos?",
        a: "Los datos se almacenan en servidores seguros con cifrado en reposo (AES-256) y en tránsito (TLS 1.3). Realizamos backups automáticos diarios con retención de 30 días.",
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   SECTION 2 – SUGGESTIONS (interactive, votes + comments)
   ═══════════════════════════════════════════════════════════ */

interface SuggComment {
  id: number;
  author: string;
  text: string;
  date: string;
}

interface Suggestion {
  id: number;
  title: string;
  description: string;
  category: string;
  votes: number;
  userVote: number;
  comments: SuggComment[];
  author: string;
  date: string;
  status: "nueva" | "en-revision" | "planificada" | "completada";
}

const suggCategories = [
  { id: "todos", label: "Todos" },
  { id: "feature", label: "Nueva función" },
  { id: "mejora", label: "Mejora" },
  { id: "integracion", label: "Integración" },
  { id: "ux", label: "UX / Diseño" },
  { id: "otro", label: "Otro" },
];

const suggSortOptions = [
  { id: "popular", label: "Más votadas", icon: Flame },
  { id: "reciente", label: "Recientes", icon: Clock },
  { id: "trending", label: "Tendencia", icon: TrendingUp },
];

const statusConfig: Record<Suggestion["status"], { label: string; color: string }> = {
  nueva: { label: "Nueva", color: "bg-blue-500/[0.08] border-blue-500/12 text-blue-400/70" },
  "en-revision": { label: "En revisión", color: "bg-amber-500/[0.08] border-amber-500/12 text-amber-400/70" },
  planificada: { label: "Planificada", color: "bg-purple-500/[0.08] border-purple-500/12 text-purple-400/70" },
  completada: { label: "Completada", color: "bg-emerald-500/[0.08] border-emerald-500/12 text-emerald-400/70" },
};

const initialSuggestions: Suggestion[] = [
  {
    id: 1,
    title: "App móvil nativa para agentes",
    description: "Sería genial tener una app móvil para que los agentes puedan responder conversaciones desde el teléfono cuando están en terreno.",
    category: "feature",
    votes: 64,
    userVote: 0,
    comments: [
      { id: 1, author: "Roberto S.", text: "Necesito esto urgente, mis agentes están en terreno todo el día", date: "2026-02-21" },
      { id: 2, author: "Carla M.", text: "Al menos una PWA sería un buen comienzo", date: "2026-02-22" },
    ],
    author: "Andrea L.",
    date: "2026-01-28",
    status: "planificada",
  },
  {
    id: 2,
    title: "Integración con Telegram",
    description: "Agregar Telegram como canal de comunicación. Muchos clientes en Europa y Rusia lo usan como medio principal.",
    category: "integracion",
    votes: 41,
    userVote: 0,
    comments: [
      { id: 3, author: "Matías V.", text: "Muy útil para empresas con clientes en Europa", date: "2026-02-19" },
      { id: 4, author: "Camila P.", text: "+1 a esto, muchos clientes nuestros usan Telegram", date: "2026-02-20" },
    ],
    author: "Javier M.",
    date: "2026-02-05",
    status: "en-revision",
  },
  {
    id: 3,
    title: "Dashboard de analíticas más detallado",
    description: "Más métricas como tiempo promedio de primera respuesta, satisfacción por canal, rendimiento por agente y exportación a PDF.",
    category: "mejora",
    votes: 37,
    userVote: 0,
    comments: [
      { id: 5, author: "Laura G.", text: "Exportar a PDF sería increíble para los reportes mensuales", date: "2026-02-18" },
    ],
    author: "Diego F.",
    date: "2026-02-10",
    status: "planificada",
  },
  {
    id: 4,
    title: "Modo oscuro en el panel de agente",
    description: "Opción de dark mode para el dashboard del agente. Los equipos que trabajan en turnos nocturnos lo agradecerían mucho.",
    category: "ux",
    votes: 29,
    userVote: 0,
    comments: [],
    author: "Sofía R.",
    date: "2026-02-14",
    status: "nueva",
  },
  {
    id: 5,
    title: "Respuestas predefinidas con variables dinámicas",
    description: "Poder usar variables como {nombre_cliente}, {numero_orden} en las respuestas rápidas para personalizar sin escribir cada vez.",
    category: "feature",
    votes: 52,
    userVote: 0,
    comments: [
      { id: 6, author: "Pedro L.", text: "Esto ahorraría mucho tiempo al equipo de soporte", date: "2026-02-20" },
      { id: 7, author: "Ana M.", text: "HubSpot lo tiene y es súper útil", date: "2026-02-21" },
    ],
    author: "Carlos R.",
    date: "2026-02-01",
    status: "en-revision",
  },
  {
    id: 6,
    title: "Integración nativa con Google Sheets",
    description: "Poder exportar automáticamente datos de conversaciones, leads y métricas a Google Sheets para equipos que usan hojas de cálculo.",
    category: "integracion",
    votes: 23,
    userVote: 0,
    comments: [
      { id: 8, author: "María C.", text: "Usamos Sheets para todo, sería genial", date: "2026-02-22" },
    ],
    author: "Felipe T.",
    date: "2026-02-18",
    status: "nueva",
  },
  {
    id: 7,
    title: "Encuestas de satisfacción post-conversación",
    description: "Enviar una encuesta automática tipo CSAT o NPS al cerrar una conversación, con resultados en el dashboard de analíticas.",
    category: "feature",
    votes: 45,
    userVote: 0,
    comments: [],
    author: "Valentina C.",
    date: "2026-01-30",
    status: "completada",
  },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

const FaqPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<"faq" | "sugerencias">("faq");

  /* ── FAQ state ── */
  const [faqSearch, setFaqSearch] = useState("");
  const [faqSearchFocused, setFaqSearchFocused] = useState(false);
  const [activeFaqCat, setActiveFaqCat] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  /* ── Suggestions state ── */
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions);
  const [suggSearch, setSuggSearch] = useState("");
  const [suggSearchFocused, setSuggSearchFocused] = useState(false);
  const [activeSuggCat, setActiveSuggCat] = useState("todos");
  const [activeSuggSort, setActiveSuggSort] = useState("popular");
  const [expandedSugg, setExpandedSugg] = useState<number | null>(null);
  const [commentingSugg, setCommentingSugg] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [showSuggForm, setShowSuggForm] = useState(false);
  const [newSuggTitle, setNewSuggTitle] = useState("");
  const [newSuggDesc, setNewSuggDesc] = useState("");
  const [newSuggCat, setNewSuggCat] = useState("feature");
  const [suggSubmitted, setSuggSubmitted] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement>(null);

  /* ── Filtered FAQ items ── */
  const filteredFaqCategories = useMemo(() => {
    if (!faqSearch && activeFaqCat === "all") return faqCategories;

    return faqCategories
      .filter((cat) => activeFaqCat === "all" || cat.id === activeFaqCat)
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            !faqSearch ||
            item.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
            item.a.toLowerCase().includes(faqSearch.toLowerCase())
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [faqSearch, activeFaqCat]);

  const totalFaqItems = faqCategories.reduce((sum, c) => sum + c.items.length, 0);

  /* ── Filtered & sorted suggestions ── */
  const filteredSuggestions = useMemo(() => {
    let result = suggestions.filter((s) => {
      const matchesCat = activeSuggCat === "todos" || s.category === activeSuggCat;
      const matchesSearch =
        !suggSearch ||
        s.title.toLowerCase().includes(suggSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(suggSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });

    if (activeSuggSort === "popular") {
      result.sort((a, b) => b.votes - a.votes);
    } else if (activeSuggSort === "reciente") {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      result.sort((a, b) => b.comments.length + b.votes - (a.comments.length + a.votes));
    }
    return result;
  }, [suggestions, suggSearch, activeSuggCat, activeSuggSort]);

  /* ── Handlers ── */
  const handleVote = (id: number, dir: 1 | -1) => {
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nv = s.userVote === dir ? 0 : dir;
        return { ...s, userVote: nv, votes: s.votes + (nv - s.userVote) };
      })
    );
  };

  const handleAddComment = (suggId: number) => {
    if (!newComment.trim()) return;
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.id !== suggId) return s;
        return {
          ...s,
          comments: [
            ...s.comments,
            { id: Date.now(), author: "Tú", text: newComment.trim(), date: new Date().toISOString().split("T")[0] },
          ],
        };
      })
    );
    setNewComment("");
    setCommentingSugg(null);
  };

  const handleSubmitSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuggTitle.trim()) return;
    const ns: Suggestion = {
      id: Date.now(),
      title: newSuggTitle.trim(),
      description: newSuggDesc.trim(),
      category: newSuggCat,
      votes: 1,
      userVote: 1,
      comments: [],
      author: "Tú",
      date: new Date().toISOString().split("T")[0],
      status: "nueva",
    };
    setSuggestions((prev) => [ns, ...prev]);
    setNewSuggTitle("");
    setNewSuggDesc("");
    setNewSuggCat("feature");
    setSuggSubmitted(true);
    setTimeout(() => {
      setSuggSubmitted(false);
      setShowSuggForm(false);
    }, 2500);
  };

  /* ═══════════  RENDER  ═══════════ */
  return (
    <div className="min-h-screen bg-[#030507]">
      <Navigation />
      <main className="pt-20">

        {/* ────────── HERO ────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/10 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/[0.02] rounded-full blur-[140px]" />
          </div>

          <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-white/50 tracking-wide">
                Centro de Preguntas
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Preguntas Frecuentes
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                & Sugerencias
              </span>
            </h1>

            <p className="text-lg text-white/45 max-w-2xl mx-auto leading-relaxed mb-10">
              Resuelve tus dudas al instante o comparte ideas para mejorar
              WITHMIA. Vota y comenta las sugerencias de la comunidad.
            </p>

            {/* Tab switcher */}
            <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <button
                onClick={() => setActiveTab("faq")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all duration-300 ${
                  activeTab === "faq"
                    ? "bg-white/[0.08] text-white shadow-sm"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Preguntas Frecuentes
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/30">
                  {totalFaqItems}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("sugerencias")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all duration-300 ${
                  activeTab === "sugerencias"
                    ? "bg-white/[0.08] text-white shadow-sm"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Sugerencias
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/30">
                  {suggestions.length}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ────────── TAB: PREGUNTAS FRECUENTES ────────── */}
        {activeTab === "faq" && (
          <section className="pb-24 border-t border-white/[0.04]">
            <div className="max-w-4xl mx-auto px-6 pt-10">
              {/* Search + filter */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-10">
                <div
                  className={`relative flex-1 w-full flex items-center rounded-2xl border transition-all duration-300 ${
                    faqSearchFocused
                      ? "border-emerald-500/30 bg-white/[0.05] shadow-[0_0_30px_rgba(16,185,129,0.05)]"
                      : "border-white/[0.08] bg-white/[0.03]"
                  }`}
                >
                  <Search className="absolute left-5 w-4 h-4 text-white/25" />
                  <input
                    type="text"
                    placeholder="Buscar en preguntas frecuentes..."
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    onFocus={() => setFaqSearchFocused(true)}
                    onBlur={() => setFaqSearchFocused(false)}
                    className="w-full pl-12 pr-5 py-3.5 bg-transparent text-white/80 placeholder-white/25 text-[14px] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveFaqCat("all")}
                    className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                      activeFaqCat === "all"
                        ? "bg-emerald-500/[0.12] border border-emerald-500/25 text-emerald-300"
                        : "bg-white/[0.02] border border-white/[0.06] text-white/30 hover:text-white/50"
                    }`}
                  >
                    Todos
                  </button>
                  {faqCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveFaqCat(cat.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                        activeFaqCat === cat.id
                          ? "bg-emerald-500/[0.12] border border-emerald-500/25 text-emerald-300"
                          : "bg-white/[0.02] border border-white/[0.06] text-white/30 hover:text-white/50"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ Accordion */}
              {filteredFaqCategories.length > 0 ? (
                <div className="space-y-10">
                  {filteredFaqCategories.map((cat) => (
                    <div key={cat.id}>
                      {/* Category header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                          <cat.icon className="w-4 h-4 text-emerald-400/60" />
                        </div>
                        <h2 className="text-[15px] font-semibold text-white/70">{cat.label}</h2>
                        <span className="text-[11px] text-white/20">{cat.items.length} preguntas</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        {cat.items.map((item, idx) => {
                          const key = `${cat.id}-${idx}`;
                          const isOpen = expandedFaq === key;
                          return (
                            <div
                              key={idx}
                              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                                isOpen
                                  ? "border-white/[0.1] bg-white/[0.03]"
                                  : "border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.025] hover:border-white/[0.08]"
                              }`}
                            >
                              <button
                                onClick={() => setExpandedFaq(isOpen ? null : key)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left"
                              >
                                <span className="text-[14px] font-medium text-white/70 pr-4 leading-snug">
                                  {item.q}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-white/15 shrink-0 transition-transform duration-300 ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                              {isOpen && (
                                <div className="px-5 pb-5 animate-in fade-in duration-200">
                                  <p className="text-[13px] text-white/40 leading-relaxed">{item.a}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <HelpCircle className="w-10 h-10 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 text-sm mb-2">No se encontraron preguntas.</p>
                  <button
                    onClick={() => {
                      setFaqSearch("");
                      setActiveFaqCat("all");
                    }}
                    className="text-[12px] text-emerald-400/70 hover:text-emerald-300 transition-colors"
                  >
                    Ver todas las preguntas
                  </button>
                </div>
              )}

              {/* CTA to suggestions */}
              <div className="mt-12 p-6 rounded-2xl border border-white/[0.04] bg-white/[0.01] text-center">
                <Lightbulb className="w-6 h-6 text-emerald-400/40 mx-auto mb-3" />
                <p className="text-[14px] text-white/35 mb-3">
                  ¿No encontraste lo que buscas? ¿Tienes una idea para mejorar WITHMIA?
                </p>
                <button
                  onClick={() => setActiveTab("sugerencias")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-[13px] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Enviar sugerencia
                </button>
              </div>

              {/* Need more help? → Soporte */}
              <div className="mt-6 flex items-center justify-center gap-6 text-[12px] text-white/20">
                <a href="/soporte" className="flex items-center gap-1.5 hover:text-emerald-400/60 transition-colors">
                  <Headphones className="w-3.5 h-3.5" />
                  Contactar Soporte
                </a>
                <span className="text-white/[0.06]">|</span>
                <a href="/ayuda" className="flex items-center gap-1.5 hover:text-emerald-400/60 transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />
                  Centro de Ayuda
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ────────── TAB: SUGERENCIAS ────────── */}
        {activeTab === "sugerencias" && (
          <section ref={suggestionsRef} className="pb-24 border-t border-white/[0.04]">
            <div className="max-w-4xl mx-auto px-6 pt-10">
              {/* Search */}
              <div className="mb-6">
                <div
                  className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
                    suggSearchFocused
                      ? "border-emerald-500/30 bg-white/[0.05] shadow-[0_0_30px_rgba(16,185,129,0.05)]"
                      : "border-white/[0.08] bg-white/[0.03]"
                  }`}
                >
                  <Search className="absolute left-5 w-4 h-4 text-white/25" />
                  <input
                    type="text"
                    placeholder="Buscar sugerencias..."
                    value={suggSearch}
                    onChange={(e) => setSuggSearch(e.target.value)}
                    onFocus={() => setSuggSearchFocused(true)}
                    onBlur={() => setSuggSearchFocused(false)}
                    className="w-full pl-12 pr-5 py-3.5 bg-transparent text-white/80 placeholder-white/25 text-[14px] focus:outline-none"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div className="flex flex-wrap items-center gap-2">
                  {suggCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveSuggCat(cat.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                        activeSuggCat === cat.id
                          ? "bg-emerald-500/[0.12] border border-emerald-500/25 text-emerald-300"
                          : "bg-white/[0.02] border border-white/[0.06] text-white/30 hover:text-white/50"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    {suggSortOptions.map((sort) => (
                      <button
                        key={sort.id}
                        onClick={() => setActiveSuggSort(sort.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          activeSuggSort === sort.id
                            ? "bg-white/[0.06] text-white/70"
                            : "text-white/25 hover:text-white/45"
                        }`}
                      >
                        <sort.icon className="w-3 h-3" />
                        {sort.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setShowSuggForm(true);
                      setSuggSubmitted(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-[12px] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:-translate-y-px shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva sugerencia
                  </button>
                </div>
              </div>

              {/* ── New suggestion form ── */}
              {showSuggForm && (
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] mb-8 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/10">
                    <h3 className="text-[14px] font-semibold text-white">
                      {suggSubmitted ? "¡Sugerencia publicada!" : "Enviar sugerencia"}
                    </h3>
                    <button
                      onClick={() => setShowSuggForm(false)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.05] text-white/20 hover:text-white/50 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {suggSubmitted ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/[0.1] border border-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-[13px] text-white/40">
                        Tu sugerencia fue publicada. La comunidad podrá votarla y comentarla.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitSuggestion} className="p-6 space-y-4">
                      <div>
                        <label className="block text-[11px] text-white/30 uppercase tracking-wider mb-2">
                          Título de la sugerencia
                        </label>
                        <input
                          required
                          type="text"
                          value={newSuggTitle}
                          onChange={(e) => setNewSuggTitle(e.target.value)}
                          placeholder="Ej: Agregar soporte para Telegram"
                          className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80 placeholder-white/15 text-[14px] focus:outline-none focus:border-emerald-500/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/30 uppercase tracking-wider mb-2">
                          Descripción (opcional)
                        </label>
                        <textarea
                          value={newSuggDesc}
                          onChange={(e) => setNewSuggDesc(e.target.value)}
                          rows={3}
                          placeholder="Describe tu idea con más detalle..."
                          className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/80 placeholder-white/15 text-[14px] focus:outline-none focus:border-emerald-500/30 transition-colors resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <label className="block text-[11px] text-white/30 uppercase tracking-wider mb-2">
                            Tipo
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {suggCategories
                              .filter((c) => c.id !== "todos")
                              .map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setNewSuggCat(cat.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                    newSuggCat === cat.id
                                      ? "bg-emerald-500/[0.12] border border-emerald-500/25 text-emerald-300"
                                      : "bg-white/[0.02] border border-white/[0.06] text-white/25 hover:text-white/40"
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-[13px] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Publicar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ── Suggestions list ── */}
              <div className="space-y-3">
                {filteredSuggestions.map((sugg) => {
                  const isExpanded = expandedSugg === sugg.id;
                  const catLabel = suggCategories.find((c) => c.id === sugg.category)?.label || sugg.category;
                  const st = statusConfig[sugg.status];

                  return (
                    <div
                      key={sugg.id}
                      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isExpanded
                          ? "border-white/[0.1] bg-white/[0.03]"
                          : "border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.025] hover:border-white/[0.08]"
                      }`}
                    >
                      <div className="flex">
                        {/* Vote column */}
                        <div className="flex flex-col items-center py-5 px-4 border-r border-white/[0.04] shrink-0">
                          <button
                            onClick={() => handleVote(sugg.id, 1)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              sugg.userVote === 1
                                ? "bg-emerald-500/[0.15] text-emerald-400"
                                : "text-white/15 hover:text-white/40 hover:bg-white/[0.04]"
                            }`}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <span
                            className={`text-[14px] font-bold my-1 ${
                              sugg.userVote === 1
                                ? "text-emerald-400"
                                : sugg.userVote === -1
                                ? "text-red-400/70"
                                : "text-white/40"
                            }`}
                          >
                            {sugg.votes}
                          </span>
                          <button
                            onClick={() => handleVote(sugg.id, -1)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              sugg.userVote === -1
                                ? "bg-red-500/[0.15] text-red-400"
                                : "text-white/15 hover:text-white/40 hover:bg-white/[0.04]"
                            }`}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => setExpandedSugg(isExpanded ? null : sugg.id)}
                            className="w-full text-left px-5 py-5"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/25">
                                    {catLabel}
                                  </span>
                                  <span className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${st.color}`}>
                                    {st.label}
                                  </span>
                                </div>

                                <h3 className="text-[14px] sm:text-[15px] font-medium text-white/75 leading-snug pr-4">
                                  {sugg.title}
                                </h3>

                                {sugg.description && (
                                  <p className="text-[12px] text-white/25 mt-1.5 line-clamp-2 leading-relaxed">
                                    {sugg.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-4 mt-2.5">
                                  <span className="flex items-center gap-1 text-[11px] text-white/20">
                                    <User className="w-3 h-3" />
                                    {sugg.author}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-white/15">
                                    <Clock className="w-3 h-3" />
                                    {new Date(sugg.date).toLocaleDateString("es-CL", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-white/15">
                                    <MessageCircle className="w-3 h-3" />
                                    {sugg.comments.length}
                                  </span>
                                </div>
                              </div>
                              <ChevronDown
                                className={`w-4 h-4 text-white/15 shrink-0 mt-1 transition-transform duration-300 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-5 pb-5 animate-in fade-in duration-200">
                              {sugg.description && (
                                <p className="text-[13px] text-white/35 leading-relaxed mb-4">
                                  {sugg.description}
                                </p>
                              )}

                              {sugg.comments.length > 0 && (
                                <div className="space-y-3 mb-4">
                                  <p className="text-[11px] text-white/20 uppercase tracking-wider font-semibold">
                                    Comentarios ({sugg.comments.length})
                                  </p>
                                  {sugg.comments.map((c) => (
                                    <div key={c.id} className="flex gap-3 pl-4 border-l-2 border-white/[0.04]">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[12px] font-medium text-white/50">{c.author}</span>
                                          <span className="text-[10px] text-white/15">
                                            {new Date(c.date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                                          </span>
                                        </div>
                                        <p className="text-[13px] text-white/35 leading-relaxed">{c.text}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {commentingSugg === sugg.id ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddComment(sugg.id)}
                                    placeholder="Escribe un comentario..."
                                    autoFocus
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70 placeholder-white/15 text-[13px] focus:outline-none focus:border-emerald-500/30 transition-colors"
                                  />
                                  <button
                                    onClick={() => handleAddComment(sugg.id)}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-500/[0.1] border border-emerald-500/20 text-emerald-400 text-[12px] font-medium hover:bg-emerald-500/[0.15] transition-all"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { setCommentingSugg(null); setNewComment(""); }}
                                    className="px-3 py-2.5 rounded-xl border border-white/[0.06] text-white/20 hover:text-white/40 text-[12px] transition-all"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCommentingSugg(sugg.id)}
                                  className="flex items-center gap-1.5 text-[12px] text-white/20 hover:text-emerald-400/60 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  Agregar comentario
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredSuggestions.length === 0 && (
                <div className="text-center py-16">
                  <Lightbulb className="w-10 h-10 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 text-sm mb-2">No se encontraron sugerencias.</p>
                  <button
                    onClick={() => { setSuggSearch(""); setActiveSuggCat("todos"); }}
                    className="text-[12px] text-emerald-400/70 hover:text-emerald-300 transition-colors"
                  >
                    Ver todas las sugerencias
                  </button>
                </div>
              )}

              {/* CTA */}
              <div className="mt-12 p-6 rounded-2xl border border-white/[0.04] bg-white/[0.01] text-center">
                <p className="text-[13px] text-white/25">
                  ¿Necesitas ayuda directa?{" "}
                  <a
                    href="/soporte"
                    className="text-emerald-400/60 hover:text-emerald-300 transition-colors font-medium"
                  >
                    Crea un ticket de soporte
                  </a>{" "}
                  y nuestro equipo te responderá en menos de 24 horas.
                </p>
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default FaqPage;
