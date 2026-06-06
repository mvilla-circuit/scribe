import { arrayMove } from "@dnd-kit/sortable";
import type { DocTreeNode } from "../../data/docTree";
import type { Document } from "../../data/documents";

// Horizontal pixels per nesting level; also the drag distance needed to change
// the projected depth by one. Mirrors the sidebar's INDENT for visual parity.
export const INDENT = 16;

export type FlatDocNode = {
  id: string;
  depth: number;
  parentId: string | null;
  position: number;
  hasChildren: boolean;
  document: Document;
};

// Depth-first flatten that only descends into expanded nodes. Unlike the
// sidebar (folders at root, books one level deep), documents nest arbitrarily,
// so any node can be a parent.
export function flattenDocTree(
  tree: DocTreeNode[],
  expanded: Set<string>
): FlatDocNode[] {
  const out: FlatDocNode[] = [];
  const walk = (
    nodes: DocTreeNode[],
    depth: number,
    parentId: string | null
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

// Drops the descendants of the given ids so a dragged node can't be dropped
// inside its own subtree.
export function removeDocDescendants(
  nodes: FlatDocNode[],
  ids: string[]
): FlatDocNode[] {
  const exclude = new Set(ids);
  return nodes.filter((n) => {
    if (n.parentId && exclude.has(n.parentId)) {
      exclude.add(n.id);
      return false;
    }
    return true;
  });
}

export type Projection = {
  depth: number;
  parentId: string | null;
};

// Computes where the dragged item would land: a target depth (clamped to what
// the neighbours allow) and the resulting parent document id. Any document may
// be a parent, so the max depth is simply one level deeper than the row above.
export function getDocProjection(
  nodes: FlatDocNode[],
  activeId: string,
  overId: string,
  dragOffsetX: number
): Projection | null {
  const overIndex = nodes.findIndex((n) => n.id === overId);
  const activeIndex = nodes.findIndex((n) => n.id === activeId);
  if (overIndex === -1 || activeIndex === -1) return null;

  const active = nodes[activeIndex];
  const moved = arrayMove(nodes, activeIndex, overIndex);
  const prev = moved[overIndex - 1];
  const next = moved[overIndex + 1];

  const dragDepth = Math.round(dragOffsetX / INDENT);
  const projected = active.depth + dragDepth;

  const maxDepth = prev ? prev.depth + 1 : 0;
  const minDepth = next ? next.depth : 0;

  let depth = projected;
  if (depth > maxDepth) depth = maxDepth;
  else if (depth < minDepth) depth = minDepth;

  return { depth, parentId: getParentId() };

  function getParentId(): string | null {
    if (depth === 0 || !prev) return null;
    if (depth === prev.depth) return prev.parentId;
    if (depth > prev.depth) return prev.id;
    const ancestor = moved
      .slice(0, overIndex)
      .reverse()
      .find((n) => n.depth === depth);
    return ancestor?.parentId ?? null;
  }
}

// Given the post-move flattened order, find the same-parent neighbours of the
// dragged item so callers can compute a fractional position between them.
export function docNeighbourPositions(
  nodes: FlatDocNode[],
  activeId: string,
  overId: string,
  targetParentId: string | null
): { prev?: number; next?: number } {
  const overIndex = nodes.findIndex((n) => n.id === overId);
  const activeIndex = nodes.findIndex((n) => n.id === activeId);
  if (overIndex === -1 || activeIndex === -1) return {};
  const moved = arrayMove(nodes, activeIndex, overIndex);
  const slot = moved.findIndex((n) => n.id === activeId);

  let prev: number | undefined;
  for (let i = slot - 1; i >= 0; i--) {
    if (moved[i].parentId === targetParentId && moved[i].id !== activeId) {
      prev = moved[i].position;
      break;
    }
  }
  let next: number | undefined;
  for (let i = slot + 1; i < moved.length; i++) {
    if (moved[i].parentId === targetParentId && moved[i].id !== activeId) {
      next = moved[i].position;
      break;
    }
  }
  return { prev, next };
}
