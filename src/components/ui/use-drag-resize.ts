import { useCallback, useEffect, useRef } from "react";

// A pointer-driven horizontal resize splitter. `onMouseDown` arms dragging on
// the handle; window-level move/up listeners report the cursor's x while held.
//
// Moves are coalesced to one `onResize` per animation frame (so a parent can
// drive a transient width without doing real work on every mousemove), and the
// final width is reported once through `onCommit` on release — the place to
// persist it. Global cursor/selection styles are always restored, including if
// the handle unmounts mid-drag.
export function useDragResize({
  onResize,
  onCommit,
}: {
  /** Live width (clientX) during the drag, at most once per frame. */
  onResize: (clientX: number) => void;
  /** Final width (clientX) on release; the place to persist. */
  onCommit?: (clientX: number) => void;
}) {
  const dragging = useRef(false);
  const moved = useRef(false);
  const lastX = useRef(0);
  const frame = useRef(0);

  // Latest callbacks held in refs so the window listeners can stay attached once
  // (and so an inline closure from the caller never re-binds them).
  const onResizeRef = useRef(onResize);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    moved.current = false;
    lastX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const flush = () => {
      frame.current = 0;
      if (dragging.current) onResizeRef.current(lastX.current);
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      moved.current = true;
      lastX.current = e.clientX;
      if (!frame.current) frame.current = requestAnimationFrame(flush);
    };
    const stop = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Only commit a real drag, never a bare click on the handle.
      if (moved.current) onCommitRef.current?.(lastX.current);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
      // The handle can unmount mid-drag (e.g. the sidebar collapses); make sure
      // the global cursor/selection overrides don't leak past it.
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  return { onMouseDown };
}
