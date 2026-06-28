import { useCallback, useEffect, useRef } from "react";

// A pointer-driven horizontal resize splitter. The returned `onMouseDown` arms
// dragging on the handle; window-level move/up listeners report the cursor's x
// while held and clean up the global cursor/selection styles on release.
export function useDragResize({
  onResize,
}: {
  onResize: (clientX: number) => void;
}) {
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) onResize(e.clientX);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onResize]);

  return { onMouseDown };
}
