import type { CSSProperties } from "react";

/**
 * Morandi swatch palette shared by datagrid options and collection tags. Each
 * entry names a hue defined once in `index.css` as a `--swatch-<hue>` solid
 * tone plus a `--swatch-<hue>-rgb` triple. Values store the hue key (e.g.
 * `"sky"`), which these helpers resolve to theme-aware inline styles.
 */
export const MORANDI_SWATCHES = [
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

/** A single Morandi hue key usable as a chip / option color. */
export type MorandiSwatch = (typeof MORANDI_SWATCHES)[number];

/** @alias Datagrid-facing name for {@link MORANDI_SWATCHES}. */
export const DATAGRID_SWATCHES = MORANDI_SWATCHES;

/** @alias Datagrid-facing name for {@link MorandiSwatch}. */
export type DatagridSwatch = MorandiSwatch;

const SWATCH_SET = new Set<string>(MORANDI_SWATCHES);

// The wash alpha behind a chip's label; low enough to stay a quiet tint on the
// warm paper yet distinct in both themes.
const WASH_ALPHA = 0.18;

/** The fallback hue used when an option has no color or an unknown one. */
export const DEFAULT_SWATCH: MorandiSwatch = "stone";

/**
 * Whether `value` names one of the known Morandi swatches.
 * @lintignore Reached externally today via the `isDatagridSwatch` alias.
 */
export function isMorandiSwatch(value: unknown): value is MorandiSwatch {
  return typeof value === "string" && SWATCH_SET.has(value);
}

/** @alias Datagrid-facing name for {@link isMorandiSwatch}. */
export const isDatagridSwatch = isMorandiSwatch;

/**
 * Inline style for a chip in the given hue: a translucent wash of the hue
 * behind its solid tone as the text color. Unknown/empty colors fall back to
 * the neutral stone hue so a chip is always legible.
 */
export function swatchChipStyle(
  color: string | null | undefined,
): CSSProperties {
  const hue = isMorandiSwatch(color) ? color : DEFAULT_SWATCH;
  return {
    color: `var(--swatch-${hue})`,
    backgroundColor: `rgba(var(--swatch-${hue}-rgb), ${WASH_ALPHA})`,
  };
}

/** A small solid dot in the hue, e.g. for option editors and color pickers. */
export function swatchDotStyle(
  color: string | null | undefined,
): CSSProperties {
  const hue = isMorandiSwatch(color) ? color : DEFAULT_SWATCH;
  return { backgroundColor: `var(--swatch-${hue})` };
}

/**
 * Picks a stable swatch for the nth newly created item by cycling through the
 * palette, so a fresh set gets a varied, repeatable spread of hues.
 */
export function swatchForIndex(index: number): MorandiSwatch {
  const len = MORANDI_SWATCHES.length;
  const safe = ((index % len) + len) % len;
  return MORANDI_SWATCHES[safe] ?? DEFAULT_SWATCH;
}

/** Display form of a Morandi hue key, e.g. `"sky"` → `"Sky"`. */
export function titleCaseHue(hue: string): string {
  if (hue.length === 0) return hue;
  return hue.charAt(0).toUpperCase() + hue.slice(1);
}
