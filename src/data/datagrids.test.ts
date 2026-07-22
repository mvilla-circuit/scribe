import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { Json } from "@/lib/database.types";
import type { DatagridField } from "@/lib/datagrid-schema";
import { makeDatagrid, makeDatagridView } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import { type DatagridView, useDatagridViews } from "./datagrid-views";
import {
  datagridFontOverrides,
  datagridShowSubtitle,
  datagridTheme,
  useCreateDatagrid,
  useDatagrids,
  useDeleteDatagrid,
  useMoveDatagrid,
  useRenameDatagrid,
  useUpdateDatagrid,
} from "./datagrids";
import {
  datagridRowContentKey,
  datagridRowsKey,
  datagridsKey,
  datagridViewsKey,
} from "./query-keys";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const DATAGRIDS_URL = "http://supabase.test/rest/v1/datagrids";
const VIEWS_URL = "http://supabase.test/rest/v1/datagrid_views";

describe("datagridTheme", () => {
  it("returns the stored theme object", () => {
    const grid = makeDatagrid({ theme: { showSubtitle: true } });
    expect(datagridTheme(grid)).toEqual({ showSubtitle: true });
  });

  it("falls back to an empty object for null, arrays, and non-objects", () => {
    expect(datagridTheme(makeDatagrid({ theme: null }))).toEqual({});
    expect(datagridTheme(makeDatagrid({ theme: ["x"] }))).toEqual({});
  });
});

describe("datagridFontOverrides", () => {
  it("returns the theme's font map when present", () => {
    const grid = makeDatagrid({ theme: { fonts: { display: "lora" } } });
    expect(datagridFontOverrides(grid)).toEqual({ display: "lora" });
  });

  it("falls back to an empty map when fonts are unset or malformed", () => {
    expect(datagridFontOverrides(makeDatagrid({ theme: {} }))).toEqual({});
    expect(
      datagridFontOverrides(makeDatagrid({ theme: { fonts: ["lora"] } })),
    ).toEqual({});
  });
});

describe("datagridShowSubtitle", () => {
  it("honors an explicit boolean flag", () => {
    expect(
      datagridShowSubtitle(makeDatagrid({ theme: { showSubtitle: true } })),
    ).toBe(true);
    expect(
      datagridShowSubtitle(
        makeDatagrid({
          subtitle: "Has subtitle",
          theme: { showSubtitle: false },
        }),
      ),
    ).toBe(false);
  });

  it("defaults to true only when a non-empty subtitle exists", () => {
    expect(datagridShowSubtitle(makeDatagrid({ subtitle: "A subtitle" }))).toBe(
      true,
    );
    expect(datagridShowSubtitle(makeDatagrid({ subtitle: "   " }))).toBe(false);
    expect(datagridShowSubtitle(makeDatagrid({ subtitle: null }))).toBe(false);
  });
});

describe("datagrids", () => {
  it("lists datagrids ordered by position", async () => {
    server.use(
      http.get(DATAGRIDS_URL, () =>
        HttpResponse.json([
          makeDatagrid({ id: "grid-b", position: 2048 }),
          makeDatagrid({ id: "grid-a", position: 1024 }),
        ]),
      ),
    );

    const { result } = renderHookWithQuery(() => useDatagrids());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((g) => g.id)).toEqual(["grid-a", "grid-b"]);
  });

  it("creates a datagrid and seeds a default table view", async () => {
    let insertedGrid: Record<string, unknown> | undefined;
    let insertedView: Record<string, unknown> | undefined;
    server.use(
      http.post(DATAGRIDS_URL, async ({ request }) => {
        insertedGrid = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
      http.post(VIEWS_URL, async ({ request }) => {
        insertedView = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, []);
    const { result } = renderHookWithQuery(() => useCreateDatagrid(), {
      client,
    });

    result.current.mutate({
      id: "grid-1",
      collection_id: "collection-1",
      name: "Tasks",
      position: 1024,
      viewId: "view-1",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(insertedGrid).toMatchObject({
      id: "grid-1",
      collection_id: "collection-1",
      name: "Tasks",
      user_id: "user-1",
    });
    expect(insertedView).toMatchObject({
      id: "view-1",
      datagrid_id: "grid-1",
      is_default: true,
      name: "Table",
    });
    expect(client.getQueryData<{ id: string }[]>(datagridsKey)?.[0]?.id).toBe(
      "grid-1",
    );
    expect(
      client.getQueryData<{ id: string }[]>(datagridViewsKey("grid-1"))?.[0]
        ?.id,
    ).toBe("view-1");
  });

  it("heals views cache after settle when a views observer fetched empty during create", async () => {
    let viewInserted = false;
    let releaseCreate: (() => void) | undefined;
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    server.use(
      http.post(DATAGRIDS_URL, async () => {
        await createGate;
        return new HttpResponse(null, { status: 201 });
      }),
      http.post(VIEWS_URL, () => {
        viewInserted = true;
        return new HttpResponse(null, { status: 201 });
      }),
      http.get(VIEWS_URL, () => {
        if (!viewInserted) {
          return HttpResponse.json([]);
        }
        return HttpResponse.json([
          makeDatagridView({
            id: "view-1",
            datagrid_id: "grid-1",
            is_default: true,
            name: "Table",
            position: 0,
          }),
        ]);
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, []);
    const { result } = renderHookWithQuery(
      () => ({
        create: useCreateDatagrid(),
        views: useDatagridViews("grid-1"),
      }),
      { client },
    );

    await waitFor(() => {
      expect(result.current.views.isSuccess).toBe(true);
    });
    expect(result.current.views.data).toEqual([]);

    result.current.create.mutate({
      id: "grid-1",
      collection_id: "collection-1",
      name: "Tasks",
      position: 1024,
      viewId: "view-1",
    });

    await waitFor(() => {
      expect(
        client.getQueryData<{ id: string }[]>(datagridViewsKey("grid-1"))?.[0]
          ?.id,
      ).toBe("view-1");
    });

    // Simulate DatagridPage mounting a views refetch that lands before the
    // default-view INSERT completes and wipes the optimistic seed.
    await client.refetchQueries({ queryKey: datagridViewsKey("grid-1") });
    expect(client.getQueryData(datagridViewsKey("grid-1"))).toEqual([]);

    releaseCreate?.();

    await waitFor(() => {
      expect(result.current.create.isSuccess).toBe(true);
    });
    await waitFor(() => {
      expect(
        client.getQueryData<{ id: string }[]>(datagridViewsKey("grid-1"))?.[0]
          ?.id,
      ).toBe("view-1");
    });
  });

  it("does not heal views on create settle when the seed is still populated", async () => {
    let releaseCreate: (() => void) | undefined;
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    let viewsGetCount = 0;
    server.use(
      http.post(DATAGRIDS_URL, async () => {
        await createGate;
        return new HttpResponse(null, { status: 201 });
      }),
      http.post(VIEWS_URL, () => new HttpResponse(null, { status: 201 })),
      http.get(VIEWS_URL, () => {
        viewsGetCount += 1;
        // Server still has the default table layout — a settle heal would
        // clobber an in-flight optimistic gallery patch.
        const tableConfig: Json = { layout: "table" };
        return HttpResponse.json([
          makeDatagridView({
            id: "view-1",
            datagrid_id: "grid-1",
            is_default: true,
            name: "Table",
            position: 0,
            config: tableConfig,
          }),
        ]);
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, []);
    const { result } = renderHookWithQuery(
      () => ({
        create: useCreateDatagrid(),
        views: useDatagridViews("grid-1"),
      }),
      { client },
    );

    result.current.create.mutate({
      id: "grid-1",
      collection_id: "collection-1",
      name: "Tasks",
      position: 1024,
      viewId: "view-1",
    });

    await waitFor(() => {
      expect(
        client.getQueryData<{ id: string }[]>(datagridViewsKey("grid-1"))?.[0]
          ?.id,
      ).toBe("view-1");
    });

    // Simulate useUpdateDatagridView's optimistic layout patch racing create.
    const galleryConfig: Json = { layout: "gallery" };
    client.setQueryData(
      datagridViewsKey("grid-1"),
      (prev: DatagridView[] | undefined) =>
        (prev ?? []).map((view) =>
          view.id === "view-1" ? { ...view, config: galleryConfig } : view,
        ),
    );

    const getsBeforeSettle = viewsGetCount;
    releaseCreate?.();

    await waitFor(() => {
      expect(result.current.create.isSuccess).toBe(true);
    });

    // Give a settle heal refetch time to land if create still unconditionally
    // invalidates the views key (that would replace gallery with table).
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(
      client.getQueryData<DatagridView[]>(datagridViewsKey("grid-1"))?.[0]
        ?.config,
    ).toMatchObject({ layout: "gallery" });
    expect(viewsGetCount).toBe(getsBeforeSettle);
  });

  it("rolls back the datagrid and view cache when default view creation fails", async () => {
    let deletedGridId: string | null = null;
    server.use(
      http.post(DATAGRIDS_URL, () => new HttpResponse(null, { status: 201 })),
      http.post(VIEWS_URL, () => new HttpResponse(null, { status: 500 })),
      http.delete(DATAGRIDS_URL, ({ request }) => {
        deletedGridId = new URL(request.url).searchParams.get("id");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, []);
    const { result } = renderHookWithQuery(() => useCreateDatagrid(), {
      client,
    });

    await expect(
      result.current.mutateAsync({
        id: "grid-failed",
        collection_id: "collection-1",
        name: "Failed grid",
        position: 1024,
        viewId: "view-failed",
      }),
    ).rejects.toBeDefined();

    expect(deletedGridId).toBe("eq.grid-failed");
    expect(client.getQueryData<{ id: string }[]>(datagridsKey)).toEqual([]);
    expect(
      client.getQueryData(datagridViewsKey("grid-failed")),
    ).toBeUndefined();
  });

  it("surfaces a compensating-delete failure instead of swallowing it", async () => {
    server.use(
      http.post(DATAGRIDS_URL, () => new HttpResponse(null, { status: 201 })),
      http.post(VIEWS_URL, () => new HttpResponse(null, { status: 500 })),
      http.delete(DATAGRIDS_URL, () => new HttpResponse(null, { status: 500 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, []);
    const { result } = renderHookWithQuery(() => useCreateDatagrid(), {
      client,
    });

    await expect(
      result.current.mutateAsync({
        id: "grid-orphan",
        collection_id: "collection-1",
        name: "Orphan risk",
        position: 1024,
        viewId: "view-orphan",
      }),
    ).rejects.toBeDefined();
  });

  it("renames a datagrid", async () => {
    server.use(
      http.patch(DATAGRIDS_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, [
      makeDatagrid({ id: "grid-1", name: "Old" }),
    ]);
    const { result } = renderHookWithQuery(() => useRenameDatagrid(), {
      client,
    });

    result.current.mutate({ id: "grid-1", name: "New" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(
      client.getQueryData<{ name: string }[]>(datagridsKey)?.[0]?.name,
    ).toBe("New");
  });

  it("updates a datagrid's fields schema", async () => {
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(DATAGRIDS_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, [makeDatagrid({ id: "grid-1" })]);
    const { result } = renderHookWithQuery(() => useUpdateDatagrid(), {
      client,
    });

    const fields: DatagridField[] = [
      { id: "f1", name: "Status", type: "status", config: {} },
    ];
    result.current.mutate({ id: "grid-1", fields });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patched?.fields).toEqual(fields);
  });

  it("updates a datagrid's subtitle and theme", async () => {
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(DATAGRIDS_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, [makeDatagrid({ id: "grid-1" })]);
    const { result } = renderHookWithQuery(() => useUpdateDatagrid(), {
      client,
    });

    result.current.mutate({
      id: "grid-1",
      subtitle: "Optional blurb",
      theme: { showSubtitle: true, fonts: { display: "lora" } },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patched).toMatchObject({
      subtitle: "Optional blurb",
      theme: { showSubtitle: true, fonts: { display: "lora" } },
    });
  });

  it("merges themePatch onto the latest cached theme", async () => {
    const patches: Record<string, unknown>[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let patchCount = 0;
    server.use(
      http.patch(DATAGRIDS_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const index = patchCount;
        patchCount += 1;
        if (index === 0) await firstGate;
        patches.push(body);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, [
      makeDatagrid({
        id: "grid-1",
        theme: { showSubtitle: true },
      }),
    ]);
    const { result } = renderHookWithQuery(() => useUpdateDatagrid(), {
      client,
    });

    result.current.mutate({
      id: "grid-1",
      themePatch: { fonts: { display: "lora" } },
    });
    result.current.mutate({
      id: "grid-1",
      themePatch: { showSubtitle: false },
    });

    await waitFor(() => {
      expect(patchCount).toBe(1);
    });
    releaseFirst?.();

    await waitFor(() => {
      expect(patches).toHaveLength(2);
    });
    expect(patches[1]).toMatchObject({
      theme: { showSubtitle: false, fonts: { display: "lora" } },
    });
  });

  it("moves a datagrid to another collection and position", async () => {
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(DATAGRIDS_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, [
      makeDatagrid({ id: "grid-1", collection_id: "c1", position: 1024 }),
    ]);
    const { result } = renderHookWithQuery(() => useMoveDatagrid(), { client });

    result.current.mutate({
      id: "grid-1",
      collection_id: "c2",
      position: 2048,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(patched).toMatchObject({ collection_id: "c2", position: 2048 });
    expect(
      client.getQueryData<
        { id: string; collection_id: string; position: number }[]
      >(datagridsKey)?.[0],
    ).toMatchObject({ id: "grid-1", collection_id: "c2", position: 2048 });
  });

  it("deletes a datagrid and clears its child caches", async () => {
    server.use(
      http.delete(DATAGRIDS_URL, () => new HttpResponse(null, { status: 204 })),
    );
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, [makeDatagrid({ id: "grid-1" })]);
    client.setQueryData(datagridViewsKey("grid-1"), [{ id: "view-1" }]);
    client.setQueryData(datagridRowsKey("grid-1"), [{ id: "row-1" }]);
    client.setQueryData(datagridRowContentKey("row-1"), { type: "doc" });
    const { result } = renderHookWithQuery(() => useDeleteDatagrid(), {
      client,
    });

    result.current.mutate({ id: "grid-1" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(datagridsKey)).toEqual([]);
    expect(client.getQueryData(datagridViewsKey("grid-1"))).toBeUndefined();
    expect(client.getQueryData(datagridRowsKey("grid-1"))).toBeUndefined();
    expect(client.getQueryData(datagridRowContentKey("row-1"))).toBeUndefined();
  });
});
