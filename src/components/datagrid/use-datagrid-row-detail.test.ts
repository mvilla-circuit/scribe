import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { datagridRowsKey, datagridsKey } from "@/data/query-keys";
import type { Json } from "@/lib/database.types";
import { makeDatagrid, makeDatagridRow } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import { useDatagridRowDetail } from "./use-datagrid-row-detail";

const hooks = vi.hoisted(() => ({
  upload: { mutateAsync: vi.fn() },
  update: { mutate: vi.fn(), mutateAsync: vi.fn() },
  deleteCoverObject: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

vi.mock("@/data/cover-upload", () => ({
  useUploadCover: () => hooks.upload,
  deleteCoverObject: (...args: unknown[]) => hooks.deleteCoverObject(...args),
}));

vi.mock("@/data/datagrid-rows", async () => {
  const actual = await vi.importActual<typeof import("@/data/datagrid-rows")>(
    "@/data/datagrid-rows",
  );
  return {
    ...actual,
    useUpdateDatagridRow: () => hooks.update,
  };
});

const DGID = "dg-1";
const ROWID = "r1";

const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value));

function seed(coverUrl: string | null = null) {
  const client = createTestQueryClient();
  client.setQueryData(datagridsKey, [
    makeDatagrid({ id: DGID, collection_id: "col-1", fields: asJson([]) }),
  ]);
  client.setQueryData(datagridRowsKey(DGID), [
    makeDatagridRow({
      id: ROWID,
      datagrid_id: DGID,
      title: "First",
      cover_url: coverUrl,
    }),
  ]);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDatagridRowDetail cover mutators", () => {
  it("uploads a cover, patches cover_url, and deletes the previous object", async () => {
    hooks.upload.mutateAsync.mockResolvedValue("https://example.test/new.png");
    hooks.update.mutateAsync.mockResolvedValue(undefined);

    const { result } = renderHookWithQuery(
      () => useDatagridRowDetail(DGID, ROWID),
      { client: seed("https://example.test/old.png") },
    );

    let returned: string | undefined;
    await act(async () => {
      returned = await result.current.setCover(
        new File(["cover"], "cover.png", { type: "image/png" }),
      );
    });

    expect(hooks.upload.mutateAsync).toHaveBeenCalledOnce();
    expect(hooks.update.mutateAsync).toHaveBeenCalledWith({
      id: ROWID,
      cover_url: "https://example.test/new.png",
      cover_position: 50,
    });
    await waitFor(() => {
      expect(hooks.deleteCoverObject).toHaveBeenCalledWith(
        "https://example.test/old.png",
      );
    });
    expect(returned).toBe("https://example.test/new.png");
  });

  it("clears cover_url and deletes the previous object on success", () => {
    const { result } = renderHookWithQuery(
      () => useDatagridRowDetail(DGID, ROWID),
      { client: seed("https://example.test/old.png") },
    );

    act(() => {
      result.current.clearCover();
    });

    expect(hooks.update.mutate).toHaveBeenCalledWith(
      { id: ROWID, cover_url: null },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const [, options] = hooks.update.mutate.mock.calls[0] as [
      unknown,
      { onSuccess?: () => void },
    ];
    options.onSuccess?.();
    expect(hooks.deleteCoverObject).toHaveBeenCalledWith(
      "https://example.test/old.png",
    );
  });
});
