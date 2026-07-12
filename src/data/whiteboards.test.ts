import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeWhiteboard } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import { whiteboardSceneKey, whiteboardsKey } from "./query-keys";
import {
  useCreateWhiteboard,
  useDeleteWhiteboard,
  useMoveWhiteboard,
  useRenameWhiteboard,
  useUpdateWhiteboard,
  useUpdateWhiteboardScene,
  useWhiteboards,
  useWhiteboardScene,
  type Whiteboard,
} from "./whiteboards";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const WHITEBOARDS_URL = "http://supabase.test/rest/v1/whiteboards";

describe("whiteboards", () => {
  it("useWhiteboards loads meta without scene", async () => {
    let select: string | null = null;
    server.use(
      http.get(WHITEBOARDS_URL, ({ request }) => {
        select = new URL(request.url).searchParams.get("select");
        const { scene: _scene, ...metadata } = makeWhiteboard();
        return HttpResponse.json([metadata]);
      }),
    );

    const { result } = renderHookWithQuery(() => useWhiteboards());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(select).not.toContain("scene");
    expect(result.current.data?.[0]).not.toHaveProperty("scene");
  });

  it("useWhiteboardScene returns scene for id", async () => {
    server.use(
      http.get(WHITEBOARDS_URL, () =>
        HttpResponse.json({ scene: { elements: [] } }),
      ),
    );

    const { result } = renderHookWithQuery(() =>
      useWhiteboardScene("whiteboard-1"),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({ elements: [] });
  });

  it("useCreateWhiteboard inserts and updates cache", async () => {
    let inserted: Record<string, unknown> | undefined;
    server.use(
      http.post(WHITEBOARDS_URL, async ({ request }) => {
        inserted = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(whiteboardsKey, []);
    const { result } = renderHookWithQuery(() => useCreateWhiteboard(), {
      client,
    });

    result.current.mutate({
      id: "whiteboard-1",
      collection_id: "collection-1",
      name: "Ideas",
      position: 1024,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(inserted).toMatchObject({
      id: "whiteboard-1",
      collection_id: "collection-1",
      name: "Ideas",
      scene: {
        version: 1,
        camera: { x: 0, y: 0, zoom: 1 },
        items: [],
      },
      user_id: "user-1",
    });
    expect(client.getQueryData<{ id: string }[]>(whiteboardsKey)?.[0]?.id).toBe(
      "whiteboard-1",
    );
    expect(client.getQueryData(whiteboardSceneKey("whiteboard-1"))).toEqual({
      version: 1,
      camera: { x: 0, y: 0, zoom: 1 },
      items: [],
    });
  });

  it("creates a book whiteboard with optional document parent", async () => {
    let inserted: Record<string, unknown> | undefined;
    server.use(
      http.post(WHITEBOARDS_URL, async ({ request }) => {
        inserted = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(whiteboardsKey, []);
    const { result } = renderHookWithQuery(() => useCreateWhiteboard(), {
      client,
    });

    result.current.mutate({
      id: "whiteboard-book-1",
      book_id: "book-1",
      parent_document_id: "doc-1",
      position: 1024,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(inserted).toMatchObject({
      id: "whiteboard-book-1",
      collection_id: null,
      book_id: "book-1",
      parent_document_id: "doc-1",
    });
  });

  it("useUpdateWhiteboardScene patches scene key only", async () => {
    let listRequests = 0;
    server.use(
      http.get(WHITEBOARDS_URL, () => {
        listRequests += 1;
        return HttpResponse.json([]);
      }),
      http.patch(
        WHITEBOARDS_URL,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(whiteboardsKey, [makeWhiteboard()]);
    client.setQueryData(whiteboardSceneKey("whiteboard-1"), {
      elements: [],
    });
    const { result } = renderHookWithQuery(() => useUpdateWhiteboardScene(), {
      client,
    });

    result.current.mutate({
      id: "whiteboard-1",
      scene: { elements: [{ id: "shape-1" }] },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(whiteboardSceneKey("whiteboard-1"))).toEqual({
      elements: [{ id: "shape-1" }],
    });
    expect(client.getQueryData(whiteboardsKey)).toEqual([makeWhiteboard()]);
    expect(listRequests).toBe(0);
  });

  it("useDeleteWhiteboard removes from cache", async () => {
    server.use(
      http.delete(
        WHITEBOARDS_URL,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(whiteboardsKey, [makeWhiteboard()]);
    const { result } = renderHookWithQuery(() => useDeleteWhiteboard(), {
      client,
    });

    result.current.mutate({ id: "whiteboard-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(whiteboardsKey)).toEqual([]);
  });

  it("updates whiteboard metadata in the list cache", async () => {
    server.use(
      http.patch(
        WHITEBOARDS_URL,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(whiteboardsKey, [makeWhiteboard()]);
    const { result: rename } = renderHookWithQuery(
      () => useRenameWhiteboard(),
      { client },
    );
    const { result: update } = renderHookWithQuery(
      () => useUpdateWhiteboard(),
      { client },
    );
    const { result: move } = renderHookWithQuery(() => useMoveWhiteboard(), {
      client,
    });

    rename.current.mutate({ id: "whiteboard-1", name: "Planning" });
    await waitFor(() => {
      expect(rename.current.isSuccess).toBe(true);
    });
    update.current.mutate({ id: "whiteboard-1", icon: "💡" });
    await waitFor(() => {
      expect(update.current.isSuccess).toBe(true);
    });
    move.current.mutate({
      id: "whiteboard-1",
      collection_id: "collection-2",
      position: 2048,
    });
    await waitFor(() => {
      expect(move.current.isSuccess).toBe(true);
    });

    expect(
      client.getQueryData<Whiteboard[]>(whiteboardsKey)?.[0],
    ).toMatchObject({
      name: "Planning",
      icon: "💡",
      collection_id: "collection-2",
      position: 2048,
    });
  });
});
