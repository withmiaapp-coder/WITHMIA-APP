import { useEffect, useState, useRef, type ReactNode } from "react";
import { Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";
import { Reveal, useCountUp } from "@/hooks/useAnimations";
import {
  Terminal,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Shield,
  Globe,
  Activity,
  Code,
  Webhook,
  Key,
  BookOpen,
  Lock,
  Layers,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Server,
  Clock,
  Database,
  GitBranch,
  Cpu,
  Eye,
  Play,
  Hash,
  AlertTriangle,
  XCircle,
  Gauge,
  ShoppingCart,
  CalendarCheck,
  GraduationCap,
  Stethoscope,
  Building2,
  RefreshCw,
  FileJson,
  Ban,
  Timer,
  Image,
  BarChart3,
  Users,
  Bot,
  ChevronDown,
  HelpCircle,
  History,
  Filter,
  ChevronsRight,
  MessageSquare,
  Send,
  Upload,
  Inbox,
  Tag,
  Search,
} from "lucide-react";

/* ─── Table of Contents ─── */
const tocSections = [
  { id: "hero", label: "Introducción" },
  { id: "quickstart", label: "Inicio Rápido" },
  { id: "reference", label: "Endpoints" },
  { id: "capabilities", label: "Capacidades" },
  { id: "sdks", label: "SDKs" },
  { id: "webhooks", label: "Webhooks" },
  { id: "auth", label: "Autenticación" },
  { id: "errors", label: "Errores" },
  { id: "limits", label: "Rate Limits" },
  { id: "pagination", label: "Paginación" },
  { id: "versioning", label: "Versionado" },
  { id: "playground", label: "Playground" },
  { id: "use-cases", label: "Casos de Uso" },
  { id: "faq", label: "FAQ" },
];

/* ─── Data ─── */
const endpoints = [
  { method: "POST", path: "/v1/messages", desc: "Enviar mensaje a cualquier canal conectado", methodColor: "bg-amber-400/[0.12] text-amber-400 border-amber-400/20", response: `{ "id": "msg_7f3kQ9x", "status": "queued", "channel": "whatsapp", "to": "+569...", "created_at": "2026-02-24T14:32:01Z" }` },
  { method: "GET", path: "/v1/conversations", desc: "Listar conversaciones con filtros y paginación", methodColor: "bg-emerald-400/[0.12] text-emerald-400 border-emerald-400/20", response: `{ "data": [{ "id": "conv_3fR9", "status": "open", "channel": "whatsapp", "unread": 2 }], "meta": { "total": 142, "page": 1 } }` },
  { method: "GET", path: "/v1/contacts", desc: "Obtener contactos y datos de perfil", methodColor: "bg-emerald-400/[0.12] text-emerald-400 border-emerald-400/20", response: `{ "data": [{ "id": "ct_8xK2", "name": "María López", "phone": "+569...", "tags": ["vip"] }], "meta": { "total": 831 } }` },
  { method: "POST", path: "/v1/webhooks", desc: "Registrar webhooks para eventos en tiempo real", methodColor: "bg-amber-400/[0.12] text-amber-400 border-amber-400/20", response: `{ "id": "wh_5qR2", "url": "https://...", "events": ["message.received"], "active": true, "secret": "whsec_..." }` },
  { method: "PUT", path: "/v1/contacts/:id", desc: "Actualizar información de un contacto", methodColor: "bg-blue-400/[0.12] text-blue-400 border-blue-400/20", response: `{ "id": "ct_8xK2", "name": "María López", "tags": ["vip", "premium"], "updated_at": "2026-02-24T14:35:00Z" }` },
  { method: "DELETE", path: "/v1/webhooks/:id", desc: "Eliminar un webhook registrado", methodColor: "bg-red-400/[0.12] text-red-400 border-red-400/20", response: `{ "deleted": true, "id": "wh_5qR2" }` },
  { method: "GET", path: "/v1/channels", desc: "Listar canales conectados y estado", methodColor: "bg-emerald-400/[0.12] text-emerald-400 border-emerald-400/20", response: `{ "data": [{ "id": "ch_wa1", "type": "whatsapp", "status": "connected", "phone": "+569..." }] }` },
  { method: "POST", path: "/v1/templates", desc: "Crear plantillas de mensajes HSM", methodColor: "bg-amber-400/[0.12] text-amber-400 border-amber-400/20", response: `{ "id": "tpl_9kM3", "name": "order_confirmed", "status": "pending_review", "language": "es" }` },
  { method: "POST", path: "/v1/media", desc: "Subir archivos multimedia (imagen, video, documento)", methodColor: "bg-amber-400/[0.12] text-amber-400 border-amber-400/20", response: `{ "id": "med_4jL8", "type": "image/jpeg", "size": 245832, "url": "https://cdn.withmia.com/..." }` },
  { method: "GET", path: "/v1/analytics", desc: "Métricas de mensajes, conversiones y uso por canal", methodColor: "bg-emerald-400/[0.12] text-emerald-400 border-emerald-400/20", response: `{ "period": "2026-02", "messages_sent": 12450, "delivered": 12103, "read": 9874, "response_rate": "82%" }` },
  { method: "GET", path: "/v1/teams", desc: "Listar equipos de agentes y sus métricas", methodColor: "bg-emerald-400/[0.12] text-emerald-400 border-emerald-400/20", response: `{ "data": [{ "id": "team_2K", "name": "Soporte", "agents": 8, "avg_response": "2m 34s" }] }` },
  { method: "POST", path: "/v1/bots", desc: "Crear o configurar un bot de conversación", methodColor: "bg-amber-400/[0.12] text-amber-400 border-amber-400/20", response: `{ "id": "bot_6mN", "name": "Asistente ventas", "status": "active", "triggers": 3, "actions": 7 }` },
  { method: "POST", path: "/v1/messages/bulk", desc: "Envío masivo a múltiples destinatarios", methodColor: "bg-amber-400/[0.12] text-amber-400 border-amber-400/20", response: `{ "batch_id": "bat_9xQ3", "total": 500, "queued": 500, "estimated_completion": "~45s" }` },
  { method: "GET", path: "/v1/contacts/:id/history", desc: "Historial completo de interacciones de un contacto", methodColor: "bg-emerald-400/[0.12] text-emerald-400 border-emerald-400/20", response: `{ "data": [{ "type": "message", "direction": "inbound", "text": "Hola...", "at": "2026-02-24T..." }], "total": 47 }` },
  { method: "PATCH", path: "/v1/conversations/:id/assign", desc: "Asignar conversación a agente o equipo", methodColor: "bg-violet-400/[0.12] text-violet-400 border-violet-400/20", response: `{ "id": "conv_3fR9", "assigned_to": "agent_5xK", "assigned_team": "team_2K", "updated_at": "..." }` },
  { method: "GET", path: "/v1/tags", desc: "Listar etiquetas disponibles con conteo de uso", methodColor: "bg-emerald-400/[0.12] text-emerald-400 border-emerald-400/20", response: `{ "data": [{ "id": "tag_vip", "name": "VIP", "color": "#f59e0b", "contacts_count": 142 }] }` },
];

const sdks = [
  {
    lang: "Node.js",
    install: "npm install @withmia/sdk",
    code: `import { Withmia } from '@withmia/sdk';

const client = new Withmia('sk_live_...');

const msg = await client.messages.send({
  channel: 'whatsapp',
  to: '+56912345678',
  text: 'Tu cita fue confirmada ✅'
});

console.log(msg.id); // msg_7f3kQ9x...`,
    color: "#68a063",
  },
  {
    lang: "Python",
    install: "pip install withmia",
    code: `from withmia import Withmia

client = Withmia("sk_live_...")

msg = client.messages.send(
    channel="whatsapp",
    to="+56912345678",
    text="Tu cita fue confirmada ✅"
)

print(msg.id)  # msg_7f3kQ9x...`,
    color: "#3776ab",
  },
  {
    lang: "cURL",
    install: "",
    code: `curl -X POST https://api.withmia.com/v1/messages \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "whatsapp",
    "to": "+56912345678",
    "text": "Tu cita fue confirmada ✅"
  }'`,
    color: "#f59e0b",
  },
];

const webhookEvents = [
  { event: "message.received", desc: "Nuevo mensaje entrante", color: "#3b82f6" },
  { event: "message.delivered", desc: "Mensaje entregado al destinatario", color: "#34d399" },
  { event: "message.failed", desc: "Error en el envío", color: "#f43f5e" },
  { event: "conversation.created", desc: "Nueva conversación iniciada", color: "#a78bfa" },
  { event: "conversation.assigned", desc: "Asignada a agente o equipo", color: "#f59e0b" },
  { event: "contact.updated", desc: "Datos del contacto actualizados", color: "#22d3ee" },
  { event: "channel.status", desc: "Cambio de estado en canal", color: "#6366f1" },
  { event: "bot.handoff", desc: "Transferencia bot → agente", color: "#ec4899" },
];

const errorCodes = [
  { code: "200", label: "OK", desc: "Solicitud exitosa", color: "#34d399", bg: "bg-emerald-400/[0.08] border-emerald-400/15" },
  { code: "201", label: "Created", desc: "Recurso creado correctamente", color: "#34d399", bg: "bg-emerald-400/[0.08] border-emerald-400/15" },
  { code: "400", label: "Bad Request", desc: "Parámetros inválidos o faltantes en la solicitud", color: "#f59e0b", bg: "bg-amber-400/[0.08] border-amber-400/15" },
  { code: "401", label: "Unauthorized", desc: "Token de acceso inválido, expirado o ausente", color: "#f43f5e", bg: "bg-red-400/[0.08] border-red-400/15" },
  { code: "403", label: "Forbidden", desc: "El token no tiene los scopes necesarios para este recurso", color: "#f43f5e", bg: "bg-red-400/[0.08] border-red-400/15" },
  { code: "404", label: "Not Found", desc: "El recurso solicitado no existe", color: "#f59e0b", bg: "bg-amber-400/[0.08] border-amber-400/15" },
  { code: "409", label: "Conflict", desc: "Conflicto con el estado actual del recurso (duplicado)", color: "#f59e0b", bg: "bg-amber-400/[0.08] border-amber-400/15" },
  { code: "422", label: "Unprocessable", desc: "Datos válidos en formato pero semánticamente incorrectos", color: "#f59e0b", bg: "bg-amber-400/[0.08] border-amber-400/15" },
  { code: "429", label: "Rate Limited", desc: "Se excedió el límite de requests por minuto", color: "#a78bfa", bg: "bg-violet-400/[0.08] border-violet-400/15" },
  { code: "500", label: "Server Error", desc: "Error interno. Reintentar con backoff exponencial", color: "#f43f5e", bg: "bg-red-400/[0.08] border-red-400/15" },
];

const rateLimits = [
  { plan: "Sandbox", requests: "100", per: "minuto", burst: "20/s", price: "Gratis", color: "#34d399", highlighted: false },
  { plan: "Starter", requests: "1,000", per: "minuto", burst: "50/s", price: "$49/mes", color: "#f59e0b", highlighted: false },
  { plan: "Growth", requests: "5,000", per: "minuto", burst: "200/s", price: "$149/mes", color: "#a78bfa", highlighted: true },
  { plan: "Enterprise", requests: "Custom", per: "minuto", burst: "Custom", price: "Contactar", color: "#22d3ee", highlighted: false },
];

const useCases = [
  {
    icon: ShoppingCart,
    title: "E-commerce",
    desc: "Confirmaciones de pedido, tracking de envío y soporte post-venta automatizado por WhatsApp.",
    code: `client.messages.send({
  channel: "whatsapp",
  to: order.phone,
  template: "order_confirmed",
  variables: {
    name: order.customer,
    order_id: order.id,
    total: order.total
  }
});`,
    color: "#f59e0b",
  },
  {
    icon: CalendarCheck,
    title: "Agendamiento",
    desc: "Envía recordatorios automáticos, permite confirmar o reagendar directamente por chat.",
    code: `client.messages.send({
  channel: "whatsapp",
  to: appointment.phone,
  template: "appointment_reminder",
  variables: {
    date: appointment.date,
    doctor: appointment.professional,
    link: appointment.reschedule_url
  }
});`,
    color: "#a78bfa",
  },
  {
    icon: Stethoscope,
    title: "Salud",
    desc: "Resultados de exámenes, recordatorio de medicamentos y seguimiento post-consulta.",
    code: `// Webhook: conversation.created
app.post("/webhook", (req, res) => {
  const { data } = req.body;
  if (data.metadata.department === "lab") {
    client.messages.send({
      to: data.contact.phone,
      text: "Sus resultados están listos 📋"
    });
  }
});`,
    color: "#34d399",
  },
  {
    icon: GraduationCap,
    title: "Educación",
    desc: "Proceso de admisión automatizado, envío de documentos y seguimiento de matrículas.",
    code: `// Automatizar respuesta a consultas
client.bots.configure({
  trigger: "admission_inquiry",
  actions: [
    { type: "send_template", template: "admission_info" },
    { type: "collect_data", fields: ["name", "grade", "email"] },
    { type: "create_contact", assign_to: "admissions" }
  ]
});`,
    color: "#6366f1",
  },
  {
    icon: Building2,
    title: "Inmobiliaria",
    desc: "Califica leads automáticamente, agenda visitas y envía fichas de propiedades por WhatsApp.",
    code: `// Calificar lead y agendar visita
app.post("/webhook", (req, res) => {
  const lead = req.body.data;
  const score = qualifyLead(lead);
  
  if (score >= 7) {
    client.conversations.assign({
      id: lead.conversation_id,
      agent: "senior_broker",
      note: \`Lead calificado: \${score}/10\`
    });
  }
});`,
    color: "#22d3ee",
  },
];

const changelog = [
  { version: "v1.4.0", date: "Feb 2026", changes: ["Endpoint /v1/messages/bulk para envío masivo", "Soporte para archivos multimedia hasta 50MB", "Nuevo SDK para Go (beta)"], type: "feature" },
  { version: "v1.3.2", date: "Ene 2026", changes: ["Fix: Rate limit headers inconsistentes en /v1/analytics", "Mejora de latencia en webhooks (p95: 18ms → 12ms)"], type: "fix" },
  { version: "v1.3.0", date: "Dic 2025", changes: ["Endpoint /v1/bots para configurar chatbots", "Scopes granulares por recurso (OAuth 2.0)", "Paginación cursor-based en todas las listas"], type: "feature" },
  { version: "v1.2.0", date: "Nov 2025", changes: ["Endpoint /v1/analytics con métricas por canal", "Idempotency keys para POST requests", "Soporte para Instagram DM como canal"], type: "feature" },
  { version: "v1.1.0", date: "Oct 2025", changes: ["Endpoint /v1/teams para gestión de agentes", "Webhook event: bot.handoff", "Sandbox environment disponible"], type: "feature" },
  { version: "v1.0.0", date: "Sep 2025", changes: ["Lanzamiento público de la API", "Endpoints core: messages, conversations, contacts, webhooks, channels", "SDKs oficiales: Node.js, Python, cURL"], type: "release" },
];

const faqItems = [
  {
    q: "¿Cuánto cuesta usar la API de WITHMIA?",
    a: "El plan Sandbox es 100% gratuito con 100 requests/minuto. Los planes pagados empiezan en $49/mes (Starter) con 1,000 req/min. Enterprise tiene límites custom. No se cobra por mensaje individual — solo por plan.",
  },
  {
    q: "¿Qué canales de comunicación soporta la API?",
    a: "WhatsApp Business, Instagram DM, Facebook Messenger, Email, Webchat y API directa. Todos los canales se manejan con los mismos endpoints — solo cambia el campo 'channel' en el request.",
  },
  {
    q: "¿Cómo manejo los errores y reintentos?",
    a: "Todos los errores siguen un formato JSON estandarizado con type, code, message, param y doc_url. Los SDKs oficiales implementan retry automático con backoff exponencial. Para errores 429, respetamos el header Retry-After.",
  },
  {
    q: "¿La API soporta envío masivo de mensajes?",
    a: "Sí, el endpoint POST /v1/messages/bulk permite enviar a múltiples destinatarios en una sola request. Soporta hasta 10,000 destinatarios por batch con templates HSM aprobados por WhatsApp.",
  },
  {
    q: "¿Cómo funciona la autenticación?",
    a: "Usamos OAuth 2.0 con Bearer tokens. Genera API keys desde el dashboard con scopes granulares (ej: messages:write, contacts:read). Soportamos rotación de tokens sin downtime con dos tokens activos simultáneamente.",
  },
  {
    q: "¿Tienen entorno de testing/sandbox?",
    a: "Sí. Cada cuenta incluye un sandbox gratuito con datos fake pre-cargados. Usa tokens sk_test_... para sandbox y sk_live_... para producción. El sandbox simula latencia y respuestas reales sin enviar mensajes.",
  },
  {
    q: "¿Qué tan rápida es la API?",
    a: "P95 latency de 23ms. Los webhooks se entregan en menos de 100ms. Tenemos infraestructura multi-región con 99.9% SLA. Los SDKs incluyen connection pooling y keep-alive para máximo throughput.",
  },
  {
    q: "¿Puedo migrar desde Twilio/Chatwoot/otro proveedor?",
    a: "Sí. Ofrecemos endpoints de importación de datos (/v1/contacts/import) y guías de migración paso a paso. La API de WITHMIA es compatible con formatos estándar y nuestro equipo ofrece soporte personalizado para migraciones enterprise.",
  },
];

/* ─── Component ─── */
const ApiPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [copied, setCopied] = useState<string | null>(null);
  const [activeSDK, setActiveSDK] = useState(0);
  const [activeEndpoint, setActiveEndpoint] = useState(0);
  const [activeTocSection, setActiveTocSection] = useState("hero");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [playgroundMethod, setPlaygroundMethod] = useState("POST");
  const [playgroundPath, setPlaygroundPath] = useState("/v1/messages");
  const [playgroundBody, setPlaygroundBody] = useState(`{
  "channel": "whatsapp",
  "to": "+56912345678",
  "text": "Hola desde el playground!"
}`);
  const [playgroundResponse, setPlaygroundResponse] = useState<string | null>(null);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  // Simulate API playground
  const handlePlaygroundRun = () => {
    setPlaygroundLoading(true);
    setPlaygroundResponse(null);
    setTimeout(() => {
      setPlaygroundResponse(JSON.stringify({
        id: `msg_${Math.random().toString(36).substring(2, 9)}`,
        status: "queued",
        channel: "whatsapp",
        to: "+56912345678",
        created_at: new Date().toISOString(),
        _meta: { sandbox: true, latency_ms: 23 }
      }, null, 2));
      setPlaygroundLoading(false);
    }, 800 + Math.random() * 400);
  };

  // TOC scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTocSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    tocSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const latency = useCountUp(23, 1200);
  const uptime = useCountUp(99, 1400);
  const requests = useCountUp(1000, 1800);

  return (
    <div className="min-h-screen api-page">
      <div className="pt-20">

        {/* ── Sticky Table of Contents Sidebar ── */}
        <nav className="fixed left-0 top-24 z-40 hidden xl:flex flex-col gap-0.5 w-44 pl-4 pr-2 py-3" aria-label="Tabla de contenidos">
          <span className="text-[9px] font-mono text-white/15 uppercase tracking-[0.2em] mb-2 pl-3">En esta página</span>
          {tocSections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className={`text-[11px] pl-3 py-1 border-l-2 transition-all duration-200 font-medium ${
                activeTocSection === s.id
                  ? "text-amber-400/80 border-amber-400/60 bg-amber-400/[0.04]"
                  : "text-white/20 border-white/[0.04] hover:text-white/40 hover:border-white/[0.12]"
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* ══════════════════════════════════════════
            HERO — Stripe-style split layout
            ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-b border-white/[0.04]" id="hero">
          {/* Subtle grid bg */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute inset-0 api-grid-bg opacity-[0.02]" />
            <div className="absolute top-0 left-[20%] w-[600px] h-[600px] rounded-full bg-amber-500/[0.03] blur-[150px]" />
            <div className="absolute bottom-0 right-[15%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.025] blur-[130px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-24 lg:pt-32 lg:pb-28">
            <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-20 items-start">
              {/* Left — Value prop */}
              <Reveal>
                <div className="lg:sticky lg:top-32">
                  {/* Status pill */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] mb-8">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 api-status-dot" />
                    <span className="text-[11px] font-mono text-white/35 tracking-wide">Operativo</span>
                    <span className="text-[10px] font-mono text-white/15">•</span>
                    <span className="text-[11px] font-mono text-white/25">v1.0</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight mb-6">
                    Construye con la
                    <br />
                    <span className="text-gradient">WITHMIA API</span>
                  </h1>

                  <p className="text-[17px] text-white/40 leading-relaxed mb-10 max-w-lg">
                    Envía mensajes, gestiona conversaciones y conecta canales
                    con una API REST predecible, bien documentada y con SDKs
                    oficiales para tu lenguaje favorito.
                  </p>

                  {/* Quick links — Stripe style */}
                  <div className="space-y-3 mb-12">
                    {[
                      { label: "Inicio rápido", desc: "Envía tu primer mensaje en 5 minutos", href: "/docs", icon: Play },
                      { label: "Referencia API", desc: "Documentación completa de endpoints", href: "#reference", icon: BookOpen },
                      { label: "SDKs y librerías", desc: "Node.js, Python y cURL", href: "#sdks", icon: Code },
                    ].map((link, i) => (
                      <a
                        key={i}
                        href={link.href}
                        className="group flex items-center gap-4 p-4 -mx-4 rounded-xl hover:bg-white/[0.03] transition-all duration-300"
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-400/[0.08] border border-amber-400/15 flex items-center justify-center group-hover:bg-amber-400/[0.12] transition-colors shrink-0">
                          <link.icon className="w-4 h-4 text-amber-400/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">{link.label}</p>
                          <p className="text-[12px] text-white/25 group-hover:text-white/35 transition-colors">{link.desc}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all shrink-0" />
                      </a>
                    ))}
                  </div>

                  {/* Metrics strip */}
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="font-mono font-bold text-white"><span ref={latency.ref}>{latency.val}</span>ms</span>
                      <span className="text-white/20 ml-1.5 text-[11px]">p95 latency</span>
                    </div>
                    <div className="w-px h-4 bg-white/[0.06]" />
                    <div>
                      <span className="font-mono font-bold text-white"><span ref={uptime.ref}>{uptime.val}</span>.9%</span>
                      <span className="text-white/20 ml-1.5 text-[11px]">uptime</span>
                    </div>
                    <div className="w-px h-4 bg-white/[0.06]" />
                    <div>
                      <span className="font-mono font-bold text-white"><span ref={requests.ref}>{requests.val}</span>/m</span>
                      <span className="text-white/20 ml-1.5 text-[11px]">rate limit</span>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Right — Interactive code panel */}
              <Reveal delay={150}>
                <div className="relative">
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] pointer-events-none" />

                  <div className="relative rounded-2xl overflow-hidden bg-[#0a0a14] border border-white/[0.06]">
                    {/* Tab bar */}
                    <div className="flex items-center border-b border-white/[0.06]">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-r border-white/[0.06]">
                        <div className="flex gap-1.5">
                          <div className="w-[9px] h-[9px] rounded-full bg-[#ff5f57]/70" />
                          <div className="w-[9px] h-[9px] rounded-full bg-[#febc2e]/70" />
                          <div className="w-[9px] h-[9px] rounded-full bg-[#28c840]/70" />
                        </div>
                      </div>
                      {sdks.map((sdk, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSDK(i)}
                          className={`relative px-4 py-2.5 text-[11px] font-mono transition-all duration-200 border-r border-white/[0.06] ${
                            activeSDK === i
                              ? "bg-white/[0.04] text-white/70"
                              : "text-white/25 hover:text-white/40 hover:bg-white/[0.02]"
                          }`}
                        >
                          {sdk.lang}
                          {activeSDK === i && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: sdk.color }} />
                          )}
                        </button>
                      ))}
                      <div className="ml-auto px-3 py-2.5">
                        <button
                          onClick={() => handleCopy(sdks[activeSDK].code, "hero")}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-all text-white/25 hover:text-white/50"
                        >
                          {copied === "hero" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span className="text-[9px] font-mono">{copied === "hero" ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Install line */}
                    {sdks[activeSDK].install && (
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
                        <span className="text-[10px] font-mono text-white/15">$</span>
                        <span className="text-[10px] font-mono text-amber-400/60">{sdks[activeSDK].install}</span>
                      </div>
                    )}

                    {/* Code area */}
                    <div className="relative p-4 min-h-[320px]">
                      {/* Line numbers */}
                      <div className="absolute left-0 top-4 bottom-4 w-10 flex flex-col items-end pr-3 select-none pointer-events-none border-r border-white/[0.03]">
                        {sdks[activeSDK].code.split("\n").map((_, i) => (
                          <span key={i} className="text-[10px] font-mono text-white/[0.07] leading-[1.75] tabular-nums">
                            {i + 1}
                          </span>
                        ))}
                      </div>
                      <pre className="text-[12px] text-white/50 leading-[1.75] font-mono pl-9 overflow-x-auto">
                        <code>{sdks[activeSDK].code}</code>
                      </pre>
                    </div>

                    {/* Response preview */}
                    <div className="border-t border-white/[0.06] bg-white/[0.01]">
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-400/[0.1] border border-emerald-400/15">
                          <div className="w-[5px] h-[5px] rounded-full bg-emerald-400/80 api-status-dot" />
                          <span className="text-[10px] font-mono text-emerald-400/80 font-bold">200</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/20">23ms</span>
                        <span className="text-[10px] font-mono text-white/10 ml-auto">application/json</span>
                      </div>
                      <div className="px-4 pb-3">
                        <pre className="text-[11px] font-mono text-white/30 leading-relaxed">
                          <code>{`{ "id": "msg_7f3kQ9x", "status": "delivered", "channel": "whatsapp" }`}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            QUICKSTART — 3-step numbered guide
            ══════════════════════════════════════════ */}
        <section className="py-24 relative" id="quickstart">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                  Inicio Rápido
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Integra en 3 pasos
                </h2>
                <p className="text-white/30 max-w-lg mx-auto text-[15px]">
                  Desde API key hasta tu primer mensaje enviado en menos de 5 minutos.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Obtén tu API Key",
                  desc: "Crea una cuenta y genera tu token de acceso desde el dashboard. Sandbox gratuito incluido.",
                  code: 'Authorization: Bearer sk_live_...',
                  icon: Key,
                  color: "#f59e0b",
                },
                {
                  step: "02",
                  title: "Instala el SDK",
                  desc: "Instala la librería oficial para tu lenguaje con un solo comando.",
                  code: 'npm install @withmia/sdk',
                  icon: Terminal,
                  color: "#a78bfa",
                },
                {
                  step: "03",
                  title: "Envía tu primer mensaje",
                  desc: "Un POST request y tu mensaje se entrega por WhatsApp, Email o cualquier canal.",
                  code: 'client.messages.send({ ... })',
                  icon: Zap,
                  color: "#34d399",
                },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="group relative h-full">
                    {/* Connector line (between cards) */}
                    {i < 2 && (
                      <div className="hidden md:block absolute top-10 -right-3 w-6 h-px bg-gradient-to-r from-white/[0.08] to-white/[0.02] z-10" />
                    )}

                    <div className="relative h-full p-6 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] transition-all duration-500 overflow-hidden">
                      {/* Step number watermark */}
                      <span className="absolute top-4 right-5 text-[64px] font-bold text-white/[0.02] leading-none select-none pointer-events-none font-mono">
                        {item.step}
                      </span>

                      <div className="relative">
                        {/* Step badge */}
                        <div className="flex items-center gap-3 mb-5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${item.color}12`, border: `1px solid ${item.color}20` }}
                          >
                            <item.icon className="w-4 h-4" style={{ color: item.color }} />
                          </div>
                          <span className="text-[11px] font-mono font-bold text-white/20 tracking-wider">{item.step}</span>
                        </div>

                        <h3 className="text-[15px] font-semibold text-white/80 mb-2">{item.title}</h3>
                        <p className="text-[13px] text-white/25 leading-relaxed mb-5">{item.desc}</p>

                        {/* Mini code preview */}
                        <div className="rounded-lg bg-[#0a0a14] border border-white/[0.06] px-3.5 py-2.5">
                          <code className="text-[11px] font-mono text-white/35">{item.code}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* CTA after quickstart */}
            <Reveal delay={350}>
              <div className="flex items-center justify-center gap-4 mt-10">
                <a
                  href="/docs"
                  className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-black text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)] overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    Leer documentación
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick("obtener_api_key_hero", "api_page")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/[0.15] text-sm font-medium transition-all duration-300 hover:bg-white/[0.02]"
                >
                  <Key className="w-3.5 h-3.5" />
                  Obtener API Key
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            API REFERENCE — Stripe-style split pane
            ══════════════════════════════════════════ */}
        <section className="py-24 relative border-t border-white/[0.04]" id="reference">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-[11px] font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                    Referencia API
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    Endpoints
                  </h2>
                </div>
                <Link to="/docs" className="hidden sm:flex items-center gap-1.5 text-[12px] font-medium text-amber-400/60 hover:text-amber-300 transition-colors">
                  Referencia completa <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-0 rounded-xl overflow-hidden border border-white/[0.06]">
                {/* Left — Endpoint list */}
                <div className="bg-white/[0.015] border-b lg:border-b-0 lg:border-r border-white/[0.06]">
                  <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400/60 api-status-dot" />
                      <span className="text-[10px] font-mono text-white/30">api.withmia.com/v1</span>
                      <span className="ml-auto text-[9px] font-mono text-emerald-400/50 px-1.5 py-0.5 rounded bg-emerald-400/[0.06] border border-emerald-400/10 font-bold uppercase tracking-wider">Live</span>
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {endpoints.map((ep, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveEndpoint(i)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 group ${
                          activeEndpoint === i ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${ep.methodColor}`}>
                          {ep.method}
                        </span>
                        <span className={`text-[12px] font-mono transition-colors ${activeEndpoint === i ? "text-white/70" : "text-white/35 group-hover:text-white/50"}`}>
                          {ep.path}
                        </span>
                        {activeEndpoint === i && (
                          <div className="w-1 h-1 rounded-full bg-amber-400/60 ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right — Code preview for selected endpoint */}
                <div className="bg-[#0a0a14]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${endpoints[activeEndpoint].methodColor}`}>
                        {endpoints[activeEndpoint].method}
                      </span>
                      <span className="text-[11px] font-mono text-white/40">{endpoints[activeEndpoint].path}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(`${endpoints[activeEndpoint].method} /v1${endpoints[activeEndpoint].path}`, "ep")}
                      className="text-white/15 hover:text-white/40 transition-colors"
                    >
                      {copied === "ep" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-4">
                    <p className="text-[12px] text-white/25 mb-4">{endpoints[activeEndpoint].desc}</p>

                    {/* Request example */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-3 h-3 text-white/10" />
                        <span className="text-[9px] font-mono text-white/15 uppercase tracking-wider">Request</span>
                      </div>
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                        <pre className="text-[11px] font-mono text-white/40 leading-relaxed overflow-x-auto">
                          <code>
                            <span className="text-amber-400/60">{endpoints[activeEndpoint].method}</span>{" "}
                            <span className="text-white/30">https://api.withmia.com{endpoints[activeEndpoint].path}</span>
                            {"\n"}
                            <span className="text-white/15">Authorization: </span>
                            <span className="text-cyan-400/50">Bearer sk_live_...</span>
                            {"\n"}
                            <span className="text-white/15">Content-Type: </span>
                            <span className="text-cyan-400/50">application/json</span>
                          </code>
                        </pre>
                      </div>
                    </div>

                    {/* Response example */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-3 h-3 text-white/10" />
                        <span className="text-[9px] font-mono text-white/15 uppercase tracking-wider">Response</span>
                        <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-emerald-400/[0.06]">
                          <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
                          <span className="text-[8px] font-mono text-emerald-400/60 font-bold">200</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                        <pre className="text-[11px] font-mono text-white/35 leading-relaxed overflow-x-auto">
                          <code>{endpoints[activeEndpoint].response}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CAPABILITIES — Minimal feature grid
            ══════════════════════════════════════════ */}
        <section className="py-24 relative" id="capabilities">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                  Capacidades
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white">
                  Diseñada para escalar
                </h2>
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]">
              {[
                { icon: Zap, title: "REST API", desc: "CRUD para mensajes, contactos, conversaciones, canales y webhooks. JSON responses.", color: "#f59e0b" },
                { icon: Webhook, title: "Webhooks", desc: "Eventos push en tiempo real via HTTPS. Firma HMAC-SHA256 en cada payload.", color: "#22d3ee" },
                { icon: Key, title: "OAuth 2.0", desc: "Tokens de acceso, refresh tokens y scopes granulares por recurso.", color: "#34d399" },
                { icon: Layers, title: "SDKs oficiales", desc: "Node.js, Python y cURL. Tipados, con retries automáticos y error handling.", color: "#a78bfa" },
                { icon: Shield, title: "Rate limiting", desc: "1,000 req/min por defecto. Headers informativos. Enterprise: límites custom.", color: "#f43f5e" },
                { icon: Lock, title: "TLS 1.3", desc: "Cifrado end-to-end. Webhook signatures verificables con tu secret key.", color: "#6366f1" },
                { icon: Database, title: "Paginación", desc: "Cursor-based pagination en todas las listas. Filtros avanzados por campo.", color: "#f59e0b" },
                { icon: Clock, title: "Idempotency", desc: "Idempotency keys para requests POST seguros. Zero duplicados garantizado.", color: "#22d3ee" },
                { icon: Eye, title: "Sandbox", desc: "Entorno de pruebas aislado con datos fake. Sin costo, sin tarjeta de crédito.", color: "#34d399" },
              ].map((feat, i) => (
                <Reveal key={i} delay={i * 50}>
                  <div className="group relative p-6 bg-[#07070f] hover:bg-white/[0.02] transition-all duration-300 h-full">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${feat.color}0c`, border: `1px solid ${feat.color}18` }}
                      >
                        <feat.icon className="w-4 h-4" style={{ color: `${feat.color}bb` }} />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-semibold text-white/70 mb-1.5 group-hover:text-white transition-colors">{feat.title}</h3>
                        <p className="text-[12px] text-white/25 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SDKs — Code-first section
            ══════════════════════════════════════════ */}
        <section className="py-24 relative border-t border-white/[0.04]" id="sdks">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-[11px] font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                    Librerías Cliente
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    SDKs oficiales
                  </h2>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  {[
                    { label: "TypeScript", icon: CheckCircle2 },
                    { label: "Auto-retries", icon: Activity },
                    { label: "Type-safe", icon: Code },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-[10px] text-white/25">
                      <b.icon className="w-3 h-3 text-amber-400/35" />
                      {b.label}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0a14]">
                {/* Language tabs */}
                <div className="flex items-center border-b border-white/[0.06]">
                  {sdks.map((sdk, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSDK(i)}
                      className={`relative px-5 py-3 text-[11px] font-mono font-medium transition-all duration-200 border-r border-white/[0.06] ${
                        activeSDK === i
                          ? "bg-white/[0.04] text-white/70"
                          : "text-white/25 hover:text-white/40 hover:bg-white/[0.02]"
                      }`}
                    >
                      {sdk.lang}
                      {activeSDK === i && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: sdk.color }} />
                      )}
                    </button>
                  ))}

                  <div className="ml-auto px-3">
                    <button
                      onClick={() => handleCopy(sdks[activeSDK].code, "sdk")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-all text-white/25 hover:text-white/50"
                    >
                      {copied === "sdk" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span className="text-[9px] font-mono">{copied === "sdk" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Install command */}
                {sdks[activeSDK].install && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.01] border-b border-white/[0.04]">
                    <span className="text-[10px] font-mono text-white/15">$</span>
                    <span className="text-[10px] font-mono text-amber-400/60">{sdks[activeSDK].install}</span>
                    <button
                      onClick={() => handleCopy(sdks[activeSDK].install, "install")}
                      className="ml-auto text-white/10 hover:text-white/30 transition-colors"
                    >
                      {copied === "install" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}

                {/* Code */}
                <div className="relative p-4">
                  <div className="absolute left-0 top-4 bottom-4 w-10 flex flex-col items-end pr-3 select-none pointer-events-none border-r border-white/[0.03]">
                    {sdks[activeSDK].code.split("\n").map((_, i) => (
                      <span key={i} className="text-[10px] font-mono text-white/[0.07] leading-[1.75] tabular-nums">{i + 1}</span>
                    ))}
                  </div>
                  <pre className="text-[12px] text-white/50 leading-[1.75] font-mono pl-9 overflow-x-auto">
                    <code>{sdks[activeSDK].code}</code>
                  </pre>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            WEBHOOKS — Events list + payload
            ══════════════════════════════════════════ */}
        <section className="py-24 relative border-t border-white/[0.04]" id="webhooks">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-[11px] font-semibold text-cyan-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                    Webhooks
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    Eventos en tiempo real
                  </h2>
                </div>
                <span className="hidden sm:inline text-[10px] font-mono text-white/15 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">
                  HMAC-SHA256 signed
                </span>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="grid lg:grid-cols-[1fr_1.1fr] gap-0 rounded-xl overflow-hidden border border-white/[0.06]">
                {/* Left — event list */}
                <div className="bg-white/[0.015] border-b lg:border-b-0 lg:border-r border-white/[0.06]">
                  <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                      <Webhook className="w-3.5 h-3.5 text-cyan-400/40" />
                      <span className="text-[10px] font-mono text-white/25">Event types</span>
                      <span className="ml-auto text-[9px] font-mono text-white/15">{webhookEvents.length} events</span>
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {webhookEvents.map((evt, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: evt.color }} />
                        <span className="text-[11px] font-mono text-white/40 group-hover:text-white/65 transition-colors font-medium">{evt.event}</span>
                        <span className="text-[10px] text-white/15 ml-auto hidden sm:block">{evt.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — sample payload */}
                <div className="bg-[#0a0a14]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-400/[0.12] text-blue-400 border border-blue-400/20">POST</span>
                      <span className="text-[10px] font-mono text-white/25">your-endpoint.com/webhook</span>
                    </div>
                    <button
                      onClick={() => handleCopy(`{ "event": "message.received", "data": { ... } }`, "wh")}
                      className="text-white/15 hover:text-white/40 transition-colors"
                    >
                      {copied === "wh" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="p-4">
                    <pre className="text-[11px] font-mono leading-[1.8] overflow-x-auto">
                      <code>
                        <span className="text-white/15">{"{"}</span>{"\n"}
                        <span className="text-violet-400/50">{"  "}"event"</span><span className="text-white/12">: </span><span className="text-cyan-400/60">"message.received"</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-violet-400/50">{"  "}"timestamp"</span><span className="text-white/12">: </span><span className="text-cyan-400/60">"2026-02-24T14:32:01Z"</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-violet-400/50">{"  "}"data"</span><span className="text-white/12">: </span><span className="text-white/15">{"{"}</span>{"\n"}
                        <span className="text-violet-400/50">{"    "}"id"</span><span className="text-white/12">: </span><span className="text-cyan-400/50">"msg_8xK2p4q..."</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-violet-400/50">{"    "}"channel"</span><span className="text-white/12">: </span><span className="text-emerald-400/50">"whatsapp"</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-violet-400/50">{"    "}"from"</span><span className="text-white/12">: </span><span className="text-cyan-400/50">"+56912345678"</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-violet-400/50">{"    "}"text"</span><span className="text-white/12">: </span><span className="text-cyan-400/60">"Hola, necesito agendar"</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-violet-400/50">{"    "}"conversation_id"</span><span className="text-white/12">: </span><span className="text-cyan-400/50">"conv_3fR9..."</span>{"\n"}
                        <span className="text-white/15">{"  }"}</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-violet-400/50">{"  "}"signature"</span><span className="text-white/12">: </span><span className="text-amber-400/50">"sha256=a1b2c3d4..."</span>{"\n"}
                        <span className="text-white/15">{"}"}</span>
                      </code>
                    </pre>
                  </div>

                  <div className="px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.01] flex items-center gap-2">
                    <Shield className="w-3 h-3 text-emerald-400/40" />
                    <span className="text-[9px] text-white/20 font-mono">HMAC-SHA256 signature included in every payload</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            AUTHENTICATION — OAuth 2.0 flow explained
            ══════════════════════════════════════════ */}
        <section className="py-24 relative border-t border-white/[0.04]" id="auth">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                    Autenticación
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    Seguridad de nivel enterprise
                  </h2>
                </div>
                <span className="hidden sm:inline text-[10px] font-mono text-white/15 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">
                  OAuth 2.0 + Bearer Token
                </span>
              </div>
            </Reveal>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left — Explanation */}
              <Reveal>
                <div className="space-y-6">
                  {[
                    {
                      step: "1",
                      title: "Genera tu API Key",
                      desc: "Desde el dashboard de WITHMIA, genera un token de acceso. Puedes crear múltiples keys con scopes específicos.",
                      icon: Key,
                      color: "#f59e0b",
                    },
                    {
                      step: "2",
                      title: "Incluye el token en cada request",
                      desc: "Envía el header Authorization: Bearer sk_live_... en todas tus peticiones. Para testing, usa sk_test_... en el sandbox.",
                      icon: Lock,
                      color: "#34d399",
                    },
                    {
                      step: "3",
                      title: "Scopes granulares",
                      desc: "Asigna permisos por recurso: messages:write, conversations:read, contacts:*, webhooks:manage. Principio de mínimo privilegio.",
                      icon: Shield,
                      color: "#a78bfa",
                    },
                    {
                      step: "4",
                      title: "Rotación segura",
                      desc: "Rota tokens sin downtime. La API soporta dos tokens activos simultáneamente durante la migración.",
                      icon: RefreshCw,
                      color: "#22d3ee",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 group">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${item.color}10`, border: `1px solid ${item.color}20` }}
                      >
                        <item.icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-semibold text-white/70 mb-1">{item.title}</h3>
                        <p className="text-[12px] text-white/25 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

              {/* Right — Code example */}
              <Reveal delay={100}>
                <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0a14]">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.01]">
                    <Lock className="w-3.5 h-3.5 text-emerald-400/40" />
                    <span className="text-[10px] font-mono text-white/30">Ejemplo de autenticación</span>
                  </div>
                  <div className="p-4">
                    <pre className="text-[11px] font-mono leading-[1.8] overflow-x-auto">
                      <code>
                        <span className="text-white/20">{"// Tokens con scopes específicos"}</span>{"\n"}
                        <span className="text-amber-400/60">const</span> <span className="text-white/50">client</span> <span className="text-white/20">=</span> <span className="text-amber-400/60">new</span> <span className="text-cyan-400/60">Withmia</span><span className="text-white/15">({"{"}</span>{"\n"}
                        <span className="text-violet-400/50">{"  "}apiKey</span><span className="text-white/12">: </span><span className="text-cyan-400/50">"sk_live_..."</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-violet-400/50">{"  "}scopes</span><span className="text-white/12">: </span><span className="text-white/15">[</span>{"\n"}
                        <span className="text-cyan-400/50">{"    "}"messages:write"</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-cyan-400/50">{"    "}"conversations:read"</span><span className="text-white/10">,</span>{"\n"}
                        <span className="text-cyan-400/50">{"    "}"contacts:read"</span>{"\n"}
                        <span className="text-white/15">{"  ]"}</span>{"\n"}
                        <span className="text-white/15">{"}"}</span><span className="text-white/15">);</span>{"\n\n"}
                        <span className="text-white/20">{"// Headers enviados automáticamente:"}</span>{"\n"}
                        <span className="text-white/20">{"// Authorization: Bearer sk_live_..."}</span>{"\n"}
                        <span className="text-white/20">{"// X-Api-Version: 2026-02-01"}</span>{"\n"}
                        <span className="text-white/20">{"// X-Idempotency-Key: auto-generated"}</span>
                      </code>
                    </pre>
                  </div>
                  <div className="px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.01] flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400/40" />
                    <span className="text-[9px] text-white/20 font-mono">Tokens nunca se loguean ni se exponen en respuestas</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ERROR CODES — Status codes reference
            ══════════════════════════════════════════ */}
        <section className="py-24 relative border-t border-white/[0.04]" id="errors">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-[11px] font-semibold text-red-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                    Códigos de Error
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    Respuestas predecibles
                  </h2>
                </div>
              </div>
            </Reveal>

            <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
              {/* Left — Status codes table */}
              <Reveal>
                <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                  <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-3.5 h-3.5 text-white/20" />
                      <span className="text-[10px] font-mono text-white/30">HTTP Status Codes</span>
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.03] bg-white/[0.015]">
                    {errorCodes.map((err, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors group">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${err.bg}`} style={{ color: err.color }}>
                          {err.code}
                        </span>
                        <span className="text-[11px] font-mono text-white/40 font-medium shrink-0 w-24">{err.label}</span>
                        <span className="text-[10px] text-white/20 hidden sm:block">{err.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Right — Error response example */}
              <Reveal delay={100}>
                <div className="space-y-6">
                  <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0a14]">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.01]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400/40" />
                      <span className="text-[10px] font-mono text-white/30">Formato de error estándar</span>
                    </div>
                    <div className="p-4">
                      <pre className="text-[11px] font-mono leading-[1.8] overflow-x-auto">
                        <code>
                          <span className="text-white/15">{"{"}</span>{"\n"}
                          <span className="text-violet-400/50">{"  "}"error"</span><span className="text-white/12">: </span><span className="text-white/15">{"{"}</span>{"\n"}
                          <span className="text-violet-400/50">{"    "}"type"</span><span className="text-white/12">: </span><span className="text-red-400/60">"validation_error"</span><span className="text-white/10">,</span>{"\n"}
                          <span className="text-violet-400/50">{"    "}"code"</span><span className="text-white/12">: </span><span className="text-red-400/60">"invalid_phone_number"</span><span className="text-white/10">,</span>{"\n"}
                          <span className="text-violet-400/50">{"    "}"message"</span><span className="text-white/12">: </span><span className="text-cyan-400/60">"El número de teléfono no es válido"</span><span className="text-white/10">,</span>{"\n"}
                          <span className="text-violet-400/50">{"    "}"param"</span><span className="text-white/12">: </span><span className="text-cyan-400/50">"to"</span><span className="text-white/10">,</span>{"\n"}
                          <span className="text-violet-400/50">{"    "}"doc_url"</span><span className="text-white/12">: </span><span className="text-cyan-400/50">"https://docs.withmia.com/errors/invalid_phone"</span>{"\n"}
                          <span className="text-white/15">{"  }"}</span>{"\n"}
                          <span className="text-white/15">{"}"}</span>
                        </code>
                      </pre>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0a14]">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.01]">
                      <Ban className="w-3.5 h-3.5 text-violet-400/40" />
                      <span className="text-[10px] font-mono text-white/30">Rate limit excedido (429)</span>
                    </div>
                    <div className="p-4">
                      <pre className="text-[11px] font-mono leading-[1.8] overflow-x-auto">
                        <code>
                          <span className="text-white/20">{"// Headers de respuesta"}</span>{"\n"}
                          <span className="text-violet-400/50">X-RateLimit-Limit</span><span className="text-white/12">: </span><span className="text-amber-400/60">1000</span>{"\n"}
                          <span className="text-violet-400/50">X-RateLimit-Remaining</span><span className="text-white/12">: </span><span className="text-red-400/60">0</span>{"\n"}
                          <span className="text-violet-400/50">X-RateLimit-Reset</span><span className="text-white/12">: </span><span className="text-cyan-400/50">1708872000</span>{"\n"}
                          <span className="text-violet-400/50">Retry-After</span><span className="text-white/12">: </span><span className="text-amber-400/60">30</span>
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            RATE LIMITING — Plans + limits
            ══════════════════════════════════════════ */}
        <section className="py-24 relative border-t border-white/[0.04]" id="limits">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                  Rate Limiting
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Límites por plan
                </h2>
                <p className="text-white/30 max-w-lg mx-auto text-[15px]">
                  Cada request incluye headers informativos. Escala sin sorpresas.
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rateLimits.map((plan, i) => (
                  <div
                    key={i}
                    className={`relative p-6 rounded-xl border transition-all duration-300 hover:-translate-y-1 ${
                      plan.highlighted
                        ? "border-amber-400/25 bg-gradient-to-b from-amber-500/[0.04] to-transparent"
                        : "border-white/[0.06] bg-white/[0.015]"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/25">
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Popular</span>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${plan.color}10`, border: `1px solid ${plan.color}20` }}>
                        <Gauge className="w-4 h-4" style={{ color: plan.color }} />
                      </div>
                      <h3 className="text-sm font-bold text-white/80 mb-1">{plan.plan}</h3>
                      <p className="text-2xl font-bold font-mono mb-1" style={{ color: plan.color }}>{plan.requests}</p>
                      <p className="text-[10px] text-white/20 mb-3">req/{plan.per}</p>
                      <div className="text-[10px] text-white/15 mb-3">Burst: {plan.burst}</div>
                      <div className="pt-3 border-t border-white/[0.05]">
                        <span className="text-[13px] font-semibold text-white/50">{plan.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-8 p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row items-center gap-3">
                <Timer className="w-4 h-4 text-amber-400/40 shrink-0" />
                <p className="text-[12px] text-white/25 text-center sm:text-left">
                  <span className="text-white/50 font-medium">Backoff inteligente:</span> Los SDKs oficiales implementan retry automático con backoff exponencial. Si excedes el límite, esperan el tiempo indicado en <code className="text-amber-400/50 font-mono text-[10px]">Retry-After</code> y reintentan.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            USE CASES — Real integration examples
            ══════════════════════════════════════════ */}
        <section className="py-24 relative border-t border-white/[0.04]" id="use-cases">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold text-violet-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                  Casos de Uso
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Integraciones reales
                </h2>
                <p className="text-white/30 max-w-lg mx-auto text-[15px]">
                  Ejemplos de código listos para copiar. Adapta, conecta y lanza.
                </p>
              </div>
            </Reveal>

            <div className="space-y-6">
              {useCases.map((uc, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="grid lg:grid-cols-[1fr_1.3fr] gap-0 rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.10] transition-all duration-300">
                    {/* Left — Description */}
                    <div className="p-6 lg:p-8 bg-white/[0.015] flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${uc.color}10`, border: `1px solid ${uc.color}20` }}
                        >
                          <uc.icon className="w-5 h-5" style={{ color: uc.color }} />
                        </div>
                        <h3 className="text-lg font-bold text-white/80">{uc.title}</h3>
                      </div>
                      <p className="text-[13px] text-white/30 leading-relaxed">{uc.desc}</p>
                    </div>
                    {/* Right — Code */}
                    <div className="bg-[#0a0a14] border-t lg:border-t-0 lg:border-l border-white/[0.06]">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]">
                        <span className="text-[9px] font-mono text-white/20">{uc.title.toLowerCase()}.js</span>
                        <button
                          onClick={() => handleCopy(uc.code, `uc-${i}`)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-all text-white/20 hover:text-white/40"
                        >
                          {copied === `uc-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span className="text-[8px] font-mono">{copied === `uc-${i}` ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <div className="relative p-4">
                        <div className="absolute left-0 top-4 bottom-4 w-8 flex flex-col items-end pr-2 select-none pointer-events-none border-r border-white/[0.03]">
                          {uc.code.split("\n").map((_, j) => (
                            <span key={j} className="text-[9px] font-mono text-white/[0.07] leading-[1.75] tabular-nums">{j + 1}</span>
                          ))}
                        </div>
                        <pre className="text-[11px] text-white/40 leading-[1.75] font-mono pl-7 overflow-x-auto">
                          <code>{uc.code}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ARCHITECTURE — How it connects
            ══════════════════════════════════════════ */}
        <section className="py-24 relative border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold text-violet-400/60 uppercase tracking-[0.2em] mb-3 font-mono">
                  Arquitectura
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Un solo endpoint, múltiples canales
                </h2>
                <p className="text-white/30 max-w-lg mx-auto text-[15px]">
                  WITHMIA abstrae la complejidad de cada proveedor. Tú hablas con una sola API.
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-8 md:p-12 overflow-hidden relative">
                {/* Faint grid */}
                <div className="absolute inset-0 api-grid-bg opacity-[0.015] pointer-events-none" />

                <div className="relative grid md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-6 md:gap-0">
                  {/* Your App */}
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      <Code className="w-7 h-7 text-white/30" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/60">Tu aplicación</p>
                      <p className="text-[10px] text-white/20 mt-1">REST / SDK / Webhook</p>
                    </div>
                    <div className="flex gap-1.5">
                      {["REST", "SDK", "WS"].map(t => (
                        <span key={t} className="text-[8px] font-mono text-white/15 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="hidden md:flex flex-col items-center gap-1 px-6">
                    <div className="w-16 h-px bg-gradient-to-r from-white/[0.05] to-amber-400/20" />
                    <ArrowRight className="w-4 h-4 text-amber-400/30" />
                    <span className="text-[7px] font-mono text-white/10 mt-1">HTTPS</span>
                  </div>
                  <div className="flex md:hidden justify-center"><ArrowRight className="w-5 h-5 text-amber-400/20 rotate-90" /></div>

                  {/* WITHMIA API */}
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-amber-500/[0.06] to-violet-500/[0.04] blur-lg" />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#0a0a15] to-violet-500/10 border border-white/[0.12] flex items-center justify-center overflow-hidden">
                        <video src="/logo-animated.webm" autoPlay loop muted playsInline className="w-12 h-12 object-contain pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">WITHMIA API</p>
                      <p className="text-[10px] text-white/20 mt-1">Orquestador inteligente</p>
                    </div>
                    <div className="flex gap-1.5">
                      {["OAuth 2.0", "IA/NLP", "<23ms"].map(t => (
                        <span key={t} className="text-[8px] font-mono text-amber-400/35 px-2 py-0.5 rounded bg-amber-400/[0.04] border border-amber-400/10">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="hidden md:flex flex-col items-center gap-1 px-6">
                    <div className="w-16 h-px bg-gradient-to-r from-amber-400/20 to-white/[0.05]" />
                    <ArrowRight className="w-4 h-4 text-amber-400/30" />
                    <span className="text-[7px] font-mono text-white/10 mt-1">Multi-canal</span>
                  </div>
                  <div className="flex md:hidden justify-center"><ArrowRight className="w-5 h-5 text-amber-400/20 rotate-90" /></div>

                  {/* Channels */}
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { name: "WA", color: "#25D366" },
                        { name: "IG", color: "#E1306C" },
                        { name: "MSG", color: "#006AFF" },
                        { name: "Mail", color: "#6366f1" },
                        { name: "Chat", color: "#f59e0b" },
                        { name: "API", color: "#22d3ee" },
                      ].map(ch => (
                        <div
                          key={ch.name}
                          className="w-12 h-12 rounded-lg flex items-center justify-center border transition-transform duration-300 hover:scale-110"
                          style={{ backgroundColor: `${ch.color}0a`, borderColor: `${ch.color}18` }}
                        >
                          <span className="text-[8px] font-bold font-mono" style={{ color: `${ch.color}99` }}>{ch.name}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/60">Canales</p>
                      <p className="text-[10px] text-white/20 mt-1">6+ conectados</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            TRUST — Security & compliance
            ══════════════════════════════════════════ */}
        <Reveal>
          <section className="py-10 border-y border-white/[0.04] bg-white/[0.008]">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
                {[
                  { icon: Lock, text: "TLS 1.3" },
                  { icon: Shield, text: "HMAC-SHA256" },
                  { icon: Key, text: "OAuth 2.0" },
                  { icon: Activity, text: "99.9% SLA" },
                  { icon: Globe, text: "Multi-region" },
                  { icon: GitBranch, text: "Versioning" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5 text-amber-400/30" />
                    <span className="text-[11px] text-white/25 tracking-wide font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ══════════════════════════════════════════
            CTA — Clean, minimal
            ══════════════════════════════════════════ */}
        <section className="py-28 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
            <div className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/[0.025] rounded-full blur-[100px]" />
          </div>

          <Reveal>
            <div className="relative max-w-2xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] mb-8">
                <Sparkles className="w-3 h-3 text-amber-400/60" />
                <span className="text-[10px] font-medium text-white/30">Comienza gratis</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
                Empieza a construir hoy
              </h2>
              <p className="text-white/30 mb-10 max-w-md mx-auto text-[15px] leading-relaxed">
                API keys gratuitas. Sandbox incluido. Sin tarjeta de crédito.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick("get_api_key_bottom", "api_page")}
                  className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-black text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)] overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    Obtener API Key
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
                <a
                  href="/docs"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/[0.15] text-sm font-medium transition-all duration-300 hover:bg-white/[0.02]"
                >
                  <BookOpen className="w-4 h-4" />
                  Documentación
                </a>
              </div>
            </div>
          </Reveal>
        </section>

      </div>
      {/* ── Styles ── */}
      <style>{`
        .api-page {
          --grid-color: rgba(255,255,255,0.06);
        }
        .api-grid-bg {
          background-image:
            linear-gradient(var(--grid-color) 1px, transparent 1px),
            linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .api-status-dot {
          animation: api-dot-pulse 2.5s ease-in-out infinite;
        }
        @keyframes api-dot-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; box-shadow: 0 0 6px currentColor; }
        }
      `}</style>
    </div>
  );
};

export default ApiPage;
