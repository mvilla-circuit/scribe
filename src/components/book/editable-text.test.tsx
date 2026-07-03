import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditableText } from "./editable-text";

interface FakeResizeEntry {
  contentRect: { width: number };
}
type ResizeCallback = (entries: FakeResizeEntry[]) => void;

// A controllable ResizeObserver: jsdom never lays out, so we drive the resize
// callback by hand and pretend the observed width changed. Overrides the no-op
// stub installed globally in the test setup.
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private readonly callback: ResizeCallback;
  constructor(callback: ResizeCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }
  observe() {
    // no-op: the initial fire is simulated via `trigger`.
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
  trigger(width: number) {
    this.callback([{ contentRect: { width } }]);
  }
}

// The height the textarea reports for its current content; jsdom returns 0, so
// we mock it and flip it to mimic the title needing an extra wrapped line.
let scrollHeightValue = 0;

beforeEach(() => {
  FakeResizeObserver.instances = [];
  scrollHeightValue = 40;
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  // Run rAF synchronously so a resize-driven remeasure is observable inline.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    // no-op
  });
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => scrollHeightValue,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLTextAreaElement.prototype, "scrollHeight");
});

function noop() {
  // commit handler the width tests don't exercise
}

describe("EditableText", () => {
  it("sizes to content height on mount", () => {
    scrollHeightValue = 40;
    render(<EditableText value="Hello" ariaLabel="Title" onCommit={noop} />);
    const el = screen.getByRole("textbox", { name: "Title" });
    expect(el).toHaveStyle({ height: "40px" });
  });

  it("remeasures height when its width changes", () => {
    scrollHeightValue = 40;
    render(
      <EditableText
        value="A long title that wraps"
        ariaLabel="Title"
        onCommit={noop}
      />,
    );
    const el = screen.getByRole("textbox", { name: "Title" });
    expect(el).toHaveStyle({ height: "40px" });

    // The column narrows (e.g. an outline mounts beside it): the same text now
    // needs a second line, so the observed width changes and height must follow.
    scrollHeightValue = 80;
    const observer = FakeResizeObserver.instances.at(-1);
    expect(observer).toBeDefined();
    observer?.trigger(300);

    expect(el).toHaveStyle({ height: "80px" });
    // Width change alone must not touch the text.
    expect(el).toHaveValue("A long title that wraps");
  });

  it("ignores resize callbacks that do not change width", () => {
    scrollHeightValue = 40;
    render(<EditableText value="Title" ariaLabel="Title" onCommit={noop} />);
    const el = screen.getByRole("textbox", { name: "Title" });
    const observer = FakeResizeObserver.instances.at(-1);

    observer?.trigger(300);
    // A repeat callback at the same width (as fires when we set height above)
    // must be a no-op, or the observer would loop on its own writes.
    scrollHeightValue = 80;
    observer?.trigger(300);

    expect(el).toHaveStyle({ height: "40px" });
  });
});
