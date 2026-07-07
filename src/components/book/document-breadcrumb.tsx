import { useMemo } from "react";

import type { Book } from "@/data/books";
import { documentAncestors } from "@/data/doc-tree";
import type { DocumentMeta } from "@/data/documents";

// The page breadcrumb trail: the book (jumps to the title page), each ancestor
// document, then the current page. Rendered as a shrinkable (`min-w-0`) flex
// row so it sits in the document view's sticky top bar beside the page-settings
// controls and yields width to them, ellipsizing items instead of wrapping.
export function DocumentBreadcrumb({
  book,
  document,
  documents,
  onNavigate,
}: {
  book: Book;
  document: DocumentMeta;
  documents: DocumentMeta[];
  /** Navigate to an ancestor document, or to the book's title page (null). */
  onNavigate: (documentId: string | null) => void;
}) {
  const ancestors = useMemo(
    () => documentAncestors(documents, document),
    [documents, document],
  );

  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={() => {
          onNavigate(null);
        }}
        className="min-w-0 shrink truncate rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
      >
        {book.title}
      </button>
      {ancestors.map((parent) => (
        <span key={parent.id} className="flex min-w-0 items-center gap-1">
          <BreadcrumbSep />
          <button
            type="button"
            onClick={() => {
              onNavigate(parent.id);
            }}
            className="min-w-0 shrink truncate rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
          >
            {parent.title || "Untitled"}
          </button>
        </span>
      ))}
      <BreadcrumbSep />
      <span className="min-w-0 shrink truncate px-1 text-text">
        {document.title || "Untitled"}
      </span>
    </div>
  );
}

function BreadcrumbSep() {
  return <span className="shrink-0 select-none text-muted/50">/</span>;
}
