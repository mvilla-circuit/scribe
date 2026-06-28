import type { ReactNode } from "react";

/**
 * The clickable body shared by the editor's block link cards (the external
 * bookmark and the internal page link). It renders a `role="link"` surface that
 * fires `onActivate` on click and on Enter/Space, so the whole card is reachable
 * by keyboard. The caller owns the visual class and the inner content.
 */
export function CardSurface({
  className,
  onActivate,
  children,
}: {
  className?: string;
  onActivate: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      className={className}
    >
      {children}
    </div>
  );
}
