import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { optimisticListHandlers } from "./optimisticList";
import { byPosition } from "./ordering";
import { collectSubtree } from "./subtree";

/** A single folder row from the `folders` table. */
export type Folder = Tables<"folders">;

const foldersKey = ["folders"] as const;

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
  onSettled?: () => void,
) {
  return optimisticListHandlers<Folder, V>({
    qc,
    key: foldersKey,
    sort: byPosition,
    update,
    errorMessage,
    onSettled,
  });
}

/** Mutation hook that creates a folder (optimistically appended to the cache). */
export function useCreateFolder() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      parent_folder_id: string | null;
      position: number;
    }) => {
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
    ...folderHandlers<{
      id: string;
      name: string;
      parent_folder_id: string | null;
      position: number;
    }>(
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
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase
        .from("folders")
        .update({ name: input.name })
        .eq("id", input.id);
      if (error) throw error;
    },
    ...folderHandlers<{ id: string; name: string }>(
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
    mutationFn: async (input: {
      id: string;
      parent_folder_id: string | null;
      position: number;
    }) => {
      const { error } = await supabase
        .from("folders")
        .update({
          parent_folder_id: input.parent_folder_id,
          position: input.position,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    ...folderHandlers<{
      id: string;
      parent_folder_id: string | null;
      position: number;
    }>(
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
    mutationFn: async (input: { id: string }) => {
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    // The folder and its subfolders cascade away; books inside fall back to the
    // root (folder_id -> null). We invalidate books on settle to reconcile.
    ...folderHandlers<{ id: string }>(
      qc,
      (prev, input) => {
        const removed = collectFolderSubtree(prev, input.id);
        return prev.filter((f) => !removed.has(f.id));
      },
      "Couldn't delete folder",
      () => {
        void qc.invalidateQueries({ queryKey: foldersKey });
        void qc.invalidateQueries({ queryKey: ["books"] });
      },
    ),
  });
}
