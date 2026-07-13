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
    const { container } = renderCard({
      datagridId: "dg-1",
      rowId: "row-1",
      label: "Stale",
    });

    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(screen.getByText("Characters")).toBeInTheDocument();
    expect(screen.getByText("Warrior")).toBeInTheDocument();
    expect(screen.getByText("North")).toBeInTheDocument();
    // Cover is decorative (empty alt) — assert structurally.
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- decorative cover <img alt=""> has no accessible role
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://cdn.test/cover.jpg");
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
});
