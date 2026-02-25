import { lazy, Suspense } from "react";
import { Hero } from "@/components/Hero";
import { ToolsCarousel } from "@/components/ToolsCarousel";
import { LazyLoadSection } from "@/components/ui/lazy-load-section";
// Lazy load heavy components
const Dashboard = lazy(() => import("@/components/Dashboard").then(mod => ({ default: mod.Dashboard })));
const Integrations = lazy(() => import("@/components/Integrations").then(mod => ({ default: mod.Integrations })));

// New sections
const LiveDemo = lazy(() => import("@/components/LiveDemo").then(mod => ({ default: mod.LiveDemo })));
const Testimonials = lazy(() => import("@/components/Testimonials").then(mod => ({ default: mod.Testimonials })));

const Index = () => {
  return (
    <div className="min-h-screen">
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
    </div>
  );
};

export default Index;
