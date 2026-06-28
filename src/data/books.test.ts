import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeBook } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import {
  bookFontOverrides,
  bookShowSubtitle,
  bookTheme,
  useBooks,
  useCreateBook,
  useDeleteBook,
  useRenameBook,
} from "./books";
import { pageIndexKey } from "./query-keys";

// Avoid pulling auth.tsx (and its Tauri plugin imports) into the test runtime;
// the hooks under test don't depend on the session.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const BOOKS_URL = "http://supabase.test/rest/v1/books";

describe("bookTheme", () => {
  it("returns the stored theme object", () => {
    const book = makeBook({ theme: { showSubtitle: true } });
    expect(bookTheme(book)).toEqual({ showSubtitle: true });
  });

  it("falls back to an empty object for null, arrays, and non-objects", () => {
    expect(bookTheme(makeBook({ theme: null }))).toEqual({});
    expect(bookTheme(makeBook({ theme: ["x"] }))).toEqual({});
  });
});

describe("bookFontOverrides", () => {
  it("returns the theme's font map when present", () => {
    const book = makeBook({ theme: { fonts: { display: "lora" } } });
    expect(bookFontOverrides(book)).toEqual({ display: "lora" });
  });

  it("falls back to an empty map when fonts are unset or malformed", () => {
    expect(bookFontOverrides(makeBook({ theme: {} }))).toEqual({});
    expect(bookFontOverrides(makeBook({ theme: { fonts: ["lora"] } }))).toEqual(
      {},
    );
  });
});

describe("bookShowSubtitle", () => {
  it("honors an explicit boolean flag", () => {
    expect(bookShowSubtitle(makeBook({ theme: { showSubtitle: true } }))).toBe(
      true,
    );
    expect(
      bookShowSubtitle(
        makeBook({ subtitle: "Has subtitle", theme: { showSubtitle: false } }),
      ),
    ).toBe(false);
  });

  it("defaults to true only when a non-empty subtitle exists", () => {
    expect(bookShowSubtitle(makeBook({ subtitle: "A subtitle" }))).toBe(true);
    expect(bookShowSubtitle(makeBook({ subtitle: "   " }))).toBe(false);
    expect(bookShowSubtitle(makeBook({ subtitle: null }))).toBe(false);
  });
});

describe("useBooks", () => {
  it("returns the user's books sorted by position", async () => {
    server.use(
      http.get(BOOKS_URL, () =>
        HttpResponse.json([
          makeBook({ id: "b2", position: 2048 }),
          makeBook({ id: "b1", position: 1024 }),
        ]),
      ),
    );

    const { result } = renderHookWithQuery(() => useBooks());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("surfaces an error when the request fails", async () => {
    server.use(
      http.get(BOOKS_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHookWithQuery(() => useBooks());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe("useCreateBook", () => {
  it("optimistically appends the book stamped with the real user id", async () => {
    server.use(
      http.post(BOOKS_URL, () => new HttpResponse(null, { status: 201 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(["books"], [makeBook({ id: "b1", position: 1024 })]);

    const { result } = renderHookWithQuery(() => useCreateBook(), { client });
    result.current.mutate({
      id: "b2",
      title: "New",
      folder_id: null,
      position: 2048,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const books = client.getQueryData<{ id: string; user_id: string }[]>([
      "books",
    ]);
    expect(books?.map((b) => b.id)).toEqual(["b1", "b2"]);
    // The optimistic row must carry the signed-in user id (never ""), matching
    // the row the mutationFn inserts so RLS-bound ids never diverge.
    expect(books?.find((b) => b.id === "b2")?.user_id).toBe("user-1");
  });
});

describe("useRenameBook", () => {
  it("optimistically renames and keeps the change on success", async () => {
    server.use(
      http.patch(BOOKS_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(["books"], [makeBook({ id: "b1", title: "Old" })]);

    const { result } = renderHookWithQuery(() => useRenameBook(), { client });
    result.current.mutate({ id: "b1", title: "New" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(
      client.getQueryData<{ title: string }[]>(["books"])?.[0]?.title,
    ).toBe("New");
  });

  it("rolls back the optimistic rename when the server rejects it", async () => {
    server.use(
      http.patch(BOOKS_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(["books"], [makeBook({ id: "b1", title: "Old" })]);

    const { result } = renderHookWithQuery(() => useRenameBook(), { client });
    result.current.mutate({ id: "b1", title: "New" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(
      client.getQueryData<{ title: string }[]>(["books"])?.[0]?.title,
    ).toBe("Old");
  });
});

describe("useDeleteBook", () => {
  it("invalidates the cross-book page index on settle so link cards re-resolve", async () => {
    server.use(
      http.delete(BOOKS_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    client.setQueryData(["books"], [makeBook({ id: "b1" })]);

    const { result } = renderHookWithQuery(() => useDeleteBook(), { client });
    result.current.mutate({ id: "b1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The book's documents cascade-delete in the DB; the page index spans all
    // books, so it must be invalidated or link cards keep stale targets.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: pageIndexKey });
  });
});
