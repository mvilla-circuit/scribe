import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_DATAGRID_VIEW_CONFIG } from "@/lib/datagrid-schema";
import { makeDatagridView } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import {
  newDefaultViewRow,
  useCreateDatagridView,
  useDatagridViews,
  useDeleteDatagridView,
  useRenameDatagridView,
  useUpdateDatagridView,
} from "./datagrid-views";
import { datagridViewsKey } from "./query-keys";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const VIEWS_URL = "http://supabase.test/rest/v1/datagrid_views";

describe("newDefaultViewRow", () => {
  it("builds a default table view flagged is_default", () => {
    const row = newDefaultViewRow(
      { id: "view-1", datagrid_id: "datagrid-1", position: 1024 },
      "user-1",
    );
    expect(row).toMatchObject({
      id: "view-1",
      datagrid_id: "datagrid-1",
      user_id: "user-1",
      name: "Table",
      is_default: true,
      config: DEFAULT_DATAGRID_VIEW_CONFIG,
    });
  });
});

describe("datagrid views", () => {
  it("lists a datagrid's views ordered by position", async () => {
    server.use(
      http.get(VIEWS_URL, () =>
        HttpResponse.json([
          makeDatagridView({ id: "view-b", position: 2048 }),
          makeDatagridView({ id: "view-a", position: 1024 }),
        ]),
      ),
    );

    const { result } = renderHookWithQuery(() =>
      useDatagridViews("datagrid-1"),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((v) => v.id)).toEqual(["view-a", "view-b"]);
  });

  it("creates a view", async () => {
    let inserted: Record<string, unknown> | undefined;
    server.use(
      http.post(VIEWS_URL, async ({ request }) => {
        inserted = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridViewsKey("datagrid-1"), []);
    const { result } = renderHookWithQuery(
      () => useCreateDatagridView("datagrid-1"),
      { client },
    );

    result.current.mutate({
      id: "view-1",
      name: "Board",
      config: { ...DEFAULT_DATAGRID_VIEW_CONFIG, layout: "board" },
      position: 1024,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(inserted).toMatchObject({
      id: "view-1",
      datagrid_id: "datagrid-1",
      user_id: "user-1",
      name: "Board",
    });
    expect(
      client.getQueryData<{ id: string }[]>(datagridViewsKey("datagrid-1"))?.[0]
        ?.id,
    ).toBe("view-1");
  });

  it("renames a view", async () => {
    server.use(
      http.patch(VIEWS_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridViewsKey("datagrid-1"), [
      makeDatagridView({ id: "view-1", name: "Old" }),
    ]);
    const { result } = renderHookWithQuery(
      () => useRenameDatagridView("datagrid-1"),
      { client },
    );

    result.current.mutate({ id: "view-1", name: "New" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(
      client.getQueryData<{ name: string }[]>(
        datagridViewsKey("datagrid-1"),
      )?.[0]?.name,
    ).toBe("New");
  });

  it("updates a view config", async () => {
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(VIEWS_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridViewsKey("datagrid-1"), [
      makeDatagridView({ id: "view-1" }),
    ]);
    const { result } = renderHookWithQuery(
      () => useUpdateDatagridView("datagrid-1"),
      { client },
    );

    result.current.mutate({
      id: "view-1",
      config: { ...DEFAULT_DATAGRID_VIEW_CONFIG, layout: "gallery" },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patched?.config).toMatchObject({ layout: "gallery" });
  });

  it("deletes a view", async () => {
    server.use(
      http.delete(VIEWS_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridViewsKey("datagrid-1"), [
      makeDatagridView({ id: "view-1" }),
    ]);
    const { result } = renderHookWithQuery(
      () => useDeleteDatagridView("datagrid-1"),
      { client },
    );

    result.current.mutate({ id: "view-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(datagridViewsKey("datagrid-1"))).toEqual([]);
  });
});
