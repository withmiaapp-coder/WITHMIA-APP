import { useLocation, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Home, Search, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Página no encontrada" description="La página que buscas no existe." path={location.pathname} noindex />
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-16">
        <div className="text-center max-w-lg">
          {/* 404 badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/15 bg-amber-500/[0.04] mb-8">
            <Search className="w-3.5 h-3.5 text-amber-400/60" />
            <span className="text-[11px] font-semibold text-amber-300/60 uppercase tracking-widest">Error 404</span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold text-white mb-4">404</h1>
          <p className="text-xl text-white/60 mb-3 font-medium">Página no encontrada</p>
          <p className="text-sm text-white/35 mb-8 leading-relaxed max-w-sm mx-auto">
            La página <span className="text-white/50 font-mono text-xs bg-white/5 px-2 py-0.5 rounded">{location.pathname}</span> no existe o ha sido movida.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 text-white/70 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver atrás
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-[0_2px_12px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] transition-all"
            >
              <Home className="w-4 h-4" />
              Ir al Inicio
            </Link>
          </div>

          {/* Quick links */}
          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-xs text-white/25 uppercase tracking-wider mb-4">Páginas populares</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "Plataforma", to: "/plataforma" },
                { label: "Precios", to: "/precios" },
                { label: "Contacto", to: "/contacto" },
                { label: "Ayuda", to: "/ayuda" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-1.5 text-xs text-white/40 hover:text-white border border-white/[0.06] rounded-md hover:bg-white/[0.04] transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
