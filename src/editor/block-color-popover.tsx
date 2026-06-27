import * as RPopover from "@radix-ui/react-popover";
import type { ComponentType } from "react";

import { Tooltip } from "@/components/ui/tooltip";

import { PaletteIcon } from "./icons";
import { type Swatch } from "./palette";
import { SwatchGrid } from "./swatch-grid";

// The shared accent/color control for editor block menus — the quote accent,
// the essay accent, and the callout background all render through this. A
// palette trigger (a bordered `scribe-block-btn`) opens a compact 5-wide swatch
// grid whose first chip clears the color (a slashed circle) and whose remaining
// chips are the provided swatches. The active chip carries a ring; `value`
// drives that selected state and round-trips the stored mark/attribute string.
//
// Open state is controlled by the caller so the surrounding control cluster can
// stay pinned visible (via its `data-open`) while the popover is open.
export function BlockColorPopover({
  swatches,
  value,
  onChange,
  open,
  onOpenChange,
  label,
  clearLabel,
  triggerLabel,
  triggerAriaLabel,
  triggerClassName = "scribe-block-btn",
  triggerIcon: TriggerIcon = PaletteIcon,
  align = "end",
}: {
  swatches: Swatch[];
  /** The active value (a swatch `value`, or null when cleared). */
  value: string | null;
  /** Receives the picked swatch value, or null to clear. */
  onChange: (value: string | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Uppercase section header, e.g. "Accent" or "Background". */
  label: string;
  /** Tooltip + label for the clear (slashed-circle) chip. */
  clearLabel: string;
  /** Tooltip for the palette trigger. */
  triggerLabel: string;
  /** Accessible label for the trigger; defaults to `triggerLabel`. */
  triggerAriaLabel?: string;
  /** Trigger button class; defaults to the bordered block-control button. */
  triggerClassName?: string;
  /** Trigger glyph; defaults to the palette icon. */
  triggerIcon?: ComponentType<{ size?: number }>;
  align?: RPopover.PopoverContentProps["align"];
}) {
  return (
    <RPopover.Root open={open} onOpenChange={onOpenChange}>
      <Tooltip content={triggerLabel}>
        <RPopover.Trigger asChild>
          <button
            type="button"
            aria-label={triggerAriaLabel ?? triggerLabel}
            className={triggerClassName}
          >
            <TriggerIcon size={15} />
          </button>
        </RPopover.Trigger>
      </Tooltip>
      <RPopover.Portal>
        <RPopover.Content
          align={align}
          sideOffset={6}
          className="scribe-pop z-50 w-[12rem] rounded-lg border border-border bg-elevated p-3 text-text shadow-popover outline-none"
        >
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-muted">
            {label}
          </div>
          <SwatchGrid
            swatches={swatches}
            value={value}
            onChange={onChange}
            clearLabel={clearLabel}
          />
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
