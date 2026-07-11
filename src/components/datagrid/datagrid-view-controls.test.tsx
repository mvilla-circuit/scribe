import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DatagridField, DatagridViewConfig } from "@/lib/datagrid-schema";
import { DEFAULT_DATAGRID_VIEW_CONFIG } from "@/lib/datagrid-schema";
import { renderWithProviders } from "@/test/render-with-query";

import { DatagridViewControls } from "./datagrid-view-controls";

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const fields: DatagridField[] = [
  {
    id: "stage",
    name: "Stage",
    type: "status",
    config: { options: [{ id: "o1", name: "Doing", color: "sky" }] },
  },
  { id: "score", name: "Score", type: "number", config: {} },
];

function config(over: Partial<DatagridViewConfig> = {}): DatagridViewConfig {
  return { ...DEFAULT_DATAGRID_VIEW_CONFIG, ...over };
}

function renderInMenu(children: ReactNode) {
  return renderWithProviders(
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>,
  );
}

async function openSubmenu(
  user: ReturnType<typeof userEvent.setup>,
  name: RegExp,
) {
  const trigger = await screen.findByRole("menuitem", { name });
  trigger.focus();
  await user.keyboard("{ArrowRight}");
}

function applyConfigUpdate(
  onChange: ReturnType<typeof vi.fn>,
  initial: DatagridViewConfig,
): DatagridViewConfig {
  const update = onChange.mock.calls.at(-1)?.[0] as (
    prev: DatagridViewConfig,
  ) => DatagridViewConfig;
  return update(initial);
}

describe("DatagridViewControls", () => {
  it("sets group-by to a groupable field", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const initial = config();
    renderInMenu(
      <DatagridViewControls
        fields={fields}
        config={initial}
        onChange={onChange}
      />,
    );
    await openSubmenu(user, /Group/);
    await user.click(await screen.findByRole("menuitem", { name: "Stage" }));
    expect(applyConfigUpdate(onChange, initial)).toMatchObject({
      groupBy: "stage",
    });
  });

  it("marks the sort axis active when a sort is set", async () => {
    renderInMenu(
      <DatagridViewControls
        fields={fields}
        config={config({ sorts: [{ fieldId: "stage", direction: "asc" }] })}
        onChange={vi.fn()}
      />,
    );
    expect(
      await screen.findByRole("menuitem", { name: /Sort/ }),
    ).toBeInTheDocument();
  });

  it("appends a second sort clause rather than replacing", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const initial = config({
      sorts: [{ fieldId: "stage", direction: "asc" }],
    });
    renderInMenu(
      <DatagridViewControls
        fields={fields}
        config={initial}
        onChange={onChange}
      />,
    );
    await openSubmenu(user, /Sort/);
    await user.click(await screen.findByRole("menuitem", { name: "Score" }));
    expect(applyConfigUpdate(onChange, initial)).toMatchObject({
      sorts: [
        { fieldId: "stage", direction: "asc" },
        { fieldId: "score", direction: "asc" },
      ],
    });
  });

  it("flips a sort clause direction", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const initial = config({
      sorts: [{ fieldId: "stage", direction: "asc" }],
    });
    renderInMenu(
      <DatagridViewControls
        fields={fields}
        config={initial}
        onChange={onChange}
      />,
    );
    await openSubmenu(user, /Sort/);
    await user.click(await screen.findByRole("button", { name: "Asc" }));
    expect(applyConfigUpdate(onChange, initial)).toMatchObject({
      sorts: [{ fieldId: "stage", direction: "desc" }],
    });
  });

  it("removes a sort clause", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const initial = config({
      sorts: [
        { fieldId: "stage", direction: "asc" },
        { fieldId: "score", direction: "desc" },
      ],
    });
    renderInMenu(
      <DatagridViewControls
        fields={fields}
        config={initial}
        onChange={onChange}
      />,
    );
    await openSubmenu(user, /Sort/);
    await user.click(
      await screen.findByRole("button", { name: "Remove Stage sort" }),
    );
    expect(applyConfigUpdate(onChange, initial)).toMatchObject({
      sorts: [{ fieldId: "score", direction: "desc" }],
    });
  });

  it("reorders a sort clause down", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const initial = config({
      sorts: [
        { fieldId: "stage", direction: "asc" },
        { fieldId: "score", direction: "desc" },
      ],
    });
    renderInMenu(
      <DatagridViewControls
        fields={fields}
        config={initial}
        onChange={onChange}
      />,
    );
    await openSubmenu(user, /Sort/);
    await user.click(
      await screen.findByRole("button", { name: "Move Stage sort down" }),
    );
    expect(applyConfigUpdate(onChange, initial)).toMatchObject({
      sorts: [
        { fieldId: "score", direction: "desc" },
        { fieldId: "stage", direction: "asc" },
      ],
    });
  });

  it("hides a column via the Columns menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const initial = config();
    renderInMenu(
      <DatagridViewControls
        fields={fields}
        config={initial}
        onChange={onChange}
      />,
    );
    await openSubmenu(user, /Columns/);
    await user.click(await screen.findByRole("menuitem", { name: /Stage/ }));
    expect(applyConfigUpdate(onChange, initial)).toMatchObject({
      visibleFieldIds: ["score"],
    });
  });

  it("shows a previously hidden column", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = vi.fn();
    const initial = config({ visibleFieldIds: ["score"] });
    renderInMenu(
      <DatagridViewControls
        fields={fields}
        config={initial}
        onChange={onChange}
      />,
    );
    await openSubmenu(user, /Columns/);
    await user.click(await screen.findByRole("menuitem", { name: /Stage/ }));
    expect(applyConfigUpdate(onChange, initial)).toMatchObject({
      visibleFieldIds: ["stage", "score"],
    });
  });
});
