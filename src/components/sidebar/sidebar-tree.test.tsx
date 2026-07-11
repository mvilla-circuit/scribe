import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  booksKey,
  collectionsKey,
  datagridsKey,
  entriesKey,
  foldersKey,
  whiteboardsKey,
} from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import {
  makeBook,
  makeCollection,
  makeEntry,
  makeFolder,
  makeWhiteboard,
} from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { SidebarTree } from "./sidebar-tree";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

// Radix menus probe pointer-capture and scroll their focused item into view;
// jsdom implements neither, so polyfill them for the dropdown to open.
beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useUIStore.setState({
    activeBookId: null,
    activeCollectionId: null,
    activeEntryId: null,
    activeWhiteboardId: null,
    expandedFolderIds: [],
  });
});

function seedClient() {
  const client = createTestQueryClient();
  client.setQueryData(foldersKey, [
    makeFolder({ id: "f1", name: "My Folder" }),
  ]);
  client.setQueryData(booksKey, [
    makeBook({ id: "bk1", title: "My Book", folder_id: null }),
  ]);
  client.setQueryData(collectionsKey, []);
  client.setQueryData(entriesKey, []);
  client.setQueryData(datagridsKey, []);
  client.setQueryData(whiteboardsKey, []);
  return client;
}

// Call only after userEvent.setup(), which installs its own clipboard stub.
function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

describe("SidebarTree copy link", () => {
  it("copies the book link from a book row menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const writeText = mockClipboard();
    renderWithProviders(<SidebarTree />, { client: seedClient() });

    const bookRow = screen.getByRole("treeitem", { name: /My Book/ });
    await user.click(
      within(bookRow).getByRole("button", { name: "More actions" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Copy link" }),
    );

    expect(writeText).toHaveBeenCalledWith("scribe://book/bk1");
  });

  it("does not offer copy link on a folder row menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<SidebarTree />, { client: seedClient() });

    const folderRow = screen.getByRole("treeitem", { name: /My Folder/ });
    await user.click(
      within(folderRow).getByRole("button", { name: "More actions" }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Rename" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Copy link" }),
    ).not.toBeInTheDocument();
  });
});

describe("SidebarTree collections", () => {
  function seedWithCollection() {
    const client = createTestQueryClient();
    client.setQueryData(foldersKey, []);
    client.setQueryData(booksKey, []);
    client.setQueryData(collectionsKey, [
      makeCollection({ id: "c1", name: "The Realm" }),
    ]);
    client.setQueryData(entriesKey, []);
    client.setQueryData(datagridsKey, []);
    client.setQueryData(whiteboardsKey, []);
    return client;
  }

  it("renders a collection row and opens it on click", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<SidebarTree />, { client: seedWithCollection() });

    const row = screen.getByRole("treeitem", { name: /The Realm/ });
    await user.click(row);

    expect(useUIStore.getState().activeCollectionId).toBe("c1");
  });

  it("offers create-inside and move actions on a collection row menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<SidebarTree />, { client: seedWithCollection() });

    const row = screen.getByRole("treeitem", { name: /The Realm/ });
    await user.click(within(row).getByRole("button", { name: "More actions" }));

    expect(
      await screen.findByRole("menuitem", { name: "New book" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "New collection" }),
    ).toBeInTheDocument();
    // A lone root collection has no other collection to move into and is already
    // at the top level, so the "Move to" submenu is omitted.
    expect(
      screen.queryByRole("menuitem", { name: "Move to" }),
    ).not.toBeInTheDocument();
  });
});

describe("SidebarTree collection docs", () => {
  function seedWithEntry() {
    const client = createTestQueryClient();
    client.setQueryData(foldersKey, []);
    client.setQueryData(booksKey, []);
    client.setQueryData(collectionsKey, [
      makeCollection({ id: "c1", name: "The Realm" }),
    ]);
    client.setQueryData(entriesKey, [
      makeEntry({
        id: "e1",
        collection_id: "c1",
        title: "Opening scene",
      }),
    ]);
    client.setQueryData(datagridsKey, []);
    client.setQueryData(whiteboardsKey, []);
    return client;
  }

  it("renders an entry under an expanded collection and opens it on click", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    useUIStore.setState({ expandedFolderIds: ["c1"] });
    renderWithProviders(<SidebarTree />, { client: seedWithEntry() });

    const row = screen.getByRole("treeitem", { name: /Opening scene/ });
    await user.click(row);

    expect(useUIStore.getState()).toMatchObject({
      activeCollectionId: "c1",
      activeEntryId: "e1",
    });
  });

  it("creates and opens a doc from the collection menu", async () => {
    server.use(
      http.post(
        "http://supabase.test/rest/v1/entries",
        () => new HttpResponse(null, { status: 201 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seedWithEntry();
    renderWithProviders(<SidebarTree />, { client });

    const collection = screen.getByRole("treeitem", { name: /The Realm/ });
    await user.click(
      within(collection).getByRole("button", { name: "More actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "New doc" }));

    expect(useUIStore.getState().activeCollectionId).toBe("c1");
    expect(useUIStore.getState().activeEntryId).not.toBeNull();
    expect(screen.getByRole("textbox")).toHaveValue("Untitled");
    expect(client.getQueryData<unknown[]>(entriesKey)).toHaveLength(2);
  });

  it("describes collection children according to their cascade behavior", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = createTestQueryClient();
    client.setQueryData(foldersKey, []);
    client.setQueryData(booksKey, [
      makeBook({ id: "b1", title: "First Light", collection_id: "c1" }),
    ]);
    client.setQueryData(collectionsKey, [
      makeCollection({ id: "c1", name: "The Realm" }),
    ]);
    client.setQueryData(entriesKey, [
      makeEntry({
        id: "e1",
        collection_id: "c1",
        title: "Opening scene",
      }),
    ]);
    client.setQueryData(datagridsKey, []);
    client.setQueryData(whiteboardsKey, [
      makeWhiteboard({
        id: "wb1",
        collection_id: "c1",
        name: "Story map",
      }),
    ]);
    renderWithProviders(<SidebarTree />, { client });

    const collection = screen.getByRole("treeitem", { name: /The Realm/ });
    await user.click(
      within(collection).getByRole("button", { name: "More actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/move to the top level/i);
    expect(dialog).toHaveTextContent(/doc.*permanently deleted/i);
    expect(dialog).toHaveTextContent(/whiteboard.*permanently deleted/i);
    expect(dialog).not.toHaveTextContent(
      /The 2 items inside will move to the top level/,
    );
  });

  it("uses doc wording when confirming entry delete", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    useUIStore.setState({ expandedFolderIds: ["c1"] });
    renderWithProviders(<SidebarTree />, { client: seedWithEntry() });

    const row = screen.getByRole("treeitem", { name: /Opening scene/ });
    await user.click(within(row).getByRole("button", { name: "More actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent('Delete "Opening scene"?');
    expect(dialog).toHaveTextContent("This permanently deletes the doc.");
    expect(dialog).not.toHaveTextContent(/book and everything inside/i);
  });
});

describe("SidebarTree collection whiteboards", () => {
  function seedWithWhiteboard() {
    const client = createTestQueryClient();
    client.setQueryData(foldersKey, []);
    client.setQueryData(booksKey, []);
    client.setQueryData(collectionsKey, [
      makeCollection({ id: "c1", name: "The Realm" }),
    ]);
    client.setQueryData(entriesKey, []);
    client.setQueryData(datagridsKey, []);
    client.setQueryData(whiteboardsKey, [
      makeWhiteboard({
        id: "wb1",
        collection_id: "c1",
        name: "Story map",
      }),
    ]);
    return client;
  }

  it("renders a whiteboard under its collection and opens it", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    useUIStore.setState({ expandedFolderIds: ["c1"] });
    renderWithProviders(<SidebarTree />, { client: seedWithWhiteboard() });

    await user.click(screen.getByRole("treeitem", { name: /Story map/ }));

    expect(useUIStore.getState().activeWhiteboardId).toBe("wb1");
  });

  it("creates and opens a whiteboard from the collection menu", async () => {
    server.use(
      http.post(
        "http://supabase.test/rest/v1/whiteboards",
        () => new HttpResponse(null, { status: 201 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seedWithWhiteboard();
    renderWithProviders(<SidebarTree />, { client });

    const collection = screen.getByRole("treeitem", { name: /The Realm/ });
    await user.click(
      within(collection).getByRole("button", { name: "More actions" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "New whiteboard" }),
    );

    expect(useUIStore.getState().activeWhiteboardId).not.toBeNull();
    expect(screen.getByRole("textbox")).toHaveValue("Untitled");
    expect(client.getQueryData<unknown[]>(whiteboardsKey)).toHaveLength(2);
  });

  it("clears the active whiteboard when deleting its collection", async () => {
    server.use(
      http.delete(
        "http://supabase.test/rest/v1/collections",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seedWithWhiteboard();
    useUIStore.getState().setActiveWhiteboard("wb1");
    renderWithProviders(<SidebarTree />, { client });

    const collection = screen.getByRole("treeitem", { name: /The Realm/ });
    await user.click(
      within(collection).getByRole("button", { name: "More actions" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(useUIStore.getState().activeWhiteboardId).toBeNull();
  });
});
