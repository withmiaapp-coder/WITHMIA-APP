import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ProblemSection } from "@/components/ProblemSection";
import { BeforeAfter } from "@/components/BeforeAfter";
import { Timeline } from "@/components/Timeline";
import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SolucionesPymes = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 pb-32">
        {/* Problem & Before/After */}
        <ProblemSection />
        <BeforeAfter />

        {/* Timeline — Tu primer mes */}
        <Timeline />

        {/* Pricing Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-10 text-white">
              Planes{" "}
              <span className="text-gradient">asequibles</span>
              {" "}para tu PYME
            </h2>
            
            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-2 text-sm font-medium rounded-bl-lg">
                Más popular
              </div>
              
              <h3 className="text-2xl font-bold mb-2">Plan PYME</h3>
              <div className="flex justify-center items-baseline mb-8">
                <span className="text-3xl font-bold">$18</span>
                <span className="text-xl text-muted-foreground">/mes por canal</span>
              </div>
              
              <ul className="space-y-4 mb-8 text-left max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span>Asistente virtual 24/7</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span>Hasta 1,000 conversaciones/mes</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span>Integración WhatsApp + Web</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span>Dashboard de métricas</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span>Soporte prioritario</span>
                </li>
              </ul>
              
              <a href="https://app.withmia.com" className="block">
                <Button variant="hero" size="lg" className="w-full">
                  Comenzar prueba gratis
                  <ArrowRight className="ml-2" />
                </Button>
              </a>
              <p className="text-sm text-muted-foreground mt-4">
                No requiere tarjeta de crédito
              </p>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SolucionesPymes;