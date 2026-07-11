import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import {
  makeBook,
  makeCollection,
  makeEntry,
  makeWhiteboard,
} from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useMoveCollection,
  useUpdateCollection,
} from "./collections";

// Avoid pulling auth.tsx (and its Tauri plugin imports) into the test runtime;
// the hooks under test only read the session's user id.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const COLLECTIONS_URL = "http://supabase.test/rest/v1/collections";

describe("useCollections", () => {
  it("returns the user's collections sorted by position", async () => {
    server.use(
      http.get(COLLECTIONS_URL, () =>
        HttpResponse.json([
          makeCollection({ id: "c2", position: 2048 }),
          makeCollection({ id: "c1", position: 1024 }),
        ]),
      ),
    );

    const { result } = renderHookWithQuery(() => useCollections());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("surfaces an error when the request fails", async () => {
    server.use(
      http.get(COLLECTIONS_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHookWithQuery(() => useCollections());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe("useCreateCollection", () => {
  it("optimistically appends the collection ordered by position, stamped with the real user id", async () => {
    server.use(
      http.post(COLLECTIONS_URL, () => new HttpResponse(null, { status: 201 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(
      ["collections"],
      [makeCollection({ id: "c1", position: 1024 })],
    );

    const { result } = renderHookWithQuery(() => useCreateCollection(), {
      client,
    });
    result.current.mutate({ id: "c2", name: "New", position: 2048 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const collections = client.getQueryData<{ id: string; user_id: string }[]>([
      "collections",
    ]);
    expect(collections?.map((c) => c.id)).toEqual(["c1", "c2"]);
    // The optimistic row must carry the signed-in user id (never ""), matching
    // the row the mutationFn inserts so RLS-bound ids never diverge.
    expect(collections?.find((c) => c.id === "c2")?.user_id).toBe("user-1");
  });

  it("nests a new collection under a parent_collection_id", async () => {
    let inserted: { parent_collection_id?: unknown } | undefined;
    server.use(
      http.post(COLLECTIONS_URL, async ({ request }) => {
        inserted = (await request.json()) as { parent_collection_id?: unknown };
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(["collections"], []);

    const { result } = renderHookWithQuery(() => useCreateCollection(), {
      client,
    });
    result.current.mutate({
      id: "c2",
      name: "Child",
      parent_collection_id: "c1",
      position: 1024,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(inserted?.parent_collection_id).toBe("c1");
    expect(
      client.getQueryData<{ parent_collection_id: string | null }[]>([
        "collections",
      ])?.[0]?.parent_collection_id,
    ).toBe("c1");
  });
});

describe("useMoveCollection", () => {
  it("reparents and repositions a collection", async () => {
    let patch:
      { parent_collection_id?: unknown; position?: unknown } | undefined;
    server.use(
      http.patch(COLLECTIONS_URL, async ({ request }) => {
        patch = (await request.json()) as {
          parent_collection_id?: unknown;
          position?: unknown;
        };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(
      ["collections"],
      [
        makeCollection({
          id: "c1",
          parent_collection_id: null,
          position: 1024,
        }),
      ],
    );

    const { result } = renderHookWithQuery(() => useMoveCollection(), {
      client,
    });
    result.current.mutate({
      id: "c1",
      parent_collection_id: "c2",
      position: 4096,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patch).toMatchObject({
      parent_collection_id: "c2",
      position: 4096,
    });
    const collection = client.getQueryData<
      { parent_collection_id: string | null; position: number }[]
    >(["collections"])?.[0];
    expect(collection?.parent_collection_id).toBe("c2");
    expect(collection?.position).toBe(4096);
  });
});

describe("useDeleteCollection", () => {
  it("reparents surviving children, removes collection entries, and invalidates affected caches", async () => {
    server.use(
      http.delete(
        COLLECTIONS_URL,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    client.setQueryData(
      ["collections"],
      [
        makeCollection({ id: "c1", parent_collection_id: null, position: 512 }),
        makeCollection({
          id: "child",
          parent_collection_id: "c1",
          position: 1024,
        }),
        makeCollection({
          id: "keep",
          parent_collection_id: null,
          position: 2048,
        }),
      ],
    );
    client.setQueryData(
      ["books"],
      [
        makeBook({ id: "b1", collection_id: "c1" }),
        makeBook({ id: "b2", collection_id: null }),
      ],
    );
    client.setQueryData(
      ["entries"],
      [
        makeEntry({ id: "e1", collection_id: "c1" }),
        makeEntry({ id: "e2", collection_id: "keep" }),
      ],
    );
    client.setQueryData(
      ["whiteboards"],
      [
        makeWhiteboard({ id: "wb1", collection_id: "c1" }),
        makeWhiteboard({ id: "wb2", collection_id: "keep" }),
      ],
    );
    client.setQueryData(["whiteboard-scene", "wb1"], { version: 1 });
    client.setQueryData(["whiteboard-scene", "wb2"], { version: 1 });

    const { result } = renderHookWithQuery(() => useDeleteCollection(), {
      client,
    });
    result.current.mutate({ id: "c1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const collections = client.getQueryData<
      { id: string; parent_collection_id: string | null }[]
    >(["collections"]);
    // The deleted collection is gone and its direct child is reparented to the
    // top level rather than left pointing at a container that no longer exists.
    expect(collections?.map((c) => c.id)).toEqual(["child", "keep"]);
    expect(
      collections?.find((c) => c.id === "child")?.parent_collection_id,
    ).toBeNull();

    // Books referencing the deleted collection are nulled in the same tick, so
    // they never vanish from the tree between the delete and the refetch.
    const books = client.getQueryData<
      { id: string; collection_id: string | null }[]
    >(["books"]);
    expect(books?.find((b) => b.id === "b1")?.collection_id).toBeNull();
    expect(books?.find((b) => b.id === "b2")?.collection_id).toBeNull();

    expect(
      client
        .getQueryData<{ id: string }[]>(["entries"])
        ?.map((entry) => entry.id),
    ).toEqual(["e2"]);
    expect(
      client
        .getQueryData<{ id: string }[]>(["whiteboards"])
        ?.map((whiteboard) => whiteboard.id),
    ).toEqual(["wb2"]);
    expect(client.getQueryData(["whiteboard-scene", "wb1"])).toBeUndefined();
    expect(client.getQueryData(["whiteboard-scene", "wb2"])).toEqual({
      version: 1,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["collections"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["books"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["entries"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["whiteboards"] });
  });

  it("rolls back both caches when the server rejects the delete", async () => {
    server.use(
      http.delete(
        COLLECTIONS_URL,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const client = createTestQueryClient();
    client.setQueryData(
      ["collections"],
      [
        makeCollection({ id: "c1", parent_collection_id: null, position: 512 }),
        makeCollection({
          id: "child",
          parent_collection_id: "c1",
          position: 1024,
        }),
      ],
    );
    client.setQueryData(
      ["books"],
      [makeBook({ id: "b1", collection_id: "c1" })],
    );

    const { result } = renderHookWithQuery(() => useDeleteCollection(), {
      client,
    });
    result.current.mutate({ id: "c1" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const collections = client.getQueryData<
      { id: string; parent_collection_id: string | null }[]
    >(["collections"]);
    expect(collections?.map((c) => c.id)).toEqual(["c1", "child"]);
    expect(
      collections?.find((c) => c.id === "child")?.parent_collection_id,
    ).toBe("c1");
    expect(
      client.getQueryData<{ id: string; collection_id: string | null }[]>([
        "books",
      ])?.[0]?.collection_id,
    ).toBe("c1");
  });
});

describe("useUpdateCollection", () => {
  it("patches a cover URL", async () => {
    let patch: { cover_url?: unknown } | undefined;
    server.use(
      http.patch(COLLECTIONS_URL, async ({ request }) => {
        patch = (await request.json()) as { cover_url?: unknown };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(
      ["collections"],
      [makeCollection({ id: "c1", cover_url: null })],
    );

    const { result } = renderHookWithQuery(() => useUpdateCollection(), {
      client,
    });
    result.current.mutate({
      id: "c1",
      cover_url: "https://example.test/cover.png",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patch?.cover_url).toBe("https://example.test/cover.png");
    expect(
      client.getQueryData<{ cover_url: string | null }[]>(["collections"])?.[0]
        ?.cover_url,
    ).toBe("https://example.test/cover.png");
  });

  it("patches the collection view", async () => {
    const view = { layout: "list" };
    let patch: { view?: unknown } | undefined;
    server.use(
      http.patch(COLLECTIONS_URL, async ({ request }) => {
        patch = (await request.json()) as { view?: unknown };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(["collections"], [makeCollection({ id: "c1" })]);

    const { result } = renderHookWithQuery(() => useUpdateCollection(), {
      client,
    });
    result.current.mutate({ id: "c1", view });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patch?.view).toEqual(view);
    expect(
      client.getQueryData<{ view: unknown }[]>(["collections"])?.[0]?.view,
    ).toEqual(view);
  });

  it("persists a description change to the cache", async () => {
    server.use(
      http.patch(
        COLLECTIONS_URL,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const client = createTestQueryClient();
    client.setQueryData(
      ["collections"],
      [makeCollection({ id: "c1", description: null })],
    );

    const { result } = renderHookWithQuery(() => useUpdateCollection(), {
      client,
    });
    result.current.mutate({ id: "c1", description: "A saga in five books" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const cached = client.getQueryData<{ description: string | null }[]>([
      "collections",
    ]);
    expect(cached?.[0]?.description).toBe("A saga in five books");
  });

  it("rolls back the optimistic description change when the server rejects it", async () => {
    server.use(
      http.patch(
        COLLECTIONS_URL,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const client = createTestQueryClient();
    client.setQueryData(
      ["collections"],
      [makeCollection({ id: "c1", description: null })],
    );

    const { result } = renderHookWithQuery(() => useUpdateCollection(), {
      client,
    });
    result.current.mutate({ id: "c1", description: "Nope" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(
      client.getQueryData<{ description: string | null }[]>([
        "collections",
      ])?.[0]?.description,
    ).toBeNull();
  });
});
