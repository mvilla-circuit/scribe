import type { ReactNode } from "react";

import { IconButton } from "@/components/ui/icon-button";

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
 * selected/hover styling used by the expanded sidebar rows. Composes the
 * shared {@link IconButton}, staying full-color (rather than `IconButton`'s
 * default muted-until-hover) to match the rail's existing look.
 */
export function CollapsedRailButton({
  label,
  selected,
  indicator,
  onClick,
  children,
}: CollapsedRailButtonProps) {
  return (
    <IconButton
      label={label}
      onClick={onClick}
      selected={selected}
      side="right"
      aria-current={selected ? "page" : undefined}
      className="relative mx-auto text-text"
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
    </IconButton>
  );
}
