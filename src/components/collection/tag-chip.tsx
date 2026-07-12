import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { swatchChipStyle } from "@/lib/swatches";
import { cn } from "@/lib/utils";

/** Shared classes for quiet, swatch-washed shelf-label chips. */
const CHIP_CLASS =
  "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface TagChipProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "color"
> {
  name: string;
  color: string | null;
}

/**
 * Editorial shelf-label chip for a tag: a quiet swatch-washed pill matching
 * `DatagridOptionChip`, rendered as a button so it can trigger a popover (see
 * `CollectionTags`). Accepts the usual button props (`onClick`, `aria-label`,
 * …) so it composes directly as a Radix `DropdownMenuTrigger` child.
 */
export const TagChip = forwardRef<HTMLButtonElement, TagChipProps>(
  ({ name, color, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      style={swatchChipStyle(color)}
      className={cn(CHIP_CLASS, className)}
      {...props}
    >
      {name}
    </button>
  ),
);
TagChip.displayName = "TagChip";
