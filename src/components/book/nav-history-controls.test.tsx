import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useUIStore } from "@/store/ui";
import { renderWithProviders } from "@/test/render-with-query";

import { NavHistoryControls } from "./nav-history-controls";

const resetStore = () =>
  useUIStore.setState({
    sidebarCollapsed: false,
    sidebarWidth: 260,
    activeBookId: null,
    activeDocId: null,
    expandedFolderIds: [],
    expandedDocIds: [],
    history: [],
    historyIndex: -1,
  });

beforeEach(resetStore);

describe("NavHistoryControls", () => {
  it("renders Back and Forward buttons", () => {
    renderWithProviders(<NavHistoryControls />);
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forward" })).toBeInTheDocument();
  });

  it("disables Back at the start of history", () => {
    renderWithProviders(<NavHistoryControls />);
    // No history yet: nowhere to go back to.
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();

    // After visiting two pages, Back becomes available.
    act(() => {
      const store = useUIStore.getState();
      store.setActiveBook("b1");
      store.setActiveDoc("d1");
    });
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Forward" })).toBeDisabled();
  });

  it("clicking Back navigates to the previous page", async () => {
    const user = userEvent.setup();
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");

    renderWithProviders(<NavHistoryControls />);

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(useUIStore.getState().activeBookId).toBe("b1");
    expect(useUIStore.getState().activeDocId).toBeNull();
  });
});
