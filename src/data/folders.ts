import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Tables } from "../lib/database.types";
import { byPosition } from "./ordering";

export type Folder = Tables<"folders">;

export const foldersKey = ["folders"] as const;

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

// Snapshot + rollback helpers shared by every optimistic folder mutation.
async function optimistic(
  qc: QueryClient,
  update: (prev: Folder[]) => Folder[]
): Promise<{ previous: Folder[] | undefined }> {
  await qc.cancelQueries({ queryKey: foldersKey });
  const previous = qc.getQueryData<Folder[]>(foldersKey);
  qc.setQueryData<Folder[]>(foldersKey, (prev) =>
    (update(prev ?? []) ?? []).slice().sort(byPosition)
  );
  return { previous };
}

function rollback(qc: QueryClient, previous: Folder[] | undefined) {
  if (previous) qc.setQueryData(foldersKey, previous);
}

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
    onMutate: (input) => {
      const now = new Date().toISOString();
      return optimistic(qc, (prev) => [
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
      ]);
    },
    onError: (_e, _v, ctx) => {
      rollback(qc, ctx?.previous);
      toast.error("Couldn't create folder");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: foldersKey }),
  });
}

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
    onMutate: (input) =>
      optimistic(qc, (prev) =>
        prev.map((f) => (f.id === input.id ? { ...f, name: input.name } : f))
      ),
    onError: (_e, _v, ctx) => {
      rollback(qc, ctx?.previous);
      toast.error("Couldn't rename folder");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: foldersKey }),
  });
}

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
    onMutate: (input) =>
      optimistic(qc, (prev) =>
        prev.map((f) =>
          f.id === input.id
            ? {
                ...f,
                parent_folder_id: input.parent_folder_id,
                position: input.position,
              }
            : f
        )
      ),
    onError: (_e, _v, ctx) => {
      rollback(qc, ctx?.previous);
      toast.error("Couldn't move folder");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: foldersKey }),
  });
}

// Collects a folder plus all of its descendant folder ids (the set the DB will
// cascade-delete). Books reference folders with ON DELETE SET NULL, so they are
// not deleted -- they fall back to the root level.
export function collectFolderSubtree(
  folders: Folder[],
  rootId: string
): Set<string> {
  const childrenByParent = new Map<string, Folder[]>();
  for (const f of folders) {
    const key = f.parent_folder_id ?? "__root__";
    const list = childrenByParent.get(key) ?? [];
    list.push(f);
    childrenByParent.set(key, list);
  }
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop() as string;
    ids.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child.id);
  }
  return ids;
}

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
    onMutate: (input) =>
      optimistic(qc, (prev) => {
        const removed = collectFolderSubtree(prev, input.id);
        return prev.filter((f) => !removed.has(f.id));
      }),
    onError: (_e, _v, ctx) => {
      rollback(qc, ctx?.previous);
      toast.error("Couldn't delete folder");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: foldersKey });
      void qc.invalidateQueries({ queryKey: ["books"] });
    },
  });
}
