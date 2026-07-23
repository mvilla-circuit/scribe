import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeEntry } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import type { EntryMeta } from "./entries";
import {
  entryFontOverrides,
  useCreateEntry,
  useDeleteEntry,
  useEntries,
  useEntryContent,
  useMoveEntry,
  useRenameEntry,
  useUpdateEntry,
  useUpdateEntryContent,
  useUpdateEntryFontOverrides,
} from "./entries";
import { entriesKey, entryContentKey } from "./query-keys";

// The data hooks read the session for the user id; stub auth so we don't pull
// auth.tsx (and its Tauri plugin imports) into the test runtime.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const ENTRIES_URL = "http://supabase.test/rest/v1/entries";

describe("entryFontOverrides", () => {
  it("returns the stored map when it is a plain object", () => {
    const entry = makeEntry({ font_overrides: { display: "lora" } });
    expect(entryFontOverrides(entry)).toEqual({ display: "lora" });
  });

  it("falls back to an empty map for null, arrays, and non-objects", () => {
    expect(entryFontOverrides(makeEntry({ font_overrides: null }))).toEqual({});
    expect(entryFontOverrides(makeEntry({ font_overrides: ["lora"] }))).toEqual(
      {},
    );
  });
});

describe("entries", () => {
  it("lists entry metadata without content", async () => {
    let select: string | null = null;
    server.use(
      http.get(ENTRIES_URL, ({ request }) => {
        select = new URL(request.url).searchParams.get("select");
        const { content: _content, ...metadata } = makeEntry({
          id: "entry-1",
          content: { type: "doc" },
        });
        return HttpResponse.json([metadata]);
      }),
    );

    const { result } = renderHookWithQuery(() => useEntries());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(select).not.toContain("content");
    expect(select).toContain("font_overrides");
    expect(select).toContain("subtitle");
    expect(select).toContain("show_subtitle");
    expect(select).toContain("show_outline");
    expect(result.current.data?.[0]).not.toHaveProperty("content");
  });

  it("creates an entry in a collection", async () => {
    let inserted: Record<string, unknown> | undefined;
    server.use(
      http.post(ENTRIES_URL, async ({ request }) => {
        inserted = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(entriesKey, []);
    const { result } = renderHookWithQuery(() => useCreateEntry(), { client });

    result.current.mutate({
      id: "entry-1",
      collection_id: "collection-1",
      title: "New entry",
      position: 1024,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(inserted).toMatchObject({
      id: "entry-1",
      collection_id: "collection-1",
      title: "New entry",
      user_id: "user-1",
    });
    const cached = client.getQueryData<EntryMeta[]>(entriesKey)?.[0];
    expect(cached).toMatchObject({
      id: "entry-1",
      collection_id: "collection-1",
      title: "New entry",
      position: 1024,
      font_overrides: null,
      subtitle: null,
      show_subtitle: false,
      show_outline: false,
    });
  });

  it("renames an entry", async () => {
    server.use(
      http.patch(ENTRIES_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(entriesKey, [
      makeEntry({ id: "entry-1", title: "Old" }),
    ]);
    const { result } = renderHookWithQuery(() => useRenameEntry(), { client });

    result.current.mutate({ id: "entry-1", title: "New" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(
      client.getQueryData<{ title: string }[]>(entriesKey)?.[0]?.title,
    ).toBe("New");
  });

  it("deletes an entry", async () => {
    server.use(
      http.delete(ENTRIES_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(entriesKey, [makeEntry({ id: "entry-1" })]);
    const { result } = renderHookWithQuery(() => useDeleteEntry(), { client });

    result.current.mutate({ id: "entry-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(entriesKey)).toEqual([]);
  });

  it("loads and updates entry content", async () => {
    server.use(
      http.get(ENTRIES_URL, () =>
        HttpResponse.json({ content: { type: "doc", content: [] } }),
      ),
      http.patch(ENTRIES_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    const { result: contentResult } = renderHookWithQuery(
      () => useEntryContent("entry-1"),
      { client },
    );

    await waitFor(() => {
      expect(contentResult.current.isSuccess).toBe(true);
    });
    expect(contentResult.current.data).toEqual({ type: "doc", content: [] });

    const { result: updateResult } = renderHookWithQuery(
      () => useUpdateEntryContent(),
      { client },
    );
    updateResult.current.mutate({
      id: "entry-1",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });

    await waitFor(() => {
      expect(updateResult.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(entryContentKey("entry-1"))).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("moves an entry to another collection and position", async () => {
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(ENTRIES_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(entriesKey, [
      makeEntry({
        id: "entry-1",
        collection_id: "c1",
        position: 1024,
      }),
    ]);
    const { result } = renderHookWithQuery(() => useMoveEntry(), { client });

    result.current.mutate({
      id: "entry-1",
      collection_id: "c2",
      position: 2048,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patched).toMatchObject({
      collection_id: "c2",
      position: 2048,
    });
    expect(
      client.getQueryData<
        { id: string; collection_id: string; position: number }[]
      >(entriesKey)?.[0],
    ).toMatchObject({
      id: "entry-1",
      collection_id: "c2",
      position: 2048,
    });
  });
});

describe("useUpdateEntry", () => {
  it("patches subtitle and outline flags", async () => {
    let patch:
      | { subtitle?: unknown; show_subtitle?: unknown; show_outline?: unknown }
      | undefined;
    server.use(
      http.patch(ENTRIES_URL, async ({ request }) => {
        patch = (await request.json()) as typeof patch;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(entriesKey, [
      makeEntry({
        id: "entry-1",
        subtitle: null,
        show_subtitle: false,
        show_outline: false,
      }),
    ]);

    const { result } = renderHookWithQuery(() => useUpdateEntry(), { client });
    result.current.mutate({
      id: "entry-1",
      subtitle: "A closer look",
      show_subtitle: true,
      show_outline: true,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(patch).toEqual({
      subtitle: "A closer look",
      show_subtitle: true,
      show_outline: true,
    });

    const cached = client.getQueryData<EntryMeta[]>(entriesKey);
    expect(cached?.[0]).toMatchObject({
      subtitle: "A closer look",
      show_subtitle: true,
      show_outline: true,
    });
  });
});

describe("useUpdateEntryFontOverrides", () => {
  it("optimistically patches the entries list cache with the new overrides", async () => {
    server.use(
      http.patch(ENTRIES_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(entriesKey, [
      makeEntry({ id: "entry-1", font_overrides: null }),
    ]);

    const { result } = renderHookWithQuery(
      () => useUpdateEntryFontOverrides(),
      { client },
    );
    result.current.mutate({
      id: "entry-1",
      font_overrides: { text: "atkinson-hyperlegible" },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const cached = client.getQueryData<EntryMeta[]>(entriesKey);
    expect(cached?.[0]?.font_overrides).toEqual({
      text: "atkinson-hyperlegible",
    });
  });

  it("PATCHes the font_overrides column", async () => {
    let patch: { font_overrides?: unknown } | undefined;
    server.use(
      http.patch(ENTRIES_URL, async ({ request }) => {
        patch = (await request.json()) as { font_overrides?: unknown };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(entriesKey, [
      makeEntry({ id: "entry-1", font_overrides: null }),
    ]);

    const { result } = renderHookWithQuery(
      () => useUpdateEntryFontOverrides(),
      { client },
    );
    result.current.mutate({
      id: "entry-1",
      font_overrides: { display: "lora" },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patch?.font_overrides).toEqual({ display: "lora" });
  });

  it("rolls the cache back and clears overrides when the server rejects the update", async () => {
    server.use(
      http.patch(ENTRIES_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(entriesKey, [
      makeEntry({ id: "entry-1", font_overrides: { display: "lora" } }),
    ]);

    const { result } = renderHookWithQuery(
      () => useUpdateEntryFontOverrides(),
      { client },
    );
    result.current.mutate({ id: "entry-1", font_overrides: null });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(
      client.getQueryData<EntryMeta[]>(entriesKey)?.[0]?.font_overrides,
    ).toEqual({ display: "lora" });
  });
});
