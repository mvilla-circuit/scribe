import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  booksKey,
  collectionsKey,
  entriesKey,
  foldersKey,
} from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import { makeBook, makeCollection, makeEntry } from "@/test/fixtures";
import { server } from "@/test/msw/server";
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
  client.setQueryData(entriesKey, [
    makeEntry({
      id: "e1",
      collection_id: "c1",
      title: "Opening scene",
    }),
  ]);
  return client;
}

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useUIStore.setState({
    activeBookId: null,
    activeCollectionId: "c1",
    activeEntryId: null,
  });
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
    expect(
      screen.getByRole("button", { name: "Opening scene" }),
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
    client.setQueryData(entriesKey, []);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    expect(screen.getByText("This collection is empty")).toBeInTheDocument();
  });

  it("creates and opens a doc", async () => {
    server.use(
      http.post(
        "http://supabase.test/rest/v1/entries",
        () => new HttpResponse(null, { status: 201 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    await user.click(screen.getByRole("button", { name: "New doc" }));

    expect(useUIStore.getState().activeCollectionId).toBe("c1");
    expect(useUIStore.getState().activeEntryId).not.toBeNull();
    expect(client.getQueryData<unknown[]>(entriesKey)).toHaveLength(2);
  });

  it("deletes a doc from the gallery", async () => {
    server.use(
      http.delete(
        "http://supabase.test/rest/v1/entries",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    await user.click(
      screen.getByRole("button", { name: "Actions for Opening scene" }),
    );
    const menu = await screen.findByRole("menu");
    expect(
      within(menu).queryByRole("menuitem", {
        name: "Remove from collection",
      }),
    ).not.toBeInTheDocument();
    await user.click(within(menu).getByRole("menuitem", { name: "Delete" }));

    expect(
      client
        .getQueryData<{ id: string }[]>(entriesKey)
        ?.map((entry) => entry.id),
    ).not.toContain("e1");
  });
});
