import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { useUIStore } from "@/store/ui";
import { makeCollection, makeDatagrid, makeDatagridRow } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { DatagridRowModal, DatagridRowSplit } from "./datagrid-row-detail";

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

const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value));

function seed() {
  const client = createTestQueryClient();
  client.setQueryData(collectionsKey, [
    makeCollection({ id: "col-1", name: "Worldbuilding" }),
  ]);
  client.setQueryData(datagridsKey, [
    makeDatagrid({
      id: DGID,
      collection_id: "col-1",
      name: "Characters",
      fields: asJson([{ id: "f1", name: "About", type: "text", config: {} }]),
    }),
  ]);
  client.setQueryData(datagridRowsKey(DGID), [
    makeDatagridRow({
      id: ROWID,
      datagrid_id: DGID,
      title: "Aria",
      properties: asJson({ f1: "hero" }),
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

describe("Datagrid row breadcrumbs on modal and split", () => {
  it("shows Collection / Datagrid crumbs on the modal header", () => {
    renderWithProviders(
      <DatagridRowModal
        datagridId={DGID}
        rowId={ROWID}
        onClose={() => undefined}
      />,
      { client: seed() },
    );

    const trail = screen.getByLabelText("Datagrid row");
    expect(trail).toHaveTextContent("Worldbuilding");
    expect(trail).toHaveTextContent("Characters");
  });

  it("shows Collection / Datagrid crumbs on the split header", () => {
    renderWithProviders(
      <DatagridRowSplit
        datagridId={DGID}
        rowId={ROWID}
        onClose={() => undefined}
      />,
      { client: seed() },
    );

    const trail = screen.getByLabelText("Datagrid row");
    expect(trail).toHaveTextContent("Worldbuilding");
    expect(trail).toHaveTextContent("Characters");
  });

  it("navigates to the datagrid when its crumb is clicked on the modal", async () => {
    const user = userEvent.setup();
    useUIStore.setState({
      activeDatagridId: DGID,
      activeDatagridRowId: ROWID,
    });
    renderWithProviders(
      <DatagridRowModal
        datagridId={DGID}
        rowId={ROWID}
        onClose={() => undefined}
      />,
      { client: seed() },
    );

    await user.click(screen.getByRole("button", { name: "Characters" }));
    expect(useUIStore.getState().activeDatagridRowId).toBeNull();
    expect(useUIStore.getState().activeDatagridId).toBe(DGID);
  });
});
