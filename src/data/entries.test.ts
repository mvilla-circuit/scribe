import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeEntry } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import {
  useCreateEntry,
  useDeleteEntry,
  useEntries,
  useEntryContent,
  useRenameEntry,
  useUpdateEntryContent,
} from "./entries";
import { entriesKey, entryContentKey } from "./query-keys";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const ENTRIES_URL = "http://supabase.test/rest/v1/entries";

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
    expect(client.getQueryData<{ id: string }[]>(entriesKey)?.[0]?.id).toBe(
      "entry-1",
    );
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
});
