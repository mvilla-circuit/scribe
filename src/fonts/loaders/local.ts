import { CARDILLAC_FONT_ASSETS } from "@scribe/cardillac-assets";

type LocalFontId = (typeof LOCAL_FONT_IDS)[number];

interface LocalFontConfig {
  family: string;
  basename: string;
  format: "opentype" | "woff2";
  variant: "static" | "variable";
  /**
   * Declared CSS weights for static Regular/Bold files. Lab metrics for these
   * faces use mid-weights (500/600) even though the files are named Regular/Bold;
   * declaring those targets makes `font-weight` match without inventing cuts.
   */
  regularWeight?: number;
  boldWeight?: number;
}

/** Font ids backed by font files bundled with Scribe. */
export const LOCAL_FONT_IDS = [
  "cardillac",
  "bespoke-serif",
  "bespoke-slab",
  "bespoke-sans",
  "erode",
  "gambetta",
  "recia",
  "rowan",
  "sentient",
  "zodiak",
  "chubbo",
  "neco",
  "amulya",
  "general-sans",
  "satoshi",
  "supreme",
  "switzer",
  "tabular",
  "frygia",
  "industry",
] as const;

const LOCAL_FONT_CONFIG = {
  cardillac: {
    family: "Cardillac",
    basename: "Cardillac",
    format: "woff2",
    variant: "static",
    regularWeight: 500,
    boldWeight: 600,
  },
  "bespoke-serif": {
    family: "Bespoke Serif",
    basename: "BespokeSerif",
    format: "woff2",
    variant: "variable",
  },
  "bespoke-slab": {
    family: "Bespoke Slab",
    basename: "BespokeSlab",
    format: "woff2",
    variant: "variable",
  },
  "bespoke-sans": {
    family: "Bespoke Sans",
    basename: "BespokeSans",
    format: "woff2",
    variant: "variable",
  },
  erode: {
    family: "Erode",
    basename: "Erode",
    format: "woff2",
    variant: "variable",
  },
  gambetta: {
    family: "Gambetta",
    basename: "Gambetta",
    format: "woff2",
    variant: "variable",
  },
  recia: {
    family: "Recia",
    basename: "Recia",
    format: "woff2",
    variant: "variable",
  },
  rowan: {
    family: "Rowan",
    basename: "Rowan",
    format: "woff2",
    variant: "variable",
  },
  sentient: {
    family: "Sentient",
    basename: "Sentient",
    format: "woff2",
    variant: "variable",
  },
  zodiak: {
    family: "Zodiak",
    basename: "Zodiak",
    format: "woff2",
    variant: "variable",
  },
  chubbo: {
    family: "Chubbo",
    basename: "Chubbo",
    format: "woff2",
    variant: "variable",
  },
  neco: {
    family: "Neco",
    basename: "Neco",
    format: "woff2",
    variant: "variable",
  },
  amulya: {
    family: "Amulya",
    basename: "Amulya",
    format: "woff2",
    variant: "variable",
  },
  "general-sans": {
    family: "General Sans",
    basename: "GeneralSans",
    format: "woff2",
    variant: "variable",
  },
  satoshi: {
    family: "Satoshi",
    basename: "Satoshi",
    format: "woff2",
    variant: "variable",
  },
  supreme: {
    family: "Supreme",
    basename: "Supreme",
    format: "woff2",
    variant: "variable",
  },
  switzer: {
    family: "Switzer",
    basename: "Switzer",
    format: "woff2",
    variant: "variable",
  },
  tabular: {
    family: "Tabular",
    basename: "Tabular",
    format: "woff2",
    variant: "variable",
  },
  frygia: {
    family: "Frygia",
    basename: "Frygia",
    format: "woff2",
    variant: "static",
    regularWeight: 500,
    boldWeight: 600,
  },
  industry: {
    family: "Industry",
    basename: "Industry",
    format: "woff2",
    variant: "static",
    regularWeight: 500,
    boldWeight: 600,
  },
} as const satisfies Record<LocalFontId, LocalFontConfig>;

// Shared locals (Fontshare / other app fonts). Cardillac lives under
// `brand-assets/` and is wired only via `@scribe/cardillac-assets` — Vite
// aliases that to an empty stub for commercial production builds.
const SHARED_FONT_ASSETS = import.meta.glob<string>("../assets/*.{otf,woff2}", {
  eager: true,
  import: "default",
  query: "?url",
});

/** Returns whether an id has a bundled local font loader. */
export function isLocalFont(id: string): id is LocalFontId {
  return (LOCAL_FONT_IDS as readonly string[]).includes(id);
}

function assetUrl(filename: string): string {
  const asset = filename.startsWith("Cardillac-")
    ? CARDILLAC_FONT_ASSETS[`./brand-assets/${filename}`]
    : SHARED_FONT_ASSETS[`../assets/${filename}`];
  if (!asset) throw new Error(`Missing local font asset: ${filename}`);
  return asset;
}

function fontFace(
  config: LocalFontConfig,
  suffix: string,
  weight: string,
  style: "normal" | "italic",
): string {
  const extension = config.format === "opentype" ? "otf" : "woff2";
  const url = assetUrl(`${config.basename}-${suffix}.${extension}`);
  return `@font-face {
  font-family: "${config.family}";
  src: url("${url}") format("${config.format}");
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
}`;
}

function fontFacesFor(config: LocalFontConfig): string {
  if (config.variant === "variable") {
    return [
      fontFace(config, "Variable", "100 900", "normal"),
      fontFace(config, "VariableItalic", "100 900", "italic"),
    ].join("\n\n");
  }

  const regular = String(config.regularWeight ?? 400);
  const bold = String(config.boldWeight ?? 700);
  return [
    fontFace(config, "Regular", regular, "normal"),
    fontFace(config, "Bold", bold, "normal"),
    fontFace(config, "Italic", regular, "italic"),
    fontFace(config, "BoldItalic", bold, "italic"),
  ].join("\n\n");
}

/**
 * Creates a lazy loader that registers a bundled local font's faces once.
 *
 * Unknown ids reject when the returned loader is invoked. This makes a catalog
 * configuration error visible to its caller while preserving a consistent
 * `() => Promise<unknown>` loader interface.
 */
export function localLoader(id: string): () => Promise<unknown> {
  return () => {
    if (!isLocalFont(id)) {
      return Promise.reject(new Error(`Unknown local font: ${id}`));
    }

    const selector = `style[data-scribe-local-fonts="${id}"]`;
    if (document.head.querySelector(selector)) return Promise.resolve();

    const style = document.createElement("style");
    style.dataset.scribeLocalFonts = id;
    style.textContent = fontFacesFor(LOCAL_FONT_CONFIG[id]);
    document.head.append(style);
    return Promise.resolve();
  };
}
