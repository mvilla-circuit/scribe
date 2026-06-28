import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { NoColorIcon } from "./icons";
import { type Swatch } from "./palette";

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
    <div className="grid grid-cols-5 place-items-center gap-y-2.5">
      <Tooltip content={clearLabel}>
        <button
          type="button"
          aria-label={clearLabel}
          aria-pressed={!value}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            onChange(null);
          }}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-muted outline-none transition-all duration-150",
            "focus-visible:ring-2 focus-visible:ring-ring",
            !value
              ? "ring-2 ring-ring ring-offset-2 ring-offset-elevated"
              : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
          )}
        >
          <NoColorIcon size={16} />
        </button>
      </Tooltip>
      {swatches.map((s) => {
        const active = value === s.value;
        return (
          <Tooltip key={s.value} content={s.name}>
            <button
              type="button"
              aria-label={s.name}
              aria-pressed={active}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                onChange(s.value);
              }}
              className={cn(
                "h-6 w-6 rounded-full outline-none transition-all duration-150",
                "focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "ring-2 ring-ring ring-offset-2 ring-offset-elevated"
                  : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
              )}
              style={{ background: s.value }}
            />
          </Tooltip>
        );
      })}
    </div>
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
