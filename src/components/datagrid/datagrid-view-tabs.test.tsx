import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeDatagridView } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridViewTabs } from "./datagrid-view-tabs";

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("DatagridViewTabs", () => {
  it("returns null when there is only one view", () => {
    renderWithProviders(
      <DatagridViewTabs
        views={[makeDatagridView({ id: "view-1", name: "Table" })]}
        activeViewId="view-1"
        onSelect={vi.fn()}
        onCreateView={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Table" })).toBeNull();
    expect(screen.queryByRole("button", { name: "New view" })).toBeNull();
  });

  it("returns null when views is empty", () => {
    const { container } = renderWithProviders(
      <DatagridViewTabs
        views={[]}
        activeViewId={null}
        onSelect={vi.fn()}
        onCreateView={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "New view" })).toBeNull();
  });

  it("renders tabs and New view when there are multiple views", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onSelect = vi.fn();
    const onCreateView = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <DatagridViewTabs
        views={[
          makeDatagridView({ id: "view-1", name: "Table" }),
          makeDatagridView({ id: "view-2", name: "View 1" }),
        ]}
        activeViewId="view-1"
        onSelect={onSelect}
        onCreateView={onCreateView}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View 1" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New view" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View 1" }));
    expect(onSelect).toHaveBeenCalledWith("view-2");

    await user.click(screen.getByRole("button", { name: "New view" }));
    expect(onCreateView).toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Actions for View 1" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete view" }));
    expect(onDelete).toHaveBeenCalledWith("view-2");
  });
});
