import { X } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from "react";

import { swatchChipStyle } from "@/lib/swatches";
import { cn } from "@/lib/utils";

/** Shared classes for quiet, swatch-washed pill chips. */
const CHIP_SHELL =
  "inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";
const CHIP_CLASS = `${CHIP_SHELL} truncate`;

export interface ChipProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "color"
> {
  name: string;
  color: string | null;
  /**
   * When false, skip the swatch wash so the chip can act as a neutral toggle
   * (e.g. multi-select off-state). Defaults to true.
   */
  washed?: boolean;
}

/**
 * Editorial shelf-label chip: a quiet swatch-washed pill rendered as a
 * button so it can trigger a popover or menu. Accepts the usual button
 * props (`onClick`, `aria-label`, …) so it composes directly as e.g. a
 * Radix `DropdownMenuTrigger` child.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ name, color, washed = true, className, style, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      style={washed ? { ...swatchChipStyle(color), ...style } : style}
      className={cn(
        CHIP_CLASS,
        !washed && "bg-tree-group text-muted hover:text-text",
        className,
      )}
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
  /**
   * Optional body instead of the plain name label — color pickers, rename
   * fields, or a menu trigger. The swatch wash still comes from `color`.
   */
  children?: ReactNode;
  /**
   * When `hover`, the remove control is revealed on chip hover/focus (used by
   * tag menus). Defaults to `always`.
   */
  removeReveal?: "always" | "hover";
  /** Extra classes for the remove button (size/opacity tweaks). */
  removeClassName?: string;
}

/**
 * A swatch-washed chip shell with a trailing remove control. Use the default
 * label for simple removable pills, or pass `children` for composite bodies
 * (tag menu triggers, option editors). Not for chips that also navigate —
 * see `RelationField`'s linked-record chips.
 */
export function RemovableChip({
  name,
  color,
  onRemove,
  removeLabel,
  className,
  children,
  removeReveal = "always",
  removeClassName,
}: RemovableChipProps) {
  return (
    <span
      style={swatchChipStyle(color)}
      className={cn(
        children ? CHIP_SHELL : CHIP_CLASS,
        "group/chip gap-1 pr-1",
        className,
      )}
    >
      {children ?? <span className="truncate">{name}</span>}
      <button
        type="button"
        aria-label={removeLabel ?? `Remove ${name}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-full outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
          removeReveal === "hover" &&
            "pointer-events-none opacity-0 group-hover/chip:pointer-events-auto group-hover/chip:opacity-100 group-focus-within/chip:pointer-events-auto group-focus-within/chip:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100",
          removeClassName,
        )}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
