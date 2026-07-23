import { renderHook } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useTableAnchor } from "./use-table-anchor";

type Listener = () => void;

/** Minimal TipTap-like stub: view proxy throws on nodeDOM until mount. */
function makeUnmountedEditor() {
  const listeners = new Map<string, Set<Listener>>();
  let mounted = false;
  const nodeDOM = vi.fn(() => document.createElement("table"));

  const editor = {
    isDestroyed: false,
    get view() {
      if (mounted) {
        return { dom: document.createElement("div"), nodeDOM };
      }
      return new Proxy(
        { editable: true, state: {} },
        {
          get(target, key) {
            if (key in target) return Reflect.get(target, key);
            throw new Error(
              `[tiptap error]: The editor view is not available. Cannot access view['${String(key)}']. The editor may not be mounted yet.`,
            );
          },
        },
      );
    },
    on(event: string, fn: Listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(fn);
      listeners.set(event, set);
    },
    off(event: string, fn: Listener) {
      listeners.get(event)?.delete(fn);
    },
    emit(event: string) {
      for (const fn of listeners.get(event) ?? []) fn();
    },
    mount() {
      mounted = true;
      this.emit("mount");
    },
  };

  return {
    // eslint-disable-next-line no-restricted-syntax -- intentional TipTap stand-in: exercises pre-mount view proxy without mounting EditorContent under jsdom
    editor: editor as unknown as Editor,
    nodeDOM,
    mount: () => {
      editor.mount();
    },
  };
}

describe("useTableAnchor", () => {
  it("does not throw when the editor view is not mounted yet", () => {
    const { editor, nodeDOM } = makeUnmountedEditor();
    const floating = document.createElement("div");
    document.body.append(floating);
    const floatingRef = createRef<HTMLDivElement>();
    // RefObject from createRef is mutable in practice for tests.
    (floatingRef as { current: HTMLDivElement | null }).current = floating;

    expect(() => {
      renderHook(() => {
        useTableAnchor(editor, floatingRef, {
          tablePos: 0,
          cellPos: 1,
          visible: true,
        });
      });
    }).not.toThrow();
    expect(nodeDOM).not.toHaveBeenCalled();
  });

  it("attaches once the editor emits mount", () => {
    const { editor, nodeDOM, mount } = makeUnmountedEditor();
    const floating = document.createElement("div");
    document.body.append(floating);
    const floatingRef = createRef<HTMLDivElement>();
    (floatingRef as { current: HTMLDivElement | null }).current = floating;

    renderHook(() => {
      useTableAnchor(editor, floatingRef, {
        tablePos: 0,
        cellPos: -1,
        visible: true,
      });
    });
    expect(nodeDOM).not.toHaveBeenCalled();

    mount();
    expect(nodeDOM).toHaveBeenCalledWith(0);
  });
});
