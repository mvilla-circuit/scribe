import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDragResize } from "./use-drag-resize";

// Renders the handle a real caller would wire `onMouseDown` to, so drags are
// driven through actual DOM events rather than a hand-built React event.
function Handle({
  onResize,
  onCommit,
}: {
  onResize: (clientX: number) => void;
  onCommit?: (clientX: number) => void;
}) {
  const { onMouseDown } = useDragResize({ onResize, onCommit });
  return <button type="button" aria-label="Resize" onMouseDown={onMouseDown} />;
}

function fireWindow(type: string, clientX: number) {
  window.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
}

let pendingFrame: FrameRequestCallback | null = null;

beforeEach(() => {
  pendingFrame = null;
  // Capture the rAF callback instead of running it, so batching across
  // several moves in "one frame" is observable and controllable by the test.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    pendingFrame = cb;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    pendingFrame = null;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});

function flush() {
  const cb = pendingFrame;
  pendingFrame = null;
  cb?.(0);
}

describe("useDragResize", () => {
  it("coalesces several moves into a single onResize per frame", () => {
    const onResize = vi.fn();
    render(<Handle onResize={onResize} />);

    fireEvent.mouseDown(screen.getByRole("button", { name: "Resize" }), {
      clientX: 100,
    });
    fireWindow("mousemove", 120);
    fireWindow("mousemove", 140);
    fireWindow("mousemove", 160);
    expect(onResize).not.toHaveBeenCalled();

    flush();
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith(160);
  });

  it("commits once on release with the final clientX", () => {
    const onResize = vi.fn();
    const onCommit = vi.fn();
    render(<Handle onResize={onResize} onCommit={onCommit} />);

    fireEvent.mouseDown(screen.getByRole("button", { name: "Resize" }), {
      clientX: 100,
    });
    fireWindow("mousemove", 180);
    fireWindow("mouseup", 180);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(180);
  });

  it("does not commit a bare click without any movement", () => {
    const onResize = vi.fn();
    const onCommit = vi.fn();
    render(<Handle onResize={onResize} onCommit={onCommit} />);

    fireEvent.mouseDown(screen.getByRole("button", { name: "Resize" }), {
      clientX: 100,
    });
    fireWindow("mouseup", 100);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("sets a col-resize cursor while dragging and restores it on release", () => {
    const onResize = vi.fn();
    render(<Handle onResize={onResize} />);

    fireEvent.mouseDown(screen.getByRole("button", { name: "Resize" }), {
      clientX: 100,
    });
    expect(document.body.style.cursor).toBe("col-resize");

    fireWindow("mouseup", 100);
    expect(document.body.style.cursor).toBe("");
  });

  it("restores the cursor if the handle unmounts mid-drag", () => {
    const onResize = vi.fn();
    const { unmount } = render(<Handle onResize={onResize} />);

    fireEvent.mouseDown(screen.getByRole("button", { name: "Resize" }), {
      clientX: 100,
    });
    expect(document.body.style.cursor).toBe("col-resize");

    unmount();
    expect(document.body.style.cursor).toBe("");
  });
});
