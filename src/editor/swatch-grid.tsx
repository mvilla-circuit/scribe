import { SwatchGrid as UISwatchGrid } from "@/components/ui/swatch-grid";

import { type Swatch } from "./palette";
import { preserveSelection } from "./preserve-selection";

// The compact 5-wide swatch grid shared by every color menu in the editor — the
// bubble-toolbar text/highlight/underline sections and the block accent/
// background popovers. The first chip is a slashed circle that clears the color;
// the rest are the provided swatches. The active chip carries a ring, driven by
// `value` (which matches a swatch `value`, or is null when cleared).
//
// Every chip cancels its own `mousedown` so the editor's text selection (and
// thus the bubble toolbar) survives a click; this is inert in the block
// popovers, which don't depend on the selection.
export function SwatchGrid({
  swatches,
  value,
  onChange,
  clearLabel,
}: {
  swatches: Swatch[];
  /** The active value (a swatch `value`, or null when cleared). */
  value: string | null;
  /** Receives the picked swatch value, or null to clear. */
  onChange: (value: string | null) => void;
  /** Tooltip + label for the clear (slashed-circle) chip. */
  clearLabel: string;
}) {
  return (
    <UISwatchGrid
      swatches={swatches}
      value={value}
      onChange={onChange}
      clearLabel={clearLabel}
      onSwatchMouseDown={preserveSelection}
    />
  );
}

// A labelled swatch grid: an uppercase section header above a `SwatchGrid`.
// Shared by the bubble toolbar's combined color flyout (Text / Highlight /
// Underline sections) and the block accent/background popover, so the header +
// grid pairing stays identical across both.
export function SwatchSection({
  label,
  swatches,
  value,
  onChange,
  clearLabel,
}: {
  /** Uppercase section header, e.g. "Text" or "Accent". */
  label: string;
  swatches: Swatch[];
  /** The active value (a swatch `value`, or null when cleared). */
  value: string | null;
  /** Receives the picked swatch value, or null to clear. */
  onChange: (value: string | null) => void;
  /** Tooltip + label for the clear (slashed-circle) chip. */
  clearLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-muted">
        {label}
      </div>
      <SwatchGrid
        swatches={swatches}
        value={value}
        onChange={onChange}
        clearLabel={clearLabel}
      />
    </div>
  );
}
