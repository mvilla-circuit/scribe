import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useMemo } from "react";

import { BlockControls } from "@/editor/block-controls";
import { CardSurface } from "@/editor/card-surface";
import { useEditorBridge } from "@/editor/editor-bridge";
import { EditorIconButton } from "@/editor/editor-icon-button";
import { ExternalLinkIcon, PageLinkIcon, TrashIcon } from "@/editor/icons";
import { SKIP_AUTOSAVE_META } from "@/editor/use-autosave";

/**
 * Live-resolving datagrid-row embed. Reads cover/title/field previews from the
 * EditorBridge so the NodeView stays free of `@/data`. Click navigates to the
 * source row; missing targets degrade to a calm not-found card.
 */
export function DatagridRowCardView({
  node,
  editor,
  getPos,
  deleteNode,
}: NodeViewProps) {
  const datagridId = (node.attrs.datagridId as string | null) ?? null;
  const rowId = (node.attrs.rowId as string | null) ?? null;
  const staleLabel = (node.attrs.label as string | null) ?? null;
  const editable = editor.isEditable;

  const { resolveDatagridRow, navigateToDatagridRow, loading } =
    useEditorBridge();

  const resolved = useMemo(
    () => resolveDatagridRow(datagridId, rowId),
    [resolveDatagridRow, datagridId, rowId],
  );

  // Keep the stale `label` fallback in step with the live title (export /
  // loading placeholder) without making it canonical. Same undo/autosave
  // exclusion as pageLink.
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
    if (!resolved || !datagridId || !rowId) return;
    navigateToDatagridRow({ datagridId, rowId });
  };

  const notFound = !loading && !resolved;

  return (
    <NodeViewWrapper
      className="scribe-dgrowcard group/dgrowcard"
      data-not-found={notFound || undefined}
    >
      <CardSurface
        className="scribe-dgrowcard-body"
        onActivate={notFound ? () => undefined : navigate}
      >
        <div
          className="scribe-dgrowcard-media"
          data-testid="dgrowcard-media"
          aria-hidden
        >
          {resolved?.coverUrl ? (
            <img
              src={resolved.coverUrl}
              alt=""
              data-testid="dgrowcard-cover"
              className="scribe-dgrowcard-cover"
            />
          ) : (
            <span className="scribe-dgrowcard-fallback">
              {notFound ? <PageLinkIcon size={18} /> : (resolved?.icon ?? "▦")}
            </span>
          )}
        </div>
        <div className="scribe-dgrowcard-text">
          <span className="scribe-dgrowcard-title">
            {notFound
              ? "Card not found"
              : (resolved?.title ?? staleLabel ?? "Untitled")}
          </span>
          {!notFound && resolved?.datagridName && (
            <span className="scribe-dgrowcard-crumb">
              {resolved.datagridName}
            </span>
          )}
          {!notFound && resolved && resolved.fieldsPreview.length > 0 && (
            <div className="scribe-dgrowcard-fields">
              {resolved.fieldsPreview.map((line) => (
                <div key={line.fieldId} className="scribe-dgrowcard-field">
                  {line.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardSurface>

      {editable && (
        <BlockControls className="scribe-dgrowcard-controls">
          {!notFound && (
            <EditorIconButton label="Open card" onClick={navigate}>
              <ExternalLinkIcon size={14} />
            </EditorIconButton>
          )}
          <EditorIconButton
            label="Remove"
            onClick={() => {
              deleteNode();
            }}
          >
            <TrashIcon size={14} />
          </EditorIconButton>
        </BlockControls>
      )}
    </NodeViewWrapper>
  );
}
