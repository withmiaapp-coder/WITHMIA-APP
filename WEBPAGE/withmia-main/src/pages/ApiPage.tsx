import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
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
} from "lucide-react";

const CURL_TEXT = `curl -X POST https://api.withmia.com/v1/messages \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "whatsapp",
    "to": "+56912345678",
    "text": "Tu cita fue confirmada ✅"
  }'`;

const endpoints = [
  {
    method: "POST",
    path: "/v1/messages",
    desc: "Enviar un mensaje a cualquier canal",
    methodColor: "bg-amber-400/[0.1] text-amber-400 border-amber-400/20",
  },
  {
    method: "GET",
    path: "/v1/conversations",
    desc: "Listar conversaciones con filtros y paginación",
    methodColor: "bg-emerald-400/[0.1] text-emerald-400 border-emerald-400/20",
  },
  {
    method: "GET",
    path: "/v1/contacts",
    desc: "Obtener contactos y sus datos de perfil",
    methodColor: "bg-emerald-400/[0.1] text-emerald-400 border-emerald-400/20",
  },
  {
    method: "POST",
    path: "/v1/webhooks",
    desc: "Registrar webhooks para eventos en tiempo real",
    methodColor: "bg-amber-400/[0.1] text-amber-400 border-amber-400/20",
  },
  {
    method: "PUT",
    path: "/v1/contacts/:id",
    desc: "Actualizar información de un contacto",
    methodColor: "bg-blue-400/[0.1] text-blue-400 border-blue-400/20",
  },
  {
    method: "DELETE",
    path: "/v1/webhooks/:id",
    desc: "Eliminar un webhook registrado",
    methodColor: "bg-red-400/[0.1] text-red-400 border-red-400/20",
  },
  {
    method: "GET",
    path: "/v1/channels",
    desc: "Listar canales conectados y su estado",
    methodColor: "bg-emerald-400/[0.1] text-emerald-400 border-emerald-400/20",
  },
  {
    method: "POST",
    path: "/v1/templates",
    desc: "Crear plantillas de mensajes HSM",
    methodColor: "bg-amber-400/[0.1] text-amber-400 border-amber-400/20",
  },
];

const features = [
  {
    icon: Zap,
    title: "REST API completa",
    desc: "CRUD completo para mensajes, conversaciones, contactos, canales y webhooks. Diseñada para ser predecible e intuitiva.",
    color: "#f59e0b",
  },
  {
    icon: Webhook,
    title: "Webhooks en tiempo real",
    desc: "Recibe eventos instantáneamente: nuevos mensajes, cambios de estado, asignaciones y más. Bidireccional y configurable.",
    color: "#22d3ee",
  },
  {
    icon: Key,
    title: "OAuth 2.0",
    desc: "Autenticación enterprise-grade con tokens de acceso, refresh tokens y scopes granulares por recurso.",
    color: "#34d399",
  },
  {
    icon: Layers,
    title: "SDKs oficiales",
    desc: "Librerías para Node.js, Python y PHP con tipado completo, retries automáticos y manejo de errores.",
    color: "#a78bfa",
  },
  {
    icon: Shield,
    title: "Rate limiting inteligente",
    desc: "1,000 requests/min por defecto con headers informativos. Planes enterprise con límites personalizados.",
    color: "#f43f5e",
  },
  {
    icon: Lock,
    title: "Seguridad TLS 1.3",
    desc: "Todas las comunicaciones cifradas de extremo a extremo. Firma de webhooks con HMAC-SHA256.",
    color: "#6366f1",
  },
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
  },
  {
    lang: "cURL",
    install: "",
    code: CURL_TEXT,
    color: "#f59e0b",
  },
];

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

  return (
    <div className="min-h-screen bg-[#030507]">
      <Navigation />
      <main className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-950/15 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-950/30 mb-8">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-300/80 tracking-wide">REST API v1.0</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              API que los developers
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                aman usar
              </span>
            </h1>

            <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-12">
              RESTful, predecible y completamente documentada. Integra WITHMIA
              en tu stack en minutos con SDKs oficiales, webhooks en tiempo real
              y sandbox de pruebas.
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
              {[
                { value: "<200ms", label: "Latencia p95", icon: Activity, color: "#22d3ee" },
                { value: "99.9%", label: "Uptime SLA", icon: Shield, color: "#34d399" },
                { value: "1000/min", label: "Rate limit", icon: Zap, color: "#f59e0b" },
                { value: "TLS 1.3", label: "Encriptación", icon: Lock, color: "#a78bfa" },
              ].map((m, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <m.icon className="w-4 h-4 mx-auto mb-2" style={{ color: m.color }} />
                  <p className="text-lg font-bold text-white">{m.value}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/docs"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)] hover:-translate-y-px"
              >
                Ver documentación
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://app.withmia.com"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300"
              >
                Obtener API Key
              </a>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest mb-4">
                Capacidades
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Todo lo que necesitas para integrar
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                Una API diseñada por developers, para developers. Con las herramientas
                y la documentación que esperarías de un producto world-class.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feat, i) => (
                <div key={i} className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
                    style={{
                      backgroundColor: `${feat.color}12`,
                      border: `1px solid ${feat.color}20`,
                    }}
                  >
                    <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ENDPOINTS ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest mb-4">
                Endpoints
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                API Reference
              </h2>
              <p className="text-white/40 max-w-xl mx-auto">
                Endpoints RESTful con respuestas JSON consistentes, paginación
                y códigos de error descriptivos.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#08080e]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-white/[0.015]">
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
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border shrink-0 ${ep.methodColor}`}>
                      {ep.method}
                    </span>
                    <span className="text-[13px] font-mono text-white/60 group-hover:text-white/80 transition-colors">
                      {ep.path}
                    </span>
                    <span className="text-[12px] text-white/25 ml-auto hidden sm:block">
                      {ep.desc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/[0.05] bg-white/[0.01] flex items-center justify-between">
                <span className="text-[11px] text-white/20">8 endpoints disponibles</span>
                <a
                  href="/docs"
                  className="text-[11px] font-medium text-amber-400/70 hover:text-amber-300 transition-colors"
                >
                  Ver documentación completa →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── SDKs ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest mb-4">
                SDKs oficiales
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Tu lenguaje, tu forma
              </h2>
              <p className="text-white/40 max-w-xl mx-auto">
                SDKs tipados con autocompletado, retries automáticos y manejo de errores
                para que te enfoques en tu producto.
              </p>
            </div>

            {/* SDK tabs */}
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#08080e]">
              {/* Tab bar */}
              <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/[0.05]">
                {sdks.map((sdk, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSDK(i)}
                    className={`px-4 py-2.5 rounded-t-lg text-[12px] font-medium transition-all ${
                      activeSDK === i
                        ? "bg-white/[0.06] text-white border-t border-l border-r border-white/[0.08]"
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    {sdk.lang}
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
                <div className="px-5 py-2.5 bg-white/[0.01] border-b border-white/[0.04]">
                  <span className="text-[11px] font-mono text-white/25">$ </span>
                  <span className="text-[11px] font-mono text-amber-400/70">{sdks[activeSDK].install}</span>
                </div>
              )}

              {/* Code block */}
              <div className="p-5 overflow-x-auto">
                <pre className="text-[12px] md:text-[13px] text-white/55 leading-[1.8] font-mono">
                  <code>{sdks[activeSDK].code}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* ── LIVE DEMO ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest mb-4">
                Pruébalo ahora
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Envía tu primer mensaje
              </h2>
              <p className="text-white/40 max-w-xl mx-auto">
                Un request, una respuesta. Así de simple es enviar mensajes con la API de WITHMIA.
              </p>
            </div>

            {/* Terminal card */}
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#08080e]">
              {/* Chrome bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-white/[0.015]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-[6px]">
                    <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]/80" />
                    <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]/80" />
                    <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]/80" />
                  </div>
                  <div className="h-4 w-px bg-white/[0.06]" />
                  <span className="text-[11px] font-mono text-white/30">Terminal</span>
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
                <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-white/[0.04]">
                  <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.04]">
                    <span className="px-2.5 py-1 rounded-md bg-amber-400/[0.1] border border-amber-400/20 text-[10px] font-mono text-amber-400 font-bold">POST</span>
                    <span className="text-[12px] font-mono text-white/40">/v1/messages</span>
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
                    <span className="text-[10px] font-mono text-white/20">application/json</span>
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

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      { label: "Latencia", value: "<200ms", color: "text-emerald-400/60" },
                      { label: "Rate limit", value: "1000/min", color: "text-amber-400/60" },
                      { label: "Uptime", value: "99.9%", color: "text-cyan-400/60" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center px-2 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className={`text-[12px] font-mono font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[8px] font-mono text-white/20 uppercase tracking-wider mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Empieza a construir hoy
            </h2>
            <p className="text-white/40 mb-10 max-w-xl mx-auto">
              API keys gratuitas para desarrollo. Sandbox de pruebas incluido.
              Sin tarjeta de crédito para empezar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://app.withmia.com"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)] hover:-translate-y-px"
              >
                Obtener API Key gratis
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

export default ApiPage;
