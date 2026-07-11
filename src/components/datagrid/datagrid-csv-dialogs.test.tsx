import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DatagridCsvRow } from "@/lib/datagrid-csv";
import type { DatagridField } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import {
  DatagridExportDialog,
  DatagridImportDialog,
} from "./datagrid-csv-dialogs";

const fields: DatagridField[] = [
  { id: "f1", name: "Notes", type: "text", config: {} },
];

describe("DatagridExportDialog", () => {
  it("previews CSV with a Title header and the row data", () => {
    const rows: DatagridCsvRow[] = [
      {
        title: "First",
        properties: { f1: "hi" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    renderWithProviders(
      <DatagridExportDialog
        open
        onOpenChange={vi.fn()}
        name="grid"
        rows={rows}
        fields={fields}
      />,
    );
    const preview = screen.getByLabelText<HTMLTextAreaElement>("CSV preview");
    expect(preview.value).toContain("Title,Notes");
    expect(preview.value).toContain("First,hi");
  });
});

describe("DatagridImportDialog", () => {
  it("parses pasted CSV and imports the valid rows", () => {
    const onImport = vi.fn();
    renderWithProviders(
      <DatagridImportDialog
        open
        onOpenChange={vi.fn()}
        fields={fields}
        onImport={onImport}
      />,
    );
    fireEvent.change(screen.getByLabelText("CSV to import"), {
      target: { value: "Title,Notes\nAlpha,one\nBeta,two" },
    });
    expect(screen.getByText("2 rows ready to import.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("disables import with no parseable rows", () => {
    renderWithProviders(
      <DatagridImportDialog
        open
        onOpenChange={vi.fn()}
        fields={fields}
        onImport={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });
});
