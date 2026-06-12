// A curated, restrained palette for the editor's text-color and highlight
// swatches — soft, dusty, low-chroma "Morandi" tones rather than a full color
// wheel. The aim is premium and calm: accents that whisper instead of shout.
//
// Text colors are solid mid-tones chosen to stay legible on both the warm
// paper background (light) and the near-black surface (dark). Highlights are
// translucent washes (rgba) so they tint the page gently and keep the theme's
// own text color readable in either mode — no light-on-light surprises.

export type Swatch = {
  /** Stable label shown in the swatch tooltip. */
  name: string;
  /** The exact value stored on the mark (must round-trip for active state). */
  value: string;
};

// Solid Morandi tones for foreground text — eight low-chroma hues spanning the
// wheel, each legible on both the warm-paper light theme and the dark surface.
export const TEXT_COLORS: Swatch[] = [
  { name: "Clay", value: "#b27f78" },
  { name: "Terracotta", value: "#b07a5c" },
  { name: "Honey", value: "#b0924f" },
  { name: "Sage", value: "#84926d" },
  { name: "Eucalyptus", value: "#5f8a82" },
  { name: "Dusk", value: "#6f82a6" },
  { name: "Mauve", value: "#978099" },
  { name: "Stone", value: "#8c857c" },
];

// Translucent washes for highlights — alpha keeps contrast in light and dark.
export const HIGHLIGHT_COLORS: Swatch[] = [
  { name: "Rose", value: "rgba(200, 142, 134, 0.30)" },
  { name: "Peach", value: "rgba(212, 160, 120, 0.30)" },
  { name: "Honey", value: "rgba(214, 178, 110, 0.32)" },
  { name: "Sage", value: "rgba(150, 168, 124, 0.30)" },
  { name: "Mint", value: "rgba(140, 178, 160, 0.30)" },
  { name: "Sky", value: "rgba(132, 164, 196, 0.30)" },
  { name: "Lilac", value: "rgba(168, 148, 184, 0.30)" },
  { name: "Mist", value: "rgba(150, 158, 150, 0.28)" },
];

// Accent tones for quote blocks. A single solid base hue is stored on the node;
// each quote variant derives its own intensity from it via `color-mix` in CSS
// (a faint panel wash, a stronger rule, a soft pull-quote glyph). These reuse
// the solid Morandi `TEXT_COLORS` so quotes stay in the same restrained family.
export const QUOTE_ACCENTS: Swatch[] = [
  { name: "Clay", value: "#b27f78" },
  { name: "Terracotta", value: "#b07a5c" },
  { name: "Honey", value: "#b0924f" },
  { name: "Sage", value: "#84926d" },
  { name: "Eucalyptus", value: "#5f8a82" },
  { name: "Dusk", value: "#6f82a6" },
  { name: "Mauve", value: "#978099" },
  { name: "Stone", value: "#8c857c" },
];

// Softer washes for callout block backgrounds. A callout tints a whole block,
// so its fill is lighter than an inline highlight band — enough to set the box
// apart from the page without ever fighting the text inside it (light or dark).
export const CALLOUT_COLORS: Swatch[] = [
  { name: "Rose", value: "rgba(200, 142, 134, 0.16)" },
  { name: "Peach", value: "rgba(212, 160, 120, 0.16)" },
  { name: "Honey", value: "rgba(214, 178, 110, 0.17)" },
  { name: "Sage", value: "rgba(150, 168, 124, 0.16)" },
  { name: "Mint", value: "rgba(140, 178, 160, 0.16)" },
  { name: "Sky", value: "rgba(132, 164, 196, 0.16)" },
  { name: "Lilac", value: "rgba(168, 148, 184, 0.16)" },
  { name: "Mist", value: "rgba(150, 158, 150, 0.15)" },
];

// Preset callout variants: each pairs an emoji with one of the callout washes.
// Picking a variant just writes its (color, icon) onto the node; the custom
// color swatches and emoji picker can then diverge from any preset freely.
export type CalloutVariant = {
  name: string;
  icon: string;
  color: string;
};

export const CALLOUT_VARIANTS: CalloutVariant[] = [
  { name: "Info", icon: "ℹ️", color: "rgba(132, 164, 196, 0.16)" },
  { name: "Tip", icon: "💡", color: "rgba(214, 178, 110, 0.17)" },
  { name: "Warning", icon: "⚠️", color: "rgba(212, 160, 120, 0.16)" },
  { name: "Danger", icon: "🔥", color: "rgba(200, 142, 134, 0.16)" },
  { name: "Success", icon: "✅", color: "rgba(140, 178, 160, 0.16)" },
  { name: "Note", icon: "📝", color: "rgba(150, 158, 150, 0.15)" },
];

// The default a fresh callout starts from (the Info variant).
export const CALLOUT_DEFAULT = CALLOUT_VARIANTS[0];
