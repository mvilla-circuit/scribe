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
import {
  BookIcon,
  BookPlusIcon,
  FolderIcon,
  FolderOpenIcon,
  MoreIcon,
  PencilIcon,
  TrashIcon,
} from "./icons";
import { INDENT, type FlatNode } from "./dndTree";

export type TreeRowHandlers = {
  onToggleExpand: () => void;
  onSelectBook: () => void;
  onStartRename: () => void;
  onCommitRename: (value: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onNewBookInside: () => void;
};

type TreeRowProps = TreeRowHandlers & {
  node: FlatNode;
  selected: boolean;
  editing: boolean;
  expanded: boolean;
  /** Projected depth while this row is being dragged; null otherwise. */
  projectionDepth: number | null;
};

function rowPadding(depth: number) {
  return 8 + depth * INDENT;
}

export function TreeRow({
  node,
  selected,
  editing,
  expanded,
  projectionDepth,
  onToggleExpand,
  onSelectBook,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
  onNewBookInside,
}: TreeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const child = node.child;
  const isFolder = child.kind === "folder";
  const label = child.kind === "folder" ? child.folder.name : child.book.title;

  // While dragging, this row collapses into an insertion line at the projected
  // depth so the drop target reads clearly.
  if (isDragging) {
    const depth = projectionDepth ?? node.depth;
    return (
      <div ref={setNodeRef} style={style} role="treeitem">
        <div style={{ paddingLeft: rowPadding(depth) }}>
          <div className="h-9 rounded-md border border-dashed border-accent/50 bg-accent/5" />
        </div>
      </div>
    );
  }

  const renameField = (
    <InlineRename
      initialValue={label}
      onCommit={onCommitRename}
      onCancel={onCancelRename}
      placeholder={isFolder ? "Folder name" : "Untitled"}
    />
  );

  const rowInner = (
    <div
      ref={setNodeRef}
      style={{ ...style, paddingLeft: rowPadding(node.depth) }}
      {...attributes}
      {...listeners}
      role="treeitem"
      aria-expanded={isFolder ? expanded : undefined}
      aria-selected={!isFolder ? selected : undefined}
      tabIndex={0}
      onClick={() => {
        if (editing) return;
        if (isFolder) onToggleExpand();
        else onSelectBook();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!editing) onStartRename();
      }}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isFolder) onToggleExpand();
          else onSelectBook();
        } else if (e.key === "F2") {
          e.preventDefault();
          onStartRename();
        }
      }}
      className={cn(
        "group flex h-9 cursor-default items-center gap-2 rounded-md pr-1 text-sm outline-none",
        "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-selected font-medium text-text"
          : "text-text hover:bg-hover"
      )}
    >
      <span
        key={isFolder ? (expanded ? "open" : "closed") : "book"}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center",
          isFolder && expanded ? "text-accent" : "text-muted",
          isFolder && "scribe-icon-pop"
        )}
      >
        {isFolder ? (
          expanded ? (
            <FolderOpenIcon size={19} />
          ) : (
            <FolderIcon size={19} />
          )
        ) : (
          <BookIcon size={19} />
        )}
      </span>

      {editing ? (
        <span className="min-w-0 flex-1 py-0.5">{renameField}</span>
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}

      {!editing && (
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
              {isFolder && (
                <>
                  <DropdownMenuItem onSelect={() => onNewBookInside()}>
                    <BookPlusIcon size={15} />
                    New book
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
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
          {isFolder && (
            <>
              <ContextMenuItem onSelect={() => onNewBookInside()}>
                <BookPlusIcon size={15} />
                New book
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
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

// A lightweight, non-interactive copy of a row rendered inside the DragOverlay
// so the lifted item reads as a single clean chip following the cursor.
export function DragRowOverlay({ node }: { node: FlatNode }) {
  const child = node.child;
  const isFolder = child.kind === "folder";
  const label = child.kind === "folder" ? child.folder.name : child.book.title;
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-elevated px-2 pr-3 text-sm text-text shadow-popover">
      <span className="flex h-5 w-5 items-center justify-center text-muted">
        {isFolder ? <FolderIcon size={19} /> : <BookIcon size={19} />}
      </span>
      <span className="max-w-[14rem] truncate">{label}</span>
    </div>
  );
}
