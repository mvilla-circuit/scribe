import type { Editor } from "@tiptap/react";
import { type ReactNode, useRef, useState } from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { BlockColorPopover } from "@/editor/block-color-popover";
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

import {
  resetTableWidth,
  setCellFill as applyCellFill,
  setCellVerticalAlign,
  setTableHeaderColor,
  toggleTableBorders,
} from "./table-commands";
import { useTableAnchor } from "./use-table-anchor";
import { useTableState } from "./use-table-state";

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
  } = useTableState(editor);

  const floatingRef = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const visible = editor.isEditable && tablePos >= 0 && !textSelecting;

  useTableAnchor(editor, floatingRef, { tablePos, cellPos, visible });

  const chain = () => editor.chain().focus();

  const setVerticalAlign = (value: "top" | "middle" | "bottom") => {
    setCellVerticalAlign(editor, value);
  };
  const toggleBorders = (attr: "rowBorders" | "colBorders", next: boolean) => {
    toggleTableBorders(editor, tablePos, attr, next);
  };
  const setHeaderColor = (value: string | null) => {
    setTableHeaderColor(editor, tablePos, value);
  };
  const setCellFill = (value: string | null) => {
    applyCellFill(editor, value);
  };
  const resetWidth = () => {
    resetTableWidth(editor, tablePos);
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
        onClick={() => {
          setVerticalAlign("top");
        }}
      >
        <AlignTopIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Align middle"
        active={vAlignMiddle}
        onClick={() => {
          setVerticalAlign("middle");
        }}
      >
        <AlignMiddleIcon size={15} />
      </CtrlButton>
      <CtrlButton
        label="Align bottom"
        active={vAlignBottom}
        onClick={() => {
          setVerticalAlign("bottom");
        }}
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
