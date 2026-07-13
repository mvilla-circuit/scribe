import { screen, waitFor, within } from "@testing-library/react";
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
import { makeCollection, makeDatagrid, makeDatagridRow } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { DatagridRowModal, DatagridRowSplit } from "./datagrid-row-detail";
import { DatagridRowEditFields } from "./datagrid-row-edit-fields";

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
});

describe("DatagridRowEditFields", () => {
  it("right-aligns the Edit Fields control", () => {
    renderWithProviders(
      <DatagridRowEditFields datagridId={DGID} fields={fields} />,
      { client: seed() },
    );
    expect(screen.getByTestId("edit-fields-align")).toHaveClass("justify-end");
    expect(
      screen.getByRole("button", { name: "Edit Fields" }),
    ).toBeInTheDocument();
  });

  it("opens FieldManager and persists via useUpdateDatagrid", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(DATAGRIDS_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = seed();
    renderWithProviders(
      <DatagridRowEditFields datagridId={DGID} fields={fields} />,
      { client },
    );

    await user.click(screen.getByRole("button", { name: "Edit Fields" }));
    expect(screen.getByRole("heading", { name: "Fields" })).toBeInTheDocument();

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
  });
});

describe("Edit Fields on modal and split rows", () => {
  it("opens FieldManager from the modal and leaves the row mounted on Done", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );

    const rowDialog = screen.getByRole("dialog");
    await user.click(
      within(rowDialog).getByRole("button", { name: "Edit Fields" }),
    );
    expect(screen.getByRole("heading", { name: "Fields" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("heading", { name: "Fields" })).toBeNull();
    expect(
      within(screen.getByRole("dialog")).getByRole("textbox", {
        name: "Row title",
      }),
    ).toHaveValue("First");
  });

  it("shows Edit Fields on the split panel", () => {
    renderWithProviders(
      <DatagridRowSplit datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );
    const panel = screen.getByRole("complementary", { name: "Row" });
    expect(
      within(panel).getByRole("button", { name: "Edit Fields" }),
    ).toBeInTheDocument();
  });

  it("places Edit Fields after the property list on the modal", () => {
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );
    const rowDialog = screen.getByRole("dialog");
    const fieldLabel = within(rowDialog).getByText("Notes");
    const editFields = within(rowDialog).getByRole("button", {
      name: "Edit Fields",
    });
    expect(
      fieldLabel.compareDocumentPosition(editFields) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses editorial peek spacing on the modal body", () => {
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );
    const body = screen.getByTestId("row-panel-body");
    expect(body).toHaveClass("px-8", "pt-8", "pb-8");
    expect(screen.getByTestId("row-panel-editor")).toHaveClass("mt-8", "pt-6");
  });
});
