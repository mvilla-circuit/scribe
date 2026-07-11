/** The available presentation layouts for a collection. */
export type CollectionLayout = "grid" | "list";

/** The persisted grid/list preference for a collection. */
export interface CollectionView {
  layout: CollectionLayout;
}

const DEFAULT_COLLECTION_VIEW: CollectionView = {
  layout: "grid",
};

/**
 * Converts an untrusted persisted collection view into supported preferences.
 * Invalid or missing values fall back to the grid default. Legacy `sort` keys
 * are ignored — the gallery always sorts alphabetically.
 */
export function parseCollectionView(raw: unknown): CollectionView {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return DEFAULT_COLLECTION_VIEW;
  }

  const { layout } = raw as Record<string, unknown>;
  return {
    layout: layout === "list" ? "list" : DEFAULT_COLLECTION_VIEW.layout,
  };
}

/** Returns a JSON-ready copy of a collection view. */
export function serializeCollectionView(view: CollectionView): CollectionView {
  return { ...view };
}
