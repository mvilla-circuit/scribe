import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { DocumentIcon } from "@/components/ui/document-icon";
import { useEditorBridge } from "@/editor/editor-bridge";
import { EditorIconButton } from "@/editor/editor-icon-button";
import {
  BookIcon,
  CopyIcon,
  ExternalLinkIcon,
  PageLinkIcon,
  TrashIcon,
} from "@/editor/icons";
import { SKIP_AUTOSAVE_META } from "@/editor/use-autosave";

import { pageRef, type PageTargetType } from "./page-ref";

// Live-resolving internal page card. It reads the current title/icon and the
// owning book + ancestor path from the page index on every render, so a rename
// elsewhere flows straight through. Clicking navigates in-app via the UI store
// rather than opening a browser.
export function PageLinkView({
  node,
  editor,
  getPos,
  deleteNode,
}: NodeViewProps) {
  const targetType = (node.attrs.targetType as PageTargetType) ?? "document";
  const targetId = node.attrs.targetId as string | null;
  const staleLabel = (node.attrs.label as string | null) ?? null;
  const editable = editor.isEditable;

  const { resolvePageTarget, navigateToPage, loading } = useEditorBridge();

  const resolved = useMemo(
    () => resolvePageTarget(targetType, targetId),
    [resolvePageTarget, targetType, targetId],
  );

  // Keep the stale `label` fallback in step with the live title (used for export
  // and as the placeholder before the index loads), without it being canonical.
  // This is a programmatic refresh, not a user edit, so write it through a
  // transaction that is excluded from undo history AND flagged so autosave
  // ignores it — otherwise merely opening a document with page links whose
  // targets were renamed elsewhere would trigger a save (and pollute undo) with
  // no user input. Only the editable instance owns the canonical label.
  useEffect(() => {
    if (!editor.isEditable) return;
    if (!resolved?.title || resolved.title === staleLabel) return;
    const pos = getPos();
    if (typeof pos !== "number") return;
    const { view } = editor;
    view.dispatch(
      view.state.tr
        .setNodeAttribute(pos, "label", resolved.title)
        .setMeta("addToHistory", false)
        .setMeta(SKIP_AUTOSAVE_META, true),
    );
  }, [resolved, staleLabel, editor, getPos]);

  const navigate = () => {
    if (!resolved) return;
    navigateToPage({ bookId: resolved.bookId, docId: resolved.docId });
  };

  const copyRef = () => {
    if (!targetId) return;
    void navigator.clipboard.writeText(pageRef(targetType, targetId));
    toast.success("Page link copied");
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
              <EditorIconButton label="Open page" onClick={navigate}>
                <ExternalLinkIcon size={14} />
              </EditorIconButton>
              <EditorIconButton label="Copy page link" onClick={copyRef}>
                <CopyIcon size={14} />
              </EditorIconButton>
            </>
          )}
          <EditorIconButton
            label="Remove"
            onClick={() => {
              deleteNode();
            }}
          >
            <TrashIcon size={14} />
          </EditorIconButton>
        </div>
      )}
    </NodeViewWrapper>
  );
}
