import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeDatagridRow } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import {
  useCreateDatagridRow,
  useDatagridRowContent,
  useDatagridRows,
  useDeleteDatagridRow,
  useDeleteDatagridRows,
  useUpdateDatagridRow,
  useUpdateDatagridRowContent,
} from "./datagrid-rows";
import { datagridRowContentKey, datagridRowsKey } from "./query-keys";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const ROWS_URL = "http://supabase.test/rest/v1/datagrid_rows";

describe("datagrid rows", () => {
  it("lists row metadata without content", async () => {
    let select: string | null = null;
    server.use(
      http.get(ROWS_URL, ({ request }) => {
        select = new URL(request.url).searchParams.get("select");
        const { content: _content, ...metadata } = makeDatagridRow({
          id: "row-1",
          content: { type: "doc" },
        });
        return HttpResponse.json([metadata]);
      }),
    );

    const { result } = renderHookWithQuery(() => useDatagridRows("datagrid-1"));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(select).not.toContain("content");
    expect(result.current.data?.[0]).not.toHaveProperty("content");
  });

  it("creates a row", async () => {
    let inserted: Record<string, unknown> | undefined;
    server.use(
      http.post(ROWS_URL, async ({ request }) => {
        inserted = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridRowsKey("datagrid-1"), []);
    const { result } = renderHookWithQuery(
      () => useCreateDatagridRow("datagrid-1"),
      { client },
    );

    result.current.mutate({ id: "row-1", title: "New", position: 1024 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(inserted).toMatchObject({
      id: "row-1",
      datagrid_id: "datagrid-1",
      title: "New",
      user_id: "user-1",
    });
    expect(
      client.getQueryData<{ id: string }[]>(datagridRowsKey("datagrid-1"))?.[0]
        ?.id,
    ).toBe("row-1");
  });

  it("updates a row's title and properties", async () => {
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(ROWS_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridRowsKey("datagrid-1"), [
      makeDatagridRow({ id: "row-1", title: "Old" }),
    ]);
    const { result } = renderHookWithQuery(
      () => useUpdateDatagridRow("datagrid-1"),
      { client },
    );

    result.current.mutate({
      id: "row-1",
      title: "New",
      properties: { f1: "done" },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patched).toMatchObject({ title: "New", properties: { f1: "done" } });
    expect(
      client.getQueryData<{ title: string }[]>(
        datagridRowsKey("datagrid-1"),
      )?.[0]?.title,
    ).toBe("New");
  });

  it("merges overlapping property patches from the latest cached row", async () => {
    const patches: Record<string, unknown>[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let patchCount = 0;
    server.use(
      http.patch(ROWS_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const index = patchCount;
        patchCount += 1;
        if (index === 0) await firstGate;
        patches.push(body);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridRowsKey("datagrid-1"), [
      makeDatagridRow({
        id: "row-1",
        properties: { existing: 1 },
      }),
    ]);
    const { result } = renderHookWithQuery(
      () => useUpdateDatagridRow("datagrid-1"),
      { client },
    );

    result.current.mutate({
      id: "row-1",
      propertyPatch: { first: "x" },
    });
    result.current.mutate({
      id: "row-1",
      propertyPatch: { second: 2 },
    });

    // First write is held open; second must wait (scope) then merge both.
    await waitFor(() => {
      expect(patchCount).toBe(1);
    });
    releaseFirst?.();

    await waitFor(() => {
      expect(patches).toHaveLength(2);
    });
    expect(patches[0]).toMatchObject({
      properties: { existing: 1, first: "x" },
    });
    expect(patches[1]).toMatchObject({
      properties: { existing: 1, first: "x", second: 2 },
    });
    expect(
      client.getQueryData<{ properties: unknown }[]>(
        datagridRowsKey("datagrid-1"),
      )?.[0]?.properties,
    ).toEqual({ existing: 1, first: "x", second: 2 });
  });

  it("loads and updates row content", async () => {
    server.use(
      http.get(ROWS_URL, () =>
        HttpResponse.json({ content: { type: "doc", content: [] } }),
      ),
      http.patch(ROWS_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    const { result: contentResult } = renderHookWithQuery(
      () => useDatagridRowContent("row-1"),
      { client },
    );

    await waitFor(() => {
      expect(contentResult.current.isSuccess).toBe(true);
    });
    expect(contentResult.current.data).toEqual({ type: "doc", content: [] });

    const { result: updateResult } = renderHookWithQuery(
      () => useUpdateDatagridRowContent(),
      { client },
    );
    updateResult.current.mutate({
      id: "row-1",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });

    await waitFor(() => {
      expect(updateResult.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(datagridRowContentKey("row-1"))).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("deletes a row", async () => {
    server.use(
      http.delete(ROWS_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridRowsKey("datagrid-1"), [
      makeDatagridRow({ id: "row-1" }),
    ]);
    const { result } = renderHookWithQuery(
      () => useDeleteDatagridRow("datagrid-1"),
      { client },
    );

    result.current.mutate({ id: "row-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(datagridRowsKey("datagrid-1"))).toEqual([]);
  });

  it("bulk-deletes rows", async () => {
    server.use(
      http.delete(ROWS_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridRowsKey("datagrid-1"), [
      makeDatagridRow({ id: "row-1", position: 1024 }),
      makeDatagridRow({ id: "row-2", position: 2048 }),
      makeDatagridRow({ id: "row-3", position: 3072 }),
    ]);
    const { result } = renderHookWithQuery(
      () => useDeleteDatagridRows("datagrid-1"),
      { client },
    );

    result.current.mutate({ ids: ["row-1", "row-3"] });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(
      client
        .getQueryData<{ id: string }[]>(datagridRowsKey("datagrid-1"))
        ?.map((r) => r.id),
    ).toEqual(["row-2"]);
  });
});
