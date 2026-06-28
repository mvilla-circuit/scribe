import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";

import { EditorIconButton } from "./editor-icon-button";

function renderButton(onClick = vi.fn()) {
  render(
    <TooltipProvider>
      <EditorIconButton label="Remove" onClick={onClick}>
        <svg data-testid="glyph" />
      </EditorIconButton>
    </TooltipProvider>,
  );
  return { onClick };
}

describe("EditorIconButton", () => {
  it("labels the button and the bordered block-control class", () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Remove" });
    expect(button).toHaveClass("scribe-block-btn");
    expect(screen.getByTestId("glyph")).toBeInTheDocument();
  });

  it("invokes onClick when clicked", async () => {
    const { onClick } = renderButton();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("prevents the mousedown default so the editor selection survives", () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Remove" });
    // fireEvent returns false when a handler called preventDefault.
    const notCancelled = fireEvent.mouseDown(button);
    expect(notCancelled).toBe(false);
  });
});
