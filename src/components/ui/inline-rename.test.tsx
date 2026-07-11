import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InlineRename } from "./inline-rename";

describe("InlineRename", () => {
  it("keeps Space inside the field so row drag sensors do not see it", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const parentKeyDown = vi.fn();

    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- test harness for bubble isolation
      <div onKeyDown={parentKeyDown}>
        <InlineRename
          initialValue="Untitled"
          onCommit={onCommit}
          onCancel={onCancel}
        />
      </div>,
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "A Crown So Heavy");

    expect(input).toHaveValue("A Crown So Heavy");
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    // Every keydown (including spaces) must be stopped before it reaches the
    // sortable row — otherwise dnd-kit starts a drag and cancels the rename.
    expect(parentKeyDown).not.toHaveBeenCalled();
  });
});
