import { MAX_COLUMNS, MIN_COLUMNS } from "./columns-constants";
import { ColumnsView, ColumnView } from "./columns-view";
import { dataDivBlock } from "./data-block";

// A simple equal-width layout primitive: `columns` holds 2-3 `column` children,
// each of which holds any blocks. The visible column count is derived from the
// number of children (no separate attr to drift out of sync), so add/remove is
// just an insert/delete of a `column` node and the grid re-derives.

export const Columns = dataDivBlock({
  name: "columns",
  marker: "columns",
  group: "block",
  content: "column+",
  // Don't let edits inside one column escape and merge with the next.
  isolating: true,
  view: ColumnsView,
});

export const Column = dataDivBlock({
  name: "column",
  marker: "column",
  content: "block+",
  isolating: true,
  view: ColumnView,
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
