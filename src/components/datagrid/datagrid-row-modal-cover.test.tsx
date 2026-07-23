import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, type ReactNode, useRef } from "react";
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

import { DatagridRowModal } from "./datagrid-row-detail";

const coverHooks = vi.hoisted(() => ({
  upload: { mutateAsync: vi.fn() },
  deleteCoverObject: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

vi.mock("@/data/cover-upload", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/cover-upload")>();
  return {
    ...actual,
    useUploadCover: () => coverHooks.upload,
    deleteCoverObject: (...args: unknown[]) =>
      coverHooks.deleteCoverObject(...args),
  };
});

// Keep a stable DOM node marker across remounts so we can detect editor churn.
vi.mock("@/editor/lazy-editor", () => ({
  Editor: forwardRef<unknown, Record<string, unknown>>(
    function EditorStub(_props, _ref) {
      const marker = useRef(`editor-${Math.random().toString(36).slice(2)}`);
      return <div data-testid="scribe-editor" data-marker={marker.current} />;
    },
  ),
}));

vi.mock("@/components/ui/masthead", () => ({
  Masthead: ({
    children,
    actions,
  }: {
    children: ReactNode;
    actions?: ReactNode;
  }) => (
    <header>
      {actions}
      {children}
    </header>
  ),
}));

const DGID = "dg-1";
const ROWID = "r1";
const COVER = "https://example.com/cover.jpg";

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
      cover_url: COVER,
      cover_position: 40,
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
  vi.clearAllMocks();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useUIStore.setState({
    activeDatagridId: DGID,
    activeDatagridRowId: ROWID,
    rowOpenMode: "modal",
    rowOpenModeByDatagridId: {},
    history: [],
    historyIndex: -1,
  });
});

describe("DatagridRowModal cover interactions", () => {
  it("Escape during reposition cancels the draft without closing the modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={onClose} />,
      { client: seed() },
    );

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));
    expect(
      screen.getByRole("button", { name: "Save position" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("button", { name: "Save position" }),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("textbox", { name: "Row title" }),
    ).toBeInTheDocument();
  });

  it("backdrop click during reposition cancels the draft without closing the modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={onClose} />,
      { client: seed() },
    );

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));
    expect(
      screen.getByRole("button", { name: "Save position" }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("dialog-overlay"));

    expect(
      screen.queryByRole("button", { name: "Save position" }),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("textbox", { name: "Row title" }),
    ).toBeInTheDocument();
  });

  it("keeps the editor mounted while the cover lightbox is open", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );

    const editor = screen.getByTestId("scribe-editor");
    const marker = editor.getAttribute("data-marker");
    expect(marker).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "View cover" }));
    expect(screen.getByRole("dialog", { name: "Cover image" })).toBeVisible();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    // Hidden but still mounted — same marker means no remount.
    const persisted = screen.getByTestId("scribe-editor");
    expect(persisted).toHaveAttribute("data-marker", marker);
    expect(persisted).not.toBeVisible();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Cover image" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("scribe-editor")).toHaveAttribute(
      "data-marker",
      marker,
    );
    expect(
      within(screen.getByRole("dialog")).getByRole("textbox", {
        name: "Row title",
      }),
    ).toBeVisible();
  });
});
