const tools = [
  { name: "WhatsApp", logo: "/icons/whatsapp.webp" },
  { name: "Instagram", logo: "/icons/instagram-new.webp" },
  { name: "Messenger", logo: "/icons/facebook-new.webp" },
  { name: "Gmail", logo: "/icons/gmail-new.webp" },
  { name: "Chat Web", logo: "/icons/web-new.webp" },
  { name: "API REST", logo: "/icons/api-final.webp" },
  { name: "WooCommerce", logo: "/logos/woocommerce.svg" },
  { name: "Shopify", logo: "/logos/shopify.svg" },
  { name: "Google Calendar", logo: "/logos/google-calendar.svg" },
  { name: "AgendaPro", logo: "/icons/agendapro-icon.svg" },
  { name: "Reservo", logo: "/icons/reservo.webp" },
  { name: "Dentalink", logo: "/logos/dentalink.svg" },
  { name: "Medilink", logo: "/logos/medilink.svg" },
  { name: "MercadoLibre", logo: "/logos/mercadolibre.svg" },
  { name: "Webhooks", logo: "/logos/webhooks.svg" },
  { name: "Calendly", logo: "/logos/calendly.svg" },
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
          <div
            key={`${tool.name}-${i}`}
            className="flex items-center gap-2.5 shrink-0 px-4 py-2 rounded-xl hover:bg-white/[0.05] transition-all duration-300 group"
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
          </div>
        ))}
      </div>
    </section>
  );
};
