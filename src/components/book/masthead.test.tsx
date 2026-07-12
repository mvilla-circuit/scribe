import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { Masthead } from "./masthead";

describe("Masthead", () => {
  it("renders Add icon and actions in the same header row", () => {
    renderWithProviders(
      <Masthead
        icon={null}
        onSelectIcon={vi.fn()}
        onRemoveIcon={vi.fn()}
        changeIconLabel="Change icon"
        actions={<button type="button">Add cover</button>}
      >
        <h1>Series</h1>
      </Masthead>,
    );

    const header = screen.getByRole("banner");
    expect(
      within(header).getByRole("button", { name: /Add icon/i }),
    ).toBeInTheDocument();
    expect(
      within(header).getByRole("button", { name: "Add cover" }),
    ).toBeInTheDocument();
  });

  it("hangs the set icon beside the title so affordance actions cannot shift it", () => {
    renderWithProviders(
      <Masthead
        icon="📘"
        onSelectIcon={vi.fn()}
        onRemoveIcon={vi.fn()}
        changeIconLabel="Change icon"
        actions={<button type="button">Add cover</button>}
      >
        <h1>Series</h1>
      </Masthead>,
    );

    const iconButton = screen.getByRole("button", { name: "Change icon" });
    const titleBlock = screen.getByTestId("masthead-title");
    const actionsRow = screen.getByTestId("masthead-actions-row");

    expect(titleBlock).toContainElement(iconButton);
    expect(titleBlock).toContainElement(
      screen.getByRole("heading", { name: "Series" }),
    );
    expect(actionsRow).not.toContainElement(iconButton);
    expect(actionsRow).toContainElement(
      screen.getByRole("button", { name: "Add cover" }),
    );
  });

  it("keeps stacked icon margin and clears it only at xl when hanging", () => {
    renderWithProviders(
      <Masthead
        icon="📘"
        onSelectIcon={vi.fn()}
        onRemoveIcon={vi.fn()}
        changeIconLabel="Change icon"
      >
        <h1>Series</h1>
      </Masthead>,
    );

    expect(screen.getByTestId("masthead-icon")).toHaveClass("mb-2", "xl:mb-0");
    expect(
      screen.queryByTestId("masthead-actions-row"),
    ).not.toBeInTheDocument();
  });

  it("keeps the in-flow margin when Add cover is present beside an icon", () => {
    renderWithProviders(
      <Masthead
        icon="📘"
        onSelectIcon={vi.fn()}
        onRemoveIcon={vi.fn()}
        changeIconLabel="Change icon"
        actions={<button type="button">Add cover</button>}
      >
        <h1>Series</h1>
      </Masthead>,
    );

    const row = screen.getByTestId("masthead-actions-row");
    expect(row).toHaveClass("mb-2");
    expect(row).not.toHaveClass("xl:mb-0");
  });
});
