import { Fragment, type ReactNode, useMemo } from "react";

import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbSep,
} from "@/components/ui/breadcrumb";
import type { Book } from "@/data/books";
import { documentAncestors } from "@/data/doc-tree";
import type { DocumentMeta } from "@/data/documents";

/** Fields the book page trail needs for the leaf crumb / ancestor walk. */
export type BreadcrumbLeaf = Pick<
  DocumentMeta,
  "id" | "parent_document_id" | "title" | "is_title_page"
>;

/**
 * The page breadcrumb trail: the book (jumps to the title page), each ancestor
 * document, then the current crumb. Rendered as a shrinkable (`min-w-0`) flex
 * row so it sits in a sticky top bar beside page controls and yields width to
 * them, ellipsizing items instead of wrapping.
 */
export function DocumentBreadcrumb({
  book,
  document,
  documents,
  onNavigate,
  current,
  label,
}: {
  book: Book;
  document: BreadcrumbLeaf;
  documents: DocumentMeta[];
  /** Navigate to an ancestor document, or to the book's title page (null). */
  onNavigate: (documentId: string | null) => void;
  /**
   * Optional current crumb. Defaults to a plain text span of the document
   * title — pass a custom node (e.g. an editable whiteboard name) to replace it.
   */
  current?: ReactNode;
  /** Optional accessible name when the parent nav is not already "Breadcrumb". */
  label?: string;
}) {
  const ancestors = useMemo(
    () => documentAncestors(documents, document),
    [documents, document],
  );

  return (
    <Breadcrumb label={label}>
      <BreadcrumbLink
        onClick={() => {
          onNavigate(null);
        }}
      >
        {book.title || "Untitled"}
      </BreadcrumbLink>
      {ancestors.map((parent) => (
        <Fragment key={parent.id}>
          <BreadcrumbSep />
          <BreadcrumbLink
            onClick={() => {
              onNavigate(parent.id);
            }}
          >
            {parent.title || "Untitled"}
          </BreadcrumbLink>
        </Fragment>
      ))}
      <BreadcrumbSep />
      {current ?? (
        <span className="min-w-0 shrink truncate px-1 text-text">
          {document.title || "Untitled"}
        </span>
      )}
    </Breadcrumb>
  );
}
