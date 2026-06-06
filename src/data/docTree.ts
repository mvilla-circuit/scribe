import type { Document } from "./documents";
import { byPosition } from "./ordering";

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
export function descendantCount(documents: Document[], id: string): number {
  const childrenByParent = new Map<string, Document[]>();
  for (const doc of documents) {
    if (!doc.parent_document_id) continue;
    const list = childrenByParent.get(doc.parent_document_id) ?? [];
    list.push(doc);
    childrenByParent.set(doc.parent_document_id, list);
  }
  let count = 0;
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop() as string;
    for (const child of childrenByParent.get(cur) ?? []) {
      count += 1;
      stack.push(child.id);
    }
  }
  return count;
}
