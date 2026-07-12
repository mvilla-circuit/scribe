import type { Json } from "@/lib/database.types";

/** The available presentation layouts for a collection. */
export type CollectionLayout = "grid" | "list";

/**
 * Gallery kind keys for section headings in the collection grid.
 * Kept in the data layer so parse/serialize stay free of component imports.
 */
export type GallerySectionKind =
  "collection" | "book" | "entry" | "datagrid" | "whiteboard";

/** Default plural labels for gallery section headings. */
export const DEFAULT_SECTION_LABELS: Record<GallerySectionKind, string> = {
  collection: "Collections",
  book: "Books",
  entry: "Docs",
  datagrid: "Datagrids",
  whiteboard: "Whiteboards",
};

const SECTION_KINDS = Object.keys(
  DEFAULT_SECTION_LABELS,
) as GallerySectionKind[];

/** The persisted display preferences for a collection. */
export interface CollectionView {
  layout: CollectionLayout;
  /** Per-kind overrides for gallery section headings. */
  sectionLabels?: Partial<Record<GallerySectionKind, string>>;
}

const DEFAULT_COLLECTION_VIEW: CollectionView = {
  layout: "grid",
};

function isGallerySectionKind(key: string): key is GallerySectionKind {
  return key in DEFAULT_SECTION_LABELS;
}

/**
 * Keeps only known kind keys with trimmed non-empty strings that differ from
 * the default label for that kind.
 */
function sanitizeSectionLabels(
  raw: unknown,
): Partial<Record<GallerySectionKind, string>> | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return undefined;
  }

  const labels: Partial<Record<GallerySectionKind, string>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isGallerySectionKind(key) || typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed === DEFAULT_SECTION_LABELS[key]) continue;
    labels[key] = trimmed;
  }

  return Object.keys(labels).length > 0 ? labels : undefined;
}

/**
 * Converts an untrusted persisted collection view into supported preferences.
 * Invalid or missing values fall back to the grid default. Legacy `sort` keys
 * are ignored — the gallery always sorts alphabetically.
 */
export function parseCollectionView(raw: unknown): CollectionView {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return DEFAULT_COLLECTION_VIEW;
  }

  const record = raw as Record<string, unknown>;
  const sectionLabels = sanitizeSectionLabels(record.sectionLabels);
  return {
    layout: record.layout === "list" ? "list" : DEFAULT_COLLECTION_VIEW.layout,
    ...(sectionLabels ? { sectionLabels } : {}),
  };
}

/** Returns a JSON-ready copy of a collection view with lean sectionLabels. */
export function serializeCollectionView(view: CollectionView): Json {
  const sectionLabels = sanitizeSectionLabels(view.sectionLabels);
  if (!sectionLabels) {
    return { layout: view.layout };
  }

  const labels: Record<string, Json | undefined> = {};
  for (const kind of SECTION_KINDS) {
    const value = sectionLabels[kind];
    if (value !== undefined) labels[kind] = value;
  }
  return { layout: view.layout, sectionLabels: labels };
}

/** Resolves the display label for a gallery section (override or default). */
export function sectionLabel(
  view: CollectionView,
  kind: GallerySectionKind,
): string {
  return view.sectionLabels?.[kind] ?? DEFAULT_SECTION_LABELS[kind];
}

/**
 * Returns a new view with the given section label set or cleared. Empty /
 * whitespace and values equal to the default omit the key.
 */
export function setSectionLabel(
  view: CollectionView,
  kind: GallerySectionKind,
  label: string,
): CollectionView {
  const trimmed = label.trim();
  const nextLabels: Partial<Record<GallerySectionKind, string>> = {};
  for (const existing of SECTION_KINDS) {
    if (existing === kind) continue;
    const value = view.sectionLabels?.[existing];
    if (value !== undefined) nextLabels[existing] = value;
  }

  if (trimmed && trimmed !== DEFAULT_SECTION_LABELS[kind]) {
    nextLabels[kind] = trimmed;
  }

  const hasLabels = SECTION_KINDS.some((k) => nextLabels[k] !== undefined);
  return {
    layout: view.layout,
    ...(hasLabels ? { sectionLabels: nextLabels } : {}),
  };
}
