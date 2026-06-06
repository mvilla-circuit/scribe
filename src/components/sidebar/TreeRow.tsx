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
import { type FlatNode } from "./dndTree";
import { SIDEBAR_ICON_SIZE, SidebarRow, SidebarRowOverlay } from "./SidebarRow";

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

  const icon = (
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
          <FolderOpenIcon size={SIDEBAR_ICON_SIZE} />
        ) : (
          <FolderIcon size={SIDEBAR_ICON_SIZE} />
        )
      ) : (
        <BookIcon size={SIDEBAR_ICON_SIZE} />
      )}
    </span>
  );

  const labelNode = editing ? (
    <InlineRename
      initialValue={label}
      onCommit={onCommitRename}
      onCancel={onCancelRename}
      placeholder={isFolder ? "Folder name" : "Untitled"}
    />
  ) : (
    label
  );

  const actions = (
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
  );

  const rowInner = (
    <SidebarRow
      setNodeRef={setNodeRef}
      style={style}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      depth={node.depth}
      projectionDepth={projectionDepth}
      selected={selected}
      editing={editing}
      ariaExpanded={isFolder ? expanded : undefined}
      ariaSelected={!isFolder ? selected : undefined}
      icon={icon}
      actions={actions}
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
    >
      {labelNode}
    </SidebarRow>
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
    <SidebarRowOverlay
      icon={
        isFolder ? (
          <FolderIcon size={SIDEBAR_ICON_SIZE} />
        ) : (
          <BookIcon size={SIDEBAR_ICON_SIZE} />
        )
      }
      label={label}
    />
  );
}
