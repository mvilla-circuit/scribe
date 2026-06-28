import { getMarkRange } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

// How long the popover lingers after the pointer leaves the link or card, so
// the user can travel the short gap between the link and its hover card without
// it closing out from under them.
const CLOSE_DELAY_MS = 120;

/** The inline link currently under the pointer, with its mark range and a live
 * rect getter for anchoring a popover beside it. */
export interface HoveredLink {
  href: string;
  /** ProseMirror range of the full link mark (for editing/removing). */
  from: number;
  to: number;
  /** Live bounding rect of the link's DOM, for popover anchoring. */
  getRect: () => DOMRect | null;
}

/** Tracks the inline link under the pointer on the editor surface, exposing it
 * (with its mark range and a live rect) so a host can render an anchored link
 * popover. Keeps the popover open across a short link<->card hover bridge and
 * clears it on mouse-leave. */
export function useLinkHover(editor: Editor): {
  hovered: HoveredLink | null;
  /** Call when the pointer enters the popover card (keeps it open). */
  onCardEnter: () => void;
  /** Call when the pointer leaves the popover card (schedules a close). */
  onCardLeave: () => void;
  /** Imperatively clear the hovered link (e.g. after edit/remove). */
  clear: () => void;
} {
  const [hovered, setHovered] = useState<HoveredLink | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAnchor = useRef<HTMLAnchorElement | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    cancelClose();
    activeAnchor.current = null;
    setHovered(null);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      activeAnchor.current = null;
      setHovered(null);
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  const onCardEnter = useCallback(() => {
    cancelClose();
  }, [cancelClose]);

  const onCardLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  useEffect(() => {
    if (editor.isDestroyed) return;
    const dom = editor.view.dom;

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (editor.isDestroyed) return;

      cancelClose();
      if (anchor === activeAnchor.current) return;

      const linkType = editor.schema.marks.link;
      if (!linkType) return;
      const pos = editor.view.posAtDOM(anchor, 0);
      if (pos < 0) return;
      const $pos = editor.state.doc.resolve(pos);
      const range = getMarkRange($pos, linkType);
      if (!range) return;

      const href = anchor.getAttribute("href");
      if (href === null) return;

      activeAnchor.current = anchor;
      setHovered({
        href,
        from: range.from,
        to: range.to,
        getRect: () => anchor.getBoundingClientRect(),
      });
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (!activeAnchor.current) return;
      const related =
        event.relatedTarget instanceof Node ? event.relatedTarget : null;
      // Still inside the same link (e.g. moving onto a child node) — keep open.
      if (related && activeAnchor.current.contains(related)) return;
      scheduleClose();
    };

    dom.addEventListener("mouseover", handleMouseOver);
    dom.addEventListener("mouseout", handleMouseOut);

    return () => {
      dom.removeEventListener("mouseover", handleMouseOver);
      dom.removeEventListener("mouseout", handleMouseOut);
      cancelClose();
    };
  }, [editor, cancelClose, scheduleClose]);

  return { hovered, onCardEnter, onCardLeave, clear };
}
