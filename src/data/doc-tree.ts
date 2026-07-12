import type { DocumentMeta } from "./documents";
import { byPosition } from "./ordering";
import { collectSubtree } from "./subtree";

/**
 * The book's document hierarchy as a nested tree, ordered by `position`. The
 * Title Page is excluded -- it is pinned separately and is not part of the
 * readable outline/TOC structure.
 */
export interface DocTreeNode {
  document: DocumentMeta;
  children: DocTreeNode[];
}

/**
 * Builds the nested document tree for a book from its flat document list.
 * Passing a `rootId` scopes the result to that document's subtree, returning its
 * direct children as the roots -- the shape a parent page's inline Table of
 * Contents renders from. Defaults to the whole book (roots with no parent).
 */
export function buildDocTree(
  documents: DocumentMeta[],
  rootId: string | null = null,
): DocTreeNode[] {
  const hierarchy = documents.filter((d) => !d.is_title_page);
  const validIds = new Set(hierarchy.map((d) => d.id));

  // Group by parent. A parent that points at a missing or title-page document
  // is treated as a root so an orphan can never disappear from the tree.
  const childrenByParent = new Map<string | null, DocumentMeta[]>();
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

  return build(rootId);
}

/** A flattened table-of-contents row: a document tagged with its nesting depth. */
export interface TocEntry {
  document: DocumentMeta;
  depth: number;
  hasChildren: boolean;
}

/**
 * Depth-first, in-order flatten with each entry tagged by its nesting depth and
 * whether it has children. Only descends into nodes whose id is in `expanded`,
 * so a collapsed parent hides its subtree -- the shape the title page's
 * collapsible Table of Contents renders from.
 */
export function flattenTocExpanded(
  tree: DocTreeNode[],
  expanded: Set<string>,
): TocEntry[] {
  const out: TocEntry[] = [];
  const walk = (nodes: DocTreeNode[], depth: number) => {
    for (const node of nodes) {
      const hasChildren = node.children.length > 0;
      out.push({ document: node.document, depth, hasChildren });
      if (hasChildren && expanded.has(node.document.id)) {
        walk(node.children, depth + 1);
      }
    }
  };
  walk(tree, 0);
  return out;
}

/**
 * All ids in the tree that have children -- the full set of expandable nodes,
 * used to drive the "expand all" toggle and to know when everything is open.
 */
export function expandableDocIds(tree: DocTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: DocTreeNode[]) => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        ids.push(node.document.id);
        walk(node.children);
      }
    }
  };
  walk(tree);
  return ids;
}

/**
 * Number of descendants a document has (used to warn before a cascade delete).
 * collectSubtree includes the root itself, so subtract it.
 */
export function descendantCount(documents: DocumentMeta[], id: string): number {
  return collectSubtree(documents, id, (d) => d.parent_document_id).size - 1;
}

/**
 * The ancestor chain of a document, ordered root-first, for the page
 * breadcrumb. Stops at (and excludes) the book's title page, skips a missing
 * parent, and guards against cycles so a corrupt parent link can't loop.
 */
export function documentAncestors(
  documents: DocumentMeta[],
  document: Pick<DocumentMeta, "parent_document_id">,
): DocumentMeta[] {
  const byId = new Map(documents.map((d) => [d.id, d]));
  const chain: DocumentMeta[] = [];
  let parentId = document.parent_document_id;
  const guard = new Set<string>();
  while (parentId && !guard.has(parentId)) {
    guard.add(parentId);
    const parent = byId.get(parentId);
    if (!parent || parent.is_title_page) break;
    chain.unshift(parent);
    parentId = parent.parent_document_id;
  }
  return chain;
}
