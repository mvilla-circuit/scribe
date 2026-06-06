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

export type Book = Tables<"books">;

export const booksKey = ["books"] as const;

export function useBooks() {
  return useQuery({
    queryKey: booksKey,
    queryFn: async (): Promise<Book[]> => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

async function optimistic(
  qc: QueryClient,
  update: (prev: Book[]) => Book[]
): Promise<{ previous: Book[] | undefined }> {
  await qc.cancelQueries({ queryKey: booksKey });
  const previous = qc.getQueryData<Book[]>(booksKey);
  qc.setQueryData<Book[]>(booksKey, (prev) =>
    (update(prev ?? []) ?? []).slice().sort(byPosition)
  );
  return { previous };
}

function rollback(qc: QueryClient, previous: Book[] | undefined) {
  if (previous) qc.setQueryData(booksKey, previous);
}

export function useCreateBook() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      folder_id: string | null;
      position: number;
    }) => {
      const userId = session?.user.id;
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("books").insert({
        id: input.id,
        user_id: userId,
        title: input.title,
        folder_id: input.folder_id,
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
          title: input.title,
          subtitle: null,
          cover_url: null,
          icon: null,
          theme: {},
          folder_id: input.folder_id,
          position: input.position,
          created_at: now,
          updated_at: now,
        },
      ]);
    },
    onError: (_e, _v, ctx) => {
      rollback(qc, ctx?.previous);
      toast.error("Couldn't create book");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: booksKey }),
  });
}

export function useRenameBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const { error } = await supabase
        .from("books")
        .update({ title: input.title })
        .eq("id", input.id);
      if (error) throw error;
    },
    onMutate: (input) =>
      optimistic(qc, (prev) =>
        prev.map((b) => (b.id === input.id ? { ...b, title: input.title } : b))
      ),
    onError: (_e, _v, ctx) => {
      rollback(qc, ctx?.previous);
      toast.error("Couldn't rename book");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: booksKey }),
  });
}

export function useMoveBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      folder_id: string | null;
      position: number;
    }) => {
      const { error } = await supabase
        .from("books")
        .update({ folder_id: input.folder_id, position: input.position })
        .eq("id", input.id);
      if (error) throw error;
    },
    onMutate: (input) =>
      optimistic(qc, (prev) =>
        prev.map((b) =>
          b.id === input.id
            ? { ...b, folder_id: input.folder_id, position: input.position }
            : b
        )
      ),
    onError: (_e, _v, ctx) => {
      rollback(qc, ctx?.previous);
      toast.error("Couldn't move book");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: booksKey }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await supabase.from("books").delete().eq("id", input.id);
      if (error) throw error;
    },
    onMutate: (input) =>
      optimistic(qc, (prev) => prev.filter((b) => b.id !== input.id)),
    onError: (_e, _v, ctx) => {
      rollback(qc, ctx?.previous);
      toast.error("Couldn't delete book");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: booksKey }),
  });
}
