import { arrayMove } from "@dnd-kit/sortable";
import { childrenOf, ROOT, type TreeChild, type TreeModel } from "../../data/tree";

// Horizontal pixels per nesting level; also the drag distance needed to
// change the projected depth by one.
export const INDENT = 16;

export type FlatNode = {
  id: string; // entity UUID (unique across folders + books)
  kind: "folder" | "book";
  depth: number;
  parentId: string | null; // containing folder id, or null at root
  child: TreeChild;
};

// Depth-first flatten that only descends into expanded folders.
export function flattenTree(model: TreeModel, expanded: Set<string>): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (containerId: string, depth: number, parentId: string | null) => {
    for (const child of childrenOf(model, containerId)) {
      out.push({ id: child.id, kind: child.kind, depth, parentId, child });
      if (child.kind === "folder" && expanded.has(child.id)) {
        walk(child.id, depth + 1, child.id);
      }
    }
  };
  walk(ROOT, 0, null);
  return out;
}

// Drops the descendants of the given ids (used to hide a dragged folder's
// children so it can't be dropped inside its own subtree).
export function removeDescendants(nodes: FlatNode[], ids: string[]): FlatNode[] {
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
// the neighbours allow) and the resulting parent folder id. Books can't be
// parents, so they never raise the max depth.
export function getProjection(
  nodes: FlatNode[],
  activeId: string,
  overId: string,
  dragOffsetX: number
): Projection | null {
  const overIndex = nodes.findIndex((n) => n.id === overId);
  const activeIndex = nodes.findIndex((n) => n.id === activeId);
  if (overIndex === -1 || activeIndex === -1) return null;

  const active = nodes[activeIndex];

  // Folders may only live at the root level: there are no nested folders, so a
  // dragged folder always reorders among the root and never gains a parent.
  if (active.kind === "folder") {
    return { depth: 0, parentId: null };
  }

  const moved = arrayMove(nodes, activeIndex, overIndex);
  const prev = moved[overIndex - 1];
  const next = moved[overIndex + 1];

  const dragDepth = Math.round(dragOffsetX / INDENT);
  const projected = active.depth + dragDepth;

  // Books can sit at the root (depth 0) or one level inside a folder (depth 1).
  // Only folders can be parents, so a book preceded by a folder may nest in it.
  const maxDepth = prev ? prev.depth + (prev.kind === "folder" ? 1 : 0) : 0;
  const minDepth = next ? next.depth : 0;

  let depth = projected;
  if (depth >= maxDepth) depth = maxDepth;
  else if (depth < minDepth) depth = minDepth;

  const parentId = getParentId();
  return { depth, parentId };

  function getParentId(): string | null {
    if (depth === 0 || !prev) return null;
    if (depth === prev.depth) return prev.parentId;
    if (depth > prev.depth) return prev.kind === "folder" ? prev.id : prev.parentId;
    const ancestor = moved
      .slice(0, overIndex)
      .reverse()
      .find((n) => n.depth === depth);
    return ancestor?.parentId ?? null;
  }
}

// Given the post-move flattened order, find the same-parent neighbours of the
// dragged item so callers can compute a fractional position between them.
export function neighbourPositions(
  nodes: FlatNode[],
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
      prev = moved[i].child.position;
      break;
    }
  }
  let next: number | undefined;
  for (let i = slot + 1; i < moved.length; i++) {
    if (moved[i].parentId === targetParentId && moved[i].id !== activeId) {
      next = moved[i].child.position;
      break;
    }
  }
  return { prev, next };
}
