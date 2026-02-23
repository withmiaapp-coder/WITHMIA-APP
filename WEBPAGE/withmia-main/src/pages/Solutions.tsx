import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PlatformHero } from "@/components/PlatformHero";
import { AIShowcase } from "@/components/AIShowcase";
import { ComparisonTable } from "@/components/ComparisonTable";

const Solutions = () => {
  return (
    <div className="min-h-screen">
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