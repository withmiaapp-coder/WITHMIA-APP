import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";
import { Rocket, Users, Heart, Globe, Zap, Target, ArrowRight } from "lucide-react";

const About = () => {
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
            <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-500/[0.03] rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-950/30 mb-8">
              <Heart className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-300/80 tracking-wide">With you, WITHMIA</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Construimos el futuro de la
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
                comunicación empresarial
              </span>
            </h1>

            <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
              Somos un equipo apasionado por la tecnología y la inteligencia artificial,
              enfocados en democratizar herramientas de comunicación avanzadas para
              empresas de todos los tamaños en Latinoamérica.
            </p>
          </div>
        </section>

        {/* ── NUESTRA MISIÓN ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest mb-4">
                  Nuestra misión
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                  Que cada empresa pueda comunicarse como las grandes
                </h2>
                <p className="text-white/40 leading-relaxed mb-6">
                  En WITHMIA creemos que la tecnología de comunicación inteligente no debería
                  ser un privilegio de las grandes corporaciones. Nuestra misión es empoderar
                  a PYMEs y empresas en crecimiento con herramientas de IA conversacional
                  que transformen cómo se conectan con sus clientes.
                </p>
                <p className="text-white/40 leading-relaxed">
                  Cada interacción cuenta. Cada mensaje es una oportunidad. Y con la IA adecuada,
                  cada empresa puede ofrecer una experiencia excepcional a sus clientes,
                  sin importar su tamaño.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Rocket, label: "Innovación", desc: "IA conversacional de última generación adaptada al mercado LATAM" },
                  { icon: Users, label: "Accesibilidad", desc: "Herramientas enterprise al alcance de cualquier empresa" },
                  { icon: Globe, label: "Impacto", desc: "Transformando la comunicación empresarial en toda Latinoamérica" },
                  { icon: Target, label: "Enfoque", desc: "Soluciones pensadas para las necesidades reales de las PYMEs" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-violet-500/15 hover:bg-violet-950/10 transition-all duration-500 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/15 transition-colors duration-500">
                      <item.icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">{item.label}</h3>
                    <p className="text-xs text-white/30 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── VALORES ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-violet-400/60 uppercase tracking-widest mb-4">
                Lo que nos define
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Nuestros valores
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Cercanía",
                  desc: "Entendemos los desafíos de las empresas en LATAM porque somos parte de este ecosistema. No somos una solución genérica: construimos para y con nuestra comunidad.",
                  gradient: "from-violet-500/20 to-violet-500/5",
                },
                {
                  title: "Excelencia Técnica",
                  desc: "Cada línea de código importa. Desde la latencia de nuestra IA hasta la experiencia de usuario, buscamos la excelencia en cada detalle técnico.",
                  gradient: "from-amber-500/20 to-amber-500/5",
                },
                {
                  title: "Transparencia",
                  desc: "Creemos en relaciones honestas con nuestros clientes, inversores y equipo. Comunicamos abiertamente nuestros avances, retos y visión.",
                  gradient: "from-emerald-500/20 to-emerald-500/5",
                },
              ].map((value, i) => (
                <div
                  key={i}
                  className="relative p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden group hover:border-white/[0.1] transition-all duration-500"
                >
                  <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${value.gradient}`} />
                  <h3 className="text-xl font-bold text-white mb-4">{value.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── NUESTRA HISTORIA ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest mb-4">
                Nuestra historia
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                De una idea a una plataforma
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                WITHMIA nació de una necesidad real: las empresas en Latinoamérica
                necesitan comunicarse mejor con sus clientes, pero las herramientas
                disponibles eran demasiado caras o demasiado complejas.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  period: "El inicio",
                  title: "Identificar el problema",
                  desc: "Vimos cómo las PYMEs en Chile y LATAM perdían clientes por no poder responder a tiempo o gestionar múltiples canales. La comunicación empresarial estaba rota.",
                },
                {
                  period: "La construcción",
                  title: "Desarrollar la solución",
                  desc: "Construimos una plataforma omnicanal con IA conversacional propia, diseñada desde cero para el mercado hispanohablante. WhatsApp, Instagram, Email y más en un solo lugar.",
                },
                {
                  period: "El crecimiento",
                  title: "Validar con el mercado",
                  desc: "Empresas reales comenzaron a usar WITHMIA, validando nuestro enfoque. Cada feedback nos hizo mejores. Cada cliente nos confirmó que íbamos en la dirección correcta.",
                },
                {
                  period: "Hoy",
                  title: "Escalar el impacto",
                  desc: "Estamos en proceso de levantamiento de fondos y aceleración, profesionalizando cada aspecto de la empresa para llevar WITHMIA a toda Latinoamérica.",
                },
              ].map((step, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className="shrink-0 w-20 pt-1">
                    <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">
                      {step.period}
                    </span>
                  </div>
                  <div className="flex-1 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] group-hover:border-violet-500/15 group-hover:bg-violet-950/5 transition-all duration-500">
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BACKED BY ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-4">
              Desarrollado por
            </p>
            <a
              href="https://atlantisproducciones.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-4 px-8 py-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-amber-400/30 hover:bg-gradient-to-r hover:from-amber-950/20 hover:to-amber-900/5 transition-all duration-500 group"
            >
              <img
                src="/Logo-Atlantis.webp"
                alt="Atlantis Producciones"
                className="w-10 h-10 object-contain opacity-70 group-hover:opacity-100 transition-all duration-500"
              />
              <div className="text-left">
                <p className="text-base font-semibold text-white/60 group-hover:text-amber-100/90 transition-colors duration-500">
                  Atlantis Producciones
                </p>
                <p className="text-xs text-white/25 group-hover:text-white/40 transition-colors">
                  Innovación tecnológica desde Chile
                </p>
              </div>
            </a>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 border-t border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              ¿Listo para transformar tu comunicación?
            </h2>
            <p className="text-white/40 mb-10 max-w-xl mx-auto">
              Únete a las empresas que ya confían en WITHMIA para conectar con sus clientes
              de forma inteligente.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://app.withmia.com"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,158,11,0.2)] hover:-translate-y-px"
              >
                Comenzar Ahora
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/contacto"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 hover:text-white hover:border-white/[0.2] font-medium transition-all duration-300"
              >
                Contactar al equipo
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default About;
