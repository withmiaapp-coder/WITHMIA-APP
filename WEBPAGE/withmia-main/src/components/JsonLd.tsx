import { Helmet } from "react-helmet-async";

/** Organization schema — include on homepage */
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WITHMIA",
    url: "https://withmia.com",
    logo: "https://withmia.com/logos/logo-withmia.png",
    description:
      "Plataforma de IA conversacional omnicanal para automatizar ventas y atención al cliente.",
    sameAs: [
      "https://www.facebook.com/automatiza.withmia",
      "https://www.instagram.com/automatiza_withmia/",
      "https://www.linkedin.com/company/withmia",
      "https://www.youtube.com/@withyou-withmia",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      url: "https://withmia.com/contacto",
      availableLanguage: ["es"],
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/** SoftwareApplication schema — include on homepage or pricing */
export function SoftwareAppJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "WITHMIA",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://withmia.com",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Plan gratuito disponible. Planes premium desde $18/mes.",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/** FAQPage schema — include on /faq page */
export function FaqJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
