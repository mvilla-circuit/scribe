import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useUIStore } from "../../store/ui";
import { usePageIndex, type PageIndexEntry } from "../../data/pageIndex";
import { useBooks } from "../../data/books";
import { DocumentIcon } from "../../components/ui/DocumentIcon";
import { Tooltip } from "../../components/ui/Tooltip";
import {
  BookIcon,
  CopyIcon,
  ExternalLinkIcon,
  PageLinkIcon,
  TrashIcon,
} from "../icons";
import { pageRef, type PageTargetType } from "./PageLink";

// Live-resolving internal page card. It reads the current title/icon and the
// owning book + ancestor path from the page index on every render, so a rename
// elsewhere flows straight through. Clicking navigates in-app via the UI store
// rather than opening a browser.
export function PageLinkView({
  node,
  editor,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const targetType = (node.attrs.targetType as PageTargetType) ?? "document";
  const targetId = node.attrs.targetId as string | null;
  const staleLabel = (node.attrs.label as string | null) ?? null;
  const editable = editor.isEditable;

  const { data: index = [], isLoading: indexLoading } = usePageIndex();
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const loading = indexLoading || booksLoading;

  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);

  const resolved = useMemo(() => {
    if (!targetId) return null;
    if (targetType === "book") {
      const book = books.find((b) => b.id === targetId);
      if (!book) return null;
      return {
        title: book.title || "Untitled book",
        icon: book.icon,
        fallbackGlyph: "book" as const,
        breadcrumb: "Book",
        bookId: book.id,
        docId: null as string | null,
      };
    }
    const entry = index.find((e) => e.id === targetId);
    if (!entry) return null;
    const book = books.find((b) => b.id === entry.book_id);
    const byId = new Map(index.map((e) => [e.id, e]));
    const trail: string[] = [];
    let parentId = entry.parent_document_id;
    const guard = new Set<string>();
    while (parentId && !guard.has(parentId)) {
      guard.add(parentId);
      const parent: PageIndexEntry | undefined = byId.get(parentId);
      if (!parent || parent.is_title_page) break;
      trail.unshift(parent.title || "Untitled");
      parentId = parent.parent_document_id;
    }
    const breadcrumb = [book?.title || "Untitled book", ...trail].join(" / ");
    return {
      title: entry.is_title_page
        ? book?.title || entry.title || "Untitled"
        : entry.title || "Untitled",
      icon: entry.icon,
      fallbackGlyph: "page" as const,
      breadcrumb,
      bookId: entry.book_id,
      docId: entry.is_title_page ? null : entry.id,
    };
  }, [index, books, targetId, targetType]);

  // Keep the stale `label` fallback in step with the live title (used for export
  // and as the placeholder before the index loads), without it being canonical.
  useEffect(() => {
    if (resolved && resolved.title && resolved.title !== staleLabel) {
      updateAttributes({ label: resolved.title });
    }
  }, [resolved, staleLabel, updateAttributes]);

  const navigate = () => {
    if (!resolved) return;
    setActiveBook(resolved.bookId);
    setActiveDoc(resolved.docId);
  };

  const copyRef = () => {
    if (!targetId) return;
    void navigator.clipboard.writeText(pageRef(targetType, targetId));
    toast("Page link copied");
  };

  const notFound = !loading && !resolved;

  return (
    <NodeViewWrapper
      className="scribe-pagelink group/pagelink"
      data-not-found={notFound || undefined}
    >
      <div
        role="link"
        tabIndex={0}
        onClick={navigate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate();
          }
        }}
        className="scribe-pagelink-body"
      >
        <span className="scribe-pagelink-icon" aria-hidden>
          {notFound ? (
            <PageLinkIcon size={16} />
          ) : resolved?.icon ? (
            <DocumentIcon icon={resolved.icon} size={18} />
          ) : resolved?.fallbackGlyph === "book" ? (
            <BookIcon size={16} />
          ) : (
            <PageLinkIcon size={16} />
          )}
        </span>
        <span className="scribe-pagelink-text">
          <span className="scribe-pagelink-title">
            {notFound
              ? "Page not found"
              : (resolved?.title ?? staleLabel ?? "Untitled page")}
          </span>
          {!notFound && resolved?.breadcrumb && (
            <span className="scribe-pagelink-crumb">{resolved.breadcrumb}</span>
          )}
        </span>
      </div>

      {editable && (
        <div className="scribe-block-controls scribe-pagelink-controls">
          {!notFound && (
            <>
              <Ctrl label="Open page" onClick={navigate}>
                <ExternalLinkIcon size={14} />
              </Ctrl>
              <Ctrl label="Copy page link" onClick={copyRef}>
                <CopyIcon size={14} />
              </Ctrl>
            </>
          )}
          <Ctrl label="Remove" onClick={() => deleteNode()}>
            <TrashIcon size={14} />
          </Ctrl>
        </div>
      )}
    </NodeViewWrapper>
  );
}

function Ctrl({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="scribe-block-btn"
      >
        {children}
      </button>
    </Tooltip>
  );
}
