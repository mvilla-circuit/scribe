// A curated, restrained palette for the editor's text-color and highlight
// swatches — soft, dusty, low-chroma "Morandi" tones rather than a full color
// wheel. The aim is premium and calm: accents that whisper instead of shout.
//
// Every swatch's `value` is a CSS-variable reference (`var(--swatch-…)`), not a
// resolved color: the literal hues live once in `index.css` and resolve at
// render. Storing the token means editing a hue there retints every saved
// instance live, instead of baking a now-stale color into the document.
//
// Text colors are solid mid-tones chosen to stay legible on both the warm
// paper background (light) and the near-black surface (dark). Highlights are
// translucent washes (the hue's rgb token composed at an alpha) so they tint the
// page gently and keep the theme's own text color readable in either mode — no
// light-on-light surprises.

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
// two blues, teal, the two greens). Each hue references two CSS-variable tokens
// (defined once in `index.css`): a `solid` mid-tone (legible foreground text,
// quote accents, banners) and a `wash` "r, g, b" triple (composed at a
// per-surface alpha for translucent fills). Storing the `var()` reference rather
// than a resolved color is what lets a palette edit in `index.css` retint every
// saved instance live. The theme-aware "Ink" swatch is appended per-palette
// after the sweep (its token differs by surface), so it is not part of this
// table.
interface Hue {
  /** Stable label shown in swatch tooltips. */
  name: string;
  /** `var(--swatch-<slug>)` token for foreground text, quote accents, banners. */
  solid: string;
  /**
   * `var(--swatch-<slug>-rgb)` token holding an "r, g, b" triple, composed at a
   * per-surface alpha for translucent highlight/callout/table washes.
   */
  wash: string;
}

// Build a hue from its slug so each entry names its `--swatch-<slug>` /
// `--swatch-<slug>-rgb` token pair (declared in `index.css`) exactly once.
function makeHue(name: string, slug: string): Hue {
  return {
    name,
    solid: `var(--swatch-${slug})`,
    wash: `var(--swatch-${slug}-rgb)`,
  };
}

const HUES: readonly Hue[] = [
  makeHue("Stone", "stone"),
  makeHue("Honey", "honey"),
  makeHue("Terracotta", "terracotta"),
  makeHue("Umber", "umber"),
  makeHue("Clay", "clay"),
  makeHue("Rosewood", "rosewood"),
  makeHue("Mauve", "mauve"),
  makeHue("Plum", "plum"),
  makeHue("Sky", "sky"),
  makeHue("Dusk", "dusk"),
  makeHue("Eucalyptus", "eucalyptus"),
  makeHue("Moss", "moss"),
  makeHue("Fern", "fern"),
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

// "Ink" on a banner can't reuse the theme-aware `--swatch-ink`: that flips to
// near-white in the dark theme, which would hide the banner's fixed light
// caption text. Instead it stores a banner-specific token that stays a solid
// dark ink in BOTH themes, so the light caption always reads.
const BANNER_INK: Swatch = { name: "Ink", value: "var(--swatch-banner-ink)" };

// Fills for the page-level banner — the full-width band shown directly below a
// page's breadcrumbs. Unlike the faint block washes, a banner is a bold solid
// band designed to carry light caption text, so it reuses the solid Morandi hue
// sweep (mid-tone hues) for a confident, saturated fill, closing on the
// banner-specific Ink above (dark in both themes) rather than the theme-aware
// `--swatch-ink`.
export const BANNER_COLORS: Swatch[] = [
  ...HUES.map((hue) => ({ name: hue.name, value: hue.solid })),
  BANNER_INK,
];

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
// The wash is the Sky callout token (CALLOUT_COLORS index 8) — kept in sync by
// the palette test — so it resolves and retints from `index.css` like the rest.
export const CALLOUT_DEFAULT: CalloutVariant = {
  name: "Info",
  icon: "ℹ️",
  color: "rgba(var(--swatch-sky-rgb), 0.16)",
};
