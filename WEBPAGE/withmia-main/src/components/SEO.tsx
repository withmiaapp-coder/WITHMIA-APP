import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
}

const SITE_NAME = "WITHMIA";
const SITE_URL = "https://withmia.com";
const DEFAULT_DESCRIPTION =
  "Plataforma de IA conversacional omnicanal. Automatiza ventas, atención al cliente y seguimiento en WhatsApp, Instagram, Email y más. Más leads, más conversión, sin aumentar costos.";
const DEFAULT_IMAGE = `${SITE_URL}/dashboard-preview.png`;

/**
 * Per-page SEO meta tags via react-helmet-async.
 * Usage: <SEO title="Precios" description="..." path="/precios" />
 */
export const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
}: SEOProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — IA Conversacional Omnicanal para tu Negocio`;
  const canonicalUrl = `${SITE_URL}${path}`;

  return (
    <Helmet>
      {/* Basic */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="es_CL" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
