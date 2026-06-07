import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ColumnsView, ColumnView } from "./ColumnsView";

// A simple equal-width layout primitive: `columns` holds 2-3 `column` children,
// each of which holds any blocks. The visible column count is derived from the
// number of children (no separate attr to drift out of sync), so add/remove is
// just an insert/delete of a `column` node and the grid re-derives.

export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 3;

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column+",
  // Don't let edits inside one column escape and merge with the next.
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-columns": "" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnsView);
  },
});

export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-column": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnView);
  },
});

// Starter content for a fresh columns block: `count` equal columns, each an
// empty paragraph.
export function columnsContent(count: number) {
  const n = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, count));
  return {
    type: Columns.name,
    content: Array.from({ length: n }, () => ({
      type: Column.name,
      content: [{ type: "paragraph" }],
    })),
  };
}
