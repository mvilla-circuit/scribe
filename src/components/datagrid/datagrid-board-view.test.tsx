import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DatagridField, DatagridRelationRef } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridBoardView } from "./datagrid-board-view";
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

const relationField: DatagridField = {
  id: "f2",
  name: "Related",
  type: "relation",
  config: {},
};

const boardField: DatagridField = {
  id: "stage",
  name: "Stage",
  type: "status",
  config: {
    options: [
      { id: "todo", name: "To do", color: "stone" },
      { id: "done", name: "Done", color: "fern" },
    ],
  },
};

const rows: DatagridDisplayRow[] = [
  {
    id: "r1",
    title: "Task A",
    icon: null,
    cover_url: null,
    cover_position: 50,
    properties: { stage: "todo" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "r2",
    title: "Task B",
    icon: null,
    cover_url: null,
    cover_position: 50,
    properties: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

function baseProps(
  over: Partial<Parameters<typeof DatagridBoardView>[0]> = {},
) {
  return {
    rows,
    boardField,
    chipFields: [],
    onOpenRow: vi.fn(),
    onCreateRow: vi.fn(),
    onMoveCard: vi.fn(),
    onConfigureFields: vi.fn(),
    ...over,
  };
}

describe("DatagridBoardView", () => {
  it("renders a column per option plus a no-value column", () => {
    renderWithProviders(<DatagridBoardView {...baseProps()} />);
    expect(screen.getByRole("region", { name: "To do" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Done" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "No Stage" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Task A")).toBeInTheDocument();
    expect(screen.getByText("Task B")).toBeInTheDocument();
  });

  it("shows a CTA to add a group field when none is configured", () => {
    const onConfigureFields = vi.fn();
    renderWithProviders(
      <DatagridBoardView
        {...baseProps({ boardField: null, onConfigureFields })}
      />,
    );
    expect(screen.getByText("No group field yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add a group field" }));
    expect(onConfigureFields).toHaveBeenCalled();
  });

  it("moves a card to a column via drag and drop", () => {
    const onMoveCard = vi.fn();
    renderWithProviders(<DatagridBoardView {...baseProps({ onMoveCard })} />);
    const card = screen.getByText("Task A");
    fireEvent.dragStart(card);
    fireEvent.drop(screen.getByRole("region", { name: "Done" }));
    expect(onMoveCard).toHaveBeenCalledWith("r1", "done");
  });

  it("creates a card from the dashed tile", () => {
    const onCreateRow = vi.fn();
    renderWithProviders(<DatagridBoardView {...baseProps({ onCreateRow })} />);
    fireEvent.click(screen.getByRole("button", { name: "New card" }));
    expect(onCreateRow).toHaveBeenCalled();
  });

  it("resolves a relation chip's title via relationTargets, not a raw id", () => {
    const relationRows: DatagridDisplayRow[] = [
      {
        id: "r1",
        title: "Task A",
        icon: null,
        cover_url: null,
        cover_position: 50,
        properties: {
          stage: "todo",
          f2: [{ type: "datagrid_row", id: "row-1" }],
        },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    renderWithProviders(
      <DatagridBoardView
        {...baseProps({
          rows: relationRows,
          chipFields: [relationField],
          relationTargets: makeTargets(),
        })}
      />,
    );
    expect(screen.getByText("Neighbor row")).toBeInTheDocument();
    expect(screen.queryByText("row-1")).toBeNull();
  });
});
