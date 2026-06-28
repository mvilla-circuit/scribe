import type { ChainedCommands } from "@tiptap/react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { IconProps } from "@/lib/make-icon";

import type { BlockTarget } from "./block-handle-target";
import { BASIC_BLOCK_TYPES } from "./extensions/block-types";
import {
  CheckIcon,
  CodeBlockIcon,
  Columns2Icon,
  Columns3Icon,
  CopyIcon,
  CopyToClipboardIcon,
  QuoteIcon,
  TextIcon,
  TrashIcon,
} from "./icons";

// "Turn into" conversions. Each applies to the textblock the handle points at,
// mirroring the slash-menu commands so block typing stays consistent.
interface TurnInto {
  label: string;
  icon: (props: IconProps) => React.ReactNode;
  apply: (chain: ChainedCommands) => ChainedCommands;
}

const TURN_INTO: TurnInto[] = [
  // The basic textblock conversions, shared verbatim with the slash menu.
  ...BASIC_BLOCK_TYPES.map((block): TurnInto => ({
    label: block.title,
    icon: block.icon,
    apply: block.command,
  })),
  // Conversions unique to the handle: Quote wraps the block in place (the slash
  // menu instead inserts fresh pull/accent quotes), and Code keeps its short
  // label here.
  { label: "Quote", icon: QuoteIcon, apply: (c) => c.wrapIn("quote") },
  { label: "Code", icon: CodeBlockIcon, apply: (c) => c.toggleCodeBlock() },
];

// Column-count choices offered for a `columns` block. "1" flattens the block
// back to normal top-level blocks; 2-3 set the number of side-by-side columns.
const COLUMN_OPTIONS: {
  count: number;
  label: string;
  icon: (props: IconProps) => React.ReactNode;
}[] = [
  { count: 1, label: "1 column", icon: TextIcon },
  { count: 2, label: "2 columns", icon: Columns2Icon },
  { count: 3, label: "3 columns", icon: Columns3Icon },
];

interface BlockMenuProps {
  /** The block the menu acts on (snapshotted when the menu opened). */
  target: BlockTarget | null;
  onTurnInto: (apply: (chain: ChainedCommands) => ChainedCommands) => void;
  onChangeColumns: (count: number) => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

// The block handle's dropdown body: the contextual "Turn into" / "Columns"
// submenus plus the Copy / Duplicate / Delete actions. Purely presentational —
// it derives which sections to show from `target` and calls back for the work.
export function BlockMenu({
  target,
  onTurnInto,
  onChangeColumns,
  onCopy,
  onDuplicate,
  onRemove,
}: BlockMenuProps) {
  // "Turn into" only makes sense for plain textblocks (paragraph, heading,
  // code). Structural blocks (callout, columns, table, divider) just get the
  // reorder/duplicate/delete actions.
  const canTurnInto = target?.node.type.isTextblock ?? false;

  // A `columns` block gets a persistent column-count control (1/2/3).
  const isColumns = target?.node.type.name === "columns";
  const columnCount = isColumns ? (target?.node.childCount ?? 0) : 0;

  return (
    <DropdownMenuContent
      align="start"
      side="bottom"
      onCloseAutoFocus={(e) => {
        e.preventDefault();
      }}
    >
      {canTurnInto && (
        <>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <TextIcon size={15} />
              Turn into
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TURN_INTO.map((option) => (
                <DropdownMenuItem
                  key={option.label}
                  onSelect={() => {
                    onTurnInto(option.apply);
                  }}
                >
                  <option.icon size={15} />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
        </>
      )}
      {isColumns && (
        <>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Columns2Icon size={15} />
              Columns
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {COLUMN_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.count}
                  onSelect={() => {
                    onChangeColumns(option.count);
                  }}
                >
                  <option.icon size={15} />
                  {option.label}
                  {columnCount === option.count && (
                    <CheckIcon size={15} className="ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem onSelect={onCopy}>
        <CopyToClipboardIcon size={15} />
        Copy
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onDuplicate}>
        <CopyIcon size={15} />
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuItem danger onSelect={onRemove}>
        <TrashIcon size={15} />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
