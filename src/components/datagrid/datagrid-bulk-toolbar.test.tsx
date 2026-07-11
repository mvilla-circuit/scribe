import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DatagridField } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridBulkToolbar } from "./datagrid-bulk-toolbar";

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const fields: DatagridField[] = [
  {
    id: "stage",
    name: "Stage",
    type: "select",
    config: { options: [{ id: "o1", name: "Doing", color: "sky" }] },
  },
];

describe("DatagridBulkToolbar", () => {
  it("renders nothing when the selection is empty", () => {
    const { container } = renderWithProviders(
      <DatagridBulkToolbar count={0} onClear={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count and fires delete", () => {
    const onDelete = vi.fn();
    renderWithProviders(
      <DatagridBulkToolbar count={3} onClear={vi.fn()} onDelete={onDelete} />,
    );
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("fires clear", () => {
    const onClear = vi.fn();
    renderWithProviders(
      <DatagridBulkToolbar count={2} onClear={onClear} onDelete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("hides the Edit affordance when no editable fields are given", () => {
    renderWithProviders(
      <DatagridBulkToolbar count={2} onClear={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  it("applies a picked field value across the selection", async () => {
    const user = userEvent.setup();
    const onApplyField = vi.fn();
    renderWithProviders(
      <DatagridBulkToolbar
        count={2}
        onClear={vi.fn()}
        onDelete={vi.fn()}
        fields={fields}
        onApplyField={onApplyField}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(await screen.findByRole("menuitem", { name: "Stage" }));
    fireEvent.change(screen.getByLabelText("Stage"), {
      target: { value: "o1" },
    });
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApplyField).toHaveBeenCalledWith("stage", "o1");
  });
});
