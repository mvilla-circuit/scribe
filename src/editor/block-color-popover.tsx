import type * as RPopover from "@radix-ui/react-popover";
import type { ComponentType } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";

import { PaletteIcon } from "./icons";
import { type Swatch } from "./palette";
import { SwatchSection } from "./swatch-grid";

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
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip content={triggerLabel}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={triggerAriaLabel ?? triggerLabel}
            className={triggerClassName}
          >
            <TriggerIcon size={15} />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align={align} className="w-[12rem] p-3">
        <SwatchSection
          label={label}
          swatches={swatches}
          value={value}
          onChange={onChange}
          clearLabel={clearLabel}
        />
      </PopoverContent>
    </Popover>
  );
}
