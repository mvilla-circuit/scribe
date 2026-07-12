import {
  type DndNode,
  INDENT,
  projectDrop,
  type Projection,
} from "@/components/tree/tree-dnd";
import type { BookOutlineNode } from "@/data/book-outline-tree";
import type { DocumentMeta } from "@/data/documents";
import type { WhiteboardMeta } from "@/data/whiteboards";

export { INDENT, type Projection };

/** A visible, draggable page or leaf whiteboard in a book outline. */
export type FlatBookOutlineNode = DndNode &
  (
    | {
        kind: "document";
        hasChildren: boolean;
        document: DocumentMeta;
      }
    | {
        kind: "whiteboard";
        hasChildren: false;
        whiteboard: WhiteboardMeta;
      }
  );

/** The page variant of a mixed outline node. */
export type FlatDocNode = Extract<FlatBookOutlineNode, { kind: "document" }>;

/**
 * Depth-first flatten of the mixed book outline. Whiteboards are leaves, while
 * documents descend only when expanded.
 */
export function flattenBookOutlineTree(
  tree: BookOutlineNode[],
  expanded: Set<string>,
): FlatBookOutlineNode[] {
  const out: FlatBookOutlineNode[] = [];
  const walk = (
    nodes: BookOutlineNode[],
    depth: number,
    parentId: string | null,
  ) => {
    for (const node of nodes) {
      if (node.kind === "whiteboard") {
        out.push({
          id: node.id,
          kind: "whiteboard",
          depth,
          parentId,
          position: node.position,
          hasChildren: false,
          whiteboard: node.whiteboard,
        });
        continue;
      }

      const hasChildren = node.children.length > 0;
      out.push({
        id: node.id,
        kind: "document",
        depth,
        parentId,
        position: node.position,
        hasChildren,
        document: node.document,
      });
      if (hasChildren && expanded.has(node.id)) {
        walk(node.children, depth + 1, node.id);
      }
    }
  };
  walk(tree, 0, null);
  return out;
}

/**
 * Projects a mixed outline drop. Pages can parent pages and whiteboards;
 * whiteboards always remain leaves.
 */
export function getBookOutlineProjection(
  nodes: FlatBookOutlineNode[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
): Projection | null {
  return projectDrop(nodes, activeId, overId, dragOffsetX, {
    maxDepthForPrev: (prev) =>
      prev.kind === "document" ? prev.depth + 1 : prev.depth,
    parentWhenNestedUnder: (prev) =>
      prev.kind === "document" ? prev.id : prev.parentId,
  });
}
