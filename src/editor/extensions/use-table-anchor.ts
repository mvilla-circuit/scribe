import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { type RefObject, useEffect } from "react";

interface TableAnchor {
  tablePos: number;
  cellPos: number;
  visible: boolean;
}

/**
 * Position the floating table controls with Floating UI, tracking scroll,
 * resize, and column drags via autoUpdate. The menu anchors above the *selected
 * cell* so it stays reachable in tables taller than the viewport (otherwise,
 * pinned to the table's top, it would scroll out of reach). A virtual reference
 * keeps the horizontal placement pinned to the table (top-end, so the menu
 * doesn't jump around as the caret moves between columns) while borrowing the
 * cell's vertical band; flip() drops it below the cell when there's no room
 * above. Falls back to the table's own rect before a cell is resolved.
 */
/** True when TipTap has a real EditorView (not the pre-mount proxy). */
function hasMountedView(editor: Editor): boolean {
  // TipTap's `view` getter returns a Proxy until mount; `nodeDOM`/`dom` are
  // missing on that stub and throw if read via the proxy's `get` trap. The `in`
  // check uses the target object and stays safe.
  return !editor.isDestroyed && "dom" in editor.view;
}

/**
 *
 */
export function useTableAnchor(
  editor: Editor,
  floatingRef: RefObject<HTMLDivElement | null>,
  { tablePos, cellPos, visible }: TableAnchor,
) {
  useEffect(() => {
    const floating = floatingRef.current;
    if (!visible || !floating || editor.isDestroyed) return;

    let cleanupAutoUpdate: (() => void) | undefined;

    const detach = () => {
      cleanupAutoUpdate?.();
      cleanupAutoUpdate = undefined;
    };

    const attach = () => {
      detach();
      if (!hasMountedView(editor)) return;
      const tableDom = editor.view.nodeDOM(tablePos);
      const tableEl =
        tableDom instanceof HTMLElement
          ? (tableDom.querySelector("table") ?? tableDom)
          : null;
      if (!tableEl) return;
      const cellDom = cellPos >= 0 ? editor.view.nodeDOM(cellPos) : null;
      const cellEl = cellDom instanceof HTMLElement ? cellDom : null;
      const anchorEl = cellEl ?? tableEl;
      const reference = {
        contextElement: anchorEl,
        getBoundingClientRect() {
          const t = tableEl.getBoundingClientRect();
          const c = anchorEl.getBoundingClientRect();
          return {
            x: t.x,
            y: c.y,
            width: t.width,
            height: c.height,
            top: c.top,
            right: t.right,
            bottom: c.bottom,
            left: t.left,
          };
        },
      };
      const update = () => {
        void computePosition(reference, floating, {
          strategy: "fixed",
          placement: "top-end",
          middleware: [offset(6), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          floating.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        });
      };
      cleanupAutoUpdate = autoUpdate(reference, floating, update);
    };

    // TableControls can mount (and run this effect) before EditorContent mounts
    // the view — especially inside a Radix Dialog's concurrent presence cycle.
    // Attach when ready, and again on TipTap's mount event.
    attach();
    editor.on("mount", attach);
    editor.on("unmount", detach);
    return () => {
      editor.off("mount", attach);
      editor.off("unmount", detach);
      detach();
    };
  }, [editor, floatingRef, tablePos, cellPos, visible]);
}
