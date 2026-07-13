import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NodeViewProps } from "@tiptap/react";
import { describe, expect, it, vi } from "vitest";

import {
  type EditorBridge,
  EditorBridgeContext,
  type ResolvedDatagridRow,
} from "@/editor/editor-bridge";

import { DatagridRowCardView } from "./datagrid-row-card-view";

const RESOLVED: ResolvedDatagridRow = {
  title: "Aria",
  icon: "🗡️",
  coverUrl: "https://cdn.test/cover.jpg",
  datagridName: "Characters",
  fieldsPreview: [
    { fieldId: "role", text: "Warrior" },
    { fieldId: "region", text: "North" },
  ],
};

function makeBridge(over: Partial<EditorBridge> = {}): EditorBridge {
  return {
    loading: false,
    resolvePageTarget: () => null,
    pageLinkOptions: [],
    navigateToPage: vi.fn(),
    resolveDatagridRow: () => RESOLVED,
    datagridLinkOptions: [],
    datagridRowLinkOptions: () => [],
    navigateToDatagridRow: vi.fn(),
    watchDatagrid: vi.fn(),
    isDatagridLoading: () => false,
    ...over,
  };
}

function renderCard(
  attrs: Record<string, unknown>,
  bridge: EditorBridge = makeBridge(),
  editable = false,
) {
  const fakeNode = { attrs };
  const fakeEditor = { isEditable: editable };
  const props: Partial<NodeViewProps> = {
    node: fakeNode as NodeViewProps["node"],
    editor: fakeEditor as NodeViewProps["editor"],
    deleteNode: vi.fn(),
    getPos: () => 0,
  };
  return render(
    <EditorBridgeContext.Provider value={bridge}>
      <DatagridRowCardView {...(props as NodeViewProps)} />
    </EditorBridgeContext.Provider>,
  );
}

describe("DatagridRowCardView", () => {
  it("renders cover, title, and field preview lines from the bridge", () => {
    renderCard({
      datagridId: "dg-1",
      rowId: "row-1",
      label: "Stale",
    });

    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(screen.getByText("Characters")).toBeInTheDocument();
    expect(screen.getByText("Warrior")).toBeInTheDocument();
    expect(screen.getByText("North")).toBeInTheDocument();
    expect(screen.getByTestId("dgrowcard-cover")).toHaveAttribute(
      "src",
      "https://cdn.test/cover.jpg",
    );
  });

  it("uses a flush left media cap for the cover", () => {
    renderCard({ datagridId: "dg-1", rowId: "row-1" });
    const media = screen.getByTestId("dgrowcard-media");
    const cover = screen.getByTestId("dgrowcard-cover");
    expect(media).toHaveClass("scribe-dgrowcard-media");
    expect(cover).toHaveClass("scribe-dgrowcard-cover");
    expect(screen.getByRole("link")).toContainElement(media);
  });

  it("renders one left-aligned field line per preview value", () => {
    renderCard({ datagridId: "dg-1", rowId: "row-1" });
    // Div stack (not prose <ul>) keeps fields flush with the title.
    expect(screen.getByText("Warrior")).toHaveClass("scribe-dgrowcard-field");
    expect(screen.getByText("North")).toHaveClass("scribe-dgrowcard-field");
  });

  it("navigates to the source row when activated", async () => {
    const user = userEvent.setup();
    const navigateToDatagridRow = vi.fn();
    renderCard(
      { datagridId: "dg-1", rowId: "row-1" },
      makeBridge({ navigateToDatagridRow }),
    );

    await user.click(screen.getByRole("link"));
    expect(navigateToDatagridRow).toHaveBeenCalledWith({
      datagridId: "dg-1",
      rowId: "row-1",
    });
  });

  it("renders a calm not-found state when resolve returns null", () => {
    renderCard(
      { datagridId: "dg-1", rowId: "missing", label: "Gone" },
      makeBridge({ resolveDatagridRow: () => null }),
    );

    expect(screen.getByText("Card not found")).toBeInTheDocument();
    expect(screen.queryByText("Gone")).not.toBeInTheDocument();
  });

  it("watches the datagrid and does not flash not-found while loading", () => {
    const watchDatagrid = vi.fn();
    renderCard(
      { datagridId: "dg-1", rowId: "row-1", label: "Aria" },
      makeBridge({
        resolveDatagridRow: () => null,
        watchDatagrid,
        isDatagridLoading: () => true,
      }),
    );

    expect(watchDatagrid).toHaveBeenCalledWith("dg-1");
    expect(screen.queryByText("Card not found")).not.toBeInTheDocument();
    expect(screen.getByText("Aria")).toBeInTheDocument();
  });
});
