// Centralized React Query keys for the data layer. Defining them in one place
// keeps cross-entity invalidation (e.g. deleting a folder reconciling books, or
// a document mutation refreshing the page index) from re-declaring another
// module's key by hand and silently drifting if a key's shape ever changes.

/** Cache key for the signed-in user's books. */
export const booksKey = ["books"] as const;

/** Cache key for the signed-in user's folders. */
export const foldersKey = ["folders"] as const;

/** Cache key for the signed-in user's profile row. */
export const profileKey = ["profile"] as const;

/** Cache key for the cross-book page index that backs link cards and the picker. */
export const pageIndexKey = ["page-index"] as const;

/**
 * Sentinel bookId used to key the documents query when no book is selected, so
 * the (disabled) query still has a stable key instead of a hand-typed literal.
 */
export const NO_BOOK = "__none__";

/**
 * Sentinel entry id used to key the content query when no entry is selected.
 */
export const NO_COLLECTION = "__none__";

/**
 * Cache key for one book's pages. Documents are keyed per book so opening a book
 * loads only its own pages and optimistic mutations touch a single cache entry.
 * This list holds page *metadata* only (no editor body) so writing to a page
 * never churns the structural cache the tree, outline, and TOC derive from.
 */
export const documentsKey = (bookId: string) => ["documents", bookId] as const;

/**
 * Cache key for a single page's editor body, kept separate from the metadata
 * list above so a content autosave only touches this one entry — never the list
 * (and never the cross-book page index).
 */
export const documentContentKey = (documentId: string) =>
  ["document-content", documentId] as const;

/** Cache key for the signed-in user's collections. */
export const collectionsKey = ["collections"] as const;

/** Cache key for the signed-in user's entry metadata. */
export const entriesKey = ["entries"] as const;

/**
 * Cache key for a single entry's editor body, separate from the metadata list.
 */
export const entryContentKey = (entryId: string) =>
  ["entry-content", entryId] as const;

/** Cache key for the signed-in user's whiteboard metadata. */
export const whiteboardsKey = ["whiteboards"] as const;

/**
 * Cache key for a single whiteboard's scene, separate from the metadata list.
 */
export const whiteboardSceneKey = (whiteboardId: string) =>
  ["whiteboard-scene", whiteboardId] as const;

/**
 * Sentinel datagrid id used to key the rows/views queries when no datagrid is
 * selected, so the (disabled) query still has a stable key.
 */
export const NO_DATAGRID = "__none__";

/** Cache key for the signed-in user's datagrids. */
export const datagridsKey = ["datagrids"] as const;

/**
 * Cache key for one datagrid's row metadata (no editor body). Rows are keyed per
 * datagrid so opening a datagrid loads only its own rows and optimistic
 * mutations touch a single cache entry.
 */
export const datagridRowsKey = (datagridId: string) =>
  ["datagrid-rows", datagridId] as const;

/**
 * Cache key for a single datagrid row's editor body, kept separate from the
 * metadata list so a content autosave only touches this one entry.
 */
export const datagridRowContentKey = (rowId: string) =>
  ["datagrid-row-content", rowId] as const;

/** Cache key for one datagrid's saved views, keyed per datagrid. */
export const datagridViewsKey = (datagridId: string) =>
  ["datagrid-views", datagridId] as const;

/** All library tags for the signed-in user. */
export const tagsKey = ["tags"] as const;

/**
 * Tag assignments for one polymorphic target type (e.g. `"book"`), or the full
 * unfiltered list when called with `"all"` for cross-type suggestion ranking.
 */
export const taggablesKey = (targetType: string) =>
  ["taggables", targetType] as const;

/** Cache key for every taggable row, used for library-wide recent-use order. */
export const allTaggablesKey = taggablesKey("all");
