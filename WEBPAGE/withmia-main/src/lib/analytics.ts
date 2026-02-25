/**
 * WITHMIA Analytics & SEM Service
 * Centralizes all tracking via GA4 (gtag.js) with dataLayer.
 * SEM-ready: Google Ads conversion tracking, gclid capture, remarketing.
 *
 * Setup:
 * 1. GA4 Measurement ID: G-8D0NNE2BBH (configured in Layout.astro)
 * 2. Google Ads: uncomment gtag('config', 'AW-XXXXXXXXX') in Layout.astro when ready
 * 3. All events are sent via gtag() → GA4 automatically
 * 4. dataLayer is also available for future GTM integration
 */

const GA4_ID = import.meta.env.VITE_GA4_ID || "G-8D0NNE2BBH";
// Set your Google Ads Conversion ID here when you have it:
const GADS_ID = import.meta.env.VITE_GADS_ID || "";

// ── Types ──
interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

interface DataLayerEvent {
  event: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
    gtag: (...args: unknown[]) => void;
  }
}

// ── Helpers ──
function pushToDataLayer(data: DataLayerEvent) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}

function sendToGA4(eventName: string, params?: Record<string, unknown>) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

// ── Page View ──
export function trackPageView(path: string, title: string) {
  sendToGA4("page_view", {
    page_path: path,
    page_title: title,
    send_to: GA4_ID,
  });
}

// ── CTA Clicks ──
export function trackCTAClick(ctaName: string, ctaLocation: string, destination?: string) {
  const params = {
    cta_name: ctaName,
    cta_location: ctaLocation,
    cta_destination: destination || "",
  };
  pushToDataLayer({ event: "cta_click", ...params });
  sendToGA4("cta_click", params);
}

// ── Form Submissions ──
export function trackFormSubmit(formName: string, formData?: EventParams) {
  const params = { form_name: formName, ...formData };
  pushToDataLayer({ event: "form_submit", ...params });
  sendToGA4("form_submit", params);
}

// ── Demo Request (also fires lead conversion) ──
export function trackDemoRequest(source: string) {
  const params = { request_source: source, ...getStoredUTM() };
  pushToDataLayer({ event: "demo_request", ...params });
  sendToGA4("generate_lead", { ...params, event_category: "demo" });
  // Uncomment when Google Ads conversion label is ready:
  // trackConversion('AW-XXXXXXXXX/demo_label');
}

// ── Scroll Depth ──
let scrollMilestones = new Set<number>();

export function initScrollTracking() {
  scrollMilestones = new Set<number>();
  
  const handler = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    
    const percent = Math.round((scrollTop / docHeight) * 100);
    
    [25, 50, 75, 100].forEach((milestone) => {
      if (percent >= milestone && !scrollMilestones.has(milestone)) {
        scrollMilestones.add(milestone);
        pushToDataLayer({
          event: "scroll_depth",
          scroll_percent: milestone,
        });
        sendToGA4("scroll_depth", { scroll_percent: milestone });
      }
    });
  };

  window.addEventListener("scroll", handler, { passive: true });
  return () => window.removeEventListener("scroll", handler);
}

// ── UTM + Click ID Capture (gclid, fbclid, msclkid) ──
export function captureUTMParams() {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  const utm: Record<string, string> = {};

  utmKeys.forEach((key) => {
    const value = params.get(key);
    if (value) utm[key] = value;
  });

  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem("withmia_utm", JSON.stringify(utm));
    pushToDataLayer({
      event: "utm_captured",
      ...utm,
    });
  }

  // Capture click IDs for cross-domain attribution (Google Ads, Meta, Bing)
  const clickIds = ["gclid", "fbclid", "msclkid", "wbraid", "gbraid"];
  clickIds.forEach((key) => {
    const value = params.get(key);
    if (value) {
      try {
        sessionStorage.setItem(`withmia_${key}`, value);
        // Store gclid with expiry (90 days) in localStorage for longer attribution
        if (key === "gclid") {
          localStorage.setItem("withmia_gclid", JSON.stringify({ value, ts: Date.now() }));
        }
      } catch { /* ignore */ }
    }
  });
}

export function getStoredUTM(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem("withmia_utm") || "{}");
  } catch {
    return {};
  }
}

// ── Outbound Link ──
export function trackOutboundLink(url: string, label: string) {
  const params = { outbound_url: url, outbound_label: label };
  pushToDataLayer({ event: "outbound_click", ...params });
  sendToGA4("outbound_click", params);
}

// ── Custom Event ──
export function trackEvent(eventName: string, params?: EventParams) {
  pushToDataLayer({ event: eventName, ...params });
  sendToGA4(eventName, params);
}

// ═══════════════════════════════════════════
// ── SEM / Google Ads Conversion Tracking ──
// ═══════════════════════════════════════════

/**
 * Send a Google Ads conversion event.
 * Usage: trackConversion('AW-XXXXXXXXX/CONVERSION_LABEL')
 * The conversionId is in format 'AW-XXXXXXXXX/yyyyyy' from Google Ads.
 * If no conversionId is passed, uses GADS_ID env variable.
 */
export function trackConversion(
  conversionLabel: string,
  value?: number,
  currency = "USD"
) {
  if (typeof window.gtag !== "function") return;
  const params: Record<string, unknown> = {
    send_to: conversionLabel,
  };
  if (value !== undefined) {
    params.value = value;
    params.currency = currency;
  }
  window.gtag("event", "conversion", params);
  pushToDataLayer({ event: "ads_conversion", conversion_label: conversionLabel });
}

/**
 * Track a signup/registration start — fire as Google Ads conversion.
 * Call this when user clicks "Comenzar ahora" and goes to app.withmia.com
 */
export function trackSignupStart(source: string) {
  const params = { signup_source: source, ...getStoredUTM() };
  pushToDataLayer({ event: "signup_start", ...params });
  sendToGA4("sign_up", { method: source });
  // If Google Ads conversion label is configured, fire it
  // Uncomment and set your conversion label:
  // trackConversion('AW-XXXXXXXXX/signup_label');
}

/**
 * Track a lead generation event (form submit, demo request, etc.)
 * This is the primary conversion for Google Ads lead campaigns.
 */
export function trackLeadConversion(leadType: string, formData?: EventParams) {
  const params = { lead_type: leadType, ...getStoredUTM(), ...formData };
  pushToDataLayer({ event: "generate_lead", ...params });
  sendToGA4("generate_lead", { ...params, event_category: leadType });
  // Uncomment and set your conversion label:
  // trackConversion('AW-XXXXXXXXX/lead_label');
}

/**
 * Get stored gclid for server-side or cross-domain use.
 * Returns null if expired (>90 days) or not found.
 */
export function getStoredGclid(): string | null {
  try {
    const raw = localStorage.getItem("withmia_gclid");
    if (!raw) return sessionStorage.getItem("withmia_gclid");
    const { value, ts } = JSON.parse(raw);
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    if (Date.now() - ts > NINETY_DAYS) {
      localStorage.removeItem("withmia_gclid");
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * Append gclid/utm params to outbound URLs (e.g., app.withmia.com)
 * for cross-domain attribution.
 */
export function appendAttributionParams(url: string): string {
  try {
    const u = new URL(url);
    const gclid = getStoredGclid();
    if (gclid) u.searchParams.set("gclid", gclid);
    const utm = getStoredUTM();
    Object.entries(utm).forEach(([k, v]) => {
      if (v) u.searchParams.set(k, v);
    });
    return u.toString();
  } catch {
    return url;
  }
}
