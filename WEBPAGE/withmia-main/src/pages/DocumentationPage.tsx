import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import {
  Search,
  BookOpen,
  Code,
  Webhook,
  Key,
  Layers,
  MessageSquare,
  Zap,
  ArrowRight,
  ChevronRight,
  Terminal,
  FileText,
  Globe,
  Shield,
  Users,
  Settings,
  Bot,
  BarChart3,
  Sparkles,
  Clock,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Play,
  Rocket,
  Database,
  Lock,
  Mail,
} from "lucide-react";

/* ─── Category Cards ─── */
const categories = [
  {
    icon: Rocket,
    title: "Guía de inicio rápido",
    desc: "Configura tu cuenta, conecta tu primer canal y envía tu primer mensaje en menos de 5 minutos.",
    articles: 8,
    color: "#f59e0b",
    tag: "Esencial",
  },
  {
    icon: Code,
    title: "API Reference",
    desc: "Documentación completa de todos los endpoints, parámetros, respuestas y códigos de error.",
    articles: 24,
    color: "#22d3ee",
    tag: "Técnico",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    desc: "Configura eventos en tiempo real, firma de payloads, reintentos automáticos y debugging.",
    articles: 12,
    color: "#a78bfa",
    tag: "Técnico",
  },
  {
    icon: Layers,
    title: "SDKs y Librerías",
    desc: "Guías de instalación y uso para Node.js, Python y PHP con ejemplos prácticos.",
    articles: 9,
    color: "#34d399",
    tag: "Técnico",
  },
  {
    icon: MessageSquare,
    title: "Canales de mensajería",
    desc: "WhatsApp Business API, Instagram, Messenger, Email, Chat Web — configuración y mejores prácticas.",
    articles: 18,
    color: "#60a5fa",
    tag: "Guía",
  },
  {
    icon: Bot,
    title: "IA y Automatización",
    desc: "Configura asistentes de IA, flujos automatizados, RAG y entrenamiento con tus datos.",
    articles: 15,
    color: "#fb923c",
    tag: "Avanzado",
  },
  {
    icon: Users,
    title: "Gestión de equipos",
    desc: "Roles, permisos, asignación automática, métricas de rendimiento y colaboración.",
    articles: 10,
    color: "#f472b6",
    tag: "Guía",
  },
  {
    icon: Shield,
    title: "Seguridad y Compliance",
    desc: "OAuth 2.0, TLS 1.3, GDPR, cifrado de datos, auditoría y políticas de retención.",
    articles: 7,
    color: "#6366f1",
    tag: "Avanzado",
  },
  {
    icon: Database,
    title: "Integraciones",
    desc: "CRM, ERPs, herramientas de soporte, n8n, Zapier — conecta WITHMIA con tu stack.",
    articles: 14,
    color: "#14b8a6",
    tag: "Guía",
  },
];

/* ─── Popular Articles ─── */
const popularArticles = [
  {
    category: "Inicio rápido",
    title: "Conectar WhatsApp Business en 3 pasos",
    readTime: "3 min",
    color: "#f59e0b",
  },
  {
    category: "API",
    title: "Autenticación con OAuth 2.0",
    readTime: "5 min",
    color: "#22d3ee",
  },
  {
    category: "Webhooks",
    title: "Configurar webhooks para mensajes entrantes",
    readTime: "4 min",
    color: "#a78bfa",
  },
  {
    category: "IA",
    title: "Entrenar tu asistente con documentos propios",
    readTime: "6 min",
    color: "#fb923c",
  },
  {
    category: "SDKs",
    title: "Enviar mensajes con el SDK de Node.js",
    readTime: "3 min",
    color: "#34d399",
  },
  {
    category: "Canales",
    title: "Configurar Instagram Direct como canal",
    readTime: "4 min",
    color: "#60a5fa",
  },
];

/* ─── Quick Start Steps ─── */
const quickStartSteps = [
  {
    step: "01",
    title: "Crea tu cuenta",
    desc: "Regístrate en app.withmia.com y accede al dashboard.",
    code: null,
  },
  {
    step: "02",
    title: "Obtén tu API Key",
    desc: "Ve a Configuración → API Keys y genera tu token.",
    code: 'export WITHMIA_API_KEY="sk_live_..."',
  },
  {
    step: "03",
    title: "Instala el SDK",
    desc: "Elige tu lenguaje favorito e instala la librería.",
    code: "npm install @withmia/sdk",
  },
  {
    step: "04",
    title: "Envía tu primer mensaje",
    desc: "Un request y tu mensaje llega al destino.",
    code: `const withmia = new Withmia(process.env.WITHMIA_API_KEY);
await withmia.messages.send({
  channel: "whatsapp",
  to: "+56912345678",
  text: "Hola desde WITHMIA 🚀"
});`,
  },
];

/* ─── SDK badges ─── */
const sdkBadges = [
  { name: "Node.js", color: "#68a063", version: "v2.1.0" },
  { name: "Python", color: "#3776ab", version: "v1.8.0" },
  { name: "PHP", color: "#777bb4", version: "v1.4.0" },
  { name: "cURL", color: "#f59e0b", version: "—" },
];

const DocumentationPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div className="min-h-screen bg-[#030507]">
      <Navigation />
      <main className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-950/10 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-blue-500/[0.02] rounded-full blur-[140px]" />
          </div>

          <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-white/50 tracking-wide">
                Documentación WITHMIA
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Todo lo que necesitas
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                para construir
              </span>
            </h1>

            <p className="text-lg text-white/45 max-w-2xl mx-auto leading-relaxed mb-12">
              Guías paso a paso, referencias de API, ejemplos de código y mejores
              prácticas. Todo lo necesario para integrar y aprovechar WITHMIA al máximo.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-10">
              <div
                className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
                  searchFocused
                    ? "border-blue-500/30 bg-white/[0.05] shadow-[0_0_40px_rgba(59,130,246,0.06)]"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <Search className="absolute left-5 w-5 h-5 text-white/25" />
                <input
                  type="text"
                  placeholder="Buscar en la documentación..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-14 pr-5 py-4.5 bg-transparent text-white/80 placeholder-white/25 text-[15px] focus:outline-none"
                />
                <div className="absolute right-4 flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[11px] font-mono text-white/25">
                    ⌘K
                  </kbd>
                </div>
              </div>

              {/* Quick links */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className="text-[11px] text-white/20">Popular:</span>
                {["API Keys", "Webhooks", "WhatsApp", "SDK Node.js", "OAuth 2.0"].map((term) => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="text-[11px] px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/35 hover:text-white/60 hover:border-white/[0.12] transition-all"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* SDK badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {sdkBadges.map((sdk) => (
                <div
                  key={sdk.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: sdk.color }}
                  />
                  <span className="text-[12px] font-medium text-white/50">{sdk.name}</span>
                  <span className="text-[10px] font-mono text-white/20">{sdk.version}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-blue-400/60 uppercase tracking-widest mb-4">
                Explora por tema
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Documentación organizada
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                Encuentra exactamente lo que necesitas. Cada sección incluye
                guías, ejemplos de código y referencias detalladas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat, i) => (
                <div
                  key={i}
                  className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 cursor-pointer"
                >
                  {/* Tag */}
                  <div className="absolute top-4 right-4">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{
                        color: `${cat.color}90`,
                        backgroundColor: `${cat.color}10`,
                        border: `1px solid ${cat.color}15`,
                      }}
                    >
                      {cat.tag}
                    </span>
                  </div>

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
                    style={{
                      backgroundColor: `${cat.color}12`,
                      border: `1px solid ${cat.color}20`,
                    }}
                  >
                    <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                  </div>

                  <h3 className="text-base font-semibold text-white mb-2 group-hover:text-white/90">
                    {cat.title}
                  </h3>
                  <p className="text-[13px] text-white/30 leading-relaxed mb-4">
                    {cat.desc}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/20">
                      {cat.articles} artículos
                    </span>
                    <ChevronRight
                      className="w-4 h-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── QUICK START ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-blue-400/60 uppercase tracking-widest mb-4">
                Empieza aquí
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Quick Start
              </h2>
              <p className="text-white/40 max-w-xl mx-auto">
                De cero a tu primer mensaje en menos de 5 minutos.
                Sigue estos 4 pasos y estarás listo.
              </p>
            </div>

            <div className="space-y-4">
              {quickStartSteps.map((step, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-500 overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Left: Info */}
                    <div className="flex-1 p-6 md:p-8 flex items-start gap-5">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/[0.08] border border-blue-500/15 flex items-center justify-center">
                        <span className="text-[13px] font-bold font-mono text-blue-400/70">
                          {step.step}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white mb-1.5">
                          {step.title}
                        </h3>
                        <p className="text-[13px] text-white/35 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>

                    {/* Right: Code */}
                    {step.code && (
                      <div className="md:w-[55%] bg-[#08080e] border-t md:border-t-0 md:border-l border-white/[0.04] p-5 md:p-6 flex items-center">
                        <pre className="text-[11px] md:text-[12px] text-white/45 leading-[1.8] font-mono overflow-x-auto w-full">
                          <code>{step.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POPULAR ARTICLES ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-blue-400/60 uppercase tracking-widest mb-4">
                Más leídos
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Artículos populares
              </h2>
              <p className="text-white/40 max-w-xl mx-auto">
                Los artículos más consultados por nuestra comunidad de developers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularArticles.map((article, i) => (
                <div
                  key={i}
                  className="group p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-400 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{
                        color: `${article.color}90`,
                        backgroundColor: `${article.color}10`,
                        border: `1px solid ${article.color}15`,
                      }}
                    >
                      {article.category}
                    </span>
                    <span className="text-[10px] text-white/15 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-medium text-white/70 group-hover:text-white/90 leading-snug transition-colors">
                    {article.title}
                  </h3>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-white/20 group-hover:text-blue-400/60 transition-colors">
                    Leer artículo
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── RESOURCES BAR ── */}
        <section className="py-20 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Terminal,
                  title: "API Reference",
                  desc: "Endpoints, parámetros y respuestas",
                  href: "/api",
                  color: "#22d3ee",
                },
                {
                  icon: Globe,
                  title: "Status Page",
                  desc: "Estado en tiempo real de la API",
                  href: "https://status.withmia.com",
                  color: "#34d399",
                  external: true,
                },
                {
                  icon: Sparkles,
                  title: "Changelog",
                  desc: "Nuevas features y actualizaciones",
                  href: "#",
                  color: "#a78bfa",
                },
                {
                  icon: MessageSquare,
                  title: "Comunidad",
                  desc: "Preguntas, ideas y feedback",
                  href: "https://app.withmia.com/community",
                  color: "#f472b6",
                  external: true,
                },
              ].map((res, i) => (
                <a
                  key={i}
                  href={res.href}
                  target={res.external ? "_blank" : undefined}
                  rel={res.external ? "noopener noreferrer" : undefined}
                  className="group flex items-start gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-400"
                >
                  <div
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${res.color}10`,
                      border: `1px solid ${res.color}18`,
                    }}
                  >
                    <res.icon className="w-4 h-4" style={{ color: res.color }} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-semibold text-white/70 group-hover:text-white/90 transition-colors flex items-center gap-1.5">
                      {res.title}
                      {res.external && <ExternalLink className="w-3 h-3 text-white/15" />}
                    </h4>
                    <p className="text-[11px] text-white/25 mt-0.5">{res.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/[0.08] border border-blue-500/15 flex items-center justify-center mx-auto mb-8">
              <BookOpen className="w-7 h-7 text-blue-400/70" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              ¿No encuentras lo que buscas?
            </h2>
            <p className="text-white/40 mb-10 max-w-xl mx-auto">
              Nuestro equipo de soporte técnico está disponible para ayudarte
              con cualquier duda sobre la integración.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://app.withmia.com/support"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] hover:-translate-y-px"
              >
                Contactar soporte
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/api"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300"
              >
                <Code className="w-4 h-4" />
                API Reference
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default DocumentationPage;
