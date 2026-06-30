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
import {
  CONVERT_TARGETS,
  CONVERTIBLE_SOURCES,
  type ConvertTargetId,
  sourceTypeId,
} from "./extensions/block-convert";
import {
  CheckIcon,
  Columns2Icon,
  Columns3Icon,
  CopyIcon,
  CopyToClipboardIcon,
  TextIcon,
  TrashIcon,
} from "./icons";

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
  onTurnInto: (targetId: ConvertTargetId) => void;
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
  // "Turn into" shows for every text-bearing block (paragraph, heading, lists,
  // quote, callout, code); the current type/variant is marked with a check.
  // Structural blocks (columns, table, divider, cards) only get the
  // reorder/duplicate/delete actions.
  const canTurnInto = target
    ? CONVERTIBLE_SOURCES.has(target.node.type.name)
    : false;
  const currentTypeId = target ? sourceTypeId(target.node) : null;

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
              {CONVERT_TARGETS.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onSelect={() => {
                    onTurnInto(option.id);
                  }}
                >
                  <option.icon size={15} />
                  {option.label}
                  {currentTypeId === option.id && (
                    <CheckIcon size={15} className="ml-auto" />
                  )}
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
