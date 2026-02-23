

import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Pricing as MainPricing } from "@/components/Pricing";

export default function Pricing() {
  return (
    <div className="min-h-screen relative">
      <Navigation />
      <main className="pt-20 relative overflow-hidden">
        {/* Fondo dorado y animaciones solo en el contenido principal */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
        <div className="relative z-10">
          <MainPricing />
        </div>
      </main>
      <Footer />
    </div>
  );
}
