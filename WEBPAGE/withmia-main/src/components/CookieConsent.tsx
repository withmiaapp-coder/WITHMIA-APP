import { useState, useEffect } from "react";
import { Shield, X } from "lucide-react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "withmia_cookie_consent";

type ConsentStatus = "granted" | "denied" | null;

function getStoredConsent(): ConsentStatus {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === "granted" || val === "denied") return val;
  } catch {
    /* localStorage unavailable */
  }
  return null;
}

function storeConsent(status: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, status);
  } catch {
    /* ignore */
  }
}

/** Update Google consent mode */
function updateGoogleConsent(granted: boolean) {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

/**
 * Initialize Google consent mode to "denied" by default.
 * Called from index.html BEFORE gtag("config", ...).
 * If user already consented, auto-grant.
 */
export function initConsentMode() {
  if (typeof window.gtag !== "function") return;
  const stored = getStoredConsent();
  window.gtag("consent", "default", {
    analytics_storage: stored === "granted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored === null) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    storeConsent("granted");
    updateGoogleConsent(true);
    setVisible(false);
  }

  function handleDeny() {
    storeConsent("denied");
    updateGoogleConsent(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 animate-in slide-in-from-bottom-5 duration-500"
    >
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0c0c16]/95 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.4)] p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 p-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/15">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-white/70 leading-relaxed">
              Usamos cookies analíticas para mejorar tu experiencia.
              No recopilamos datos personales identificables.{" "}
              <Link
                to="/privacidad"
                className="text-amber-400/80 hover:text-amber-400 underline underline-offset-2 decoration-amber-400/20"
              >
                Política de privacidad
              </Link>
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={handleAccept}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[13px] font-semibold hover:brightness-110 transition-all"
              >
                Aceptar
              </button>
              <button
                onClick={handleDeny}
                className="px-5 py-2 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/[0.15] text-[13px] font-medium transition-all"
              >
                Rechazar
              </button>
            </div>
          </div>

          <button
            onClick={handleDeny}
            aria-label="Cerrar banner de cookies"
            className="shrink-0 p-1 text-white/20 hover:text-white/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
