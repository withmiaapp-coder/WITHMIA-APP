

import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Pricing as MainPricing } from "@/components/Pricing";

export default function Pricing() {
  return (
    <div className="min-h-screen relative">
      <Navigation />
      <main className="pt-20 relative overflow-hidden">
        <MainPricing />
      </main>
      <Footer />
    </div>
  );
}
