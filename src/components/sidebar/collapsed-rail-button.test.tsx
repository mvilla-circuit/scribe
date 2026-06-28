import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { CollapsedRailButton } from "./collapsed-rail-button";

describe("CollapsedRailButton", () => {
  it("exposes a button whose accessible name is the label", () => {
    renderWithProviders(
      <CollapsedRailButton label="Genesis" onClick={vi.fn()}>
        <span>icon</span>
      </CollapsedRailButton>,
    );
    expect(screen.getByRole("button", { name: "Genesis" })).toBeInTheDocument();
  });

  it("marks the current item with aria-current when selected", () => {
    renderWithProviders(
      <CollapsedRailButton label="Genesis" selected onClick={vi.fn()}>
        <span>icon</span>
      </CollapsedRailButton>,
    );
    expect(screen.getByRole("button", { name: "Genesis" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not set aria-current when not selected", () => {
    renderWithProviders(
      <CollapsedRailButton label="Genesis" onClick={vi.fn()}>
        <span>icon</span>
      </CollapsedRailButton>,
    );
    expect(screen.getByRole("button", { name: "Genesis" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("invokes onClick when clicked", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <CollapsedRailButton label="Genesis" onClick={onClick}>
        <span>icon</span>
      </CollapsedRailButton>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Genesis" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows a subpages indicator when indicator is set", () => {
    renderWithProviders(
      <CollapsedRailButton label="Genesis" indicator onClick={vi.fn()}>
        <span>icon</span>
      </CollapsedRailButton>,
    );
    expect(screen.getByTestId("rail-indicator")).toBeInTheDocument();
  });

  it("omits the subpages indicator by default", () => {
    renderWithProviders(
      <CollapsedRailButton label="Genesis" onClick={vi.fn()}>
        <span>icon</span>
      </CollapsedRailButton>,
    );
    expect(screen.queryByTestId("rail-indicator")).not.toBeInTheDocument();
  });
});
