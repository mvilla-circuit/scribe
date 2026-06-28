import type { Tables } from "@/lib/database.types";

import { byPosition, getPositionBetween } from "./ordering";
import { collectSubtree } from "./subtree";

// Local alias for the documents row. Mirrors `Document` in documents.ts (the
// same generated type) but is declared here so these pure helpers don't import
// from documents.ts and create an import cycle.
type Document = Tables<"documents">;

/**
 * Collects a document plus all of its descendant ids. The DB cascades the
 * delete (parent_document_id ON DELETE CASCADE); we mirror that optimistically.
 */
export function collectDocumentSubtree(
  documents: Document[],
  rootId: string,
): Set<string> {
  return collectSubtree(documents, rootId, (d) => d.parent_document_id);
}

/**
 * Builds the rows for a deep copy of a page and all of its nested pages,
 * inserted as a sibling right after the source. Each copied page gets a fresh
 * id, descendants are re-parented onto those new ids, and only the copy's root
 * is renamed (" copy") and repositioned; descendants keep their relative order.
 * `user_id` is left blank here and stamped by the mutation at insert time.
 */
export function buildDocumentDuplicate(
  documents: Document[],
  sourceId: string,
): { rows: Document[]; rootId: string } | null {
  const source = documents.find((d) => d.id === sourceId);
  if (!source || source.is_title_page) return null;

  const subtreeIds = collectDocumentSubtree(documents, sourceId);
  const idMap = new Map<string, string>();
  for (const id of subtreeIds) idMap.set(id, crypto.randomUUID());

  const siblings = documents
    .filter(
      (d) =>
        !d.is_title_page && d.parent_document_id === source.parent_document_id,
    )
    .sort(byPosition);
  const sourceIdx = siblings.findIndex((d) => d.id === sourceId);
  const next = siblings[sourceIdx + 1];
  const rootPosition = getPositionBetween(source.position, next?.position);

  const now = new Date().toISOString();
  const rows = documents
    .filter((d) => subtreeIds.has(d.id))
    .map((d): Document => {
      const isRoot = d.id === sourceId;
      // Every subtree id is in idMap; the `??` fallbacks just keep the types
      // honest (they never trigger given the filter above).
      const newId = idMap.get(d.id) ?? d.id;
      const newParent =
        d.parent_document_id === null
          ? null
          : (idMap.get(d.parent_document_id) ?? d.parent_document_id);
      return {
        ...d,
        id: newId,
        user_id: "",
        parent_document_id: isRoot ? d.parent_document_id : newParent,
        title: isRoot ? `${d.title || "Untitled"} copy` : d.title,
        position: isRoot ? rootPosition : d.position,
        created_at: now,
        updated_at: now,
      };
    });

  return { rows, rootId: idMap.get(sourceId) ?? sourceId };
}
