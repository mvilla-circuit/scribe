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
import { entryFontOverrides, useUpdateEntryFontOverrides } from "./entries";
import { entriesKey } from "./query-keys";

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
