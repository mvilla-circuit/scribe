import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DatagridField, DatagridRelationRef } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridGalleryView } from "./datagrid-gallery-view";
import type { RelationTargets } from "./datagrid-relations";
import type { DatagridDisplayRow } from "./datagrid-view-model";

function makeTargets(over: Partial<RelationTargets> = {}): RelationTargets {
  return {
    options: [],
    resolveLabel: (ref: DatagridRelationRef) =>
      ref.id === "row-1" ? "Neighbor row" : ref.id,
    navigate: vi.fn(),
    ...over,
  };
}

const fields: DatagridField[] = [
  {
    id: "f1",
    name: "Stage",
    type: "select",
    config: { options: [{ id: "o1", name: "Doing", color: "sky" }] },
  },
];

const relationField: DatagridField = {
  id: "f2",
  name: "Related",
  type: "relation",
  config: {},
};

const rows: DatagridDisplayRow[] = [
  {
    id: "r1",
    title: "Card one",
    icon: null,
    cover_url: null,
    properties: { f1: "o1" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("DatagridGalleryView", () => {
  it("renders a card per row with its property chips", () => {
    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
      />,
    );
    expect(screen.getByText("Card one")).toBeInTheDocument();
    expect(screen.getByText("Doing")).toBeInTheDocument();
  });

  it("renders rows as CoverCards with an album aspect", () => {
    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId("cover-card")).toHaveLength(1);
    expect(screen.getByTestId("cover-card-media")).toHaveClass("aspect-[4/3]");
  });

  it("opens a row when its card is clicked", () => {
    const onOpenRow = vi.fn();
    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={onOpenRow}
        onCreateRow={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Card one"));
    expect(onOpenRow).toHaveBeenCalledWith("r1");
  });

  it("creates a row from the ghost card", () => {
    const onCreateRow = vi.fn();
    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={vi.fn()}
        onCreateRow={onCreateRow}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "New row" }));
    expect(onCreateRow).toHaveBeenCalled();
  });

  it("resolves a relation chip's title via relationTargets, not a raw id", () => {
    const relationRows: DatagridDisplayRow[] = [
      {
        id: "r1",
        title: "Card one",
        icon: null,
        cover_url: null,
        properties: { f2: [{ type: "datagrid_row", id: "row-1" }] },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    renderWithProviders(
      <DatagridGalleryView
        rows={relationRows}
        fields={[relationField]}
        relationTargets={makeTargets()}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
      />,
    );
    expect(screen.getByText("Neighbor row")).toBeInTheDocument();
    expect(screen.queryByText("row-1")).toBeNull();
  });
});
