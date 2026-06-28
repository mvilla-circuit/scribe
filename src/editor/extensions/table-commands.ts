import type { Editor } from "@tiptap/react";

// Table command helpers and the pure header-state derivation, lifted out of the
// TableControls component so the operations live apart from the floating-toolbar
// wiring and the trickiest read (which rows/columns are headers) can be
// unit-tested without a live editor.

/** The minimal structural shape of a ProseMirror cell node we read. */
interface TableCellLike {
  type: { name: string };
}

/** The minimal structural shape of a ProseMirror table row node we read. */
export interface TableRowLike {
  childCount: number;
  firstChild: TableCellLike | null;
  forEach: (cb: (cell: TableCellLike) => void) => void;
}

/** The minimal structural shape of a ProseMirror table node we read. */
export interface TableLike {
  childCount: number;
  firstChild: TableRowLike | null;
  forEach: (cb: (row: TableRowLike) => void) => void;
}

/**
 * Derive the header toggle states from a table node: a header row means every
 * cell in the first row is a `tableHeader`; a header column means the first
 * cell of every row is. Pure over the node's shape so it can be tested with
 * lightweight fakes.
 */
export function deriveTableHeaders(table: TableLike | null): {
  headerRow: boolean;
  headerColumn: boolean;
} {
  let headerRow = false;
  let headerColumn = false;
  if (table && table.childCount > 0) {
    const firstRow = table.firstChild;
    if (firstRow && firstRow.childCount > 0) {
      headerRow = true;
      firstRow.forEach((cell) => {
        if (cell.type.name !== "tableHeader") headerRow = false;
      });
    }
    headerColumn = true;
    table.forEach((row) => {
      if (row.firstChild?.type.name !== "tableHeader") headerColumn = false;
    });
  }
  return { headerRow, headerColumn };
}

/**
 * Set the vertical alignment of the selected cells. `top` is the unset default,
 * so it clears back to null rather than serialize a redundant marker.
 */
export function setCellVerticalAlign(
  editor: Editor,
  value: "top" | "middle" | "bottom",
) {
  editor
    .chain()
    .focus()
    .setCellAttribute("verticalAlign", value === "top" ? null : value)
    .run();
}

/**
 * Flip a border toggle on the table node. Writes straight to `tablePos` so it
 * works regardless of which cell holds the caret.
 */
export function toggleTableBorders(
  editor: Editor,
  tablePos: number,
  attr: "rowBorders" | "colBorders",
  next: boolean,
) {
  if (tablePos < 0) return;
  editor.view.dispatch(editor.state.tr.setNodeAttribute(tablePos, attr, next));
  editor.commands.focus();
}

/**
 * Write the header fill onto the table node without refocusing, so a portaled
 * color popover stays open for trying several swatches (ProseMirror keeps its
 * selection across the editor blur).
 */
export function setTableHeaderColor(
  editor: Editor,
  tablePos: number,
  value: string | null,
) {
  if (tablePos < 0) return;
  editor.view.dispatch(
    editor.state.tr.setNodeAttribute(tablePos, "color", value),
  );
}

/**
 * Fill the selected cell(s); a null value clears the fill back to the cell's
 * default surface. Applied without refocusing for the same popover reason as
 * {@link setTableHeaderColor}.
 */
export function setCellFill(editor: Editor, value: string | null) {
  editor.commands.setCellAttribute("background", value);
}

/**
 * Drop every cell's explicit `colwidth` so the table reflows to its CSS default
 * (full content width, evenly distributed columns), then clear the lingering
 * inline `<col>` widths the node view leaves behind so the change shows at once.
 */
export function resetTableWidth(editor: Editor, tablePos: number) {
  if (tablePos < 0) return;
  const { state } = editor;
  const table = state.doc.nodeAt(tablePos);
  if (!table) return;
  const tr = state.tr;
  table.descendants((node, offset) => {
    if (node.attrs.colwidth) {
      tr.setNodeAttribute(tablePos + 1 + offset, "colwidth", null);
    }
    // Cells never nest, so there's no need to recurse into them.
    return node.type.name === "tableRow";
  });
  if (!tr.docChanged) return;
  editor.view.dispatch(tr);

  const dom = editor.view.nodeDOM(tablePos);
  const tableEl =
    dom instanceof HTMLElement ? dom.querySelector("table") : null;
  if (tableEl) {
    tableEl.style.width = "";
    tableEl.querySelectorAll<HTMLTableColElement>("col").forEach((col) => {
      col.style.width = "";
    });
  }
  editor.commands.focus();
}
