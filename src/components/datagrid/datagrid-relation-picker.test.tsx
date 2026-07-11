import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DatagridRelationRef } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { RelationField } from "./datagrid-relation-picker";
import type { RelationTargets } from "./datagrid-relations";

function makeTargets(over: Partial<RelationTargets> = {}): RelationTargets {
  return {
    options: [
      {
        ref: { type: "datagrid_row", id: "row-1" },
        label: "Neighbor row",
        subtitle: "Row",
      },
      {
        ref: { type: "book", id: "book-1" },
        label: "A Book",
        subtitle: "Book",
      },
    ],
    resolveLabel: (ref: DatagridRelationRef) =>
      ref.id === "row-1"
        ? "Neighbor row"
        : ref.id === "book-1"
          ? "A Book"
          : ref.id,
    navigate: vi.fn(),
    ...over,
  };
}

describe("RelationField", () => {
  it("renders a chip for each stored reference", () => {
    renderWithProviders(
      <RelationField
        fieldName="Related"
        value={[{ type: "datagrid_row", id: "row-1" }]}
        targets={makeTargets()}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Neighbor row")).toBeInTheDocument();
  });

  it("navigates when a stored chip is clicked", () => {
    const targets = makeTargets();
    renderWithProviders(
      <RelationField
        fieldName="Related"
        value={[{ type: "datagrid_row", id: "row-1" }]}
        targets={targets}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Open Neighbor row/ }));
    expect(targets.navigate).toHaveBeenCalledWith({
      type: "datagrid_row",
      id: "row-1",
    });
  });

  it("adds a reference chosen from the picker", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RelationField
        fieldName="Related"
        value={[]}
        targets={makeTargets()}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Related/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /A Book/ }));
    expect(onChange).toHaveBeenCalledWith([{ type: "book", id: "book-1" }]);
  });

  it("lists same-collection targets first in the picker", () => {
    renderWithProviders(
      <RelationField
        fieldName="Related"
        value={[]}
        targets={makeTargets()}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Related/ }));
    const dialog = screen.getByRole("dialog");
    const options = within(dialog).getAllByRole("button");
    expect(options[0]).toHaveTextContent("Neighbor row");
  });

  it("removes a stored reference", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RelationField
        fieldName="Related"
        value={[
          { type: "datagrid_row", id: "row-1" },
          { type: "book", id: "book-1" },
        ]}
        targets={makeTargets()}
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Remove Neighbor row/ }),
    );
    expect(onChange).toHaveBeenCalledWith([{ type: "book", id: "book-1" }]);
  });
});
