import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { optimisticListHandlers } from "./optimistic-list";

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

    handlers.onSettled();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
  });

  it("uses a custom onSettled when provided", () => {
    const qc = new QueryClient();
    const onSettled = vi.fn();

    const handlers = optimisticListHandlers<Item, Item>({
      qc,
      key,
      sort,
      update: (prev) => prev,
      errorMessage: "Couldn't add",
      onSettled,
    });

    handlers.onSettled();

    expect(onSettled).toHaveBeenCalledOnce();
  });
});
