import { useMemo } from "react";

import { CollapsedRailButton } from "@/components/sidebar/collapsed-rail-button";
import {
  AlertIcon,
  BookIcon,
  WhiteboardIcon,
} from "@/components/sidebar/icons";
import { SIDEBAR_ICON_SIZE } from "@/components/sidebar/sidebar-row";
import { DocumentIcon } from "@/components/ui/document-icon";
import { buildBookOutlineTree } from "@/data/book-outline-tree";
import type { Book } from "@/data/books";
import { documentAncestors } from "@/data/doc-tree";
import { useDocuments } from "@/data/documents";
import { useWhiteboards } from "@/data/whiteboards";
import { useUIStore } from "@/store/ui";

import { PageIcon } from "./icons";

/**
 * The collapsed sidebar's in-book view: an icon-only rail with the pinned Title
 * Page on top, followed by the book's top-level outline nodes (pages and
 * whiteboards) in shared position order. A page with nested pages or
 * whiteboards shows a small indicator and, when clicked, navigates and opens
 * the full sidebar with that page expanded so its subtree is reachable; a
 * childless page just navigates in place.
 */
export function CollapsedOutlineRail({ book }: { book: Book }) {
  const documentsQuery = useDocuments(book.id);
  const documents = useMemo(
    () => documentsQuery.data ?? [],
    [documentsQuery.data],
  );
  const titlePage = documents.find((d) => d.is_title_page) ?? null;
  const whiteboardsQuery = useWhiteboards();
  const bookWhiteboards = useMemo(
    () =>
      (whiteboardsQuery.data ?? []).filter(
        (whiteboard) => whiteboard.book_id === book.id,
      ),
    [book.id, whiteboardsQuery.data],
  );

  const activeDocId = useUIStore((s) => s.activeDocId);
  const activeWhiteboardId = useUIStore((s) => s.activeWhiteboardId);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const setDocExpanded = useUIStore((s) => s.setDocExpanded);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const navigateTo = useUIStore((s) => s.navigateTo);

  const topLevel = useMemo(
    () => buildBookOutlineTree(documents, bookWhiteboards),
    [bookWhiteboards, documents],
  );

  // A nested page has no row of its own, so highlight its top-level ancestor
  // (the root of its ancestor chain) — falling back to the page itself when it
  // is already top-level — so the active context always has a visible anchor.
  // Nested whiteboards highlight their parent page's top-level ancestor.
  const selectedTopLevelId = useMemo(() => {
    if (activeWhiteboardId) {
      const board = bookWhiteboards.find(
        (whiteboard) => whiteboard.id === activeWhiteboardId,
      );
      if (!board) return null;
      if (board.parent_document_id === null) return board.id;
      const parent = documents.find(
        (document) => document.id === board.parent_document_id,
      );
      if (!parent || parent.is_title_page) return null;
      const ancestors = documentAncestors(documents, parent);
      return ancestors[0]?.id ?? parent.id;
    }
    const activeDoc = documents.find((d) => d.id === activeDocId);
    if (!activeDoc || activeDoc.is_title_page) return null;
    const ancestors = documentAncestors(documents, activeDoc);
    return ancestors[0]?.id ?? activeDoc.id;
  }, [activeDocId, activeWhiteboardId, bookWhiteboards, documents]);

  const titlePageSelected =
    activeWhiteboardId === null &&
    (activeDocId === null || activeDocId === titlePage?.id);

  // Mirror the library rail: the narrow rail can't host a retry card, so a
  // failed load shows a single warning affordance that re-opens the sidebar
  // where the expanded panel surfaces the real error.
  if (documentsQuery.isError) {
    return (
      <div className="flex flex-col gap-1.5">
        <CollapsedRailButton
          label="Couldn't load pages"
          onClick={() => {
            setSidebarCollapsed(false);
          }}
        >
          <span className="text-danger">
            <AlertIcon size={SIDEBAR_ICON_SIZE} />
          </span>
        </CollapsedRailButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <CollapsedRailButton
        label={book.title || "Untitled"}
        selected={titlePageSelected}
        onClick={() => {
          setActiveDoc(titlePage?.id ?? null);
        }}
      >
        {book.icon ? (
          <DocumentIcon icon={book.icon} size={SIDEBAR_ICON_SIZE} />
        ) : (
          <BookIcon size={SIDEBAR_ICON_SIZE} />
        )}
      </CollapsedRailButton>

      {topLevel.map((node) => {
        if (node.kind === "whiteboard") {
          return (
            <CollapsedRailButton
              key={node.id}
              label={node.whiteboard.name || "Untitled"}
              selected={node.id === activeWhiteboardId}
              onClick={() => {
                navigateTo({ bookId: book.id, whiteboardId: node.id });
              }}
            >
              <WhiteboardIcon size={SIDEBAR_ICON_SIZE} />
            </CollapsedRailButton>
          );
        }

        const hasChildren = node.children.length > 0;
        return (
          <CollapsedRailButton
            key={node.id}
            label={node.document.title || "Untitled"}
            selected={node.id === selectedTopLevelId}
            indicator={hasChildren}
            onClick={() => {
              setActiveDoc(node.id);
              if (hasChildren) {
                setDocExpanded(node.id, true);
                setSidebarCollapsed(false);
              }
            }}
          >
            {node.document.icon ? (
              <DocumentIcon
                icon={node.document.icon}
                size={SIDEBAR_ICON_SIZE}
              />
            ) : (
              <PageIcon size={SIDEBAR_ICON_SIZE} />
            )}
          </CollapsedRailButton>
        );
      })}
    </div>
  );
}
