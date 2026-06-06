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
