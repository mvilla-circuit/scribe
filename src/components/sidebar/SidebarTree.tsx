import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useUIStore } from "../../store/ui";
import {
  useBooks,
  useCreateBook,
  useDeleteBook,
  useMoveBook,
  useRenameBook,
} from "../../data/books";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useMoveFolder,
  useRenameFolder,
} from "../../data/folders";
import { getPositionBetween } from "../../data/ordering";
import {
  buildTree,
  childrenOf,
  countBooksInFolder,
  ROOT,
} from "../../data/tree";
import {
  flattenTree,
  getProjection,
  neighbourPositions,
  removeDescendants,
  type FlatNode,
} from "./dndTree";
import { DragRowOverlay, TreeRow } from "./TreeRow";
import { BookPlusIcon, FolderPlusIcon, PlusIcon } from "./icons";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";

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

  // DnD transient state.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const expanded = useMemo(() => new Set(expandedArr), [expandedArr]);

  const model = useMemo(() => buildTree(folders, books), [folders, books]);
  const flattened = useMemo(
    () => flattenTree(model, expanded),
    [model, expanded]
  );

  // Hide the dragged folder's descendants so it can't be nested inside itself.
  const visibleNodes = useMemo(() => {
    if (!activeId) return flattened;
    return removeDescendants(flattened, [activeId]);
  }, [flattened, activeId]);

  const projection = useMemo(() => {
    if (!activeId || !overId) return null;
    return getProjection(visibleNodes, activeId, overId, offsetX);
  }, [visibleNodes, activeId, overId, offsetX]);

  const activeNode = useMemo(
    () => flattened.find((n) => n.id === activeId) ?? null,
    [flattened, activeId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      createBook.mutate({ id, title: "Untitled", folder_id: folderId, position });
    }
    setEditingId(id);
  };

  const commitRename = (node: FlatNode, value: string) => {
    setEditingId(null);
    if (node.kind === "folder") renameFolder.mutate({ id: node.id, name: value });
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

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setOverId(String(event.active.id));
    setOffsetX(0);
    setEditingId(null);
  };

  const onDragMove = (event: DragMoveEvent) => {
    setOffsetX(event.delta.x);
    if (event.over) setOverId(String(event.over.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const over = event.over ? String(event.over.id) : null;
    const active = String(event.active.id);
    const proj = over
      ? getProjection(visibleNodes, active, over, offsetX)
      : null;

    resetDnd();
    if (!proj || !over) return;

    const node = flattened.find((n) => n.id === active);
    if (!node) return;
    if (proj.parentId === active) return; // never parent to self

    const { prev, next } = neighbourPositions(
      visibleNodes,
      active,
      over,
      proj.parentId
    );
    const position = getPositionBetween(prev, next);

    if (node.kind === "folder") {
      // Guard: don't allow nesting under a descendant (already hidden, but be safe).
      moveFolder.mutate({
        id: active,
        parent_folder_id: proj.parentId,
        position,
      });
    } else {
      moveBook.mutate({ id: active, folder_id: proj.parentId, position });
    }
    if (proj.parentId) setFolderExpanded(proj.parentId, true);
  };

  const resetDnd = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
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
      projectionDepth={node.id === activeId ? projection?.depth ?? null : null}
      onToggleExpand={() => toggleFolderExpanded(node.id)}
      onSelectBook={() => setActiveBook(node.id)}
      onStartRename={() => setEditingId(node.id)}
      onCommitRename={(value) => commitRename(node, value)}
      onCancelRename={() => setEditingId(null)}
      onDelete={() => requestDelete(node)}
      onNewBookInside={() => handleCreate("book", node.id)}
    />
  );

  // Render standalone rows directly; wrap an expanded folder and its books in a
  // shared surface "card" so the grouping reads clearly with breathing room.
  const treeElements: ReactNode[] = [];
  for (let i = 0; i < visibleNodes.length; i++) {
    const node = visibleNodes[i];
    const isOpenFolder = node.kind === "folder" && expanded.has(node.id);
    if (isOpenFolder) {
      const group = [node];
      let j = i + 1;
      while (j < visibleNodes.length && visibleNodes[j].depth > node.depth) {
        group.push(visibleNodes[j]);
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
        </div>
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
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Create"
              title="New book or folder"
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-text"
            >
              <PlusIcon size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleCreate("book", ROOT)}>
              <BookPlusIcon size={15} />
              New book
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleCreate("folder", ROOT)}>
              <FolderPlusIcon size={15} />
              New folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tree / states */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <p className="px-2 py-6 text-center text-xs text-muted">Loading…</p>
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
          <EmptyState onCreateBook={() => handleCreate("book", ROOT)} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onDragCancel={resetDnd}
          >
            <SortableContext
              items={visibleNodes.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                role="tree"
                aria-label="Books and folders"
                className="flex flex-col gap-1.5"
              >
                {treeElements}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeNode ? <DragRowOverlay node={activeNode} /> : null}
            </DragOverlay>
          </DndContext>
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
    <div className="flex flex-col items-center px-3 py-10 text-center">
      <p className="text-sm font-medium text-text">No books yet</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Create your first book to start writing.
      </p>
      <Button variant="primary" className="mt-4" onClick={onCreateBook}>
        <BookPlusIcon size={15} />
        Create your first book
      </Button>
    </div>
  );
}
