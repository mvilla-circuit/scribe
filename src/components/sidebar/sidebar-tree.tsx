import { type ReactNode, useCallback, useMemo } from "react";

import {
  neighbourPositions,
  removeDescendants,
} from "@/components/tree/tree-dnd";
import { TreeDndContainer } from "@/components/tree/tree-dnd-container";
import { useTreeDnd } from "@/components/tree/use-tree-dnd";
import { useTreePanel } from "@/components/tree/use-tree-panel";
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
  useDeleteFolder,
  useFolders,
  useMoveFolder,
  useRenameFolder,
} from "@/data/folders";
import { endPositionFor } from "@/data/ordering";
import { buildTree, childrenOf, countBooksInFolder } from "@/data/tree";
import { useCreateRootItem } from "@/data/use-create-root-item";
import { useUIStore } from "@/store/ui";

import { type FlatNode, flattenTree, getProjection } from "./dnd-tree";
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

  const renameFolder = useRenameFolder();
  const moveFolder = useMoveFolder();
  const deleteFolder = useDeleteFolder();
  const createBook = useCreateBook();
  const renameBook = useRenameBook();
  const moveBook = useMoveBook();
  const deleteBook = useDeleteBook();
  const createRootItem = useCreateRootItem();

  const panel = useTreePanel<DeleteTarget>();
  // Pull out the stable members (react-query's `mutate`, the panel's
  // `useCallback`s) so the memoized row callbacks below can depend on them
  // without listing the whole per-render mutation/panel objects — which would
  // rebuild the callbacks every render and defeat the row memoization.
  const { mutate: createBookMutate } = createBook;
  const { mutate: renameFolderMutate } = renameFolder;
  const { mutate: renameBookMutate } = renameBook;
  const { startRename, cancelRename, requestDelete } = panel;

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
        cancelRename();
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

  // Books may be created inside a folder; folders only ever live at the root, so
  // top-level creation goes through the shared root-item policy. Stable across
  // renders (deps are store actions, stable mutate fns, and the tree model) so
  // the memoized rows only re-render when their own data changes.
  const onNewBookInside = useCallback(
    (folderId: string) => {
      setFolderExpanded(folderId, true);
      const id = crypto.randomUUID();
      createBookMutate({
        id,
        title: "Untitled",
        folder_id: folderId,
        position: endPositionFor(childrenOf(model, folderId)),
      });
      startRename(id);
    },
    [setFolderExpanded, createBookMutate, model, startRename],
  );

  const createRootBook = () => {
    startRename(createRootItem.createBook());
  };

  const createRootFolder = () => {
    startRename(createRootItem.createFolder());
  };

  const onCommitRename = useCallback(
    (node: FlatNode, value: string) => {
      cancelRename();
      if (node.kind === "folder")
        renameFolderMutate({ id: node.id, name: value });
      else renameBookMutate({ id: node.id, title: value });
    },
    [cancelRename, renameFolderMutate, renameBookMutate],
  );

  const onDelete = useCallback(
    (node: FlatNode) => {
      if (node.child.kind === "folder") {
        requestDelete({
          kind: "folder",
          id: node.id,
          name: node.child.folder.name,
          books: countBooksInFolder(model, node.id),
        });
      } else {
        requestDelete({
          kind: "book",
          id: node.id,
          title: node.child.book.title,
        });
      }
    },
    [requestDelete, model],
  );

  const confirmDelete = () => {
    const target = panel.deleteTarget;
    if (!target) return;
    if (target.kind === "folder") {
      deleteFolder.mutate({ id: target.id });
    } else {
      if (activeBookId === target.id) setActiveBook(null);
      deleteBook.mutate({ id: target.id });
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
      editing={panel.editingId === node.id}
      expanded={expanded.has(node.id)}
      projectionDepth={projectionDepthFor(node.id)}
      onToggleExpand={toggleFolderExpanded}
      onSelectBook={setActiveBook}
      onStartRename={startRename}
      onCommitRename={onCommitRename}
      onCancelRename={cancelRename}
      onDelete={onDelete}
      onNewBookInside={onNewBookInside}
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
          <Tooltip content="New book or folder" side="right">
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
            <DropdownMenuItem onSelect={createRootBook}>
              <BookPlusIcon size={15} />
              New book
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={createRootFolder}>
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
          <EmptyState onCreateBook={createRootBook} />
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
        open={panel.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) panel.clearDelete();
        }}
        title={
          panel.deleteTarget?.kind === "folder"
            ? `Delete "${panel.deleteTarget.name}"?`
            : panel.deleteTarget
              ? `Delete "${panel.deleteTarget.title}"?`
              : ""
        }
        description={
          panel.deleteTarget?.kind === "folder"
            ? describeFolderDelete(panel.deleteTarget.books)
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
