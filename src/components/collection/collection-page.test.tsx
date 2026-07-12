import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  booksKey,
  collectionsKey,
  datagridsKey,
  entriesKey,
  foldersKey,
  taggablesKey,
  tagsKey,
  whiteboardsKey,
} from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import {
  makeBook,
  makeCollection,
  makeDatagrid,
  makeEntry,
  makeWhiteboard,
} from "@/test/fixtures";
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
    makeBook({
      id: "b1",
      title: "First Light",
      collection_id: "c1",
      cover_url: "https://example.test/first-light.jpg",
    }),
  ]);
  client.setQueryData(collectionsKey, [
    makeCollection({
      id: "c1",
      name: "The Realm",
      description: "An epic",
      cover_url: "https://example.test/realm.jpg",
    }),
    makeCollection({
      id: "c2",
      name: "Side Tales",
      parent_collection_id: "c1",
      cover_url: "https://example.test/tales.jpg",
    }),
  ]);
  client.setQueryData(entriesKey, [
    makeEntry({
      id: "e1",
      collection_id: "c1",
      title: "Opening scene",
      cover_url: "https://example.test/opening.jpg",
    }),
  ]);
  client.setQueryData(datagridsKey, []);
  client.setQueryData(whiteboardsKey, []);
  client.setQueryData(tagsKey, []);
  client.setQueryData(taggablesKey("collection"), []);
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
    activeWhiteboardId: null,
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

  it("renders the tag row below the description", () => {
    const client = seed();
    client.setQueryData(tagsKey, [{ id: "tag-1", name: "Epic", color: "sky" }]);
    client.setQueryData(taggablesKey("collection"), [
      {
        id: "tg-1",
        tag_id: "tag-1",
        target_type: "collection",
        target_id: "c1",
      },
    ]);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    expect(
      screen
        .getByLabelText("Collection description")
        .compareDocumentPosition(screen.getByRole("button", { name: "Epic" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows tags only on collection cards, never on books or docs", () => {
    const client = seed();
    client.setQueryData(tagsKey, [{ id: "tag-1", name: "Epic", color: "sky" }]);
    // Assign the tag both to the child collection ("Side Tales", id "c2")
    // and — as if by coincidence — to the book's id, to prove the gallery
    // wiring keys off each child's *kind*, not merely whether some taggable
    // row happens to reference its id.
    client.setQueryData(taggablesKey("collection"), [
      {
        id: "tg-1",
        tag_id: "tag-1",
        target_type: "collection",
        target_id: "c2",
      },
      {
        id: "tg-2",
        tag_id: "tag-1",
        target_type: "collection",
        target_id: "b1",
      },
    ]);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    const collectionCard = screen.getByRole("button", {
      name: /^Side Tales/,
    });
    expect(within(collectionCard).getByText("Epic")).toBeInTheDocument();

    const bookCard = screen.getByRole("button", { name: "First Light" });
    expect(within(bookCard).queryByText("Epic")).not.toBeInTheDocument();

    const docCard = screen.getByRole("button", { name: "Opening scene" });
    expect(within(docCard).queryByText("Epic")).not.toBeInTheDocument();
  });

  it("shows datagrid cards belonging to the collection", () => {
    const client = seed();
    client.setQueryData(datagridsKey, [
      makeDatagrid({
        id: "dg1",
        collection_id: "c1",
        name: "World bible",
      }),
    ]);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    expect(
      screen.getByRole("button", { name: "World bible" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Datagrids section name" }),
    ).toHaveValue("Datagrids");
  });

  it("shows and opens whiteboards belonging to the collection", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    client.setQueryData(whiteboardsKey, [
      makeWhiteboard({
        id: "wb1",
        collection_id: "c1",
        name: "Story map",
      }),
    ]);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });
    await user.click(screen.getByRole("button", { name: "Story map" }));

    expect(
      screen.getByRole("textbox", { name: "Whiteboards section name" }),
    ).toHaveValue("Whiteboards");
    expect(useUIStore.getState().activeWhiteboardId).toBe("wb1");
  });

  it("renders default section textboxes when view has no overrides", () => {
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    expect(
      screen.getByRole("textbox", { name: "Collections section name" }),
    ).toHaveValue("Collections");
    expect(
      screen.getByRole("textbox", { name: "Books section name" }),
    ).toHaveValue("Books");
    expect(
      screen.getByRole("textbox", { name: "Docs section name" }),
    ).toHaveValue("Docs");
  });

  it("keeps quiet uppercase muted classes on section headings", () => {
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    const books = screen.getByRole("textbox", { name: "Books section name" });
    expect(books).toHaveClass("uppercase");
    expect(books).toHaveClass("text-muted");
    expect(books).toHaveClass("tracking-wide");
    expect(books).toHaveClass("text-xs");
    expect(books).toHaveClass("font-medium");
  });

  it("renames a section heading and patches collection view", async () => {
    let patchBody: unknown;
    server.use(
      http.patch(
        "http://supabase.test/rest/v1/collections",
        async ({ request }) => {
          patchBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    const books = screen.getByRole("textbox", { name: "Books section name" });
    await user.clear(books);
    await user.type(books, "Novels");
    await user.tab();

    await waitFor(() => {
      expect(patchBody).toEqual({
        view: { layout: "grid", sectionLabels: { book: "Novels" } },
      });
    });
    expect(books).toHaveValue("Novels");
    expect(
      client
        .getQueryData<{ id: string; view: unknown }[]>(collectionsKey)
        ?.find((collection) => collection.id === "c1")?.view,
    ).toEqual({ layout: "grid", sectionLabels: { book: "Novels" } });
  });

  it("clearing a section heading restores the default label", async () => {
    let patchBody: unknown;
    server.use(
      http.patch(
        "http://supabase.test/rest/v1/collections",
        async ({ request }) => {
          patchBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    client.setQueryData(collectionsKey, [
      makeCollection({
        id: "c1",
        name: "The Realm",
        description: "An epic",
        cover_url: "https://example.test/realm.jpg",
        view: { layout: "grid", sectionLabels: { book: "Novels" } },
      }),
      makeCollection({
        id: "c2",
        name: "Side Tales",
        parent_collection_id: "c1",
        cover_url: "https://example.test/tales.jpg",
      }),
    ]);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    const books = screen.getByRole("textbox", { name: "Books section name" });
    expect(books).toHaveValue("Novels");
    await user.clear(books);
    await user.tab();

    await waitFor(() => {
      expect(patchBody).toEqual({ view: { layout: "grid" } });
    });
    expect(books).toHaveValue("Books");
  });

  it("hides section headings while searching", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    await user.type(
      screen.getByRole("searchbox", { name: "Search collection" }),
      "opening",
    );

    expect(
      screen.queryByRole("textbox", { name: "Books section name" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Docs section name" }),
    ).not.toBeInTheDocument();
  });

  it("changing layout keeps section label overrides in the patched view", async () => {
    let patchBody: unknown;
    server.use(
      http.patch(
        "http://supabase.test/rest/v1/collections",
        async ({ request }) => {
          patchBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    client.setQueryData(collectionsKey, [
      makeCollection({
        id: "c1",
        name: "The Realm",
        description: "An epic",
        cover_url: "https://example.test/realm.jpg",
        view: { layout: "grid", sectionLabels: { book: "Novels" } },
      }),
      makeCollection({
        id: "c2",
        name: "Side Tales",
        parent_collection_id: "c1",
        cover_url: "https://example.test/tales.jpg",
      }),
    ]);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    await user.click(screen.getByRole("button", { name: "List view" }));

    await waitFor(() => {
      expect(patchBody).toEqual({
        view: { layout: "list", sectionLabels: { book: "Novels" } },
      });
    });
    expect(
      screen.queryByRole("textbox", { name: "Books section name" }),
    ).not.toBeInTheDocument();
  });

  it("shows the collection and child cover images", () => {
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    expect(screen.getByAltText("Page cover")).toHaveAttribute(
      "src",
      "https://example.test/realm.jpg",
    );
    expect(screen.getAllByRole("presentation")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "https://example.test/tales.jpg" }),
        expect.objectContaining({
          src: "https://example.test/first-light.jpg",
        }),
        expect.objectContaining({ src: "https://example.test/opening.jpg" }),
      ]),
    );
  });

  it("filters gallery items by search", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    await user.type(
      screen.getByRole("searchbox", { name: "Search collection" }),
      "opening",
    );
    expect(
      screen.getByRole("button", { name: "Opening scene" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "First Light" }),
    ).not.toBeInTheDocument();
  });

  it("switches to a flat list and persists its layout preference", async () => {
    let patchBody: unknown;
    server.use(
      http.patch(
        "http://supabase.test/rest/v1/collections",
        async ({ request }) => {
          patchBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    await user.click(screen.getByRole("button", { name: "List view" }));

    expect(
      screen.getByRole("button", { name: "First Light" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Opening scene" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Side Tales" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Collection")).not.toBeInTheDocument();
    expect(screen.queryByText("Book")).not.toBeInTheDocument();
    expect(screen.queryByText("Doc")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /section name$/ }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(patchBody).toEqual({ view: { layout: "list" } });
    });
    expect(
      client
        .getQueryData<{ id: string; view: unknown }[]>(collectionsKey)
        ?.find((collection) => collection.id === "c1")?.view,
    ).toEqual({ layout: "list" });
  });

  it("orders list items alphabetically by default", async () => {
    server.use(
      http.patch(
        "http://supabase.test/rest/v1/collections",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    await user.click(screen.getByRole("button", { name: "List view" }));

    const rows = screen.getAllByRole("button", {
      name: /^(First Light|Opening scene|Side Tales)/,
    });
    expect(rows[0]).toHaveAccessibleName("First Light");
    expect(rows[1]).toHaveAccessibleName("Opening scene");
    expect(rows[2]).toHaveAccessibleName("Side Tales");
  });

  it("orders sectioned grid cards alphabetically by default", () => {
    const client = seed();
    client.setQueryData(booksKey, [
      makeBook({
        id: "b-zeta",
        title: "Zeta Book",
        collection_id: "c1",
        position: 100,
      }),
      makeBook({
        id: "b-alpha",
        title: "Alpha Book",
        collection_id: "c1",
        position: 200,
      }),
    ]);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    const bookCards = screen.getAllByRole("button", {
      name: /^(Alpha Book|Zeta Book)$/,
    });
    expect(bookCards[0]).toHaveAccessibleName("Alpha Book");
    expect(bookCards[1]).toHaveAccessibleName("Zeta Book");
  });

  it("shows a no matches message for an empty filter", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    await user.type(
      screen.getByRole("searchbox", { name: "Search collection" }),
      "missing",
    );

    expect(screen.getByText("No matches")).toBeInTheDocument();
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
    client.setQueryData(datagridsKey, []);
    client.setQueryData(whiteboardsKey, []);
    client.setQueryData(tagsKey, []);
    client.setQueryData(taggablesKey("collection"), []);

    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    expect(screen.getByText("This collection is empty")).toBeInTheDocument();
  });

  it("keeps New book as the primary action and nests other creates under +", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<CollectionPage collectionId="c1" />, {
      client: seed(),
    });

    const toolbar = screen.getByRole("navigation", {
      name: "Collection settings",
    });
    expect(
      within(toolbar).getByRole("button", { name: "New book" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).queryByRole("button", { name: "New doc" }),
    ).not.toBeInTheDocument();
    expect(
      within(toolbar).queryByRole("button", { name: "New collection" }),
    ).not.toBeInTheDocument();

    await user.click(
      within(toolbar).getByRole("button", { name: "More create options" }),
    );
    const menu = await screen.findByRole("menu");
    expect(
      within(menu).getByRole("menuitem", { name: "New doc" }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "New collection" }),
    ).toBeInTheDocument();
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

    const toolbar = screen.getByRole("navigation", {
      name: "Collection settings",
    });
    await user.click(
      within(toolbar).getByRole("button", { name: "More create options" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "New doc" }));

    expect(useUIStore.getState().activeCollectionId).toBe("c1");
    expect(useUIStore.getState().activeEntryId).not.toBeNull();
    expect(client.getQueryData<unknown[]>(entriesKey)).toHaveLength(2);
  });

  it("creates and opens a whiteboard", async () => {
    server.use(
      http.post(
        "http://supabase.test/rest/v1/whiteboards",
        () => new HttpResponse(null, { status: 201 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    renderWithProviders(<CollectionPage collectionId="c1" />, { client });

    const toolbar = screen.getByRole("navigation", {
      name: "Collection settings",
    });
    await user.click(
      within(toolbar).getByRole("button", { name: "More create options" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "New whiteboard" }));

    expect(useUIStore.getState().activeWhiteboardId).not.toBeNull();
    expect(client.getQueryData<unknown[]>(whiteboardsKey)).toHaveLength(1);
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
