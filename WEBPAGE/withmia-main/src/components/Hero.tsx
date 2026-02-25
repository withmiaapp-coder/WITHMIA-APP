import { ArrowRight, CalendarCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";

const channels: { name: string; icon: string; size: number; margin?: number; marginLeft?: number; invert?: boolean }[] = [
  { name: "WhatsApp", icon: "/icons/whatsapp.webp", size: 24 },
  { name: "Instagram", icon: "/icons/instagram-new.webp", size: 24 },
  { name: "Facebook", icon: "/icons/facebook-new.webp", size: 28 },
  { name: "Gmail", icon: "/icons/gmail-new.webp", size: 40, margin: -8 },
  { name: "Web", icon: "/icons/web-new.webp", size: 24, invert: true },
  { name: "API", icon: "/icons/api-final.webp", size: 24, marginLeft: -4 },
];

/* ── Particle canvas ── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animId = 0;
    let running = true;
    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number; color: string };
    let particles: P[] = [];

    const colors = ["255,200,60","255,160,40","200,140,255","100,200,255","255,255,255"];

    function resize() {
      // Use clientWidth/Height which reflect CSS layout dimensions
      let w = canvas!.clientWidth;
      let h = canvas!.clientHeight;
      // Fallback: use viewport if CSS dimensions not yet computed
      if (w < 10 || h < 10) {
        w = window.innerWidth;
        h = window.innerHeight;
      }
      if (w < 10 || h < 10) return false;
      canvas!.width = w;
      canvas!.height = h;
      // Reinit particles for new size
      const count = Math.floor((w * h) / 6000);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.6 - 0.1,
          r: Math.random() * 2 + 0.5,
          o: Math.random() * 0.6 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      return true;
    }

    function draw() {
      if (!running) return;
      const W = canvas!.width;
      const H = canvas!.height;
      ctx!.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.o += (Math.random() - 0.5) * 0.02;
        p.o = Math.max(0.1, Math.min(0.8, p.o));
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.color},${p.o})`;
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.color},${p.o * 0.15})`;
        ctx!.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    function start() {
      if (!running || animId) return;
      if (resize()) {
        draw();
      }
    }

    // Try immediately
    start();
    // Retry after short delays in case layout isn't ready yet (Astro hydration)
    const t1 = setTimeout(start, 50);
    const t2 = setTimeout(start, 200);
    const t3 = setTimeout(start, 500);

    const onResize = () => { resize(); };
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
      aria-hidden="true"
    />
  );
}

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10 overflow-hidden">
      {/* Background image — full bleed */}
      <div className="absolute inset-0">
        <img
          src="/banner-withmia.webp"
          alt="WITHMIA plataforma omnicanal con IA"
          className="w-full h-full object-cover object-center"
          fetchpriority="high"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Bottom gradient fade into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Animated particles */}
      <ParticleCanvas />

      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
        {/* Tagline badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.07] backdrop-blur-md border border-white/[0.12] text-sm text-white/70 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          UNA EXTENSIÓN DE TU EQUIPO QUE IMPULSA TU NEGOCIO
        </div>

        {/* Main headline */}
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.08] tracking-tight text-white animate-fade-in drop-shadow-[0_2px_30px_rgba(0,0,0,0.5)]"
          style={{ animationDelay: "80ms" }}
        >
          LA FRAGMENTACIÓN
          <br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent drop-shadow-none" style={{ filter: "drop-shadow(0 2px 20px rgba(245,158,11,0.4))" }}>
            TERMINA AQUÍ
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-sm md:text-base text-white/70 max-w-lg mx-auto leading-relaxed animate-fade-in"
          style={{ animationDelay: "160ms" }}
        >
          Automatiza y deja que la IA responda, califique y haga seguimiento.{" "}
          <strong className="text-white">Más leads</strong>,{" "}
          <strong className="text-white">más conversión</strong>, y lo mejor, sin aumentar tus costos.
        </p>

        {/* CTAs — Vambe-style pill buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in"
          style={{ animationDelay: "240ms" }}
        >
          <a href="https://app.withmia.com" onClick={() => trackCTAClick('comenzar_ahora', 'hero', 'https://app.withmia.com')} className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold text-sm shadow-[0_4px_25px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_35px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-300">
              <ArrowRight className="w-4 h-4" />
              Comenzar ahora
          </a>
          <Link to="/contacto" onClick={() => trackCTAClick('agenda_demo', 'hero', '/contacto')} className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-transparent text-white font-semibold text-sm border border-white/25 hover:border-white/50 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all duration-300">
              <CalendarCheck className="w-4 h-4" />
              Agenda una demo
          </Link>
        </div>

        {/* Channel icons */}
        <div
          className="animate-fade-in pt-4"
          style={{ animationDelay: "400ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] text-white/60 font-bold mb-3">
            Disponible para
          </p>
          <div
            className="inline-flex items-center rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12]"
            style={{ gap: 15, padding: "10px 16px" }}
          >
            {channels.map((ch) => (
              <img
                key={ch.name}
                src={ch.icon}
                alt={ch.name}
                title={ch.name}
                style={{
                  width: ch.size,
                  height: ch.size,
                  margin: ch.margin ?? 0,
                  marginLeft: ch.marginLeft ?? undefined,
                  ...(ch.invert ? { filter: "brightness(0) invert(1)" } : {}),
                }}
                className="transition-all duration-300 hover:scale-110"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
