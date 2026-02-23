import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import {
  Search,
  Play,
  Clock,
  ChevronRight,
  ArrowRight,
  MessageSquare,
  Settings,
  Bot,
  Users,
  Zap,
  BarChart3,
  Globe,
  Code,
  Shield,
  Headphones,
  BookOpen,
  Filter,
  PlayCircle,
  MonitorPlay,
  Sparkles,
} from "lucide-react";

/* ─── Video Tutorial Categories ─── */
const videoCategories = [
  { id: "todos", label: "Todos", icon: MonitorPlay },
  { id: "inicio", label: "Primeros pasos", icon: Sparkles },
  { id: "canales", label: "Canales", icon: Globe },
  { id: "conversaciones", label: "Conversaciones", icon: MessageSquare },
  { id: "ia", label: "IA y Bots", icon: Bot },
  { id: "equipo", label: "Equipo", icon: Users },
  { id: "integraciones", label: "Integraciones", icon: Code },
  { id: "config", label: "Configuración", icon: Settings },
];

/* ─── Video Tutorials ─── */
const videoTutorials = [
  {
    id: 1,
    title: "Cómo configurar tu cuenta WITHMIA por primera vez",
    desc: "Aprende a crear tu workspace, invitar a tu equipo y configurar las opciones básicas para empezar.",
    duration: "4:32",
    category: "inicio",
    thumbnail: null,
    youtubeId: "kbo-BRcZjiA",
    featured: true,
  },
  {
    id: 2,
    title: "Conectar WhatsApp Business API paso a paso",
    desc: "Guía completa para vincular tu número de WhatsApp Business y empezar a recibir mensajes.",
    duration: "6:15",
    category: "canales",
    thumbnail: null,
    youtubeId: null,
    featured: true,
  },
  {
    id: 3,
    title: "Conectar Instagram Direct como canal de atención",
    desc: "Configura Instagram para gestionar DMs directamente desde WITHMIA.",
    duration: "3:48",
    category: "canales",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 4,
    title: "Tu primera conversación: responder y asignar",
    desc: "Cómo gestionar tu primera conversación, responder mensajes y asignar a un agente.",
    duration: "5:10",
    category: "conversaciones",
    thumbnail: null,
    youtubeId: null,
    featured: true,
  },
  {
    id: 5,
    title: "Crear y entrenar tu asistente de IA",
    desc: "Configura un bot con IA que responda preguntas frecuentes usando tus propios documentos.",
    duration: "8:22",
    category: "ia",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 6,
    title: "Configurar respuestas rápidas y atajos",
    desc: "Crea plantillas de respuesta rápida para agilizar la atención de tu equipo.",
    duration: "3:15",
    category: "conversaciones",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 7,
    title: "Gestionar roles y permisos del equipo",
    desc: "Aprende a crear roles personalizados y asignar permisos específicos a cada miembro.",
    duration: "4:55",
    category: "equipo",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 8,
    title: "Automatizar asignación de conversaciones",
    desc: "Configura reglas automáticas para distribuir conversaciones entre agentes.",
    duration: "5:40",
    category: "equipo",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 9,
    title: "Integrar WITHMIA con tu CRM",
    desc: "Conecta tu CRM favorito para sincronizar contactos y datos de conversaciones.",
    duration: "6:30",
    category: "integraciones",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 10,
    title: "Configurar webhooks para eventos",
    desc: "Recibe notificaciones en tiempo real cuando ocurren eventos en tu workspace.",
    duration: "4:18",
    category: "integraciones",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 11,
    title: "Leer y entender tus métricas de rendimiento",
    desc: "Dashboard de analítica: tiempos de respuesta, satisfacción y productividad del equipo.",
    duration: "5:05",
    category: "config",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 12,
    title: "Crear flujos de automatización con IA",
    desc: "Diseña flujos inteligentes que clasifican, responden y escalan conversaciones automáticamente.",
    duration: "7:45",
    category: "ia",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 13,
    title: "Configurar Facebook Messenger como canal",
    desc: "Vincula tu página de Facebook para gestionar mensajes de Messenger desde WITHMIA.",
    duration: "3:30",
    category: "canales",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 14,
    title: "Usar la API REST para enviar mensajes",
    desc: "Primeros pasos con la API: autenticación, envío de mensajes y manejo de respuestas.",
    duration: "6:50",
    category: "integraciones",
    thumbnail: null,
    youtubeId: null,
  },
  {
    id: 15,
    title: "Configurar notificaciones y horarios de atención",
    desc: "Define horarios de trabajo, mensajes fuera de oficina y notificaciones para tu equipo.",
    duration: "4:00",
    category: "config",
    thumbnail: null,
    youtubeId: null,
  },
];

/* ─── FAQ ─── */
const faqItems = [
  {
    q: "¿Cómo empiezo a usar WITHMIA?",
    a: "Crea tu cuenta gratuita, conecta tu primer canal de mensajería y empieza a recibir conversaciones. Mira nuestro video de primeros pasos para una guía visual completa.",
  },
  {
    q: "¿Cuántos canales puedo conectar?",
    a: "Depende de tu plan. El plan Starter incluye 1 canal, Professional hasta 5, y Enterprise canales ilimitados.",
  },
  {
    q: "¿La IA de WITHMIA aprende de mis datos?",
    a: "Sí, puedes entrenar tu asistente de IA con tus propios documentos, preguntas frecuentes y base de conocimiento para dar respuestas personalizadas.",
  },
  {
    q: "¿Puedo integrar WITHMIA con mi CRM?",
    a: "Sí, WITHMIA se integra con los principales CRMs del mercado además de ofrecer una API REST completa para integraciones personalizadas.",
  },
  {
    q: "¿Cómo funciona la facturación?",
    a: "Puedes elegir facturación mensual o anual. Los planes anuales tienen un descuento del 20%. Puedes cambiar de plan o cancelar en cualquier momento.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Absolutamente. Usamos cifrado TLS 1.3, autenticación OAuth 2.0, y cumplimos con las normativas de protección de datos de Chile.",
  },
];

/* ─── Component ─── */
const HelpCenter = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  const filteredVideos = videoTutorials.filter((v) => {
    const matchesCategory =
      activeCategory === "todos" || v.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredVideos = videoTutorials.filter((v) => v.featured);

  return (
    <div className="min-h-screen bg-[#030507]">
      <Navigation />
      <main className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-950/10 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-purple-500/[0.02] rounded-full blur-[140px]" />
          </div>

          <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8">
              <Headphones className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-white/50 tracking-wide">
                Centro de Ayuda
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Aprende con
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                video tutoriales
              </span>
            </h1>

            <p className="text-lg text-white/45 max-w-2xl mx-auto leading-relaxed mb-12">
              Guías visuales paso a paso para dominar cada funcionalidad de WITHMIA.
              Desde tu primera configuración hasta automatizaciones avanzadas.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div
                className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
                  searchFocused
                    ? "border-purple-500/30 bg-white/[0.05] shadow-[0_0_40px_rgba(168,85,247,0.06)]"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <Search className="absolute left-5 w-5 h-5 text-white/25" />
                <input
                  type="text"
                  placeholder="Buscar tutoriales..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-14 pr-5 py-4.5 bg-transparent text-white/80 placeholder-white/25 text-[15px] focus:outline-none"
                />
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 mt-6">
                {[
                  { value: `${videoTutorials.length}`, label: "Tutoriales" },
                  { value: `${videoCategories.length - 1}`, label: "Categorías" },
                  { value: "Nuevo", label: "contenido semanal" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/60">{s.value}</span>
                    <span className="text-[11px] text-white/25">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURED VIDEOS ── */}
        <section className="py-20 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-purple-400/60 uppercase tracking-widest mb-2">
                  Empieza aquí
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Tutoriales esenciales
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featuredVideos.map((video, i) => (
                <div
                  key={video.id}
                  className="group cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 overflow-hidden"
                >
                  {/* Thumbnail placeholder */}
                  <div className="relative aspect-video bg-gradient-to-br from-purple-950/40 to-pink-950/30 flex items-center justify-center overflow-hidden">
                    {playingVideo === video.id && video.youtubeId ? (
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        {video.youtubeId && (
                          <img
                            src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                            alt={video.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08)_0%,transparent_70%)]" />

                        {/* Play button */}
                        <div
                          onClick={() => video.youtubeId && setPlayingVideo(video.id)}
                          className="relative z-10 w-16 h-16 rounded-full bg-white/[0.1] border border-white/[0.15] flex items-center justify-center group-hover:bg-white/[0.15] group-hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                        >
                          <Play className="w-6 h-6 text-white/80 ml-1" />
                        </div>

                        {/* Duration badge */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                          <Clock className="w-3 h-3 text-white/50" />
                          <span className="text-[11px] font-mono text-white/60">{video.duration}</span>
                        </div>

                        {/* Episode number */}
                        <div className="absolute top-3 left-3">
                          <span className="text-[10px] font-bold text-purple-400/70 px-2 py-0.5 rounded-md bg-purple-500/[0.1] border border-purple-500/15 uppercase tracking-wider">
                            Esencial
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="text-[14px] font-semibold text-white/80 group-hover:text-white leading-snug mb-2 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-[12px] text-white/30 leading-relaxed line-clamp-2">
                      {video.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ALL TUTORIALS ── */}
        <section className="py-20 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-purple-400/60 uppercase tracking-widest mb-4">
                Biblioteca completa
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Todos los tutoriales
              </h2>
              <p className="text-white/40 max-w-xl mx-auto">
                Filtra por categoría o busca el tema que necesitas aprender.
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
              {videoCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-300 ${
                    activeCategory === cat.id
                      ? "bg-purple-500/[0.12] border border-purple-500/25 text-purple-300"
                      : "bg-white/[0.02] border border-white/[0.06] text-white/35 hover:text-white/55 hover:border-white/[0.1]"
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Video grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="group cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-white/[0.02] to-white/[0.01] flex items-center justify-center overflow-hidden">
                    {playingVideo === video.id && video.youtubeId ? (
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        {video.youtubeId && (
                          <img
                            src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                            alt={video.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-opacity duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.04)_0%,transparent_70%)]" />

                        <div
                          onClick={() => video.youtubeId && setPlayingVideo(video.id)}
                          className="relative z-10 w-12 h-12 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center group-hover:bg-purple-500/[0.15] group-hover:border-purple-500/20 group-hover:scale-105 transition-all duration-300"
                        >
                          <Play className="w-5 h-5 text-white/60 group-hover:text-purple-300 ml-0.5 transition-colors" />
                        </div>

                        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
                          <Clock className="w-2.5 h-2.5 text-white/40" />
                          <span className="text-[10px] font-mono text-white/50">{video.duration}</span>
                        </div>

                        <div className="absolute top-2.5 left-2.5">
                          <span className="text-[9px] font-medium text-white/30 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] capitalize">
                            {videoCategories.find((c) => c.id === video.category)?.label}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-[13px] font-semibold text-white/70 group-hover:text-white/90 leading-snug mb-1.5 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-[11px] text-white/25 leading-relaxed line-clamp-2">
                      {video.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {filteredVideos.length === 0 && (
              <div className="text-center py-16">
                <MonitorPlay className="w-10 h-10 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 text-sm">
                  No se encontraron tutoriales para esta búsqueda.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("todos");
                  }}
                  className="mt-3 text-[12px] text-purple-400/70 hover:text-purple-300 transition-colors"
                >
                  Ver todos los tutoriales
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-purple-400/60 uppercase tracking-widest mb-4">
                FAQ
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Preguntas frecuentes
              </h2>
            </div>

            <div className="space-y-3">
              {faqItems.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-white/[0.1]"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="text-[14px] font-medium text-white/70 pr-4">
                      {faq.q}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-white/20 shrink-0 transition-transform duration-300 ${
                        expandedFaq === i ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      expandedFaq === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="px-6 pb-5 text-[13px] text-white/35 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/[0.08] border border-purple-500/15 flex items-center justify-center mx-auto mb-8">
              <Headphones className="w-7 h-7 text-purple-400/70" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              ¿Necesitas más ayuda?
            </h2>
            <p className="text-white/40 mb-10 max-w-xl mx-auto">
              Si no encontraste lo que buscas, nuestro equipo de soporte está
              listo para ayudarte personalmente.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/contacto"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:-translate-y-px"
              >
                Contactar soporte
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/docs"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300"
              >
                <BookOpen className="w-4 h-4" />
                Ver documentación
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default HelpCenter;
