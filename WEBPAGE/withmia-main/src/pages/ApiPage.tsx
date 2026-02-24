import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState, useRef, type ReactNode } from "react";
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
  MessageSquare,
  Users,
  BarChart3,
  FileText,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Server,
  Cpu,
} from "lucide-react";

/* ─── Scroll‑reveal wrapper ─── */
const Reveal = ({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/* ─── Animated counter ─── */
const useCountUp = (end: number, duration = 1800) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            setVal(Math.round(end * p));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration]);
  return { val, ref };
};

/* ─── Data ─── */
const CURL_TEXT = `curl -X POST https://api.withmia.com/v1/messages \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "whatsapp",
    "to": "+56912345678",
    "text": "Tu cita fue confirmada ✅"
  }'`;

const endpoints = [
  { method: "POST", path: "/v1/messages", desc: "Enviar un mensaje a cualquier canal", methodColor: "bg-amber-400/[0.1] text-amber-400 border-amber-400/20" },
  { method: "GET", path: "/v1/conversations", desc: "Listar conversaciones con filtros y paginación", methodColor: "bg-emerald-400/[0.1] text-emerald-400 border-emerald-400/20" },
  { method: "GET", path: "/v1/contacts", desc: "Obtener contactos y sus datos de perfil", methodColor: "bg-emerald-400/[0.1] text-emerald-400 border-emerald-400/20" },
  { method: "POST", path: "/v1/webhooks", desc: "Registrar webhooks para eventos en tiempo real", methodColor: "bg-amber-400/[0.1] text-amber-400 border-amber-400/20" },
  { method: "PUT", path: "/v1/contacts/:id", desc: "Actualizar información de un contacto", methodColor: "bg-blue-400/[0.1] text-blue-400 border-blue-400/20" },
  { method: "DELETE", path: "/v1/webhooks/:id", desc: "Eliminar un webhook registrado", methodColor: "bg-red-400/[0.1] text-red-400 border-red-400/20" },
  { method: "GET", path: "/v1/channels", desc: "Listar canales conectados y su estado", methodColor: "bg-emerald-400/[0.1] text-emerald-400 border-emerald-400/20" },
  { method: "POST", path: "/v1/templates", desc: "Crear plantillas de mensajes HSM", methodColor: "bg-amber-400/[0.1] text-amber-400 border-amber-400/20" },
];

const features = [
  { icon: Zap, title: "REST API completa", desc: "CRUD completo para mensajes, conversaciones, contactos, canales y webhooks. Diseñada para ser predecible e intuitiva.", color: "#f59e0b" },
  { icon: Webhook, title: "Webhooks en tiempo real", desc: "Recibe eventos instantáneamente: nuevos mensajes, cambios de estado, asignaciones y más. Bidireccional y configurable.", color: "#22d3ee" },
  { icon: Key, title: "OAuth 2.0", desc: "Autenticación enterprise-grade con tokens de acceso, refresh tokens y scopes granulares por recurso.", color: "#34d399" },
  { icon: Layers, title: "SDKs oficiales", desc: "Librerías para Node.js, Python y PHP con tipado completo, retries automáticos y manejo de errores.", color: "#a78bfa" },
  { icon: Shield, title: "Rate limiting inteligente", desc: "1,000 requests/min por defecto con headers informativos. Planes enterprise con límites personalizados.", color: "#f43f5e" },
  { icon: Lock, title: "Seguridad TLS 1.3", desc: "Todas las comunicaciones cifradas de extremo a extremo. Firma de webhooks con HMAC-SHA256.", color: "#6366f1" },
];

const sdks = [
  {
    lang: "Node.js",
    install: "npm install @withmia/sdk",
    code: `import { Withmia } from '@withmia/sdk';

const client = new Withmia('sk_live_...');

const message = await client.messages.send({
  channel: 'whatsapp',
  to: '+56912345678',
  text: 'Hola desde WITHMIA SDK 🚀'
});`,
    color: "#68a063",
    icon: "⬢",
  },
  {
    lang: "Python",
    install: "pip install withmia",
    code: `from withmia import Withmia

client = Withmia('sk_live_...')

message = client.messages.send(
    channel='whatsapp',
    to='+56912345678',
    text='Hola desde WITHMIA SDK 🚀'
)`,
    color: "#3776ab",
    icon: "🐍",
  },
  {
    lang: "cURL",
    install: "",
    code: CURL_TEXT,
    color: "#f59e0b",
    icon: ">_",
  },
];

const pipelineSteps = [
  { icon: Key, label: "Autenticar", desc: "Bearer token", color: "#f59e0b" },
  { icon: Terminal, label: "Request", desc: "POST /v1/messages", color: "#22d3ee" },
  { icon: Server, label: "Procesar", desc: "<200ms latencia", color: "#a78bfa" },
  { icon: CheckCircle2, label: "Respuesta", desc: "200 OK JSON", color: "#34d399" },
];

const webhookEvents = [
  { event: "message.received", desc: "Nuevo mensaje entrante en cualquier canal", color: "#3b82f6" },
  { event: "message.delivered", desc: "Mensaje entregado exitosamente al destinatario", color: "#34d399" },
  { event: "message.failed", desc: "Error en el envío del mensaje", color: "#f43f5e" },
  { event: "conversation.created", desc: "Nueva conversación iniciada por un contacto", color: "#a78bfa" },
  { event: "conversation.assigned", desc: "Conversación asignada a un agente o equipo", color: "#f59e0b" },
  { event: "contact.updated", desc: "Datos del contacto actualizados", color: "#22d3ee" },
  { event: "channel.status", desc: "Cambio de estado en un canal conectado", color: "#6366f1" },
  { event: "bot.handoff", desc: "Bot transfiere conversación a agente humano", color: "#ec4899" },
];

const WEBHOOK_PAYLOAD = `{
  "event": "message.received",
  "timestamp": "2026-02-24T14:32:01Z",
  "data": {
    "id": "msg_8xK2p4q...",
    "channel": "whatsapp",
    "from": "+56912345678",
    "text": "Hola, necesito agendar",
    "conversation_id": "conv_3fR9..."
  },
  "signature": "sha256=a1b2c3d4..."
}`;

/* ─── Component ─── */
const ApiPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [copied, setCopied] = useState(false);
  const [activeSDK, setActiveSDK] = useState(0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const latency = useCountUp(200, 1600);
  const uptime = useCountUp(99, 1600);
  const rateLimit = useCountUp(1000, 2000);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20">

        {/* ══════════════════════════════════════════════════
            HERO — Aurora mesh + 2-column (copy + terminal)
            ══════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Aurora mesh */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-[-20%] left-[15%] w-[700px] h-[700px] rounded-full bg-amber-500/[0.04] blur-[140px] animate-pulse" style={{ animationDuration: "6s" }} />
            <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-violet-500/[0.035] blur-[130px] animate-pulse" style={{ animationDuration: "8s" }} />
            <div className="absolute top-[30%] right-[30%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.025] blur-[100px] animate-pulse" style={{ animationDuration: "7s" }} />
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-20">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left — Copy */}
              <Reveal>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-950/30 mb-8">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-300/80 tracking-wide">REST API v1.0</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] mb-6">
                  API que los
                  <br />
                  developers{" "}
                  <span className="relative">
                    <span className="text-gradient">aman usar</span>
                    <span className="absolute -bottom-1 left-0 w-full h-[3px] rounded-full bg-gradient-to-r from-amber-400/60 to-orange-500/0" />
                  </span>
                </h1>

                <p className="text-lg text-white/45 max-w-lg leading-relaxed mb-10">
                  RESTful, predecible y completamente documentada. Integra WITHMIA
                  en tu stack en minutos con SDKs oficiales, webhooks en tiempo real
                  y sandbox de pruebas.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-4 mb-12">
                  <a
                    href="/docs"
                    className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_50px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <span className="relative flex items-center gap-2">
                      Ver documentación
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </a>
                  <a
                    href="https://app.withmia.com"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300 hover:bg-white/[0.03]"
                  >
                    <Key className="w-4 h-4" />
                    Obtener API Key
                  </a>
                </div>

                {/* Animated counters */}
                <div className="flex gap-8">
                  <div>
                    <p className="text-2xl font-bold text-white">&lt;<span ref={latency.ref}>{latency.val}</span>ms</p>
                    <p className="text-[11px] text-white/25 uppercase tracking-wider mt-1">Latencia p95</p>
                  </div>
                  <div className="w-px bg-white/[0.06]" />
                  <div>
                    <p className="text-2xl font-bold text-white"><span ref={uptime.ref}>{uptime.val}</span>.9%</p>
                    <p className="text-[11px] text-white/25 uppercase tracking-wider mt-1">Uptime SLA</p>
                  </div>
                  <div className="w-px bg-white/[0.06]" />
                  <div>
                    <p className="text-2xl font-bold text-white"><span ref={rateLimit.ref}>{rateLimit.val}</span>/min</p>
                    <p className="text-[11px] text-white/25 uppercase tracking-wider mt-1">Rate limit</p>
                  </div>
                </div>
              </Reveal>

              {/* Right — Terminal preview */}
              <Reveal delay={200}>
                <div className="relative">
                  {/* Glow behind terminal */}
                  <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-violet-500/[0.04] rounded-3xl blur-xl" />

                  <div className="relative rounded-2xl border border-white/[0.08] overflow-hidden backdrop-blur-sm bg-white/[0.02]">
                    {/* Chrome bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-[6px]">
                          <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]/80" />
                          <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]/80" />
                          <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]/80" />
                        </div>
                        <div className="h-4 w-px bg-white/[0.06]" />
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                          <div className="w-2 h-2 rounded-full bg-emerald-400/70 animate-pulse" />
                          <span className="text-[11px] font-mono text-white/40">api.withmia.com</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(CURL_TEXT)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-white/30 hover:text-white/60"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-mono text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono">Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Code */}
                    <div className="p-5 md:p-6">
                      <pre className="text-[11px] md:text-[12px] text-white/55 leading-[1.85] font-mono overflow-x-auto">
                        <code>
                          <span className="text-emerald-400/90">curl</span>{" "}
                          <span className="text-amber-400/70">-X POST</span>{" "}
                          <span className="text-white/40">/v1/messages</span>
                          {" \\\n"}
                          <span className="text-amber-400/60">{"  "}-H</span>{" "}
                          <span className="text-cyan-400/70">{`"Authorization: Bearer sk_live_..."`}</span>
                          {" \\\n"}
                          <span className="text-amber-400/60">{"  "}-H</span>{" "}
                          <span className="text-cyan-400/70">{`"Content-Type: application/json"`}</span>
                          {" \\\n"}
                          <span className="text-amber-400/60">{"  "}-d</span>{" "}
                          <span className="text-cyan-400/50">{"'{"}</span>
                          {"\n"}
                          <span className="text-violet-400/80">{"    "}{`"channel"`}</span>
                          <span className="text-white/20">:</span>{" "}
                          <span className="text-cyan-400/70">{`"whatsapp"`}</span>
                          <span className="text-white/20">,</span>
                          {"\n"}
                          <span className="text-violet-400/80">{"    "}{`"to"`}</span>
                          <span className="text-white/20">:</span>{" "}
                          <span className="text-cyan-400/70">{`"+56912345678"`}</span>
                          <span className="text-white/20">,</span>
                          {"\n"}
                          <span className="text-violet-400/80">{"    "}{`"text"`}</span>
                          <span className="text-white/20">:</span>{" "}
                          <span className="text-cyan-400/70">{`"Tu cita fue confirmada ✅"`}</span>
                          {"\n"}
                          <span className="text-cyan-400/50">{"  }"}&apos;</span>
                          <span className="api-cursor" />
                        </code>
                      </pre>

                      {/* Inline response preview */}
                      <div className="mt-5 pt-5 border-t border-white/[0.05]">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-400/[0.1] border border-emerald-400/15">
                            <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">200 OK</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400/50">48ms</span>
                        </div>
                        <pre className="text-[11px] text-white/35 leading-[1.7] font-mono">
                          <code>{`{ "id": "msg_7f3kQ9x...", "status": "delivered" }`}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Pipeline indicator */}
            <Reveal delay={400}>
              <div className="mt-20 max-w-4xl mx-auto">
                <div className="flex items-center justify-between relative">
                  {/* Connecting line */}
                  <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2">
                    <div className="w-full h-full bg-gradient-to-r from-amber-400/20 via-cyan-400/20 to-emerald-400/20" />
                    {/* Animated light particle */}
                    <div
                      className="absolute top-0 w-20 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
                      style={{ animation: "scrollX 3s ease-in-out infinite" }}
                    />
                  </div>
                  {pipelineSteps.map((step, i) => (
                    <div key={i} className="relative flex flex-col items-center gap-3 z-10">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center border backdrop-blur-sm transition-all duration-500 hover:scale-110"
                        style={{
                          backgroundColor: `${step.color}08`,
                          borderColor: `${step.color}20`,
                          boxShadow: `0 0 30px ${step.color}08`,
                        }}
                      >
                        <step.icon className="w-6 h-6" style={{ color: step.color }} />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-semibold text-white/70">{step.label}</p>
                        <p className="text-[9px] text-white/25 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            FEATURES — Glass cards with accent lines
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-20">
                <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-4">
                  Capacidades
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
                  Todo lo que necesitas{" "}
                  <span className="text-gradient">para integrar</span>
                </h2>
                <p className="text-white/35 max-w-2xl mx-auto leading-relaxed">
                  Una API diseñada por developers, para developers. Con las herramientas
                  y la documentación que esperarías de un producto world-class.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feat, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="group relative h-full p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500 overflow-hidden">
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${feat.color}40, transparent)` }}
                    />
                    {/* Watermark number */}
                    <span className="absolute top-3 right-4 text-[80px] font-bold text-white/[0.015] leading-none select-none pointer-events-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {/* Hover glow */}
                    <div
                      className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{ backgroundColor: `${feat.color}08` }}
                    />

                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                        style={{
                          backgroundColor: `${feat.color}10`,
                          border: `1px solid ${feat.color}20`,
                        }}
                      >
                        <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                      </div>
                      <h3 className="text-base font-semibold text-white mb-2.5">{feat.title}</h3>
                      <p className="text-sm text-white/30 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            ENDPOINTS — Glass terminal card
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative">
          {/* Subtle glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/[0.02] rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-6 relative">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-4">
                  Endpoints
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
                  API <span className="text-gradient">Reference</span>
                </h2>
                <p className="text-white/35 max-w-xl mx-auto">
                  Endpoints RESTful con respuestas JSON consistentes, paginación
                  y códigos de error descriptivos.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden backdrop-blur-sm bg-white/[0.02]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <div className="w-2 h-2 rounded-full bg-emerald-400/70 animate-pulse" />
                      <span className="text-[11px] font-mono text-white/40">api.withmia.com</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/20">/v1</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400/60 px-2 py-0.5 rounded-md bg-emerald-400/[0.06] border border-emerald-400/10 uppercase tracking-wider font-bold">
                    Production
                  </span>
                </div>

                {/* Endpoints list */}
                <div className="divide-y divide-white/[0.04]">
                  {endpoints.map((ep, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-all duration-300 group cursor-pointer"
                      style={{
                        transitionDelay: `${i * 30}ms`,
                      }}
                    >
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border shrink-0 ${ep.methodColor}`}>
                        {ep.method}
                      </span>
                      <span className="text-[13px] font-mono text-white/50 group-hover:text-white/80 transition-colors">
                        {ep.path}
                      </span>
                      <span className="text-[12px] text-white/20 ml-auto hidden sm:block group-hover:text-white/35 transition-colors">
                        {ep.desc}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.015] flex items-center justify-between">
                  <span className="text-[11px] text-white/20 font-mono">8 endpoints disponibles</span>
                  <a
                    href="/docs"
                    className="text-[11px] font-medium text-amber-400/70 hover:text-amber-300 transition-colors flex items-center gap-1"
                  >
                    Ver documentación completa
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            SDKs — Tabs with glass design
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-4">
                  SDKs oficiales
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
                  Tu lenguaje,{" "}
                  <span className="text-gradient">tu forma</span>
                </h2>
                <p className="text-white/35 max-w-xl mx-auto">
                  SDKs tipados con autocompletado, retries automáticos y manejo de errores
                  para que te enfoques en tu producto.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden backdrop-blur-sm bg-white/[0.02]">
                {/* Tab bar */}
                <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-white/[0.06] bg-white/[0.015]">
                  {sdks.map((sdk, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSDK(i)}
                      className={`relative px-5 py-2.5 rounded-t-lg text-[12px] font-medium transition-all duration-300 ${
                        activeSDK === i
                          ? "bg-white/[0.06] text-white border-t border-l border-r border-white/[0.1]"
                          : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
                      }`}
                    >
                      <span className="mr-1.5 opacity-60">{sdk.icon}</span>
                      {sdk.lang}
                      {activeSDK === i && (
                        <span
                          className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                          style={{ backgroundColor: sdk.color }}
                        />
                      )}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2 pb-2">
                    <button
                      onClick={() => handleCopy(sdks[activeSDK].code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-white/30 hover:text-white/60"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-mono text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Install command */}
                {sdks[activeSDK].install && (
                  <div className="px-5 py-3 bg-white/[0.01] border-b border-white/[0.04] flex items-center gap-2">
                    <span className="text-[11px] font-mono text-white/20">$</span>
                    <span className="text-[11px] font-mono text-amber-400/70">{sdks[activeSDK].install}</span>
                    <button
                      onClick={() => handleCopy(sdks[activeSDK].install)}
                      className="ml-auto text-white/15 hover:text-white/40 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Code block */}
                <div className="p-5 md:p-6 overflow-x-auto relative">
                  {/* Line numbers */}
                  <div className="absolute left-0 top-5 md:top-6 bottom-5 md:bottom-6 w-10 flex flex-col items-end pr-3 pointer-events-none">
                    {sdks[activeSDK].code.split("\n").map((_, i) => (
                      <span key={i} className="text-[10px] font-mono text-white/[0.08] leading-[1.8]">
                        {i + 1}
                      </span>
                    ))}
                  </div>
                  <pre className="text-[12px] md:text-[13px] text-white/55 leading-[1.8] font-mono pl-8">
                    <code>{sdks[activeSDK].code}</code>
                  </pre>
                </div>
              </div>
            </Reveal>

            {/* SDK badges */}
            <Reveal delay={200}>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                {[
                  { label: "TypeScript support", icon: CheckCircle2 },
                  { label: "Auto-retries", icon: Activity },
                  { label: "Error handling", icon: Shield },
                  { label: "Type-safe", icon: Code },
                ].map((badge, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/30 text-[11px]">
                    <badge.icon className="w-3.5 h-3.5 text-amber-400/50" />
                    {badge.label}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            LIVE DEMO — Request / Response split terminal
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative">
          {/* Glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/[0.025] rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-6 relative">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-[0.2em] mb-4">
                  Pruébalo ahora
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
                  Envía tu{" "}
                  <span className="text-gradient">primer mensaje</span>
                </h2>
                <p className="text-white/35 max-w-xl mx-auto">
                  Un request, una respuesta. Así de simple es enviar mensajes con la API de WITHMIA.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden backdrop-blur-sm bg-white/[0.02]">
                {/* Chrome bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-[6px]">
                      <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]/80" />
                      <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]/80" />
                      <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]/80" />
                    </div>
                    <div className="h-4 w-px bg-white/[0.06]" />
                    <span className="text-[11px] font-mono text-white/30">Terminal — api.withmia.com</span>
                  </div>
                  <button
                    onClick={() => handleCopy(CURL_TEXT)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-white/30 hover:text-white/60"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-mono text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono">Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid md:grid-cols-2">
                  {/* Request */}
                  <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-white/[0.05]">
                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.04]">
                      <span className="px-2.5 py-1 rounded-md bg-amber-400/[0.1] border border-amber-400/20 text-[10px] font-mono text-amber-400 font-bold">
                        POST
                      </span>
                      <span className="text-[12px] font-mono text-white/40">/v1/messages</span>
                      <span className="ml-auto text-[9px] font-mono text-white/15 uppercase">Request</span>
                    </div>
                    <pre className="text-[11px] md:text-[12px] text-white/55 leading-[1.85] font-mono overflow-x-auto">
                      <code>
                        <span className="text-emerald-400/90">curl</span>{" "}
                        <span className="text-amber-400/70">-X POST</span>{" "}
                        <span className="text-white/40">/v1/messages</span>
                        {" \\\n"}
                        <span className="text-amber-400/60">{"  "}-H</span>{" "}
                        <span className="text-cyan-400/70">{`"Authorization: Bearer sk_live_..."`}</span>
                        {" \\\n"}
                        <span className="text-amber-400/60">{"  "}-H</span>{" "}
                        <span className="text-cyan-400/70">{`"Content-Type: application/json"`}</span>
                        {" \\\n"}
                        <span className="text-amber-400/60">{"  "}-d</span>{" "}
                        <span className="text-cyan-400/50">{"'{"}</span>
                        {"\n"}
                        <span className="text-violet-400/80">{"    "}{`"channel"`}</span>
                        <span className="text-white/20">:</span>{" "}
                        <span className="text-cyan-400/70">{`"whatsapp"`}</span>
                        <span className="text-white/20">,</span>
                        {"\n"}
                        <span className="text-violet-400/80">{"    "}{`"to"`}</span>
                        <span className="text-white/20">:</span>{" "}
                        <span className="text-cyan-400/70">{`"+56912345678"`}</span>
                        <span className="text-white/20">,</span>
                        {"\n"}
                        <span className="text-violet-400/80">{"    "}{`"text"`}</span>
                        <span className="text-white/20">:</span>{" "}
                        <span className="text-cyan-400/70">{`"Tu cita fue confirmada ✅"`}</span>
                        {"\n"}
                        <span className="text-cyan-400/50">{"  }"}&apos;</span>
                      </code>
                    </pre>
                  </div>

                  {/* Response */}
                  <div className="p-5 md:p-6">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.04]">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-400/[0.1] border border-emerald-400/15">
                        <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">200 OK</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400/50">48ms</span>
                      <span className="ml-auto text-[9px] font-mono text-white/15 uppercase">Response</span>
                    </div>
                    <pre className="text-[11px] md:text-[12px] leading-[1.85] font-mono overflow-x-auto">
                      <code>
                        <span className="text-white/15">{"{"}</span>
                        {"\n"}
                        <span className="text-violet-400/60">{"  "}{`"id"`}</span>
                        <span className="text-white/15">:</span>{" "}
                        <span className="text-cyan-400/55">{`"msg_7f3kQ9x..."`}</span>
                        <span className="text-white/15">,</span>
                        {"\n"}
                        <span className="text-violet-400/60">{"  "}{`"status"`}</span>
                        <span className="text-white/15">:</span>{" "}
                        <span className="text-emerald-400/60">{`"delivered"`}</span>
                        <span className="text-white/15">,</span>
                        {"\n"}
                        <span className="text-violet-400/60">{"  "}{`"channel"`}</span>
                        <span className="text-white/15">:</span>{" "}
                        <span className="text-cyan-400/55">{`"whatsapp"`}</span>
                        <span className="text-white/15">,</span>
                        {"\n"}
                        <span className="text-violet-400/60">{"  "}{`"timestamp"`}</span>
                        <span className="text-white/15">:</span>{" "}
                        <span className="text-cyan-400/55">{`"2026-02-22T12:00:00Z"`}</span>
                        {"\n"}
                        <span className="text-white/15">{"}"}</span>
                      </code>
                    </pre>

                    {/* Stats */}
                    <div className="mt-6 grid grid-cols-3 gap-2">
                      {[
                        { label: "Latencia", value: "<200ms", color: "text-emerald-400/60" },
                        { label: "Rate limit", value: "1000/min", color: "text-amber-400/60" },
                        { label: "Uptime", value: "99.9%", color: "text-cyan-400/60" },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center px-2 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                          <p className={`text-[12px] font-mono font-bold ${stat.color}`}>{stat.value}</p>
                          <p className="text-[8px] font-mono text-white/20 uppercase tracking-wider mt-0.5">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            TRUST — Security indicators strip
            ══════════════════════════════════════════════════ */}
        <Reveal>
          <section className="py-8 border-y border-white/[0.04]">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
                {[
                  { icon: Lock, text: "TLS 1.3 Encryption" },
                  { icon: Shield, text: "HMAC-SHA256 Webhooks" },
                  { icon: Key, text: "OAuth 2.0 Auth" },
                  { icon: Activity, text: "99.9% Uptime SLA" },
                  { icon: Globe, text: "Multi-region" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/20">
                    <item.icon className="w-3.5 h-3.5 text-amber-400/30" />
                    <span className="text-[11px] tracking-wide">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ══════════════════════════════════════════════════
            CTA — Gradient mesh
            ══════════════════════════════════════════════════ */}
        <section className="py-28 relative overflow-hidden">
          {/* Gradient mesh bg */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/[0.04] rounded-full blur-[130px]" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-[120px]" />
          </div>

          <Reveal>
            <div className="relative max-w-3xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-950/20 mb-8">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-300/70">Gratis para empezar</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Empieza a construir{" "}
                <span className="text-gradient">hoy</span>
              </h2>
              <p className="text-white/35 mb-10 max-w-xl mx-auto leading-relaxed">
                API keys gratuitas para desarrollo. Sandbox de pruebas incluido.
                Sin tarjeta de crédito para empezar.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://app.withmia.com"
                  className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_50px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    Obtener API Key gratis
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
                <a
                  href="/docs"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300 hover:bg-white/[0.03]"
                >
                  <BookOpen className="w-4 h-4" />
                  Ver documentación
                </a>
              </div>
            </div>
          </Reveal>
        </section>

      </main>
      <Footer />

      {/* ── Styles ── */}
      <style>{`
        @keyframes scrollX {
          0% { left: -20%; }
          100% { left: 100%; }
        }
        @keyframes api-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .api-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: #f59e0b;
          margin-left: 2px;
          animation: api-cursor-blink 1.2s step-end infinite;
          vertical-align: text-bottom;
        }
      `}</style>
    </div>
  );
};

export default ApiPage;
