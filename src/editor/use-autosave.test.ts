import { act, renderHook } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutosave } from "./use-autosave";

// `useAutosave` only touches the editor through its event interface
// (`on`/`off`) plus `getJSON()`. A real mounted Tiptap view can't be created
// under jsdom (no layout; plugins probe element coordinates), so we drive the
// hook through a minimal editor-shaped emitter — the same stand-in approach
// outline.test.ts uses.
type Listener = (props?: unknown) => void;

function makeFakeEditor(json: unknown = { type: "doc" }) {
  const listeners: Record<string, Listener[]> = {};
  return {
    on(event: string, fn: Listener) {
      (listeners[event] ??= []).push(fn);
    },
    off(event: string, fn: Listener) {
      listeners[event] = (listeners[event] ?? []).filter((h) => h !== fn);
    },
    emit(event: string, props?: unknown) {
      for (const fn of listeners[event] ?? []) fn(props);
    },
    getJSON: () => json,
  };
}

function asEditor(fake: ReturnType<typeof makeFakeEditor>): Editor {
  // eslint-disable-next-line no-restricted-syntax -- intentional test stand-in: useAutosave reads only on/off/getJSON, and a real mounted Editor can't be created under jsdom (see outline.test.ts).
  return fake as unknown as Editor;
}

/** A ProseMirror-transaction-shaped event payload exposing just `getMeta`. */
function update(meta: Record<string, unknown> = {}) {
  return { transaction: { getMeta: (key: string) => meta[key] } };
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists a normal edit after the debounce window", () => {
    const onPersist = vi.fn();
    const editor = makeFakeEditor();
    renderHook(() => useAutosave(asEditor(editor), onPersist, 700));

    act(() => {
      editor.emit("update", update());
    });
    expect(onPersist).not.toHaveBeenCalled(); // still debouncing

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onPersist).toHaveBeenCalledTimes(1);
    expect(onPersist).toHaveBeenCalledWith({ type: "doc" });
  });

  it("ignores transactions tagged skipAutosave (no persist, no churn)", () => {
    const onPersist = vi.fn();
    const editor = makeFakeEditor();
    renderHook(() => useAutosave(asEditor(editor), onPersist, 700));

    // A programmatic, non-user transaction (e.g. a page-link refreshing its
    // cached label on open) must NOT trigger a save.
    act(() => {
      editor.emit("update", update({ skipAutosave: true }));
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(onPersist).not.toHaveBeenCalled();
  });
});
