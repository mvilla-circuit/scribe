import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DatagridField } from "@/lib/datagrid-schema";

import { DatagridFieldEditor } from "./datagrid-field-editor";

describe("DatagridFieldEditor", () => {
  it("does not commit an invalid number on blur", () => {
    const field: DatagridField = {
      id: "estimate",
      name: "Estimate",
      type: "number",
      config: {},
    };
    const onCommit = vi.fn();
    render(
      <DatagridFieldEditor field={field} value={12} onCommit={onCommit} />,
    );
    const input = screen.getByRole("spinbutton");
    Object.defineProperty(input, "value", {
      configurable: true,
      value: "1e999",
    });

    fireEvent.blur(input);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not commit an unchanged text value on blur", () => {
    const field: DatagridField = {
      id: "notes",
      name: "Notes",
      type: "text",
      config: {},
    };
    const onCommit = vi.fn();
    render(
      <DatagridFieldEditor field={field} value="hello" onCommit={onCommit} />,
    );
    fireEvent.blur(screen.getByRole("textbox", { name: "Notes" }));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("remounts when the value prop changes externally", () => {
    const field: DatagridField = {
      id: "notes",
      name: "Notes",
      type: "text",
      config: {},
    };
    const { rerender } = render(
      <DatagridFieldEditor field={field} value="hello" onCommit={vi.fn()} />,
    );
    const input = screen.getByRole("textbox", { name: "Notes" });
    fireEvent.change(input, { target: { value: "draft" } });
    expect(input).toHaveValue("draft");

    rerender(
      <DatagridFieldEditor
        field={field}
        value="from-table"
        onCommit={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue(
      "from-table",
    );
  });
});
