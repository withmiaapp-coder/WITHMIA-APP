import { lazy, Suspense } from "react";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ToolsCarousel } from "@/components/ToolsCarousel";
import { Footer } from "@/components/Footer";
import { LazyLoadSection } from "@/components/ui/lazy-load-section";


// Lazy load heavy components
const Dashboard = lazy(() => import("@/components/Dashboard").then(mod => ({ default: mod.Dashboard })));
const HowItWorks = lazy(() => import("@/components/HowItWorks").then(mod => ({ default: mod.HowItWorks })));
const Integrations = lazy(() => import("@/components/Integrations").then(mod => ({ default: mod.Integrations })));
const ProblemSection = lazy(() => import("@/components/ProblemSection").then(mod => ({ default: mod.ProblemSection })));
const FAQ = lazy(() => import("@/components/FAQ").then(mod => ({ default: mod.FAQ })));
const FinalCTA = lazy(() => import("@/components/FinalCTA").then(mod => ({ default: mod.FinalCTA })));

// New sections
const BeforeAfter = lazy(() => import("@/components/BeforeAfter").then(mod => ({ default: mod.BeforeAfter })));
const LiveDemo = lazy(() => import("@/components/LiveDemo").then(mod => ({ default: mod.LiveDemo })));
const Testimonials = lazy(() => import("@/components/Testimonials").then(mod => ({ default: mod.Testimonials })));
const ComparisonTable = lazy(() => import("@/components/ComparisonTable").then(mod => ({ default: mod.ComparisonTable })));
const Timeline = lazy(() => import("@/components/Timeline").then(mod => ({ default: mod.Timeline })));

const Index = () => {
  return (
    <div className="min-h-screen">
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
