import React from "react";

/**
 * Renders "WITHMIA" with MIA in bold, matching brand manual.
 * Use <Brand /> in JSX or brandify(text) for data strings.
 */
export const Brand = ({ className }: { className?: string }) => (
  <span className={className}>WITH<span className="font-bold">MIA</span></span>
);

/**
 * Takes a plain string and returns JSX with every "WITHMIA" rendered
 * as WITH<bold>MIA</bold>. Safe for paragraphs and descriptions.
 */
export const brandify = (text: string): React.ReactNode => {
  const parts = text.split("WITHMIA");
  if (parts.length === 1) return text;
  const result: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i > 0) {
      result.push(
        <span key={`brand-${i}`}>
          WITH<span className="font-bold">MIA</span>
        </span>
      );
    }
    if (part) result.push(part);
  });
  return <>{result}</>;
};
