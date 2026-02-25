import { useEffect } from "react";
import { useLocation } from "@/lib/router";
import { trackPageView } from "@/lib/analytics";

/**
 * Scrolls to top on every route change and fires a pageview event.
 * Place inside <BrowserRouter>.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(pathname, document.title);
  }, [pathname]);

  return null;
};
