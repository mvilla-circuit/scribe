import { useMemo } from "react";

import type { Book } from "@/data/books";
import { documentAncestors } from "@/data/doc-tree";
import type { DocumentMeta } from "@/data/documents";

// The page breadcrumb trail: the book (jumps to the title page), each ancestor
// document, then the current page. Rendered as a fragment so it drops straight
// into the document view's sticky top bar alongside the page-settings controls.
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
    <>
      <button
        type="button"
        onClick={() => {
          onNavigate(null);
        }}
        className="rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
      >
        {book.title}
      </button>
      {ancestors.map((parent) => (
        <span key={parent.id} className="flex items-center gap-1">
          <BreadcrumbSep />
          <button
            type="button"
            onClick={() => {
              onNavigate(parent.id);
            }}
            className="max-w-[16ch] truncate rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
          >
            {parent.title || "Untitled"}
          </button>
        </span>
      ))}
      <BreadcrumbSep />
      <span className="max-w-[20ch] truncate px-1 text-text">
        {document.title || "Untitled"}
      </span>
    </>
  );
}

function BreadcrumbSep() {
  return <span className="select-none text-muted/50">/</span>;
}
