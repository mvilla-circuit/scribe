import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import { TextSelection } from "@tiptap/pm/state";
import { type Editor, useEditorState } from "@tiptap/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { BlockColorPopover } from "@/editor/BlockColorPopover";
import {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignLeftIcon,
  AlignMiddleIcon,
  AlignRightIcon,
  AlignTopIcon,
  ColumnBordersIcon,
  FillIcon,
  FitWidthIcon,
  HeaderColumnIcon,
  HeaderRowIcon,
  MergeCellsIcon,
  MinusIcon,
  PlusIcon,
  RowBordersIcon,
  SplitCellIcon,
  TrashIcon,
} from "@/editor/icons";
import { TABLE_CELL_COLORS, TABLE_HEADER_COLORS } from "@/editor/palette";

// Inline-on-focus table controls. Rather than a persistent toolbar, a compact
// control cluster floats just above the table the caret is in (and only then),
// driven by the built-in table commands. It anchors to the table's DOM via
// Floating UI's autoUpdate, so it tracks scroll, resize, and column drags.
export function TableControls({ editor }: { editor: Editor }) {
  const {
    tablePos,
    headerRow,
    headerColumn,
    headerColor,
    rowBorders,
    colBorders,
    canMerge,
    canSplit,
    alignLeft,
    alignCenter,
    alignRight,
    vAlignTop,
    vAlignMiddle,
    vAlignBottom,
    cellFill,
    cellPos,
    textSelecting,
  } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { selection } = e.state;
      const { $from } = selection;
      // Whether the inline-formatting bubble toolbar is showing: it appears over
      // a genuine, non-empty text run (the same guard as BubbleToolbar). When it
      // is, we hide the table toolbar so the two don't stack on top of each other
      // above the cell. A multi-cell CellSelection isn't a TextSelection, so the
      // table toolbar stays put for those (the bubble toolbar doesn't show then).
      const textSelecting =
        selection instanceof TextSelection &&
        !selection.empty &&
        !e.isActive("codeBlock") &&
        e.state.doc.textBetween(selection.from, selection.to).trim().length > 0;
      let pos = -1;
      let table = null;
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
      let hRow = false;
      let hCol = false;
      if (table && table.childCount > 0) {
        const firstRow = table.firstChild;
        if (firstRow && firstRow.childCount > 0) {
          hRow = true;
          firstRow.forEach((cell) => {
            if (cell.type.name !== "tableHeader") hRow = false;
          });
        }
        hCol = true;
        table.forEach((row) => {
          if (row.firstChild?.type.name !== "tableHeader") hCol = false;
        });
      }
      return {
        tablePos: pos,
        headerRow: hRow,
        headerColumn: hCol,
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

  const floatingRef = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const visible = editor.isEditable && tablePos >= 0 && !textSelecting;

  useEffect(() => {
    const floating = floatingRef.current;
    if (!visible || !floating) return;
    const tableDom = editor.view.nodeDOM(tablePos);
    const tableEl =
      tableDom instanceof HTMLElement
        ? (tableDom.querySelector("table") ?? tableDom)
        : null;
    if (!tableEl) return;
    const cellDom = cellPos >= 0 ? editor.view.nodeDOM(cellPos) : null;
    const cellEl = cellDom instanceof HTMLElement ? cellDom : null;
    // Anchor the menu above the *selected cell* so it stays reachable in tables
    // taller than the viewport (otherwise, pinned to the table's top, it scrolls
    // out of reach). A virtual reference keeps the horizontal placement pinned to
    // the table (top-end, so the menu doesn't jump around as the caret moves
    // between columns) while borrowing the cell's vertical band; flip() drops it
    // below the cell when there's no room above. Falls back to the table's own
    // rect before a cell is resolved.
    const anchorEl = cellEl ?? tableEl;
    const reference = {
      contextElement: anchorEl,
      getBoundingClientRect() {
        const t = tableEl.getBoundingClientRect();
        const c = anchorEl.getBoundingClientRect();
        return {
          x: t.x,
          y: c.y,
          width: t.width,
          height: c.height,
          top: c.top,
          right: t.right,
          bottom: c.bottom,
          left: t.left,
        };
      },
    };
    const update = () => {
      void computePosition(reference, floating, {
        strategy: "fixed",
        placement: "top-end",
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        floating.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      });
    };
    const cleanup = autoUpdate(reference, floating, update);
    return cleanup;
  }, [editor, tablePos, cellPos, visible]);

  const chain = () => editor.chain().focus();

  // Vertical alignment is a per-cell attribute, so `setCellAttribute` writes it
  // across every selected cell (or the caret's cell). `top` is the default, so
  // we clear back to null rather than serialize a redundant marker.
  const setVerticalAlign = (value: "top" | "middle" | "bottom") =>
    chain()
      .setCellAttribute("verticalAlign", value === "top" ? null : value)
      .run();

  // Flip a border toggle on the table node. Like the color control, this writes
  // straight to `tablePos` so it works regardless of which cell holds the caret.
  const toggleBorders = (attr: "rowBorders" | "colBorders", next: boolean) => {
    if (tablePos < 0) return;
    editor.view.dispatch(
      editor.state.tr.setNodeAttribute(tablePos, attr, next),
    );
    editor.commands.focus();
  };

  // Write the header fill onto the table node. The selection stays inside the
  // table while the (portaled) popover is open — the editor only blurs, and
  // ProseMirror keeps its selection across blur — so `tablePos` stays valid and
  // we can dispatch straight to it without stealing focus back (which would
  // close the popover and prevent trying several colors in a row).
  const setHeaderColor = (value: string | null) => {
    if (tablePos < 0) return;
    editor.view.dispatch(
      editor.state.tr.setNodeAttribute(tablePos, "color", value),
    );
  };

  // Fill the selected cell(s). `setCellAttribute` targets the current cell
  // selection (or the caret's cell), which ProseMirror keeps across the blur
  // when the portaled popover opens — so, like the header color above, we apply
  // without refocusing to keep the popover open for trying several swatches.
  // A null value clears the fill back to the cell's default surface.
  const setCellFill = (value: string | null) =>
    editor.commands.setCellAttribute("background", value);

  // Resizing columns writes explicit `colwidth` attributes (and a <colgroup>)
  // that can leave the table narrower or wider than the content column. Clearing
  // every cell's colwidth drops the table back to its CSS default (width: 100%),
  // i.e. the full width of the content column with evenly distributed columns.
  const resetWidth = () => {
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

    // The resizable table node view updates its <colgroup> in place but only
    // *adds* a min-width when a colwidth is cleared — it leaves the stale inline
    // `width` on each <col>, so the old sizes linger until the view is recreated
    // (e.g. on refocus). Clear those widths now so the table reflows instantly.
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
  };

  return (
    <div
      ref={floatingRef}
      className="scribe-table-controls"
      data-visible={visible || undefined}
      role="toolbar"
      aria-label="Table controls"
      // Keep the selection while clicking a control.
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >
      <div className="scribe-table-ctrl-group">
        <CtrlButton
          label="Remove row"
          onClick={() => chain().deleteRow().run()}
        >
          <MinusIcon size={14} />
        </CtrlButton>
        <span className="scribe-table-ctrl-label">Row</span>
        <CtrlButton label="Add row" onClick={() => chain().addRowAfter().run()}>
          <PlusIcon size={14} />
        </CtrlButton>
      </div>
      <Divider />
      <div className="scribe-table-ctrl-group">
        <CtrlButton
          label="Remove column"
          onClick={() => chain().deleteColumn().run()}
        >
          <MinusIcon size={14} />
        </CtrlButton>
        <span className="scribe-table-ctrl-label">Column</span>
        <CtrlButton
          label="Add column"
          onClick={() => chain().addColumnAfter().run()}
        >
          <PlusIcon size={14} />
        </CtrlButton>
      </div>
      <Divider />
      <CtrlButton
        label="Merge cells"
        disabled={!canMerge}
        onClick={() => chain().mergeCells().run()}
      >
        <MergeCellsIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Split cell"
        disabled={!canSplit}
        onClick={() => chain().splitCell().run()}
      >
        <SplitCellIcon size={15} />
      </CtrlButton>
      <Divider />
      <CtrlButton
        label="Align left"
        active={alignLeft}
        onClick={() => chain().setTextAlign("left").run()}
      >
        <AlignLeftIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Align center"
        active={alignCenter}
        onClick={() => chain().setTextAlign("center").run()}
      >
        <AlignCenterIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Align right"
        active={alignRight}
        onClick={() => chain().setTextAlign("right").run()}
      >
        <AlignRightIcon size={15} />
      </CtrlButton>
      <Divider />
      <CtrlButton
        label="Align top"
        active={vAlignTop}
        onClick={() => setVerticalAlign("top")}
      >
        <AlignTopIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Align middle"
        active={vAlignMiddle}
        onClick={() => setVerticalAlign("middle")}
      >
        <AlignMiddleIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Align bottom"
        active={vAlignBottom}
        onClick={() => setVerticalAlign("bottom")}
      >
        <AlignBottomIcon size={15} />
      </CtrlButton>
      <Divider />
      <CtrlButton
        label="Header row"
        active={headerRow}
        onClick={() => chain().toggleHeaderRow().run()}
      >
        <HeaderRowIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Header column"
        active={headerColumn}
        onClick={() => chain().toggleHeaderColumn().run()}
      >
        <HeaderColumnIcon size={15} />
      </CtrlButton>
      <BlockColorPopover
        swatches={TABLE_HEADER_COLORS}
        value={headerColor}
        onChange={setHeaderColor}
        open={colorOpen}
        onOpenChange={setColorOpen}
        label="Header color"
        clearLabel="No color"
        triggerLabel="Header color"
        triggerAriaLabel="Table header color"
        triggerClassName="scribe-table-ctrl-btn"
      />
      <BlockColorPopover
        swatches={TABLE_CELL_COLORS}
        value={cellFill}
        onChange={setCellFill}
        open={fillOpen}
        onOpenChange={setFillOpen}
        label="Cell fill"
        clearLabel="No fill"
        triggerLabel="Cell fill"
        triggerAriaLabel="Fill cell color"
        triggerClassName="scribe-table-ctrl-btn"
        triggerIcon={FillIcon}
      />
      <Divider />
      <CtrlButton
        label={rowBorders ? "Hide row borders" : "Show row borders"}
        active={rowBorders}
        onClick={() => {
          toggleBorders("rowBorders", !rowBorders);
        }}
      >
        <RowBordersIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label={colBorders ? "Hide column borders" : "Show column borders"}
        active={colBorders}
        onClick={() => {
          toggleBorders("colBorders", !colBorders);
        }}
      >
        <ColumnBordersIcon size={15} />
      </CtrlButton>
      <Divider />
      <CtrlButton label="Fit to full width" onClick={resetWidth}>
        <FitWidthIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Delete table"
        tone="danger"
        onClick={() => chain().deleteTable().run()}
      >
        <TrashIcon size={14} />
      </CtrlButton>
    </div>
  );
}

function CtrlButton({
  label,
  onClick,
  tone,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "danger";
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        className="scribe-table-ctrl-btn"
        data-tone={tone}
        data-active={active || undefined}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function Divider() {
  return <span className="scribe-table-ctrl-divider" />;
}
