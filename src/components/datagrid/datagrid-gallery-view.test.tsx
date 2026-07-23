import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    cover_position: 50,
    properties: { f1: "o1" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("DatagridGalleryView", () => {
  it("exposes a Gallery region for assistive tech", () => {
    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
      />,
    );
    expect(screen.getByRole("region", { name: "Gallery" })).toBeInTheDocument();
  });

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

  it("creates a card from the ghost tile", () => {
    const onCreateRow = vi.fn();
    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={vi.fn()}
        onCreateRow={onCreateRow}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "New card" }));
    expect(onCreateRow).toHaveBeenCalled();
  });

  it("stretches the New card tile to the row height (not media aspect alone)", () => {
    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
      />,
    );
    const addTile = screen.getByRole("button", { name: "New card" });
    expect(addTile).toHaveClass("h-full");
    expect(addTile).not.toHaveClass("aspect-[4/3]");
    expect(screen.getByTestId("cover-card")).toHaveClass("h-full");
  });

  it("resolves a relation chip's title via relationTargets, not a raw id", () => {
    const relationRows: DatagridDisplayRow[] = [
      {
        id: "r1",
        title: "Card one",
        icon: null,
        cover_url: null,
        cover_position: 50,
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

  it("shows the cover image from row data", () => {
    const covered: DatagridDisplayRow[] = [
      {
        id: "r1",
        title: "Card one",
        icon: null,
        cover_url: "https://example.test/card.png",
        cover_position: 25,
        properties: { f1: "o1" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    renderWithProviders(
      <DatagridGalleryView
        rows={covered}
        fields={fields}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
      />,
    );

    const media = screen.getByTestId("cover-card-media");
    expect(media).toHaveAttribute("src", "https://example.test/card.png");
    expect(media).toHaveStyle("object-position: 50% 25%");
  });

  it("uploads a cover from the media overlay without opening the row", async () => {
    const user = userEvent.setup();
    const onOpenRow = vi.fn();
    const onUploadCover = vi
      .fn()
      .mockResolvedValue("https://example.test/new.png");
    const cover = new File(["cover"], "cover.png", { type: "image/png" });

    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={onOpenRow}
        onCreateRow={vi.fn()}
        onUploadCover={onUploadCover}
      />,
    );

    const overlay = screen.getByTestId("cover-card-media-overlay");
    const upload = screen.getByRole("button", { name: "Upload cover" });
    expect(overlay).toContainElement(upload);
    await user.click(upload);
    await user.upload(screen.getByLabelText("Choose cover image"), cover);

    expect(onUploadCover).toHaveBeenCalledWith("r1", cover);
    expect(onOpenRow).not.toHaveBeenCalled();
  });

  it("offers Delete in the card actions menu and reports the row id", async () => {
    const user = userEvent.setup();
    const onDeleteRow = vi.fn();

    renderWithProviders(
      <DatagridGalleryView
        rows={rows}
        fields={fields}
        onOpenRow={vi.fn()}
        onCreateRow={vi.fn()}
        onDeleteRow={onDeleteRow}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Actions for Card one" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDeleteRow).toHaveBeenCalledWith("r1");
  });
});
