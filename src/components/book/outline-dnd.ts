import {
  type DndNode,
  INDENT,
  projectDrop,
  type Projection,
} from "@/components/tree/tree-dnd";
import type { DocTreeNode } from "@/data/doc-tree";
import type { DocumentMeta } from "@/data/documents";

export { INDENT, type Projection };

export type FlatDocNode = DndNode & {
  hasChildren: boolean;
  document: DocumentMeta;
};

// Depth-first flatten that only descends into expanded nodes. Unlike the
// sidebar (folders at root, books one level deep), documents nest arbitrarily,
// so any node can be a parent.
export function flattenDocTree(
  tree: DocTreeNode[],
  expanded: Set<string>,
): FlatDocNode[] {
  const out: FlatDocNode[] = [];
  const walk = (
    nodes: DocTreeNode[],
    depth: number,
    parentId: string | null,
  ) => {
    for (const node of nodes) {
      const hasChildren = node.children.length > 0;
      out.push({
        id: node.document.id,
        depth,
        parentId,
        position: node.document.position,
        hasChildren,
        document: node.document,
      });
      if (hasChildren && expanded.has(node.document.id)) {
        walk(node.children, depth + 1, node.document.id);
      }
    }
  };
  walk(tree, 0, null);
  return out;
}

// Any document may be a parent, so the max depth is simply one level deeper than
// the row above.
export function getDocProjection(
  nodes: FlatDocNode[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
): Projection | null {
  return projectDrop(nodes, activeId, overId, dragOffsetX, {
    maxDepthForPrev: (prev) => prev.depth + 1,
    parentWhenNestedUnder: (prev) => prev.id,
  });
}
