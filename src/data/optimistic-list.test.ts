import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import {
  optimisticListHandlers,
  optimisticObjectHandlers,
} from "./optimistic-list";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

interface Item {
  id: string;
  position: number;
}

const key = ["items"] as const;
const sort = (a: Item, b: Item) => a.position - b.position;

describe("optimisticListHandlers", () => {
  it("applies an optimistic, re-sorted update and snapshots the previous list", async () => {
    const qc = new QueryClient();
    qc.setQueryData<Item[]>(key, [{ id: "a", position: 2048 }]);

    const handlers = optimisticListHandlers<Item, Item>({
      qc,
      key,
      sort,
      update: (prev, variables) => [...prev, variables],
      errorMessage: "Couldn't add",
    });

    const context = await handlers.onMutate({ id: "b", position: 1024 });

    expect(qc.getQueryData<Item[]>(key)).toEqual([
      { id: "b", position: 1024 },
      { id: "a", position: 2048 },
    ]);
    expect(context.previous).toEqual([{ id: "a", position: 2048 }]);
  });

  it("rolls back to the snapshot and toasts on error", async () => {
    const qc = new QueryClient();
    qc.setQueryData<Item[]>(key, [{ id: "a", position: 2048 }]);

    const handlers = optimisticListHandlers<Item, Item>({
      qc,
      key,
      sort,
      update: (prev, variables) => [...prev, variables],
      errorMessage: "Couldn't add",
    });

    const context = await handlers.onMutate({ id: "b", position: 1024 });
    handlers.onError(new Error("boom"), { id: "b", position: 1024 }, context);

    expect(qc.getQueryData<Item[]>(key)).toEqual([{ id: "a", position: 2048 }]);
    expect(toast.error).toHaveBeenCalledWith("Couldn't add");
  });

  it("invalidates the list key on settle by default", () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const handlers = optimisticListHandlers<Item, Item>({
      qc,
      key,
      sort,
      update: (prev) => prev,
      errorMessage: "Couldn't add",
    });

    handlers.onSettled(undefined, null, { id: "a", position: 1024 });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
  });

  it("invalidates every provided key on settle", () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const handlers = optimisticListHandlers<Item, Item>({
      qc,
      key,
      sort,
      update: (prev) => prev,
      errorMessage: "Couldn't add",
      invalidateKeys: [key, ["page-index"]],
    });

    handlers.onSettled(undefined, null, { id: "a", position: 1024 });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["page-index"] });
  });

  it("derives the invalidated keys from the mutation variables", () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const handlers = optimisticListHandlers<Item, Item>({
      qc,
      key,
      sort,
      update: (prev) => prev,
      errorMessage: "Couldn't add",
      // Only also-invalidate the page index for the "a" row.
      invalidateKeys: (variables) =>
        variables.id === "a" ? [key, ["page-index"]] : [key],
    });

    handlers.onSettled(undefined, null, { id: "b", position: 1024 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["page-index"] });

    invalidate.mockClear();
    handlers.onSettled(undefined, null, { id: "a", position: 1024 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["page-index"] });
  });

  it("skips invalidation while other mutations are still in flight", () => {
    const qc = new QueryClient();
    // Two mutations counted means this settle isn't the last one; invalidating
    // now would refetch and clobber the still-pending mutation's optimistic state.
    vi.spyOn(qc, "isMutating").mockReturnValue(2);
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const handlers = optimisticListHandlers<Item, Item>({
      qc,
      key,
      sort,
      update: (prev) => prev,
      errorMessage: "Couldn't add",
    });

    handlers.onSettled(undefined, null, { id: "a", position: 1024 });

    expect(invalidate).not.toHaveBeenCalled();
  });
});

interface Obj {
  id: string;
  name: string;
}

const objKey = ["obj"] as const;

describe("optimisticObjectHandlers", () => {
  it("optimistically updates the cached object and snapshots the previous value", async () => {
    const qc = new QueryClient();
    qc.setQueryData<Obj>(objKey, { id: "a", name: "Old" });

    const handlers = optimisticObjectHandlers<Obj, string>({
      qc,
      key: objKey,
      update: (prev, name) => (prev ? { ...prev, name } : prev),
      errorMessage: "Couldn't save",
    });

    const context = await handlers.onMutate("New");

    expect(qc.getQueryData<Obj>(objKey)).toEqual({ id: "a", name: "New" });
    expect(context.previous).toEqual({ id: "a", name: "Old" });
  });

  it("rolls back to the snapshot and toasts on error", async () => {
    const qc = new QueryClient();
    qc.setQueryData<Obj>(objKey, { id: "a", name: "Old" });

    const handlers = optimisticObjectHandlers<Obj, string>({
      qc,
      key: objKey,
      update: (prev, name) => (prev ? { ...prev, name } : prev),
      errorMessage: "Couldn't save",
    });

    const context = await handlers.onMutate("New");
    handlers.onError(new Error("boom"), "New", context);

    expect(qc.getQueryData<Obj>(objKey)).toEqual({ id: "a", name: "Old" });
    expect(toast.error).toHaveBeenCalledWith("Couldn't save");
  });

  it("invalidates the object key on settle by default", () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const handlers = optimisticObjectHandlers<Obj, string>({
      qc,
      key: objKey,
      update: (prev) => prev,
      errorMessage: "Couldn't save",
    });

    handlers.onSettled();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: objKey });
  });
});
