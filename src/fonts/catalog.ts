// Curated, self-hosted typography catalog for Phase 6.
//
// Three purpose roles drive the reading surface: Display (titles), Text (body),
// and Code (monospace). Each role offers a System default plus a hand-picked set
// of families bundled via `@fontsource`. Every web family here ships a *true*
// bold and italic (regular / bold / italic / bold-italic), so the editor's
// bold/italic render real cuts rather than synthesized slants.
//
// Fonts are loaded lazily (see loadFont.ts). Every family ships the same four
// Latin subset stylesheets (400 / 700 / 400-italic / 700-italic), so the loader
// is derived from the font id via `import.meta.glob` rather than hand-writing
// four imports per entry — a chosen font still pulls only its own small woff2
// files on demand, fully offline once bundled, no API key.

// Banned fonts — DO NOT re-add. These were removed for not meeting the
// elegant/editorial bar; every replacement ships a true bold and italic.
//   Serif:  Cormorant         → Petrona
//           Spectral          → Vollkorn
//           EB Garamond       → Gentium Book Plus
//           Libre Baskerville → Literata
//   Sans:   Jost              → Plus Jakarta Sans
//           Epilogue          → Albert Sans
//           Red Hat Display   → Hanken Grotesk
//           Nunito Sans       → Figtree

/** The three typography roles that drive the reading surface. */
export type FontRole = "display" | "text" | "code";
type FontStyle = "serif" | "sans" | "mono";

/**
 * A (partial) role -> fontId map. Stored at each level of the cascade
 * (global / book / page); unset roles inherit from the level above.
 */
export type FontMap = Partial<Record<FontRole, string>>;
/** A fully-resolved map with every role present (after applying defaults). */
export type ResolvedFonts = Record<FontRole, string>;

/** A single selectable font: its id, label, CSS stack, and lazy CSS loader. */
export interface FontEntry {
  /** Stable id stored in the DB (matches the `@fontsource` slug for web fonts). */
  id: string;
  /** Display label and primary CSS family name. */
  family: string;
  style: FontStyle;
  /** The full `font-family` stack assigned to the role's CSS variable. */
  stack: string;
  /** True for the per-role System defaults, which need no web font load. */
  system?: boolean;
  /** Dynamically imports the font's CSS. Absent for System defaults. */
  load?: () => Promise<unknown>;
}

// --- Font-family stacks -----------------------------------------------------
// Fallbacks mirror the kind of face so a font that hasn't loaded yet (or fails
// offline) degrades to a sensible system equivalent rather than the UI sans.
function stackFor(style: FontStyle, family: string): string {
  const quoted = `"${family}"`;
  switch (style) {
    case "serif":
      return `${quoted}, "New York", Georgia, Cambria, "Times New Roman", serif`;
    case "sans":
      return `${quoted}, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    case "mono":
      return `${quoted}, ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`;
  }
}

// --- Lazy CSS loaders -------------------------------------------------------
// Every catalog family ships these four Latin subset stylesheets. Vite resolves
// the glob at build time into per-file lazy import chunks, so `FONT_SHEETS` is a
// path -> dynamic-importer map covering every installed `@fontsource` package.
const FONT_SHEETS = import.meta.glob([
  "/node_modules/@fontsource/*/latin-400.css",
  "/node_modules/@fontsource/*/latin-700.css",
  "/node_modules/@fontsource/*/latin-400-italic.css",
  "/node_modules/@fontsource/*/latin-700-italic.css",
]);

const FONT_WEIGHTS = ["400", "700", "400-italic", "700-italic"] as const;

// Builds a font's loader from its id: imports the four subset stylesheets for
// that family in parallel. Rejects on a missing sheet so `ensureFontLoaded`'s
// catch can fall back to the system stack rather than silently loading nothing.
function fontsourceLoader(id: string): () => Promise<unknown> {
  return () =>
    Promise.all(
      FONT_WEIGHTS.map((weight) => {
        const path = `/node_modules/@fontsource/${id}/latin-${weight}.css`;
        const sheet = FONT_SHEETS[path];
        return sheet
          ? sheet()
          : Promise.reject(new Error(`Missing font stylesheet: ${path}`));
      }),
    );
}

function webFont(id: string, family: string, style: FontStyle): FontEntry {
  return {
    id,
    family,
    style,
    stack: stackFor(style, family),
    load: fontsourceLoader(id),
  };
}

// --- System defaults (no web font) ------------------------------------------
const SYSTEM_SERIF: FontEntry = {
  id: "system-serif",
  family: "System (New York)",
  style: "serif",
  stack: '"New York", "Iowan Old Style", Georgia, serif',
  system: true,
};
const SYSTEM_SANS: FontEntry = {
  id: "system-sans",
  family: "System",
  style: "sans",
  stack:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  system: true,
};
const SYSTEM_MONO: FontEntry = {
  id: "system-mono",
  family: "System",
  style: "mono",
  stack: '"SF Mono", ui-monospace, Menlo, monospace',
  system: true,
};

// Vollkorn works beautifully as both a display and a reading serif, so it is
// offered in both roles from a single shared entry.
const vollkorn = webFont("vollkorn", "Vollkorn", "serif");

// Ubuntu's humanist sans family reads well in both titles and body, so each
// sans member is offered in the Display and Text sans groups from a shared
// entry (the mono members live in the Code role below).
const ubuntu = webFont("ubuntu", "Ubuntu", "sans");
const ubuntuSans = webFont("ubuntu-sans", "Ubuntu Sans", "sans");

// --- Display (titles / headlines) -------------------------------------------
const DISPLAY_SERIF: FontEntry[] = [
  webFont("playfair-display", "Playfair Display", "serif"),
  webFont("fraunces", "Fraunces", "serif"),
  webFont("petrona", "Petrona", "serif"),
  webFont("bodoni-moda", "Bodoni Moda", "serif"),
  vollkorn,
  webFont("gentium-book-plus", "Gentium Book Plus", "serif"),
  webFont("literata", "Literata", "serif"),
  webFont("crimson-pro", "Crimson Pro", "serif"),
];

const DISPLAY_SANS: FontEntry[] = [
  webFont("montserrat", "Montserrat", "sans"),
  webFont("raleway", "Raleway", "sans"),
  webFont("archivo", "Archivo", "sans"),
  webFont("libre-franklin", "Libre Franklin", "sans"),
  webFont("poppins", "Poppins", "sans"),
  webFont("plus-jakarta-sans", "Plus Jakarta Sans", "sans"),
  webFont("albert-sans", "Albert Sans", "sans"),
  webFont("hanken-grotesk", "Hanken Grotesk", "sans"),
  ubuntu,
  ubuntuSans,
];

// --- Text (body / reading) --------------------------------------------------
const TEXT_SERIF: FontEntry[] = [
  webFont("lora", "Lora", "serif"),
  webFont("source-serif-4", "Source Serif 4", "serif"),
  webFont("newsreader", "Newsreader", "serif"),
  vollkorn,
  webFont("merriweather", "Merriweather", "serif"),
  webFont("pt-serif", "PT Serif", "serif"),
  webFont("noto-serif", "Noto Serif", "serif"),
  webFont("bitter", "Bitter", "serif"),
];

const TEXT_SANS: FontEntry[] = [
  webFont("inter", "Inter", "sans"),
  webFont("work-sans", "Work Sans", "sans"),
  webFont("ibm-plex-sans", "IBM Plex Sans", "sans"),
  webFont("dm-sans", "DM Sans", "sans"),
  webFont("source-sans-3", "Source Sans 3", "sans"),
  webFont("open-sans", "Open Sans", "sans"),
  webFont("figtree", "Figtree", "sans"),
  webFont("rubik", "Rubik", "sans"),
  webFont("roboto", "Roboto", "sans"),
  ubuntu,
  ubuntuSans,
];

// --- Code (monospace) -------------------------------------------------------
const CODE: FontEntry[] = [
  webFont("jetbrains-mono", "JetBrains Mono", "mono"),
  webFont("source-code-pro", "Source Code Pro", "mono"),
  webFont("ibm-plex-mono", "IBM Plex Mono", "mono"),
  webFont("roboto-mono", "Roboto Mono", "mono"),
  webFont("space-mono", "Space Mono", "mono"),
  webFont("ubuntu-mono", "Ubuntu Mono", "mono"),
  webFont("red-hat-mono", "Red Hat Mono", "mono"),
  webFont("anonymous-pro", "Anonymous Pro", "mono"),
  webFont("cousine", "Cousine", "mono"),
  webFont("victor-mono", "Victor Mono", "mono"),
  webFont("spline-sans-mono", "Spline Sans Mono", "mono"),
  webFont("azeret-mono", "Azeret Mono", "mono"),
  webFont("b612-mono", "B612 Mono", "mono"),
  webFont("courier-prime", "Courier Prime", "mono"),
  webFont("sometype-mono", "Sometype Mono", "mono"),
  webFont("chivo-mono", "Chivo Mono", "mono"),
  webFont("ubuntu-sans-mono", "Ubuntu Sans Mono", "mono"),
];

// --- Public API -------------------------------------------------------------

/**
 * The ordered font options shown in each role's picker: the System default
 * first, then (for display/text) a Serif group followed by a Sans group.
 */
export const ROLE_FONTS: Record<FontRole, FontEntry[]> = {
  display: [SYSTEM_SERIF, ...DISPLAY_SERIF, ...DISPLAY_SANS],
  text: [SYSTEM_SANS, SYSTEM_SERIF, ...TEXT_SERIF, ...TEXT_SANS],
  code: [SYSTEM_MONO, ...CODE],
};

// The System default font entry for each role, used when the profile has no
// explicit mapping yet (preserving the pre-Phase-6 look).
const DEFAULT_FONT: Record<FontRole, FontEntry> = {
  display: SYSTEM_SERIF,
  text: SYSTEM_SANS,
  code: SYSTEM_MONO,
};

/**
 * The System default font id for each role, used when no level of the cascade
 * sets that role (preserving the pre-Phase-6 look).
 */
export const DEFAULT_FONT_ID: Record<FontRole, string> = {
  display: DEFAULT_FONT.display.id,
  text: DEFAULT_FONT.text.id,
  code: DEFAULT_FONT.code.id,
};

/** Flat id -> entry lookup across every role (deduped; Vollkorn appears once). */
export const FONT_REGISTRY: Record<string, FontEntry> = Object.fromEntries(
  [
    SYSTEM_SERIF,
    SYSTEM_SANS,
    SYSTEM_MONO,
    ...ROLE_FONTS.display,
    ...ROLE_FONTS.text,
    ...ROLE_FONTS.code,
  ].map((f) => [f.id, f]),
);

/** The three typography roles, in cascade/resolution order. */
export const FONT_ROLES: FontRole[] = ["display", "text", "code"];

/**
 * Resolves a font id to its entry, falling back to the role's System default
 * when the id is unknown (e.g. a font removed from the catalog).
 */
export function resolveFontEntry(
  fontId: string | undefined,
  role: FontRole,
): FontEntry {
  if (fontId) {
    const entry = FONT_REGISTRY[fontId];
    if (entry) return entry;
  }
  return DEFAULT_FONT[role];
}
