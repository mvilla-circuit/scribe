import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeBook } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import { useBooks, useRenameBook } from "./books";

// Avoid pulling auth.tsx (and its Tauri plugin imports) into the test runtime;
// the hooks under test don't depend on the session.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const BOOKS_URL = "http://supabase.test/rest/v1/books";

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
