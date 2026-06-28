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
 * Cache key for one book's pages. Documents are keyed per book so opening a book
 * loads only its own pages and optimistic mutations touch a single cache entry.
 */
export const documentsKey = (bookId: string) => ["documents", bookId] as const;
