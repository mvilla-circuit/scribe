import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DatagridQueryRow } from "@/lib/datagrid-query";
import type { DatagridField } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridTableView } from "./datagrid-table-view";

const fields: DatagridField[] = [
  { id: "f1", name: "Notes", type: "text", config: {} },
  {
    id: "f2",
    name: "Stage",
    type: "select",
    config: { options: [{ id: "o1", name: "Doing", color: "sky" }] },
  },
];

const rows: DatagridQueryRow[] = [
  {
    id: "r1",
    title: "First",
    properties: { f1: "hello", f2: "o1" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

function setup(over: Partial<Parameters<typeof DatagridTableView>[0]> = {}) {
  const props = {
    rows,
    fields,
    selectedIds: new Set<string>(),
    onToggleSelect: vi.fn(),
    onToggleSelectAll: vi.fn(),
    onOpenRow: vi.fn(),
    onCreateRow: vi.fn(),
    onCommitTitle: vi.fn(),
    onCommitCell: vi.fn(),
    ...over,
  };
  renderWithProviders(<DatagridTableView {...props} />);
  return props;
}

describe("DatagridTableView", () => {
  it("renders a column header per field and the row title", () => {
    setup();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Stage")).toBeInTheDocument();
    expect(screen.getByDisplayValue("First")).toBeInTheDocument();
  });

  it("creates a row from the ghost row", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "New row" }));
    expect(props.onCreateRow).toHaveBeenCalled();
  });

  it("commits an edited title on blur", () => {
    const props = setup();
    const input = screen.getByLabelText("Title for First");
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.blur(input);
    expect(props.onCommitTitle).toHaveBeenCalledWith("r1", "Renamed");
  });

  it("remounts the title input when the row title changes externally", () => {
    const { rerender } = renderWithProviders(
      <DatagridTableView
        rows={rows}
        fields={fields}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
        onCommitTitle={vi.fn()}
        onCommitCell={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Title for First");
    fireEvent.change(input, { target: { value: "draft" } });
    expect(input).toHaveValue("draft");

    rerender(
      <DatagridTableView
        rows={[{ ...rows[0]!, title: "From panel" }]}
        fields={fields}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
        onCommitTitle={vi.fn()}
        onCommitCell={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Title for From panel")).toHaveValue(
      "From panel",
    );
  });

  it("remounts a text cell when the property changes externally", () => {
    const { rerender } = renderWithProviders(
      <DatagridTableView
        rows={rows}
        fields={fields}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
        onCommitTitle={vi.fn()}
        onCommitCell={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Notes");
    fireEvent.change(input, { target: { value: "draft" } });
    expect(input).toHaveValue("draft");

    rerender(
      <DatagridTableView
        rows={[
          {
            ...rows[0]!,
            properties: { ...rows[0]!.properties, f1: "from-panel" },
          },
        ]}
        fields={fields}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
        onCommitTitle={vi.fn()}
        onCommitCell={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Notes")).toHaveValue("from-panel");
  });

  it("commits a select cell change with the option id", () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText("Stage"), {
      target: { value: "" },
    });
    expect(props.onCommitCell).toHaveBeenCalledWith("r1", "f2", null);
  });

  it("opens a row via its open button", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open First" }));
    expect(props.onOpenRow).toHaveBeenCalledWith("r1");
  });

  it("toggles a row selection checkbox", () => {
    const props = setup();
    fireEvent.click(screen.getByLabelText("Select First"));
    expect(props.onToggleSelect).toHaveBeenCalledWith("r1");
  });

  it("applies persisted column widths from the view config", () => {
    setup({ columnWidths: { title: 300, f1: 120 } });
    expect(
      screen.getByRole("columnheader", { name: /Title/ }).style.width,
    ).toBe("300px");
    expect(
      screen.getByRole("columnheader", { name: /Notes/ }).style.width,
    ).toBe("120px");
  });

  it("commits a new width when a column edge is dragged", () => {
    const onResizeColumn = vi.fn();
    setup({ onResizeColumn, columnWidths: { f1: 100 } });
    const handle = screen.getByRole("button", { name: "Resize Notes column" });
    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 160 });
    fireEvent.mouseUp(window, { clientX: 160 });
    expect(onResizeColumn).toHaveBeenCalledWith("f1", 160);
  });

  it("nudges a column width with the keyboard", () => {
    const onResizeColumn = vi.fn();
    setup({ onResizeColumn, columnWidths: { f1: 100 } });
    const handle = screen.getByRole("button", { name: "Resize Notes column" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onResizeColumn).toHaveBeenCalledWith("f1", 116);
  });

  it("freezes the title column and renders a scroll-edge fade", () => {
    setup();
    expect(
      screen.getByRole("columnheader", { name: /Title/ }).className,
    ).toContain("sticky");
    expect(screen.getByTestId("datagrid-scroll-fade")).toBeInTheDocument();
  });

  it("anchors the title resize handle on the column header edge", () => {
    setup();
    const header = screen.getByRole("columnheader", { name: /Title/ });
    const handle = screen.getByRole("button", {
      name: "Resize Title column",
    });
    // The handle must be a direct child of the th so absolute right-0 tracks the
    // column separator — not a content-sized wrapper inset by cell padding.
    // eslint-disable-next-line testing-library/no-node-access -- asserting handle parentage for the column-edge positioning contract
    expect(handle.parentElement).toBe(header);
    expect(header.className).toContain("relative");
  });

  it("washes a selected row in the selected token", () => {
    setup({ selectedIds: new Set(["r1"]) });
    const selectedRow = screen
      .getAllByRole("row")
      .find((r) => r.getAttribute("data-selected") === "true");
    expect(selectedRow).toBeDefined();
    expect(selectedRow?.className).toContain("bg-selected");
  });
});
