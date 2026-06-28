import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * A single block target: the ProseMirror node currently under the gutter handle
 * and the absolute position right before it. Shared by the block handle and its
 * position/drag hooks.
 */
export interface BlockTarget {
  node: PMNode;
  pos: number;
}
