import {
  type DndNode,
  projectDrop,
  type Projection,
} from "@/components/tree/tree-dnd";
import { childrenOf, ROOT, type TreeChild, type TreeModel } from "@/data/tree";

export { type Projection };

export type FlatNode = DndNode & {
  // entity UUID (unique across folders + collections + books + entries +
  // datagrids + whiteboards); inherited `id` from DndNode.
  kind: "folder" | "collection" | "book" | "entry" | "datagrid" | "whiteboard";
  draggable: boolean;
  child: TreeChild;
};

/** Entries, datagrids, and whiteboards only nest under collections. */
export function isCollectionLeaf(
  kind: FlatNode["kind"],
): kind is "entry" | "datagrid" | "whiteboard" {
  return kind === "entry" || kind === "datagrid" || kind === "whiteboard";
}

// Depth-first flatten that only descends into expanded containers (folders and
// collections). Books and entries are always leaves.
export function flattenTree(
  model: TreeModel,
  expanded: Set<string>,
): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (
    containerId: string,
    depth: number,
    parentId: string | null,
  ) => {
    for (const child of childrenOf(model, containerId)) {
      out.push({
        id: child.id,
        kind: child.kind,
        depth,
        parentId,
        position: child.position,
        draggable: true,
        child,
      });
      const isContainer =
        child.kind === "folder" || child.kind === "collection";
      if (isContainer && expanded.has(child.id)) {
        walk(child.id, depth + 1, child.id);
      }
    }
  };
  walk(ROOT, 0, null);
  return out;
}

// Projection rules for the mixed folder/collection/book/entry/datagrid/
// whiteboard tree:
// - Folders are root-only (they never gain a parent).
// - A book may nest under a folder or a collection (one level below the
//   preceding container), or sit at the root.
// - A collection may nest under another collection, or sit at the root, but
//   never inside a folder -- neither ever nests under a book or entry.
// - Collection-scoped leaves (entry/datagrid/whiteboard) nest under a
//   collection only (never root or a folder).
export function getProjection(
  nodes: FlatNode[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
): Projection | null {
  const active = nodes.find((n) => n.id === activeId);
  const projection = projectDrop(nodes, activeId, overId, dragOffsetX, {
    fixedProjection: (a) =>
      a.kind === "folder" ? { depth: 0, parentId: null } : null,
    maxDepthForPrev: (prev, a) => {
      // Collections and collection-scoped leaves only nest under collections;
      // otherwise they sit at the preceding row's own level (parent validated
      // below). Books nest one level under a folder or collection.
      if (a.kind === "collection" || isCollectionLeaf(a.kind)) {
        return prev.kind === "collection" ? prev.depth + 1 : prev.depth;
      }
      return (
        prev.depth +
        (prev.kind === "folder" || prev.kind === "collection" ? 1 : 0)
      );
    },
    parentWhenNestedUnder: (prev, a) => {
      if (isCollectionLeaf(a.kind)) {
        return prev.kind === "collection" ? prev.id : prev.parentId;
      }
      return prev.kind === "folder" || prev.kind === "collection"
        ? prev.id
        : prev.parentId;
    },
  });

  if (!projection || !active) return projection;

  // A collection can never live inside a folder. If the depth maths resolved its
  // parent to a folder (e.g. dropping beside a book that lives in a folder),
  // snap the drop back to the root instead.
  if (active.kind === "collection" && projection.parentId) {
    const parent = nodes.find((n) => n.id === projection.parentId);
    if (parent?.kind === "folder") return { depth: 0, parentId: null };
  }

  // Collection-scoped leaves require a collection parent.
  if (isCollectionLeaf(active.kind)) {
    if (!projection.parentId) return null;
    const parent = nodes.find((n) => n.id === projection.parentId);
    if (parent?.kind !== "collection") return null;
  }

  return projection;
}
