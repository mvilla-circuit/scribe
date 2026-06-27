import type { DocTreeNode } from "../../data/docTree";
import type { Document } from "../../data/documents";
import {
  type DndNode,
  INDENT,
  neighbourPositions as genericNeighbourPositions,
  projectDrop,
  type Projection,
  removeDescendants as genericRemoveDescendants,
} from "../tree/treeDnd";

export { INDENT, type Projection };

export type FlatDocNode = DndNode & {
  hasChildren: boolean;
  document: Document;
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

export function removeDocDescendants(
  nodes: FlatDocNode[],
  ids: string[],
): FlatDocNode[] {
  return genericRemoveDescendants(nodes, ids);
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

export function docNeighbourPositions(
  nodes: FlatDocNode[],
  activeId: string,
  overId: string,
  targetParentId: string | null,
): { prev?: number; next?: number } {
  return genericNeighbourPositions(nodes, activeId, overId, targetParentId);
}
