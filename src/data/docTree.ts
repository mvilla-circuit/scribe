import type { Document } from "./documents";
import { byPosition } from "./ordering";
import { collectSubtree } from "./subtree";

// The book's document hierarchy as a nested tree, ordered by `position`. The
// Title Page is excluded -- it is pinned separately and is not part of the
// readable outline/TOC structure.
export type DocTreeNode = {
  document: Document;
  children: DocTreeNode[];
};

export function buildDocTree(documents: Document[]): DocTreeNode[] {
  const hierarchy = documents.filter((d) => !d.is_title_page);
  const validIds = new Set(hierarchy.map((d) => d.id));

  // Group by parent. A parent that points at a missing or title-page document
  // is treated as a root so an orphan can never disappear from the tree.
  const childrenByParent = new Map<string | null, Document[]>();
  for (const doc of hierarchy) {
    const parentId =
      doc.parent_document_id && validIds.has(doc.parent_document_id)
        ? doc.parent_document_id
        : null;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(doc);
    childrenByParent.set(parentId, list);
  }

  const build = (parentId: string | null): DocTreeNode[] =>
    (childrenByParent.get(parentId) ?? [])
      .slice()
      .sort(byPosition)
      .map((document) => ({ document, children: build(document.id) }));

  return build(null);
}

export type TocEntry = { document: Document; depth: number };

// Depth-first, in-order flatten with each entry tagged by its nesting depth --
// the shape both the Table of Contents and the Outline render from.
export function flattenForToc(tree: DocTreeNode[]): TocEntry[] {
  const out: TocEntry[] = [];
  const walk = (nodes: DocTreeNode[], depth: number) => {
    for (const node of nodes) {
      out.push({ document: node.document, depth });
      walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}

// Number of descendants a document has (used to warn before a cascade delete).
// collectSubtree includes the root itself, so subtract it.
export function descendantCount(documents: Document[], id: string): number {
  return collectSubtree(documents, id, (d) => d.parent_document_id).size - 1;
}
