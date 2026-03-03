import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "@/lib/router";
import {
  FileText, CheckCircle2, Monitor, UserCog, CreditCard, ShieldAlert,
  Copyright, Lock, Server, Code2, Scale, XCircle, PenLine, Gavel,
  List, Mail, Bot
} from "lucide-react";

/* ── Section metadata ── */
const sections = [
  { id: "aceptacion", num: "1", label: "Aceptación", icon: CheckCircle2, color: "amber" },
  { id: "descripcion", num: "2", label: "Descripción del Servicio", icon: Monitor, color: "violet" },
  { id: "registro", num: "3", label: "Registro y Cuenta", icon: UserCog, color: "cyan" },
  { id: "facturacion", num: "4", label: "Planes y Facturación", icon: CreditCard, color: "amber" },
  { id: "uso-aceptable", num: "5", label: "Uso Aceptable", icon: ShieldAlert, color: "emerald" },
  { id: "propiedad", num: "6", label: "Propiedad Intelectual", icon: Copyright, color: "violet" },
  { id: "datos", num: "7", label: "Protección de Datos", icon: Lock, color: "cyan" },
  { id: "sla", num: "8", label: "Nivel de Servicio", icon: Server, color: "amber" },
  { id: "api", num: "9", label: "API y Uso Programático", icon: Code2, color: "violet" },
  { id: "ia", num: "10", label: "Inteligencia Artificial", icon: Bot, color: "emerald" },
  { id: "responsabilidad", num: "11", label: "Limitación de Responsabilidad", icon: Scale, color: "cyan" },
  { id: "cancelacion", num: "12", label: "Cancelación", icon: XCircle, color: "amber" },
  { id: "modificaciones", num: "13", label: "Modificaciones", icon: PenLine, color: "emerald" },
  { id: "ley", num: "14", label: "Ley Aplicable", icon: Gavel, color: "violet" },
  { id: "generales", num: "15", label: "Disposiciones Generales", icon: List, color: "cyan" },
  { id: "contacto", num: "16", label: "Contacto", icon: Mail, color: "amber" },
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

const Terms = () => {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /* Scroll-spy via IntersectionObserver */
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
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/[0.025] blur-[150px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[140px]" />
      </div>
      <div className="pt-20 relative z-[1]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/15 backdrop-blur-sm mb-8">
              <FileText className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 tracking-wide uppercase">Legal</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-5">
              Términos y <span className="text-gradient">Condiciones</span>
            </h1>
            <p className="text-white/40 max-w-xl mx-auto">
              Última actualización: 27 de febrero de 2026
            </p>
          </div>
        </section>

        {/* ── LAYOUT: SIDEBAR + CONTENT ── */}
        <section className="pb-24">
          <div className="max-w-6xl mx-auto px-6">
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
                        <span className={`text-[11px] font-mono tabular-nums shrink-0 ${isActive ? "text-amber-400" : "text-white/20"}`}>
                          {s.num.padStart(2, "0")}
                        </span>
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}

                  {/* Related links */}
                  <div className="mt-6 pt-4 border-t border-white/[0.04]">
                    <Link to="/privacidad" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/25 hover:text-amber-400/70 transition-colors">
                      <Lock className="w-3.5 h-3.5" />
                      Política de Privacidad
                    </Link>
                  </div>
                </nav>
              </aside>

              {/* ── MAIN CONTENT ── */}
              <div className="flex-1 min-w-0 max-w-3xl">
                <div className="space-y-14 text-[15px] text-white/50 leading-[1.85]">

                  {/* 1 */}
                  <div id="aceptacion">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.amber} flex items-center justify-center shrink-0`}>
                        <CheckCircle2 className={`w-4 h-4 ${iconColorMap.amber}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">1. Aceptación de los Términos</h2>
                    </div>
                    <p>
                      Al acceder y utilizar la plataforma WITHMIA (en adelante, el "Servicio"), operada por MIA Marketing & Intelligence Artificial SpA, RUT 78.199.687-4 (en adelante, "WITHMIA", "nosotros" o "la Empresa"), con domicilio en Antonio Bellet 193, Of. 1210, Providencia, Santiago, Chile, usted acepta cumplir y estar sujeto a estos Términos y Condiciones (en adelante, los "Términos").
                    </p>
                    <p className="mt-3">
                      Si no está de acuerdo con alguna parte de estos Términos, no deberá acceder ni utilizar el Servicio. El uso continuado del Servicio constituye la aceptación de cualquier modificación a estos Términos.
                    </p>
                  </div>

                  {/* 2 */}
                  <div id="descripcion">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.violet} flex items-center justify-center shrink-0`}>
                        <Monitor className={`w-4 h-4 ${iconColorMap.violet}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">2. Descripción del Servicio</h2>
                    </div>
                    <p>
                      WITHMIA es una plataforma de comunicación omnicanal que permite a empresas gestionar conversaciones con sus clientes a través de múltiples canales de mensajería, incluyendo WhatsApp Business API, Instagram, Facebook Messenger, correo electrónico y chat web. El Servicio incluye, entre otras funcionalidades:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li>Gestión unificada de conversaciones multicanal</li>
                      <li>Asistentes de inteligencia artificial personalizables</li>
                      <li>Base de conocimiento con tecnología RAG (Retrieval-Augmented Generation)</li>
                      <li>Automatización de flujos de trabajo y respuestas</li>
                      <li>Sistema de agendamiento web con integración a Google Calendar y Google Meet</li>
                      <li>API REST para integraciones programáticas</li>
                      <li>Webhooks para notificaciones en tiempo real</li>
                      <li>Herramientas de analítica y reportería</li>
                      <li>Gestión de equipos y asignación de conversaciones</li>
                    </ul>
                  </div>

                  {/* 3 */}
                  <div id="registro">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.cyan} flex items-center justify-center shrink-0`}>
                        <UserCog className={`w-4 h-4 ${iconColorMap.cyan}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">3. Registro y Cuenta de Usuario</h2>
                    </div>
                    <p>
                      Para utilizar el Servicio, usted debe crear una cuenta proporcionando información veraz, completa y actualizada. Usted es responsable de:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li>Mantener la confidencialidad de sus credenciales de acceso</li>
                      <li>Todas las actividades que ocurran bajo su cuenta</li>
                      <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta</li>
                      <li>Asegurar que la información de su cuenta sea precisa y esté actualizada</li>
                    </ul>
                    <p className="mt-3">
                      WITHMIA se reserva el derecho de suspender o cancelar cuentas que incumplan estos Términos o que presenten actividad sospechosa.
                    </p>
                  </div>

                  {/* 4 */}
                  <div id="facturacion">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.amber} flex items-center justify-center shrink-0`}>
                        <CreditCard className={`w-4 h-4 ${iconColorMap.amber}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">4. Planes y Facturación</h2>
                    </div>
                    <p>
                      El Servicio está disponible en diferentes planes con distintos niveles de funcionalidad y precios. Al suscribirse a un plan de pago, usted acepta:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li>Pagar las tarifas correspondientes al plan seleccionado, expresadas en <strong className="text-white/50">pesos chilenos (CLP)</strong></li>
                      <li>Que todos los precios publicados <strong className="text-white/50">incluyen IVA (19%)</strong> conforme a la legislación tributaria vigente en Chile</li>
                      <li>Que la facturación se realizará de forma mensual o anual según la modalidad elegida</li>
                      <li>Que el plan anual se cobra como <strong className="text-white/50">pago único anticipado</strong> por el período completo de 12 meses</li>
                      <li>Que los precios pueden ser modificados con un aviso previo de 30 días</li>
                      <li>Que los pagos realizados no son reembolsables, salvo lo dispuesto en la sección de cancelación o lo establecido por la Ley N° 19.496</li>
                    </ul>
                    <p className="mt-3">
                      Los pagos se procesan de forma segura a través de <strong className="text-white/50">Flow.cl</strong>, plataforma de pagos regulada en Chile. WITHMIA no almacena datos de tarjetas ni información financiera sensible; estos son gestionados exclusivamente por Flow.cl conforme a sus propios términos de servicio y políticas de seguridad.
                    </p>
                    <p className="mt-3">
                      El plan Pro incluye 1 usuario. Cada miembro adicional se factura por separado según la tarifa vigente al momento de la contratación.
                    </p>
                    <p className="mt-3">
                      De acuerdo con la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores, los usuarios que actúen como consumidores finales podrán ejercer el derecho de retracto dentro de los 10 días siguientes a la contratación del servicio, siempre que no se haya utilizado el Servicio de manera sustancial durante dicho período.
                    </p>
                  </div>

                  {/* 5 */}
                  <div id="uso-aceptable">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.emerald} flex items-center justify-center shrink-0`}>
                        <ShieldAlert className={`w-4 h-4 ${iconColorMap.emerald}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">5. Uso Aceptable</h2>
                    </div>
                    <p>
                      Usted se compromete a utilizar el Servicio de manera lícita y conforme a estos Términos. Queda expresamente prohibido:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li>Enviar mensajes no solicitados (spam) o contenido publicitario masivo sin consentimiento</li>
                      <li>Distribuir contenido ilegal, difamatorio, obsceno o que infrinja derechos de terceros</li>
                      <li>Intentar acceder sin autorización a los sistemas o datos de WITHMIA o de otros usuarios</li>
                      <li>Utilizar el Servicio para actividades fraudulentas o engañosas</li>
                      <li>Violar las políticas de uso de los canales de mensajería integrados (WhatsApp, Meta, etc.)</li>
                      <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente del Servicio</li>
                      <li>Sobrecargar intencionalmente la infraestructura del Servicio</li>
                      <li>Presentar respuestas generadas por IA como asesoría profesional (legal, médica, financiera) sin supervisión humana adecuada</li>
                      <li>Utilizar los asistentes de IA para suplantar la identidad de personas reales o engañar deliberadamente a los usuarios finales sobre la naturaleza automatizada de las respuestas</li>
                    </ul>
                  </div>

                  {/* 6 */}
                  <div id="propiedad">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.violet} flex items-center justify-center shrink-0`}>
                        <Copyright className={`w-4 h-4 ${iconColorMap.violet}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">6. Propiedad Intelectual</h2>
                    </div>
                    <p>
                      Todo el contenido, diseño, código fuente, marcas, logotipos, documentación y materiales del Servicio son propiedad exclusiva de MIA Marketing & Intelligence Artificial SpA o de sus licenciantes, y están protegidos por las leyes de propiedad intelectual de Chile y tratados internacionales aplicables.
                    </p>
                    <p className="mt-3">
                      Usted retiene todos los derechos sobre los datos y contenidos que cargue o transmita a través del Servicio. Al utilizar WITHMIA, usted otorga una licencia limitada y no exclusiva para procesar dichos datos con el único fin de prestar el Servicio.
                    </p>
                    <p className="mt-3">
                      El contenido generado por los asistentes de inteligencia artificial de WITHMIA (respuestas, resúmenes, sugerencias) se considera una herramienta de asistencia. El usuario es responsable de revisar, validar y aprobar cualquier contenido generado por IA antes de su uso o difusión.
                    </p>
                  </div>

                  {/* 7 */}
                  <div id="datos">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.cyan} flex items-center justify-center shrink-0`}>
                        <Lock className={`w-4 h-4 ${iconColorMap.cyan}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">7. Protección de Datos Personales</h2>
                    </div>
                    <p>
                      El tratamiento de datos personales se rige por nuestra{" "}
                      <Link to="/privacidad" className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 decoration-amber-400/20 transition-colors">
                        Política de Privacidad
                      </Link>
                      , que forma parte integral de estos Términos. WITHMIA se compromete a:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li>Cumplir con la Ley N° 19.628 sobre Protección de la Vida Privada y la Ley N° 21.719 sobre Protección de los Datos Personales (vigente desde diciembre de 2026)</li>
                      <li>Implementar medidas de seguridad técnicas y organizativas adecuadas</li>
                      <li>No compartir datos personales con terceros sin consentimiento, salvo obligación legal</li>
                      <li>Cifrar las comunicaciones mediante TLS 1.3</li>
                      <li>Permitir a los usuarios ejercer sus derechos de acceso, rectificación, eliminación y portabilidad de datos</li>
                      <li>Tratar los datos del sistema de agendamiento web (nombre, email, empresa, motivo) exclusivamente para la creación de eventos en Google Calendar y envío de confirmaciones</li>
                    </ul>
                  </div>

                  {/* 8 */}
                  <div id="sla">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.amber} flex items-center justify-center shrink-0`}>
                        <Server className={`w-4 h-4 ${iconColorMap.amber}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">8. Nivel de Servicio (SLA)</h2>
                    </div>
                    <p>
                      WITHMIA se esfuerza por mantener una disponibilidad del Servicio del 99.9% medido mensualmente. En caso de incumplimiento del SLA, los clientes en planes de pago podrán solicitar créditos de servicio conforme a las siguientes condiciones:
                    </p>

                    {/* SLA table */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-[13px] text-white/40 border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-2.5 pr-4 text-white/50 font-semibold">Disponibilidad</th>
                            <th className="text-left py-2.5 text-white/50 font-semibold">Crédito</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          <tr><td className="py-2.5 pr-4">99.0% – 99.9%</td><td className="py-2.5">10% de la mensualidad</td></tr>
                          <tr><td className="py-2.5 pr-4">95.0% – 99.0%</td><td className="py-2.5">25% de la mensualidad</td></tr>
                          <tr><td className="py-2.5 pr-4">&lt; 95.0%</td><td className="py-2.5">50% de la mensualidad</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-3">
                      Las ventanas de mantenimiento programado, previamente notificadas, no se contabilizan como tiempo de inactividad.
                    </p>
                  </div>

                  {/* 9 */}
                  <div id="api">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.violet} flex items-center justify-center shrink-0`}>
                        <Code2 className={`w-4 h-4 ${iconColorMap.violet}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">9. API y Uso Programático</h2>
                    </div>
                    <p>
                      El acceso a la API de WITHMIA está sujeto a los siguientes términos adicionales:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li>Las API Keys son personales e intransferibles</li>
                      <li>Se aplican límites de tasa (rate limits) según el plan contratado</li>
                      <li>WITHMIA puede modificar la API con aviso previo, manteniendo compatibilidad hacia atrás en versiones estables</li>
                      <li>El uso de la API debe respetar las mismas restricciones de uso aceptable</li>
                      <li>Las credenciales comprometidas deben ser revocadas inmediatamente</li>
                    </ul>
                  </div>

                  {/* 10 */}
                  <div id="ia">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.emerald} flex items-center justify-center shrink-0`}>
                        <Bot className={`w-4 h-4 ${iconColorMap.emerald}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">10. Inteligencia Artificial</h2>
                    </div>
                    <p>
                      WITHMIA incorpora modelos de inteligencia artificial para ofrecer asistentes conversacionales, generación de respuestas automáticas, resúmenes y análisis de conversaciones. Al utilizar estas funcionalidades, usted reconoce y acepta que:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li><strong className="text-white/50">Sin garantía de exactitud:</strong> Las respuestas generadas por IA son aproximaciones basadas en modelos de lenguaje y pueden contener errores, imprecisiones o información desactualizada. No constituyen asesoría profesional de ningún tipo</li>
                      <li><strong className="text-white/50">Supervisión humana:</strong> El usuario es responsable de supervisar, revisar y validar el contenido generado por los asistentes de IA antes de que sea entregado a clientes finales</li>
                      <li><strong className="text-white/50">Base de conocimiento (RAG):</strong> Los documentos que usted cargue a la base de conocimiento son procesados para generar respuestas contextualizadas. Usted es responsable de la veracidad y legalidad del contenido cargado</li>
                      <li><strong className="text-white/50">Proveedores de IA:</strong> WITHMIA utiliza servicios de inteligencia artificial de terceros (como OpenAI) para el procesamiento de lenguaje natural. Los datos enviados a estos proveedores están sujetos a acuerdos de confidencialidad y no se utilizan para entrenar modelos de terceros</li>
                      <li><strong className="text-white/50">Mejora continua:</strong> WITHMIA podrá utilizar datos anonimizados y agregados para mejorar la calidad de sus modelos y algoritmos propios, sin revelar información identificable de usuarios o sus clientes</li>
                      <li><strong className="text-white/50">Limitaciones:</strong> WITHMIA no garantiza la disponibilidad ininterrumpida de los servicios de IA, ya que estos dependen de proveedores externos. En caso de indisponibilidad, las funcionalidades no basadas en IA seguirán operativas</li>
                    </ul>

                    {/* Callout */}
                    <div className="mt-6 p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.04]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Bot className="w-4 h-4 text-amber-400" />
                        <span className="text-[13px] font-semibold text-amber-400">Importante</span>
                      </div>
                      <p className="text-[13px] text-white/40 leading-relaxed pl-6">
                        WITHMIA no será responsable por decisiones tomadas en base a contenido generado por inteligencia artificial. El usuario asume la responsabilidad total sobre el uso y difusión de dicho contenido.
                      </p>
                    </div>
                  </div>

                  {/* 11 */}
                  <div id="responsabilidad">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.cyan} flex items-center justify-center shrink-0`}>
                        <Scale className={`w-4 h-4 ${iconColorMap.cyan}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">11. Limitación de Responsabilidad</h2>
                    </div>
                    <p>
                      En la máxima medida permitida por la legislación chilena aplicable, WITHMIA no será responsable de:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li>Daños indirectos, incidentales, especiales o consecuenciales</li>
                      <li>Pérdida de beneficios, datos, uso o goodwill</li>
                      <li>Interrupciones del Servicio causadas por terceros o fuerza mayor</li>
                      <li>Contenido transmitido por los usuarios a través del Servicio</li>
                      <li>Fallos en las plataformas de mensajería de terceros (WhatsApp, Meta, etc.)</li>
                      <li>Errores, imprecisiones o consecuencias derivadas del contenido generado por inteligencia artificial</li>
                      <li>Indisponibilidad de servicios de terceros integrados (Google Calendar, OpenAI, etc.)</li>
                    </ul>
                    <p className="mt-3">
                      La responsabilidad total acumulada de WITHMIA no excederá el monto pagado por el usuario durante los últimos 12 meses.
                    </p>
                  </div>

                  {/* 12 */}
                  <div id="cancelacion">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.amber} flex items-center justify-center shrink-0`}>
                        <XCircle className={`w-4 h-4 ${iconColorMap.amber}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">12. Cancelación y Terminación</h2>
                    </div>
                    <p>
                      Usted puede cancelar su cuenta en cualquier momento desde el panel de configuración del Servicio. Al cancelar:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li>El acceso se mantendrá hasta el final del período de facturación vigente</li>
                      <li>Los datos serán conservados por 30 días adicionales para permitir su exportación</li>
                      <li>Transcurrido el período de retención, los datos serán eliminados de forma permanente</li>
                    </ul>
                    <p className="mt-3">
                      WITHMIA podrá suspender o terminar su cuenta de forma inmediata en caso de violación de estos Términos, actividad fraudulenta o uso que ponga en riesgo la seguridad del Servicio.
                    </p>
                  </div>

                  {/* 13 */}
                  <div id="modificaciones">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.emerald} flex items-center justify-center shrink-0`}>
                        <PenLine className={`w-4 h-4 ${iconColorMap.emerald}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">13. Modificaciones a los Términos</h2>
                    </div>
                    <p>
                      WITHMIA se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones entrarán en vigencia tras su publicación en el Servicio. Se notificará a los usuarios registrados mediante correo electrónico con al menos 15 días de anticipación sobre cambios sustanciales.
                    </p>
                    <p className="mt-3">
                      El uso continuado del Servicio después de la entrada en vigencia de las modificaciones constituye la aceptación de los nuevos Términos.
                    </p>
                  </div>

                  {/* 14 */}
                  <div id="ley">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.violet} flex items-center justify-center shrink-0`}>
                        <Gavel className={`w-4 h-4 ${iconColorMap.violet}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">14. Ley Aplicable y Jurisdicción</h2>
                    </div>
                    <p>
                      Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República de Chile, incluyendo pero no limitándose a:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                      <li><strong className="text-white/50">Ley N° 19.628:</strong> Sobre Protección de la Vida Privada</li>
                      <li><strong className="text-white/50">Ley N° 21.719:</strong> Sobre Protección de los Datos Personales (vigente desde diciembre de 2026)</li>
                      <li><strong className="text-white/50">Ley N° 19.496:</strong> Sobre Protección de los Derechos de los Consumidores</li>
                      <li><strong className="text-white/50">Ley N° 17.336:</strong> Sobre Propiedad Intelectual</li>
                    </ul>
                    <p className="mt-3">
                      Cualquier controversia derivada de estos Términos o del uso del Servicio será sometida a la jurisdicción de los tribunales ordinarios de Santiago de Chile, renunciando las partes a cualquier otro fuero que pudiere corresponderles.
                    </p>
                  </div>

                  {/* 15 */}
                  <div id="generales">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.cyan} flex items-center justify-center shrink-0`}>
                        <List className={`w-4 h-4 ${iconColorMap.cyan}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">15. Disposiciones Generales</h2>
                    </div>
                    <ul className="list-disc list-inside space-y-2 text-white/40">
                      <li><strong className="text-white/50">Cesión:</strong> Usted no podrá ceder ni transferir sus derechos u obligaciones bajo estos Términos sin el consentimiento previo y por escrito de WITHMIA.</li>
                      <li><strong className="text-white/50">Divisibilidad:</strong> Si alguna disposición de estos Términos fuere declarada nula o inaplicable, las demás disposiciones mantendrán su plena vigencia y efecto.</li>
                      <li><strong className="text-white/50">Acuerdo completo:</strong> Estos Términos, junto con la Política de Privacidad, constituyen el acuerdo completo entre las partes respecto al uso del Servicio.</li>
                      <li><strong className="text-white/50">Renuncia:</strong> La falta de ejercicio de cualquier derecho por parte de WITHMIA no constituirá una renuncia al mismo.</li>
                      <li><strong className="text-white/50">Fuerza mayor:</strong> Ninguna de las partes será responsable por el incumplimiento de sus obligaciones causado por eventos de fuerza mayor, caso fortuito u otras circunstancias fuera de su control razonable.</li>
                    </ul>
                  </div>

                  {/* 16 */}
                  <div id="contacto">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-lg ${bgColorMap.amber} flex items-center justify-center shrink-0`}>
                        <Mail className={`w-4 h-4 ${iconColorMap.amber}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-white">16. Contacto</h2>
                    </div>
                    <p>
                      Para consultas sobre estos Términos y Condiciones, puede contactarnos a través de:
                    </p>
                    <div className="mt-5 p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3 text-[14px]">
                      <p><strong className="text-white/60">Empresa:</strong> MIA Marketing & Intelligence Artificial SpA</p>
                      <p><strong className="text-white/60">RUT:</strong> 78.199.687-4</p>
                      <p>
                        <strong className="text-white/60">Email:</strong>{" "}
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
                  <div className="pt-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8" />
                    <div className="flex flex-wrap items-center gap-4 text-[13px]">
                      <Link to="/privacidad" className="text-white/30 hover:text-amber-400/70 transition-colors underline underline-offset-2 decoration-white/10 hover:decoration-amber-400/20">
                        Política de Privacidad
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

      </div>
    </div>
  );
};

export default Terms;
