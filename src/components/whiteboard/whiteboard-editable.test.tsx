import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CanvasText } from "./whiteboard-editable";

describe("CanvasText", () => {
  it("reverts and does not commit on Escape", () => {
    const onCommit = vi.fn();
    const onStopEditing = vi.fn();

    render(
      <CanvasText
        value="saved"
        editing
        onCommit={onCommit}
        onStopEditing={onStopEditing}
        ariaLabel="Note text"
      />,
    );

    const field = screen.getByLabelText("Note text");
    fireEvent.change(field, { target: { value: "draft edit" } });
    fireEvent.keyDown(field, { key: "Escape" });

    expect(onCommit).not.toHaveBeenCalled();
    expect(onStopEditing).toHaveBeenCalledTimes(1);
    expect(field).toHaveValue("saved");
  });

  it("commits a blank value when the note is cleared entirely", () => {
    const onCommit = vi.fn();
    const onStopEditing = vi.fn();

    render(
      <CanvasText
        value="saved"
        editing
        onCommit={onCommit}
        onStopEditing={onStopEditing}
        ariaLabel="Note text"
      />,
    );

    const field = screen.getByLabelText("Note text");
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);

    expect(onCommit).toHaveBeenCalledWith("");
  });

  it("trims surrounding whitespace on commit", () => {
    const onCommit = vi.fn();
    const onStopEditing = vi.fn();

    render(
      <CanvasText
        value="saved"
        editing
        onCommit={onCommit}
        onStopEditing={onStopEditing}
        ariaLabel="Note text"
      />,
    );

    const field = screen.getByLabelText("Note text");
    fireEvent.change(field, { target: { value: "  padded text  " } });
    fireEvent.blur(field);

    expect(onCommit).toHaveBeenCalledWith("padded text");
  });

  it("does not commit an unchanged value on blur", () => {
    const onCommit = vi.fn();
    const onStopEditing = vi.fn();

    render(
      <CanvasText
        value="saved"
        editing
        onCommit={onCommit}
        onStopEditing={onStopEditing}
        ariaLabel="Note text"
      />,
    );

    fireEvent.blur(screen.getByLabelText("Note text"));

    expect(onCommit).not.toHaveBeenCalled();
    expect(onStopEditing).toHaveBeenCalledTimes(1);
  });
});
