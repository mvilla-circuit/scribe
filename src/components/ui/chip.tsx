import { X } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { swatchChipStyle } from "@/lib/swatches";
import { cn } from "@/lib/utils";

/** Shared classes for quiet, swatch-washed pill chips. */
const CHIP_CLASS =
  "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface ChipProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "color"
> {
  name: string;
  color: string | null;
}

/**
 * Editorial shelf-label chip: a quiet swatch-washed pill rendered as a
 * button so it can trigger a popover or menu. Accepts the usual button
 * props (`onClick`, `aria-label`, …) so it composes directly as e.g. a
 * Radix `DropdownMenuTrigger` child.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
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
Chip.displayName = "Chip";

export interface StaticChipProps {
  name: string;
  color: string | null;
  className?: string;
}

/**
 * Non-interactive rendering of a chip: the same swatch-washed pill as
 * `Chip`, but a plain `<span>` for read-only display contexts where a
 * button's click/focus semantics don't apply.
 */
export function StaticChip({ name, color, className }: StaticChipProps) {
  return (
    <span style={swatchChipStyle(color)} className={cn(CHIP_CLASS, className)}>
      {name}
    </span>
  );
}

export interface RemovableChipProps {
  name: string;
  color: string | null;
  onRemove: () => void;
  /** Defaults to `Remove ${name}`. */
  removeLabel?: string;
  className?: string;
}

/**
 * A read-only swatch-washed chip like `StaticChip`, plus a trailing remove
 * button. For a label-only chip with a single removal action — not for
 * chips that also navigate (see `RelationField`'s linked-record chips).
 */
export function RemovableChip({
  name,
  color,
  onRemove,
  removeLabel,
  className,
}: RemovableChipProps) {
  return (
    <span
      style={swatchChipStyle(color)}
      className={cn(CHIP_CLASS, "gap-1 pr-1", className)}
    >
      <span className="truncate">{name}</span>
      <button
        type="button"
        aria-label={removeLabel ?? `Remove ${name}`}
        onClick={onRemove}
        className="flex size-3.5 shrink-0 items-center justify-center rounded-full outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
