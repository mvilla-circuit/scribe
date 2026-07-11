import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { booksKey, collectionsKey, foldersKey } from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import { makeBook, makeCollection, makeFolder } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { SidebarTree } from "./sidebar-tree";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// SidebarTree's mutation hooks read the session via useAuth; a lightweight stub
// avoids standing up the real (Tauri/Supabase-backed) AuthProvider in a test
// that never triggers a mutation.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: null }),
}));

// Radix menus probe pointer-capture and scroll their focused item into view;
// jsdom implements neither, so polyfill them for the dropdown to open.
beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useUIStore.setState({ activeBookId: null, activeCollectionId: null });
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
