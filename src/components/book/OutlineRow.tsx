import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../../lib/utils";
import { InlineRename } from "../ui/InlineRename";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/ContextMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";
import { PencilIcon, TrashIcon } from "../sidebar/icons";
import { ChevronRightIcon, MoreIcon, PageIcon, PlusIcon } from "./icons";
import { INDENT, type FlatDocNode } from "./outlineDnd";

export type OutlineRowHandlers = {
  onToggleExpand: () => void;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (value: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onNewChild: () => void;
};

type OutlineRowProps = OutlineRowHandlers & {
  node: FlatDocNode;
  selected: boolean;
  editing: boolean;
  expanded: boolean;
  /** Projected depth while this row is being dragged; null otherwise. */
  projectionDepth: number | null;
};

function rowPadding(depth: number) {
  return 6 + depth * INDENT;
}

export function OutlineRow({
  node,
  selected,
  editing,
  expanded,
  projectionDepth,
  onToggleExpand,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
  onNewChild,
}: OutlineRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const label = node.document.title || "Untitled";

  // While dragging, collapse the row into an insertion line at the projected
  // depth so the drop target (including nesting) reads clearly.
  if (isDragging) {
    const depth = projectionDepth ?? node.depth;
    return (
      <div ref={setNodeRef} style={style} role="treeitem">
        <div style={{ paddingLeft: rowPadding(depth) }}>
          <div className="h-8 rounded-md border border-dashed border-accent/50 bg-accent/5" />
        </div>
      </div>
    );
  }

  const rowInner = (
    <div
      ref={setNodeRef}
      style={{ ...style, paddingLeft: rowPadding(node.depth) }}
      {...attributes}
      {...listeners}
      role="treeitem"
      aria-expanded={node.hasChildren ? expanded : undefined}
      aria-selected={selected}
      tabIndex={0}
      onClick={() => {
        if (!editing) onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!editing) onStartRename();
      }}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        } else if (e.key === "F2") {
          e.preventDefault();
          onStartRename();
        }
      }}
      className={cn(
        "group flex h-8 cursor-default items-center gap-1 rounded-md pr-1 text-sm outline-none",
        "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-selected font-medium text-text"
          : "text-text hover:bg-hover"
      )}
    >
      {node.hasChildren ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted hover:text-text"
        >
          <ChevronRightIcon
            size={15}
            className={cn(
              "transition-transform duration-150",
              expanded && "rotate-90"
            )}
          />
        </button>
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted/70">
          <PageIcon size={15} />
        </span>
      )}

      {editing ? (
        <span className="min-w-0 flex-1 py-0.5">
          <InlineRename
            initialValue={label}
            onCommit={onCommitRename}
            onCancel={onCancelRename}
            placeholder="Untitled"
          />
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}

      {!editing && (
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Add page inside"
            onClick={(e) => {
              e.stopPropagation();
              onNewChild();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-text"
          >
            <PlusIcon size={15} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                tabIndex={-1}
                aria-label="More actions"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-text"
              >
                <MoreIcon size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onNewChild()}>
                <PlusIcon size={15} />
                Add page inside
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onStartRename()}>
                <PencilIcon size={15} />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={() => onDelete()}>
                <TrashIcon size={15} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      )}
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{rowInner}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onNewChild()}>
          <PlusIcon size={15} />
          Add page inside
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onStartRename()}>
          <PencilIcon size={15} />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem danger onSelect={() => onDelete()}>
          <TrashIcon size={15} />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Clean single-line chip rendered in the DragOverlay so the lifted row follows
// the cursor without its controls.
export function OutlineDragOverlay({ node }: { node: FlatDocNode }) {
  return (
    <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-elevated px-2 pr-3 text-sm text-text shadow-popover">
      <span className="flex h-5 w-5 items-center justify-center text-muted/70">
        <PageIcon size={15} />
      </span>
      <span className="max-w-[14rem] truncate">
        {node.document.title || "Untitled"}
      </span>
    </div>
  );
}
