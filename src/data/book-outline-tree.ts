import type { DocumentMeta } from "./documents";
import { byPosition } from "./ordering";
import type { WhiteboardMeta } from "./whiteboards";

/**
 * Documents and whiteboards that share fractional sibling ordering under
 * `parentDocumentId`. Callers should pass book-scoped whiteboards when the
 * global list may include other books.
 */
export function outlinePositionSiblings(
  documents: DocumentMeta[],
  whiteboards: Pick<WhiteboardMeta, "parent_document_id" | "position">[],
  parentDocumentId: string | null,
): { position: number }[] {
  return [
    ...documents.filter(
      (document) =>
        !document.is_title_page &&
        document.parent_document_id === parentDocumentId,
    ),
    ...whiteboards.filter(
      (whiteboard) => whiteboard.parent_document_id === parentDocumentId,
    ),
  ];
}

/** A document or leaf whiteboard rendered in a book's navigable outline. */
export type BookOutlineNode =
  | {
      kind: "document";
      id: string;
      position: number;
      created_at: string;
      document: DocumentMeta;
      children: BookOutlineNode[];
    }
  | {
      kind: "whiteboard";
      id: string;
      position: number;
      created_at: string;
      whiteboard: WhiteboardMeta;
    };

/**
 * Builds the book outline's mixed page and whiteboard hierarchy. Title pages
 * remain pinned outside this tree; whiteboards stay leaves beneath their
 * optional parent page and share sibling positioning with pages.
 */
export function buildBookOutlineTree(
  documents: DocumentMeta[],
  whiteboards: WhiteboardMeta[],
): BookOutlineNode[] {
  const visibleDocuments = documents.filter(
    (document) => !document.is_title_page,
  );
  const documentsById = new Map(
    visibleDocuments.map((document) => [document.id, document]),
  );
  const childrenByParent = new Map<string | null, BookOutlineNode[]>();
  const push = (parentId: string | null, node: BookOutlineNode) => {
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(parentId, siblings);
  };

  for (const document of visibleDocuments) {
    const parentId =
      document.parent_document_id &&
      documentsById.has(document.parent_document_id)
        ? document.parent_document_id
        : null;
    push(parentId, {
      kind: "document",
      id: document.id,
      position: document.position,
      created_at: document.created_at,
      document,
      children: [],
    });
  }

  for (const whiteboard of whiteboards) {
    if (whiteboard.book_id === null || whiteboard.collection_id !== null)
      continue;
    const parentId =
      whiteboard.parent_document_id &&
      documentsById.has(whiteboard.parent_document_id)
        ? whiteboard.parent_document_id
        : null;
    push(parentId, {
      kind: "whiteboard",
      id: whiteboard.id,
      position: whiteboard.position,
      created_at: whiteboard.created_at,
      whiteboard,
    });
  }

  const build = (parentId: string | null): BookOutlineNode[] =>
    (childrenByParent.get(parentId) ?? [])
      .slice()
      .sort(byPosition)
      .map((node) =>
        node.kind === "document" ? { ...node, children: build(node.id) } : node,
      );

  return build(null);
}
