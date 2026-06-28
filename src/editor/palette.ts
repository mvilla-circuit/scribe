// A curated, restrained palette for the editor's text-color and highlight
// swatches — soft, dusty, low-chroma "Morandi" tones rather than a full color
// wheel. The aim is premium and calm: accents that whisper instead of shout.
//
// Text colors are solid mid-tones chosen to stay legible on both the warm
// paper background (light) and the near-black surface (dark). Highlights are
// translucent washes (rgba) so they tint the page gently and keep the theme's
// own text color readable in either mode — no light-on-light surprises.

/** A single selectable text-color or highlight swatch. */
export interface Swatch {
  /** Stable label shown in the swatch tooltip. */
  name: string;
  /** The exact value stored on the mark (must round-trip for active state). */
  value: string;
}

// The single base hue set every palette derives from: thirteen calm, low-chroma
// "Morandi" hues ordered as a warm-to-cool sweep (a neutral stone first, then a
// warm-to-cool rainbow — yellow, orange, brown, red, pink, the two purples, the
// two blues, teal, the two greens). Each hue carries a `solid` mid-tone (for
// legible foreground text) and a lighter `wash` rgb (for translucent background
// fills); every palette picks whichever channel its surface needs, so they all
// stay in one consistent family and order. The theme-aware "Ink" swatch is
// appended per-palette after the sweep (its token differs by surface), so it is
// not part of this table.
interface Hue {
  /** Stable label shown in swatch tooltips. */
  name: string;
  /** Solid mid-tone (hex) for foreground text, quote accents, and banners. */
  solid: string;
  /** Lighter "r, g, b" triple for translucent highlight/callout/table washes. */
  wash: string;
}

const HUES: readonly Hue[] = [
  { name: "Stone", solid: "#8c857c", wash: "150, 158, 150" },
  { name: "Honey", solid: "#b0924f", wash: "214, 178, 110" },
  { name: "Terracotta", solid: "#b07a5c", wash: "212, 160, 120" },
  { name: "Umber", solid: "#8a6e57", wash: "168, 140, 108" },
  { name: "Clay", solid: "#b27f78", wash: "200, 142, 134" },
  { name: "Rosewood", solid: "#b6829a", wash: "206, 150, 178" },
  { name: "Mauve", solid: "#a47db2", wash: "196, 150, 206" },
  { name: "Plum", solid: "#6f5499", wash: "150, 112, 196" },
  { name: "Sky", solid: "#6ba6c8", wash: "120, 178, 210" },
  { name: "Dusk", solid: "#5a6cb0", wash: "96, 120, 198" },
  { name: "Eucalyptus", solid: "#4e8a84", wash: "110, 168, 160" },
  { name: "Sage", solid: "#84926d", wash: "150, 168, 124" },
  { name: "Fern", solid: "#5f7d5b", wash: "118, 158, 114" },
];

// "Ink" is the lone theme-aware swatch: it stores a CSS variable that resolves
// to near-black on paper and near-white in the dark, so the strongest choice
// always reads as the right ink for the active theme.
const SOLID_INK: Swatch = { name: "Ink", value: "var(--swatch-ink)" };

// Solid Morandi tones for foreground text — the hue sweep at full opacity,
// closing on the theme-aware Ink. Legible on both the warm-paper light theme and
// the dark surface.
export const TEXT_COLORS: Swatch[] = [
  ...HUES.map((hue) => ({ name: hue.name, value: hue.solid })),
  SOLID_INK,
];

// Builds a translucent wash palette from `HUES`: each hue's `wash` rgb at `base`
// alpha, with the neutral lead hue nudged down and the warm second hue nudged up
// by `spread` so the sweep keeps its gentle warm-to-cool balance. Closes on a
// theme-aware Ink token that inverts to a light wash in the dark theme.
function washPalette(base: number, spread: number, ink: string): Swatch[] {
  const alphaFor = (i: number) =>
    i === 0 ? base - spread : i === 1 ? base + spread : base;
  return [
    ...HUES.map((hue, i) => ({
      name: hue.name,
      value: `rgba(${hue.wash}, ${alphaFor(i).toFixed(2)})`,
    })),
    { name: "Ink", value: ink },
  ];
}

// Translucent washes for highlights — alpha keeps contrast in light and dark.
// "Ink" defers to a theme-aware variable so the darkest band inverts to a light
// wash in the dark theme.
export const HIGHLIGHT_COLORS: Swatch[] = washPalette(
  0.3,
  0.02,
  "var(--swatch-ink-wash)",
);

// Accent tones for quote blocks. A single solid base hue is stored on the node;
// each quote variant derives its own intensity from it via `color-mix` in CSS
// (a faint panel wash, a stronger rule, a soft pull-quote glyph). Quotes reuse
// the solid Morandi `TEXT_COLORS` so they stay in the same restrained family.
export const QUOTE_ACCENTS: Swatch[] = [...TEXT_COLORS];

// Softer washes for callout block backgrounds. A callout tints a whole block,
// so its fill is lighter than an inline highlight band — enough to set the box
// apart from the page without ever fighting the text inside it (light or dark).
export const CALLOUT_COLORS: Swatch[] = washPalette(
  0.16,
  0.01,
  "var(--swatch-ink-fill)",
);

// Fills for the page-level banner — the full-width band shown directly below a
// page's breadcrumbs. Unlike the faint block washes, a banner is a bold solid
// band designed to carry light caption text, so it reuses the solid Morandi
// `TEXT_COLORS` (mid-tone hues) for a confident, saturated fill. The theme-aware
// "Ink" tone is dropped: it flips to near-white in the dark theme, which would
// hide the banner's fixed light caption text.
export const BANNER_COLORS: Swatch[] = TEXT_COLORS.filter(
  (s) => s.name !== "Ink",
);

// Header washes for the table block. A table header strip (the header row and/or
// header column) sits between an inline highlight and a callout in presence — it
// should clearly mark the header without darkening the text it frames. These are
// translucent so they layer over the cell surface in either theme; the alpha
// lands a touch above the callout fill so the strip still reads as a header.
export const TABLE_HEADER_COLORS: Swatch[] = washPalette(
  0.23,
  0.01,
  "var(--swatch-ink-wash)",
);

// Fills for individual table cells. A cell fill reads like the header strip but
// applies to any chosen cell(s), so these are translucent washes layered over
// the cell surface (legible in both themes). The alpha sits a touch below the
// header strip so an explicitly filled cell still reads as lighter than a header
// when the two meet.
export const TABLE_CELL_COLORS: Swatch[] = washPalette(
  0.19,
  0.01,
  "var(--swatch-ink-wash)",
);

/**
 * Preset callout variants: each pairs an emoji with a soft block wash. Only the
 * first entry (the default) is used now that callouts pick their icon through
 * the shared page icon picker, but the table is kept for the default wash/icon.
 */
export interface CalloutVariant {
  name: string;
  icon: string;
  color: string;
}

// The default a fresh callout starts from (the Info variant). Defined as its
// own constant so it's statically known to exist (vs. an array index lookup).
export const CALLOUT_DEFAULT: CalloutVariant = {
  name: "Info",
  icon: "ℹ️",
  color: "rgba(120, 178, 210, 0.16)",
};
