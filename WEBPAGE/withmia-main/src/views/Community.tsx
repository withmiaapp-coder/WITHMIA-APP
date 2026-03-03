import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import {
  ArrowRight,
  Users,
  Zap,
  Lightbulb,
  Headphones,
  BookOpen,
  Code,
  Trophy,
  Hash,
  Heart,
  Shield,
  Globe,
  Calendar,
  Award,
  ExternalLink,
  Sparkles,
  Clock,
  CheckCircle2,
  Target,
  Rocket,
  MessageCircle,
  Star,
  TrendingUp,
  Play,
  ChevronRight,
  Quote,
  Workflow,
  BarChart3,
  Send,
} from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/77c4GMuCu5";

/* ── Discord SVG ── */
const DiscordIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
  </svg>
);

/* ── Animated Reveal ── */
const Reveal = ({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setV(true), { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0) scale(1)" : "translateY(32px) scale(0.98)", transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  );
};


/* ── Floating Particles (Canvas) ── */
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    const colors = ["#5865F2", "#34d399", "#a78bfa", "#f59e0b", "#60a5fa"];

    const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2.5 + 0.5, alpha: Math.random() * 0.3 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();
      }
      // Draw connections
      ctx.globalAlpha = 0.03; ctx.strokeStyle = "#5865F2"; ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke(); }
        }
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.6 }} />;
};

/* ── Data ── */
const channels = [
  { icon: Hash, name: "general", desc: "El punto de encuentro principal. Anuncios oficiales, conversaciones abiertas y bienvenida a nuevos miembros.", color: "#34d399", gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent" },
  { icon: Lightbulb, name: "ideas-y-feedback", desc: "Propón nuevas funcionalidades, vota las ideas de otros y ayuda a definir el futuro del producto.", color: "#f59e0b", gradient: "from-amber-500/20 via-amber-500/5 to-transparent" },
  { icon: Headphones, name: "soporte", desc: "Resuelve dudas con ayuda directa del equipo de WITHMIA y usuarios experimentados de la comunidad.", color: "#60a5fa", gradient: "from-blue-500/20 via-blue-500/5 to-transparent" },
  { icon: Code, name: "desarrollo-api", desc: "Todo sobre integraciones, webhooks, endpoints, scripts y documentación técnica avanzada.", color: "#a78bfa", gradient: "from-violet-500/20 via-violet-500/5 to-transparent" },
  { icon: BookOpen, name: "tutoriales", desc: "Guías paso a paso, flujos de automatización, mejores prácticas y recursos compartidos.", color: "#2dd4bf", gradient: "from-teal-500/20 via-teal-500/5 to-transparent" },
  { icon: Trophy, name: "casos-de-éxito", desc: "Historias reales de empresas que transformaron su operación con WITHMIA. Inspira y comparte.", color: "#fb923c", gradient: "from-orange-500/20 via-orange-500/5 to-transparent" },
];

const benefits = [
  { icon: Zap, title: "Acceso anticipado", desc: "Prueba funcionalidades antes de su lanzamiento oficial y ayuda a moldear el futuro del producto.", color: "#f59e0b" },
  { icon: Users, title: "Networking LATAM", desc: "Conecta con empresarios y equipos de toda la región que comparten tus desafíos de crecimiento.", color: "#3b82f6" },
  { icon: Target, title: "Influye en el producto", desc: "Tu feedback impacta directamente el roadmap. Las funciones más votadas se desarrollan primero.", color: "#8b5cf6" },
  { icon: Headphones, title: "Soporte prioritario", desc: "Respuestas directas del equipo de ingeniería y usuarios experimentados de la comunidad.", color: "#10b981" },
  { icon: BookOpen, title: "Aprende en comunidad", desc: "Tutoriales exclusivos, webinars semanales y sesiones de Q&A en vivo con expertos.", color: "#ec4899" },
  { icon: Award, title: "Reconocimiento", desc: "Roles especiales, acceso beta exclusivo y swag para los miembros más activos.", color: "#06b6d4" },
];

const rules = [
  { icon: Heart, title: "Sé respetuoso", desc: "Cero tolerancia al acoso, discriminación o lenguaje ofensivo. Cuidamos que todos se sientan bienvenidos.", color: "#f43f5e" },
  { icon: Shield, title: "No spam", desc: "Evita la autopromoción excesiva y enlaces no solicitados. Valor antes que volumen.", color: "#8b5cf6" },
  { icon: Hash, title: "Canal correcto", desc: "Publica en el canal apropiado para mantener el orden y facilitar la búsqueda de información.", color: "#3b82f6" },
  { icon: Users, title: "Ayuda a otros", desc: "Si puedes resolver una duda, hazlo. El crecimiento colectivo es nuestro principio fundamental.", color: "#10b981" },
  { icon: Globe, title: "Español primero", desc: "Idioma principal español para mantener la cercanía. Inglés también es bienvenido.", color: "#f59e0b" },
];

/* ══════════════════════════════════════
   COMMUNITY PAGE — REDESIGNED
   ══════════════════════════════════════ */
const Community = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full bg-[#5865F2]/[0.04] blur-[200px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.03] blur-[180px] animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-violet-500/[0.025] blur-[160px] animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute top-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-amber-500/[0.02] blur-[120px] animate-pulse" style={{ animationDuration: "15s" }} />
      </div>

      <div className="pt-10 relative z-[1]">

        {/* ════════════════════════════════════
            HERO — IMMERSIVE
            ════════════════════════════════════ */}
        <section className="relative overflow-hidden min-h-[80vh] flex items-center" onMouseMove={handleMouseMove}>
          {/* Particle field */}
          <div className="absolute inset-0 z-0">
            <ParticleField />
          </div>

          {/* Grid overlay */}
          <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          {/* Animated gradient orbs that follow mouse slightly */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute w-[600px] h-[600px] rounded-full blur-[200px] transition-all duration-[3000ms]"
              style={{ background: "radial-gradient(circle, rgba(88,101,242,0.15), transparent 70%)", left: `${20 + mousePos.x * 10}%`, top: `${10 + mousePos.y * 10}%` }} />
            <div className="absolute w-[400px] h-[400px] rounded-full blur-[150px] transition-all duration-[3000ms]"
              style={{ background: "radial-gradient(circle, rgba(52,211,153,0.1), transparent 70%)", right: `${15 + (1 - mousePos.x) * 8}%`, bottom: `${20 + (1 - mousePos.y) * 8}%` }} />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 pt-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left — Text */}
              <Reveal>
                <div>
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#5865F2]/15 to-emerald-500/10 border border-[#5865F2]/20 backdrop-blur-md mb-8 group hover:border-[#5865F2]/30 transition-all duration-300">
                    <DiscordIcon className="w-4 h-4 text-[#8B9DFF]" />
                    <span className="text-xs font-bold text-[#8B9DFF] tracking-wider uppercase">
                      Comunidad Oficial
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4rem] font-extrabold text-white leading-[1.05] mb-6 tracking-tight">
                    Donde el futuro
                    <br />
                    de la <span className="text-gradient">atención</span>
                    <br />
                    <span className="text-gradient">al cliente</span>
                    <br />
                    se construye
                  </h1>

                  <p className="text-lg text-white/45 max-w-lg leading-relaxed mb-10">
                    +2,500 empresas y profesionales de LATAM conectados.
                    Experiencias, ideas y soluciones — un click para unirte.
                  </p>

                  {/* CTA buttons */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
                    <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                      className="group relative inline-flex items-center gap-3 px-8 py-4.5 rounded-2xl font-bold text-white transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #5865F2 0%, #4752C4 50%, #5865F2 100%)", backgroundSize: "200% 200%", boxShadow: "0 8px 60px rgba(88,101,242,0.35), 0 2px 20px rgba(88,101,242,0.2)" }}>
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                      <DiscordIcon className="relative w-5 h-5" />
                      <span className="relative text-[15px]">Unirse al Discord</span>
                      <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </a>
                  </div>
                </div>
              </Reveal>

              {/* Right — Visual showcase (Discord-like mockup) */}
              <Reveal delay={200}>
                <div className="relative">
                  {/* Glow behind */}
                  <div className="absolute -inset-8 bg-gradient-to-br from-[#5865F2]/10 via-transparent to-emerald-500/10 rounded-[2rem] blur-3xl" />

                  {/* Main card */}
                  <div className="relative rounded-2xl border border-white/[0.08] bg-[#111827]/80 backdrop-blur-xl overflow-hidden shadow-2xl"
                    style={{ boxShadow: "0 25px 100px rgba(0,0,0,0.5), 0 0 40px rgba(88,101,242,0.1)" }}>

                    {/* Header bar */}
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-[#0f1521] border-b border-white/[0.06]">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/60" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                        <div className="w-3 h-3 rounded-full bg-green-500/60" />
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5865F2, #34d399)" }}>
                          <span className="text-white font-bold text-[9px]">W</span>
                        </div>
                        <span className="text-[13px] font-semibold text-white/60">WITHMIA Community</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#5865F2]" />
                      </div>
                    </div>

                    {/* Chat messages mockup */}
                    <div className="p-5 space-y-4 min-h-[320px]">
                      {/* Message 1 */}
                      <div className="flex gap-3 animate-fadeInUp" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80" className="w-9 h-9 rounded-full shrink-0" alt="" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-emerald-400">Carolina M.</span>
                            <span className="text-[10px] text-white/20">Hoy 14:32</span>
                          </div>
                          <div className="bg-white/[0.04] rounded-xl rounded-tl-sm px-4 py-2.5 max-w-[320px]">
                            <p className="text-[12px] text-white/50 leading-relaxed">¡Increíble! Con el nuevo workflow de IA redujimos nuestro tiempo de respuesta un 70% 🚀</p>
                          </div>
                          <div className="flex gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#5865F2]/10 text-[10px] text-[#8B9DFF]">🔥 12</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-[10px] text-emerald-400">🎉 8</span>
                          </div>
                        </div>
                      </div>

                      {/* Message 2 */}
                      <div className="flex gap-3 animate-fadeInUp" style={{ animationDelay: "1s", animationFillMode: "both" }}>
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80" className="w-9 h-9 rounded-full shrink-0" alt="" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-blue-400">Martín R.</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#8B9DFF] font-semibold">TEAM</span>
                            <span className="text-[10px] text-white/20">Hoy 14:35</span>
                          </div>
                          <div className="bg-white/[0.04] rounded-xl rounded-tl-sm px-4 py-2.5 max-w-[320px]">
                            <p className="text-[12px] text-white/50 leading-relaxed">@Carolina Genial resultado! Compartí un tutorial en <span className="text-[#8B9DFF]">#tutoriales</span> con el paso a paso 📝</p>
                          </div>
                        </div>
                      </div>

                      {/* Message 3 */}
                      <div className="flex gap-3 animate-fadeInUp" style={{ animationDelay: "1.5s", animationFillMode: "both" }}>
                        <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80" className="w-9 h-9 rounded-full shrink-0" alt="" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-violet-400">Valentina T.</span>
                            <span className="text-[10px] text-white/20">Hoy 14:38</span>
                          </div>
                          <div className="bg-white/[0.04] rounded-xl rounded-tl-sm px-4 py-2.5 max-w-[320px]">
                            <p className="text-[12px] text-white/50 leading-relaxed">¿Alguien viene al Workshop de IA del jueves? ¡Va a estar buenísimo! 🤖✨</p>
                          </div>
                          <div className="flex gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-[10px] text-violet-400">✋ 24</span>
                          </div>
                        </div>
                      </div>

                      {/* Typing indicator */}
                      <div className="flex items-center gap-2 animate-fadeInUp" style={{ animationDelay: "2s", animationFillMode: "both" }}>
                        <div className="flex gap-1 px-3 py-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-[10px] text-white/15">3 personas escribiendo...</span>
                      </div>
                    </div>

                    {/* Input bar */}
                    <div className="px-5 pb-5">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <span className="text-[12px] text-white/20 flex-1">Escribe un mensaje...</span>
                        <Send className="w-4 h-4 text-[#5865F2]/50" />
                      </div>
                    </div>
                  </div>

                  {/* Floating badges */}
                  <div className="absolute -top-4 -right-4 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md flex items-center gap-2 animate-float">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
                    <span className="text-[11px] font-semibold text-emerald-400">127 online</span>
                  </div>
                  <div className="absolute -bottom-3 -left-3 px-3 py-2 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 backdrop-blur-md flex items-center gap-2 animate-float" style={{ animationDelay: "1s" }}>
                    <MessageCircle className="w-3.5 h-3.5 text-[#8B9DFF]" />
                    <span className="text-[11px] font-semibold text-[#8B9DFF]">45 mensajes/hora</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════
            HOW TO JOIN — STEPS
            ════════════════════════════════════ */}
        <section className="py-10 relative overflow-hidden">
          {/* Background elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full opacity-[0.035]"
              style={{ background: "radial-gradient(ellipse, #5865F2, transparent 65%)" }} />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6">
            {/* Header */}
            <Reveal>
              <div className="text-center mb-20">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">
                  Empieza en <span className="text-gradient">segundos</span>
                </h2>
                <p className="text-[15px] text-white/30 max-w-md mx-auto leading-relaxed">
                  Sin registro, sin formularios. Solo haz click y estás dentro.
                </p>
              </div>
            </Reveal>

            {/* Steps - horizontal layout */}
            <div className="relative">
              {/* Connection line (desktop) */}
              <div className="hidden lg:block absolute top-[60px] left-[calc(16.66%+20px)] right-[calc(16.66%+20px)] h-[1px]">
                <div className="w-full h-full bg-gradient-to-r from-[#5865F2]/40 via-emerald-400/40 to-amber-400/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2]/15 via-emerald-400/15 to-amber-400/15 blur-[3px]" />
              </div>

              <div className="grid lg:grid-cols-3 gap-10 lg:gap-6">
                {[
                  {
                    num: "1",
                    title: "Accede al servidor",
                    desc: "Haz click en el botón de abajo. Te llevará directamente a nuestra comunidad en Discord.",
                    icon: DiscordIcon,
                    color: "#5865F2",
                    accent: "from-[#5865F2]",
                  },
                  {
                    num: "2",
                    title: "Configura tu espacio",
                    desc: "Selecciona los canales y roles que te interesan para una experiencia personalizada.",
                    icon: Hash,
                    color: "#34d399",
                    accent: "from-emerald-400",
                  },
                  {
                    num: "3",
                    title: "Conecta y colabora",
                    desc: "Preséntate, comparte tu experiencia y empieza a colaborar con la comunidad.",
                    icon: MessageCircle,
                    color: "#f59e0b",
                    accent: "from-amber-400",
                  },
                ].map((s, i) => (
                  <Reveal key={i} delay={i * 150}>
                    <div className="group relative flex flex-col items-center">
                      {/* Number circle */}
                      <div className="relative mb-8">
                        <div className="w-[120px] h-[120px] rounded-[2rem] flex items-center justify-center transition-all duration-500 group-hover:scale-[1.05]"
                          style={{
                            background: `linear-gradient(145deg, ${s.color}12, ${s.color}04)`,
                            border: `1.5px solid ${s.color}18`,
                            boxShadow: `0 12px 40px ${s.color}08`,
                          }}>
                          {/* Glow ring on hover */}
                          <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                            style={{ boxShadow: `0 0 40px ${s.color}12, inset 0 0 25px ${s.color}08` }} />
                          <div className="relative">
                            {s.icon === DiscordIcon
                              ? <DiscordIcon className="w-11 h-11 transition-transform duration-500 group-hover:scale-110" />
                              : <s.icon className="w-11 h-11 transition-transform duration-500 group-hover:scale-110" style={{ color: s.color }} />
                            }
                          </div>
                        </div>
                        {/* Step number badge */}
                        <div className="absolute -top-3 -right-3 w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-black shadow-xl"
                          style={{
                            background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
                            color: s.color === "#f59e0b" ? "#000" : "#fff",
                            boxShadow: `0 6px 20px ${s.color}50`,
                          }}>
                          {s.num}
                        </div>
                      </div>

                      {/* Card */}
                      <div className="w-full text-center px-2">
                        <h3 className="text-[18px] font-bold text-white/85 mb-3 group-hover:text-white transition-colors duration-300">{s.title}</h3>
                        <p className="text-[13px] text-white/30 leading-[1.7] group-hover:text-white/40 transition-colors duration-300 max-w-[280px] mx-auto">{s.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Reveal delay={500}>
              <div className="mt-16 flex flex-col items-center gap-5">
                <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-3 px-10 py-4.5 rounded-2xl bg-[#5865F2] text-white font-bold text-[15px] hover:bg-[#4752C4] transition-all duration-300 hover:-translate-y-1"
                  style={{ boxShadow: "0 10px 40px rgba(88,101,242,0.3), 0 2px 8px rgba(88,101,242,0.2)" }}>
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>
                  <DiscordIcon className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Unirse a la comunidad</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
                <span className="text-[12px] text-white/20 font-medium">Gratis para siempre · Acceso inmediato</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════════════════════════════════
            INSIDE THE SERVER — PREMIUM EDITORIAL
            ════════════════════════════════════ */}
        <section id="canales" className="py-16 relative">

          <div className="relative z-10 max-w-[1100px] mx-auto px-6">

            {/* ── Section header — editorial style ── */}
            <Reveal>
              <div className="max-w-2xl mb-20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-gradient-to-r from-[#5865F2] to-transparent" />
                  <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/30">Dentro del servidor</span>
                </div>
                <h2 className="text-[2.5rem] sm:text-[3.25rem] font-extrabold text-white tracking-[-0.02em] leading-[1.08] mb-5">
                  Organizado para que<br />
                  <span className="text-gradient">encuentres valor rápido</span>
                </h2>
                <p className="text-[15px] text-white/30 leading-[1.8] max-w-lg">
                  Canales temáticos, recursos exclusivos y una comunidad activa — todo en un solo lugar, sin ruido.
                </p>
              </div>
            </Reveal>

            {/* ── Channels — Minimal list with large hover states ── */}
            <div className="mb-28">
              <div className="space-y-0">
                {channels.map((ch, i) => (
                  <Reveal key={ch.name} delay={i * 50}>
                    <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                      className="group relative flex items-center gap-5 sm:gap-8 py-6 sm:py-7 cursor-pointer transition-all duration-500"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.035)" }}
                      onMouseEnter={(e) => {
                        const line = e.currentTarget.querySelector<HTMLElement>("[data-accent-line]");
                        if (line) { line.style.transform = "scaleX(1)"; line.style.background = ch.color; }
                      }}
                      onMouseLeave={(e) => {
                        const line = e.currentTarget.querySelector<HTMLElement>("[data-accent-line]");
                        if (line) { line.style.transform = "scaleX(0)"; }
                      }}>

                      {/* Accent line at bottom */}
                      <div data-accent-line className="absolute bottom-0 left-0 right-0 h-px transition-transform duration-700 origin-left scale-x-0" />

                      {/* Channel icon */}
                      <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                        style={{
                          background: `${ch.color}08`,
                          border: `1px solid ${ch.color}10`,
                        }}>
                        <ch.icon className="w-[18px] h-[18px] transition-colors duration-500" style={{ color: `${ch.color}90` }} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[15px] sm:text-[17px] font-bold text-white/50 group-hover:text-white transition-colors duration-500 tracking-tight">
                          <span className="text-white/15 font-normal mr-1 text-[14px]">#</span>
                          {ch.name}
                        </h4>
                        <p className="text-[12.5px] sm:text-[13px] text-white/15 group-hover:text-white/35 transition-colors duration-500 leading-[1.6] mt-1 line-clamp-1 sm:line-clamp-none">
                          {ch.desc}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-2 group-hover:translate-x-0"
                        style={{ background: `${ch.color}12` }}>
                        <ArrowRight className="w-3.5 h-3.5" style={{ color: ch.color }} />
                      </div>
                    </a>
                  </Reveal>
                ))}
              </div>

              {/* See all link */}
              <Reveal delay={350}>
                <div className="mt-6 flex justify-end">
                  <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 text-[12px] font-medium text-white/20 hover:text-white/50 transition-colors duration-300">
                    <span>Y más canales dentro del servidor</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </Reveal>
            </div>

            {/* ── Benefits — Two-tier editorial layout ── */}
            <Reveal>
              <div className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-gradient-to-r from-emerald-400/50 to-transparent" />
                  <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/30">Qué obtienes al unirte</span>
                </div>
                <h3 className="text-[2rem] sm:text-[2.5rem] font-extrabold text-white tracking-[-0.02em] leading-[1.1]">
                  Beneficios <span className="text-gradient-purple">reales</span>
                </h3>
              </div>
            </Reveal>

            {/* Top row — 2 featured benefits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {benefits.slice(0, 2).map((b, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="group relative rounded-2xl overflow-hidden h-full cursor-default"
                    style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.05)" }}>

                    {/* Top gradient line */}
                    <div className="absolute top-0 inset-x-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{ background: `linear-gradient(90deg, transparent, ${b.color}60, transparent)` }} />

                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ background: `radial-gradient(500px ellipse at 50% 0%, ${b.color}06, transparent 70%)` }} />

                    <div className="relative p-8 sm:p-10">
                      {/* Number tag */}
                      <span className="text-[11px] font-mono font-bold tracking-wider mb-6 block transition-colors duration-500"
                        style={{ color: `${b.color}50` }}>
                        0{i + 1}
                      </span>

                      <h3 className="text-[20px] sm:text-[22px] font-extrabold text-white/85 group-hover:text-white mb-3 transition-colors duration-500 tracking-tight leading-tight">
                        {b.title}
                      </h3>
                      <p className="text-[14px] text-white/22 group-hover:text-white/42 leading-[1.8] transition-colors duration-500 max-w-sm">
                        {b.desc}
                      </p>

                      {/* Icon floated right */}
                      <div className="absolute top-8 right-8 sm:top-10 sm:right-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-3"
                        style={{
                          background: `${b.color}08`,
                          border: `1px solid ${b.color}12`,
                        }}>
                        <b.icon className="w-5 h-5" style={{ color: `${b.color}` }} />
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Bottom row — 4 compact benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {benefits.slice(2).map((b, i) => (
                <Reveal key={i} delay={(i + 2) * 80}>
                  <div className="group relative rounded-2xl overflow-hidden h-full cursor-default"
                    style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.05)" }}>

                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ background: `radial-gradient(200px circle at 50% 0%, ${b.color}08, transparent 70%)` }} />

                    <div className="relative p-6 sm:p-7">
                      <span className="text-[10px] font-mono font-bold tracking-wider mb-5 block transition-colors duration-500"
                        style={{ color: `${b.color}40` }}>
                        0{i + 3}
                      </span>

                      <h3 className="text-[15px] font-bold text-white/75 group-hover:text-white mb-2.5 transition-colors duration-500 tracking-tight">
                        {b.title}
                      </h3>
                      <p className="text-[12.5px] text-white/18 group-hover:text-white/38 leading-[1.75] transition-colors duration-500">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* ── Unified CTA ── */}
            <Reveal delay={500}>
              <div className="mt-20 text-center">
                <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-3.5 px-10 py-[15px] rounded-full text-white font-semibold text-[14px] transition-all duration-500 hover:-translate-y-0.5 overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #5865F2, #4752C4)",
                    boxShadow: "0 4px 30px rgba(88,101,242,0.2)",
                  }}>
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.12] to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1.2s]" />
                  <DiscordIcon className="relative w-[18px] h-[18px] text-white/90" />
                  <span className="relative">Unirse a la comunidad</span>
                  <ArrowRight className="relative w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                </a>
                <p className="mt-5 text-[12px] text-white/18 font-medium tracking-wide">
                  Gratis para siempre · Sin tarjeta · Acceso inmediato
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════════════════════════════════
            FINAL CTA — PREMIUM
            ════════════════════════════════════ */}
        <section className="py-10">
          <div className="max-w-4xl mx-auto px-6">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08]"
                style={{ background: "linear-gradient(135deg, rgba(88,101,242,0.08) 0%, rgba(52,211,153,0.04) 50%, rgba(167,139,250,0.06) 100%)" }}>
                {/* Background effects */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[600px] h-[400px] bg-[#5865F2]/[0.1] rounded-full blur-[120px]" />
                  <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-emerald-500/[0.06] rounded-full blur-[100px]" />
                  {/* Grid */}
                  <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                </div>

                <div className="relative text-center p-12 sm:p-20">
                  {/* Discord icon */}
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-10 shadow-2xl"
                    style={{ background: "linear-gradient(135deg, #5865F2, #7289DA)", boxShadow: "0 8px 60px rgba(88,101,242,0.35)" }}>
                    <DiscordIcon className="w-10 h-10 text-white" />
                  </div>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-tight">
                    ¿Listo para ser <span className="text-gradient">parte</span>?
                  </h2>
                  <p className="text-[17px] text-white/40 max-w-lg mx-auto mb-12 leading-relaxed">
                    Únete gratis al servidor de Discord y empieza a conectar con la comunidad que está transformando la atención al cliente en LATAM.
                  </p>

                  <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white font-bold text-[16px] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #5865F2, #4752C4)", boxShadow: "0 8px 60px rgba(88,101,242,0.35), 0 2px 20px rgba(88,101,242,0.2)" }}>
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    <DiscordIcon className="relative w-5 h-5" />
                    <span className="relative">Unirse ahora — Es gratis</span>
                    <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </a>

                  <div className="flex flex-wrap items-center justify-center gap-8 mt-10">
                    {[
                      { icon: CheckCircle2, text: "100% gratuito" },
                      { icon: Zap, text: "Acceso instantáneo" },
                      { icon: Shield, text: "Espacio moderado" },
                      { icon: Users, text: "+2,500 miembros" },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <t.icon className="w-4 h-4 text-emerald-400/50" />
                        <span className="text-[13px] text-white/30 font-medium">{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

      </div>

      {/* ── Custom animations ── */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Community;
