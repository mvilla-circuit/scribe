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

// Solid Morandi tones for foreground text — fourteen low-chroma hues ordered as
// a calm hue sweep: a neutral stone first, then a warm-to-cool rainbow (yellow,
// orange, brown, red, pink, the two purples, the two blues, teal, the two
// greens), closing on "Ink". Light/dark pairs of a hue sit next to each other.
// Each is legible on both the warm-paper light theme and the dark surface.
// "Ink" is the lone theme-aware swatch: it stores a CSS variable that resolves
// to near-black on paper and near-white in the dark, so the one "black" choice
// always reads as the strongest ink for the active theme.
export const TEXT_COLORS: Swatch[] = [
  { name: "Stone", value: "#8c857c" },
  { name: "Honey", value: "#b0924f" },
  { name: "Terracotta", value: "#b07a5c" },
  { name: "Umber", value: "#8a6e57" },
  { name: "Clay", value: "#b27f78" },
  { name: "Rosewood", value: "#b6829a" },
  { name: "Mauve", value: "#a47db2" },
  { name: "Plum", value: "#6f5499" },
  { name: "Sky", value: "#6ba6c8" },
  { name: "Dusk", value: "#5a6cb0" },
  { name: "Eucalyptus", value: "#4e8a84" },
  { name: "Sage", value: "#84926d" },
  { name: "Fern", value: "#5f7d5b" },
  { name: "Ink", value: "var(--swatch-ink)" },
];

// The thirteen translucent "wash" hues shared by the highlight, callout, and
// table palettes. Only the rgb triples and the hue order live here — each
// surface differs solely in alpha, so it derives its own palette through
// `washPalette` rather than re-typing the colors. This is a distinct family
// from the solid `TEXT_COLORS`: the same calm sweep, washed rather than solid.
const WASH_HUES: readonly { name: string; rgb: string }[] = [
  { name: "Mist", rgb: "150, 158, 150" },
  { name: "Honey", rgb: "214, 178, 110" },
  { name: "Peach", rgb: "212, 160, 120" },
  { name: "Tan", rgb: "168, 140, 108" },
  { name: "Rose", rgb: "200, 142, 134" },
  { name: "Blush", rgb: "206, 150, 178" },
  { name: "Lilac", rgb: "196, 150, 206" },
  { name: "Plum", rgb: "150, 112, 196" },
  { name: "Sky", rgb: "120, 178, 210" },
  { name: "Indigo", rgb: "96, 120, 198" },
  { name: "Teal", rgb: "110, 168, 160" },
  { name: "Sage", rgb: "150, 168, 124" },
  { name: "Forest", rgb: "118, 158, 114" },
];

// Builds a translucent wash palette from `WASH_HUES`: every hue sits at `base`
// alpha, with the neutral "Mist" nudged down and the warm "Honey" nudged up by
// `spread` so the sweep keeps its gentle warm-to-cool balance. Closes on a
// theme-aware Ink token that inverts to a light wash in the dark theme.
function washPalette(base: number, spread: number, ink: string): Swatch[] {
  const alphaFor = (name: string) =>
    name === "Mist" ? base - spread : name === "Honey" ? base + spread : base;
  return [
    ...WASH_HUES.map((hue) => ({
      name: hue.name,
      value: `rgba(${hue.rgb}, ${alphaFor(hue.name).toFixed(2)})`,
    })),
    { name: "Ink", value: ink },
  ];
}

// Translucent washes for highlights — alpha keeps contrast in light and dark.
// Same fourteen-hue order as TEXT_COLORS; "Ink" defers to a theme-aware variable
// so the darkest band inverts to a light wash in the dark theme.
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
// Same fourteen-hue order as the other palettes, closing on the theme-aware Ink.
export const TABLE_HEADER_COLORS: Swatch[] = washPalette(
  0.23,
  0.01,
  "var(--swatch-ink-wash)",
);

// Fills for individual table cells. A cell fill reads like the header strip but
// applies to any chosen cell(s), so these are translucent washes layered over
// the cell surface (legible in both themes). The alpha sits a touch below the
// header strip so an explicitly filled cell still reads as lighter than a header
// when the two meet. Same fourteen-hue order, closing on the theme-aware Ink.
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
