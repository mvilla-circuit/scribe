import { renderHook } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { describe, expect, it, vi } from "vitest";

import { useTableState } from "./use-table-state";

vi.mock("@tiptap/react", async () => {
  const actual =
    await vi.importActual<typeof import("@tiptap/react")>("@tiptap/react");
  return {
    ...actual,
    useEditorState: ({
      editor,
      selector,
    }: {
      editor: Editor;
      selector: (ctx: { editor: Editor }) => unknown;
    }) => selector({ editor }),
  };
});

function makeEditor({
  isDestroyed,
  can,
}: {
  isDestroyed: boolean;
  can: ReturnType<typeof vi.fn>;
}): Editor {
  // Minimal table shape so the selector reaches the can() probes when alive.
  const tableCell = {
    type: { name: "tableCell" },
    attrs: { verticalAlign: null, background: null },
  };
  const row = {
    childCount: 1,
    firstChild: tableCell,
    forEach: (cb: (cell: typeof tableCell) => void) => {
      cb(tableCell);
    },
  };
  const table = {
    type: { name: "table" },
    attrs: { color: null, rowBorders: true, colBorders: true },
    childCount: 1,
    firstChild: row,
    forEach: (cb: (r: typeof row) => void) => {
      cb(row);
    },
  };
  const $from = {
    depth: 2,
    node: (d: number) => (d === 2 ? table : tableCell),
    before: (d: number) => (d === 2 ? 0 : 1),
  };

  const fake = {
    isDestroyed,
    extensionManager: isDestroyed ? null : {},
    state: { selection: { $from } },
    can,
    isActive: vi.fn(() => false),
  };
  // eslint-disable-next-line no-restricted-syntax -- intentional TipTap stand-in: selector only reads isDestroyed/extensionManager/state/can/isActive
  return fake as unknown as Editor;
}

describe("useTableState", () => {
  it("skips can() when the editor is destroyed", () => {
    const can = vi.fn(() => ({
      mergeCells: () => true,
      splitCell: () => true,
    }));
    const editor = makeEditor({ isDestroyed: true, can });

    const { result } = renderHook(() => useTableState(editor));

    expect(can).not.toHaveBeenCalled();
    expect(result.current.tablePos).toBe(-1);
  });

  it("probes can() when the caret is in a live table", () => {
    const can = vi.fn(() => ({
      mergeCells: () => true,
      splitCell: () => false,
    }));
    const editor = makeEditor({ isDestroyed: false, can });

    const { result } = renderHook(() => useTableState(editor));

    expect(can).toHaveBeenCalled();
    expect(result.current.canMerge).toBe(true);
    expect(result.current.canSplit).toBe(false);
    expect(result.current.tablePos).toBe(0);
  });
});
