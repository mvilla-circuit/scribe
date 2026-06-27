import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useUIStore } from "../../store/ui";
import type { Book } from "../../data/books";
import {
  buildDocumentDuplicate,
  collectDocumentSubtree,
  useCreateDocument,
  useDeleteDocument,
  useDocuments,
  useDuplicateDocument,
  useMoveDocument,
  useRenameDocument,
} from "../../data/documents";
import { buildDocTree, descendantCount } from "../../data/docTree";
import { getPositionBetween } from "../../data/ordering";
import {
  docNeighbourPositions,
  flattenDocTree,
  getDocProjection,
  removeDocDescendants,
  type FlatDocNode,
} from "./outlineDnd";
import { useTreeDnd } from "../tree/useTreeDnd";
import { TreeSkeleton } from "../sidebar/TreeSkeleton";
import { OutlineDragOverlay, OutlineRow } from "./OutlineRow";
import { PlusIcon } from "./icons";
import { BookIcon } from "../sidebar/icons";
import {
  SIDEBAR_ICON_SIZE,
  SIDEBAR_ROW_GAP,
  sidebarRowPadding,
} from "../sidebar/SidebarRow";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DocumentIcon } from "../ui/DocumentIcon";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";

type DeleteTarget = { id: string; title: string; descendants: number };

// The in-book navigation that replaces the Library tree inside the main sidebar
// while a book is open: a pinned Title Page, the nested document hierarchy with
// CRUD + drag reorder/nest, and a cascade-aware delete confirm.
export function OutlinePanel({ book }: { book: Book }) {
  const documentsQuery = useDocuments(book.id);
  const documents = useMemo(
    () => documentsQuery.data ?? [],
    [documentsQuery.data]
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const expanded = useMemo(() => new Set(expandedArr), [expandedArr]);
  const tree = useMemo(() => buildDocTree(documents), [documents]);
  const flattened = useMemo(
    () => flattenDocTree(tree, expanded),
    [tree, expanded]
  );

  const { sensors, visibleNodes, activeNode, projectionDepthFor, handlers } =
    useTreeDnd<FlatDocNode>({
      flattened,
      removeDescendants: removeDocDescendants,
      project: getDocProjection,
      neighbours: docNeighbourPositions,
      onDragStart: () => setEditingId(null),
      onMove: ({ id, parentId, position }) => {
        moveDocument.mutate({
          id,
          parent_document_id: parentId,
          position,
        });
        if (parentId) setDocExpanded(parentId, true);
      },
    });

  const endPosition = (parentId: string | null) => {
    const siblings = documents
      .filter((d) => !d.is_title_page && d.parent_document_id === parentId)
      .sort((a, b) => a.position - b.position);
    const last = siblings[siblings.length - 1];
    return getPositionBetween(last?.position, undefined);
  };

  const handleCreate = (parentId: string | null) => {
    const id = crypto.randomUUID();
    if (parentId) setDocExpanded(parentId, true);
    createDocument.mutate({
      id,
      title: "Untitled",
      parent_document_id: parentId,
      position: endPosition(parentId),
    });
    setActiveDoc(id);
    setEditingId(id);
  };

  const handleDuplicate = (node: FlatDocNode) => {
    const plan = buildDocumentDuplicate(documents, node.id);
    if (!plan) return;
    duplicateDocument.mutate({ rows: plan.rows });
    setActiveDoc(plan.rootId);
  };

  const commitRename = (node: FlatDocNode, value: string) => {
    setEditingId(null);
    renameDocument.mutate({ id: node.id, title: value });
  };

  const requestDelete = (node: FlatDocNode) => {
    setDeleteTarget({
      id: node.id,
      title: node.document.title || "Untitled",
      descendants: descendantCount(documents, node.id),
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const subtree = collectDocumentSubtree(documents, deleteTarget.id);
    if (activeDocId && subtree.has(activeDocId)) setActiveDoc(null);
    deleteDocument.mutate({ id: deleteTarget.id });
  };

  const titlePageSelected =
    activeDocId === null || activeDocId === titlePage?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Pinned Title Page + section toolbar stay fixed above the scroll. */}
      <div className="px-2 pt-1">
        <button
          type="button"
          onClick={() => setActiveDoc(titlePage?.id ?? null)}
          aria-current={titlePageSelected ? "page" : undefined}
          style={{ paddingLeft: sidebarRowPadding(0) }}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md pr-1 text-left text-sm outline-none",
            "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            titlePageSelected
              ? "bg-selected font-medium text-text"
              : "text-text hover:bg-hover"
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
          <Tooltip content="New page">
            <button
              type="button"
              onClick={() => handleCreate(null)}
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
            onClick={() => handleCreate(null)}
            style={{ paddingLeft: sidebarRowPadding(0) }}
            className="flex h-9 w-full items-center gap-2 rounded-md pr-1 text-left text-sm text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <PlusIcon size={SIDEBAR_ICON_SIZE} className="opacity-70" />
            </span>
            Add your first page
          </button>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            {...handlers}
          >
            <SortableContext
              items={visibleNodes.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                role="tree"
                aria-label="Document outline"
                className={cn("flex flex-col", SIDEBAR_ROW_GAP)}
              >
                {visibleNodes.map((node) => (
                  <OutlineRow
                    key={node.id}
                    node={node}
                    selected={node.id === activeDocId}
                    editing={editingId === node.id}
                    expanded={expanded.has(node.id)}
                    projectionDepth={projectionDepthFor(node.id)}
                    onToggleExpand={() => toggleDocExpanded(node.id)}
                    onSelect={() => setActiveDoc(node.id)}
                    onStartRename={() => setEditingId(node.id)}
                    onCommitRename={(value) => commitRename(node, value)}
                    onCancelRename={() => setEditingId(null)}
                    onDelete={() => requestDelete(node)}
                    onDuplicate={() => handleDuplicate(node)}
                    onNewChild={() => handleCreate(node.id)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeNode ? <OutlineDragOverlay node={activeNode} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteTarget ? `Delete "${deleteTarget.title}"?` : ""}
        description={describeDelete(deleteTarget?.descendants ?? 0)}
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
