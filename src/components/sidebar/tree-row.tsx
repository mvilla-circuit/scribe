import { memo, useMemo } from "react";

import { PageIcon } from "@/components/book/icons";
import { TreeRowShell } from "@/components/tree/tree-row-shell";
import { DocumentIcon } from "@/components/ui/document-icon";
import { type RowAction } from "@/components/ui/row-action-menu";
import type { Collection } from "@/data/collections";
import { collectionDescendants } from "@/data/tree";
import { cn } from "@/lib/utils";

import { type FlatNode } from "./dnd-tree";
import {
  BookIcon,
  BookPlusIcon,
  CollectionIcon,
  CollectionPlusIcon,
  DatagridIcon,
  FolderIcon,
  FolderOpenIcon,
  LinkIcon,
  PencilIcon,
  RemoveFromCollectionIcon,
  TrashIcon,
} from "./icons";
import { SIDEBAR_ICON_SIZE, SidebarRowOverlay } from "./sidebar-row";

// Handlers take the row's id/node so the parent can pass one stable set of
// callbacks for the whole tree (rather than a fresh closure per row per render),
// which is what lets `TreeRow` actually skip re-rendering under `memo`.
interface TreeRowHandlers {
  onToggleExpand: (id: string) => void;
  onSelectBook: (id: string) => void;
  onSelectCollection: (id: string) => void;
  onSelectEntry: (id: string, collectionId: string) => void;
  onSelectDatagrid: (id: string) => void;
  onStartRename: (id: string) => void;
  onCommitRename: (node: FlatNode, value: string) => void;
  onCancelRename: () => void;
  onDelete: (node: FlatNode) => void;
  onCopyLink: (id: string) => void;
  onNewBookInside: (id: string) => void;
  onNewBookInCollection: (id: string) => void;
  onNewCollectionInside: (id: string) => void;
  onNewEntryInside: (id: string) => void;
  onNewDatagridInside: (id: string) => void;
  // Reparent this node into a collection, or back to the top level (null).
  onMoveToCollection: (
    node: FlatNode,
    targetCollectionId: string | null,
  ) => void;
}

type TreeRowProps = TreeRowHandlers & {
  node: FlatNode;
  selected: boolean;
  editing: boolean;
  expanded: boolean;
  /** All collections, for building the "Move to" submenu (stable reference). */
  collections: Collection[];
  /** Projected depth while this row is being dragged; null otherwise. */
  projectionDepth: number | null;
};

export const TreeRow = memo(function TreeRow({
  node,
  selected,
  editing,
  expanded,
  collections,
  projectionDepth,
  onToggleExpand,
  onSelectBook,
  onSelectCollection,
  onSelectEntry,
  onSelectDatagrid,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
  onCopyLink,
  onNewBookInside,
  onNewBookInCollection,
  onNewCollectionInside,
  onNewEntryInside,
  onNewDatagridInside,
  onMoveToCollection,
}: TreeRowProps) {
  const child = node.child;
  const isFolder = child.kind === "folder";
  const isCollection = child.kind === "collection";
  const isEntry = child.kind === "entry";
  const isDatagrid = child.kind === "datagrid";
  const label =
    child.kind === "folder"
      ? child.folder.name
      : child.kind === "collection"
        ? child.collection.name
        : child.kind === "book"
          ? child.book.title
          : child.kind === "entry"
            ? child.entry.title
            : child.datagrid.name;

  // The set of collections this node may move into: never itself, never one of
  // its own descendants (which would form a cycle), and never its current
  // container (a no-op move).
  const moveSubmenu = useMemo<RowAction[]>(() => {
    const descendants = isCollection
      ? collectionDescendants(collections, node.id)
      : new Set<string>();
    const targets = collections.filter(
      (c) =>
        c.id !== node.id && !descendants.has(c.id) && c.id !== node.parentId,
    );
    const actions: RowAction[] = [];
    if (node.parentId !== null) {
      actions.push({
        icon: <RemoveFromCollectionIcon size={15} />,
        label: "Top level",
        onSelect: () => {
          onMoveToCollection(node, null);
        },
      });
    }
    targets.forEach((c, i) => {
      actions.push({
        icon: <CollectionIcon size={15} />,
        label: c.name || "Untitled",
        key: c.id,
        onSelect: () => {
          onMoveToCollection(node, c.id);
        },
        separatorBefore: i === 0 && node.parentId !== null,
      });
    });
    return actions;
  }, [collections, node, isCollection, onMoveToCollection]);

  const icon = isCollection ? (
    <button
      type="button"
      tabIndex={-1}
      aria-label={expanded ? "Collapse collection" : "Expand collection"}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand(node.id);
      }}
      className={cn(
        "scribe-icon-pop flex h-5 w-5 shrink-0 items-center justify-center rounded outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring",
        expanded ? "text-accent" : "text-muted",
      )}
    >
      {child.kind === "collection" && child.collection.icon ? (
        <DocumentIcon icon={child.collection.icon} size={SIDEBAR_ICON_SIZE} />
      ) : (
        <CollectionIcon size={SIDEBAR_ICON_SIZE} />
      )}
    </button>
  ) : (
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
      ) : child.kind === "book" && child.book.icon ? (
        <DocumentIcon icon={child.book.icon} size={SIDEBAR_ICON_SIZE} />
      ) : child.kind === "entry" && child.entry.icon ? (
        <DocumentIcon icon={child.entry.icon} size={SIDEBAR_ICON_SIZE} />
      ) : child.kind === "datagrid" && child.datagrid.icon ? (
        <DocumentIcon icon={child.datagrid.icon} size={SIDEBAR_ICON_SIZE} />
      ) : isEntry ? (
        <PageIcon size={SIDEBAR_ICON_SIZE} />
      ) : child.kind === "datagrid" ? (
        <DatagridIcon size={SIDEBAR_ICON_SIZE} />
      ) : (
        <BookIcon size={SIDEBAR_ICON_SIZE} />
      )}
    </span>
  );

  const moveAction: RowAction[] =
    moveSubmenu.length > 0
      ? [
          {
            icon: <CollectionIcon size={15} />,
            label: "Move to",
            submenu: moveSubmenu,
            separatorBefore: true,
          },
        ]
      : [];

  const menuActions: RowAction[] = isCollection
    ? [
        {
          icon: <BookPlusIcon size={15} />,
          label: "New book",
          onSelect: () => {
            onNewBookInCollection(node.id);
          },
        },
        {
          icon: <CollectionPlusIcon size={15} />,
          label: "New collection",
          onSelect: () => {
            onNewCollectionInside(node.id);
          },
        },
        {
          icon: <PageIcon size={15} />,
          label: "New doc",
          onSelect: () => {
            onNewEntryInside(node.id);
          },
        },
        {
          icon: <DatagridIcon size={15} />,
          label: "New datagrid",
          onSelect: () => {
            onNewDatagridInside(node.id);
          },
        },
        {
          icon: <PencilIcon size={15} />,
          label: "Rename",
          onSelect: () => {
            onStartRename(node.id);
          },
          separatorBefore: true,
        },
        ...moveAction,
        {
          icon: <TrashIcon size={15} />,
          label: "Delete",
          onSelect: () => {
            onDelete(node);
          },
          danger: true,
          separatorBefore: true,
        },
      ]
    : isEntry || isDatagrid
      ? [
          {
            icon: <PencilIcon size={15} />,
            label: "Rename",
            onSelect: () => {
              onStartRename(node.id);
            },
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
        ]
      : [
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
          ...(!isFolder
            ? [
                {
                  icon: <LinkIcon size={15} />,
                  label: "Copy link",
                  onSelect: () => {
                    onCopyLink(node.id);
                  },
                },
              ]
            : []),
          ...(isFolder ? [] : moveAction),
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
      draggable={node.draggable}
      depth={node.depth}
      projectionDepth={projectionDepth}
      selected={selected}
      editing={editing}
      ariaExpanded={isFolder || isCollection ? expanded : undefined}
      ariaSelected={!isFolder ? selected : undefined}
      icon={icon}
      label={label}
      renamePlaceholder={
        isFolder ? "Folder name" : isCollection ? "Collection name" : "Untitled"
      }
      menuActions={menuActions}
      onActivate={() => {
        if (isFolder) onToggleExpand(node.id);
        else if (isCollection) onSelectCollection(node.id);
        else if (child.kind === "entry")
          onSelectEntry(node.id, child.entry.collection_id);
        else if (child.kind === "datagrid") onSelectDatagrid(node.id);
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
  const icon =
    child.kind === "folder" ? (
      <FolderIcon size={SIDEBAR_ICON_SIZE} />
    ) : child.kind === "collection" ? (
      child.collection.icon ? (
        <DocumentIcon icon={child.collection.icon} size={SIDEBAR_ICON_SIZE} />
      ) : (
        <CollectionIcon size={SIDEBAR_ICON_SIZE} />
      )
    ) : child.kind === "book" ? (
      child.book.icon ? (
        <DocumentIcon icon={child.book.icon} size={SIDEBAR_ICON_SIZE} />
      ) : (
        <BookIcon size={SIDEBAR_ICON_SIZE} />
      )
    ) : child.kind === "datagrid" ? (
      child.datagrid.icon ? (
        <DocumentIcon icon={child.datagrid.icon} size={SIDEBAR_ICON_SIZE} />
      ) : (
        <DatagridIcon size={SIDEBAR_ICON_SIZE} />
      )
    ) : child.entry.icon ? (
      <DocumentIcon icon={child.entry.icon} size={SIDEBAR_ICON_SIZE} />
    ) : (
      <PageIcon size={SIDEBAR_ICON_SIZE} />
    );
  const label =
    child.kind === "folder"
      ? child.folder.name
      : child.kind === "collection"
        ? child.collection.name
        : child.kind === "book"
          ? child.book.title
          : child.kind === "entry"
            ? child.entry.title
            : child.datagrid.name;
  return <SidebarRowOverlay icon={icon} label={label} />;
}
