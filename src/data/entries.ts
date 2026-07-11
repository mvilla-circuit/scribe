import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { execWrite, requireUserId } from "./crud";
import { listHandlers, patchById, removeById } from "./optimistic-list";
import { byPosition } from "./ordering";
import { entriesKey, entryContentKey, NO_COLLECTION } from "./query-keys";

/** A single row from the `entries` table, including its editor body. */
export type Entry = Tables<"entries">;

/** An entry row without its heavy editor `content`. */
export type EntryMeta = Omit<Entry, "content">;

/** Every entry column except `content`, for the lightweight structural list. */
const ENTRY_META_COLUMNS =
  "id, user_id, collection_id, title, icon, cover_url, properties, position, created_at, updated_at" as const;

interface CreateEntryInput {
  id: string;
  collection_id: string;
  title: string;
  position: number;
}

interface RenameEntryInput {
  id: string;
  title: string;
}

type UpdateEntryInput = { id: string } & Partial<
  Pick<Entry, "title" | "icon" | "cover_url" | "properties">
>;

interface DeleteEntryInput {
  id: string;
}

interface MoveEntryInput {
  id: string;
  collection_id: string;
  position: number;
}

interface UpdateEntryContentInput {
  id: string;
  content: Json;
}

/** Query hook for all entry metadata, ordered by position. */
export function useEntries() {
  return useQuery({
    queryKey: entriesKey,
    queryFn: async (): Promise<EntryMeta[]> => {
      const { data, error } = await supabase
        .from("entries")
        .select(ENTRY_META_COLUMNS)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

/** Query hook for a selected entry's editor body. */
export function useEntryContent(entryId: string | null) {
  return useQuery({
    queryKey: entryContentKey(entryId ?? NO_COLLECTION),
    enabled: entryId !== null,
    queryFn: async (): Promise<Json> => {
      if (entryId === null) return {};
      const { data, error } = await supabase
        .from("entries")
        .select("content")
        .eq("id", entryId)
        .single();
      if (error) throw error;
      return data.content;
    },
  });
}

async function updateEntryRow(id: string, patch: TablesUpdate<"entries">) {
  await execWrite(supabase.from("entries").update(patch).eq("id", id));
}

function newEntryRow(input: CreateEntryInput, userId: string): EntryMeta {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    collection_id: input.collection_id,
    title: input.title,
    icon: null,
    cover_url: null,
    properties: {},
    position: input.position,
    created_at: now,
    updated_at: now,
  };
}

/** Mutation hook that creates an entry in a collection. */
export function useCreateEntry() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newEntryRow(input, requireUserId(session));
      await execWrite(supabase.from("entries").insert({ ...row, content: {} }));
    },
    ...listHandlers<EntryMeta, CreateEntryInput>({
      qc,
      key: entriesKey,
      update: (prev, input) => [
        ...prev,
        newEntryRow(input, requireUserId(session)),
      ],
      errorMessage: "Couldn't create entry",
    }),
  });
}

/** Mutation hook that renames an entry. */
export function useRenameEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameEntryInput) =>
      updateEntryRow(input.id, { title: input.title }),
    ...listHandlers<EntryMeta, RenameEntryInput>({
      qc,
      key: entriesKey,
      update: (prev, input) =>
        patchById(prev, input.id, { title: input.title }),
      errorMessage: "Couldn't rename entry",
    }),
  });
}

/** Mutation hook that patches an entry's editable metadata. */
export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEntryInput) => {
      const { id, ...patch } = input;
      return updateEntryRow(id, patch);
    },
    ...listHandlers<EntryMeta, UpdateEntryInput>({
      qc,
      key: entriesKey,
      update: (prev, input) => patchById(prev, input.id, input),
      errorMessage: "Couldn't update entry",
    }),
  });
}

/** Mutation hook that deletes an entry. */
export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteEntryInput) => {
      await execWrite(supabase.from("entries").delete().eq("id", input.id));
    },
    ...listHandlers<EntryMeta, DeleteEntryInput>({
      qc,
      key: entriesKey,
      update: (prev, input) => removeById(prev, input.id),
      errorMessage: "Couldn't delete entry",
    }),
  });
}

/**
 * Mutation hook that moves an entry into a (possibly different) collection
 * and/or repositions it among that collection's children. Entries always
 * require a `collection_id` — they cannot live at the library root or in a
 * folder.
 */
export function useMoveEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveEntryInput) =>
      updateEntryRow(input.id, {
        collection_id: input.collection_id,
        position: input.position,
      }),
    ...listHandlers<EntryMeta, MoveEntryInput>({
      qc,
      key: entriesKey,
      update: (prev, input) =>
        patchById(prev, input.id, {
          collection_id: input.collection_id,
          position: input.position,
        }),
      errorMessage: "Couldn't move entry",
    }),
  });
}

/** Mutation hook that persists an entry body in its separate content cache. */
export function useUpdateEntryContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEntryContentInput) =>
      updateEntryRow(input.id, { content: input.content }),
    onMutate: async (input: UpdateEntryContentInput) => {
      const key = entryContentKey(input.id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Json>(key);
      qc.setQueryData<Json>(key, input.content);
      return { key, previous };
    },
    onError: (_error, _input, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      toast.error("Couldn't save changes");
    },
  });
}
