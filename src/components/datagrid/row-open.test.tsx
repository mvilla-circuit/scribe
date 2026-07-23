import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, type ReactNode } from "react";
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

const coverHooks = vi.hoisted(() => ({
  upload: { mutateAsync: vi.fn() },
  deleteCoverObject: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

vi.mock("@/data/cover-upload", () => ({
  useUploadCover: () => coverHooks.upload,
  deleteCoverObject: (...args: unknown[]) =>
    coverHooks.deleteCoverObject(...args),
}));

vi.mock("@/components/ui/page-cover", () => ({
  PageCover: ({
    coverUrl,
    onRemove,
    onViewCover,
  }: {
    coverUrl: string | null;
    onRemove: () => void;
    onViewCover?: (src: string) => void;
  }) =>
    coverUrl ? (
      <section aria-label="Page cover">
        <img src={coverUrl} alt="Page cover" />
        {onViewCover ? (
          <button
            type="button"
            onClick={() => {
              onViewCover(coverUrl);
            }}
          >
            View cover
          </button>
        ) : null}
        <button type="button" onClick={onRemove}>
          Remove cover
        </button>
      </section>
    ) : null,
  AddCoverButton: ({
    onUpload,
  }: {
    onUpload: (file: File) => Promise<string>;
  }) => (
    <button
      type="button"
      aria-label="Add cover"
      onClick={() => {
        void onUpload(new File(["cover"], "cover.png", { type: "image/png" }));
      }}
    >
      Add cover
    </button>
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

function seed(coverUrl: string | null = null) {
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
      cover_url: coverUrl,
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

  it("opens the cover lightbox as the only dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed("https://example.com/cover.jpg") },
    );

    await user.click(screen.getByRole("button", { name: "View cover" }));

    const lightbox = screen.getByRole("dialog", { name: "Cover image" });
    expect(lightbox).toBeVisible();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      screen.queryByRole("textbox", { name: "Row title" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close image" }));

    expect(
      screen.queryByRole("dialog", { name: "Cover image" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Row title" })).toBeVisible();
  });

  it("modal lightbox wrapper and chrome establish flex scroll chain", () => {
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-h-[85vh]", "overflow-hidden");

    // The lightbox wrapper is DialogContent's direct child that gets
    // `hidden` when the cover lightbox opens; it must join the flex/scroll
    // chain so the scrollable body inside can actually get a bounded height.
    // eslint-disable-next-line testing-library/no-node-access -- asserting the flex/scroll chain on DialogContent's structural wrapper, which has no queryable role
    const panelWrapper = dialog.firstElementChild;
    expect(panelWrapper).not.toBeNull();
    expect(panelWrapper).toHaveClass(
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
      "overflow-hidden",
    );

    // RowPanelChrome's root (the parent of the header holding the Close row
    // button) must also carry the same flex/scroll chain classes.
    const closeButton = screen.getByRole("button", { name: "Close row" });
    // eslint-disable-next-line testing-library/no-node-access -- walking up to the header div (a non-interactive structural wrapper) that holds the Close row button
    const header = closeButton.closest("div");
    expect(header).not.toBeNull();
    // eslint-disable-next-line testing-library/no-node-access -- RowPanelChrome's root has no queryable role; asserting the flex/scroll chain on it directly
    const chromeRoot = header?.parentElement ?? null;
    expect(chromeRoot).not.toBeNull();
    expect(chromeRoot).toHaveClass(
      "flex",
      "min-h-0",
      "flex-1",
      "flex-col",
      "overflow-hidden",
    );

    // The header stays fixed (shrink-0) or, at minimum, lives outside the
    // scrollable body so it never scrolls away.
    const body = screen.getByTestId("row-panel-body");
    const headerStaysPut =
      (header?.classList.contains("shrink-0") ?? false) ||
      !body.contains(closeButton);
    expect(headerStaysPut).toBe(true);
  });

  it("row panel body scrolls and includes cover", () => {
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed("https://example.com/cover.jpg") },
    );

    const body = screen.getByTestId("row-panel-body");
    expect(body).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
    // Padding moves to the inner content stack so the cover can bleed edge
    // to edge inside the scroll shell.
    expect(body).not.toHaveClass("px-8");

    const cover = screen.getByRole("region", { name: "Page cover" });
    expect(body.contains(cover)).toBe(true);
  });

  it("row panel header stays outside scroll body", () => {
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );

    const body = screen.getByTestId("row-panel-body");
    const closeButton = screen.getByRole("button", { name: "Close row" });
    expect(closeButton).toBeInTheDocument();
    expect(body.contains(closeButton)).toBe(false);

    const openModeButton = screen.getByRole("button", {
      name: "Open in side panel",
    });
    expect(body.contains(openModeButton)).toBe(false);
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

  it("offers Add cover when the full row has no cover", () => {
    renderWithProviders(<DatagridRowFull datagridId={DGID} rowId={ROWID} />, {
      client: seed(),
    });

    expect(
      screen.getByRole("button", { name: "Add cover" }),
    ).toBeInTheDocument();
  });

  it("shows the row cover when one is set", () => {
    renderWithProviders(<DatagridRowFull datagridId={DGID} rowId={ROWID} />, {
      client: seed("https://example.test/row.png"),
    });

    expect(screen.getByRole("img", { name: "Page cover" })).toHaveAttribute(
      "src",
      "https://example.test/row.png",
    );
    expect(
      screen.queryByRole("button", { name: "Add cover" }),
    ).not.toBeInTheDocument();
  });
});

describe("opened row covers", () => {
  it("shows Remove cover on a modal row with a cover", () => {
    renderWithProviders(
      <DatagridRowModal datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed("https://example.test/row.png") },
    );

    expect(screen.getByRole("img", { name: "Page cover" })).toHaveAttribute(
      "src",
      "https://example.test/row.png",
    );
    expect(
      screen.getByRole("button", { name: "Remove cover" }),
    ).toBeInTheDocument();
  });

  it("offers Add cover on a split row without a cover", () => {
    renderWithProviders(
      <DatagridRowSplit datagridId={DGID} rowId={ROWID} onClose={vi.fn()} />,
      { client: seed() },
    );

    expect(
      screen.getByRole("button", { name: "Add cover" }),
    ).toBeInTheDocument();
  });
});

describe("RowOpenModeControl", () => {
  it("switches the open mode in the store", () => {
    renderWithProviders(<RowOpenModeControl />);
    fireEvent.click(screen.getByRole("button", { name: "Open in side panel" }));
    expect(useUIStore.getState().rowOpenMode).toBe("split");
  });
});
