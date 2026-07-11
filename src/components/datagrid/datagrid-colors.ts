import type { CSSProperties } from "react";

/**
 * Morandi swatch palette for datagrid select/status options. Each entry names a
 * hue defined once in `index.css` as a `--swatch-<hue>` solid tone plus a
 * `--swatch-<hue>-rgb` triple. Options store the hue key (e.g. `"sky"`), which
 * these helpers resolve to theme-aware inline styles so a chip reads as a quiet
 * wash of the hue with its solid tone as the text — never a hardcoded color.
 */
export const DATAGRID_SWATCHES = [
  "stone",
  "honey",
  "terracotta",
  "umber",
  "clay",
  "rosewood",
  "mauve",
  "plum",
  "sky",
  "dusk",
  "eucalyptus",
  "moss",
  "fern",
] as const;

/** A single Morandi hue key usable as a select/status option color. */
export type DatagridSwatch = (typeof DATAGRID_SWATCHES)[number];

const SWATCH_SET = new Set<string>(DATAGRID_SWATCHES);

// The wash alpha behind a chip's label; low enough to stay a quiet tint on the
// warm paper yet distinct in both themes.
const WASH_ALPHA = 0.18;

/** The fallback hue used when an option has no color or an unknown one. */
export const DEFAULT_SWATCH: DatagridSwatch = "stone";

/** Whether `value` names one of the known Morandi swatches. */
export function isDatagridSwatch(value: unknown): value is DatagridSwatch {
  return typeof value === "string" && SWATCH_SET.has(value);
}

/**
 * Inline style for a select/status chip in the given hue: a translucent wash of
 * the hue behind its solid tone as the text color. Unknown/empty colors fall
 * back to the neutral stone hue so a chip is always legible.
 */
export function swatchChipStyle(
  color: string | null | undefined,
): CSSProperties {
  const hue = isDatagridSwatch(color) ? color : DEFAULT_SWATCH;
  return {
    color: `var(--swatch-${hue})`,
    backgroundColor: `rgba(var(--swatch-${hue}-rgb), ${WASH_ALPHA})`,
  };
}

/** A small solid dot in the hue, e.g. for the option editor and status columns. */
export function swatchDotStyle(
  color: string | null | undefined,
): CSSProperties {
  const hue = isDatagridSwatch(color) ? color : DEFAULT_SWATCH;
  return { backgroundColor: `var(--swatch-${hue})` };
}

/**
 * Picks a stable swatch for the nth newly created option by cycling through the
 * palette, so a fresh set of options gets a varied, repeatable spread of hues.
 */
export function swatchForIndex(index: number): DatagridSwatch {
  const safe =
    ((index % DATAGRID_SWATCHES.length) + DATAGRID_SWATCHES.length) %
    DATAGRID_SWATCHES.length;
  return DATAGRID_SWATCHES[safe] ?? DEFAULT_SWATCH;
}
