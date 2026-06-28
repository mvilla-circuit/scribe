import { offset } from "@floating-ui/dom";
import type { Editor } from "@tiptap/react";
import { type RefObject, useMemo } from "react";

import type { BlockTarget } from "./block-handle-target";

/**
 * The floating-ui config that places the drag grip. It stays flush on the main
 * axis so the CSS hover bridge to the block edge holds, and vertically centers
 * the grip on the block's first text line — or on the block center for short,
 * lineless blocks like the divider. Memoized so its identity stays stable: a
 * changing config would churn the drag-handle plugin and recreate the
 * drop-cursor view. `targetRef` mirrors the block being positioned for, read for
 * its live DOM metrics at positioning time.
 */
export function useBlockHandlePosition(
  editor: Editor,
  targetRef: RefObject<BlockTarget | null>,
) {
  return useMemo(
    () => ({
      placement: "left-start" as const,
      middleware: [
        // floating-ui invokes this at positioning time (not during render), so
        // reading the live `targetRef.current` here is intentional and safe.
        // eslint-disable-next-line react-hooks/refs -- floating-ui invokes this at positioning time, not during render, so reading targetRef.current here is safe.
        offset(({ rects }) => {
          const t = targetRef.current;
          if (!t) return 0;
          const dom = editor.view.nodeDOM(t.pos);
          if (!(dom instanceof HTMLElement)) return 0;
          const cs = getComputedStyle(dom);
          let lineHeight = parseFloat(cs.lineHeight);
          if (!Number.isFinite(lineHeight)) {
            lineHeight = (parseFloat(cs.fontSize) || 16) * 1.2;
          }
          // First-line band: a real line height for textblocks; for lineless
          // blocks fall back to the block's own (possibly tiny) height.
          const band = t.node.type.isTextblock
            ? lineHeight
            : Math.min(rects.reference.height, lineHeight);
          const padTop = t.node.type.isTextblock
            ? parseFloat(cs.paddingTop) || 0
            : 0;
          // crossAxis (vertical for a left placement): shift the grip down so
          // its center meets the first line's center.
          return {
            mainAxis: 0,
            crossAxis: padTop + band / 2 - rects.floating.height / 2,
          };
        }),
      ],
    }),
    [editor, targetRef],
  );
}
