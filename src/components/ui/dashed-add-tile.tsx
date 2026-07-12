import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// A dashed-bordered "create" tile -- the gallery/grid counterpart to
// `EmptyState`'s panel affordance. Used for inline add controls like a
// "+ New row" tile at the end of a datagrid gallery, where the create action
// is a tile among peers rather than a lone centered panel.
export function DashedAddTile({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
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
