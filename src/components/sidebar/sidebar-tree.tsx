import { type ReactNode, useCallback, useMemo } from "react";

import {
  leafDeleteDescription,
  leafDeleteTitle,
} from "@/components/leaf-delete-copy";
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
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useMoveCollection,
  useRenameCollection,
} from "@/data/collections";
import {
  useCreateDatagrid,
  useDatagrids,
  useDeleteDatagrid,
  useMoveDatagrid,
  useRenameDatagrid,
} from "@/data/datagrids";
import {
  useCreateEntry,
  useDeleteEntry,
  useEntries,
  useMoveEntry,
  useRenameEntry,
} from "@/data/entries";
import {
  useDeleteFolder,
  useFolders,
  useMoveFolder,
  useRenameFolder,
} from "@/data/folders";
import { endPositionFor } from "@/data/ordering";
import { buildTree, childrenOf, countBooksInFolder, ROOT } from "@/data/tree";
import { useCreateRootItem } from "@/data/use-create-root-item";
import {
  useCreateWhiteboard,
  useDeleteWhiteboard,
  useMoveWhiteboard,
  useRenameWhiteboard,
  useWhiteboards,
} from "@/data/whiteboards";
import { copyPageLink } from "@/editor/copy-page-link";
import { useUIStore } from "@/store/ui";

import { type FlatNode, flattenTree, getProjection } from "./dnd-tree";
import {
  BookIcon,
  BookPlusIcon,
  CollectionPlusIcon,
  FolderPlusIcon,
  PlusIcon,
} from "./icons";
import { DragRowOverlay, TreeRow } from "./tree-row";
import { TreeSkeleton } from "./tree-skeleton";

type DeleteTarget =
  | { kind: "folder"; id: string; name: string; books: number }
  | {
      kind: "collection";
      id: string;
      name: string;
      movableChildren: number;
      docs: number;
      datagrids: number;
      whiteboards: number;
    }
  | { kind: "book"; id: string; title: string }
  | { kind: "entry"; id: string; title: string }
  | { kind: "datagrid"; id: string; title: string }
  | { kind: "whiteboard"; id: string; title: string };

export function SidebarTree() {
  const foldersQuery = useFolders();
  const booksQuery = useBooks();
  const collectionsQuery = useCollections();
  const entriesQuery = useEntries();
  const datagridsQuery = useDatagrids();
  const whiteboardsQuery = useWhiteboards();

  // Collections reuse the folder-expansion set: both are just "which container
  // rows are open", and their ids never collide (all UUIDs), so one set keeps
  // the tree state simple and persisted the same way.
  const expandedArr = useUIStore((s) => s.expandedFolderIds);
  const toggleExpanded = useUIStore((s) => s.toggleFolderExpanded);
  const setExpanded = useUIStore((s) => s.setFolderExpanded);
  const activeBookId = useUIStore((s) => s.activeBookId);
  const activeCollectionId = useUIStore((s) => s.activeCollectionId);
  const activeEntryId = useUIStore((s) => s.activeEntryId);
  const activeDatagridId = useUIStore((s) => s.activeDatagridId);
  const activeWhiteboardId = useUIStore((s) => s.activeWhiteboardId);
  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const setActiveCollection = useUIStore((s) => s.setActiveCollection);
  const setActiveEntry = useUIStore((s) => s.setActiveEntry);
  const setActiveDatagrid = useUIStore((s) => s.setActiveDatagrid);
  const setActiveWhiteboard = useUIStore((s) => s.setActiveWhiteboard);
  const navigateTo = useUIStore((s) => s.navigateTo);

  const renameFolder = useRenameFolder();
  const moveFolder = useMoveFolder();
  const deleteFolder = useDeleteFolder();
  const createBook = useCreateBook();
  const renameBook = useRenameBook();
  const moveBook = useMoveBook();
  const deleteBook = useDeleteBook();
  const renameCollection = useRenameCollection();
  const createCollection = useCreateCollection();
  const moveCollection = useMoveCollection();
  const deleteCollection = useDeleteCollection();
  const createEntry = useCreateEntry();
  const renameEntry = useRenameEntry();
  const moveEntry = useMoveEntry();
  const deleteEntry = useDeleteEntry();
  const createDatagrid = useCreateDatagrid();
  const renameDatagrid = useRenameDatagrid();
  const moveDatagrid = useMoveDatagrid();
  const deleteDatagrid = useDeleteDatagrid();
  const createWhiteboard = useCreateWhiteboard();
  const renameWhiteboard = useRenameWhiteboard();
  const moveWhiteboard = useMoveWhiteboard();
  const deleteWhiteboard = useDeleteWhiteboard();
  const createRootItem = useCreateRootItem();

  const panel = useTreePanel<DeleteTarget>();
  // Pull out the stable members (react-query's `mutate`, the panel's
  // `useCallback`s) so the memoized row callbacks below can depend on them
  // without listing the whole per-render mutation/panel objects — which would
  // rebuild the callbacks every render and defeat the row memoization.
  const { mutate: createBookMutate } = createBook;
  const { mutate: renameFolderMutate } = renameFolder;
  const { mutate: renameBookMutate } = renameBook;
  const { mutate: renameCollectionMutate } = renameCollection;
  const { mutate: createCollectionMutate } = createCollection;
  const { mutate: createEntryMutate } = createEntry;
  const { mutate: renameEntryMutate } = renameEntry;
  const { mutate: createDatagridMutate } = createDatagrid;
  const { mutate: renameDatagridMutate } = renameDatagrid;
  const { mutate: createWhiteboardMutate } = createWhiteboard;
  const { mutate: renameWhiteboardMutate } = renameWhiteboard;
  const { mutate: moveBookMutate } = moveBook;
  const { mutate: moveCollectionMutate } = moveCollection;
  const { mutate: moveEntryMutate } = moveEntry;
  const { mutate: moveDatagridMutate } = moveDatagrid;
  const { mutate: moveWhiteboardMutate } = moveWhiteboard;
  const { createCollection: createRootCollectionFn } = createRootItem;
  const { startRename, cancelRename, requestDelete } = panel;

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const collections = useMemo(
    () => collectionsQuery.data ?? [],
    [collectionsQuery.data],
  );
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const datagrids = useMemo(
    () => datagridsQuery.data ?? [],
    [datagridsQuery.data],
  );
  const whiteboards = useMemo(
    () => whiteboardsQuery.data ?? [],
    [whiteboardsQuery.data],
  );
  const expanded = useMemo(() => new Set(expandedArr), [expandedArr]);
  const collectionIds = useMemo(
    () => new Set(collections.map((c) => c.id)),
    [collections],
  );

  const model = useMemo(
    () =>
      buildTree(folders, books, collections, entries, datagrids, whiteboards),
    [folders, books, collections, entries, datagrids, whiteboards],
  );
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
        } else if (node.kind === "collection") {
          moveCollection.mutate({
            id,
            parent_collection_id: parentId,
            position,
          });
        } else if (node.kind === "book") {
          // A book's projected parent is a folder or a collection; write the
          // matching column and null the other (they're mutually exclusive).
          const intoCollection =
            parentId !== null && collectionIds.has(parentId);
          moveBook.mutate({
            id,
            folder_id: intoCollection ? null : parentId,
            collection_id: intoCollection ? parentId : null,
            position,
          });
        } else if (node.kind === "entry" && parentId) {
          // Entries can only live in a collection (enforced by getProjection).
          // Defer selection updates until the move succeeds so a failed mutation
          // doesn't leave history/breadcrumb on the wrong collection.
          moveEntry.mutate(
            {
              id,
              collection_id: parentId,
              position,
            },
            {
              onSuccess: () => {
                if (activeEntryId === id) setActiveEntry(id, parentId);
              },
            },
          );
        } else if (node.kind === "datagrid" && parentId) {
          // Datagrids, like entries, live in a collection only (enforced by
          // getProjection); write the new container and position.
          moveDatagridMutate({ id, collection_id: parentId, position });
        } else if (node.kind === "whiteboard" && parentId) {
          moveWhiteboardMutate({ id, collection_id: parentId, position });
        }
        if (parentId) setExpanded(parentId, true);
      },
    });

  // Books may be created inside a folder; folders only ever live at the root, so
  // top-level creation goes through the shared root-item policy. Stable across
  // renders (deps are store actions, stable mutate fns, and the tree model) so
  // the memoized rows only re-render when their own data changes.
  const onNewBookInside = useCallback(
    (folderId: string) => {
      setExpanded(folderId, true);
      const id = crypto.randomUUID();
      createBookMutate({
        id,
        title: "Untitled",
        folder_id: folderId,
        position: endPositionFor(childrenOf(model, folderId)),
      });
      startRename(id);
    },
    [setExpanded, createBookMutate, model, startRename],
  );

  const onNewBookInCollection = useCallback(
    (collectionId: string) => {
      setExpanded(collectionId, true);
      const id = crypto.randomUUID();
      createBookMutate({
        id,
        title: "Untitled",
        folder_id: null,
        collection_id: collectionId,
        position: endPositionFor(childrenOf(model, collectionId)),
      });
      startRename(id);
    },
    [setExpanded, createBookMutate, model, startRename],
  );

  const onNewCollectionInside = useCallback(
    (parentId: string) => {
      setExpanded(parentId, true);
      const id = crypto.randomUUID();
      createCollectionMutate({
        id,
        name: "Untitled",
        parent_collection_id: parentId,
        position: endPositionFor(childrenOf(model, parentId)),
      });
      startRename(id);
    },
    [setExpanded, createCollectionMutate, model, startRename],
  );

  const onNewEntryInside = useCallback(
    (collectionId: string) => {
      setExpanded(collectionId, true);
      const id = crypto.randomUUID();
      createEntryMutate({
        id,
        title: "Untitled",
        collection_id: collectionId,
        position: endPositionFor(childrenOf(model, collectionId)),
      });
      setActiveEntry(id, collectionId);
      startRename(id);
    },
    [setExpanded, createEntryMutate, model, setActiveEntry, startRename],
  );

  const onNewDatagridInside = useCallback(
    (collectionId: string) => {
      setExpanded(collectionId, true);
      const id = crypto.randomUUID();
      createDatagridMutate({
        id,
        collection_id: collectionId,
        name: "Untitled",
        position: endPositionFor(childrenOf(model, collectionId)),
        viewId: crypto.randomUUID(),
      });
      setActiveDatagrid(id);
      startRename(id);
    },
    [setExpanded, createDatagridMutate, model, setActiveDatagrid, startRename],
  );

  const onNewWhiteboardInside = useCallback(
    (collectionId: string) => {
      setExpanded(collectionId, true);
      const id = crypto.randomUUID();
      createWhiteboardMutate({
        id,
        collection_id: collectionId,
        name: "Untitled",
        position: endPositionFor(childrenOf(model, collectionId)),
      });
      setActiveWhiteboard(id);
      startRename(id);
    },
    [
      setExpanded,
      createWhiteboardMutate,
      model,
      setActiveWhiteboard,
      startRename,
    ],
  );

  const onMoveToCollection = useCallback(
    (node: FlatNode, targetCollectionId: string | null) => {
      const position = endPositionFor(
        childrenOf(model, targetCollectionId ?? ROOT),
      );
      if (node.kind === "collection") {
        moveCollectionMutate({
          id: node.id,
          parent_collection_id: targetCollectionId,
          position,
        });
      } else if (node.kind === "book") {
        moveBookMutate({
          id: node.id,
          folder_id: null,
          collection_id: targetCollectionId,
          position,
        });
      } else if (node.kind === "entry" && targetCollectionId) {
        moveEntryMutate(
          {
            id: node.id,
            collection_id: targetCollectionId,
            position,
          },
          {
            onSuccess: () => {
              if (activeEntryId === node.id) {
                setActiveEntry(node.id, targetCollectionId);
              }
            },
          },
        );
      } else if (node.kind === "datagrid" && targetCollectionId) {
        moveDatagridMutate({
          id: node.id,
          collection_id: targetCollectionId,
          position,
        });
      } else if (node.kind === "whiteboard" && targetCollectionId) {
        moveWhiteboardMutate({
          id: node.id,
          collection_id: targetCollectionId,
          position,
        });
      }
      if (targetCollectionId) setExpanded(targetCollectionId, true);
    },
    [
      model,
      moveCollectionMutate,
      moveBookMutate,
      moveEntryMutate,
      activeEntryId,
      setActiveEntry,
      setExpanded,
      moveDatagridMutate,
      moveWhiteboardMutate,
    ],
  );

  const createRootBook = () => {
    startRename(createRootItem.createBook());
  };

  const createRootFolder = () => {
    startRename(createRootItem.createFolder());
  };

  const createRootCollection = () => {
    startRename(createRootCollectionFn());
  };

  const onCommitRename = useCallback(
    (node: FlatNode, value: string) => {
      cancelRename();
      if (node.kind === "folder")
        renameFolderMutate({ id: node.id, name: value });
      else if (node.kind === "collection")
        renameCollectionMutate({ id: node.id, name: value });
      else if (node.kind === "book")
        renameBookMutate({ id: node.id, title: value });
      else if (node.kind === "datagrid")
        renameDatagridMutate({ id: node.id, name: value });
      else if (node.kind === "whiteboard")
        renameWhiteboardMutate({ id: node.id, name: value });
      else renameEntryMutate({ id: node.id, title: value });
    },
    [
      cancelRename,
      renameFolderMutate,
      renameCollectionMutate,
      renameBookMutate,
      renameDatagridMutate,
      renameWhiteboardMutate,
      renameEntryMutate,
    ],
  );

  const onCopyLink = useCallback((id: string) => {
    void copyPageLink("book", id);
  }, []);

  const onDelete = useCallback(
    (node: FlatNode) => {
      if (node.child.kind === "folder") {
        requestDelete({
          kind: "folder",
          id: node.id,
          name: node.child.folder.name,
          books: countBooksInFolder(model, node.id),
        });
      } else if (node.child.kind === "collection") {
        const kids = childrenOf(model, node.id);
        const docs = kids.filter((child) => child.kind === "entry").length;
        const datagrids = kids.filter(
          (child) => child.kind === "datagrid",
        ).length;
        const whiteboards = kids.filter(
          (child) => child.kind === "whiteboard",
        ).length;
        requestDelete({
          kind: "collection",
          id: node.id,
          name: node.child.collection.name,
          movableChildren: kids.length - docs - datagrids - whiteboards,
          docs,
          datagrids,
          whiteboards,
        });
      } else if (node.child.kind === "book") {
        requestDelete({
          kind: "book",
          id: node.id,
          title: node.child.book.title,
        });
      } else if (node.child.kind === "entry") {
        requestDelete({
          kind: "entry",
          id: node.id,
          title: node.child.entry.title,
        });
      } else if (node.child.kind === "datagrid") {
        requestDelete({
          kind: "datagrid",
          id: node.id,
          title: node.child.datagrid.name,
        });
      } else if (node.child.kind === "whiteboard") {
        requestDelete({
          kind: "whiteboard",
          id: node.id,
          title: node.child.whiteboard.name,
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
    } else if (target.kind === "collection") {
      if (activeCollectionId === target.id) setActiveCollection(null);
      if (
        whiteboards.some(
          (whiteboard) =>
            whiteboard.id === activeWhiteboardId &&
            whiteboard.collection_id === target.id,
        )
      ) {
        setActiveWhiteboard(null);
      }
      deleteCollection.mutate({ id: target.id });
    } else if (target.kind === "book") {
      if (activeBookId === target.id) setActiveBook(null);
      deleteBook.mutate({ id: target.id });
    } else if (target.kind === "datagrid") {
      if (activeDatagridId === target.id) setActiveDatagrid(null);
      deleteDatagrid.mutate({ id: target.id });
    } else if (target.kind === "whiteboard") {
      if (activeWhiteboardId === target.id) setActiveWhiteboard(null);
      deleteWhiteboard.mutate({ id: target.id });
    } else {
      if (activeEntryId === target.id) {
        navigateTo({ collectionId: activeCollectionId });
      }
      deleteEntry.mutate({ id: target.id });
    }
  };

  const isLoading =
    foldersQuery.isLoading ||
    booksQuery.isLoading ||
    collectionsQuery.isLoading ||
    entriesQuery.isLoading ||
    datagridsQuery.isLoading ||
    whiteboardsQuery.isLoading;
  const isError =
    foldersQuery.isError ||
    booksQuery.isError ||
    collectionsQuery.isError ||
    entriesQuery.isError ||
    datagridsQuery.isError ||
    whiteboardsQuery.isError;
  const isEmpty =
    folders.length === 0 &&
    books.length === 0 &&
    collections.length === 0 &&
    entries.length === 0 &&
    datagrids.length === 0 &&
    whiteboards.length === 0;

  const renderRow = (node: FlatNode) => (
    <TreeRow
      key={node.id}
      node={node}
      selected={
        (node.kind === "book" && node.id === activeBookId) ||
        (node.kind === "collection" && node.id === activeCollectionId) ||
        (node.kind === "entry" && node.id === activeEntryId) ||
        (node.kind === "datagrid" && node.id === activeDatagridId) ||
        (node.kind === "whiteboard" && node.id === activeWhiteboardId)
      }
      editing={panel.editingId === node.id}
      expanded={expanded.has(node.id)}
      collections={collections}
      projectionDepth={projectionDepthFor(node.id)}
      onToggleExpand={toggleExpanded}
      onSelectBook={setActiveBook}
      onSelectCollection={setActiveCollection}
      onSelectEntry={setActiveEntry}
      onSelectDatagrid={setActiveDatagrid}
      onSelectWhiteboard={setActiveWhiteboard}
      onStartRename={startRename}
      onCommitRename={onCommitRename}
      onCancelRename={cancelRename}
      onDelete={onDelete}
      onCopyLink={onCopyLink}
      onNewBookInside={onNewBookInside}
      onNewBookInCollection={onNewBookInCollection}
      onNewCollectionInside={onNewCollectionInside}
      onNewEntryInside={onNewEntryInside}
      onNewDatagridInside={onNewDatagridInside}
      onNewWhiteboardInside={onNewWhiteboardInside}
      onMoveToCollection={onMoveToCollection}
    />
  );

  // Render standalone rows directly; wrap an expanded container (folder or
  // collection) and its descendants in a shared surface "card" so the grouping
  // reads clearly with breathing room.
  const treeElements: ReactNode[] = [];
  for (let i = 0; i < visibleNodes.length; i++) {
    const node = visibleNodes[i];
    if (!node) continue;
    const isOpenContainer =
      (node.kind === "folder" || node.kind === "collection") &&
      expanded.has(node.id);
    if (isOpenContainer) {
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
          <Tooltip content="New book, collection, or folder" side="right">
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
            <DropdownMenuItem onSelect={createRootCollection}>
              <CollectionPlusIcon size={15} />
              New collection
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
                void collectionsQuery.refetch();
                void entriesQuery.refetch();
                void datagridsQuery.refetch();
                void whiteboardsQuery.refetch();
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
            ariaLabel="Books, docs, collections, and folders"
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
        title={deleteTitle(panel.deleteTarget)}
        description={deleteDescription(panel.deleteTarget)}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function deleteTitle(target: DeleteTarget | null): string {
  if (!target) return "";
  if (
    target.kind === "entry" ||
    target.kind === "datagrid" ||
    target.kind === "whiteboard"
  ) {
    return leafDeleteTitle(target.title);
  }
  if (target.kind === "book") return leafDeleteTitle(target.title);
  return leafDeleteTitle(target.name);
}

function deleteDescription(target: DeleteTarget | null): string {
  if (!target) return "";
  if (target.kind === "folder") return describeFolderDelete(target.books);
  if (target.kind === "collection") {
    return describeCollectionDelete(
      target.movableChildren,
      target.docs,
      target.datagrids,
      target.whiteboards,
    );
  }
  if (
    target.kind === "entry" ||
    target.kind === "datagrid" ||
    target.kind === "whiteboard"
  ) {
    return leafDeleteDescription(target.kind);
  }
  return "This permanently deletes the book and everything inside it.";
}

function describeFolderDelete(books: number): string {
  if (books === 0) return "This folder is empty and will be removed.";
  return `The ${books} book${books === 1 ? "" : "s"} inside will move to the top level.`;
}

function describeCollectionDelete(
  movable: number,
  docs: number,
  datagrids: number,
  whiteboards: number,
): string {
  if (movable === 0 && docs === 0 && datagrids === 0 && whiteboards === 0) {
    return "This collection is empty and will be removed.";
  }
  const parts: string[] = [];
  if (movable > 0) {
    parts.push(
      `The ${movable} item${movable === 1 ? "" : "s"} inside will move to the top level.`,
    );
  }
  if (docs > 0) {
    parts.push(
      `The ${docs} doc${docs === 1 ? "" : "s"} inside will be permanently deleted.`,
    );
  }
  if (datagrids > 0) {
    parts.push(
      `The ${datagrids} datagrid${datagrids === 1 ? "" : "s"} inside will be permanently deleted.`,
    );
  }
  if (whiteboards > 0) {
    parts.push(
      `The ${whiteboards} whiteboard${whiteboards === 1 ? "" : "s"} inside will be permanently deleted.`,
    );
  }
  return parts.join(" ");
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
