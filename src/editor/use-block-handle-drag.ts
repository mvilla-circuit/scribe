import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { type RefObject, useCallback, useEffect, useRef } from "react";

import type { BlockTarget } from "./block-handle-target";

/**
 * The drag wiring for the block handle: the `onElementDragStart` /
 * `onElementDragEnd` callbacks handed to <DragHandle>. <DragHandle>
 * re-registers its ProseMirror plugin whenever these change identity, and that
 * reconfigure recreates *all* plugin views — including the drop cursor, whose
 * destroy() leaks its DOM element. Keeping the callbacks stable is what stops
 * the placement line from being orphaned (lingering ~5s). It also clears the
 * dragged block's highlight on end and pins the drag to a NodeSelection of the
 * source so ProseMirror deletes the exact node instead of leaving a duplicate.
 */
export function useBlockHandleDrag({
  editor,
  targetRef,
  open,
  onCloseMenu,
}: {
  editor: Editor;
  targetRef: RefObject<BlockTarget | null>;
  open: boolean;
  onCloseMenu: () => void;
}) {
  // The DOM element of the block currently being dragged, held so its drag
  // highlight can be cleared on drag end even if the hover target has moved on.
  const draggingEl = useRef<HTMLElement | null>(null);

  // Keep `open` readable from the stable drag callbacks without making it a
  // dependency (which would change their identity and churn plugin
  // registration). Synced in an effect rather than during render so the ref
  // write happens after commit; the only reader (drag start) fires on a later
  // user interaction.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const onElementDragStart = useCallback(() => {
    if (openRef.current) onCloseMenu();
    const pos = targetRef.current?.pos;
    if (pos != null) {
      const dom = editor.view.nodeDOM(pos);
      if (dom instanceof HTMLElement) {
        dom.classList.add("scribe-block-dragging");
        draggingEl.current = dom;
      }
    }
    // The drag-handle extension sets `view.dragging` with a NodeRange selection
    // and no `node`, so ProseMirror's drop handler removes the source via
    // `tr.deleteSelection()`. The DOM `selectionchange` fired mid-drag can
    // collapse that selection into a TextSelection, making the deletion a no-op
    // and leaving a duplicate. Pin the drag to a NodeSelection of the source
    // block (runs in a microtask, after the extension populates `view.dragging`)
    // so PM uses `node.replace`, which deletes the exact node selection-free.
    queueMicrotask(() => {
      if (editor.isDestroyed || pos == null) return;
      const dragging = editor.view.dragging as {
        node?: NodeSelection;
        slice?: { content: { firstChild: PMNode | null } };
      } | null;
      if (!dragging || dragging.node) return;
      const node = editor.state.doc.nodeAt(pos);
      const sliceFirst = dragging.slice?.content?.firstChild ?? null;
      if (!node || node.type !== sliceFirst?.type) return;
      try {
        dragging.node = NodeSelection.create(editor.state.doc, pos);
      } catch {
        /* pos no longer selectable; leave PM's default behavior */
      }
    });
  }, [editor, targetRef, onCloseMenu]);

  const onElementDragEnd = useCallback(() => {
    draggingEl.current?.classList.remove("scribe-block-dragging");
    draggingEl.current = null;
    // The drop cursor only schedules its fast removal on a `dragend` delivered
    // to the editor DOM. This drag starts from the handle (outside that DOM),
    // so synthesize one to clear the indicator immediately instead of waiting
    // for the plugin's ~5s fallback.
    editor.view.dom.dispatchEvent(new DragEvent("dragend"));
  }, [editor]);

  return { onElementDragStart, onElementDragEnd };
}
