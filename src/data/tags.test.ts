import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { taggablesKey, tagsKey } from "@/data/query-keys";
import { swatchForIndex } from "@/lib/swatches";
import { makeTag, makeTaggable } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import {
  type Tag,
  type Taggable,
  tagsForCollection,
  useAssignCollectionTag,
  useUnassignCollectionTag,
  useUpdateTagColor,
} from "./tags";

// Avoid pulling auth.tsx (and its Tauri plugin imports) into the test runtime;
// the hooks under test only read the session's user id.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const TAGS_URL = "http://supabase.test/rest/v1/tags";
const TAGGABLES_URL = "http://supabase.test/rest/v1/taggables";
const COLLECTION_TAGGABLES_KEY = taggablesKey("collection");

describe("tagsForCollection", () => {
  it("joins tags and taggables to the tags assigned to one collection", () => {
    const tags = [
      makeTag({ id: "tag-1", name: "Fantasy" }),
      makeTag({ id: "tag-2", name: "Sci-Fi" }),
      makeTag({ id: "tag-3", name: "Unused" }),
    ];
    const taggables = [
      makeTaggable({ id: "t1", tag_id: "tag-1", target_id: "collection-1" }),
      makeTaggable({ id: "t2", tag_id: "tag-2", target_id: "collection-1" }),
      makeTaggable({ id: "t3", tag_id: "tag-1", target_id: "collection-2" }),
      makeTaggable({
        id: "t4",
        tag_id: "tag-3",
        target_type: "book",
        target_id: "collection-1",
      }),
    ];

    expect(
      tagsForCollection(tags, taggables, "collection-1").map((tag) => tag.id),
    ).toEqual(["tag-1", "tag-2"]);
    expect(tagsForCollection(tags, taggables, "collection-2")).toEqual([
      tags[0],
    ]);
    expect(tagsForCollection(tags, taggables, "collection-3")).toEqual([]);
  });
});

describe("useAssignCollectionTag", () => {
  it("creates a tag with a default swatch and assigns it to the collection", async () => {
    let insertedTag: { name?: unknown; color?: unknown } | undefined;
    let insertedTaggable:
      | { tag_id?: unknown; target_type?: unknown; target_id?: unknown }
      | undefined;
    server.use(
      http.post(TAGS_URL, async ({ request }) => {
        insertedTag = (await request.json()) as typeof insertedTag;
        return new HttpResponse(null, { status: 201 });
      }),
      http.post(TAGGABLES_URL, async ({ request }) => {
        insertedTaggable = (await request.json()) as typeof insertedTaggable;
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(tagsKey, []);
    client.setQueryData(COLLECTION_TAGGABLES_KEY, []);

    const { result } = renderHookWithQuery(() => useAssignCollectionTag(), {
      client,
    });
    result.current.mutate({ collectionId: "collection-1", name: "Fantasy" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(insertedTag).toMatchObject({
      name: "Fantasy",
      color: swatchForIndex(0),
    });

    const tags = client.getQueryData<Tag[]>(tagsKey);
    expect(tags).toHaveLength(1);
    expect(tags?.[0]).toMatchObject({
      name: "Fantasy",
      color: swatchForIndex(0),
      user_id: "user-1",
    });

    const createdTagId = tags?.[0]?.id;
    expect(insertedTaggable).toMatchObject({
      tag_id: createdTagId,
      target_type: "collection",
      target_id: "collection-1",
    });

    const taggables = client.getQueryData<Taggable[]>(COLLECTION_TAGGABLES_KEY);
    expect(taggables).toHaveLength(1);
    expect(taggables?.[0]).toMatchObject({
      tag_id: createdTagId,
      target_type: "collection",
      target_id: "collection-1",
    });
  });

  it("reuses an existing tag by case-insensitive name", async () => {
    let sawTagInsert = false;
    server.use(
      http.post(TAGS_URL, () => {
        sawTagInsert = true;
        return new HttpResponse(null, { status: 201 });
      }),
      http.post(TAGGABLES_URL, () => new HttpResponse(null, { status: 201 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(tagsKey, [makeTag({ id: "tag-1", name: "Fantasy" })]);
    client.setQueryData(COLLECTION_TAGGABLES_KEY, []);

    const { result } = renderHookWithQuery(() => useAssignCollectionTag(), {
      client,
    });
    result.current.mutate({ collectionId: "collection-1", name: "FANTASY" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(sawTagInsert).toBe(false);
    expect(client.getQueryData<Tag[]>(tagsKey)).toHaveLength(1);
    const taggables = client.getQueryData<Taggable[]>(COLLECTION_TAGGABLES_KEY);
    expect(taggables).toHaveLength(1);
    expect(taggables?.[0]).toMatchObject({
      tag_id: "tag-1",
      target_id: "collection-1",
    });
  });

  it("does not double-assign the same tag", async () => {
    server.use(
      http.post(TAGS_URL, () => new HttpResponse(null, { status: 201 })),
      http.post(TAGGABLES_URL, () => new HttpResponse(null, { status: 201 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(tagsKey, []);
    client.setQueryData(COLLECTION_TAGGABLES_KEY, []);

    const { result } = renderHookWithQuery(() => useAssignCollectionTag(), {
      client,
    });

    result.current.mutate({ collectionId: "collection-1", name: "Fantasy" });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.mutate({ collectionId: "collection-1", name: "Fantasy" });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.getQueryData<Tag[]>(tagsKey)).toHaveLength(1);
    expect(
      client.getQueryData<Taggable[]>(COLLECTION_TAGGABLES_KEY),
    ).toHaveLength(1);
  });

  it("treats a unique-violation race on the taggable insert as a success no-op", async () => {
    server.use(
      http.post(TAGGABLES_URL, () =>
        HttpResponse.json(
          { code: "23505", message: "duplicate key value" },
          { status: 409 },
        ),
      ),
    );

    const client = createTestQueryClient();
    client.setQueryData(tagsKey, [makeTag({ id: "tag-1", name: "Fantasy" })]);
    client.setQueryData(COLLECTION_TAGGABLES_KEY, []);

    const { result } = renderHookWithQuery(() => useAssignCollectionTag(), {
      client,
    });
    result.current.mutate({ collectionId: "collection-1", name: "Fantasy" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe("useUnassignCollectionTag", () => {
  it("unassigns without deleting the tag row", async () => {
    server.use(
      http.delete(TAGGABLES_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    const tag = makeTag({ id: "tag-1", name: "Fantasy" });
    client.setQueryData(tagsKey, [tag]);
    client.setQueryData(COLLECTION_TAGGABLES_KEY, [
      makeTaggable({
        id: "taggable-1",
        tag_id: "tag-1",
        target_id: "collection-1",
      }),
    ]);

    const { result } = renderHookWithQuery(() => useUnassignCollectionTag(), {
      client,
    });
    result.current.mutate({ collectionId: "collection-1", tagId: "tag-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(client.getQueryData<Taggable[]>(COLLECTION_TAGGABLES_KEY)).toEqual(
      [],
    );
    // The tag row itself is never touched by an unassign.
    expect(client.getQueryData<Tag[]>(tagsKey)).toEqual([tag]);
  });
});

describe("useUpdateTagColor", () => {
  it("updates tag color", async () => {
    let patch: { color?: unknown } | undefined;
    server.use(
      http.patch(TAGS_URL, async ({ request }) => {
        patch = (await request.json()) as { color?: unknown };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(tagsKey, [
      makeTag({ id: "tag-1", name: "Fantasy", color: "sky" }),
    ]);

    const { result } = renderHookWithQuery(() => useUpdateTagColor(), {
      client,
    });
    result.current.mutate({ tagId: "tag-1", color: "moss" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(patch?.color).toBe("moss");
    expect(client.getQueryData<Tag[]>(tagsKey)?.[0]?.color).toBe("moss");
  });
});
