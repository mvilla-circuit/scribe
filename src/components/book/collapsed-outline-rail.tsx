import { useMemo } from "react";

import { CollapsedRailButton } from "@/components/sidebar/collapsed-rail-button";
import {
  AlertIcon,
  BookIcon,
  WhiteboardIcon,
} from "@/components/sidebar/icons";
import { SIDEBAR_ICON_SIZE } from "@/components/sidebar/sidebar-row";
import { DocumentIcon } from "@/components/ui/document-icon";
import type { Book } from "@/data/books";
import { buildDocTree, documentAncestors } from "@/data/doc-tree";
import { useDocuments } from "@/data/documents";
import { useWhiteboards } from "@/data/whiteboards";
import { useUIStore } from "@/store/ui";

import { PageIcon } from "./icons";

/**
 * The collapsed sidebar's in-book view: an icon-only rail with the pinned Title
 * Page on top, followed by the book's top-level pages only. A page with
 * subpages shows a small indicator and, when clicked, navigates and opens the
 * full sidebar with that page expanded so its subtree is reachable; a childless
 * page just navigates in place.
 */
export function CollapsedOutlineRail({ book }: { book: Book }) {
  const documentsQuery = useDocuments(book.id);
  const documents = useMemo(
    () => documentsQuery.data ?? [],
    [documentsQuery.data],
  );
  const titlePage = documents.find((d) => d.is_title_page) ?? null;
  const whiteboardsQuery = useWhiteboards();
  const whiteboards = (whiteboardsQuery.data ?? []).filter(
    (whiteboard) =>
      whiteboard.book_id === book.id && whiteboard.parent_document_id === null,
  );

  const activeDocId = useUIStore((s) => s.activeDocId);
  const activeWhiteboardId = useUIStore((s) => s.activeWhiteboardId);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);
  const setDocExpanded = useUIStore((s) => s.setDocExpanded);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const navigateTo = useUIStore((s) => s.navigateTo);

  // Top-level pages only; subpages are revealed in the expanded sidebar.
  const topLevel = useMemo(() => buildDocTree(documents), [documents]);

  // A nested page has no row of its own, so highlight its top-level ancestor
  // (the root of its ancestor chain) — falling back to the page itself when it
  // is already top-level — so the active context always has a visible anchor.
  const selectedTopLevelId = useMemo(() => {
    const activeDoc = documents.find((d) => d.id === activeDocId);
    if (!activeDoc || activeDoc.is_title_page) return null;
    const ancestors = documentAncestors(documents, activeDoc);
    return ancestors[0]?.id ?? activeDoc.id;
  }, [documents, activeDocId]);

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

      {topLevel.map(({ document, children }) => {
        const hasChildren = children.length > 0;
        return (
          <CollapsedRailButton
            key={document.id}
            label={document.title || "Untitled"}
            selected={document.id === selectedTopLevelId}
            indicator={hasChildren}
            onClick={() => {
              setActiveDoc(document.id);
              if (hasChildren) {
                setDocExpanded(document.id, true);
                setSidebarCollapsed(false);
              }
            }}
          >
            {document.icon ? (
              <DocumentIcon icon={document.icon} size={SIDEBAR_ICON_SIZE} />
            ) : (
              <PageIcon size={SIDEBAR_ICON_SIZE} />
            )}
          </CollapsedRailButton>
        );
      })}
      {whiteboards.map((whiteboard) => (
        <CollapsedRailButton
          key={whiteboard.id}
          label={whiteboard.name || "Untitled"}
          selected={activeWhiteboardId === whiteboard.id}
          onClick={() => {
            navigateTo({ bookId: book.id, whiteboardId: whiteboard.id });
          }}
        >
          <WhiteboardIcon size={SIDEBAR_ICON_SIZE} />
        </CollapsedRailButton>
      ))}
    </div>
  );
}
