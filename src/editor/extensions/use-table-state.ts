import type { Node as PMNode } from "@tiptap/pm/model";
import { type Editor, useEditorState } from "@tiptap/react";

import { hasFormattableSelection } from "@/editor/selection";

import { deriveTableHeaders } from "./table-commands";

/**
 * Snapshot of the table (and the caret's cell within it) that drives the inline
 * table controls. Everything is derived from the current selection, so the menu
 * reflects exactly what the next command would act on.
 */
export interface TableState {
  // Document position of the enclosing table, or -1 when the caret isn't in one.
  tablePos: number;
  headerRow: boolean;
  headerColumn: boolean;
  headerColor: string | null;
  rowBorders: boolean;
  colBorders: boolean;
  canMerge: boolean;
  canSplit: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  vAlignTop: boolean;
  vAlignMiddle: boolean;
  vAlignBottom: boolean;
  cellFill: string | null;
  // Start position of the caret's cell, which the menu anchors above; -1 when
  // no cell is resolved.
  cellPos: number;
  // True while the inline bubble toolbar is showing, so the table controls can
  // hide and avoid stacking on top of it.
  textSelecting: boolean;
}

/** Reactively derive the table state from the editor's current selection. */
export function useTableState(editor: Editor): TableState {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { selection } = e.state;
      const { $from } = selection;
      // Whether the inline-formatting bubble toolbar is showing: it appears over
      // a genuine, non-empty text run (the same guard as BubbleToolbar). When it
      // is, we hide the table toolbar so the two don't stack on top of each other
      // above the cell. A multi-cell CellSelection isn't a TextSelection, so the
      // table toolbar stays put for those (the bubble toolbar doesn't show then).
      const textSelecting = hasFormattableSelection(e);
      let pos = -1;
      let table: PMNode | null = null;
      // Presentation of the cell the caret sits in: its vertical alignment
      // (default `top`, so a missing attr reads as top) and its fill color. We
      // capture the innermost cell (the first one walking outward) and ignore
      // any outer cells.
      let cellVAlign: string | null = null;
      let cellBg: string | null = null;
      let cellStart = -1;
      let cellFound = false;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === "table") {
          pos = $from.before(d);
          table = node;
          break;
        }
        if (
          !cellFound &&
          (node.type.name === "tableCell" || node.type.name === "tableHeader")
        ) {
          cellVAlign = (node.attrs.verticalAlign as string | null) ?? null;
          cellBg = (node.attrs.background as string | null) ?? null;
          cellStart = $from.before(d);
          cellFound = true;
        }
      }
      // A header row = every cell in the first row is a tableHeader; a header
      // column = the first cell of every row is. These drive the toggle states.
      const { headerRow, headerColumn } = deriveTableHeaders(table);
      return {
        tablePos: pos,
        headerRow,
        headerColumn,
        headerColor: (table?.attrs.color as string | null) ?? null,
        // Borders default on, so a missing attr reads as "shown".
        rowBorders: table?.attrs.rowBorders !== false,
        colBorders: table?.attrs.colBorders !== false,
        // Merge needs a multi-cell selection; split needs the caret in a cell
        // that already spans more than one. `can()` reflects exactly that, so we
        // use it to enable each button only when its command would do something.
        canMerge: e.can().mergeCells(),
        canSplit: e.can().splitCell(),
        // Alignment is applied per block to the selected cells' paragraphs.
        // `isActive` lights the matching button only when the whole selection
        // shares one alignment (mixed selections show none active). Left is the
        // unset default, so it reads active whenever no explicit align is set.
        alignLeft: e.isActive({ textAlign: "left" }),
        alignCenter: e.isActive({ textAlign: "center" }),
        alignRight: e.isActive({ textAlign: "right" }),
        // Vertical alignment of the cell's content. Top is the unset default,
        // so it reads active whenever no explicit value is set.
        vAlignTop: !cellVAlign || cellVAlign === "top",
        vAlignMiddle: cellVAlign === "middle",
        vAlignBottom: cellVAlign === "bottom",
        // The caret cell's fill (the anchor cell for a multi-cell selection),
        // driving the active swatch in the fill popover.
        cellFill: cellBg,
        // The selected cell's start position — the menu anchors above it so it
        // stays reachable as the caret moves through a tall table.
        cellPos: cellStart,
        // Hide the table toolbar while the inline bubble toolbar is showing.
        textSelecting,
      };
    },
  });
}
