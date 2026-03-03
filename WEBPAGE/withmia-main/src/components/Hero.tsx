import { useRef, useEffect } from "react";
import { ArrowRight, CalendarCheck } from "lucide-react";
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

const COLORS = ['255,200,60', '255,160,40', '200,140,255', '100,200,255', '255,255,255'];

export const Hero = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log('[WITHMIA Particles] useEffect fired');

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[WITHMIA Particles] Canvas ref is null!');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[WITHMIA Particles] Could not get 2d context!');
      return;
    }

    console.log('[WITHMIA Particles] Canvas and context OK');

    interface P { x: number; y: number; vx: number; vy: number; r: number; o: number; c: string; }
    let particles: P[] = [];
    let animId = 0;

    function resize() {
      // Use the canvas parent (the section) for dimensions
      const parent = canvas!.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : null;
      const w = rect ? Math.round(rect.width) : window.innerWidth;
      let h = rect ? Math.round(rect.height) : window.innerHeight;
      if (h < 100) h = window.innerHeight;

      // Set canvas resolution to match display size
      canvas!.width = w;
      canvas!.height = h;

      console.log(`[WITHMIA Particles] resize: ${w}x${h}, creating ${Math.floor((w * h) / 6000)} particles`);

      const count = Math.floor((w * h) / 8000);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.6 - 0.1,
          r: Math.random() * 2 + 0.5,
          o: Math.random() * 0.5 + 0.15,
          c: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    }

    function draw() {
      const W = canvas!.width;
      const H = canvas!.height;
      ctx!.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.o += (Math.random() - 0.5) * 0.02;
        if (p.o < 0.1) p.o = 0.1;
        if (p.o > 0.65) p.o = 0.65;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;

        // Glow halo (drawn first, behind dot)
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.c},${p.o * 0.12})`;
        ctx!.fill();

        // Particle dot
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.c},${p.o})`;
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    function start() {
      cancelAnimationFrame(animId);
      resize();
      if (particles.length > 0) {
        console.log('[WITHMIA Particles] Animation started with', particles.length, 'particles');
        animId = requestAnimationFrame(draw);
      }
    }

    // Use multiple delays as fallback — the first successful one wins
    const t1 = setTimeout(start, 200);
    const t2 = setTimeout(() => {
      // If canvas is still tiny, force a restart
      if (canvas!.width < 100 || canvas!.height < 100) {
        console.log('[WITHMIA Particles] Fallback resize triggered');
        start();
      }
    }, 1000);

    window.addEventListener('resize', start);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', start);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10 overflow-hidden">
      {/* Background image — full bleed */}
      <div className="absolute inset-0">
        <img
          src="/banner-withmia.webp"
          alt="WITHMIA plataforma omnicanal con IA"
          className="w-full h-full object-cover object-center"
          width={1920}
          height={1080}
          fetchpriority="high"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Bottom gradient fade into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Particle canvas — pure inline styles for maximum reliability */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
          display: 'block',
        }}
      />

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
          <Link to="/contacto" onClick={() => trackCTAClick('contactar_ventas', 'hero', '/contacto')} className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-transparent text-white font-semibold text-sm border border-white/25 hover:border-white/50 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all duration-300">
              <CalendarCheck className="w-4 h-4" />
              Contactar ventas
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
