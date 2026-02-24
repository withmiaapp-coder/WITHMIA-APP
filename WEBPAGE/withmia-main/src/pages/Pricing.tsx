import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Pricing as MainPricing } from "@/components/Pricing";
import { SEO } from "@/components/SEO";

export default function Pricing() {
  return (
    <div className="min-h-screen relative">
      <SEO title="Precios" description="Planes flexibles de WITHMIA. Desde gratis hasta enterprise. IA conversacional, inbox omnicanal y automatización para tu equipo." path="/precios" />
      <Navigation />
      <main className="pt-20 relative overflow-hidden">
        <MainPricing />
      </main>
      <Footer />
    </div>
  );
}
