import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DatagridField } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { CellValue } from "./datagrid-cell";

function field(over: Partial<DatagridField>): DatagridField {
  return { id: "f1", name: "Field", type: "text", config: {}, ...over };
}

describe("CellValue", () => {
  it("renders a select value as its option chip, not the raw id", () => {
    const f = field({
      type: "select",
      config: { options: [{ id: "opt-1", name: "Active", color: "sky" }] },
    });
    renderWithProviders(<CellValue field={f} value="opt-1" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("opt-1")).toBeNull();
  });

  it("renders each selected id of a multi_select", () => {
    const f = field({
      type: "multi_select",
      config: {
        options: [
          { id: "a", name: "One", color: "moss" },
          { id: "b", name: "Two", color: "clay" },
        ],
      },
    });
    renderWithProviders(<CellValue field={f} value={["a", "b"]} />);
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("renders a checked checkbox marker only when true", () => {
    const f = field({ type: "checkbox" });
    const { rerender } = renderWithProviders(
      <CellValue field={f} value={true} />,
    );
    expect(screen.getByLabelText("Checked")).toBeInTheDocument();
    rerender(<CellValue field={f} value={false} />);
    expect(screen.queryByLabelText("Checked")).toBeNull();
  });

  it("renders a url as a link", () => {
    const f = field({ type: "url" });
    renderWithProviders(<CellValue field={f} value="https://x.test" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://x.test");
  });

  it("renders unsafe url schemes as plain text, not links", () => {
    const f = field({ type: "url" });
    renderWithProviders(<CellValue field={f} value="javascript:alert(1)" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
  });

  it("resolves a relation chip's title via resolveLabel, not a raw id", () => {
    const f = field({ type: "relation" });
    renderWithProviders(
      <CellValue
        field={f}
        value={[{ type: "book", id: "11111111-2222-3333-4444-555555555555" }]}
        resolveLabel={() => "My Book"}
      />,
    );
    expect(screen.getByText("My Book")).toBeInTheDocument();
    expect(screen.queryByText("11111111")).toBeNull();
  });

  it("falls back to a truncated id when no resolveLabel is given", () => {
    const f = field({ type: "relation" });
    renderWithProviders(
      <CellValue
        field={f}
        value={[{ type: "book", id: "11111111-2222-3333-4444-555555555555" }]}
      />,
    );
    expect(screen.getByText("11111111")).toBeInTheDocument();
  });
});
