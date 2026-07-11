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
