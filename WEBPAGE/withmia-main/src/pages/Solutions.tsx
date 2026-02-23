import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ComparisonTable } from "@/components/ComparisonTable";
import { UseCases } from "@/components/UseCases";
import { AIShowcase } from "@/components/AIShowcase";

const Solutions = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 pb-32">
        {/* AI Engine — 4-stage pipeline */}
        <AIShowcase />

        {/* Comparativa */}
        <ComparisonTable />

        {/* Casos de uso por industria */}
        <UseCases />
      </main>

      <Footer />
    </div>
  );
};

export default Solutions;