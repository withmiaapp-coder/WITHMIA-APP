import logo from "@/assets/logo-withmia.png";
import { Menu, X, ChevronDown, MessageSquare, Bot, Plug, BarChart3, Code, Sparkles } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const menuItems = [
  { label: "Precios", path: "/precios" },
  { label: "Nosotros", path: "/nosotros" },
];

const productSections = {
  main: {
    title: "PLATAFORMA",
    items: [
      {
        icon: MessageSquare,
        name: "WITHMIA Platform",
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
      {/* Floating nav bar */}
      <nav
        className="pointer-events-auto mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-4 rounded-2xl bg-background/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.35)]"
      >
          <div className="px-5 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
                <img src={logo} alt="WITHMIA" className="w-9 h-9" />
                <span className="text-lg font-bold tracking-tight text-white">
                  WITH<span className="font-extrabold">MIA</span>
                  <sup className="text-[0.45em] font-normal ml-0.5">®</sup>
                </span>
              </a>

              {/* Desktop links — center */}
              <div className="hidden lg:flex items-center gap-7">
                {/* Producto dropdown */}
                <div
                  className="relative"
                  onMouseEnter={openProduct}
                  onMouseLeave={closeProduct}
                >
                  <button className="flex items-center gap-1 text-[0.9rem] font-medium text-white/70 hover:text-white transition-colors duration-200">
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
                                  className="w-full flex flex-col items-center text-center px-4 py-6 rounded-xl hover:bg-white/[0.04] transition-colors duration-200 group"
                                >
                                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] group-hover:border-white/[0.12] transition-all">
                                    <item.icon className="w-5 h-5 text-white/50 group-hover:text-white/90 transition-colors" />
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
                <a
                  href="https://app.withmia.com"
                  className="text-[0.9rem] font-medium text-white/70 hover:text-white transition-colors duration-200"
                >
                  Iniciar Sesión
                </a>
                <a href="https://app.withmia.com">
                  <button className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-[0_2px_12px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:-translate-y-px transition-all duration-300">
                    Comenzar Ahora
                  </button>
                </a>
              </div>

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 -mr-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                <a
                  href="https://app.withmia.com"
                  className="text-white/70 hover:text-white hover:bg-white/[0.06] font-medium transition-all py-3 px-3 text-left w-full rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Iniciar Sesión
                </a>
                <a
                  href="https://app.withmia.com"
                  className="w-full mt-2"
                >
                  <button className="w-full px-5 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-[0_2px_12px_rgba(245,158,11,0.3)] transition-all duration-300">
                    Comenzar Ahora
                  </button>
                </a>
              </div>
            </div>
          )}
        </nav>
    </header>
  );
};