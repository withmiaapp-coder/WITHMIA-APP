import logo from "@/assets/logo-withmia.png";
import { Instagram, Linkedin, Youtube, Facebook } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] bg-background">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-10">
          {/* Brand column */}
          <div className="space-y-5 lg:max-w-[280px] shrink-0">
            <div className="flex items-center gap-3">
              <img src={logo} alt="WITHMIA" className="h-8 w-8" />
              <span className="text-lg font-bold text-white">
                WITH<span className="font-extrabold">MIA</span>
                <sup className="text-[0.5em] font-normal">®</sup>
              </span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">
              Una plataforma inteligente con IA conversacional que potencia tus ventas y automatiza la atención de tu negocio.
            </p>
            <p className="text-sm font-medium tracking-wide">
              <span className="text-white/30">With you,</span>{" "}
              <span className="text-white/70">WITHMIA</span>
            </p>
          </div>

          {/* Links — 4 columns together */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 flex-1">
            {/* PRODUCTO */}
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-5">
                Producto
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/plataforma" className="text-white/40 hover:text-white transition-colors">
                    Plataforma
                  </a>
                </li>
                <li>
                  <a href="/pymes" className="text-white/40 hover:text-white transition-colors">
                    PYMEs
                  </a>
                </li>
                <li>
                  <a href="/precios" className="text-white/40 hover:text-white transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="/integraciones" className="text-white/40 hover:text-white transition-colors">
                    Integraciones
                  </a>
                </li>
                <li>
                  <a href="/api" className="text-white/40 hover:text-white transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>

            {/* EMPRESA */}
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-5">
                Empresa
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/nosotros" className="text-white/40 hover:text-white transition-colors">
                    Nosotros
                  </a>
                </li>
                <li>
                  <a href="/contacto" className="text-white/40 hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="/inversores" className="text-white/40 hover:text-white transition-colors">
                    Financiamiento e Inversión
                  </a>
                </li>
                <li>
                  <a href="/privacidad" className="text-white/40 hover:text-white transition-colors">
                    Políticas de Privacidad
                  </a>
                </li>
                <li>
                  <a href="/terminos" className="text-white/40 hover:text-white transition-colors">
                    Términos y Condiciones
                  </a>
                </li>
              </ul>
            </div>

            {/* SOPORTE */}
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-5">
                Soporte
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/ayuda" className="text-white/40 hover:text-white transition-colors">
                    Centro de Ayuda
                  </a>
                </li>
                <li>
                  <a href="/soporte" className="text-white/40 hover:text-white transition-colors">
                    Contactar Soporte
                  </a>
                </li>
                <li>
                  <a href="/docs" className="text-white/40 hover:text-white transition-colors">
                    Documentación
                  </a>
                </li>
                <li>
                  <a href="/faq" className="text-white/40 hover:text-white transition-colors">
                    Preguntas Frecuentes
                  </a>
                </li>
                <li>
                  <a href="/comunidad" className="text-white/40 hover:text-white transition-colors">
                    Comunidad
                  </a>
                </li>
                <li>
                  <a href="/mi-cuenta" className="text-white/40 hover:text-white transition-colors">
                    Mi Cuenta
                  </a>
                </li>
              </ul>
            </div>

            {/* SOCIAL */}
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-5">
                Social
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="https://www.facebook.com/automatiza.withmia" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors flex items-center gap-2">
                    <Facebook className="w-4 h-4" /> Facebook
                  </a>
                </li>
                <li>
                  <a href="https://www.youtube.com/@withyou-withmia" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors flex items-center gap-2">
                    <Youtube className="w-4 h-4" /> YouTube
                  </a>
                </li>
                <li>
                  <a href="https://www.instagram.com/automatiza_withmia/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors flex items-center gap-2">
                    <Instagram className="w-4 h-4" /> Instagram
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/company/withmia" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors flex items-center gap-2">
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Inversores / Atlantis */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            {/* Financiamiento */}
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
                Financiamiento e Inversión
              </p>
              <a
                href="/inversores"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-emerald-500/15 bg-emerald-950/10 hover:border-emerald-400/30 hover:bg-emerald-950/20 hover:shadow-[0_0_30px_rgba(52,211,153,0.06)] transition-all duration-500 group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400/60 group-hover:text-emerald-400 transition-colors duration-500" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-white/40 group-hover:text-emerald-200/90 transition-colors duration-500">
                  Conoce nuestro proceso de inversión
                </span>
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-white/20 group-hover:text-emerald-400/60 group-hover:translate-x-0.5 transition-all duration-500" fill="currentColor">
                  <path fillRule="evenodd" d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z" clipRule="evenodd" />
                </svg>
              </a>
            </div>

            {/* Powered by */}
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.2em] mb-3">
                Powered by
              </p>
              <a
                href="https://atlantisproducciones.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-amber-400/35 hover:bg-gradient-to-r hover:from-amber-950/25 hover:to-amber-900/10 hover:shadow-[0_0_30px_rgba(217,169,56,0.08)] transition-all duration-500 ease-out group"
              >
                <img
                  src="/Logo-Atlantis.webp"
                  alt="Atlantis Producciones"
                  className="w-8 h-8 object-contain shrink-0 opacity-70 group-hover:opacity-100 transition-all duration-500"
                />
                <span className="text-sm font-medium text-white/40 group-hover:text-amber-100/90 transition-colors duration-500 tracking-wide">
                  Atlantis Producciones
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
};
