import nameToId from "./_name-to-id.json";
import { canonicalizeFontId } from "./aliases";
import { LOCAL_FONT_IDS, localLoader } from "./loaders/local";
import { weightUnionFor } from "./metrics";

/** The three typography roles that drive the reading surface. */
export type FontRole = "display" | "text" | "code";
type FontStyle = "serif" | "sans" | "mono";

/**
 * A partial role-to-font map stored at each level of the font cascade.
 */
export type FontMap = Partial<Record<FontRole, string>>;

/** A fully-resolved map with every role present. */
export type ResolvedFonts = Record<FontRole, string>;

/** A selectable font with its CSS stack and optional lazy CSS loader. */
export interface FontEntry {
  /** Stable id stored in the database. */
  id: string;
  /** Display label and primary CSS family name. */
  family: string;
  style: FontStyle;
  /** The complete CSS `font-family` stack. */
  stack: string;
  /** True when the face is supplied by the operating system. */
  system?: boolean;
  /** Lazily imports the font's CSS assets. */
  load?: () => Promise<unknown>;
}

/**
 * Family labels indexed by catalog id, generated from the locked lab snapshot.
 */
export const FONT_FAMILIES: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(nameToId).map(([family, id]) => [id, family]),
  );

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

const FONT_SHEETS = import.meta.glob("/node_modules/@fontsource/*/latin-*.css");

function nearestHundred(weight: number): string {
  return `${Math.round(weight / 100) * 100}`;
}

/**
 * Lazily loads the regular, italic, and metric-derived cuts available for a
 * Fontsource family. Missing optional cuts are skipped so an unsupported
 * optical weight never prevents the usable cuts from loading.
 */
function fontsourceLoader(id: string): () => Promise<unknown> {
  return () => {
    const weights = new Set(["400", "700"]);
    for (const weight of weightUnionFor(id)) {
      weights.add(nearestHundred(weight));
    }

    const paths = [...weights].flatMap((weight) => [
      `/node_modules/@fontsource/${id}/latin-${weight}.css`,
      `/node_modules/@fontsource/${id}/latin-${weight}-italic.css`,
    ]);
    const sheets = paths
      .map((path) => FONT_SHEETS[path])
      .filter((sheet): sheet is () => Promise<unknown> => sheet !== undefined);

    return sheets.length > 0
      ? Promise.all(sheets.map((sheet) => sheet()))
      : Promise.reject(new Error(`Missing font stylesheets for: ${id}`));
  };
}

function webFont(id: string, style: FontStyle): FontEntry {
  const family = FONT_FAMILIES[id] ?? id;
  return {
    id,
    family,
    style,
    stack: stackFor(style, family),
    load: fontsourceLoader(id),
  };
}

function localFont(id: string, style: FontStyle): FontEntry {
  const family = FONT_FAMILIES[id] ?? id;
  return {
    id,
    family,
    style,
    stack: stackFor(style, family),
    load: localLoader(id),
  };
}

function systemFont(
  id: string,
  family: string,
  style: FontStyle,
  stack: string,
): FontEntry {
  return { id, family, style, stack, system: true };
}

const SYSTEM_FONTS: Record<string, FontEntry> = {
  "system-serif": systemFont(
    "system-serif",
    "System (New York)",
    "serif",
    '"New York", "Iowan Old Style", Georgia, serif',
  ),
  "system-sans": systemFont(
    "system-sans",
    "System (San Francisco)",
    "sans",
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  ),
  "system-mono": systemFont(
    "system-mono",
    "System (SF Mono)",
    "mono",
    '"SF Mono", ui-monospace, Menlo, monospace',
  ),
  georgia: systemFont("georgia", "Georgia", "serif", "Georgia, serif"),
  "hoefler-text": systemFont(
    "hoefler-text",
    "Hoefler Text",
    "serif",
    '"Hoefler Text", Baskerville, Georgia, serif',
  ),
  palatino: systemFont(
    "palatino",
    "Palatino",
    "serif",
    '"Palatino Linotype", Palatino, Georgia, serif',
  ),
  "avenir-next": systemFont(
    "avenir-next",
    "Avenir Next",
    "sans",
    '"Avenir Next", Avenir, system-ui, sans-serif',
  ),
  verdana: systemFont(
    "verdana",
    "Verdana",
    "sans",
    "Verdana, system-ui, sans-serif",
  ),
  menlo: systemFont("menlo", "Menlo", "mono", "Menlo, ui-monospace, monospace"),
  "sf-mono": systemFont(
    "sf-mono",
    "SF Mono",
    "mono",
    '"SF Mono", Menlo, ui-monospace, monospace',
  ),
};

const LOCAL_IDS = new Set<string>(LOCAL_FONT_IDS);
const entries = new Map<string, FontEntry>(Object.entries(SYSTEM_FONTS));

function entryFor(id: string, style: FontStyle): FontEntry {
  const existing = entries.get(id);
  if (existing) return existing;
  const entry = LOCAL_IDS.has(id) ? localFont(id, style) : webFont(id, style);
  entries.set(id, entry);
  return entry;
}

function group(ids: readonly string[], style: FontStyle): FontEntry[] {
  return ids.map((id) => entryFor(id, style));
}

const DISPLAY_SERIF = group(
  [
    "system-serif",
    "aleo",
    "arvo",
    "besley",
    "bespoke-serif",
    "bespoke-slab",
    "bitter",
    "brygada-1918",
    "cardillac",
    "crimson-pro",
    "erode",
    "fraunces",
    "gambetta",
    "georgia",
    "hoefler-text",
    "literata",
    "merriweather",
    "noto-serif",
    "noto-serif-display",
    "old-standard-tt",
    "petrona",
    "playfair-display",
    "recia",
    "roboto-serif",
    "rowan",
    "sentient",
    "source-serif-4",
    "stix-two-text",
    "vollkorn",
    "zilla-slab",
    "zodiak",
    "chubbo",
    "neco",
  ],
  "serif",
);

const DISPLAY_SANS = group(
  [
    "albert-sans",
    "amulya",
    "archivo",
    "atkinson-hyperlegible",
    "avenir-next",
    "barlow",
    "be-vietnam-pro",
    "bespoke-sans",
    "chivo",
    "epilogue",
    "figtree",
    "fira-sans",
    "geist",
    "general-sans",
    "ibm-plex-sans",
    "industry",
    "instrument-sans",
    "inter",
    "kanit",
    "libre-franklin",
    "montserrat",
    "mulish",
    "open-sans",
    "plus-jakarta-sans",
    "poppins",
    "public-sans",
    "raleway",
    "red-hat-display",
    "red-hat-text",
    "roboto",
    "rubik",
    "saira",
    "satoshi",
    "sora",
    "source-sans-3",
    "supreme",
    "switzer",
    "ubuntu",
    "urbanist",
    "work-sans",
  ],
  "sans",
);

const TEXT_SERIF = group(
  [
    "system-serif",
    "bespoke-serif",
    "bespoke-slab",
    "crimson-pro",
    "erode",
    "gambetta",
    "gentium-book-plus",
    "georgia",
    "hoefler-text",
    "libre-caslon-text",
    "literata",
    "lora",
    "merriweather",
    "neuton",
    "newsreader",
    "noto-serif",
    "old-standard-tt",
    "palatino",
    "petrona",
    "piazzolla",
    "pt-serif",
    "recia",
    "roboto-serif",
    "rowan",
    "sentient",
    "source-serif-4",
    "stix-two-text",
    "tinos",
    "vollkorn",
    "zilla-slab",
    "chubbo",
    "amulya",
  ],
  "serif",
);

const TEXT_SANS = group(
  [
    "system-sans",
    "barlow",
    "be-vietnam-pro",
    "bespoke-sans",
    "chivo",
    "epilogue",
    "figtree",
    "fira-sans",
    "frygia",
    "geist",
    "general-sans",
    "hanken-grotesk",
    "ibm-plex-sans",
    "industry",
    "inter",
    "mulish",
    "nunito-sans",
    "open-sans",
    "overpass",
    "plus-jakarta-sans",
    "pt-sans",
    "public-sans",
    "red-hat-text",
    "roboto",
    "rubik",
    "saira",
    "satoshi",
    "source-sans-3",
    "supreme",
    "switzer",
    "ubuntu-sans",
    "verdana",
    "work-sans",
  ],
  "sans",
);

const CODE = group(
  [
    "system-mono",
    "chivo-mono",
    "geist-mono",
    "jetbrains-mono",
    "lilex",
    "menlo",
    "roboto-mono",
    "sf-mono",
    "sometype-mono",
    "source-code-pro",
    "space-mono",
    "spline-sans-mono",
    "tabular",
    "ubuntu-mono",
  ],
  "mono",
);

/**
 * Ordered picker options for each role. Entries appearing in several roles
 * are resolved through a shared registry object.
 */
export const ROLE_FONTS: Record<FontRole, FontEntry[]> = {
  display: DISPLAY_SERIF.concat(DISPLAY_SANS),
  text: TEXT_SERIF.concat(TEXT_SANS),
  code: CODE,
};

const DEFAULT_FONT: Record<FontRole, FontEntry> = {
  display: entryFor("system-serif", "serif"),
  text: entryFor("system-sans", "sans"),
  code: entryFor("system-mono", "mono"),
};

/** Default stored id for every typography role. */
export const DEFAULT_FONT_ID: Record<FontRole, string> = {
  display: "system-serif",
  text: "system-sans",
  code: "system-mono",
};

/** Flat id-to-entry lookup across every catalog role. */
export const FONT_REGISTRY: Record<string, FontEntry> =
  Object.fromEntries(entries);

/** Typography roles in cascade resolution order. */
export const FONT_ROLES: FontRole[] = ["display", "text", "code"];

/**
 * Resolves an id to its catalog entry, applying legacy aliases before falling
 * back to the role's System default. Stored JSONB maps are never rewritten.
 */
export function resolveFontEntry(
  fontId: string | undefined,
  role: FontRole,
): FontEntry {
  if (fontId) {
    const entry = FONT_REGISTRY[canonicalizeFontId(fontId)];
    if (entry) return entry;
  }
  return DEFAULT_FONT[role];
}
