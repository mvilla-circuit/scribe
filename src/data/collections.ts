import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import type { Tables, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { execWrite, requireUserId } from "./crud";
import type { EntryMeta } from "./entries";
import {
  listHandlers,
  optimisticListHandlers,
  patchById,
  removeById,
} from "./optimistic-list";
import { byPosition } from "./ordering";
import { booksKey, collectionsKey, entriesKey } from "./query-keys";

/** A single collection row from the `collections` table. */
export type Collection = Tables<"collections">;

/** Mutation input shapes, shared between each `mutationFn` and its optimistic updater. */
interface CreateCollectionInput {
  id: string;
  name: string;
  position: number;
  parent_collection_id?: string | null;
  icon?: string | null;
}
interface RenameCollectionInput {
  id: string;
  name: string;
}
interface MoveCollectionInput {
  id: string;
  parent_collection_id: string | null;
  position: number;
}
type UpdateCollectionInput = { id: string } & Partial<
  Pick<Collection, "name" | "icon" | "description">
>;
interface DeleteCollectionInput {
  id: string;
}

/** Query hook for all of the signed-in user's collections, ordered by position. */
export function useCollections() {
  return useQuery({
    queryKey: collectionsKey,
    queryFn: async (): Promise<Collection[]> => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

// Patches a single collection by id. Backs rename/update so their mutationFns
// stay one-liners over a single typed Supabase call.
async function updateCollectionRow(
  id: string,
  patch: TablesUpdate<"collections">,
) {
  await execWrite(supabase.from("collections").update(patch).eq("id", id));
}

/**
 * Builds the full collections row for a freshly created collection. Both the
 * Supabase insert and the optimistic cache entry derive from this one place so
 * the column set can't drift (the insert drops the DB-managed timestamps and
 * lets Postgres default them), mirroring `newBookRow`.
 */
function newCollectionRow(
  input: CreateCollectionInput,
  userId: string,
): Collection {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    name: input.name,
    icon: input.icon ?? null,
    description: null,
    parent_collection_id: input.parent_collection_id ?? null,
    fields: [],
    view: {},
    position: input.position,
    created_at: now,
    updated_at: now,
  };
}

/** Mutation hook that creates a collection (optimistically appended to the cache). */
export function useCreateCollection() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCollectionInput) => {
      const userId = requireUserId(session);
      // Drop the DB-managed timestamps so Postgres defaults them on insert.
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newCollectionRow(input, userId);
      await execWrite(supabase.from("collections").insert(row));
    },
    ...listHandlers<Collection, CreateCollectionInput>({
      qc,
      key: collectionsKey,
      update: (prev, input) => [
        ...prev,
        newCollectionRow(input, requireUserId(session)),
      ],
      errorMessage: "Couldn't create collection",
    }),
  });
}

/** Mutation hook that renames a collection. */
export function useRenameCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameCollectionInput) =>
      updateCollectionRow(input.id, { name: input.name }),
    ...listHandlers<Collection, RenameCollectionInput>({
      qc,
      key: collectionsKey,
      update: (prev, input) => patchById(prev, input.id, { name: input.name }),
      errorMessage: "Couldn't rename collection",
    }),
  });
}

/**
 * Mutation hook that reparents a collection under another collection (or the
 * root when `parent_collection_id` is null) and/or repositions it, mirroring
 * `useMoveBook`. Writes `parent_collection_id` and `position` in one row update
 * with an optimistic cache patch.
 */
export function useMoveCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveCollectionInput) =>
      updateCollectionRow(input.id, {
        parent_collection_id: input.parent_collection_id,
        position: input.position,
      }),
    ...listHandlers<Collection, MoveCollectionInput>({
      qc,
      key: collectionsKey,
      update: (prev, input) =>
        patchById(prev, input.id, {
          parent_collection_id: input.parent_collection_id,
          position: input.position,
        }),
      errorMessage: "Couldn't move collection",
    }),
  });
}

/**
 * Generic patch for a collection's editable fields (name, icon, description).
 * Kept separate from rename so callers stay explicit about what they touch.
 */
export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCollectionInput) => {
      const { id, ...patch } = input;
      return updateCollectionRow(id, patch);
    },
    ...listHandlers<Collection, UpdateCollectionInput>({
      qc,
      key: collectionsKey,
      update: (prev, input) => patchById(prev, input.id, input),
      errorMessage: "Couldn't update collection",
    }),
  });
}

/**
 * Mutation hook that deletes a collection. Its books and child collections are
 * reparented to the top level by the `ON DELETE SET NULL` FKs; its entries are
 * cascade-deleted with the collection.
 */
export function useDeleteCollection() {
  const qc = useQueryClient();
  // The DB reparents the collection's books and child collections to the top
  // level via `ON DELETE SET NULL`. Mirror that optimistically across *both*
  // caches so nothing referencing the deleted id survives to be bucketed under
  // a container that no longer exists (which would make it vanish from the tree
  // until the settle refetch lands). The collections cache — remove the row and
  // null its direct children's `parent_collection_id` — plus the settle
  // invalidation of both keys are handled by the shared list factory; the books
  // cache reparent is layered on top.
  const base = optimisticListHandlers<Collection, DeleteCollectionInput>({
    qc,
    key: collectionsKey,
    sort: byPosition,
    update: (prev, input) =>
      removeById(prev, input.id).map((c) =>
        c.parent_collection_id === input.id
          ? { ...c, parent_collection_id: null }
          : c,
      ),
    errorMessage: "Couldn't delete collection",
    invalidateKeys: [collectionsKey, booksKey, entriesKey],
  });

  type BookRow = Tables<"books">;
  return useMutation({
    ...base,
    mutationFn: async (input: DeleteCollectionInput) => {
      await execWrite(supabase.from("collections").delete().eq("id", input.id));
    },
    onMutate: async (input: DeleteCollectionInput) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: booksKey }),
        qc.cancelQueries({ queryKey: entriesKey }),
      ]);
      const previousBooks = qc.getQueryData<BookRow[]>(booksKey);
      const previousEntries = qc.getQueryData<EntryMeta[]>(entriesKey);
      qc.setQueryData<BookRow[]>(booksKey, (prev) =>
        (prev ?? []).map((b) =>
          b.collection_id === input.id ? { ...b, collection_id: null } : b,
        ),
      );
      qc.setQueryData<EntryMeta[]>(entriesKey, (prev) =>
        (prev ?? []).filter((entry) => entry.collection_id !== input.id),
      );
      const collectionsContext = await base.onMutate(input);
      return { ...collectionsContext, previousBooks, previousEntries };
    },
    onError: (error, input, context) => {
      if (context?.previousBooks) {
        qc.setQueryData(booksKey, context.previousBooks);
      }
      if (context?.previousEntries) {
        qc.setQueryData(entriesKey, context.previousEntries);
      }
      base.onError(error, input, context);
    },
  });
}
