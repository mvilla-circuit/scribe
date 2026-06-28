import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

// Shared optimistic-update plumbing for the cached entities (books, folders,
// documents, profile). Every mutation follows the same recipe: snapshot the
// cache, apply an optimistic update, roll back + toast on error, and invalidate
// on settle. These factories capture that recipe so each table file only
// declares its mutationFn and the optimistic updater.

/** Comparator used to keep an optimistically-updated cached list sorted. */
export type Sorter<T> = (a: T, b: T) => number;

/** The snapshot captured in `onMutate` so `onError` can roll the cache back. */
export interface ListMutationContext<T> {
  previous: T[] | undefined;
}

/** The snapshot captured for a single-object cache entry. */
export interface ObjectMutationContext<T> {
  previous: T | null | undefined;
}

/**
 * Invalidates `keys` once the mutation settles — but only when this is the last
 * in-flight mutation (`isMutating() <= 1`, which counts the settling mutation
 * itself). Skipping while others are pending stops a refetch from clobbering
 * their not-yet-confirmed optimistic state.
 */
function invalidateOnSettle(qc: QueryClient, keys: QueryKey[]) {
  if (qc.isMutating() > 1) return;
  for (const queryKey of keys) {
    void qc.invalidateQueries({ queryKey });
  }
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
  // Keys to invalidate on settle (defaults to just this list's key). Use this
  // to also refresh derived caches — e.g. the cross-book page index when a
  // document changes — instead of hand-rolling `onSettled`.
  invalidateKeys?: QueryKey[];
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
    onSettled: () => {
      invalidateOnSettle(opts.qc, opts.invalidateKeys ?? [opts.key]);
    },
  };
}

/**
 * Single-object sibling of `optimisticListHandlers` for caches that hold one
 * value rather than a sorted list (e.g. the user's profile row).
 */
export function optimisticObjectHandlers<T, V>(opts: {
  qc: QueryClient;
  key: QueryKey;
  // How the cached object changes given the mutation's variables. Returning the
  // previous value unchanged is a safe no-op (e.g. when there's nothing cached).
  update: (prev: T | null, variables: V) => T | null;
  errorMessage: string;
  invalidateKeys?: QueryKey[];
}) {
  return {
    onMutate: async (variables: V): Promise<ObjectMutationContext<T>> => {
      await opts.qc.cancelQueries({ queryKey: opts.key });
      const previous = opts.qc.getQueryData<T | null>(opts.key);
      opts.qc.setQueryData<T | null>(opts.key, (prev) =>
        opts.update(prev ?? null, variables),
      );
      return { previous };
    },
    onError: (
      _error: unknown,
      _variables: V,
      context: ObjectMutationContext<T> | undefined,
    ) => {
      if (context) opts.qc.setQueryData(opts.key, context.previous);
      toast.error(opts.errorMessage);
    },
    onSettled: () => {
      invalidateOnSettle(opts.qc, opts.invalidateKeys ?? [opts.key]);
    },
  };
}
