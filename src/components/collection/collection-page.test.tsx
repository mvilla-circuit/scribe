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

import { CollectionPage } from "./collection-page";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

function seed() {
  const client = createTestQueryClient();
  client.setQueryData(foldersKey, []);
  client.setQueryData(booksKey, [
    makeBook({ id: "b1", title: "First Light", collection_id: "c1" }),
  ]);
  client.setQueryData(collectionsKey, [
    makeCollection({ id: "c1", name: "The Realm", description: "An epic" }),
    makeCollection({
      id: "c2",
      name: "Side Tales",
      parent_collection_id: "c1",
    }),
  ]);
  return client;
}

beforeEach(() => {
  useUIStore.setState({ activeBookId: null, activeCollectionId: "c1" });
});

describe("CollectionPage", () => {
  it("shows the collection name, description, and its book and sub-collection cards", () => {
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    expect(screen.getByLabelText("Collection name")).toHaveValue("The Realm");
    expect(screen.getByLabelText("Collection description")).toHaveValue(
      "An epic",
    );
    expect(
      screen.getByRole("button", { name: "First Light" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Side Tales" }),
    ).toBeInTheDocument();
  });

  it("opens a child collection when its card is clicked", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    await user.click(screen.getByRole("button", { name: "Side Tales" }));

    expect(useUIStore.getState().activeCollectionId).toBe("c2");
  });

  it("renders an empty state for a collection with no items", () => {
    const client = createTestQueryClient();
    client.setQueryData(foldersKey, []);
    client.setQueryData(booksKey, []);
    client.setQueryData(collectionsKey, [makeCollection({ id: "c1" })]);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    expect(screen.getByText("This collection is empty")).toBeInTheDocument();
  });
});
