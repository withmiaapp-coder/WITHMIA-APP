import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PlatformHero } from "@/components/PlatformHero";
import { AIShowcase } from "@/components/AIShowcase";
import { ComparisonTable } from "@/components/ComparisonTable";
import { SEO } from "@/components/SEO";

const Solutions = () => {
  return (
    <div className="min-h-screen">
      <SEO title="Plataforma" description="Descubre WITHMIA: inbox omnicanal con IA, automatización de ventas, chatbots inteligentes y análisis en tiempo real para tu negocio." path="/plataforma" />
      <Navigation />

      <main>
        {/* Hero — Screenshot de la plataforma + features */}
        <PlatformHero />

        {/* AI Engine — 4-stage pipeline */}
        <AIShowcase />

        {/* Comparativa */}
        <ComparisonTable />
      </main>

      <Footer />
    </div>
  );
};

export default Solutions;