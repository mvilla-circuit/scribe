import { childrenOf, ROOT, type TreeChild, type TreeModel } from "../../data/tree";
import {
  INDENT,
  neighbourPositions as genericNeighbourPositions,
  projectDrop,
  removeDescendants as genericRemoveDescendants,
  type DndNode,
  type Projection,
} from "../tree/treeDnd";

export { INDENT, type Projection };

export type FlatNode = DndNode & {
  // entity UUID (unique across folders + books); inherited `id` from DndNode.
  kind: "folder" | "book";
  child: TreeChild;
};

// Depth-first flatten that only descends into expanded folders.
export function flattenTree(model: TreeModel, expanded: Set<string>): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (containerId: string, depth: number, parentId: string | null) => {
    for (const child of childrenOf(model, containerId)) {
      out.push({
        id: child.id,
        kind: child.kind,
        depth,
        parentId,
        position: child.position,
        child,
      });
      if (child.kind === "folder" && expanded.has(child.id)) {
        walk(child.id, depth + 1, child.id);
      }
    }
  };
  walk(ROOT, 0, null);
  return out;
}

export function removeDescendants(nodes: FlatNode[], ids: string[]): FlatNode[] {
  return genericRemoveDescendants(nodes, ids);
}

// Folders may only live at the root level (no nested folders), so a dragged
// folder always reorders among the root and never gains a parent. Books may sit
// at the root or one level inside a folder, so only a preceding folder raises
// the max depth.
export function getProjection(
  nodes: FlatNode[],
  activeId: string,
  overId: string,
  dragOffsetX: number
): Projection | null {
  return projectDrop(nodes, activeId, overId, dragOffsetX, {
    fixedProjection: (active) =>
      active.kind === "folder" ? { depth: 0, parentId: null } : null,
    maxDepthForPrev: (prev) => prev.depth + (prev.kind === "folder" ? 1 : 0),
    parentWhenNestedUnder: (prev) =>
      prev.kind === "folder" ? prev.id : prev.parentId,
  });
}

export function neighbourPositions(
  nodes: FlatNode[],
  activeId: string,
  overId: string,
  targetParentId: string | null
): { prev?: number; next?: number } {
  return genericNeighbourPositions(nodes, activeId, overId, targetParentId);
}
