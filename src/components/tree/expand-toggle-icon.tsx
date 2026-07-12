import { ChevronRight } from "lucide-react";
import { type ReactNode } from "react";

import { SIDEBAR_ICON_SIZE } from "@/components/sidebar/sidebar-row";
import { makeIcon } from "@/lib/make-icon";
import { cn } from "@/lib/utils";

const ChevronRightIcon = makeIcon(ChevronRight);

interface ExpandToggleIconProps {
  expanded: boolean;
  hasChildren: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * Resting identity icon for a nestable tree row, with an on-demand
 * expand/collapse chevron revealed over it when the row has children.
 *
 * Hover/focus reveal uses Tailwind `group-*` variants, so the parent row
 * must include the `group` class (as `SidebarRow` does).
 */
export function ExpandToggleIcon({
  expanded,
  hasChildren,
  expandLabel,
  collapseLabel,
  onToggle,
  children,
}: ExpandToggleIconProps) {
  return (
    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center text-muted/70">
      <span
        className={cn(
          "flex items-center justify-center",
          hasChildren &&
            "transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-0 group-focus-within:opacity-0",
        )}
      >
        {children}
      </span>
      {hasChildren && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={expanded ? collapseLabel : expandLabel}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="absolute inset-0 flex items-center justify-center rounded text-muted opacity-0 transition-opacity duration-150 motion-reduce:transition-none hover:text-text group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <ChevronRightIcon
            size={SIDEBAR_ICON_SIZE}
            className={cn(
              "transition-transform duration-150 motion-reduce:transition-none",
              expanded && "rotate-90",
            )}
          />
        </button>
      )}
    </span>
  );
}
