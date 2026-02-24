import { lazy, Suspense } from "react";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ToolsCarousel } from "@/components/ToolsCarousel";
import { Footer } from "@/components/Footer";
import { LazyLoadSection } from "@/components/ui/lazy-load-section";
import { SEO } from "@/components/SEO";
import { OrganizationJsonLd, SoftwareAppJsonLd } from "@/components/JsonLd";

// Lazy load heavy components
const Dashboard = lazy(() => import("@/components/Dashboard").then(mod => ({ default: mod.Dashboard })));
const Integrations = lazy(() => import("@/components/Integrations").then(mod => ({ default: mod.Integrations })));

// New sections
const LiveDemo = lazy(() => import("@/components/LiveDemo").then(mod => ({ default: mod.LiveDemo })));
const Testimonials = lazy(() => import("@/components/Testimonials").then(mod => ({ default: mod.Testimonials })));

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO path="/" />
      <OrganizationJsonLd />
      <SoftwareAppJsonLd />
      <Navigation />
      <main>
        <Hero />
        <ToolsCarousel />
        <Suspense fallback={<div className="min-h-[600px]" />}>
          {/* Live Demo — right after carousel */}
          <LazyLoadSection>
            <LiveDemo />
          </LazyLoadSection>

          {/* Dashboard — invitation to platform */}
          <LazyLoadSection>
            <Dashboard />
          </LazyLoadSection>

          {/* Channels & Integrations */}
          <LazyLoadSection>
            <Integrations />
          </LazyLoadSection>

          {/* Social proof — testimonials at end */}
          <LazyLoadSection>
            <Testimonials />
          </LazyLoadSection>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
