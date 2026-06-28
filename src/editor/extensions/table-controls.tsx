import type { ChainedCommands } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import {
  type ComponentType,
  Fragment,
  type ReactNode,
  useRef,
  useState,
} from "react";

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
import { preserveSelection } from "@/editor/preserve-selection";
import type { IconProps } from "@/lib/make-icon";

import {
  resetTableWidth,
  setCellFill as applyCellFill,
  setCellVerticalAlign,
  setTableHeaderColor,
  toggleTableBorders,
} from "./table-commands";
import { useTableAnchor } from "./use-table-anchor";
import { useTableState } from "./use-table-state";

// The two symmetrical add/remove groups (rows, columns) differ only in the
// table commands they call, so they render from one descriptor.
const AXIS_GROUPS = [
  {
    noun: "Row",
    remove: (c: ChainedCommands) => c.deleteRow(),
    add: (c: ChainedCommands) => c.addRowAfter(),
  },
  {
    noun: "Column",
    remove: (c: ChainedCommands) => c.deleteColumn(),
    add: (c: ChainedCommands) => c.addColumnAfter(),
  },
] as const;

// One horizontal/vertical alignment button: a toggle with an icon and its
// active flag. The arrays are built in the component so each row can read its
// live `active` state.
interface AlignButton {
  label: string;
  active: boolean;
  Icon: ComponentType<IconProps>;
  onClick: () => void;
}

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

  const hAlignButtons: AlignButton[] = [
    {
      label: "Align left",
      active: alignLeft,
      Icon: AlignLeftIcon,
      onClick: () => chain().setTextAlign("left").run(),
    },
    {
      label: "Align center",
      active: alignCenter,
      Icon: AlignCenterIcon,
      onClick: () => chain().setTextAlign("center").run(),
    },
    {
      label: "Align right",
      active: alignRight,
      Icon: AlignRightIcon,
      onClick: () => chain().setTextAlign("right").run(),
    },
  ];

  const vAlignButtons: AlignButton[] = [
    {
      label: "Align top",
      active: vAlignTop,
      Icon: AlignTopIcon,
      onClick: () => {
        setVerticalAlign("top");
      },
    },
    {
      label: "Align middle",
      active: vAlignMiddle,
      Icon: AlignMiddleIcon,
      onClick: () => {
        setVerticalAlign("middle");
      },
    },
    {
      label: "Align bottom",
      active: vAlignBottom,
      Icon: AlignBottomIcon,
      onClick: () => {
        setVerticalAlign("bottom");
      },
    },
  ];

  return (
    <div
      ref={floatingRef}
      className="scribe-table-controls"
      data-visible={visible || undefined}
      role="toolbar"
      aria-label="Table controls"
      // Keep the selection while clicking a control.
      onMouseDown={preserveSelection}
    >
      {AXIS_GROUPS.map(({ noun, remove, add }) => (
        <Fragment key={noun}>
          <div className="scribe-table-ctrl-group">
            <CtrlButton
              label={`Remove ${noun.toLowerCase()}`}
              onClick={() => remove(chain()).run()}
            >
              <MinusIcon size={14} />
            </CtrlButton>
            <span className="scribe-table-ctrl-label">{noun}</span>
            <CtrlButton
              label={`Add ${noun.toLowerCase()}`}
              onClick={() => add(chain()).run()}
            >
              <PlusIcon size={14} />
            </CtrlButton>
          </div>
          <Divider />
        </Fragment>
      ))}
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
      {hAlignButtons.map(({ label, active, Icon, onClick }) => (
        <CtrlButton key={label} label={label} active={active} onClick={onClick}>
          <Icon size={15} />
        </CtrlButton>
      ))}
      <Divider />
      {vAlignButtons.map(({ label, active, Icon, onClick }) => (
        <CtrlButton key={label} label={label} active={active} onClick={onClick}>
          <Icon size={15} />
        </CtrlButton>
      ))}
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
