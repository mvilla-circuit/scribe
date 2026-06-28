import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import type { Tables, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { optimisticListHandlers } from "./optimistic-list";
import { byPosition } from "./ordering";
import { collectSubtree } from "./subtree";

/** A single folder row from the `folders` table. */
export type Folder = Tables<"folders">;

/** Mutation input shapes, shared between each `mutationFn` and its optimistic updater. */
interface CreateFolderInput {
  id: string;
  name: string;
  parent_folder_id: string | null;
  position: number;
}
interface RenameFolderInput {
  id: string;
  name: string;
}
interface MoveFolderInput {
  id: string;
  parent_folder_id: string | null;
  position: number;
}
interface DeleteFolderInput {
  id: string;
}

const foldersKey = ["folders"] as const;
const booksKey = ["books"] as const;

/** Query hook for all of the signed-in user's folders, ordered by position. */
export function useFolders() {
  return useQuery({
    queryKey: foldersKey,
    queryFn: async (): Promise<Folder[]> => {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

// Shared config for every optimistic folders mutation: same cache key + sort.
function folderHandlers<V>(
  qc: ReturnType<typeof useQueryClient>,
  update: (prev: Folder[], variables: V) => Folder[],
  errorMessage: string,
  invalidateKeys?: QueryKey[],
) {
  return optimisticListHandlers<Folder, V>({
    qc,
    key: foldersKey,
    sort: byPosition,
    update,
    errorMessage,
    invalidateKeys,
  });
}

// Patches a single folder by id. Backs rename/move so their mutationFns stay
// one-liners over a single typed Supabase call.
async function updateFolderRow(id: string, patch: TablesUpdate<"folders">) {
  const { error } = await supabase.from("folders").update(patch).eq("id", id);
  if (error) throw error;
}

/** Mutation hook that creates a folder (optimistically appended to the cache). */
export function useCreateFolder() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateFolderInput) => {
      const userId = session?.user.id;
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("folders").insert({
        id: input.id,
        user_id: userId,
        name: input.name,
        parent_folder_id: input.parent_folder_id,
        position: input.position,
      });
      if (error) throw error;
    },
    ...folderHandlers<CreateFolderInput>(
      qc,
      (prev, input) => {
        const now = new Date().toISOString();
        return [
          ...prev,
          {
            id: input.id,
            user_id: session?.user.id ?? "",
            name: input.name,
            parent_folder_id: input.parent_folder_id,
            position: input.position,
            created_at: now,
            updated_at: now,
          },
        ];
      },
      "Couldn't create folder",
    ),
  });
}

/** Mutation hook that renames a folder. */
export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameFolderInput) =>
      updateFolderRow(input.id, { name: input.name }),
    ...folderHandlers<RenameFolderInput>(
      qc,
      (prev, input) =>
        prev.map((f) => (f.id === input.id ? { ...f, name: input.name } : f)),
      "Couldn't rename folder",
    ),
  });
}

/** Mutation hook that reparents and/or repositions a folder. */
export function useMoveFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveFolderInput) =>
      updateFolderRow(input.id, {
        parent_folder_id: input.parent_folder_id,
        position: input.position,
      }),
    ...folderHandlers<MoveFolderInput>(
      qc,
      (prev, input) =>
        prev.map((f) =>
          f.id === input.id
            ? {
                ...f,
                parent_folder_id: input.parent_folder_id,
                position: input.position,
              }
            : f,
        ),
      "Couldn't move folder",
    ),
  });
}

// Collects a folder plus all of its descendant folder ids (the set the DB will
// cascade-delete). Books reference folders with ON DELETE SET NULL, so they are
// not deleted -- they fall back to the root level.
function collectFolderSubtree(folders: Folder[], rootId: string): Set<string> {
  return collectSubtree(folders, rootId, (f) => f.parent_folder_id);
}

/** Mutation hook that deletes a folder; subfolders cascade and books fall back to root. */
export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteFolderInput) => {
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    // The folder and its subfolders cascade away; books inside fall back to the
    // root (folder_id -> null). We invalidate books on settle to reconcile.
    ...folderHandlers<DeleteFolderInput>(
      qc,
      (prev, input) => {
        const removed = collectFolderSubtree(prev, input.id);
        return prev.filter((f) => !removed.has(f.id));
      },
      "Couldn't delete folder",
      [foldersKey, booksKey],
    ),
  });
}
