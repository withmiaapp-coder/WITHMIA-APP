import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";
import { FileText, Shield, AlertTriangle } from "lucide-react";

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#030507]">
      <Navigation />
      <main className="pt-20">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent" />
          </div>
          <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8">
              <FileText className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs font-medium text-white/40 tracking-wide">Legal</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-5">
              Términos y Condiciones
            </h1>
            <p className="text-white/40 max-w-xl mx-auto">
              Última actualización: 22 de febrero de 2026
            </p>
          </div>
        </section>

        {/* ── CONTENT ── */}
        <section className="pb-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 pt-16">
            <div className="space-y-12 text-[15px] text-white/50 leading-[1.85]">

              {/* 1 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">1. Aceptación de los Términos</h2>
                <p>
                  Al acceder y utilizar la plataforma WITHMIA (en adelante, el "Servicio"), operada por Atlantis Producciones SpA (en adelante, "WITHMIA", "nosotros" o "la Empresa"), con domicilio en Santiago, Chile, usted acepta cumplir y estar sujeto a estos Términos y Condiciones (en adelante, los "Términos").
                </p>
                <p className="mt-3">
                  Si no está de acuerdo con alguna parte de estos Términos, no deberá acceder ni utilizar el Servicio. El uso continuado del Servicio constituye la aceptación de cualquier modificación a estos Términos.
                </p>
              </div>

              {/* 2 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">2. Descripción del Servicio</h2>
                <p>
                  WITHMIA es una plataforma de comunicación omnicanal que permite a empresas gestionar conversaciones con sus clientes a través de múltiples canales de mensajería, incluyendo WhatsApp Business API, Instagram, Facebook Messenger, correo electrónico y chat web. El Servicio incluye, entre otras funcionalidades:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li>Gestión unificada de conversaciones multicanal</li>
                  <li>Asistentes de inteligencia artificial personalizables</li>
                  <li>Automatización de flujos de trabajo y respuestas</li>
                  <li>API REST para integraciones programáticas</li>
                  <li>Webhooks para notificaciones en tiempo real</li>
                  <li>Herramientas de analítica y reportería</li>
                  <li>Gestión de equipos y asignación de conversaciones</li>
                </ul>
              </div>

              {/* 3 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">3. Registro y Cuenta de Usuario</h2>
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
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">4. Planes y Facturación</h2>
                <p>
                  El Servicio está disponible en diferentes planes con distintos niveles de funcionalidad y precios. Al suscribirse a un plan de pago, usted acepta:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li>Pagar las tarifas correspondientes al plan seleccionado</li>
                  <li>Que la facturación se realizará de forma mensual o anual según la modalidad elegida</li>
                  <li>Que los precios pueden ser modificados con un aviso previo de 30 días</li>
                  <li>Que los pagos realizados no son reembolsables, salvo lo dispuesto en la sección de cancelación</li>
                </ul>
                <p className="mt-3">
                  Los impuestos aplicables (IVA, u otros) serán agregados al precio del plan según la legislación vigente en Chile.
                </p>
              </div>

              {/* 5 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">5. Uso Aceptable</h2>
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
                </ul>
              </div>

              {/* 6 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">6. Propiedad Intelectual</h2>
                <p>
                  Todo el contenido, diseño, código fuente, marcas, logotipos, documentación y materiales del Servicio son propiedad exclusiva de Atlantis Producciones SpA o de sus licenciantes, y están protegidos por las leyes de propiedad intelectual de Chile y tratados internacionales aplicables.
                </p>
                <p className="mt-3">
                  Usted retiene todos los derechos sobre los datos y contenidos que cargue o transmita a través del Servicio. Al utilizar WITHMIA, usted otorga una licencia limitada y no exclusiva para procesar dichos datos con el único fin de prestar el Servicio.
                </p>
              </div>

              {/* 7 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">7. Protección de Datos Personales</h2>
                <p>
                  El tratamiento de datos personales se rige por nuestra{" "}
                  <a href="/privacidad" className="text-blue-400/70 hover:text-blue-400 underline underline-offset-2 transition-colors">
                    Política de Privacidad
                  </a>
                  , que forma parte integral de estos Términos. WITHMIA se compromete a:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li>Cumplir con la Ley N° 19.628 sobre Protección de la Vida Privada de Chile</li>
                  <li>Implementar medidas de seguridad técnicas y organizativas adecuadas</li>
                  <li>No compartir datos personales con terceros sin consentimiento, salvo obligación legal</li>
                  <li>Cifrar las comunicaciones mediante TLS 1.3</li>
                  <li>Permitir a los usuarios ejercer sus derechos de acceso, rectificación y eliminación de datos</li>
                </ul>
              </div>

              {/* 8 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">8. Nivel de Servicio (SLA)</h2>
                <p>
                  WITHMIA se esfuerza por mantener una disponibilidad del Servicio del 99.9% medido mensualmente. En caso de incumplimiento del SLA, los clientes en planes de pago podrán solicitar créditos de servicio conforme a las siguientes condiciones:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li>Disponibilidad entre 99.0% y 99.9%: crédito del 10% de la mensualidad</li>
                  <li>Disponibilidad entre 95.0% y 99.0%: crédito del 25% de la mensualidad</li>
                  <li>Disponibilidad inferior al 95.0%: crédito del 50% de la mensualidad</li>
                </ul>
                <p className="mt-3">
                  Las ventanas de mantenimiento programado, previamente notificadas, no se contabilizan como tiempo de inactividad.
                </p>
              </div>

              {/* 9 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">9. API y Uso Programático</h2>
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
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">10. Limitación de Responsabilidad</h2>
                <p>
                  En la máxima medida permitida por la legislación chilena aplicable, WITHMIA no será responsable de:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-white/40">
                  <li>Daños indirectos, incidentales, especiales o consecuenciales</li>
                  <li>Pérdida de beneficios, datos, uso o goodwill</li>
                  <li>Interrupciones del Servicio causadas por terceros o fuerza mayor</li>
                  <li>Contenido transmitido por los usuarios a través del Servicio</li>
                  <li>Fallos en las plataformas de mensajería de terceros (WhatsApp, Meta, etc.)</li>
                </ul>
                <p className="mt-3">
                  La responsabilidad total acumulada de WITHMIA no excederá el monto pagado por el usuario durante los últimos 12 meses.
                </p>
              </div>

              {/* 11 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">11. Cancelación y Terminación</h2>
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

              {/* 12 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">12. Modificaciones a los Términos</h2>
                <p>
                  WITHMIA se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones entrarán en vigencia tras su publicación en el Servicio. Se notificará a los usuarios registrados mediante correo electrónico con al menos 15 días de anticipación sobre cambios sustanciales.
                </p>
                <p className="mt-3">
                  El uso continuado del Servicio después de la entrada en vigencia de las modificaciones constituye la aceptación de los nuevos Términos.
                </p>
              </div>

              {/* 13 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">13. Ley Aplicable y Jurisdicción</h2>
                <p>
                  Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República de Chile. Cualquier controversia derivada de estos Términos o del uso del Servicio será sometida a la jurisdicción de los tribunales ordinarios de Santiago de Chile, renunciando las partes a cualquier otro fuero que pudiere corresponderles.
                </p>
              </div>

              {/* 14 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">14. Disposiciones Generales</h2>
                <ul className="list-disc list-inside space-y-2 text-white/40">
                  <li><strong className="text-white/50">Cesión:</strong> Usted no podrá ceder ni transferir sus derechos u obligaciones bajo estos Términos sin el consentimiento previo y por escrito de WITHMIA.</li>
                  <li><strong className="text-white/50">Divisibilidad:</strong> Si alguna disposición de estos Términos fuere declarada nula o inaplicable, las demás disposiciones mantendrán su plena vigencia y efecto.</li>
                  <li><strong className="text-white/50">Acuerdo completo:</strong> Estos Términos, junto con la Política de Privacidad, constituyen el acuerdo completo entre las partes respecto al uso del Servicio.</li>
                  <li><strong className="text-white/50">Renuncia:</strong> La falta de ejercicio de cualquier derecho por parte de WITHMIA no constituirá una renuncia al mismo.</li>
                  <li><strong className="text-white/50">Fuerza mayor:</strong> Ninguna de las partes será responsable por el incumplimiento de sus obligaciones causado por eventos de fuerza mayor, caso fortuito u otras circunstancias fuera de su control razonable.</li>
                </ul>
              </div>

              {/* 15 */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">15. Contacto</h2>
                <p>
                  Para consultas sobre estos Términos y Condiciones, puede contactarnos a través de:
                </p>
                <div className="mt-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2 text-[14px]">
                  <p><strong className="text-white/60">Empresa:</strong> Atlantis Producciones SpA</p>
                  <p><strong className="text-white/60">Email:</strong>{" "}
                    <a href="mailto:legal@withmia.com" className="text-blue-400/70 hover:text-blue-400 transition-colors">
                      legal@withmia.com
                    </a>
                  </p>
                  <p><strong className="text-white/60">Sitio web:</strong>{" "}
                    <a href="https://withmia.com" className="text-blue-400/70 hover:text-blue-400 transition-colors">
                      withmia.com
                    </a>
                  </p>
                  <p><strong className="text-white/60">Ubicación:</strong> Santiago, Chile</p>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default Terms;
