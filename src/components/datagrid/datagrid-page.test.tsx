import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { collectionsKey } from "@/data/query-keys";
import {
  datagridRowsKey,
  datagridsKey,
  datagridViewsKey,
} from "@/data/query-keys";
import type { Json } from "@/lib/database.types";
import type { DatagridField } from "@/lib/datagrid-schema";
import { useUIStore } from "@/store/ui";
import {
  makeCollection,
  makeDatagrid,
  makeDatagridRow,
  makeDatagridView,
} from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { DatagridPage } from "./datagrid-page";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

const DGID = "dg-1";

const textFields: DatagridField[] = [
  { id: "f1", name: "Notes", type: "text", config: {} },
];

// The DB columns are jsonb; round-trip typed test data through JSON so it lands
// as `Json` without a hand-written cast.
const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value));

function seed(over: {
  fields?: DatagridField[];
  rows?: ReturnType<typeof makeDatagridRow>[];
  viewConfig?: Record<string, unknown>;
  subtitle?: string | null;
  theme?: Record<string, unknown>;
}) {
  const client = createTestQueryClient();
  client.setQueryData(collectionsKey, [
    makeCollection({ id: "col-1", name: "Docs" }),
  ]);
  client.setQueryData(datagridsKey, [
    makeDatagrid({
      id: DGID,
      collection_id: "col-1",
      name: "Tasks",
      fields: asJson(over.fields ?? textFields),
      ...(over.subtitle !== undefined ? { subtitle: over.subtitle } : {}),
      ...(over.theme !== undefined ? { theme: asJson(over.theme) } : {}),
    }),
  ]);
  client.setQueryData(datagridViewsKey(DGID), [
    makeDatagridView({
      id: "view-1",
      datagrid_id: DGID,
      is_default: true,
      config: asJson(over.viewConfig ?? {}),
    }),
  ]);
  client.setQueryData(datagridRowsKey(DGID), over.rows ?? []);
  return client;
}

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useUIStore.setState({
    activeDatagridId: DGID,
    activeDatagridRowId: null,
    rowOpenMode: "modal",
    history: [],
    historyIndex: -1,
  });
});

describe("DatagridPage", () => {
  it("opens with the default table view showing fields and rows", () => {
    const client = seed({
      rows: [makeDatagridRow({ id: "r1", datagrid_id: DGID, title: "First" })],
    });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("First")).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    const client = seed({ rows: [] });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });
    expect(screen.getByText("This datagrid is empty")).toBeInTheDocument();
  });

  it("prompts to add a group field on a board view without one", () => {
    const client = seed({
      fields: textFields,
      rows: [makeDatagridRow({ id: "r1", datagrid_id: DGID })],
      viewConfig: { layout: "board" },
    });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });
    expect(screen.getByText("No group field yet")).toBeInTheDocument();
  });

  it("renders the gallery layout when the view config selects it", () => {
    const client = seed({
      rows: [makeDatagridRow({ id: "r1", datagrid_id: DGID, title: "Card" })],
      viewConfig: { layout: "gallery" },
    });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("opens a row into the UI store from the table", () => {
    const client = seed({
      rows: [makeDatagridRow({ id: "r1", datagrid_id: DGID, title: "First" })],
    });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });
    fireEvent.click(screen.getByRole("button", { name: "Open First" }));
    expect(useUIStore.getState().activeDatagridRowId).toBe("r1");
  });

  it("navigates to the collection via the breadcrumb", () => {
    const client = seed({ rows: [] });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    fireEvent.click(screen.getByRole("button", { name: "Docs" }));

    expect(useUIStore.getState().activeCollectionId).toBe("col-1");
  });

  it("does not render the view tab strip with a single view", () => {
    const client = seed({ rows: [] });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    expect(screen.queryByRole("button", { name: "Table" })).toBeNull();
    expect(screen.queryByRole("button", { name: "New view" })).toBeNull();
  });

  it("creating a second view from the menu shows the tab strip", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed({ rows: [] });
    server.use(
      http.post(
        "http://supabase.test/rest/v1/datagrid_views",
        () => new HttpResponse(null, { status: 201 }),
      ),
    );

    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    expect(screen.queryByRole("button", { name: "New view" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "View options" }));
    await user.click(await screen.findByRole("menuitem", { name: "New view" }));

    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View 2" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New view" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View options" }));
    expect(
      await screen.findByRole("menuitem", { name: "New view" }),
    ).toBeInTheDocument();
  });

  it("deleting down to one view hides the tab strip", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed({ rows: [] });
    client.setQueryData(datagridViewsKey(DGID), [
      makeDatagridView({
        id: "view-1",
        datagrid_id: DGID,
        name: "Table",
        is_default: true,
        position: 0,
      }),
      makeDatagridView({
        id: "view-2",
        datagrid_id: DGID,
        name: "View 1",
        is_default: false,
        position: 1,
      }),
    ]);
    server.use(
      http.delete(
        "http://supabase.test/rest/v1/datagrid_views",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New view" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View 1" }));
    await user.click(
      screen.getByRole("button", { name: "Actions for View 1" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete view" }));

    expect(
      client
        .getQueryData<{ id: string }[]>(datagridViewsKey(DGID))
        ?.map((v) => v.id),
    ).toEqual(["view-1"]);
    expect(screen.queryByRole("button", { name: "Table" })).toBeNull();
    expect(screen.queryByRole("button", { name: "View 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "New view" })).toBeNull();
  });

  it("shows a not-found state for an unknown datagrid id", () => {
    const client = seed({ rows: [] });
    renderWithProviders(<DatagridPage datagridId="missing" />, { client });
    expect(screen.getByText("Datagrid not found")).toBeInTheDocument();
  });

  it("keeps only search, options, and New on the toolbar", () => {
    const client = seed({ rows: [] });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    expect(screen.getByLabelText("Search rows")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View options" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /Filter/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sort/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Group/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Columns/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fields" })).toBeNull();
    expect(screen.queryByRole("button", { name: "CSV" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gallery" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Board" })).toBeNull();
  });

  it("opens filter, fields, and layout from the options menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed({ rows: [] });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    await user.click(screen.getByRole("button", { name: "View options" }));
    expect(
      await screen.findByRole("menuitem", { name: /Filter/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Sort/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Group/ })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Columns/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Layout/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Fields" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Import CSV" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Export CSV" }),
    ).toBeInTheDocument();
  });

  it("exposes subtitle and font controls in the top-right nav", () => {
    const client = seed({ rows: [] });
    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    expect(
      screen.getByRole("button", { name: "Show subtitle" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fonts" })).toBeInTheDocument();
  });

  it("toggles the subtitle slot and shows an editable subtitle", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed({ rows: [], theme: { showSubtitle: false } });
    server.use(
      http.patch(
        "http://supabase.test/rest/v1/datagrids",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    renderWithProviders(<DatagridPage datagridId={DGID} />, { client });

    expect(screen.queryByLabelText("Datagrid subtitle")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show subtitle" }));

    expect(
      client.getQueryData<{ theme: { showSubtitle?: boolean } }[]>(
        datagridsKey,
      )?.[0]?.theme.showSubtitle,
    ).toBe(true);
    expect(screen.getByLabelText("Datagrid subtitle")).toBeInTheDocument();
  });
});
