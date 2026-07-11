import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  moveItems,
  removeItems,
  resizeItem,
  setFrameTitle,
  setItemText,
  setStickyColor,
  setZOrder,
  type WhiteboardScene,
} from "@/lib/whiteboard-scene";

import { WhiteboardCanvas } from "./whiteboard-canvas";

function scene(items: WhiteboardScene["items"]): WhiteboardScene {
  return { version: 1, camera: { x: 0, y: 0, zoom: 1 }, items };
}

function sticky(
  id: string,
  overrides: Partial<
    Extract<WhiteboardScene["items"][number], { type: "sticky" }>
  > = {},
) {
  return {
    id,
    type: "sticky" as const,
    x: 10,
    y: 20,
    w: 180,
    h: 180,
    z: 1,
    text: "",
    color: "yellow" as const,
    ...overrides,
  };
}

// A controlled harness that owns scene state and applies the canvas's edit
// callbacks through the real scene helpers, so the tests exercise the canvas +
// scene model together rather than mocking the mutations away.
function Harness({ initial }: { initial: WhiteboardScene }) {
  const [current, setCurrent] = useState(initial);
  return (
    <WhiteboardCanvas
      scene={current}
      onMoveItems={(ids, offset) => {
        setCurrent((s) => moveItems(s, ids, offset));
      }}
      onResizeItem={(id, size) => {
        setCurrent((s) => resizeItem(s, id, size));
      }}
      onRemoveItems={(ids) => {
        setCurrent((s) => removeItems(s, ids));
      }}
      onSetItemText={(id, text) => {
        setCurrent((s) => setItemText(s, id, text));
      }}
      onSetFrameTitle={(id, title) => {
        setCurrent((s) => setFrameTitle(s, id, title));
      }}
      onSetStickyColor={(id, color) => {
        setCurrent((s) => setStickyColor(s, id, color));
      }}
      onSetZOrder={(id, z) => {
        setCurrent((s) => setZOrder(s, id, z));
      }}
      onCameraChange={(camera) => {
        setCurrent((s) => ({ ...s, camera }));
      }}
    />
  );
}

function UndoHarness({ initial }: { initial: WhiteboardScene }) {
  const [current, setCurrent] = useState(initial);
  const previous = useRef(initial);
  return (
    <WhiteboardCanvas
      scene={current}
      onMoveItems={vi.fn()}
      onResizeItem={vi.fn()}
      onRemoveItems={(ids) => {
        previous.current = current;
        setCurrent(removeItems(current, ids));
      }}
      onSetItemText={vi.fn()}
      onSetFrameTitle={vi.fn()}
      onSetStickyColor={vi.fn()}
      onSetZOrder={vi.fn()}
      onCameraChange={vi.fn()}
      onUndo={() => {
        setCurrent(previous.current);
      }}
    />
  );
}

function item(id: string): HTMLElement {
  return screen.getByTestId(`whiteboard-item-${id}`);
}

describe("WhiteboardCanvas", () => {
  it("dragging a sticky updates its x/y", () => {
    render(<Harness initial={scene([sticky("s1", { x: 10, y: 20 })])} />);

    fireEvent.pointerDown(item("s1"), {
      clientX: 50,
      clientY: 50,
      button: 0,
    });
    fireEvent.pointerMove(window, { clientX: 90, clientY: 110 });
    fireEvent.pointerUp(window, { clientX: 90, clientY: 110 });

    expect(item("s1").style.left).toBe("50px");
    expect(item("s1").style.top).toBe("80px");
  });

  it("shift-click selects two and a group drag moves both", () => {
    render(
      <Harness
        initial={scene([
          sticky("s1", { x: 10, y: 20 }),
          sticky("s2", { x: 300, y: 40 }),
        ])}
      />,
    );

    // Select the first, then shift-click the second to add it to the selection.
    fireEvent.pointerDown(item("s1"), { clientX: 20, clientY: 30, button: 0 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 30 });
    fireEvent.pointerDown(item("s2"), {
      clientX: 310,
      clientY: 50,
      button: 0,
      shiftKey: true,
    });
    fireEvent.pointerUp(window, { clientX: 310, clientY: 50 });

    // Drag the (already-selected) group by pressing on one of its members.
    fireEvent.pointerDown(item("s2"), { clientX: 310, clientY: 50, button: 0 });
    fireEvent.pointerMove(window, { clientX: 335, clientY: 60 });
    fireEvent.pointerUp(window, { clientX: 335, clientY: 60 });

    expect(item("s1").style.left).toBe("35px");
    expect(item("s1").style.top).toBe("30px");
    expect(item("s2").style.left).toBe("325px");
    expect(item("s2").style.top).toBe("50px");
  });

  it("Delete removes the selected items", () => {
    render(
      <Harness initial={scene([sticky("s1"), sticky("s2", { x: 300 })])} />,
    );

    fireEvent.pointerDown(item("s1"), { clientX: 20, clientY: 30, button: 0 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 30 });

    screen.getByTestId("whiteboard-canvas").focus();
    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.queryByTestId("whiteboard-item-s1")).toBeNull();
    expect(screen.getByTestId("whiteboard-item-s2")).toBeInTheDocument();
  });

  it("Delete outside the focused canvas leaves selected items intact", () => {
    render(
      <>
        <button type="button">Outside</button>
        <Harness initial={scene([sticky("s1")])} />
      </>,
    );

    fireEvent.pointerDown(item("s1"), { clientX: 20, clientY: 30, button: 0 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 30 });
    screen.getByRole("button", { name: "Outside" }).focus();
    fireEvent.keyDown(window, { key: "Delete" });

    expect(item("s1")).toBeInTheDocument();
  });

  it("Cmd+Z invokes undo while the canvas contains focus", () => {
    render(<UndoHarness initial={scene([sticky("s1")])} />);
    const canvas = screen.getByTestId("whiteboard-canvas");

    fireEvent.pointerDown(item("s1"), { clientX: 20, clientY: 30, button: 0 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 30 });
    canvas.focus();
    fireEvent.keyDown(window, { key: "Delete" });
    expect(screen.queryByTestId("whiteboard-item-s1")).toBeNull();

    fireEvent.keyDown(window, { key: "z", metaKey: true });

    expect(item("s1")).toBeInTheDocument();
  });

  it("clicking the empty canvas clears the selection", () => {
    render(<Harness initial={scene([sticky("s1")])} />);

    fireEvent.pointerDown(item("s1"), { clientX: 20, clientY: 30, button: 0 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 30 });

    // Press on empty canvas, then Delete should now be a no-op.
    fireEvent.pointerDown(screen.getByTestId("whiteboard-canvas"), {
      clientX: 600,
      clientY: 600,
      button: 0,
    });
    fireEvent.pointerUp(window, { clientX: 600, clientY: 600 });
    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.getByTestId("whiteboard-item-s1")).toBeInTheDocument();
  });
});
