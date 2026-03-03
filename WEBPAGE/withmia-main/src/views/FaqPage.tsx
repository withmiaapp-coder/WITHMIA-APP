import { useEffect, useState, useMemo, useRef, type ReactNode } from "react";
import { Link } from "@/lib/router";
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
  ArrowRight,
} from "lucide-react";

/* ── Reveal ── */
const Reveal = ({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setV(true), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(28px)", transition: `opacity .65s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .65s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  );
};

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
        q: "¿Qué diferencia a WITHMIA de otras plataformas?",
        a: "WITHMIA combina un inbox omnicanal con IA generativa entrenada con tus propios documentos (RAG), agendamiento web integrado con Google Calendar, y automatizaciones inteligentes — todo en una sola plataforma diseñada para equipos latinoamericanos.",
      },
      {
        q: "¿Para quién está diseñada WITHMIA?",
        a: "Para PYMEs, startups y equipos de atención al cliente que gestionan múltiples canales de comunicación. Es ideal para empresas de servicios, e-commerce, agencias y cualquier negocio que quiera centralizar su atención con IA.",
      },
      {
        q: "¿Necesito conocimientos técnicos para usar WITHMIA?",
        a: "No. WITHMIA fue diseñada para que cualquier equipo pueda configurarla sin programar. El asistente de IA, las automatizaciones y los canales se configuran desde una interfaz visual e intuitiva.",
      },
      {
        q: "¿Cómo es el proceso de onboarding?",
        a: "Al registrarte, un asistente paso a paso te guía para crear tu workspace, configurar tu primer canal, entrenar la IA y invitar a tu equipo. Todo toma menos de 10 minutos. También ofrecemos sesiones de onboarding personalizadas para planes Pro y Enterprise.",
      },
      {
        q: "¿En qué países está disponible WITHMIA?",
        a: "WITHMIA está disponible en toda Latinoamérica y España. Nuestra infraestructura está alojada en servidores de alta disponibilidad con presencia en múltiples regiones.",
      },
      {
        q: "¿Hay una versión móvil?",
        a: "Actualmente WITHMIA funciona como aplicación web responsive, optimizada para desktop y tablet. La app móvil nativa está en desarrollo y se espera para el segundo semestre de 2026.",
      },
      {
        q: "¿Ofrecen soporte en español?",
        a: "Sí. Todo el soporte, la documentación y la interfaz están en español. Nuestro equipo es 100% hispanohablante y respondemos en menos de 24 horas por email, o en tiempo real a través de nuestro chat.",
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
        a: "WhatsApp Business API, Instagram DM, Facebook Messenger, correo electrónico, chat web y SMS. Estamos trabajando en agregar Telegram y Google Business Messages.",
      },
      {
        q: "¿Cómo conecto mi WhatsApp Business?",
        a: "Ve a Configuración → Canales → WhatsApp y sigue el asistente. Necesitarás acceso a tu cuenta de Meta Business Suite y un número verificado. El proceso toma menos de 5 minutos.",
      },
      {
        q: "¿Puedo conectar múltiples números de WhatsApp?",
        a: "Sí. Puedes conectar varios números de WhatsApp Business a un mismo workspace. Cada número puede asignarse a un equipo o área diferente, y las conversaciones se gestionan desde un solo inbox.",
      },
      {
        q: "¿Puedo enviar campañas masivas por WhatsApp?",
        a: "Sí, a través de plantillas HSM aprobadas por Meta. Puedes segmentar audiencias, programar envíos y medir resultados. Todos los envíos cumplen con las políticas de WhatsApp Business.",
      },
      {
        q: "¿Cómo funciona el widget de chat web?",
        a: "Agregas un snippet de código a tu sitio web y aparecerá un widget personalizable con los colores de tu marca. Los visitantes pueden chatear en tiempo real y las conversaciones llegan al mismo inbox que el resto de canales.",
      },
      {
        q: "¿Puedo recibir y enviar correos electrónicos desde WITHMIA?",
        a: "Sí. Conecta tu casilla de email (Gmail, Outlook, dominio propio) y gestiona correos como cualquier otra conversación. Puedes responder, asignar, automatizar y usar IA sobre tus emails.",
      },
    ],
  },
  {
    id: "ia",
    label: "IA y Bots",
    icon: Bot,
    items: [
      {
        q: "¿Qué modelo de IA utiliza WITHMIA?",
        a: "Utilizamos modelos avanzados de OpenAI (GPT-4) combinados con tecnología RAG propia. Esto permite que la IA genere respuestas precisas basadas específicamente en tus documentos y base de conocimiento, no solo en conocimiento general.",
      },
      {
        q: "¿La IA puede aprender de mis documentos?",
        a: "Sí. Puedes entrenar el asistente con documentos (PDF, Word, web), base de conocimiento y FAQs. Usa RAG (Retrieval-Augmented Generation) para respuestas precisas basadas en tu información.",
      },
      {
        q: "¿En qué idiomas puede responder la IA?",
        a: "La IA puede responder en español, inglés, portugués y la mayoría de idiomas principales. Detecta automáticamente el idioma del mensaje entrante y responde en el mismo idioma.",
      },
      {
        q: "¿El bot puede transferir a un agente humano?",
        a: "Sí. Detecta automáticamente cuando no puede resolver una consulta y transfiere al agente humano. Puedes configurar reglas de escalamiento, horarios y equipos de asignación.",
      },
      {
        q: "¿La IA puede manejar imágenes y archivos?",
        a: "La IA puede recibir imágenes y documentos enviados por los clientes. Actualmente procesa el contexto de la conversación para dar respuestas relevantes. El procesamiento visual de imágenes está en desarrollo.",
      },
      {
        q: "¿Cuánto tarda en aprender la IA?",
        a: "El procesamiento de documentos es casi inmediato. Una vez subidos tus archivos, la IA estará lista para responder en cuestión de minutos, dependiendo del volumen de información.",
      },
      {
        q: "¿Puedo personalizar la personalidad y tono de la IA?",
        a: "Sí. Puedes configurar el nombre, tono (formal, casual, amigable), instrucciones específicas y hasta el idioma predeterminado del asistente. La IA seguirá las directrices que definas para representar tu marca.",
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
        a: "Depende del plan: el plan Gratuito incluye 1 usuario, Pro incluye 1 miembro y puedes agregar más desde $10/mes cada uno, y Enterprise es ilimitado. Puedes agregar miembros en cualquier momento.",
      },
      {
        q: "¿Cómo invito a mi equipo?",
        a: "Desde Configuración → Equipo puedes enviar invitaciones por email. El invitado recibe un enlace para unirse con Google Sign-In, y automáticamente queda asociado a tu workspace con el rol que le asignes.",
      },
      {
        q: "¿Puedo asignar roles y permisos?",
        a: "Sí. WITHMIA tiene un sistema de roles (Administrador, Supervisor, Agente) con permisos granulares para controlar el acceso a funciones, datos y configuraciones.",
      },
      {
        q: "¿Puedo organizar a mi equipo en grupos o áreas?",
        a: "Sí. Puedes crear equipos (ej: Ventas, Soporte, Cobranza) y asignar agentes a cada uno. Las conversaciones pueden enrutarse automáticamente al equipo correcto según reglas o por la IA.",
      },
      {
        q: "¿Cómo funciona la asignación automática de conversaciones?",
        a: "WITHMIA distribuye las conversaciones entre los agentes disponibles usando round-robin o carga equilibrada. También puedes configurar reglas basadas en canal, palabras clave o clasificación de la IA.",
      },
      {
        q: "¿Puedo ver la actividad y rendimiento de mi equipo?",
        a: "Sí. El dashboard de analíticas muestra métricas por agente: tiempo de respuesta, conversaciones atendidas, satisfacción del cliente y más. Los supervisores pueden monitorear conversaciones en tiempo real.",
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
        a: "La facturación es mensual o anual (con 17% de descuento). Puedes cambiar de plan en cualquier momento: al subir aplica inmediatamente, al bajar aplica en el siguiente ciclo. Sin contratos de permanencia.",
      },
      {
        q: "¿Qué métodos de pago aceptan?",
        a: "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), transferencia bancaria y, en Chile, WebPay. Las facturas se emiten automáticamente cada mes.",
      },
      {
        q: "¿Hay un plan gratuito?",
        a: "Sí. WITHMIA tiene un Plan Gratuito permanente que incluye conexión WhatsApp por QR y hasta 500 mensajes IA al mes. No se requiere tarjeta de crédito. Puedes actualizar a Pro en cualquier momento.",
      },
      {
        q: "¿Puedo cambiar de plan en cualquier momento?",
        a: "Sí. Al subir de plan, el cambio aplica inmediatamente y se prorratea el cobro. Al bajar, el plan actual se mantiene hasta el final del ciclo de facturación y luego cambia.",
      },
      {
        q: "¿Ofrecen reembolsos?",
        a: "En cumplimiento con la Ley N° 19.496, los usuarios que actúen como consumidores finales pueden ejercer el derecho de retracto dentro de los 10 días siguientes a la contratación, siempre que no se haya utilizado el Servicio de manera sustancial.",
      },
      {
        q: "¿Tienen precios especiales para startups?",
        a: "Sí. Tenemos un programa especial para startups con hasta 50% de descuento durante el primer año. Contáctanos en ventas@withmia.com con el detalle de tu proyecto.",
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
        a: "Sí. El plan Starter permite 1.000 req/min, Growth 5.000 req/min, y Enterprise 15.000 req/min. Para necesidades mayores, contáctanos para un plan personalizado.",
      },
      {
        q: "¿Cómo funcionan los webhooks?",
        a: "Puedes configurar webhooks para recibir notificaciones en tiempo real cuando ocurren eventos: nuevo mensaje, conversación asignada, contacto creado, etc. Los webhooks envían un POST con el payload del evento a la URL que configures.",
      },
      {
        q: "¿Tienen documentación de la API?",
        a: "Sí. Nuestra documentación completa está disponible en withmia.com/docs con ejemplos de código, referencia de endpoints, guías de autenticación y colecciones de Postman listas para usar.",
      },
      {
        q: "¿Puedo integrar WITHMIA con Google Calendar?",
        a: "Sí. WITHMIA se integra nativamente con Google Calendar para el sistema de agendamiento web. Los usuarios pueden conectar su calendario, y las reuniones programadas se crean automáticamente con enlace de Google Meet.",
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
        a: "Sí. Cumplimos con la Ley N° 19.628 sobre Protección de la Vida Privada (Chile) y estamos preparados para la Ley N° 21.719 de Protección de Datos Personales (vigente desde diciembre de 2026). Usamos cifrado TLS 1.3, almacenamiento seguro y políticas de retención configurables.",
      },
      {
        q: "¿Dónde se almacenan los datos?",
        a: "Los datos se almacenan en servidores seguros en Estados Unidos con cifrado en reposo (AES-256) y en tránsito (TLS 1.3). Realizamos backups automáticos diarios con retención de 30 días.",
      },
      {
        q: "¿WITHMIA es una app verificada por Google?",
        a: "Sí. WITHMIA es una aplicación verificada por Google Auth Platform. Esto certifica la identidad y legitimidad de nuestro servicio. El uso de datos de Google cumple con la Google API Services User Data Policy, incluyendo los requisitos de Uso Limitado.",
      },
      {
        q: "¿Puedo eliminar todos mis datos?",
        a: "Sí. Puedes solicitar la eliminación completa de tus datos personales enviando un correo a privacidad@withmia.com. También puedes exportar tus datos en formato JSON o CSV antes de eliminar tu cuenta.",
      },
      {
        q: "¿Cómo puedo revocar el acceso de WITHMIA a mi cuenta de Google?",
        a: "Puedes revocar el acceso en cualquier momento desde myaccount.google.com/permissions. WITHMIA dejará de tener acceso a tu Google Calendar y datos de autenticación de forma inmediata.",
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
    <div className="min-h-screen relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-amber-500/[0.025] blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[140px]" />
      </div>

      <div className="pt-20 relative z-[1]">

        {/* ────────── HERO ────────── */}
        <section className="relative overflow-hidden">
          <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16">
            <Reveal>
              <div className="text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/15 backdrop-blur-sm mb-8">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 tracking-wide uppercase">
                    Centro de Ayuda
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] mb-6">
                  Preguntas{" "}
                  <span className="text-gradient">Frecuentes</span>
                </h1>

                <p className="text-lg text-white/40 max-w-2xl mx-auto leading-relaxed mb-10">
                  Resuelve tus dudas al instante o comparte ideas para mejorar WITHMIA.
                </p>

                {/* Tab switcher */}
                <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                  <button
                    onClick={() => setActiveTab("faq")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 ${
                      activeTab === "faq"
                        ? "bg-gradient-to-r from-amber-500/[0.12] to-amber-500/[0.06] border border-amber-500/15 text-white shadow-[0_0_20px_rgba(245,158,11,0.06)]"
                        : "text-white/30 hover:text-white/50 border border-transparent"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Preguntas
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                      activeTab === "faq" ? "bg-amber-500/15 text-amber-300/70" : "bg-white/[0.04] text-white/20"
                    }`}>
                      {totalFaqItems}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("sugerencias")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 ${
                      activeTab === "sugerencias"
                        ? "bg-gradient-to-r from-violet-500/[0.12] to-violet-500/[0.06] border border-violet-500/15 text-white shadow-[0_0_20px_rgba(139,92,246,0.06)]"
                        : "text-white/30 hover:text-white/50 border border-transparent"
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    Sugerencias
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                      activeTab === "sugerencias" ? "bg-violet-500/15 text-violet-300/70" : "bg-white/[0.04] text-white/20"
                    }`}>
                      {suggestions.length}
                    </span>
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ────────── TAB: PREGUNTAS FRECUENTES ────────── */}
        {activeTab === "faq" && (
          <section className="pb-24">
            <div className="max-w-4xl mx-auto px-6">
              {/* Separator */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-12" />

              {/* Search + filter */}
              <Reveal>
                <div className="flex flex-col gap-5 mb-12">
                  {/* Search bar */}
                  <div className="relative max-w-2xl mx-auto w-full">
                    <div
                      className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
                        faqSearchFocused
                          ? "border-amber-500/25 bg-white/[0.05] shadow-[0_0_40px_rgba(245,158,11,0.06)]"
                          : "border-white/[0.08] bg-white/[0.03]"
                      }`}
                    >
                      <Search className="absolute left-5 w-5 h-5 text-white/25" />
                      <input
                        type="text"
                        placeholder="Buscar en preguntas frecuentes..."
                        aria-label="Buscar preguntas frecuentes"
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                        onFocus={() => setFaqSearchFocused(true)}
                        onBlur={() => setFaqSearchFocused(false)}
                        className="w-full pl-14 pr-12 py-4 bg-transparent text-white/80 placeholder-white/25 text-[15px] focus:outline-none rounded-2xl"
                      />
                      {faqSearch && (
                        <button
                          onClick={() => setFaqSearch("")}
                          className="absolute right-4 w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category filter */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setActiveFaqCat("all")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-300 ${
                        activeFaqCat === "all"
                          ? "bg-amber-500/[0.12] border border-amber-500/25 text-amber-300"
                          : "bg-white/[0.02] border border-white/[0.06] text-white/35 hover:text-white/55 hover:border-white/[0.1]"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Todos
                      <span className={`text-[10px] font-mono ${activeFaqCat === "all" ? "text-amber-400/50" : "text-white/15"}`}>
                        {totalFaqItems}
                      </span>
                    </button>
                    {faqCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveFaqCat(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-300 ${
                          activeFaqCat === cat.id
                            ? "bg-amber-500/[0.12] border border-amber-500/25 text-amber-300"
                            : "bg-white/[0.02] border border-white/[0.06] text-white/35 hover:text-white/55 hover:border-white/[0.1]"
                        }`}
                      >
                        <cat.icon className="w-3.5 h-3.5" />
                        {cat.label}
                        <span className={`text-[10px] font-mono ${activeFaqCat === cat.id ? "text-amber-400/50" : "text-white/15"}`}>
                          {cat.items.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* FAQ Accordion */}
              {filteredFaqCategories.length > 0 ? (
                <div className="space-y-10">
                  {filteredFaqCategories.map((cat, catIdx) => (
                    <Reveal key={cat.id} delay={catIdx * 80}>
                      {/* Category header */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/[0.08] border border-amber-500/10 flex items-center justify-center">
                          <cat.icon className="w-4 h-4 text-amber-400/60" />
                        </div>
                        <div>
                          <h2 className="text-[15px] font-semibold text-white/80">{cat.label}</h2>
                          <p className="text-[11px] text-white/20">{cat.items.length} preguntas</p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        {cat.items.map((item, idx) => {
                          const key = `${cat.id}-${idx}`;
                          const isOpen = expandedFaq === key;
                          return (
                            <div
                              key={idx}
                              className={`group rounded-xl border transition-all duration-300 ${
                                isOpen
                                  ? "border-amber-500/15 bg-gradient-to-b from-amber-500/[0.04] to-transparent shadow-[0_0_30px_rgba(245,158,11,0.03)]"
                                  : "border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.025] hover:border-white/[0.08]"
                              }`}
                            >
                              <button
                                onClick={() => setExpandedFaq(isOpen ? null : key)}
                                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                              >
                                <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono transition-all duration-300 ${
                                  isOpen
                                    ? "bg-amber-500/[0.12] text-amber-400 border border-amber-500/20"
                                    : "bg-white/[0.03] text-white/20 border border-white/[0.04] group-hover:text-white/35"
                                }`}>
                                  {(idx + 1).toString().padStart(2, "0")}
                                </span>
                                <span className={`flex-1 text-[14px] font-medium leading-snug transition-colors duration-300 ${
                                  isOpen ? "text-white/90" : "text-white/55 group-hover:text-white/70"
                                }`}>
                                  {item.q}
                                </span>
                                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                  isOpen ? "bg-amber-500/[0.08] rotate-180" : "bg-white/[0.02]"
                                }`}>
                                  <ChevronDown className={`w-3.5 h-3.5 transition-colors duration-300 ${
                                    isOpen ? "text-amber-400/70" : "text-white/15"
                                  }`} />
                                </div>
                              </button>
                              <div
                                className="overflow-hidden transition-all duration-300 ease-out"
                                style={{
                                  display: "grid",
                                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                                }}
                              >
                                <div className="min-h-0">
                                  <div className="px-5 pb-5 pl-16">
                                    <div className="h-px bg-gradient-to-r from-amber-500/10 via-white/[0.04] to-transparent mb-4" />
                                    <p className="text-[13px] text-white/40 leading-[1.8]">{item.a}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Reveal>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-white/10" />
                  </div>
                  <p className="text-white/30 text-[15px] font-medium mb-2">Sin resultados</p>
                  <p className="text-white/15 text-[13px] mb-4">No encontramos preguntas que coincidan con tu búsqueda.</p>
                  <button
                    onClick={() => {
                      setFaqSearch("");
                      setActiveFaqCat("all");
                    }}
                    className="text-[12px] text-amber-400/60 hover:text-amber-300 transition-colors font-medium"
                  >
                    Ver todas las preguntas
                  </button>
                </div>
              )}

              {/* CTA to suggestions */}
              <Reveal delay={100}>
                <div className="mt-16 p-8 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-500/[0.03] to-amber-500/[0.02] text-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/[0.08] border border-amber-500/10 flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-5 h-5 text-amber-400/60" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-white/70 mb-2">¿No encontraste lo que buscas?</h3>
                  <p className="text-[13px] text-white/30 max-w-md mx-auto mb-5 leading-relaxed">
                    Comparte tu idea o sugerencia para mejorar WITHMIA. La comunidad puede votarla y comentarla.
                  </p>
                  <button
                    onClick={() => setActiveTab("sugerencias")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-[13px] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Enviar sugerencia
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Reveal>

              {/* Help links */}
              <div className="mt-8 flex items-center justify-center gap-6 text-[12px] text-white/20">
                <a href="https://app.withmia.com/soporte" className="flex items-center gap-2 hover:text-amber-400/50 transition-colors">
                  <Headphones className="w-3.5 h-3.5" />
                  Contactar Soporte
                </a>
                <span className="w-px h-3 bg-white/[0.06]" />
                <Link to="/ayuda" className="flex items-center gap-2 hover:text-amber-400/50 transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />
                  Video Tutoriales
                </Link>
                <span className="w-px h-3 bg-white/[0.06]" />
                <Link to="/comunidad" className="flex items-center gap-2 hover:text-amber-400/50 transition-colors">
                  <Users className="w-3.5 h-3.5" />
                  Comunidad
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ────────── TAB: SUGERENCIAS ────────── */}
        {activeTab === "sugerencias" && (
          <section ref={suggestionsRef} className="py-20">
            <div className="max-w-4xl mx-auto px-6">
              {/* Search */}
              <Reveal>
                <div className="mb-5">
                  <div
                    className={`relative flex items-center rounded-xl border transition-all duration-300 ${
                      suggSearchFocused
                        ? "border-amber-500/25 bg-white/[0.04]"
                        : "border-white/[0.06] bg-white/[0.015]"
                    }`}
                  >
                    <Search className="absolute left-4 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      placeholder="Buscar sugerencias..."
                      aria-label="Buscar sugerencias"
                      value={suggSearch}
                      onChange={(e) => setSuggSearch(e.target.value)}
                      onFocus={() => setSuggSearchFocused(true)}
                      onBlur={() => setSuggSearchFocused(false)}
                      className="w-full pl-11 pr-4 py-3 bg-transparent text-white/80 placeholder-white/20 text-[13px] focus:outline-none focus:ring-1 focus:ring-amber-500/30 rounded-lg"
                    />
                  </div>
                </div>
              </Reveal>

              {/* Controls */}
              <Reveal delay={60}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-8">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {suggCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveSuggCat(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          activeSuggCat === cat.id
                            ? "bg-amber-500/[0.1] border border-amber-500/20 text-amber-300/80"
                            : "bg-white/[0.015] border border-white/[0.05] text-white/25 hover:text-white/45"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-white/[0.05] bg-white/[0.01]">
                      {suggSortOptions.map((sort) => (
                        <button
                          key={sort.id}
                          onClick={() => setActiveSuggSort(sort.id)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                            activeSuggSort === sort.id
                              ? "bg-white/[0.05] text-white/60"
                              : "text-white/20 hover:text-white/40"
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
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-semibold text-[11px] transition-all hover:-translate-y-px shrink-0"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nueva sugerencia
                    </button>
                  </div>
                </div>
              </Reveal>

              {/* ── New suggestion form ── */}
              {showSuggForm && (
                <div className="rounded-xl border border-amber-500/12 bg-amber-500/[0.02] mb-8 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/8">
                    <h3 className="text-[13px] font-semibold text-white/70">
                      {suggSubmitted ? "¡Sugerencia publicada!" : "Enviar sugerencia"}
                    </h3>
                    <button
                      onClick={() => setShowSuggForm(false)}
                      className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/[0.04] text-white/15 hover:text-white/40 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {suggSubmitted ? (
                    <div className="p-8 text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/[0.08] border border-emerald-500/12 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400/80" />
                      </div>
                      <p className="text-[12px] text-white/35">
                        Tu sugerencia fue publicada. La comunidad podrá votarla y comentarla.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitSuggestion} className="p-5 space-y-3.5">
                      <div>
                        <label className="block text-[10px] text-white/25 uppercase tracking-wider mb-1.5">
                          Título de la sugerencia
                        </label>
                        <input
                          required
                          type="text"
                          value={newSuggTitle}
                          onChange={(e) => setNewSuggTitle(e.target.value)}
                          placeholder="Ej: Agregar soporte para Telegram"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/80 placeholder-white/12 text-[13px] focus:outline-none focus:border-amber-500/25 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/25 uppercase tracking-wider mb-1.5">
                          Descripción (opcional)
                        </label>
                        <textarea
                          value={newSuggDesc}
                          onChange={(e) => setNewSuggDesc(e.target.value)}
                          rows={3}
                          placeholder="Describe tu idea con más detalle..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/80 placeholder-white/12 text-[13px] focus:outline-none focus:border-amber-500/25 transition-colors resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <label className="block text-[10px] text-white/25 uppercase tracking-wider mb-1.5">
                            Tipo
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {suggCategories
                              .filter((c) => c.id !== "todos")
                              .map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setNewSuggCat(cat.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                    newSuggCat === cat.id
                                      ? "bg-amber-500/[0.1] border border-amber-500/20 text-amber-300/80"
                                      : "bg-white/[0.015] border border-white/[0.05] text-white/20 hover:text-white/35"
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-[12px] transition-all hover:-translate-y-px shrink-0"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
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
              <div className="space-y-2">
                {filteredSuggestions.map((sugg, sIdx) => {
                  const isExpanded = expandedSugg === sugg.id;
                  const catLabel = suggCategories.find((c) => c.id === sugg.category)?.label || sugg.category;
                  const st = statusConfig[sugg.status];

                  return (
                    <Reveal key={sugg.id} delay={sIdx * 40}>
                      <div
                        className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                          isExpanded
                            ? "border-white/[0.08] bg-white/[0.025]"
                            : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.06]"
                        }`}
                      >
                        <div className="flex">
                          {/* Vote column */}
                          <div className="flex flex-col items-center py-4 px-3 border-r border-white/[0.03] shrink-0">
                            <button
                              onClick={() => handleVote(sugg.id, 1)}
                              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                                sugg.userVote === 1
                                  ? "bg-amber-500/[0.12] text-amber-400"
                                  : "text-white/12 hover:text-white/35 hover:bg-white/[0.03]"
                              }`}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <span
                              className={`text-[13px] font-bold my-0.5 tabular-nums ${
                                sugg.userVote === 1
                                  ? "text-amber-400"
                                  : sugg.userVote === -1
                                  ? "text-red-400/60"
                                  : "text-white/35"
                              }`}
                            >
                              {sugg.votes}
                            </span>
                            <button
                              onClick={() => handleVote(sugg.id, -1)}
                              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                                sugg.userVote === -1
                                  ? "bg-red-500/[0.12] text-red-400"
                                  : "text-white/12 hover:text-white/35 hover:bg-white/[0.03]"
                              }`}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => setExpandedSugg(isExpanded ? null : sugg.id)}
                              className="w-full text-left px-4 py-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-white/20">
                                      {catLabel}
                                    </span>
                                    <span className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${st.color}`}>
                                      {st.label}
                                    </span>
                                  </div>

                                  <h3 className="text-[13px] sm:text-[14px] font-medium text-white/65 leading-snug pr-4">
                                    {sugg.title}
                                  </h3>

                                  {sugg.description && (
                                    <p className="text-[11px] text-white/20 mt-1 line-clamp-2 leading-relaxed">
                                      {sugg.description}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-3.5 mt-2">
                                    <span className="flex items-center gap-1 text-[10px] text-white/15">
                                      <User className="w-2.5 h-2.5" />
                                      {sugg.author}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-white/12">
                                      <Clock className="w-2.5 h-2.5" />
                                      {new Date(sugg.date).toLocaleDateString("es-CL", {
                                        day: "2-digit",
                                        month: "short",
                                      })}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-white/12">
                                      <MessageCircle className="w-2.5 h-2.5" />
                                      {sugg.comments.length}
                                    </span>
                                  </div>
                                </div>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-white/12 shrink-0 mt-1 transition-transform duration-300 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 animate-in fade-in duration-200">
                                {sugg.description && (
                                  <p className="text-[12px] text-white/30 leading-relaxed mb-4">
                                    {sugg.description}
                                  </p>
                                )}

                                {sugg.comments.length > 0 && (
                                  <div className="space-y-2.5 mb-4">
                                    <p className="text-[10px] text-white/15 uppercase tracking-wider font-semibold">
                                      Comentarios ({sugg.comments.length})
                                    </p>
                                    {sugg.comments.map((c) => (
                                      <div key={c.id} className="flex gap-2.5 pl-3 border-l-2 border-white/[0.03]">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[11px] font-medium text-white/40">{c.author}</span>
                                            <span className="text-[9px] text-white/12">
                                              {new Date(c.date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                                            </span>
                                          </div>
                                          <p className="text-[12px] text-white/30 leading-relaxed">{c.text}</p>
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
                                      className="flex-1 px-3.5 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/70 placeholder-white/12 text-[12px] focus:outline-none focus:border-amber-500/20 transition-colors"
                                    />
                                    <button
                                      onClick={() => handleAddComment(sugg.id)}
                                      className="px-3 py-2 rounded-lg bg-amber-500/[0.08] border border-amber-500/15 text-amber-400/80 text-[11px] font-medium hover:bg-amber-500/[0.12] transition-all"
                                    >
                                      <Send className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => { setCommentingSugg(null); setNewComment(""); }}
                                      className="px-2.5 py-2 rounded-lg border border-white/[0.04] text-white/15 hover:text-white/35 text-[11px] transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setCommentingSugg(sugg.id)}
                                    className="flex items-center gap-1.5 text-[11px] text-white/15 hover:text-amber-400/50 transition-colors"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    Agregar comentario
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>

              {filteredSuggestions.length === 0 && (
                <div className="text-center py-16">
                  <Lightbulb className="w-8 h-8 text-white/8 mx-auto mb-3" />
                  <p className="text-white/25 text-[13px] mb-2">No se encontraron sugerencias.</p>
                  <button
                    onClick={() => { setSuggSearch(""); setActiveSuggCat("todos"); }}
                    className="text-[11px] text-amber-400/60 hover:text-amber-300 transition-colors"
                  >
                    Ver todas las sugerencias
                  </button>
                </div>
              )}

              {/* CTA */}
              <div className="mt-10 p-5 rounded-xl border border-white/[0.03] bg-white/[0.008] text-center">
                <p className="text-[12px] text-white/20">
                  ¿Necesitas ayuda directa?{" "}
                  <a
                    href="https://app.withmia.com/soporte"
                    className="text-amber-400/50 hover:text-amber-300 transition-colors font-medium"
                  >
                    Crea un ticket de soporte
                  </a>{" "}
                  y te responderemos en menos de 24 horas.
                </p>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default FaqPage;
