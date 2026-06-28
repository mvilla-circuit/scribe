import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CollapsedRailButtonProps {
  /** The item's name; used as the hover tooltip and the accessible label. */
  label: string;
  /** Whether this item is the current selection (drives the active styling). */
  selected?: boolean;
  /**
   * Whether to show a small corner dot signalling the item has hidden depth
   * (e.g. a page with subpages) that opens when the full sidebar is expanded.
   */
  indicator?: boolean;
  /** Activated on click. */
  onClick: () => void;
  /** The icon to render, centered in the button. */
  children: ReactNode;
}

/**
 * A single icon-only entry in the collapsed sidebar rail: a square,
 * horizontally-centered button with a right-side name tooltip and the shared
 * selected/hover styling used by the expanded sidebar rows.
 */
export function CollapsedRailButton({
  label,
  selected,
  indicator,
  onClick,
  children,
}: CollapsedRailButtonProps) {
  return (
    <Tooltip content={label} side="right">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={selected ? "page" : undefined}
        className={cn(
          "relative mx-auto flex h-9 w-9 items-center justify-center rounded-md outline-none",
          "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "bg-selected text-text" : "text-text hover:bg-hover",
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center">
          {children}
        </span>
        {indicator && (
          <span
            data-testid="rail-indicator"
            aria-hidden
            className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-muted"
          />
        )}
      </button>
    </Tooltip>
  );
}
