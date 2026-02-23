import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "¿Qué es MIA® y qué problema resuelve?",
    answer:
      "Es una plataforma SaaS de automatización conversacional que integra WhatsApp Business API, redes sociales, web y correo para responder en menos de 5 minutos, evitando la pérdida del 30-40% de oportunidades causada por procesos manuales.",
  },
  {
    question: "¿Qué necesito para comenzar?",
    answer:
      "Solo un número nuevo para WhatsApp o un sitio web activo, completar el formulario y agendar la reunión inicial. Firmamos NDA, configuramos canales y dejamos tu asistente listo en 24-48 h para el plan Demo.",
  },
  {
    question: "¿Puedo probar MIA® sin pagar?",
    answer:
      "Sí. WITHMIA Demo es gratis por 14 días, incluye 100 conversaciones, diagnóstico con el equipo y soporte básico. No requiere tarjeta de crédito.",
  },
  {
    question: "¿Qué incluye el plan de pago?",
    answer:
      "WITHMIA Suite ($18/mes por canal) ofrece conversaciones ilimitadas con IA contextual, workflows omnicanal, CRM integrado, reportes en tiempo real, integraciones y acompañamiento estratégico continuo.",
  },
  {
    question: "¿Necesito conocimientos técnicos?",
    answer:
      "No. Nuestro equipo configura, automatiza y mantiene todos los flujos. Tú defines objetivos y contenidos; nosotros lo implementamos y optimizamos.",
  },
  {
    question: "¿Puedo integrar mis herramientas actuales?",
    answer:
      "Sí. Conectamos formularios, Google Sheets, Google Calendar, CRMs y ecommerce como Shopify o WooCommerce para tener datos actualizados y acciones coordinadas.",
  },
  {
    question: "¿Hay permanencia o riesgos?",
    answer:
      "No existe contrato obligatorio. Si cancelas, desactivamos los asistentes y eliminamos la información según la Ley 19.628. Puedes cambiar de plan o pausar cuando quieras.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-10 px-4">
      <div className="max-w-5xl mx-auto text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/10 shadow-[var(--shadow-xs)] text-sm text-amber-400 font-semibold">
          FAQ
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mt-3 text-white">
          Todo lo que necesitas saber para{" "}
          <span className="text-gradient">activar WITHMIA</span>
        </h2>
        <p className="text-base text-white/50 mt-3">
          Información clara sobre planes, requisitos y acompañamiento. Si tienes otra pregunta, escríbenos a contacto@withmia.com.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`faq-${index}`}
              className="glass-card border border-white/10 rounded-2xl px-5 hover:shadow-[var(--shadow-md)] transition-shadow duration-300"
            >
              <AccordionTrigger className="text-left text-lg font-semibold text-white hover:text-violet-400 transition-colors">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-white/50 text-base pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

