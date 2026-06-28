import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// A tooltipped, bordered icon button for editor block controls (the floating
// controls on link cards, page links, and other custom blocks). Cancels its own
// mousedown so clicking it never steals focus from — or collapses — the editor
// selection.
export function EditorIconButton({
  label,
  onClick,
  children,
  className,
}: {
  /** Tooltip text and accessible label. */
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={onClick}
        className={cn("scribe-block-btn", className)}
      >
        {children}
      </button>
    </Tooltip>
  );
}
