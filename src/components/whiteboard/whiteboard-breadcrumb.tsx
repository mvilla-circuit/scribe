import { type ReactNode, useMemo } from "react";

import { DocumentBreadcrumb } from "@/components/book/document-breadcrumb";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbSep,
} from "@/components/ui/breadcrumb";
import { useBooks } from "@/data/books";
import { useCollections } from "@/data/collections";
import { useDocuments } from "@/data/documents";
import type { WhiteboardMeta } from "@/data/whiteboards";
import { useUIStore } from "@/store/ui";

/**
 * Whiteboard top-bar trail: reuses `DocumentBreadcrumb` for book-owned boards
 * (same book / ancestor page chrome) and the shared breadcrumb primitives for
 * collection-owned boards.
 */
export function WhiteboardBreadcrumb({
  whiteboard,
  current,
}: {
  whiteboard: WhiteboardMeta;
  /** Current whiteboard name control (editable label). */
  current: ReactNode;
}) {
  if (whiteboard.book_id) {
    return (
      <BookWhiteboardBreadcrumb whiteboard={whiteboard} current={current} />
    );
  }
  if (whiteboard.collection_id) {
    return (
      <CollectionWhiteboardBreadcrumb
        whiteboard={whiteboard}
        current={current}
      />
    );
  }
  return <>{current}</>;
}

function BookWhiteboardBreadcrumb({
  whiteboard,
  current,
}: {
  whiteboard: WhiteboardMeta;
  current: ReactNode;
}) {
  const bookId = whiteboard.book_id;
  const booksQuery = useBooks();
  const documentsQuery = useDocuments(bookId);
  const navigateTo = useUIStore((s) => s.navigateTo);

  const book = booksQuery.data?.find((item) => item.id === bookId) ?? null;
  const documents = documentsQuery.data ?? [];
  const leaf = useMemo(
    () => ({
      id: whiteboard.id,
      parent_document_id: whiteboard.parent_document_id,
      title: whiteboard.name,
      is_title_page: false as const,
    }),
    [whiteboard.id, whiteboard.name, whiteboard.parent_document_id],
  );

  if (!bookId || !book) return <>{current}</>;

  return (
    <DocumentBreadcrumb
      book={book}
      document={leaf}
      documents={documents}
      label="Breadcrumb"
      onNavigate={(documentId) => {
        navigateTo(documentId ? { bookId, docId: documentId } : { bookId });
      }}
      current={current}
    />
  );
}

function CollectionWhiteboardBreadcrumb({
  whiteboard,
  current,
}: {
  whiteboard: WhiteboardMeta;
  current: ReactNode;
}) {
  const collectionId = whiteboard.collection_id;
  const collectionsQuery = useCollections();
  const setActiveCollection = useUIStore((s) => s.setActiveCollection);
  const collection =
    collectionsQuery.data?.find((item) => item.id === collectionId) ?? null;

  if (!collectionId) return <>{current}</>;

  return (
    <Breadcrumb label="Breadcrumb">
      <BreadcrumbLink
        onClick={() => {
          setActiveCollection(collectionId);
        }}
      >
        {collection?.name || "Collection"}
      </BreadcrumbLink>
      <BreadcrumbSep />
      {current}
    </Breadcrumb>
  );
}
