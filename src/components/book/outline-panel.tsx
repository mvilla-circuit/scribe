import { useCallback, useMemo } from "react";

import { BookIcon } from "@/components/sidebar/icons";
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
import { Tooltip } from "@/components/ui/tooltip";
import type { Book } from "@/data/books";
import { buildDocTree, descendantCount } from "@/data/doc-tree";
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
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

import { PlusIcon } from "./icons";
import {
  type FlatDocNode,
  flattenDocTree,
  getDocProjection,
} from "./outline-dnd";
import { OutlineDragOverlay, OutlineRow } from "./outline-row";

interface DeleteTarget {
  id: string;
  title: string;
  descendants: number;
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

  const expandedArr = useUIStore((s) => s.expandedDocIds);
  const toggleDocExpanded = useUIStore((s) => s.toggleDocExpanded);
  const setDocExpanded = useUIStore((s) => s.setDocExpanded);
  const activeDocId = useUIStore((s) => s.activeDocId);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);

  const createDocument = useCreateDocument(book.id);
  const duplicateDocument = useDuplicateDocument(book.id);
  const renameDocument = useRenameDocument(book.id);
  const moveDocument = useMoveDocument(book.id);
  const deleteDocument = useDeleteDocument(book.id);

  const panel = useTreePanel<DeleteTarget>();
  // Pull out the stable members (react-query's `mutate`, the panel's
  // `useCallback`s) so the memoized row callbacks below can depend on them
  // without listing the whole per-render mutation/panel objects — which would
  // rebuild the callbacks every render and defeat the row memoization.
  const { mutate: createDocumentMutate } = createDocument;
  const { mutate: duplicateDocumentMutate } = duplicateDocument;
  const { mutate: renameDocumentMutate } = renameDocument;
  const { startRename, cancelRename, requestDelete } = panel;

  const expanded = useMemo(() => new Set(expandedArr), [expandedArr]);
  const tree = useMemo(() => buildDocTree(documents), [documents]);
  const flattened = useMemo(
    () => flattenDocTree(tree, expanded),
    [tree, expanded],
  );

  const { sensors, visibleNodes, activeNode, projectionDepthFor, handlers } =
    useTreeDnd<FlatDocNode>({
      flattened,
      removeDescendants,
      project: getDocProjection,
      neighbours: neighbourPositions,
      onDragStart: () => {
        cancelRename();
      },
      onMove: ({ id, parentId, position }) => {
        moveDocument.mutate({
          id,
          parent_document_id: parentId,
          position,
        });
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
          documents.filter(
            (d) => !d.is_title_page && d.parent_document_id === parentId,
          ),
        ),
      });
      setActiveDoc(id);
      startRename(id);
    },
    [
      setDocExpanded,
      createDocumentMutate,
      documents,
      setActiveDoc,
      startRename,
    ],
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
    (node: FlatDocNode, value: string) => {
      cancelRename();
      renameDocumentMutate({ id: node.id, title: value });
    },
    [cancelRename, renameDocumentMutate],
  );

  const onDelete = useCallback(
    (node: FlatDocNode) => {
      requestDelete({
        id: node.id,
        title: node.document.title || "Untitled",
        descendants: descendantCount(documents, node.id),
      });
    },
    [requestDelete, documents],
  );

  const confirmDelete = () => {
    const target = panel.deleteTarget;
    if (!target) return;
    const subtree = collectDocumentSubtree(documents, target.id);
    if (activeDocId && subtree.has(activeDocId)) setActiveDoc(null);
    deleteDocument.mutate({ id: target.id });
  };

  const titlePageSelected =
    activeDocId === null || activeDocId === titlePage?.id;

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
          <Tooltip content="New page" side="right">
            <button
              type="button"
              onClick={() => {
                handleCreate(null);
              }}
              aria-label="New page"
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-text"
            >
              <PlusIcon size={16} />
            </button>
          </Tooltip>
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
                selected={node.id === activeDocId}
                editing={panel.editingId === node.id}
                expanded={expanded.has(node.id)}
                projectionDepth={projectionDepthFor(node.id)}
                onToggleExpand={toggleDocExpanded}
                onSelect={setActiveDoc}
                onStartRename={startRename}
                onCommitRename={onCommitRename}
                onCancelRename={cancelRename}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onNewChild={handleCreate}
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
        description={describeDelete(panel.deleteTarget?.descendants ?? 0)}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function describeDelete(descendants: number): string {
  if (descendants === 0) return "This permanently deletes the page.";
  return `This permanently deletes the page and its ${descendants} nested page${
    descendants === 1 ? "" : "s"
  }.`;
}
