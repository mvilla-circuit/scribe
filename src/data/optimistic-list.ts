import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

// Shared optimistic-update plumbing for the cached entity lists (books, folders,
// documents). Every list is a sorted array under a single query key, and every
// mutation follows the same recipe: snapshot the cache, apply an optimistic
// update (re-sorted), roll back + toast on error, and invalidate on settle.
// This factory captures that recipe so each table file only declares its
// mutationFn and the optimistic updater.

/** Comparator used to keep an optimistically-updated cached list sorted. */
export type Sorter<T> = (a: T, b: T) => number;

/** The snapshot captured in `onMutate` so `onError` can roll the cache back. */
export interface ListMutationContext<T> {
  previous: T[] | undefined;
}

// Low-level snapshot/apply/rollback pair, bound to one query key + sort. Backs
// `optimisticListHandlers` below.
function listOptimism<T>(qc: QueryClient, key: QueryKey, sort: Sorter<T>) {
  async function optimistic(
    update: (prev: T[]) => T[],
  ): Promise<ListMutationContext<T>> {
    await qc.cancelQueries({ queryKey: key });
    const previous = qc.getQueryData<T[]>(key);
    qc.setQueryData<T[]>(key, (prev) =>
      (update(prev ?? []) ?? []).slice().sort(sort),
    );
    return { previous };
  }

  function rollback(previous: T[] | undefined) {
    if (previous) qc.setQueryData(key, previous);
  }

  return { optimistic, rollback };
}

/**
 * Builds the `onMutate`/`onError`/`onSettled` trio for an optimistic list
 * mutation. Spread the result into `useMutation` alongside its `mutationFn`.
 */
export function optimisticListHandlers<T, V>(opts: {
  qc: QueryClient;
  key: QueryKey;
  sort: Sorter<T>;
  // How the cached list changes given the mutation's variables.
  update: (prev: T[], variables: V) => T[];
  // Toast shown when the mutation fails and the cache is rolled back.
  errorMessage: string;
  // Defaults to invalidating this list's key; override to invalidate more.
  onSettled?: () => void;
}) {
  const { optimistic, rollback } = listOptimism<T>(
    opts.qc,
    opts.key,
    opts.sort,
  );
  return {
    onMutate: (variables: V) =>
      optimistic((prev) => opts.update(prev, variables)),
    onError: (
      _error: unknown,
      _variables: V,
      context: ListMutationContext<T> | undefined,
    ) => {
      rollback(context?.previous);
      toast.error(opts.errorMessage);
    },
    onSettled:
      opts.onSettled ??
      (() => opts.qc.invalidateQueries({ queryKey: opts.key })),
  };
}
