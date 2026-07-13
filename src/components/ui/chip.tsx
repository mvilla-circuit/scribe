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

const REMOVE_BUTTON_BASE =
  "flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring";

const REMOVE_BUTTON_ALWAYS =
  "size-3.5 transition-opacity hover:opacity-70 motion-reduce:transition-none";

const REMOVE_REVEAL_TRANSITION =
  "transition-[max-width,opacity] duration-150 ease-out motion-reduce:transition-none";

/**
 * Collapse at rest; expand on chip hover/focus (and when the control itself is
 * focused). The revealed `max-w-6` (24px) is the ceiling for the remove button,
 * so it must stay >= the largest `removeClassName` size a consumer passes
 * (currently `size-5`/20px) or `overflow-hidden` will clip the icon.
 */
const REMOVE_REVEAL_COLLAPSE =
  "pointer-events-none max-w-0 overflow-hidden opacity-0 group-hover/chip:pointer-events-auto group-hover/chip:max-w-6 group-hover/chip:opacity-100 group-focus-within/chip:pointer-events-auto group-focus-within/chip:max-w-6 group-focus-within/chip:opacity-100 focus-visible:pointer-events-auto focus-visible:max-w-6 focus-visible:opacity-100";

const REMOVE_REVEAL_SHELL =
  "gap-0 transition-[gap,padding] duration-150 ease-out motion-reduce:transition-none hover:gap-1 hover:pr-1 focus-within:gap-1 focus-within:pr-1";

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
        CHIP_SHELL,
        "group/chip",
        removeReveal === "always" && "gap-1 pr-1",
        removeReveal === "hover" && REMOVE_REVEAL_SHELL,
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
          REMOVE_BUTTON_BASE,
          removeReveal === "always" && REMOVE_BUTTON_ALWAYS,
          removeReveal === "hover" && REMOVE_REVEAL_TRANSITION,
          removeReveal === "hover" && "size-3.5",
          removeClassName,
          // Collapse classes come last so the rest-state (max-w-0/opacity-0)
          // always wins over any width/opacity in `removeClassName`.
          removeReveal === "hover" && REMOVE_REVEAL_COLLAPSE,
        )}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
