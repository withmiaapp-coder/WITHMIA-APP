import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Play,
  Clock,
  MessageSquare,
  Settings,
  Bot,
  Users,
  Globe,
  Code,
  Headphones,
  BookOpen,
  MonitorPlay,
  Sparkles,
  FileText,
  LifeBuoy,
  Blocks,
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
    youtubeId: "kbo-BRcZjiA",
    featured: true,
  },
  {
    id: 2,
    title: "Conectar WhatsApp Business API paso a paso",
    desc: "Guía completa para vincular tu número de WhatsApp Business y empezar a recibir mensajes.",
    duration: "6:15",
    category: "canales",
    youtubeId: null,
    featured: true,
  },
  {
    id: 3,
    title: "Conectar Instagram Direct como canal de atención",
    desc: "Configura Instagram para gestionar DMs directamente desde WITHMIA.",
    duration: "3:48",
    category: "canales",
    youtubeId: null,
  },
  {
    id: 4,
    title: "Tu primera conversación: responder y asignar",
    desc: "Cómo gestionar tu primera conversación, responder mensajes y asignar a un agente.",
    duration: "5:10",
    category: "conversaciones",
    youtubeId: null,
    featured: true,
  },
  {
    id: 5,
    title: "Crear y entrenar tu asistente de IA",
    desc: "Configura un bot con IA que responda preguntas frecuentes usando tus propios documentos.",
    duration: "8:22",
    category: "ia",
    youtubeId: null,
  },
  {
    id: 6,
    title: "Configurar respuestas rápidas y atajos",
    desc: "Crea plantillas de respuesta rápida para agilizar la atención de tu equipo.",
    duration: "3:15",
    category: "conversaciones",
    youtubeId: null,
  },
  {
    id: 7,
    title: "Gestionar roles y permisos del equipo",
    desc: "Aprende a crear roles personalizados y asignar permisos específicos a cada miembro.",
    duration: "4:55",
    category: "equipo",
    youtubeId: null,
  },
  {
    id: 8,
    title: "Automatizar asignación de conversaciones",
    desc: "Configura reglas automáticas para distribuir conversaciones entre agentes.",
    duration: "5:40",
    category: "equipo",
    youtubeId: null,
  },
  {
    id: 9,
    title: "Integrar WITHMIA con tu CRM",
    desc: "Conecta tu CRM favorito para sincronizar contactos y datos de conversaciones.",
    duration: "6:30",
    category: "integraciones",
    youtubeId: null,
  },
  {
    id: 10,
    title: "Configurar webhooks para eventos",
    desc: "Recibe notificaciones en tiempo real cuando ocurren eventos en tu workspace.",
    duration: "4:18",
    category: "integraciones",
    youtubeId: null,
  },
  {
    id: 11,
    title: "Leer y entender tus métricas de rendimiento",
    desc: "Dashboard de analítica: tiempos de respuesta, satisfacción y productividad del equipo.",
    duration: "5:05",
    category: "config",
    youtubeId: null,
  },
  {
    id: 12,
    title: "Crear flujos de automatización con IA",
    desc: "Diseña flujos inteligentes que clasifican, responden y escalan conversaciones automáticamente.",
    duration: "7:45",
    category: "ia",
    youtubeId: null,
  },
  {
    id: 13,
    title: "Configurar Facebook Messenger como canal",
    desc: "Vincula tu página de Facebook para gestionar mensajes de Messenger desde WITHMIA.",
    duration: "3:30",
    category: "canales",
    youtubeId: null,
  },
  {
    id: 14,
    title: "Usar la API REST para enviar mensajes",
    desc: "Primeros pasos con la API: autenticación, envío de mensajes y manejo de respuestas.",
    duration: "6:50",
    category: "integraciones",
    youtubeId: null,
  },
  {
    id: 15,
    title: "Configurar notificaciones y horarios de atención",
    desc: "Define horarios de trabajo, mensajes fuera de oficina y notificaciones para tu equipo.",
    duration: "4:00",
    category: "config",
    youtubeId: null,
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
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [activeHeroVideo, setActiveHeroVideo] = useState(0);

  /* ── Fetch real title & duration from YouTube for videos that have a youtubeId ── */
  const [videoMeta, setVideoMeta] = useState<Record<string, { title?: string; duration?: string }>>({});

  useEffect(() => {
    const videosWithId = videoTutorials.filter((v) => v.youtubeId);
    if (videosWithId.length === 0) return;

    // 1. Fetch title via oEmbed (no API key required)
    videosWithId.forEach(async (video) => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video.youtubeId}&format=json`
        );
        if (!res.ok) return;
        const data = await res.json();
        setVideoMeta((prev) => ({
          ...prev,
          [video.youtubeId!]: { ...prev[video.youtubeId!], title: data.title },
        }));
      } catch { /* fallback to hardcoded */ }
    });

    // 2. Load YouTube IFrame API to detect real duration
    if ((window as any).YT?.Player) {
      detectDurations(videosWithId);
    } else {
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        prev?.();
        detectDurations(videosWithId);
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    function detectDurations(videos: typeof videosWithId) {
      videos.forEach((video) => {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.width = "1px";
        container.style.height = "1px";
        container.style.overflow = "hidden";
        container.style.opacity = "0";
        container.style.pointerEvents = "none";
        document.body.appendChild(container);

        new (window as any).YT.Player(container, {
          videoId: video.youtubeId,
          playerVars: { autoplay: 0, controls: 0 },
          events: {
            onReady: (event: any) => {
              const seconds = event.target.getDuration();
              if (seconds > 0) {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                const durationStr = `${mins}:${secs.toString().padStart(2, "0")}`;
                setVideoMeta((prev) => ({
                  ...prev,
                  [video.youtubeId!]: { ...prev[video.youtubeId!], duration: durationStr },
                }));
              }
              event.target.destroy();
              container.remove();
            },
          },
        });
      });
    }
  }, []);

  /* Helper to get resolved title / duration for a video */
  const getVideoTitle = (video: (typeof videoTutorials)[number]) =>
    (video.youtubeId && videoMeta[video.youtubeId]?.title) || video.title;
  const getVideoDuration = (video: (typeof videoTutorials)[number]) =>
    (video.youtubeId && videoMeta[video.youtubeId]?.duration) || video.duration;

  const featuredVideos = videoTutorials.filter((v) => v.featured);
  const heroVideo = featuredVideos[activeHeroVideo] || featuredVideos[0];

  const filteredVideos = videoTutorials.filter((v) => {
    const matchesCategory =
      activeCategory === "todos" || v.category === activeCategory;
    const resolvedTitle = getVideoTitle(v).toLowerCase();
    const matchesSearch =
      !searchQuery ||
      resolvedTitle.includes(searchQuery.toLowerCase()) ||
      v.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: videoTutorials.length };
    videoTutorials.forEach((v) => {
      counts[v.category] = (counts[v.category] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-amber-500/[0.025] blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[140px]" />
      </div>
      <div className="pt-20 relative z-[1]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/15 backdrop-blur-sm mb-8">
              <Headphones className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 tracking-wide uppercase">
                Centro de Ayuda
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Aprende con{" "}
              <span className="text-gradient">video tutoriales</span>
            </h1>

            <p className="text-lg text-white/40 max-w-2xl mx-auto leading-relaxed mb-10">
              Guías visuales paso a paso para dominar cada funcionalidad de WITHMIA.
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto">
              <div
                className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
                  searchFocused
                    ? "border-amber-500/25 bg-white/[0.05] shadow-[0_0_40px_rgba(245,158,11,0.06)]"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <Search className="absolute left-5 w-5 h-5 text-white/25" />
                <input
                  type="text"
                  placeholder="Buscar tutoriales..."
                  aria-label="Buscar tutoriales"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-14 pr-5 py-4 bg-transparent text-white/80 placeholder-white/25 text-[15px] focus:outline-none focus:ring-1 focus:ring-amber-500/30 rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURED — Player + Playlist ── */}
        <section className="pb-10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-12" />

            <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest mb-3">
              Empieza aquí
            </p>
            <h2 className="text-2xl font-bold text-white mb-8">
              Tutoriales esenciales
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-0 rounded-2xl border border-white/[0.06] overflow-hidden">
              {/* Player area */}
              <div className="relative bg-black">
                <div className="aspect-video relative">
                  {playingVideo === `hero-${heroVideo.id}` && heroVideo.youtubeId ? (
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${heroVideo.youtubeId}?autoplay=1&rel=0`}
                      title={getVideoTitle(heroVideo)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      {heroVideo.youtubeId ? (
                        <img
                          src={`https://img.youtube.com/vi/${heroVideo.youtubeId}/maxresdefault.jpg`}
                          alt={getVideoTitle(heroVideo)}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-white/[0.01]" />
                      )}
                      <div className="absolute inset-0 bg-black/30" />

                      {/* Play button */}
                      <button
                        onClick={() => {
                          if (heroVideo.youtubeId) setPlayingVideo(`hero-${heroVideo.id}`);
                        }}
                        className="absolute inset-0 flex items-center justify-center group/play"
                      >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                          heroVideo.youtubeId
                            ? "bg-white/10 border border-white/20 group-hover/play:bg-white/15 group-hover/play:scale-110 backdrop-blur-sm"
                            : "bg-white/5 border border-white/10"
                        }`}>
                          <Play className={`w-7 h-7 ml-0.5 ${heroVideo.youtubeId ? "text-white" : "text-white/30"}`} />
                        </div>
                      </button>

                      {/* Duration */}
                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                        <span className="text-[11px] font-mono text-white/60">{getVideoDuration(heroVideo)}</span>
                      </div>

                      {!heroVideo.youtubeId && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-white/[0.06]">
                          <span className="text-[10px] font-medium text-white/30">Próximamente</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Video title below player */}
                <div className="p-5 bg-white/[0.02]">
                  <h3 className="text-[15px] font-semibold text-white/85 leading-snug mb-1.5">
                    {getVideoTitle(heroVideo)}
                  </h3>
                  <p className="text-[12px] text-white/30 leading-relaxed">
                    {heroVideo.desc}
                  </p>
                </div>
              </div>

              {/* Playlist sidebar */}
              <div className="border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-white/[0.015] flex flex-col">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-white/60">
                      Playlist esencial
                    </span>
                    <span className="text-[11px] text-white/20">
                      {featuredVideos.length} videos
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {featuredVideos.map((video, idx) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        setActiveHeroVideo(idx);
                        setPlayingVideo(null);
                      }}
                      className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors border-b border-white/[0.04] last:border-b-0 ${
                        activeHeroVideo === idx
                          ? "bg-amber-500/[0.06]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      {/* Number */}
                      <span className={`shrink-0 text-[11px] font-mono mt-0.5 w-4 text-right ${
                        activeHeroVideo === idx ? "text-amber-400/70" : "text-white/20"
                      }`}>
                        {idx + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className={`text-[12px] font-medium leading-snug mb-0.5 transition-colors ${
                          activeHeroVideo === idx ? "text-white/90" : "text-white/55"
                        }`}>
                          {getVideoTitle(video)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/20">
                            {getVideoDuration(video)}
                          </span>
                          {!video.youtubeId && (
                            <span className="text-[9px] text-amber-400/40">
                              Pronto
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Active indicator */}
                      {activeHeroVideo === idx && (
                        <div className="shrink-0 w-1 h-8 rounded-full bg-amber-400/40 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ALL TUTORIALS ── */}
        <section className="pb-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8" />

            <div className="text-center mb-10">
              <p className="text-xs font-semibold text-violet-400/60 uppercase tracking-widest mb-4">
                Biblioteca completa
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Todos los tutoriales
              </h2>
              <p className="text-white/35 max-w-xl mx-auto text-[15px]">
                Filtra por categoría o busca el tema que necesitas.
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
                      ? "bg-amber-500/[0.12] border border-amber-500/25 text-amber-300"
                      : "bg-white/[0.02] border border-white/[0.06] text-white/35 hover:text-white/55 hover:border-white/[0.1]"
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                  <span className={`text-[10px] font-mono ${
                    activeCategory === cat.id ? "text-amber-400/50" : "text-white/15"
                  }`}>
                    {categoryCounts[cat.id] || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVideos.map((video) => {
                const isPlaying = playingVideo === `grid-${video.id}`;

                return (
                  <div
                    key={video.id}
                    className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden">
                      {isPlaying && video.youtubeId ? (
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                          title={getVideoTitle(video)}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <>
                          {video.youtubeId ? (
                            <img
                              src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                              alt={getVideoTitle(video)}
                              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-300"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-white/[0.01]" />
                          )}
                          <div className="absolute inset-0 bg-black/20" />

                          {/* Play */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (video.youtubeId) setPlayingVideo(`grid-${video.id}`);
                            }}
                            className="absolute inset-0 flex items-center justify-center group/btn"
                          >
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                              video.youtubeId
                                ? "bg-white/10 border border-white/15 group-hover/btn:bg-white/15 group-hover/btn:scale-110 backdrop-blur-sm"
                                : "bg-white/5 border border-white/8"
                            }`}>
                              <Play className={`w-4.5 h-4.5 ml-0.5 ${
                                video.youtubeId ? "text-white/80" : "text-white/20"
                              }`} />
                            </div>
                          </button>

                          {/* Duration */}
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70">
                            <span className="text-[10px] font-mono text-white/55">{getVideoDuration(video)}</span>
                          </div>

                          {/* Category */}
                          <div className="absolute top-2 left-2">
                            <span className="text-[9px] font-medium text-white/35 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm">
                              {videoCategories.find((c) => c.id === video.category)?.label}
                            </span>
                          </div>

                          {!video.youtubeId && (
                            <div className="absolute top-2 right-2">
                              <span className="text-[9px] text-amber-400/40 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm">
                                Pronto
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-[13px] font-semibold text-white/70 group-hover:text-white/90 leading-snug mb-1.5 transition-colors">
                        {getVideoTitle(video)}
                      </h3>
                      <p className="text-[11px] text-white/25 leading-relaxed line-clamp-2">
                        {video.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty */}
            {filteredVideos.length === 0 && (
              <div className="text-center py-16">
                <MonitorPlay className="w-10 h-10 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 text-sm">
                  No se encontraron tutoriales.
                </p>
                <button
                  onClick={() => { setSearchQuery(""); setActiveCategory("todos"); }}
                  className="mt-3 text-[12px] text-amber-400/70 hover:text-amber-300 transition-colors"
                >
                  Ver todos
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── QUICK LINKS ── */}
        <section className="pb-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: "Documentación", desc: "Guías detalladas", icon: FileText, href: "/docs", accent: "amber" },
                { title: "API Reference", desc: "Endpoints y ejemplos", icon: Code, href: "/api", accent: "violet" },
                { title: "Integraciones", desc: "Conecta herramientas", icon: Blocks, href: "/integraciones", accent: "cyan" },
                { title: "Soporte", desc: "Ayuda personal", icon: LifeBuoy, href: "/contacto", accent: "emerald" },
              ].map((r) => (
                <a
                  key={r.title}
                  href={r.href}
                  className="group flex items-center gap-3.5 px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300"
                >
                  <r.icon className={`w-4.5 h-4.5 shrink-0 text-${r.accent}-400/50`} />
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-white/65 group-hover:text-white/85 transition-colors">
                      {r.title}
                    </div>
                    <div className="text-[10px] text-white/20">{r.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pb-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] via-amber-500/[0.02] to-violet-500/[0.02]">
              {/* Glow accents */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-500/[0.03] rounded-full blur-3xl pointer-events-none" />

              <div className="relative px-8 py-12 sm:px-12 sm:py-14 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                {/* Left — Text */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/[0.08] border border-amber-500/[0.12] mb-5">
                    <Headphones className="w-3.5 h-3.5 text-amber-400/70" />
                    <span className="text-[11px] font-medium text-amber-300/80 tracking-wide uppercase">Soporte dedicado</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
                    ¿No encontraste lo que buscabas?
                  </h2>
                  <p className="text-white/35 text-sm leading-relaxed max-w-md mx-auto lg:mx-0">
                    Nuestro equipo de especialistas está disponible para resolver tus dudas y guiarte paso a paso en la configuración de tu plataforma.
                  </p>
                </div>

                {/* Right — Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  <a
                    href="https://app.withmia.com/dashboard?section=support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] hover:-translate-y-px"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contactar soporte
                  </a>
                  <a
                    href="/docs"
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] text-sm font-medium transition-all duration-300"
                  >
                    <BookOpen className="w-4 h-4" />
                    Ver documentación
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default HelpCenter;
