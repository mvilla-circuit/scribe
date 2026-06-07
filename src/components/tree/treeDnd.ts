import { arrayMove } from "@dnd-kit/sortable";

// Generic drag-and-drop maths shared by the Library tree (folders + books) and
// the in-book Outline (nested documents). Both flatten their hierarchy into a
// list of nodes carrying depth/parent/position, then reuse the same projection
// and neighbour logic here. The only real difference between the two trees --
// which rows may become parents and how deep nesting can go -- is injected via
// `ProjectionConfig`.

// Horizontal pixels per nesting level; also the drag distance needed to change
// the projected depth by one. Shared so both trees indent identically.
export const INDENT = 16;

// The minimal shape the DnD maths needs from a flattened tree node. Callers
// extend this with their own payload (the folder/book child, or the document).
export type DndNode = {
  id: string;
  depth: number;
  parentId: string | null;
  position: number;
};

export type Projection = {
  depth: number;
  parentId: string | null;
};

export type ProjectionConfig<T extends DndNode> = {
  // Some kinds project to a fixed slot regardless of cursor (e.g. folders, which
  // only ever live at the root). Return null to fall through to depth maths.
  fixedProjection?: (active: T) => Projection | null;
  // Max nesting depth allowed given the row that precedes the drop target.
  maxDepthForPrev: (prev: T) => number;
  // The parent id contributed when nesting one level deeper under `prev`.
  parentWhenNestedUnder: (prev: T) => string | null;
};

// Drops the descendants of the given ids so a dragged node can't be dropped
// inside its own subtree.
export function removeDescendants<T extends { id: string; parentId: string | null }>(
  nodes: T[],
  ids: string[]
): T[] {
  const exclude = new Set(ids);
  return nodes.filter((n) => {
    if (n.parentId && exclude.has(n.parentId)) {
      exclude.add(n.id);
      return false;
    }
    return true;
  });
}

// Computes where the dragged item would land: a target depth (clamped to what
// the neighbours allow) and the resulting parent id.
export function projectDrop<T extends DndNode>(
  nodes: T[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
  config: ProjectionConfig<T>
): Projection | null {
  const overIndex = nodes.findIndex((n) => n.id === overId);
  const activeIndex = nodes.findIndex((n) => n.id === activeId);
  if (overIndex === -1 || activeIndex === -1) return null;

  const active = nodes[activeIndex];
  const fixed = config.fixedProjection?.(active);
  if (fixed) return fixed;

  const moved = arrayMove(nodes, activeIndex, overIndex);
  const prev = moved[overIndex - 1];
  const next = moved[overIndex + 1];

  const dragDepth = Math.round(dragOffsetX / INDENT);
  const projected = active.depth + dragDepth;

  const maxDepth = prev ? config.maxDepthForPrev(prev) : 0;
  const minDepth = next ? next.depth : 0;

  let depth = projected;
  if (depth > maxDepth) depth = maxDepth;
  else if (depth < minDepth) depth = minDepth;

  return { depth, parentId: getParentId() };

  function getParentId(): string | null {
    if (depth === 0 || !prev) return null;
    if (depth === prev.depth) return prev.parentId;
    if (depth > prev.depth) return config.parentWhenNestedUnder(prev);
    const ancestor = moved
      .slice(0, overIndex)
      .reverse()
      .find((n) => n.depth === depth);
    return ancestor?.parentId ?? null;
  }
}

// Given the post-move flattened order, find the same-parent neighbours of the
// dragged item so callers can compute a fractional position between them.
export function neighbourPositions<T extends DndNode>(
  nodes: T[],
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
