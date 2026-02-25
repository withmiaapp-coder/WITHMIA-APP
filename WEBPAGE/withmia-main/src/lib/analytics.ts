/**
 * WITHMIA Analytics Service
 * Centralizes all tracking via GA4 (gtag.js) with dataLayer.
 *
 * Setup:
 * 1. GA4 Measurement ID: G-8D0NNE2BBH (configured in index.html)
 * 2. All events are sent via gtag() → GA4 automatically
 * 3. dataLayer is also available for future GTM integration
 */

const GA4_ID = import.meta.env.VITE_GA4_ID || "G-8D0NNE2BBH";

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

// ── Demo Request ──
export function trackDemoRequest(source: string) {
  const params = { request_source: source };
  pushToDataLayer({ event: "demo_request", ...params });
  sendToGA4("generate_lead", { ...params, event_category: "demo" });
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

// ── UTM Capture ──
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
