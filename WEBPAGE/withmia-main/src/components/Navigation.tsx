import logo from "@/assets/logo-withmia.png";
import { Menu, X, ChevronDown, Bot, Plug, BarChart3, Code, Sparkles, MessageCircle, Users, Inbox, Zap } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate, Link } from "@/lib/router";
import { trackCTAClick } from "@/lib/analytics";

const menuItems = [
  { label: "Precios", path: "/precios" },
  { label: "Nosotros", path: "/nosotros" },
];

const productSections = {
  main: {
    title: "PLATAFORMA",
    items: [
      {
        icon: Inbox,
        name: "Withmia App",
        desc: "Inbox omnicanal con IA para todo tu equipo",
        path: "/plataforma",
      },
    ],
  },
  modules: {
    title: "MÓDULOS",
    items: [
      {
        icon: Sparkles,
        name: "Pensado para PYMEs",
        desc: "Soluciones accesibles para pequeñas y medianas empresas",
        path: "/pymes",
      },
      {
        icon: Plug,
        name: "Integraciones",
        desc: "Conecta WhatsApp, Instagram, Email y más",
        path: "/integraciones",
      },
      {
        icon: Code,
        name: "API",
        desc: "API REST para integraciones avanzadas",
        path: "/api",
      },
      {
        icon: BarChart3,
        name: "Documentación",
        desc: "Guías técnicas y referencias completas",
        path: "/docs",
      },
    ],
  },
};

export const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const openProduct = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setProductOpen(true);
  };
  const closeProduct = () => {
    timeoutRef.current = setTimeout(() => setProductOpen(false), 150);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 pointer-events-none">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="pointer-events-auto sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-amber-500 focus:text-black focus:font-semibold focus:text-sm focus:outline-none"
      >
        Saltar al contenido
      </a>
      {/* Floating nav bar */}
      <nav
        className="pointer-events-auto mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-4 rounded-2xl bg-background/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.35)]"
      >
          <div className="px-5 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
                <img src={logo} alt="WITHMIA" className="w-9 h-9" />
                <span className="text-lg font-bold tracking-tight text-white">
                  WITH<span className="font-extrabold">MIA</span>
                  <sup className="text-[0.45em] font-normal ml-0.5">®</sup>
                </span>
              </Link>

              {/* Desktop links — center */}
              <div className="hidden lg:flex items-center gap-7">
                {/* Producto dropdown */}
                <div
                  className="relative"
                  onMouseEnter={openProduct}
                  onMouseLeave={closeProduct}
                >
                  <button
                    className="flex items-center gap-1 text-[0.9rem] font-medium text-white/70 hover:text-white transition-colors duration-200"
                    aria-expanded={productOpen}
                    aria-haspopup="true"
                  >
                    Producto
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${productOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Mega dropdown */}
                  {productOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4">
                      <div className="w-[580px] rounded-2xl border border-white/[0.08] bg-[#0a0a12]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="grid grid-cols-2 gap-0">
                          {/* Left — Plataforma (featured card) */}
                          <div className="p-5 border-r border-white/[0.06] flex flex-col">
                            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.2em] mb-4 px-3">
                              {productSections.main.title}
                            </p>
                            <div className="flex-1 flex flex-col justify-center">
                              {productSections.main.items.map((item) => (
                                <button
                                  key={item.name}
                                  onClick={() => { setProductOpen(false); navigate(item.path); }}
                                  className="w-full flex flex-col items-center text-center px-4 py-5 rounded-xl hover:bg-white/[0.04] transition-colors duration-200 group"
                                >
                                  {/* Mini app preview */}
                                  <div className="w-full max-w-[200px] h-[72px] rounded-xl bg-white/[0.03] border border-white/[0.07] mb-4 overflow-hidden group-hover:border-white/[0.12] transition-all relative">
                                    {/* Mini sidebar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-white/[0.05] flex flex-col items-center gap-2 pt-2.5">
                                      <MessageCircle className="w-3 h-3 text-amber-400/60" />
                                      <Users className="w-3 h-3 text-white/20" />
                                      <Zap className="w-3 h-3 text-white/20" />
                                    </div>
                                    {/* Mini chat list */}
                                    <div className="absolute left-8 top-0 bottom-0 right-0 flex flex-col p-2 gap-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full bg-amber-400/15 border border-amber-400/20 shrink-0" />
                                        <div className="flex-1">
                                          <div className="h-[3px] w-14 rounded bg-white/15" />
                                          <div className="h-[2px] w-20 rounded bg-white/[0.06] mt-1" />
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                                      </div>
                                      <div className="flex items-center gap-1.5 opacity-50">
                                        <div className="w-4 h-4 rounded-full bg-white/[0.06] border border-white/[0.06] shrink-0" />
                                        <div className="flex-1">
                                          <div className="h-[3px] w-12 rounded bg-white/10" />
                                          <div className="h-[2px] w-16 rounded bg-white/[0.04] mt-1" />
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 opacity-30">
                                        <div className="w-4 h-4 rounded-full bg-white/[0.04] border border-white/[0.04] shrink-0" />
                                        <div className="flex-1">
                                          <div className="h-[3px] w-10 rounded bg-white/[0.08]" />
                                          <div className="h-[2px] w-14 rounded bg-white/[0.03] mt-1" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-[15px] font-semibold text-white/85 group-hover:text-white transition-colors mb-1.5">{item.name}</p>
                                  <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">{item.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Right — Módulos */}
                          <div className="p-5">
                            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.2em] mb-4 px-3">
                              {productSections.modules.title}
                            </p>
                            <div className="space-y-1">
                              {productSections.modules.items.map((item) => (
                                <button
                                  key={item.name}
                                  onClick={() => { setProductOpen(false); navigate(item.path); }}
                                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors duration-200 text-left group"
                                >
                                  <item.icon className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[13px] font-medium text-white/70 group-hover:text-white transition-colors flex items-center gap-2">
                                      {item.name}
                                      {"badge" in item && item.badge && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                          {item.badge}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-white/25 mt-0.5">{item.desc}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bottom CTA */}
                        <div className="border-t border-white/[0.06] px-5 py-3 flex items-center justify-between bg-white/[0.02]">
                          <p className="text-xs text-white/30">¿Quieres verlo en acción?</p>
                          <a
                            href="https://app.withmia.com"
                            onClick={() => trackCTAClick("probar_gratis_menu", "navigation")}
                            className="text-xs font-medium text-amber-400/80 hover:text-amber-300 transition-colors"
                          >
                            Probar gratis →
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="text-[0.9rem] font-medium text-white/70 hover:text-white transition-colors duration-200"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Right side — login + CTA */}
              <div className="hidden lg:flex items-center gap-4">
                <Link
                  to="/mi-cuenta"
                  className="text-[0.9rem] font-medium text-white/70 hover:text-white transition-colors duration-200"
                >
                  Mi Cuenta
                </Link>
                <a href="https://app.withmia.com" onClick={() => trackCTAClick("comenzar_ahora_nav", "navigation")} className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-[0_2px_12px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:-translate-y-px transition-all duration-300">
                    Comenzar Ahora
                </a>
              </div>

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 -mr-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Menu className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white/[0.06] bg-background/95 backdrop-blur-xl rounded-b-2xl">
              <div className="px-5 py-4 flex flex-col gap-1">
                {/* Producto section mobile */}
                <div className="mb-2">
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.2em] px-3 mb-2">Producto</p>
                  {[...productSections.main.items, ...productSections.modules.items].map((item) => (
                    <button
                      key={item.name}
                      className="flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/[0.06] font-medium transition-all py-2.5 px-3 text-left w-full rounded-lg text-sm"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate(item.path);
                      }}
                    >
                      <item.icon className="w-4 h-4 text-white/40" />
                      {item.name}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/[0.06] my-1" />
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    className="text-white/70 hover:text-white hover:bg-white/[0.06] font-medium transition-all py-3 px-3 text-left w-full rounded-lg"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(item.path);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <Link
                  to="/mi-cuenta"
                  className="text-white/70 hover:text-white hover:bg-white/[0.06] font-medium transition-all py-3 px-3 text-left w-full rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mi Cuenta
                </Link>
                <a
                  href="https://app.withmia.com"
                  onClick={() => trackCTAClick("comenzar_ahora_mobile", "navigation")}
                  className="w-full mt-2 block px-5 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold text-center shadow-[0_2px_12px_rgba(245,158,11,0.3)] transition-all duration-300"
                >
                    Comenzar Ahora
                </a>
              </div>
            </div>
          )}
        </nav>
    </header>
  );
};