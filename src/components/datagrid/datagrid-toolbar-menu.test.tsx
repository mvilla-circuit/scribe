import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DatagridField, DatagridViewConfig } from "@/lib/datagrid-schema";
import { DEFAULT_DATAGRID_VIEW_CONFIG } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridToolbarMenu } from "./datagrid-toolbar-menu";

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const fields: DatagridField[] = [
  { id: "notes", name: "Notes", type: "text", config: {} },
];

function config(over: Partial<DatagridViewConfig> = {}): DatagridViewConfig {
  return { ...DEFAULT_DATAGRID_VIEW_CONFIG, ...over };
}

describe("DatagridToolbarMenu", () => {
  it("changes layout from the Layout submenu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    renderWithProviders(
      <DatagridToolbarMenu
        fields={fields}
        config={config({ layout: "table" })}
        onChange={onChange}
        onCreateView={vi.fn()}
        onOpenFields={vi.fn()}
        onImportCsv={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View options" }));
    const layout = await screen.findByRole("menuitem", { name: /Layout/ });
    layout.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(await screen.findByRole("menuitem", { name: "Gallery" }));

    expect(onChange).toHaveBeenCalled();
    const update = onChange.mock.calls.at(-1)?.[0] as (
      prev: DatagridViewConfig,
    ) => DatagridViewConfig;
    expect(update(config({ layout: "table" }))).toMatchObject({
      layout: "gallery",
    });
  });

  it("invokes fields and CSV actions", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onOpenFields = vi.fn();
    const onImportCsv = vi.fn();
    const onExportCsv = vi.fn();
    renderWithProviders(
      <DatagridToolbarMenu
        fields={fields}
        config={config()}
        onChange={vi.fn()}
        onCreateView={vi.fn()}
        onOpenFields={onOpenFields}
        onImportCsv={onImportCsv}
        onExportCsv={onExportCsv}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View options" }));
    await user.click(await screen.findByRole("menuitem", { name: "Fields" }));
    expect(onOpenFields).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "View options" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Import CSV" }),
    );
    expect(onImportCsv).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "View options" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Export CSV" }),
    );
    expect(onExportCsv).toHaveBeenCalled();
  });

  it("offers New view and calls onCreateView", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onCreateView = vi.fn();
    renderWithProviders(
      <DatagridToolbarMenu
        fields={fields}
        config={config()}
        onChange={vi.fn()}
        onCreateView={onCreateView}
        onOpenFields={vi.fn()}
        onImportCsv={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View options" }));
    await user.click(await screen.findByRole("menuitem", { name: "New view" }));
    expect(onCreateView).toHaveBeenCalled();
  });
});
