import { useCallback, useMemo } from "react";

import { BookIcon, WhiteboardIcon } from "@/components/sidebar/icons";
import {
  SIDEBAR_ICON_SIZE,
  SIDEBAR_ROW_GAP,
  sidebarRowPadding,
} from "@/components/sidebar/sidebar-row";
import { TreeSkeleton } from "@/components/sidebar/tree-skeleton";
import {
  neighbourPositions,
  removeDescendants,
} from "@/components/tree/tree-dnd";
import { TreeDndContainer } from "@/components/tree/tree-dnd-container";
import { useTreeDnd } from "@/components/tree/use-tree-dnd";
import { useTreePanel } from "@/components/tree/use-tree-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DocumentIcon } from "@/components/ui/document-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import {
  buildBookOutlineTree,
  outlinePositionSiblings,
} from "@/data/book-outline-tree";
import type { Book } from "@/data/books";
import { descendantCount } from "@/data/doc-tree";
import {
  buildDocumentDuplicate,
  collectDocumentSubtree,
} from "@/data/document-duplicate";
import {
  useCreateDocument,
  useDeleteDocument,
  useDocuments,
  useDuplicateDocument,
  useMoveDocument,
  useRenameDocument,
} from "@/data/documents";
import { endPositionFor } from "@/data/ordering";
import {
  countWhiteboardsUnderDocuments,
  whiteboardUnderDocuments,
} from "@/data/whiteboard-cache";
import {
  useCreateWhiteboard,
  useDeleteWhiteboard,
  useMoveWhiteboard,
  useRenameWhiteboard,
  useWhiteboards,
} from "@/data/whiteboards";
import { copyPageLink } from "@/editor/copy-page-link";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

import { PageIcon, PlusIcon } from "./icons";
import { describeDelete } from "./outline-delete-copy";
import {
  type FlatBookOutlineNode,
  type FlatDocNode,
  flattenBookOutlineTree,
  getBookOutlineProjection,
} from "./outline-dnd";
import { OutlineDragOverlay, OutlineRow } from "./outline-row";

interface DeleteTarget {
  id: string;
  title: string;
  descendants: number;
  whiteboardDescendants: number;
  kind: "document" | "whiteboard";
}

// The in-book navigation that replaces the Library tree inside the main sidebar
// while a book is open: a pinned Title Page, the nested document hierarchy with
// CRUD + drag reorder/nest, and a cascade-aware delete confirm.
export function OutlinePanel({ book }: { book: Book }) {
  const documentsQuery = useDocuments(book.id);
  const documents = useMemo(
    () => documentsQuery.data ?? [],
    [documentsQuery.data],
  );
  const titlePage = documents.find((d) => d.is_title_page) ?? null;
  const whiteboardsQuery = useWhiteboards();
  const whiteboards = useMemo(
    () =>
      (whiteboardsQuery.data ?? []).filter(
        (whiteboard) => whiteboard.book_id === book.id,
      ),
    [book.id, whiteboardsQuery.data],
  );

  const expandedArr = useUIStore((s) => s.expandedDocIds);
  const toggleDocExpanded = useUIStore((s) => s.toggleDocExpanded);
  const setDocExpanded = useUIStore((s) => s.setDocExpanded);
  const activeDocId = useUIStore((s) => s.activeDocId);
  const activeWhiteboardId = useUIStore((s) => s.activeWhiteboardId);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const navigateTo = useUIStore((s) => s.navigateTo);

  const createDocument = useCreateDocument(book.id);
  const duplicateDocument = useDuplicateDocument(book.id);
  const renameDocument = useRenameDocument(book.id);
  const moveDocument = useMoveDocument(book.id);
  const deleteDocument = useDeleteDocument(book.id);
  const createWhiteboard = useCreateWhiteboard();
  const moveWhiteboard = useMoveWhiteboard();
  const renameWhiteboard = useRenameWhiteboard();
  const deleteWhiteboard = useDeleteWhiteboard();

  const panel = useTreePanel<DeleteTarget>();
  // Pull out the stable members (react-query's `mutate`, the panel's
  // `useCallback`s) so the memoized row callbacks below can depend on them
  // without listing the whole per-render mutation/panel objects — which would
  // rebuild the callbacks every render and defeat the row memoization.
  const { mutate: createDocumentMutate } = createDocument;
  const { mutate: createWhiteboardMutate } = createWhiteboard;
  const { mutate: duplicateDocumentMutate } = duplicateDocument;
  const { mutate: renameDocumentMutate } = renameDocument;
  const { mutate: renameWhiteboardMutate } = renameWhiteboard;
  const { startRename, cancelRename, requestDelete } = panel;

  const expanded = useMemo(() => new Set(expandedArr), [expandedArr]);
  const tree = useMemo(
    () => buildBookOutlineTree(documents, whiteboards),
    [documents, whiteboards],
  );
  const flattened = useMemo(
    () => flattenBookOutlineTree(tree, expanded),
    [tree, expanded],
  );

  const { sensors, visibleNodes, activeNode, projectionDepthFor, handlers } =
    useTreeDnd<FlatBookOutlineNode>({
      flattened,
      removeDescendants,
      project: getBookOutlineProjection,
      neighbours: neighbourPositions,
      onDragStart: () => {
        cancelRename();
      },
      onMove: ({ id, parentId, position, node }) => {
        if (node.kind === "whiteboard") {
          moveWhiteboard.mutate({
            id,
            book_id: book.id,
            parent_document_id: parentId,
            position,
          });
        } else {
          moveDocument.mutate({
            id,
            parent_document_id: parentId,
            position,
          });
        }
        if (parentId) setDocExpanded(parentId, true);
      },
    });

  // Stable across renders (deps are store actions, stable mutate fns, and the
  // documents list) so the memoized rows only re-render when their own data
  // changes — not on every selection, rename, or drag-move tick.
  const handleCreate = useCallback(
    (parentId: string | null) => {
      const id = crypto.randomUUID();
      if (parentId) setDocExpanded(parentId, true);
      createDocumentMutate({
        id,
        title: "Untitled",
        parent_document_id: parentId,
        position: endPositionFor(
          outlinePositionSiblings(documents, whiteboards, parentId),
        ),
      });
      setActiveDoc(id);
      startRename(id);
    },
    [
      setDocExpanded,
      createDocumentMutate,
      documents,
      whiteboards,
      setActiveDoc,
      startRename,
    ],
  );
  const handleCreateWhiteboard = useCallback(
    (parentDocumentId: string | null = null) => {
      const id = crypto.randomUUID();
      createWhiteboardMutate({
        id,
        book_id: book.id,
        parent_document_id: parentDocumentId,
        position: endPositionFor(
          outlinePositionSiblings(documents, whiteboards, parentDocumentId),
        ),
      });
      navigateTo({ bookId: book.id, whiteboardId: id });
    },
    [book.id, createWhiteboardMutate, documents, navigateTo, whiteboards],
  );

  const onDuplicate = useCallback(
    (node: FlatDocNode) => {
      const plan = buildDocumentDuplicate(documents, node.id);
      if (!plan) return;
      duplicateDocumentMutate({
        rows: plan.rows,
        sourceByNewId: plan.sourceByNewId,
      });
      setActiveDoc(plan.rootId);
    },
    [documents, duplicateDocumentMutate, setActiveDoc],
  );

  const onCommitRename = useCallback(
    (node: FlatBookOutlineNode, value: string) => {
      cancelRename();
      if (node.kind === "document") {
        renameDocumentMutate({ id: node.id, title: value });
      } else {
        renameWhiteboardMutate({ id: node.id, name: value });
      }
    },
    [cancelRename, renameDocumentMutate, renameWhiteboardMutate],
  );

  const onCopyLink = useCallback((id: string) => {
    void copyPageLink("document", id);
  }, []);

  const onDelete = useCallback(
    (node: FlatBookOutlineNode) => {
      const title =
        (node.kind === "document"
          ? node.document.title
          : node.whiteboard.name) || "Untitled";
      if (node.kind === "whiteboard") {
        requestDelete({
          id: node.id,
          title,
          descendants: 0,
          whiteboardDescendants: 0,
          kind: "whiteboard",
        });
        return;
      }
      const subtree = collectDocumentSubtree(documents, node.id);
      requestDelete({
        id: node.id,
        title,
        descendants: descendantCount(documents, node.id),
        whiteboardDescendants: countWhiteboardsUnderDocuments(
          whiteboards,
          subtree,
        ),
        kind: "document",
      });
    },
    [requestDelete, documents, whiteboards],
  );

  const confirmDelete = () => {
    const target = panel.deleteTarget;
    if (!target) return;
    if (target.kind === "whiteboard") {
      if (activeWhiteboardId === target.id) {
        navigateTo({ bookId: book.id });
      }
      deleteWhiteboard.mutate({ id: target.id });
      return;
    }
    const subtree = collectDocumentSubtree(documents, target.id);
    const activeWhiteboard = whiteboards.find(
      (whiteboard) => whiteboard.id === activeWhiteboardId,
    );
    const clearsActiveView =
      (activeDocId !== null && subtree.has(activeDocId)) ||
      (activeWhiteboard != null &&
        whiteboardUnderDocuments(activeWhiteboard, subtree));
    if (clearsActiveView) {
      navigateTo({ bookId: book.id });
    }
    deleteDocument.mutate({ id: target.id });
  };

  const titlePageSelected =
    activeWhiteboardId === null &&
    (activeDocId === null || activeDocId === titlePage?.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Pinned Title Page + section toolbar stay fixed above the scroll. */}
      <div className="px-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setActiveDoc(titlePage?.id ?? null);
          }}
          aria-current={titlePageSelected ? "page" : undefined}
          style={{ paddingLeft: sidebarRowPadding(0) }}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md pr-1 text-left text-sm outline-none",
            "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            titlePageSelected
              ? "bg-selected font-medium text-text"
              : "text-text hover:bg-hover",
          )}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted/70">
            {book.icon ? (
              <DocumentIcon icon={book.icon} size={SIDEBAR_ICON_SIZE} />
            ) : (
              <BookIcon size={SIDEBAR_ICON_SIZE} />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {book.title || "Untitled"}
          </span>
        </button>

        <div className="mt-2 flex items-center justify-between px-1.5">
          <span className="select-none text-xs font-medium uppercase tracking-wide text-muted">
            Pages
          </span>
          <DropdownMenu>
            <Tooltip content="Add to outline" side="right">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Add to outline"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-text"
                >
                  <PlusIcon size={16} />
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() => {
                  handleCreate(null);
                }}
              >
                <PageIcon size={15} />
                New page
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  handleCreateWhiteboard();
                }}
              >
                <WhiteboardIcon size={15} />
                New whiteboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-1">
        {documentsQuery.isLoading ? (
          <TreeSkeleton depths={[0, 1, 0, 0, 1]} />
        ) : flattened.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              handleCreate(null);
            }}
            style={{ paddingLeft: sidebarRowPadding(0) }}
            className="flex h-9 w-full items-center gap-2 rounded-md pr-1 text-left text-sm text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <PlusIcon size={SIDEBAR_ICON_SIZE} className="opacity-70" />
            </span>
            Add your first page
          </button>
        ) : (
          <TreeDndContainer
            sensors={sensors}
            dndHandlers={handlers}
            items={visibleNodes.map((n) => n.id)}
            ariaLabel="Document outline"
            className={SIDEBAR_ROW_GAP}
            overlay={
              activeNode ? <OutlineDragOverlay node={activeNode} /> : null
            }
          >
            {visibleNodes.map((node) => (
              <OutlineRow
                key={node.id}
                node={node}
                selected={
                  node.kind === "document"
                    ? node.id === activeDocId
                    : node.id === activeWhiteboardId
                }
                editing={panel.editingId === node.id}
                expanded={expanded.has(node.id)}
                projectionDepth={projectionDepthFor(node.id)}
                onToggleExpand={toggleDocExpanded}
                onSelectDocument={setActiveDoc}
                onSelectWhiteboard={(id) => {
                  navigateTo({ bookId: book.id, whiteboardId: id });
                }}
                onStartRename={startRename}
                onCommitRename={onCommitRename}
                onCancelRename={cancelRename}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onCopyLink={onCopyLink}
                onNewChild={handleCreate}
                onNewWhiteboardChild={handleCreateWhiteboard}
              />
            ))}
          </TreeDndContainer>
        )}
      </div>

      <ConfirmDialog
        open={panel.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) panel.clearDelete();
        }}
        title={
          panel.deleteTarget ? `Delete "${panel.deleteTarget.title}"?` : ""
        }
        description={describeDelete(panel.deleteTarget)}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
      />
    </div>
  );
}
