import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { forwardRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Datagrid } from "@/data/datagrids";
import {
  booksKey,
  collectionsKey,
  datagridRowContentKey,
  datagridRowsKey,
  datagridsKey,
  entriesKey,
  pageIndexKey,
} from "@/data/query-keys";
import type { Json } from "@/lib/database.types";
import type { DatagridField } from "@/lib/datagrid-schema";
import { parseDatagridFields } from "@/lib/datagrid-schema";
import { useUIStore } from "@/store/ui";
import { makeCollection, makeDatagrid, makeDatagridRow } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { DatagridRowFull } from "./datagrid-row-full";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

vi.mock("@/editor/lazy-editor", () => ({
  Editor: forwardRef<unknown, Record<string, unknown>>(function EditorStub() {
    return <div data-testid="scribe-editor" />;
  }),
}));

const DGID = "dg-1";
const ROWID = "r1";
const DATAGRIDS_URL = "http://supabase.test/rest/v1/datagrids";

const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value));

const fields: DatagridField[] = [
  { id: "f1", name: "Notes", type: "text", config: {} },
];

function seed() {
  const client = createTestQueryClient();
  client.setQueryData(collectionsKey, [
    makeCollection({ id: "col-1", name: "Docs" }),
  ]);
  client.setQueryData(datagridsKey, [
    makeDatagrid({ id: DGID, collection_id: "col-1", fields: asJson(fields) }),
  ]);
  client.setQueryData(datagridRowsKey(DGID), [
    makeDatagridRow({
      id: ROWID,
      datagrid_id: DGID,
      title: "First",
      properties: asJson({ f1: "hello" }),
    }),
  ]);
  client.setQueryData<Json>(datagridRowContentKey(ROWID), {});
  client.setQueryData(booksKey, []);
  client.setQueryData(entriesKey, []);
  client.setQueryData(pageIndexKey, []);
  return client;
}

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useUIStore.setState({
    activeDatagridId: DGID,
    activeDatagridRowId: ROWID,
    rowOpenMode: "full",
    rowOpenModeByDatagridId: {},
    history: [],
    historyIndex: -1,
  });
});

describe("DatagridRowFull Edit Fields", () => {
  it("opens FieldManager from full mode when the datagrid page is not mounted", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<DatagridRowFull datagridId={DGID} rowId={ROWID} />, {
      client: seed(),
    });

    // Full mode replaces DatagridPage in MainPane — assert we only have the row.
    expect(screen.queryByLabelText("Datagrid")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Row title" })).toHaveValue(
      "First",
    );

    await user.click(screen.getByRole("button", { name: "Edit Fields" }));
    expect(screen.getByRole("heading", { name: "Fields" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("heading", { name: "Fields" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Row title" })).toHaveValue(
      "First",
    );
  });

  it("persists schema edits via useUpdateDatagrid and keeps the row mounted", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(DATAGRIDS_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = seed();
    renderWithProviders(<DatagridRowFull datagridId={DGID} rowId={ROWID} />, {
      client,
    });

    await user.click(screen.getByRole("button", { name: "Edit Fields" }));
    await user.click(screen.getByRole("button", { name: "Add field" }));
    await user.click(await screen.findByRole("menuitem", { name: "Number" }));

    await waitFor(() => {
      expect(patched?.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Notes", type: "text" }),
          expect.objectContaining({ name: "Number", type: "number" }),
        ]),
      );
    });

    const cached = client
      .getQueryData<Datagrid[]>(datagridsKey)
      ?.find((row) => row.id === DGID);
    expect(
      parseDatagridFields(cached?.fields ?? []).map((f) => f.name),
    ).toEqual(["Notes", "Number"]);

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("textbox", { name: "Row title" })).toHaveValue(
      "First",
    );
    expect(screen.getByText("Number")).toBeInTheDocument();
  });
});
