import { PlatformHero } from "@/components/PlatformHero";
import { AIShowcase } from "@/components/AIShowcase";
import { ComparisonTable } from "@/components/ComparisonTable";
const Solutions = () => {
  return (
    <div className="min-h-screen">
      <main>
        {/* Hero — Screenshot de la plataforma + features */}
        <PlatformHero />

        {/* AI Engine — 4-stage pipeline */}
        <AIShowcase />

        {/* Comparativa */}
        <ComparisonTable />
      </main>
    </div>
  );
};

export default Solutions;