import type { Book } from "@/data/books";
import type { PageIndexEntry } from "@/data/page-index";
import type {
  PageLinkOption,
  ResolvedPageTarget,
} from "@/editor/editor-bridge";
import type { PageTargetType } from "@/editor/extensions/page-ref";

/**
 * Index the page entries by id for O(1) target + ancestor lookups. Build this
 * once per index (the host memoizes it) and hand it to {@link resolvePageTarget}
 * so the map isn't rebuilt on every card's every render.
 */
export function indexById(
  index: PageIndexEntry[],
): Map<string, PageIndexEntry> {
  return new Map(index.map((e) => [e.id, e]));
}

/**
 * Resolve a page-link target to the live title/icon/breadcrumb shown on its
 * card. Pure over the current books + page index (passed as a prebuilt id map)
 * so a rename elsewhere flows straight through on the next render. Returns null
 * when the target can't be found (it may be loading, deleted, or in a book the
 * user can no longer see).
 *
 * Previously inlined in the page-link node view; lifted here so the editor
 * depends only on the resolved shape, not on how pages are stored.
 */
export function resolvePageTarget(
  books: Book[],
  byId: Map<string, PageIndexEntry>,
  targetType: PageTargetType,
  targetId: string | null,
): ResolvedPageTarget | null {
  if (!targetId) return null;

  if (targetType === "book") {
    const book = books.find((b) => b.id === targetId);
    if (!book) return null;
    return {
      title: book.title || "Untitled book",
      icon: book.icon,
      fallbackGlyph: "book",
      breadcrumb: "Book",
      bookId: book.id,
      docId: null,
    };
  }

  const target = byId.get(targetId);
  if (!target) return null;
  const book = books.find((b) => b.id === target.book_id);

  // Walk the ancestor chain up to (but not including) the book's title page,
  // guarding against cycles, to build the "Book / Parent / …" trail.
  const trail: string[] = [];
  let parentId = target.parent_document_id;
  const guard = new Set<string>();
  while (parentId && !guard.has(parentId)) {
    guard.add(parentId);
    const parent = byId.get(parentId);
    if (!parent || parent.is_title_page) break;
    trail.unshift(parent.title || "Untitled");
    parentId = parent.parent_document_id;
  }

  return {
    title: target.is_title_page
      ? book?.title || target.title || "Untitled"
      : target.title || "Untitled",
    icon: target.icon,
    fallbackGlyph: "page",
    breadcrumb: [book?.title || "Untitled book", ...trail].join(" / "),
    bookId: target.book_id,
    docId: target.is_title_page ? null : target.id,
  };
}

/**
 * Every linkable target for the "Link to page" picker: one row per book, then
 * one per non-title page (a book's title page is represented by its book row).
 * Page rows carry their owning book's title as a subtitle.
 */
export function buildPageLinkOptions(
  books: Book[],
  index: PageIndexEntry[],
): PageLinkOption[] {
  const bookTitle = new Map(
    books.map((b) => [b.id, b.title || "Untitled book"]),
  );
  const bookRows: PageLinkOption[] = books.map((b) => ({
    targetType: "book",
    targetId: b.id,
    label: b.title || "Untitled book",
    icon: b.icon,
    glyph: "book",
    subtitle: "Book",
  }));
  const pageRows: PageLinkOption[] = index
    .filter((e) => !e.is_title_page)
    .map((e) => ({
      targetType: "document",
      targetId: e.id,
      label: e.title || "Untitled",
      icon: e.icon,
      glyph: "page",
      subtitle: bookTitle.get(e.book_id) ?? "",
    }));
  return [...bookRows, ...pageRows];
}
