import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type EditorBridge, EditorBridgeContext } from "@/editor/editor-bridge";

import { DatagridRowPicker } from "./datagrid-row-picker";
import { useDatagridRowPicker } from "./datagrid-row-picker-store";
import { filterSlashItems } from "./slash-items";

function makeBridge(over: Partial<EditorBridge> = {}): EditorBridge {
  return {
    loading: false,
    resolvePageTarget: () => null,
    pageLinkOptions: [],
    navigateToPage: vi.fn(),
    resolveDatagridRow: () => null,
    datagridLinkOptions: [
      {
        datagridId: "dg-1",
        label: "Characters",
        icon: null,
        subtitle: "Datagrid",
      },
    ],
    datagridRowLinkOptions: (datagridId) =>
      datagridId === "dg-1"
        ? [
            {
              datagridId: "dg-1",
              rowId: "row-1",
              label: "Aria",
              icon: "🗡️",
              subtitle: "Characters",
            },
          ]
        : [],
    navigateToDatagridRow: vi.fn(),
    ...over,
  };
}

describe("Datagrid card slash item", () => {
  it("is discoverable via filterSlashItems", () => {
    const titles = filterSlashItems("datagrid").map((item) => item.title);
    expect(titles).toContain("Datagrid card");
  });

  it("opens the datagrid-row picker callback store", () => {
    const open = vi.spyOn(useDatagridRowPicker.getState(), "open");
    const item = filterSlashItems("datagrid card").find(
      (entry) => entry.title === "Datagrid card",
    );
    expect(item).toBeDefined();

    const editor = {
      chain: () => ({
        focus: () => ({
          deleteRange: () => ({
            run: vi.fn(),
          }),
        }),
      }),
    };
    item?.run(editor as never, { from: 0, to: 1 });

    expect(open).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });
});

describe("DatagridRowPicker", () => {
  afterEach(() => {
    useDatagridRowPicker.getState().close();
  });

  it("lets the user pick a datagrid then a row", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    useDatagridRowPicker.getState().open(onSelect);

    render(
      <EditorBridgeContext.Provider value={makeBridge()}>
        <DatagridRowPicker />
      </EditorBridgeContext.Provider>,
    );

    expect(screen.getByText("Characters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Characters/i }));

    expect(screen.getByText("Aria")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Aria/i }));

    expect(onSelect).toHaveBeenCalledWith({
      datagridId: "dg-1",
      rowId: "row-1",
      label: "Aria",
    });
    expect(useDatagridRowPicker.getState().callback).toBeNull();
  });
});
