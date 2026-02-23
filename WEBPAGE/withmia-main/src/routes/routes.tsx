import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

// Lazy load components
const Index = lazy(() => import('@/pages/Index'));
const Contact = lazy(() => import('@/pages/Contact'));
const Solutions = lazy(() => import('@/pages/Solutions'));
const SolucionesPymes = lazy(() => import('@/pages/SolucionesPymes'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Investors = lazy(() => import('@/pages/Investors'));
const About = lazy(() => import('@/pages/About'));
const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage'));
const ApiPage = lazy(() => import('@/pages/ApiPage'));
const DocumentationPage = lazy(() => import('@/pages/DocumentationPage'));
const Terms = lazy(() => import('@/pages/Terms'));
const HelpCenter = lazy(() => import('@/pages/HelpCenter'));
const Support = lazy(() => import('@/pages/Support'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const Community = lazy(() => import('@/pages/Community'));
const MyAccount = lazy(() => import('@/pages/MyAccount'));

// Simple loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/contacto" element={<Contact />} />
        <Route path="/plataforma" element={<Solutions />} />
        <Route path="/soluciones" element={<Solutions />} />
        <Route path="/pymes" element={<SolucionesPymes />} />
        <Route path="/soluciones/pymes" element={<SolucionesPymes />} />
        <Route path="/integraciones" element={<IntegrationsPage />} />
        <Route path="/api" element={<ApiPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/precios" element={<Pricing />} />
        <Route path="/nosotros" element={<About />} />
        <Route path="/privacidad" element={<Privacy />} />
        <Route path="/terminos" element={<Terms />} />
        <Route path="/ayuda" element={<HelpCenter />} />
        <Route path="/soporte" element={<Support />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/comunidad" element={<Community />} />
        <Route path="/mi-cuenta" element={<MyAccount />} />
        <Route path="/inversores" element={<Investors />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};