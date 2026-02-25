import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "@/lib/router";
import { Shield, Lock, Eye, Database, Globe, UserCheck, Bell, Server, Trash2, Mail, FileText } from "lucide-react";

/* ── Section metadata ── */
const sections = [
  { id: "info-general", num: "1", label: "Información General", icon: Globe, color: "amber" },
  { id: "datos-recopilados", num: "2", label: "Datos que Recopilamos", icon: Database, color: "violet" },
  { id: "uso-info", num: "3", label: "Uso de la Información", icon: Server, color: "cyan" },
  { id: "comparticion", num: "4", label: "Compartición de Datos", icon: UserCheck, color: "amber" },
  { id: "seguridad", num: "5", label: "Seguridad", icon: Lock, color: "violet" },
  { id: "cookies", num: "6", label: "Cookies", icon: Eye, color: "emerald" },
  { id: "derechos", num: "7", label: "Derechos del Usuario", icon: UserCheck, color: "cyan" },
  { id: "retencion", num: "8", label: "Retención de Datos", icon: Trash2, color: "amber" },
  { id: "transferencias", num: "9", label: "Transferencias Intl.", icon: Globe, color: "violet" },
  { id: "menores", num: "10", label: "Menores de Edad", icon: Shield, color: "cyan" },
  { id: "modificaciones", num: "11", label: "Modificaciones", icon: Bell, color: "emerald" },
  { id: "contacto", num: "12", label: "Contacto", icon: Mail, color: "amber" },
] as const;

const iconColorMap: Record<string, string> = {
  amber: "text-amber-400/70",
  violet: "text-violet-400/70",
  cyan: "text-cyan-400/70",
  emerald: "text-emerald-400/70",
};
const bgColorMap: Record<string, string> = {
  amber: "bg-amber-500/10",
  violet: "bg-violet-500/10",
  cyan: "bg-cyan-500/10",
  emerald: "bg-emerald-500/10",
};

const Privacy = () => {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setupObserver = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveSection(top.target.id);
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0.1 }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [setupObserver]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/[0.03] blur-[150px]" />
        <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] rounded-full bg-amber-500/[0.02] blur-[120px]" />
      </div>
      <main className="pt-20 relative z-[1]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/15 backdrop-blur-sm mb-8">
              <Shield className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-violet-400 tracking-wide uppercase">Privacidad</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-5">
              Política de <span className="text-gradient">Privacidad</span>
            </h1>
            <p className="text-white/40 max-w-xl mx-auto">
              Última actualización: 23 de febrero de 2026
            </p>
          </div>
        </section>

        {/* ── KEY PRINCIPLES ── */}
        <section className="pb-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Lock, title: "Cifrado end-to-end", desc: "TLS 1.3 en tránsito, AES-256 en reposo", color: "amber" },
                { icon: Eye, title: "Transparencia total", desc: "Sabemos exactamente qué datos recopilamos y por qué", color: "violet" },
                { icon: UserCheck, title: "Control del usuario", desc: "Accede, exporta o elimina tus datos en cualquier momento", color: "emerald" },
              ].map(item => {
                const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
                  amber: { bg: "bg-amber-500/[0.06]", icon: "text-amber-400", border: "border-amber-500/10" },
                  violet: { bg: "bg-violet-500/[0.05]", icon: "text-violet-400", border: "border-violet-500/10" },
                  emerald: { bg: "bg-emerald-500/[0.05]", icon: "text-emerald-400", border: "border-emerald-500/10" },
                };
                const c = colorMap[item.color];
                return (
                  <div key={item.title} className={`p-5 rounded-xl border ${c.border} ${c.bg} backdrop-blur-sm`}>
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-3">
                      <item.icon className={`w-4 h-4 ${c.icon}`} />
                    </div>
                    <h3 className="text-[14px] font-semibold text-white/80 mb-1">{item.title}</h3>
                    <p className="text-[12px] text-white/35 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── LAYOUT: SIDEBAR + CONTENT ── */}
        <section className="pb-24">
          <div className="max-w-6xl mx-auto px-6">
            {/* Subtle separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-12" />

            <div className="flex gap-10">

              {/* ── SIDE NAV (desktop) ── */}
              <aside className="hidden lg:block w-56 shrink-0">
                <nav className="sticky top-28 space-y-0.5 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 scrollbar-thin">
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3 pl-3">Contenido</p>
                  {sections.map((s) => {
                    const isActive = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => scrollTo(s.id)}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                          isActive
                            ? "bg-white/[0.05] text-white font-medium"
                            : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
                        }`}
                      >
                        <span className={`text-[11px] font-mono tabular-nums shrink-0 ${isActive ? "text-violet-400" : "text-white/20"}`}>
                          {s.num.padStart(2, "0")}
                        </span>
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}

                  {/* Related links */}
                  <div className="mt-6 pt-4 border-t border-white/[0.04]">
                    <Link to="/terminos" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/25 hover:text-amber-400/70 transition-colors">
                      <FileText className="w-3.5 h-3.5" />
                      Términos y Condiciones
                    </Link>
                  </div>
                </nav>
              </aside>

              {/* ── MAIN CONTENT ── */}
              <div className="flex-1 min-w-0 max-w-3xl">
                <div className="space-y-14 text-[15px] text-white/50 leading-[1.85]">

              {/* 1 */}
              <div id="info-general">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-amber-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">1. Información General</h2>
                </div>
                <p>
                  La presente Política de Privacidad describe cómo MIA Marketing & Intelligence Artificial SpA, RUT 78.199.687-4 (en adelante, "WITHMIA", "nosotros" o "la Empresa"), con domicilio en Antonio Bellet 193, Of. 1210, Providencia, Santiago, Chile, recopila, utiliza, almacena y protege la información personal de los usuarios de la plataforma WITHMIA (en adelante, el "Servicio").
                </p>
                <p className="mt-3">
                  Esta política se aplica a todos los usuarios del Servicio, incluyendo visitantes del sitio web, usuarios registrados, administradores de cuentas y desarrolladores que utilicen nuestra API. Al utilizar el Servicio, usted acepta las prácticas descritas en esta política.
                </p>
              </div>

              {/* 2 */}
              <div id="datos-recopilados">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4 text-violet-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">2. Datos que Recopilamos</h2>
                </div>
                <p>
                  Recopilamos diferentes tipos de información según cómo interactúes con WITHMIA:
                </p>

                <h3 className="text-[15px] font-semibold text-white/70 mt-6 mb-3">2.1 Datos de registro</h3>
                <ul className="list-disc list-inside space-y-2 text-white/40">
                  <li>Nombre completo y nombre de la empresa</li>
                  <li>Dirección de correo electrónico corporativo</li>
                  <li>Número de teléfono (opcional)</li>
                  <li>País y zona horaria</li>
                  <li>Contraseña cifrada (hash bcrypt, nunca almacenamos la contraseña en texto plano)</li>
                </ul>

                <h3 className="text-[15px] font-semibold text-white/70 mt-6 mb-3">2.2 Datos de uso del servicio</h3>
                <ul className="list-disc list-inside space-y-2 text-white/40">
                  <li>Conversaciones y mensajes enviados/recibidos a través de la plataforma</li>
                  <li>Configuraciones del workspace, canales conectados y reglas de automatización</li>
                  <li>Datos de contactos de clientes gestionados en la plataforma</li>
                  <li>Documentos subidos a la base de conocimiento (RAG)</li>
                  <li>Registros de actividad y auditoría del equipo</li>
                </ul>

                <h3 className="text-[15px] font-semibold text-white/70 mt-6 mb-3">2.3 Datos técnicos</h3>
                <ul className="list-disc list-inside space-y-2 text-white/40">
                  <li>Dirección IP y tipo de navegador</li>
                  <li>Sistema operativo y tipo de dispositivo</li>
                  <li>Páginas visitadas, duración de sesión y patrones de navegación</li>
                  <li>Identificadores de sesión y tokens de autenticación</li>
                </ul>

                <h3 className="text-[15px] font-semibold text-white/70 mt-6 mb-3">2.4 Datos de facturación</h3>
                <ul className="list-disc list-inside space-y-2 text-white/40">
                  <li>Información de facturación (nombre, dirección, RUT)</li>
                  <li>Los datos de pago (número de tarjeta) son procesados exclusivamente por nuestro proveedor de pagos certificado PCI-DSS. WITHMIA no almacena datos de tarjetas de crédito</li>
                </ul>
              </div>

              {/* 3 */}
              <div id="uso-info">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Server className="w-4 h-4 text-cyan-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">3. Uso de la Información</h2>
                </div>
                <p>
                  Utilizamos la información recopilada para los siguientes fines:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li><strong className="text-white/50">Prestación del Servicio:</strong> Operar, mantener y mejorar la plataforma WITHMIA, incluyendo el procesamiento de mensajes, la gestión de contactos y la ejecución de automatizaciones</li>
                  <li><strong className="text-white/50">Inteligencia artificial:</strong> Entrenar y mejorar los modelos de IA que potencian los asistentes inteligentes, utilizando únicamente datos anonimizados y agregados</li>
                  <li><strong className="text-white/50">Comunicaciones:</strong> Enviar notificaciones sobre el Servicio, actualizaciones, alertas de seguridad y comunicaciones de soporte</li>
                  <li><strong className="text-white/50">Analítica:</strong> Generar reportes y métricas de rendimiento para los usuarios del Servicio</li>
                  <li><strong className="text-white/50">Seguridad:</strong> Detectar, prevenir y responder a incidentes de seguridad, fraude o actividad maliciosa</li>
                  <li><strong className="text-white/50">Legal:</strong> Cumplir con obligaciones legales, regulatorias y requerimientos de autoridades competentes</li>
                </ul>

                {/* Callout */}
                <div className="mt-6 p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-[13px] font-semibold text-emerald-400">Compromiso</span>
                  </div>
                  <p className="text-[13px] text-white/40 leading-relaxed pl-6">
                    WITHMIA <strong className="text-white/50">nunca vende</strong> datos personales a terceros. Los datos de tus conversaciones y contactos son exclusivamente tuyos.
                  </p>
                </div>
              </div>

              {/* 4 */}
              <div id="comparticion">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-amber-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">4. Compartición de Datos</h2>
                </div>
                <p>
                  WITHMIA puede compartir información personal únicamente en las siguientes circunstancias:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li><strong className="text-white/50">Proveedores de servicios:</strong> Terceros que nos asisten en la operación del Servicio (hosting, procesamiento de pagos, envío de emails), sujetos a acuerdos de confidencialidad</li>
                  <li><strong className="text-white/50">Plataformas de mensajería:</strong> Datos necesarios para la entrega de mensajes a través de WhatsApp Business API, Instagram, Facebook Messenger y otros canales conectados</li>
                  <li><strong className="text-white/50">Obligación legal:</strong> Cuando sea requerido por ley, orden judicial o autoridad competente de la República de Chile</li>
                  <li><strong className="text-white/50">Protección de derechos:</strong> Para proteger los derechos, propiedad o seguridad de WITHMIA, sus usuarios o el público</li>
                  <li><strong className="text-white/50">Transacciones corporativas:</strong> En caso de fusión, adquisición o venta de activos, con notificación previa a los usuarios afectados</li>
                </ul>

                <h3 className="text-[15px] font-semibold text-white/70 mt-6 mb-3">Proveedores principales</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] text-white/40 border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-2.5 pr-4 text-white/50 font-semibold">Proveedor</th>
                        <th className="text-left py-2.5 pr-4 text-white/50 font-semibold">Propósito</th>
                        <th className="text-left py-2.5 text-white/50 font-semibold">Ubicación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      <tr><td className="py-2.5 pr-4">Railway / AWS</td><td className="py-2.5 pr-4">Infraestructura y hosting</td><td className="py-2.5">EE.UU.</td></tr>
                      <tr><td className="py-2.5 pr-4">Stripe</td><td className="py-2.5 pr-4">Procesamiento de pagos</td><td className="py-2.5">EE.UU.</td></tr>
                      <tr><td className="py-2.5 pr-4">Meta (WhatsApp/IG)</td><td className="py-2.5 pr-4">API de mensajería</td><td className="py-2.5">EE.UU.</td></tr>
                      <tr><td className="py-2.5 pr-4">OpenAI</td><td className="py-2.5 pr-4">Procesamiento de IA</td><td className="py-2.5">EE.UU.</td></tr>
                      <tr><td className="py-2.5 pr-4">Sentry</td><td className="py-2.5 pr-4">Monitoreo de errores</td><td className="py-2.5">EE.UU.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5 */}
              <div id="seguridad">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-violet-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">5. Seguridad de los Datos</h2>
                </div>
                <p>
                  Implementamos medidas técnicas y organizativas para proteger la información personal contra acceso no autorizado, alteración, divulgación o destrucción:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li><strong className="text-white/50">Cifrado en tránsito:</strong> Todas las comunicaciones son protegidas con TLS 1.3</li>
                  <li><strong className="text-white/50">Cifrado en reposo:</strong> Los datos almacenados se cifran con AES-256</li>
                  <li><strong className="text-white/50">Control de acceso:</strong> Autenticación multifactor (MFA) y principio de mínimos privilegios para el equipo de WITHMIA</li>
                  <li><strong className="text-white/50">Auditoría:</strong> Registros de acceso y modificación de datos con retención de 12 meses</li>
                  <li><strong className="text-white/50">Backups:</strong> Copias de seguridad cifradas diarias con retención de 30 días</li>
                  <li><strong className="text-white/50">Pruebas de seguridad:</strong> Evaluaciones de vulnerabilidad periódicas y pentesting anual</li>
                  <li><strong className="text-white/50">Incidentes:</strong> Plan de respuesta a incidentes con notificación a usuarios afectados dentro de 72 horas</li>
                </ul>
              </div>

              {/* 6 */}
              <div id="cookies">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4 text-emerald-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">6. Cookies y Tecnologías de Rastreo</h2>
                </div>
                <p>
                  WITHMIA utiliza cookies y tecnologías similares para mejorar la experiencia del usuario y analizar el uso del Servicio:
                </p>

                <h3 className="text-[15px] font-semibold text-white/70 mt-6 mb-3">Cookies esenciales</h3>
                <p className="text-white/40">
                  Necesarias para el funcionamiento del Servicio. Incluyen tokens de sesión, preferencias de idioma y configuraciones de seguridad. No pueden ser desactivadas.
                </p>

                <h3 className="text-[15px] font-semibold text-white/70 mt-6 mb-3">Cookies de analítica</h3>
                <p className="text-white/40">
                  Nos ayudan a entender cómo se utiliza el Servicio. Utilizamos herramientas de analítica propias y de terceros para medir el rendimiento y mejorar la experiencia. Puedes desactivarlas desde tu configuración de cuenta.
                </p>

                <h3 className="text-[15px] font-semibold text-white/70 mt-6 mb-3">Cookies de funcionalidad</h3>
                <p className="text-white/40">
                  Permiten recordar tus preferencias (tema, idioma, layout del inbox) para personalizar tu experiencia en sesiones futuras.
                </p>

                <p className="mt-4">
                  Puedes gestionar las cookies desde la configuración de tu navegador. Ten en cuenta que desactivar cookies esenciales puede afectar el funcionamiento del Servicio.
                </p>
              </div>

              {/* 7 */}
              <div id="derechos">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-cyan-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">7. Derechos de los Usuarios</h2>
                </div>
                <p>
                  De conformidad con la Ley N° 19.628 sobre Protección de la Vida Privada de Chile y normativa aplicable, usted tiene los siguientes derechos:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li><strong className="text-white/50">Acceso:</strong> Solicitar una copia de los datos personales que almacenamos sobre usted</li>
                  <li><strong className="text-white/50">Rectificación:</strong> Corregir datos personales inexactos o incompletos</li>
                  <li><strong className="text-white/50">Eliminación:</strong> Solicitar la eliminación de sus datos personales, sujeto a obligaciones legales de retención</li>
                  <li><strong className="text-white/50">Portabilidad:</strong> Exportar sus datos en formato estructurado y legible por máquina (JSON o CSV)</li>
                  <li><strong className="text-white/50">Oposición:</strong> Oponerse al tratamiento de sus datos para fines de marketing o análisis</li>
                  <li><strong className="text-white/50">Restricción:</strong> Solicitar la limitación del tratamiento de sus datos en determinadas circunstancias</li>
                </ul>
                <p className="mt-3">
                  Para ejercer estos derechos, envía un correo a{" "}
                  <a href="mailto:privacidad@withmia.com" className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 decoration-amber-400/20 transition-colors">
                    privacidad@withmia.com
                  </a>
                  . Responderemos dentro de los 15 días hábiles siguientes a la recepción de tu solicitud.
                </p>
              </div>

              {/* 8 */}
              <div id="retencion">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4 text-amber-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">8. Retención de Datos</h2>
                </div>
                <p>
                  Conservamos los datos personales durante el tiempo necesario para cumplir con los fines descritos en esta política:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li><strong className="text-white/50">Datos de cuenta:</strong> Mientras la cuenta esté activa + 30 días tras la cancelación</li>
                  <li><strong className="text-white/50">Conversaciones y mensajes:</strong> Según la configuración de retención del workspace (configurable)</li>
                  <li><strong className="text-white/50">Documentos de IA (RAG):</strong> Hasta que el usuario los elimine manualmente</li>
                  <li><strong className="text-white/50">Logs de auditoría:</strong> 12 meses desde la fecha de registro</li>
                  <li><strong className="text-white/50">Datos de facturación:</strong> 6 años conforme a la legislación tributaria chilena</li>
                  <li><strong className="text-white/50">Datos técnicos:</strong> 90 días para logs de acceso, 30 días para sesiones</li>
                </ul>
                <p className="mt-3">
                  Una vez transcurrido el período de retención, los datos se eliminan de forma segura e irreversible de todos nuestros sistemas, incluyendo respaldos.
                </p>
              </div>

              {/* 9 */}
              <div id="transferencias">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-violet-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">9. Transferencias Internacionales</h2>
                </div>
                <p>
                  Algunos de nuestros proveedores de servicios operan fuera de Chile, principalmente en Estados Unidos. Cuando transferimos datos fuera de Chile:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li>Nos aseguramos de que los proveedores mantengan niveles de protección adecuados</li>
                  <li>Firmamos acuerdos de procesamiento de datos (DPA) con cada proveedor</li>
                  <li>Verificamos que cuenten con certificaciones relevantes (SOC 2, ISO 27001, PCI-DSS según corresponda)</li>
                  <li>Implementamos medidas técnicas adicionales como cifrado y pseudonimización cuando es apropiado</li>
                </ul>
              </div>

              {/* 10 */}
              <div id="menores">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-cyan-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">10. Menores de Edad</h2>
                </div>
                <p>
                  WITHMIA no está dirigido a menores de 18 años. No recopilamos conscientemente información personal de menores. Si toma conocimiento de que un menor ha proporcionado datos personales, contacte a{" "}
                  <a href="mailto:privacidad@withmia.com" className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 decoration-amber-400/20 transition-colors">
                    privacidad@withmia.com
                  </a>
                  {" "}para que procedamos a su eliminación inmediata.
                </p>
              </div>

              {/* 11 */}
              <div id="modificaciones">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-emerald-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">11. Modificaciones a esta Política</h2>
                </div>
                <p>
                  WITHMIA se reserva el derecho de actualizar esta Política de Privacidad para reflejar cambios en nuestras prácticas, tecnología o requisitos legales. Cuando realicemos cambios sustanciales:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li>Notificaremos a los usuarios registrados por correo electrónico con al menos 15 días de anticipación</li>
                  <li>Publicaremos un aviso visible en la plataforma</li>
                  <li>Actualizaremos la fecha de "última actualización" al inicio de este documento</li>
                </ul>
                <p className="mt-3">
                  El uso continuado del Servicio tras la entrada en vigencia de los cambios constituye la aceptación de la política actualizada.
                </p>
              </div>

              {/* 12 */}
              <div id="contacto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-amber-400/70" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">12. Contacto</h2>
                </div>
                <p>
                  Para consultas sobre esta Política de Privacidad, ejercicio de derechos o reportar incidentes de seguridad, puedes contactarnos a través de:
                </p>
                <div className="mt-5 p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3 text-[14px]">
                  <p><strong className="text-white/60">Responsable del tratamiento:</strong> MIA Marketing & Intelligence Artificial SpA</p>
                  <p><strong className="text-white/60">RUT:</strong> 78.199.687-4</p>
                  <p>
                    <strong className="text-white/60">Email de privacidad:</strong>{" "}
                    <a href="mailto:privacidad@withmia.com" className="text-amber-400/70 hover:text-amber-400 transition-colors">
                      privacidad@withmia.com
                    </a>
                  </p>
                  <p>
                    <strong className="text-white/60">Email general:</strong>{" "}
                    <a href="mailto:legal@withmia.com" className="text-amber-400/70 hover:text-amber-400 transition-colors">
                      legal@withmia.com
                    </a>
                  </p>
                  <p>
                    <strong className="text-white/60">Sitio web:</strong>{" "}
                    <a href="https://withmia.com" className="text-amber-400/70 hover:text-amber-400 transition-colors">
                      withmia.com
                    </a>
                  </p>
                  <p><strong className="text-white/60">Ubicación:</strong> Antonio Bellet 193, Of. 1210, Providencia, Santiago, Chile</p>
                </div>
              </div>

              {/* Legal links */}
              {/* Legal links */}
              <div className="pt-6">
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8" />
                <div className="flex flex-wrap items-center gap-4 text-[13px]">
                  <Link to="/terminos" className="text-white/30 hover:text-amber-400/70 transition-colors underline underline-offset-2 decoration-white/10 hover:decoration-amber-400/20">
                    Términos y Condiciones
                  </Link>
                  <span className="text-white/10">·</span>
                  <Link to="/contacto" className="text-white/30 hover:text-amber-400/70 transition-colors underline underline-offset-2 decoration-white/10 hover:decoration-amber-400/20">
                    Contacto
                  </Link>
                  <span className="text-white/10">·</span>
                  <Link to="/docs" className="text-white/30 hover:text-amber-400/70 transition-colors underline underline-offset-2 decoration-white/10 hover:decoration-amber-400/20">
                    Documentación
                  </Link>
                </div>
              </div>

                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Privacy;
