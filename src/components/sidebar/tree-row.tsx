import { memo } from "react";

import { TreeRowShell } from "@/components/tree/tree-row-shell";
import { DocumentIcon } from "@/components/ui/document-icon";
import { type RowAction } from "@/components/ui/row-action-menu";
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
import { SIDEBAR_ICON_SIZE, SidebarRowOverlay } from "./sidebar-row";

// Handlers take the row's id/node so the parent can pass one stable set of
// callbacks for the whole tree (rather than a fresh closure per row per render),
// which is what lets `TreeRow` actually skip re-rendering under `memo`.
interface TreeRowHandlers {
  onToggleExpand: (id: string) => void;
  onSelectBook: (id: string) => void;
  onStartRename: (id: string) => void;
  onCommitRename: (node: FlatNode, value: string) => void;
  onCancelRename: () => void;
  onDelete: (node: FlatNode) => void;
  onNewBookInside: (id: string) => void;
}

type TreeRowProps = TreeRowHandlers & {
  node: FlatNode;
  selected: boolean;
  editing: boolean;
  expanded: boolean;
  /** Projected depth while this row is being dragged; null otherwise. */
  projectionDepth: number | null;
};

export const TreeRow = memo(function TreeRow({
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
  const child = node.child;
  const isFolder = child.kind === "folder";
  const label = child.kind === "folder" ? child.folder.name : child.book.title;

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

  const menuActions: RowAction[] = [
    ...(isFolder
      ? [
          {
            icon: <BookPlusIcon size={15} />,
            label: "New book",
            onSelect: () => {
              onNewBookInside(node.id);
            },
          },
        ]
      : []),
    {
      icon: <PencilIcon size={15} />,
      label: "Rename",
      onSelect: () => {
        onStartRename(node.id);
      },
      separatorBefore: isFolder,
    },
    {
      icon: <TrashIcon size={15} />,
      label: "Delete",
      onSelect: () => {
        onDelete(node);
      },
      danger: true,
      separatorBefore: true,
    },
  ];

  return (
    <TreeRowShell
      id={node.id}
      depth={node.depth}
      projectionDepth={projectionDepth}
      selected={selected}
      editing={editing}
      ariaExpanded={isFolder ? expanded : undefined}
      ariaSelected={!isFolder ? selected : undefined}
      icon={icon}
      label={label}
      renamePlaceholder={isFolder ? "Folder name" : "Untitled"}
      menuActions={menuActions}
      onActivate={() => {
        if (isFolder) onToggleExpand(node.id);
        else onSelectBook(node.id);
      }}
      onStartRename={() => {
        onStartRename(node.id);
      }}
      onCommitRename={(value) => {
        onCommitRename(node, value);
      }}
      onCancelRename={onCancelRename}
    />
  );
});

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
