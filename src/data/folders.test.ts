import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeFolder } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import { useCreateFolder, useDeleteFolder, useFolders } from "./folders";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const FOLDERS_URL = "http://supabase.test/rest/v1/folders";

describe("useFolders", () => {
  it("returns the user's folders sorted by position", async () => {
    server.use(
      http.get(FOLDERS_URL, () =>
        HttpResponse.json([
          makeFolder({ id: "f2", position: 2048 }),
          makeFolder({ id: "f1", position: 1024 }),
        ]),
      ),
    );

    const { result } = renderHookWithQuery(() => useFolders());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((f) => f.id)).toEqual(["f1", "f2"]);
  });
});

describe("useCreateFolder", () => {
  it("optimistically appends the folder and keeps it on success", async () => {
    server.use(
      http.post(FOLDERS_URL, () => new HttpResponse(null, { status: 201 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(
      ["folders"],
      [makeFolder({ id: "f1", position: 1024 })],
    );

    const { result } = renderHookWithQuery(() => useCreateFolder(), { client });
    result.current.mutate({
      id: "f2",
      name: "New",
      parent_folder_id: null,
      position: 2048,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(
      client.getQueryData<{ id: string }[]>(["folders"])?.map((f) => f.id),
    ).toEqual(["f1", "f2"]);
  });

  it("rolls back the optimistic append when the server rejects it", async () => {
    server.use(
      http.post(FOLDERS_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(
      ["folders"],
      [makeFolder({ id: "f1", position: 1024 })],
    );

    const { result } = renderHookWithQuery(() => useCreateFolder(), { client });
    result.current.mutate({
      id: "f2",
      name: "New",
      parent_folder_id: null,
      position: 2048,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(
      client.getQueryData<{ id: string }[]>(["folders"])?.map((f) => f.id),
    ).toEqual(["f1"]);
  });
});

describe("useDeleteFolder", () => {
  it("cascades subfolders optimistically and invalidates folders + books", async () => {
    server.use(
      http.delete(FOLDERS_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    client.setQueryData(
      ["folders"],
      [
        makeFolder({ id: "root", parent_folder_id: null }),
        makeFolder({ id: "sub", parent_folder_id: "root" }),
        makeFolder({ id: "keep", parent_folder_id: null }),
      ],
    );

    const { result } = renderHookWithQuery(() => useDeleteFolder(), { client });
    result.current.mutate({ id: "root" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(
      client.getQueryData<{ id: string }[]>(["folders"])?.map((f) => f.id),
    ).toEqual(["keep"]);

    // Books reference folders with ON DELETE SET NULL, so they must be
    // reconciled too once the folder cascade settles.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["books"] });
  });
});
