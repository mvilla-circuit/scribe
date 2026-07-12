import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DashedAddTileProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Dashed-bordered create tile — the gallery/grid counterpart to
 * {@link EmptyState}. Use for inline add controls (e.g. "+ New row") that sit
 * among peer tiles rather than as a lone centered panel.
 */
export function DashedAddTile({
  onClick,
  children,
  className,
}: DashedAddTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm font-medium text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </button>
  );
}
