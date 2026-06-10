import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../../lib/utils";
import { DocumentIcon } from "../ui/DocumentIcon";
import { InlineRename } from "../ui/InlineRename";
import {
  RowActionDropdown,
  RowContextMenu,
  type RowAction,
} from "../ui/RowActionMenu";
import {
  BookIcon,
  BookPlusIcon,
  FolderIcon,
  FolderOpenIcon,
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
      ) : child.book.icon ? (
        <DocumentIcon icon={child.book.icon} size={SIDEBAR_ICON_SIZE} />
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

  const menuActions: RowAction[] = [
    ...(isFolder
      ? [
          {
            icon: <BookPlusIcon size={15} />,
            label: "New book",
            onSelect: onNewBookInside,
          },
        ]
      : []),
    {
      icon: <PencilIcon size={15} />,
      label: "Rename",
      onSelect: onStartRename,
      separatorBefore: isFolder,
    },
    {
      icon: <TrashIcon size={15} />,
      label: "Delete",
      onSelect: onDelete,
      danger: true,
      separatorBefore: true,
    },
  ];

  const actions = <RowActionDropdown actions={menuActions} />;

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

  return <RowContextMenu actions={menuActions}>{rowInner}</RowContextMenu>;
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
        ) : child.book.icon ? (
          <DocumentIcon icon={child.book.icon} size={SIDEBAR_ICON_SIZE} />
        ) : (
          <BookIcon size={SIDEBAR_ICON_SIZE} />
        )
      }
      label={label}
    />
  );
}
