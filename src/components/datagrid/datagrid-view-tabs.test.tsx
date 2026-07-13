import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DatagridView } from "@/data/datagrid-views";
import { makeDatagridView } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridViewTabs } from "./datagrid-view-tabs";

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const twoViews: DatagridView[] = [
  makeDatagridView({ id: "view-1", name: "Table" }),
  makeDatagridView({ id: "view-2", name: "View 1" }),
];

function renderTabs({
  activeViewId = "view-1",
  onCreateView = vi.fn<() => void>(),
  onDelete = vi.fn<(viewId: string) => void>(),
  onSelect = vi.fn<(viewId: string) => void>(),
  views = twoViews,
}: {
  activeViewId?: string | null;
  onCreateView?: ReturnType<typeof vi.fn<() => void>>;
  onDelete?: ReturnType<typeof vi.fn<(viewId: string) => void>>;
  onSelect?: ReturnType<typeof vi.fn<(viewId: string) => void>>;
  views?: DatagridView[];
} = {}) {
  return {
    onCreateView,
    onDelete,
    onSelect,
    ...renderWithProviders(
      <DatagridViewTabs
        views={views}
        activeViewId={activeViewId}
        onSelect={onSelect}
        onCreateView={onCreateView}
        onDelete={onDelete}
      />,
    ),
  };
}

describe("DatagridViewTabs", () => {
  it("returns null when there is only one view", () => {
    renderTabs({
      views: [makeDatagridView({ id: "view-1", name: "Table" })],
    });

    expect(screen.queryByRole("button", { name: "Table" })).toBeNull();
    expect(screen.queryByRole("button", { name: "New view" })).toBeNull();
  });

  it("returns null when views is empty", () => {
    const { container } = renderTabs({
      views: [],
      activeViewId: null,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders tabs and New view when there are multiple views", () => {
    renderTabs();

    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View 1" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New view" }),
    ).toBeInTheDocument();
  });

  it("selects a view when its tab is clicked", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onSelect } = renderTabs();

    await user.click(screen.getByRole("button", { name: "View 1" }));
    expect(onSelect).toHaveBeenCalledWith("view-2");
  });

  it("calls onCreateView when New view is clicked", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onCreateView } = renderTabs();

    await user.click(screen.getByRole("button", { name: "New view" }));
    expect(onCreateView).toHaveBeenCalled();
  });

  it("deletes a view from its actions menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onDelete } = renderTabs();

    await user.click(
      screen.getByRole("button", { name: "Actions for View 1" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete view" }));
    expect(onDelete).toHaveBeenCalledWith("view-2");
  });
});
