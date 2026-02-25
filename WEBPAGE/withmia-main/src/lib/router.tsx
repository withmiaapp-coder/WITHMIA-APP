/**
 * Router shims — bridge from react-router-dom to Astro MPA navigation.
 * Provides drop-in replacements so existing React components work
 * without react-router-dom's BrowserRouter context.
 */
import React from "react";

/* ── Link ── */
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: React.ReactNode;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, children, ...props }, ref) => (
    <a ref={ref} href={to} {...props}>
      {children}
    </a>
  )
);
Link.displayName = "Link";

/* ── useNavigate ── */
export const useNavigate = () => {
  return (path: string) => {
    window.location.href = path;
  };
};

/* ── useLocation ── */
export const useLocation = () => ({
  pathname: typeof window !== "undefined" ? window.location.pathname : "/",
  search: typeof window !== "undefined" ? window.location.search : "",
  hash: typeof window !== "undefined" ? window.location.hash : "",
  state: null,
  key: "default",
});

/* ── Navigate (redirect component) ── */
export const Navigate = ({
  to,
  replace: _replace,
}: {
  to: string;
  replace?: boolean;
}) => {
  // In Astro, redirects are handled at the page level.
  // This component is a no-op fallback; actual redirects use Astro redirects.
  if (typeof window !== "undefined") {
    window.location.replace(to);
  }
  return null;
};
