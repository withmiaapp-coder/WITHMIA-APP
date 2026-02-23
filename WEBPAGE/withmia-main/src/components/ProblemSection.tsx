import { Card } from "@/components/ui/card";

const stats = [
  {
    title: "24h",
    description: "Promedio que tardan las PYMEs en contestar un lead digital cuando no tienen automatización.",
  },
  {
    title: "30-40%",
    description: "Porcentaje de oportunidades perdidas por respuestas tardías y procesos manuales.",
  },
  {
    title: "100x",
    description: "Más probabilidades de convertir cuando respondes en menos de 5 minutos (Impulse, 2023).",
  },
  {
    title: "391%",
    description: "Incremento posible en conversiones si respondes dentro del primer minuto (Rep.ai, 2024).",
  },
];

const painPoints = [
  {
    label: "Desarticulación operativa",
    description: "Datos desperdigados en hojas de cálculo, chats y formularios que no conversan entre sí.",
  },
  {
    label: "Barreras de acceso",
    description: "Soluciones genéricas y costosas que no se adaptan a cómo trabaja una PYME real.",
  },
  {
    label: "Dependencia humana",
    description: "Equipos respondiendo manualmente tareas repetitivas 24/7, con alto costo operativo.",
  },
];

export const ProblemSection = () => {
  return (
    <section className="py-10 px-4" id="problema">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/10 shadow-[var(--shadow-xs)] text-sm text-amber-400 font-semibold">
            Brecha en LATAM
          </div>
          <h2 className="text-2xl md:text-3xl font-bold leading-tight text-white">
            Las PYMEs operan en canales digitales, pero{" "}
            <span className="text-gradient">siguen respondiendo como en 1999</span>
          </h2>
          <p className="text-base text-white/50">
            WITHMIA nace porque vimos una realidad: la mayoría de negocios tiene WhatsApp, Instagram o web, pero
            todo funciona manual, fragmentado y sin contexto. Eso se traduce en horas perdidas, leads sin respuesta
            y equipos agotados.
          </p>

          <div className="space-y-4">
            {painPoints.map(point => (
              <div key={point.label} className="flex gap-3">
                <div className="mt-1.5 w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">{point.label}</p>
                  <p className="text-sm text-white/50">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <Card
              key={stat.title}
              className="p-6 glass-card rounded-2xl animate-fade-in hover:shadow-[var(--shadow-elegant)] hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <p className="text-3xl font-bold text-gradient mb-2">{stat.title}</p>
              <p className="text-sm text-white/50">{stat.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

