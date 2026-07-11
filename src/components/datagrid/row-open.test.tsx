import { fireEvent, screen, within } from "@testing-library/react";
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
import type { DatagridField } from "@/lib/datagrid-schema";
import { useUIStore } from "@/store/ui";
import { makeCollection, makeDatagrid, makeDatagridRow } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { DatagridRowModal, DatagridRowSplit } from "./datagrid-row-detail";
import { DatagridRowFull } from "./datagrid-row-full";
import { RowOpenModeControl } from "./datagrid-row-open-mode-control";

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
  useUIStore.setState({
    activeDatagridId: DGID,
    activeDatagridRowId: ROWID,
    rowOpenMode: "modal",
    rowOpenModeByDatagridId: {},
    history: [],
    historyIndex: -1,
  });
});

describe("DatagridRowModal", () => {
  it("shows the title, property editor, and body", () => {
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("textbox", { name: "Row title" }),
    ).toHaveValue("First");
    expect(within(dialog).getByText("Notes")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Notes" })).toHaveValue(
      "hello",
    );
    expect(within(dialog).getByTestId("scribe-editor")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={onClose} />,
      { client: seed() },
    );
    fireEvent.click(screen.getByRole("button", { name: "Close row" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("DatagridRowSplit", () => {
  it("renders the properties and body in a labelled side panel", () => {
    renderWithProviders(
      <DatagridRowSplit datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );
    const panel = screen.getByRole("complementary", { name: "Row" });
    expect(within(panel).getByRole("textbox", { name: "Notes" })).toHaveValue(
      "hello",
    );
    expect(within(panel).getByTestId("scribe-editor")).toBeInTheDocument();
    expect(
      within(panel).getByRole("separator", { name: "Resize row panel" }),
    ).toBeInTheDocument();
  });

  it("remounts property editors when the open row changes", () => {
    const client = seed();
    client.setQueryData(datagridRowsKey(DGID), [
      makeDatagridRow({
        id: "r1",
        datagrid_id: DGID,
        title: "First",
        properties: asJson({ f1: "hello" }),
      }),
      makeDatagridRow({
        id: "r2",
        datagrid_id: DGID,
        title: "Second",
        properties: asJson({ f1: "world" }),
      }),
    ]);
    client.setQueryData<Json>(datagridRowContentKey("r2"), {});

    const { rerender } = renderWithProviders(
      <DatagridRowSplit datagridId={DGID} rowId="r1" onClose={vi.fn()} />,
      { client },
    );
    const panel = screen.getByRole("complementary", { name: "Row" });
    const notes = within(panel).getByRole("textbox", { name: "Notes" });
    expect(notes).toHaveValue("hello");
    fireEvent.change(notes, { target: { value: "draft-a" } });
    expect(notes).toHaveValue("draft-a");

    rerender(
      <DatagridRowSplit datagridId={DGID} rowId="r2" onClose={vi.fn()} />,
    );
    expect(
      within(screen.getByRole("complementary", { name: "Row" })).getByRole(
        "textbox",
        { name: "Notes" },
      ),
    ).toHaveValue("world");
  });

  it("syncs property editors when the row value changes externally", () => {
    const client = seed();
    const { rerender } = renderWithProviders(
      <DatagridRowSplit datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client },
    );
    const panel = screen.getByRole("complementary", { name: "Row" });
    const notes = within(panel).getByRole("textbox", { name: "Notes" });
    fireEvent.change(notes, { target: { value: "stale-draft" } });
    expect(notes).toHaveValue("stale-draft");

    client.setQueryData(datagridRowsKey(DGID), [
      makeDatagridRow({
        id: ROWID,
        datagrid_id: DGID,
        title: "First",
        properties: asJson({ f1: "from-table" }),
      }),
    ]);
    rerender(
      <DatagridRowSplit datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
    );

    const synced = within(
      screen.getByRole("complementary", { name: "Row" }),
    ).getByRole("textbox", { name: "Notes" });
    expect(synced).toHaveValue("from-table");
    fireEvent.blur(synced);
    // Unchanged blur must not fight the table write (covered by field-editor
    // dirty check; assert the displayed value stayed the external one).
    expect(synced).toHaveValue("from-table");
  });
});

describe("DatagridRowFull", () => {
  it("renders an EntryView-like surface with title, properties, and body", () => {
    renderWithProviders(<DatagridRowFull datagridId={DGID} rowId={ROWID} />, {
      client: seed(),
    });
    expect(screen.getByRole("textbox", { name: "Row title" })).toHaveValue(
      "First",
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("hello");
    expect(screen.getByTestId("scribe-editor")).toBeInTheDocument();
  });
});

describe("RowOpenModeControl", () => {
  it("switches the open mode in the store", () => {
    renderWithProviders(<RowOpenModeControl />);
    fireEvent.click(screen.getByRole("button", { name: "Open in side panel" }));
    expect(useUIStore.getState().rowOpenMode).toBe("split");
  });
});
