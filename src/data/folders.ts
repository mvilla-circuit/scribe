import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import type { Tables, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { execWrite, requireUserId } from "./crud";
import { listHandlers, patchById, removeBySet } from "./optimistic-list";
import { byPosition } from "./ordering";
import { booksKey, foldersKey } from "./query-keys";
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

// Patches a single folder by id. Backs rename/move so their mutationFns stay
// one-liners over a single typed Supabase call.
async function updateFolderRow(id: string, patch: TablesUpdate<"folders">) {
  await execWrite(supabase.from("folders").update(patch).eq("id", id));
}

/**
 * Builds the full folders row for a freshly created folder. Both the Supabase
 * insert and the optimistic cache entry derive from this one place so the
 * column set can't drift, mirroring `newDocumentRow`/`newBookRow`.
 */
function newFolderRow(input: CreateFolderInput, userId: string): Folder {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    name: input.name,
    parent_folder_id: input.parent_folder_id,
    position: input.position,
    created_at: now,
    updated_at: now,
  };
}

/** Mutation hook that creates a folder (optimistically appended to the cache). */
export function useCreateFolder() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateFolderInput) => {
      const userId = requireUserId(session);
      // Drop the DB-managed timestamps so Postgres defaults them on insert.
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newFolderRow(input, userId);
      await execWrite(supabase.from("folders").insert(row));
    },
    ...listHandlers<Folder, CreateFolderInput>({
      qc,
      key: foldersKey,
      update: (prev, input) => [
        ...prev,
        newFolderRow(input, requireUserId(session)),
      ],
      errorMessage: "Couldn't create folder",
    }),
  });
}

/** Mutation hook that renames a folder. */
export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameFolderInput) =>
      updateFolderRow(input.id, { name: input.name }),
    ...listHandlers<Folder, RenameFolderInput>({
      qc,
      key: foldersKey,
      update: (prev, input) => patchById(prev, input.id, { name: input.name }),
      errorMessage: "Couldn't rename folder",
    }),
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
    ...listHandlers<Folder, MoveFolderInput>({
      qc,
      key: foldersKey,
      update: (prev, input) =>
        patchById(prev, input.id, {
          parent_folder_id: input.parent_folder_id,
          position: input.position,
        }),
      errorMessage: "Couldn't move folder",
    }),
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
      await execWrite(supabase.from("folders").delete().eq("id", input.id));
    },
    // The folder and its subfolders cascade away; books inside fall back to the
    // root (folder_id -> null). We invalidate books on settle to reconcile.
    ...listHandlers<Folder, DeleteFolderInput>({
      qc,
      key: foldersKey,
      update: (prev, input) =>
        removeBySet(prev, collectFolderSubtree(prev, input.id)),
      errorMessage: "Couldn't delete folder",
      alsoInvalidate: [booksKey],
    }),
  });
}
