import {
  rowActivationHandlers,
  useSortableRow,
} from "@/components/tree/row-interactions";
import { DocumentIcon } from "@/components/ui/document-icon";
import { InlineRename } from "@/components/ui/inline-rename";
import {
  type RowAction,
  RowActionDropdown,
  RowContextMenu,
} from "@/components/ui/row-action-menu";
import { cn } from "@/lib/utils";

import { type FlatNode } from "./dnd-tree";
import {
  BookIcon,
  BookPlusIcon,
  FolderIcon,
  FolderOpenIcon,
  PencilIcon,
  TrashIcon,
} from "./icons";
import {
  SIDEBAR_ICON_SIZE,
  SidebarRow,
  SidebarRowOverlay,
} from "./sidebar-row";

interface TreeRowHandlers {
  onToggleExpand: () => void;
  onSelectBook: () => void;
  onStartRename: () => void;
  onCommitRename: (value: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onNewBookInside: () => void;
}

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
  const { setNodeRef, style, dragHandleProps, isDragging } = useSortableRow(
    node.id,
  );

  const child = node.child;
  const isFolder = child.kind === "folder";
  const label = child.kind === "folder" ? child.folder.name : child.book.title;

  const activation = rowActivationHandlers({
    editing,
    onActivate: isFolder ? onToggleExpand : onSelectBook,
    onStartRename,
  });

  const icon = (
    <span
      key={isFolder ? (expanded ? "open" : "closed") : "book"}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center",
        isFolder && expanded ? "text-accent" : "text-muted",
        isFolder && "scribe-icon-pop",
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
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
      depth={node.depth}
      projectionDepth={projectionDepth}
      selected={selected}
      editing={editing}
      ariaExpanded={isFolder ? expanded : undefined}
      ariaSelected={!isFolder ? selected : undefined}
      icon={icon}
      actions={actions}
      {...activation}
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
