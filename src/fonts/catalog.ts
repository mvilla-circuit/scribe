// Curated, self-hosted typography catalog for Phase 6.
//
// Three purpose roles drive the reading surface: Display (titles), Text (body),
// and Code (monospace). Each role offers a System default plus a hand-picked set
// of families bundled via `@fontsource`. Every web family here ships a *true*
// bold and italic (regular / bold / italic / bold-italic), so the editor's
// bold/italic render real cuts rather than synthesized slants.
//
// Fonts are loaded lazily (see loadFont.ts): the loaders below only import the
// Latin subset CSS for the four weight/style combinations we rely on, so a
// chosen font pulls a handful of small woff2 files and nothing else — fully
// offline once bundled, no API key.

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

export type FontRole = "display" | "text" | "code";
export type FontStyle = "serif" | "sans" | "mono";

// A (partial) role -> fontId map. Stored at each level of the cascade
// (global / book / page); unset roles inherit from the level above.
export type FontMap = Partial<Record<FontRole, string>>;
// A fully-resolved map with every role present (after applying defaults).
export type ResolvedFonts = Record<FontRole, string>;

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

function webFont(
  id: string,
  family: string,
  style: FontStyle,
  load: () => Promise<unknown>,
): FontEntry {
  return { id, family, style, stack: stackFor(style, family), load };
}

// --- System defaults (no web font) ------------------------------------------
export const SYSTEM_SERIF: FontEntry = {
  id: "system-serif",
  family: "System (New York)",
  style: "serif",
  stack: '"New York", "Iowan Old Style", Georgia, serif',
  system: true,
};
export const SYSTEM_SANS: FontEntry = {
  id: "system-sans",
  family: "System",
  style: "sans",
  stack:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  system: true,
};
export const SYSTEM_MONO: FontEntry = {
  id: "system-mono",
  family: "System",
  style: "mono",
  stack: '"SF Mono", ui-monospace, Menlo, monospace',
  system: true,
};

// Vollkorn works beautifully as both a display and a reading serif, so it is
// offered in both roles from a single shared entry.
const vollkorn = webFont("vollkorn", "Vollkorn", "serif", () =>
  Promise.all([
    import("@fontsource/vollkorn/latin-400.css"),
    import("@fontsource/vollkorn/latin-700.css"),
    import("@fontsource/vollkorn/latin-400-italic.css"),
    import("@fontsource/vollkorn/latin-700-italic.css"),
  ]),
);

// Ubuntu's humanist sans family reads well in both titles and body, so each
// sans member is offered in the Display and Text sans groups from a shared
// entry (the mono members live in the Code role below).
const ubuntu = webFont("ubuntu", "Ubuntu", "sans", () =>
  Promise.all([
    import("@fontsource/ubuntu/latin-400.css"),
    import("@fontsource/ubuntu/latin-700.css"),
    import("@fontsource/ubuntu/latin-400-italic.css"),
    import("@fontsource/ubuntu/latin-700-italic.css"),
  ]),
);
const ubuntuSans = webFont("ubuntu-sans", "Ubuntu Sans", "sans", () =>
  Promise.all([
    import("@fontsource/ubuntu-sans/latin-400.css"),
    import("@fontsource/ubuntu-sans/latin-700.css"),
    import("@fontsource/ubuntu-sans/latin-400-italic.css"),
    import("@fontsource/ubuntu-sans/latin-700-italic.css"),
  ]),
);

// --- Display (titles / headlines) -------------------------------------------
const DISPLAY_SERIF: FontEntry[] = [
  webFont("playfair-display", "Playfair Display", "serif", () =>
    Promise.all([
      import("@fontsource/playfair-display/latin-400.css"),
      import("@fontsource/playfair-display/latin-700.css"),
      import("@fontsource/playfair-display/latin-400-italic.css"),
      import("@fontsource/playfair-display/latin-700-italic.css"),
    ]),
  ),
  webFont("fraunces", "Fraunces", "serif", () =>
    Promise.all([
      import("@fontsource/fraunces/latin-400.css"),
      import("@fontsource/fraunces/latin-700.css"),
      import("@fontsource/fraunces/latin-400-italic.css"),
      import("@fontsource/fraunces/latin-700-italic.css"),
    ]),
  ),
  webFont("petrona", "Petrona", "serif", () =>
    Promise.all([
      import("@fontsource/petrona/latin-400.css"),
      import("@fontsource/petrona/latin-700.css"),
      import("@fontsource/petrona/latin-400-italic.css"),
      import("@fontsource/petrona/latin-700-italic.css"),
    ]),
  ),
  webFont("bodoni-moda", "Bodoni Moda", "serif", () =>
    Promise.all([
      import("@fontsource/bodoni-moda/latin-400.css"),
      import("@fontsource/bodoni-moda/latin-700.css"),
      import("@fontsource/bodoni-moda/latin-400-italic.css"),
      import("@fontsource/bodoni-moda/latin-700-italic.css"),
    ]),
  ),
  vollkorn,
  webFont("gentium-book-plus", "Gentium Book Plus", "serif", () =>
    Promise.all([
      import("@fontsource/gentium-book-plus/latin-400.css"),
      import("@fontsource/gentium-book-plus/latin-700.css"),
      import("@fontsource/gentium-book-plus/latin-400-italic.css"),
      import("@fontsource/gentium-book-plus/latin-700-italic.css"),
    ]),
  ),
  webFont("literata", "Literata", "serif", () =>
    Promise.all([
      import("@fontsource/literata/latin-400.css"),
      import("@fontsource/literata/latin-700.css"),
      import("@fontsource/literata/latin-400-italic.css"),
      import("@fontsource/literata/latin-700-italic.css"),
    ]),
  ),
  webFont("crimson-pro", "Crimson Pro", "serif", () =>
    Promise.all([
      import("@fontsource/crimson-pro/latin-400.css"),
      import("@fontsource/crimson-pro/latin-700.css"),
      import("@fontsource/crimson-pro/latin-400-italic.css"),
      import("@fontsource/crimson-pro/latin-700-italic.css"),
    ]),
  ),
];

const DISPLAY_SANS: FontEntry[] = [
  webFont("montserrat", "Montserrat", "sans", () =>
    Promise.all([
      import("@fontsource/montserrat/latin-400.css"),
      import("@fontsource/montserrat/latin-700.css"),
      import("@fontsource/montserrat/latin-400-italic.css"),
      import("@fontsource/montserrat/latin-700-italic.css"),
    ]),
  ),
  webFont("raleway", "Raleway", "sans", () =>
    Promise.all([
      import("@fontsource/raleway/latin-400.css"),
      import("@fontsource/raleway/latin-700.css"),
      import("@fontsource/raleway/latin-400-italic.css"),
      import("@fontsource/raleway/latin-700-italic.css"),
    ]),
  ),
  webFont("archivo", "Archivo", "sans", () =>
    Promise.all([
      import("@fontsource/archivo/latin-400.css"),
      import("@fontsource/archivo/latin-700.css"),
      import("@fontsource/archivo/latin-400-italic.css"),
      import("@fontsource/archivo/latin-700-italic.css"),
    ]),
  ),
  webFont("libre-franklin", "Libre Franklin", "sans", () =>
    Promise.all([
      import("@fontsource/libre-franklin/latin-400.css"),
      import("@fontsource/libre-franklin/latin-700.css"),
      import("@fontsource/libre-franklin/latin-400-italic.css"),
      import("@fontsource/libre-franklin/latin-700-italic.css"),
    ]),
  ),
  webFont("poppins", "Poppins", "sans", () =>
    Promise.all([
      import("@fontsource/poppins/latin-400.css"),
      import("@fontsource/poppins/latin-700.css"),
      import("@fontsource/poppins/latin-400-italic.css"),
      import("@fontsource/poppins/latin-700-italic.css"),
    ]),
  ),
  webFont("plus-jakarta-sans", "Plus Jakarta Sans", "sans", () =>
    Promise.all([
      import("@fontsource/plus-jakarta-sans/latin-400.css"),
      import("@fontsource/plus-jakarta-sans/latin-700.css"),
      import("@fontsource/plus-jakarta-sans/latin-400-italic.css"),
      import("@fontsource/plus-jakarta-sans/latin-700-italic.css"),
    ]),
  ),
  webFont("albert-sans", "Albert Sans", "sans", () =>
    Promise.all([
      import("@fontsource/albert-sans/latin-400.css"),
      import("@fontsource/albert-sans/latin-700.css"),
      import("@fontsource/albert-sans/latin-400-italic.css"),
      import("@fontsource/albert-sans/latin-700-italic.css"),
    ]),
  ),
  webFont("hanken-grotesk", "Hanken Grotesk", "sans", () =>
    Promise.all([
      import("@fontsource/hanken-grotesk/latin-400.css"),
      import("@fontsource/hanken-grotesk/latin-700.css"),
      import("@fontsource/hanken-grotesk/latin-400-italic.css"),
      import("@fontsource/hanken-grotesk/latin-700-italic.css"),
    ]),
  ),
  ubuntu,
  ubuntuSans,
];

// --- Text (body / reading) --------------------------------------------------
const TEXT_SERIF: FontEntry[] = [
  webFont("lora", "Lora", "serif", () =>
    Promise.all([
      import("@fontsource/lora/latin-400.css"),
      import("@fontsource/lora/latin-700.css"),
      import("@fontsource/lora/latin-400-italic.css"),
      import("@fontsource/lora/latin-700-italic.css"),
    ]),
  ),
  webFont("source-serif-4", "Source Serif 4", "serif", () =>
    Promise.all([
      import("@fontsource/source-serif-4/latin-400.css"),
      import("@fontsource/source-serif-4/latin-700.css"),
      import("@fontsource/source-serif-4/latin-400-italic.css"),
      import("@fontsource/source-serif-4/latin-700-italic.css"),
    ]),
  ),
  webFont("newsreader", "Newsreader", "serif", () =>
    Promise.all([
      import("@fontsource/newsreader/latin-400.css"),
      import("@fontsource/newsreader/latin-700.css"),
      import("@fontsource/newsreader/latin-400-italic.css"),
      import("@fontsource/newsreader/latin-700-italic.css"),
    ]),
  ),
  vollkorn,
  webFont("merriweather", "Merriweather", "serif", () =>
    Promise.all([
      import("@fontsource/merriweather/latin-400.css"),
      import("@fontsource/merriweather/latin-700.css"),
      import("@fontsource/merriweather/latin-400-italic.css"),
      import("@fontsource/merriweather/latin-700-italic.css"),
    ]),
  ),
  webFont("pt-serif", "PT Serif", "serif", () =>
    Promise.all([
      import("@fontsource/pt-serif/latin-400.css"),
      import("@fontsource/pt-serif/latin-700.css"),
      import("@fontsource/pt-serif/latin-400-italic.css"),
      import("@fontsource/pt-serif/latin-700-italic.css"),
    ]),
  ),
  webFont("noto-serif", "Noto Serif", "serif", () =>
    Promise.all([
      import("@fontsource/noto-serif/latin-400.css"),
      import("@fontsource/noto-serif/latin-700.css"),
      import("@fontsource/noto-serif/latin-400-italic.css"),
      import("@fontsource/noto-serif/latin-700-italic.css"),
    ]),
  ),
  webFont("bitter", "Bitter", "serif", () =>
    Promise.all([
      import("@fontsource/bitter/latin-400.css"),
      import("@fontsource/bitter/latin-700.css"),
      import("@fontsource/bitter/latin-400-italic.css"),
      import("@fontsource/bitter/latin-700-italic.css"),
    ]),
  ),
];

const TEXT_SANS: FontEntry[] = [
  webFont("inter", "Inter", "sans", () =>
    Promise.all([
      import("@fontsource/inter/latin-400.css"),
      import("@fontsource/inter/latin-700.css"),
      import("@fontsource/inter/latin-400-italic.css"),
      import("@fontsource/inter/latin-700-italic.css"),
    ]),
  ),
  webFont("work-sans", "Work Sans", "sans", () =>
    Promise.all([
      import("@fontsource/work-sans/latin-400.css"),
      import("@fontsource/work-sans/latin-700.css"),
      import("@fontsource/work-sans/latin-400-italic.css"),
      import("@fontsource/work-sans/latin-700-italic.css"),
    ]),
  ),
  webFont("ibm-plex-sans", "IBM Plex Sans", "sans", () =>
    Promise.all([
      import("@fontsource/ibm-plex-sans/latin-400.css"),
      import("@fontsource/ibm-plex-sans/latin-700.css"),
      import("@fontsource/ibm-plex-sans/latin-400-italic.css"),
      import("@fontsource/ibm-plex-sans/latin-700-italic.css"),
    ]),
  ),
  webFont("dm-sans", "DM Sans", "sans", () =>
    Promise.all([
      import("@fontsource/dm-sans/latin-400.css"),
      import("@fontsource/dm-sans/latin-700.css"),
      import("@fontsource/dm-sans/latin-400-italic.css"),
      import("@fontsource/dm-sans/latin-700-italic.css"),
    ]),
  ),
  webFont("source-sans-3", "Source Sans 3", "sans", () =>
    Promise.all([
      import("@fontsource/source-sans-3/latin-400.css"),
      import("@fontsource/source-sans-3/latin-700.css"),
      import("@fontsource/source-sans-3/latin-400-italic.css"),
      import("@fontsource/source-sans-3/latin-700-italic.css"),
    ]),
  ),
  webFont("open-sans", "Open Sans", "sans", () =>
    Promise.all([
      import("@fontsource/open-sans/latin-400.css"),
      import("@fontsource/open-sans/latin-700.css"),
      import("@fontsource/open-sans/latin-400-italic.css"),
      import("@fontsource/open-sans/latin-700-italic.css"),
    ]),
  ),
  webFont("figtree", "Figtree", "sans", () =>
    Promise.all([
      import("@fontsource/figtree/latin-400.css"),
      import("@fontsource/figtree/latin-700.css"),
      import("@fontsource/figtree/latin-400-italic.css"),
      import("@fontsource/figtree/latin-700-italic.css"),
    ]),
  ),
  webFont("rubik", "Rubik", "sans", () =>
    Promise.all([
      import("@fontsource/rubik/latin-400.css"),
      import("@fontsource/rubik/latin-700.css"),
      import("@fontsource/rubik/latin-400-italic.css"),
      import("@fontsource/rubik/latin-700-italic.css"),
    ]),
  ),
  webFont("roboto", "Roboto", "sans", () =>
    Promise.all([
      import("@fontsource/roboto/latin-400.css"),
      import("@fontsource/roboto/latin-700.css"),
      import("@fontsource/roboto/latin-400-italic.css"),
      import("@fontsource/roboto/latin-700-italic.css"),
    ]),
  ),
  ubuntu,
  ubuntuSans,
];

// --- Code (monospace) -------------------------------------------------------
const CODE: FontEntry[] = [
  webFont("jetbrains-mono", "JetBrains Mono", "mono", () =>
    Promise.all([
      import("@fontsource/jetbrains-mono/latin-400.css"),
      import("@fontsource/jetbrains-mono/latin-700.css"),
      import("@fontsource/jetbrains-mono/latin-400-italic.css"),
      import("@fontsource/jetbrains-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("source-code-pro", "Source Code Pro", "mono", () =>
    Promise.all([
      import("@fontsource/source-code-pro/latin-400.css"),
      import("@fontsource/source-code-pro/latin-700.css"),
      import("@fontsource/source-code-pro/latin-400-italic.css"),
      import("@fontsource/source-code-pro/latin-700-italic.css"),
    ]),
  ),
  webFont("ibm-plex-mono", "IBM Plex Mono", "mono", () =>
    Promise.all([
      import("@fontsource/ibm-plex-mono/latin-400.css"),
      import("@fontsource/ibm-plex-mono/latin-700.css"),
      import("@fontsource/ibm-plex-mono/latin-400-italic.css"),
      import("@fontsource/ibm-plex-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("roboto-mono", "Roboto Mono", "mono", () =>
    Promise.all([
      import("@fontsource/roboto-mono/latin-400.css"),
      import("@fontsource/roboto-mono/latin-700.css"),
      import("@fontsource/roboto-mono/latin-400-italic.css"),
      import("@fontsource/roboto-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("space-mono", "Space Mono", "mono", () =>
    Promise.all([
      import("@fontsource/space-mono/latin-400.css"),
      import("@fontsource/space-mono/latin-700.css"),
      import("@fontsource/space-mono/latin-400-italic.css"),
      import("@fontsource/space-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("ubuntu-mono", "Ubuntu Mono", "mono", () =>
    Promise.all([
      import("@fontsource/ubuntu-mono/latin-400.css"),
      import("@fontsource/ubuntu-mono/latin-700.css"),
      import("@fontsource/ubuntu-mono/latin-400-italic.css"),
      import("@fontsource/ubuntu-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("red-hat-mono", "Red Hat Mono", "mono", () =>
    Promise.all([
      import("@fontsource/red-hat-mono/latin-400.css"),
      import("@fontsource/red-hat-mono/latin-700.css"),
      import("@fontsource/red-hat-mono/latin-400-italic.css"),
      import("@fontsource/red-hat-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("anonymous-pro", "Anonymous Pro", "mono", () =>
    Promise.all([
      import("@fontsource/anonymous-pro/latin-400.css"),
      import("@fontsource/anonymous-pro/latin-700.css"),
      import("@fontsource/anonymous-pro/latin-400-italic.css"),
      import("@fontsource/anonymous-pro/latin-700-italic.css"),
    ]),
  ),
  webFont("cousine", "Cousine", "mono", () =>
    Promise.all([
      import("@fontsource/cousine/latin-400.css"),
      import("@fontsource/cousine/latin-700.css"),
      import("@fontsource/cousine/latin-400-italic.css"),
      import("@fontsource/cousine/latin-700-italic.css"),
    ]),
  ),
  webFont("victor-mono", "Victor Mono", "mono", () =>
    Promise.all([
      import("@fontsource/victor-mono/latin-400.css"),
      import("@fontsource/victor-mono/latin-700.css"),
      import("@fontsource/victor-mono/latin-400-italic.css"),
      import("@fontsource/victor-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("spline-sans-mono", "Spline Sans Mono", "mono", () =>
    Promise.all([
      import("@fontsource/spline-sans-mono/latin-400.css"),
      import("@fontsource/spline-sans-mono/latin-700.css"),
      import("@fontsource/spline-sans-mono/latin-400-italic.css"),
      import("@fontsource/spline-sans-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("azeret-mono", "Azeret Mono", "mono", () =>
    Promise.all([
      import("@fontsource/azeret-mono/latin-400.css"),
      import("@fontsource/azeret-mono/latin-700.css"),
      import("@fontsource/azeret-mono/latin-400-italic.css"),
      import("@fontsource/azeret-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("b612-mono", "B612 Mono", "mono", () =>
    Promise.all([
      import("@fontsource/b612-mono/latin-400.css"),
      import("@fontsource/b612-mono/latin-700.css"),
      import("@fontsource/b612-mono/latin-400-italic.css"),
      import("@fontsource/b612-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("courier-prime", "Courier Prime", "mono", () =>
    Promise.all([
      import("@fontsource/courier-prime/latin-400.css"),
      import("@fontsource/courier-prime/latin-700.css"),
      import("@fontsource/courier-prime/latin-400-italic.css"),
      import("@fontsource/courier-prime/latin-700-italic.css"),
    ]),
  ),
  webFont("sometype-mono", "Sometype Mono", "mono", () =>
    Promise.all([
      import("@fontsource/sometype-mono/latin-400.css"),
      import("@fontsource/sometype-mono/latin-700.css"),
      import("@fontsource/sometype-mono/latin-400-italic.css"),
      import("@fontsource/sometype-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("chivo-mono", "Chivo Mono", "mono", () =>
    Promise.all([
      import("@fontsource/chivo-mono/latin-400.css"),
      import("@fontsource/chivo-mono/latin-700.css"),
      import("@fontsource/chivo-mono/latin-400-italic.css"),
      import("@fontsource/chivo-mono/latin-700-italic.css"),
    ]),
  ),
  webFont("ubuntu-sans-mono", "Ubuntu Sans Mono", "mono", () =>
    Promise.all([
      import("@fontsource/ubuntu-sans-mono/latin-400.css"),
      import("@fontsource/ubuntu-sans-mono/latin-700.css"),
      import("@fontsource/ubuntu-sans-mono/latin-400-italic.css"),
      import("@fontsource/ubuntu-sans-mono/latin-700-italic.css"),
    ]),
  ),
];

// --- Public API -------------------------------------------------------------

// The ordered options shown in each role's picker: the System default first,
// then (for display/text) a Serif group followed by a Sans group.
export const ROLE_FONTS: Record<FontRole, FontEntry[]> = {
  display: [SYSTEM_SERIF, ...DISPLAY_SERIF, ...DISPLAY_SANS],
  text: [SYSTEM_SANS, ...TEXT_SERIF, ...TEXT_SANS],
  code: [SYSTEM_MONO, ...CODE],
};

// The System default font entry for each role, used when the profile has no
// explicit mapping yet (preserving the pre-Phase-6 look).
export const DEFAULT_FONT: Record<FontRole, FontEntry> = {
  display: SYSTEM_SERIF,
  text: SYSTEM_SANS,
  code: SYSTEM_MONO,
};

export const DEFAULT_FONT_ID: Record<FontRole, string> = {
  display: SYSTEM_SERIF.id,
  text: SYSTEM_SANS.id,
  code: SYSTEM_MONO.id,
};

// Flat id -> entry lookup across every role (deduped; Vollkorn appears once).
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

export const FONT_ROLES: FontRole[] = ["display", "text", "code"];

export function isFontRole(value: unknown): value is FontRole {
  return value === "display" || value === "text" || value === "code";
}

// Resolves a font id to its entry, falling back to the role's System default
// when the id is unknown (e.g. a font removed from the catalog).
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
