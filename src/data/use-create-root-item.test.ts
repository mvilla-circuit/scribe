import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeBook, makeCollection, makeFolder } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import { useCreateRootItem } from "./use-create-root-item";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const BOOKS_URL = "http://supabase.test/rest/v1/books";
const FOLDERS_URL = "http://supabase.test/rest/v1/folders";
const COLLECTIONS_URL = "http://supabase.test/rest/v1/collections";

describe("useCreateRootItem", () => {
  it("creates a root collection past the last root sibling, counting collections", async () => {
    const inserted: { parent_collection_id?: unknown; position?: unknown }[] =
      [];
    server.use(
      http.get(BOOKS_URL, () =>
        HttpResponse.json([makeBook({ id: "b1", position: 1024 })]),
      ),
      http.get(FOLDERS_URL, () => HttpResponse.json([])),
      http.get(COLLECTIONS_URL, () =>
        HttpResponse.json([
          makeCollection({
            id: "c1",
            parent_collection_id: null,
            position: 2048,
          }),
        ]),
      ),
      http.post(COLLECTIONS_URL, async ({ request }) => {
        inserted.push((await request.json()) as (typeof inserted)[number]);
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const client = createTestQueryClient();
    client.setQueryData(["books"], [makeBook({ id: "b1", position: 1024 })]);
    client.setQueryData(["folders"], [] as ReturnType<typeof makeFolder>[]);
    client.setQueryData(
      ["collections"],
      [
        makeCollection({
          id: "c1",
          parent_collection_id: null,
          position: 2048,
        }),
      ],
    );

    const { result } = renderHookWithQuery(() => useCreateRootItem(), {
      client,
    });

    let newId = "";
    await waitFor(() => {
      newId = result.current.createCollection();
      expect(newId).not.toBe("");
    });

    await waitFor(() => {
      expect(inserted).toHaveLength(1);
    });
    // Root position steps past the largest root sibling (the c1 collection at
    // 2048), so collections are counted alongside books/folders.
    expect(inserted[0]?.position).toBe(2048 + 1024);
    // createCollection nests at the root (no parent) and returns the new id.
    expect(inserted[0]?.parent_collection_id).toBeNull();
    expect(newId).not.toBe("");
  });
});
