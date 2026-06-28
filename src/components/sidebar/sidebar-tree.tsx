import { type ReactNode, useMemo, useState } from "react";

import { TreeDndContainer } from "@/components/tree/tree-dnd-container";
import { useTreeDnd } from "@/components/tree/use-tree-dnd";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import {
  useBooks,
  useCreateBook,
  useDeleteBook,
  useMoveBook,
  useRenameBook,
} from "@/data/books";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useMoveFolder,
  useRenameFolder,
} from "@/data/folders";
import { getPositionBetween } from "@/data/ordering";
import { buildTree, childrenOf, countBooksInFolder, ROOT } from "@/data/tree";
import { useUIStore } from "@/store/ui";

import {
  type FlatNode,
  flattenTree,
  getProjection,
  neighbourPositions,
  removeDescendants,
} from "./dnd-tree";
import { BookIcon, BookPlusIcon, FolderPlusIcon, PlusIcon } from "./icons";
import { DragRowOverlay, TreeRow } from "./tree-row";
import { TreeSkeleton } from "./tree-skeleton";

type DeleteTarget =
  | { kind: "folder"; id: string; name: string; books: number }
  | { kind: "book"; id: string; title: string };

export function SidebarTree() {
  const foldersQuery = useFolders();
  const booksQuery = useBooks();

  const expandedArr = useUIStore((s) => s.expandedFolderIds);
  const toggleFolderExpanded = useUIStore((s) => s.toggleFolderExpanded);
  const setFolderExpanded = useUIStore((s) => s.setFolderExpanded);
  const activeBookId = useUIStore((s) => s.activeBookId);
  const setActiveBook = useUIStore((s) => s.setActiveBook);

  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const moveFolder = useMoveFolder();
  const deleteFolder = useDeleteFolder();
  const createBook = useCreateBook();
  const renameBook = useRenameBook();
  const moveBook = useMoveBook();
  const deleteBook = useDeleteBook();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const expanded = useMemo(() => new Set(expandedArr), [expandedArr]);

  const model = useMemo(() => buildTree(folders, books), [folders, books]);
  const flattened = useMemo(
    () => flattenTree(model, expanded),
    [model, expanded],
  );

  const { sensors, visibleNodes, activeNode, projectionDepthFor, handlers } =
    useTreeDnd<FlatNode>({
      flattened,
      removeDescendants,
      project: getProjection,
      neighbours: neighbourPositions,
      onDragStart: () => {
        setEditingId(null);
      },
      onMove: ({ id, parentId, position, node }) => {
        if (node.kind === "folder") {
          moveFolder.mutate({ id, parent_folder_id: parentId, position });
        } else {
          moveBook.mutate({ id, folder_id: parentId, position });
        }
        if (parentId) setFolderExpanded(parentId, true);
      },
    });

  const endPosition = (containerId: string) => {
    const siblings = childrenOf(model, containerId);
    const last = siblings[siblings.length - 1];
    return getPositionBetween(last?.position, undefined);
  };

  const handleCreate = (kind: "book" | "folder", containerId: string) => {
    const id = crypto.randomUUID();
    const position = endPosition(containerId);
    const folderId = containerId === ROOT ? null : containerId;
    if (containerId !== ROOT) setFolderExpanded(containerId, true);
    if (kind === "folder") {
      createFolder.mutate({
        id,
        name: "New folder",
        parent_folder_id: folderId,
        position,
      });
    } else {
      createBook.mutate({
        id,
        title: "Untitled",
        folder_id: folderId,
        position,
      });
    }
    setEditingId(id);
  };

  const commitRename = (node: FlatNode, value: string) => {
    setEditingId(null);
    if (node.kind === "folder")
      renameFolder.mutate({ id: node.id, name: value });
    else renameBook.mutate({ id: node.id, title: value });
  };

  const requestDelete = (node: FlatNode) => {
    if (node.child.kind === "folder") {
      setDeleteTarget({
        kind: "folder",
        id: node.id,
        name: node.child.folder.name,
        books: countBooksInFolder(model, node.id),
      });
    } else {
      setDeleteTarget({
        kind: "book",
        id: node.id,
        title: node.child.book.title,
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "folder") {
      deleteFolder.mutate({ id: deleteTarget.id });
    } else {
      if (activeBookId === deleteTarget.id) setActiveBook(null);
      deleteBook.mutate({ id: deleteTarget.id });
    }
  };

  const isLoading = foldersQuery.isLoading || booksQuery.isLoading;
  const isError = foldersQuery.isError || booksQuery.isError;
  const isEmpty = folders.length === 0 && books.length === 0;

  const renderRow = (node: FlatNode) => (
    <TreeRow
      key={node.id}
      node={node}
      selected={node.kind === "book" && node.id === activeBookId}
      editing={editingId === node.id}
      expanded={expanded.has(node.id)}
      projectionDepth={projectionDepthFor(node.id)}
      onToggleExpand={() => {
        toggleFolderExpanded(node.id);
      }}
      onSelectBook={() => {
        setActiveBook(node.id);
      }}
      onStartRename={() => {
        setEditingId(node.id);
      }}
      onCommitRename={(value) => {
        commitRename(node, value);
      }}
      onCancelRename={() => {
        setEditingId(null);
      }}
      onDelete={() => {
        requestDelete(node);
      }}
      onNewBookInside={() => {
        handleCreate("book", node.id);
      }}
    />
  );

  // Render standalone rows directly; wrap an expanded folder and its books in a
  // shared surface "card" so the grouping reads clearly with breathing room.
  const treeElements: ReactNode[] = [];
  for (let i = 0; i < visibleNodes.length; i++) {
    const node = visibleNodes[i];
    if (!node) continue;
    const isOpenFolder = node.kind === "folder" && expanded.has(node.id);
    if (isOpenFolder) {
      const group = [node];
      let j = i + 1;
      while (j < visibleNodes.length) {
        const child = visibleNodes[j];
        if (!child || child.depth <= node.depth) break;
        group.push(child);
        j++;
      }
      i = j - 1;
      treeElements.push(
        <div
          key={`group-${node.id}`}
          role="group"
          className="flex flex-col gap-1 rounded-lg bg-tree-group p-1"
        >
          {group.map(renderRow)}
        </div>,
      );
    } else {
      treeElements.push(renderRow(node));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 pb-1 pt-1">
        <span className="select-none text-xs font-medium uppercase tracking-wide text-muted">
          Library
        </span>
        <DropdownMenu>
          <Tooltip content="New book or folder">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Create"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-text"
              >
                <PlusIcon size={16} />
              </button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            <DropdownMenuItem
              onSelect={() => {
                handleCreate("book", ROOT);
              }}
            >
              <BookPlusIcon size={15} />
              New book
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                handleCreate("folder", ROOT);
              }}
            >
              <FolderPlusIcon size={15} />
              New folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tree / states */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <TreeSkeleton />
        ) : isError ? (
          <div className="px-2 py-6 text-center">
            <p className="text-xs text-muted">Couldn't load your library.</p>
            <Button
              variant="ghost"
              className="mt-2 text-xs"
              onClick={() => {
                void foldersQuery.refetch();
                void booksQuery.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : isEmpty ? (
          <EmptyState
            onCreateBook={() => {
              handleCreate("book", ROOT);
            }}
          />
        ) : (
          <TreeDndContainer
            sensors={sensors}
            dndHandlers={handlers}
            items={visibleNodes.map((n) => n.id)}
            ariaLabel="Books and folders"
            className="gap-1.5"
            overlay={activeNode ? <DragRowOverlay node={activeNode} /> : null}
          >
            {treeElements}
          </TreeDndContainer>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={
          deleteTarget?.kind === "folder"
            ? `Delete "${deleteTarget.name}"?`
            : deleteTarget
              ? `Delete "${deleteTarget.title}"?`
              : ""
        }
        description={
          deleteTarget?.kind === "folder"
            ? describeFolderDelete(deleteTarget.books)
            : "This permanently deletes the book and everything inside it."
        }
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function describeFolderDelete(books: number): string {
  if (books === 0) return "This folder is empty and will be removed.";
  return `The ${books} book${books === 1 ? "" : "s"} inside will move to the top level.`;
}

function EmptyState({ onCreateBook }: { onCreateBook: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tree-group text-muted">
        <BookIcon size={22} />
      </div>
      <p className="mt-4 text-sm font-medium text-text">No books yet</p>
      <p className="mt-1 max-w-[15rem] text-xs leading-relaxed text-muted">
        Books hold your writing. Create one to get started.
      </p>
      <Button
        variant="primary"
        className="mt-4 whitespace-nowrap"
        onClick={onCreateBook}
      >
        <BookPlusIcon size={15} />
        New book
      </Button>
    </div>
  );
}
