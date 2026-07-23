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

type ConfigUpdater = (prev: DatagridViewConfig) => DatagridViewConfig;

function renderMenu({
  config: viewConfig = config(),
  layoutEnabled = true,
  onChange = vi.fn<(update: ConfigUpdater) => void>(),
  onCreateView = vi.fn<() => void>(),
  onExportCsv = vi.fn<() => void>(),
  onImportCsv = vi.fn<() => void>(),
  onOpenFields = vi.fn<() => void>(),
}: {
  config?: DatagridViewConfig;
  layoutEnabled?: boolean;
  onChange?: ReturnType<typeof vi.fn<(update: ConfigUpdater) => void>>;
  onCreateView?: ReturnType<typeof vi.fn<() => void>>;
  onExportCsv?: ReturnType<typeof vi.fn<() => void>>;
  onImportCsv?: ReturnType<typeof vi.fn<() => void>>;
  onOpenFields?: ReturnType<typeof vi.fn<() => void>>;
} = {}) {
  return {
    onChange,
    onCreateView,
    onExportCsv,
    onImportCsv,
    onOpenFields,
    ...renderWithProviders(
      <DatagridToolbarMenu
        fields={fields}
        config={viewConfig}
        layoutEnabled={layoutEnabled}
        onChange={onChange}
        onCreateView={onCreateView}
        onOpenFields={onOpenFields}
        onImportCsv={onImportCsv}
        onExportCsv={onExportCsv}
      />,
    ),
  };
}

async function openMenu() {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(screen.getByRole("button", { name: "View options" }));
  return user;
}

describe("DatagridToolbarMenu", () => {
  it("changes layout from the Layout submenu", async () => {
    const { onChange } = renderMenu({
      config: config({ layout: "table" }),
    });
    const user = await openMenu();

    const layout = await screen.findByRole("menuitem", { name: /Layout/ });
    layout.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(await screen.findByRole("menuitem", { name: "Gallery" }));

    expect(onChange).toHaveBeenCalled();
    const update = onChange.mock.calls.at(-1)?.[0];
    expect(update?.(config({ layout: "table" }))).toMatchObject({
      layout: "gallery",
    });
  });

  it("disables Layout when layoutEnabled is false", async () => {
    const { onChange } = renderMenu({
      config: config({ layout: "table" }),
      layoutEnabled: false,
    });
    await openMenu();

    const layout = await screen.findByRole("menuitem", { name: /Layout/ });
    expect(layout).toHaveAttribute("aria-disabled", "true");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("invokes fields and CSV actions", async () => {
    const { onExportCsv, onImportCsv, onOpenFields } = renderMenu();

    let user = await openMenu();
    await user.click(await screen.findByRole("menuitem", { name: "Fields" }));
    expect(onOpenFields).toHaveBeenCalled();

    user = await openMenu();
    await user.click(
      await screen.findByRole("menuitem", { name: "Import CSV" }),
    );
    expect(onImportCsv).toHaveBeenCalled();

    user = await openMenu();
    await user.click(
      await screen.findByRole("menuitem", { name: "Export CSV" }),
    );
    expect(onExportCsv).toHaveBeenCalled();
  });

  it("offers New view and calls onCreateView", async () => {
    const { onCreateView } = renderMenu();
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitem", { name: "New view" }));
    expect(onCreateView).toHaveBeenCalled();
  });
});
