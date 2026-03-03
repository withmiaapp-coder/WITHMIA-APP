const tools = [
  { name: "WhatsApp", logo: "/icons/whatsapp.webp", url: "https://www.whatsapp.com" },
  { name: "Instagram", logo: "/icons/instagram-new.webp", url: "https://www.instagram.com" },
  { name: "Messenger", logo: "/icons/facebook-new.webp", url: "https://www.messenger.com" },
  { name: "Gmail", logo: "/icons/gmail-new.webp", url: "https://mail.google.com" },
  { name: "Chat Web", logo: "/icons/web-new.webp", url: "https://withmia.com/integraciones" },
  { name: "API REST", logo: "/icons/api-final.webp", url: "https://withmia.com/integraciones" },
  { name: "WooCommerce", logo: "/logos/woocommerce.svg", url: "https://woocommerce.com" },
  { name: "Shopify", logo: "/logos/shopify.svg", url: "https://www.shopify.com" },
  { name: "Google Calendar", logo: "/logos/google-calendar.svg", url: "https://calendar.google.com" },
  { name: "AgendaPro", logo: "/icons/agendapro-icon.svg", url: "https://www.agendapro.com" },
  { name: "Reservo", logo: "/icons/reservo.webp", url: "https://www.reservo.cl" },
  { name: "Dentalink", logo: "/logos/dentalink.svg", url: "https://www.dentalink.com" },
  { name: "Medilink", logo: "/logos/medilink.svg", url: "https://www.medilink.cl" },
  { name: "MercadoLibre", logo: "/logos/mercadolibre.svg", url: "https://www.mercadolibre.cl" },
  { name: "Webhooks", logo: "/logos/webhooks.svg", url: "https://withmia.com/integraciones" },
  { name: "Calendly", logo: "/logos/calendly.svg", url: "https://calendly.com" },
];

// Triple for seamless infinite scroll
const tripled = [...tools, ...tools, ...tools];

export const ToolsCarousel = () => {
  return (
    <section className="relative bg-background py-4 overflow-hidden border-y border-white/[0.06]">
      {/* Ambient golden glow top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent pointer-events-none" />
      {/* Ambient golden glow bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent pointer-events-none" />

      {/* Fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Scrolling track */}
      <div className="flex animate-scroll-x gap-6 items-center w-max">
        {tripled.map((tool, i) => (
          <a
            key={`${tool.name}-${i}`}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 shrink-0 px-4 py-2 rounded-xl hover:bg-white/[0.05] transition-all duration-300 group cursor-pointer"
          >
            <img
              src={tool.logo}
              alt={tool.name}
              loading="lazy"
              className="w-6 h-6 object-contain group-hover:scale-110 transition-transform duration-300"
              style={tool.name === 'Chat Web' ? { filter: 'brightness(0) invert(1)' } : undefined}
            />
            <span className="text-sm text-white/40 group-hover:text-amber-300/90 font-medium whitespace-nowrap transition-colors duration-300">
              {tool.name}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
};
