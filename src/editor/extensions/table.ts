import {
  Table as BaseTable,
  TableCell as BaseTableCell,
  TableHeader as BaseTableHeader,
  type TableOptions,
  TableView,
} from "@tiptap/extension-table";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

// The CSS custom property the header cells read for their fill. When unset the
// `th` rule falls back to the default `--table-header` strip (see editor.css).
const HEADER_FILL_VAR = "--scribe-table-header";

// Borders default on; the table is marked only when a side is switched off, and
// the matching `[data-no-*-borders]` CSS drops that gridline (see editor.css).
const NO_ROW_BORDERS_ATTR = "data-no-row-borders";
const NO_COL_BORDERS_ATTR = "data-no-col-borders";

function applyTableAttrs(
  table: HTMLTableElement,
  attrs: Record<string, unknown>,
) {
  const color = attrs.color;
  if (typeof color === "string" && color) {
    table.style.setProperty(HEADER_FILL_VAR, color);
  } else {
    table.style.removeProperty(HEADER_FILL_VAR);
  }

  table.toggleAttribute(NO_ROW_BORDERS_ATTR, attrs.rowBorders === false);
  table.toggleAttribute(NO_COL_BORDERS_ATTR, attrs.colBorders === false);
}

// The resizable table renders through a node view, and in editable mode that
// view is instantiated by prosemirror-tables' columnResizing plugin — which only
// ever passes `(node, cellMinWidth, view)` and never reapplies our attributes on
// update. So a plain `renderHTML` attribute would never reach the live table.
// This subclass writes our presentation attributes (header color, border
// toggles) onto the table element both at construction and on every update,
// keeping them in sync as the user edits them (and when a saved doc reloads).
// The same view backs the read-only render, so they show there too.
class ColorTableView extends TableView {
  constructor(
    node: ProseMirrorNode,
    cellMinWidth: number,
    view?: EditorView,
    htmlAttributes: Record<string, unknown> = {},
  ) {
    super(node, cellMinWidth, view, htmlAttributes);
    applyTableAttrs(this.table, node.attrs);
  }

  override update(node: ProseMirrorNode) {
    const updated = super.update(node);
    if (updated) applyTableAttrs(this.table, node.attrs);
    return updated;
  }
}

// Tiptap's Table, extended with a few presentation attributes:
//   - `color`: tints the header row and header column (both render as `<th>`, so
//     one value covers both); serialized as a CSS variable.
//   - `rowBorders` / `colBorders`: whether the horizontal (between-row) and
//     vertical (between-column) interior gridlines are drawn. Both default on
//     and serialize to a `data-no-*-borders` marker only when switched off.
// Every attribute round-trips on the node for clipboard and HTML export; the
// node view above drives the on-screen presentation.
export const Table = BaseTable.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML: (el) =>
          el.style.getPropertyValue(HEADER_FILL_VAR).trim() || null,
        renderHTML: (attrs) =>
          attrs.color ? { style: `${HEADER_FILL_VAR}:${attrs.color}` } : {},
      },
      rowBorders: {
        default: true,
        parseHTML: (el) => !el.hasAttribute(NO_ROW_BORDERS_ATTR),
        renderHTML: (attrs) =>
          attrs.rowBorders ? {} : { [NO_ROW_BORDERS_ATTR]: "" },
      },
      colBorders: {
        default: true,
        parseHTML: (el) => !el.hasAttribute(NO_COL_BORDERS_ATTR),
        renderHTML: (attrs) =>
          attrs.colBorders ? {} : { [NO_COL_BORDERS_ATTR]: "" },
      },
    };
  },
}).configure({
  resizable: true,
  View: ColorTableView,
} satisfies Partial<TableOptions>);

// Shared presentation attributes carried by every cell (both regular and header
// cells, so the controls work on either). Each is written across the selected
// cells by the `setCellAttribute` command (from the Table extension).
//
//   - `verticalAlign`: top / middle / bottom alignment of the cell content.
//     Cells default to `top` (the CSS default for td/th), so the attribute only
//     serializes a marker when middle or bottom is chosen; the matching
//     `[data-vertical-align]` CSS rule then shifts the content.
//   - `background`: a per-cell fill color. Like the table header color, the
//     chosen swatch is stored on a CSS custom property (so theme-aware `var()`
//     swatches round-trip) and flagged with a `data-cell-fill` marker the CSS
//     hooks to paint the cell (see editor.css).
const VERTICAL_ALIGN_ATTR = "data-vertical-align";
const CELL_FILL_ATTR = "data-cell-fill";
const CELL_FILL_VAR = "--scribe-cell-fill";

function cellAttributes() {
  return {
    verticalAlign: {
      default: null as string | null,
      parseHTML: (el: HTMLElement) =>
        el.getAttribute(VERTICAL_ALIGN_ATTR) || null,
      renderHTML: (attrs: Record<string, unknown>) =>
        attrs.verticalAlign
          ? { [VERTICAL_ALIGN_ATTR]: attrs.verticalAlign as string }
          : {},
    },
    background: {
      default: null as string | null,
      // The raw swatch value is stashed on the marker attribute (not read back
      // from the custom property, which the CSSOM may rewrite), so it round-trips
      // exactly — including `var(--swatch-ink-*)` values.
      parseHTML: (el: HTMLElement) => el.getAttribute(CELL_FILL_ATTR) || null,
      renderHTML: (attrs: Record<string, unknown>) =>
        attrs.background
          ? {
              [CELL_FILL_ATTR]: attrs.background as string,
              style: `${CELL_FILL_VAR}:${attrs.background as string}`,
            }
          : {},
    },
  };
}

export const TableCell = BaseTableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() };
  },
});

export const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() };
  },
});
