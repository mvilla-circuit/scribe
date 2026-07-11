import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { booksKey, collectionsKey, foldersKey } from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import { makeBook, makeCollection } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { MainEmptyState } from "./main-empty-state";

// The create hooks and session details read the auth session; a lightweight
// stub avoids standing up the real (Tauri/Supabase-backed) AuthProvider.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function seed({
  books = [],
  collections = [],
}: {
  books?: ReturnType<typeof makeBook>[];
  collections?: ReturnType<typeof makeCollection>[];
} = {}) {
  const client = createTestQueryClient();
  client.setQueryData(foldersKey, []);
  client.setQueryData(booksKey, books);
  client.setQueryData(collectionsKey, collections);
  return client;
}

beforeEach(() => {
  useUIStore.setState({ activeBookId: null, activeCollectionId: null });
});

describe("MainEmptyState actions", () => {
  it("renders New book, New collection, and New folder actions", () => {
    renderWithProviders(<MainEmptyState />, { client: seed() });

    expect(
      screen.getByRole("button", { name: "New book" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New collection" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New folder" }),
    ).toBeInTheDocument();
  });

  it("opens a new book when New book is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MainEmptyState />, { client: seed() });

    await user.click(screen.getByRole("button", { name: "New book" }));

    expect(useUIStore.getState().activeBookId).not.toBeNull();
  });

  it("creates and opens a new collection when New collection is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MainEmptyState />, { client: seed() });

    await user.click(screen.getByRole("button", { name: "New collection" }));

    expect(useUIStore.getState().activeCollectionId).not.toBeNull();
  });
});

describe("MainEmptyState recent", () => {
  it("merges books and collections into Recent, newest first", () => {
    const book = makeBook({
      id: "b1",
      title: "Holy Bible",
      updated_at: "2026-02-01T00:00:00.000Z",
    });
    const collection = makeCollection({
      id: "c1",
      name: "The Realm",
      description: "An epic",
      updated_at: "2026-03-01T00:00:00.000Z",
    });
    renderWithProviders(<MainEmptyState />, {
      client: seed({ books: [book], collections: [collection] }),
    });

    const collectionRow = screen.getByRole("button", { name: /The Realm/ });
    const bookRow = screen.getByRole("button", { name: /Holy Bible/ });
    expect(collectionRow).toBeInTheDocument();
    expect(bookRow).toBeInTheDocument();
    // The collection is newer, so it sorts above the book.
    expect(
      collectionRow.compareDocumentPosition(bookRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens a collection from the Recent list", async () => {
    const user = userEvent.setup();
    const collection = makeCollection({ id: "c1", name: "The Realm" });
    renderWithProviders(<MainEmptyState />, {
      client: seed({ collections: [collection] }),
    });

    await user.click(screen.getByRole("button", { name: /The Realm/ }));

    expect(useUIStore.getState().activeCollectionId).toBe("c1");
  });

  it("shows the empty message when there are no books and no collections", () => {
    renderWithProviders(<MainEmptyState />, { client: seed() });
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  });

  it("hides the empty message when only a collection exists", () => {
    renderWithProviders(<MainEmptyState />, {
      client: seed({ collections: [makeCollection({ id: "c1" })] }),
    });
    expect(screen.queryByText(/nothing here yet/i)).toBeNull();
  });
});
