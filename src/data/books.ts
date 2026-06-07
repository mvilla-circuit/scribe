import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Tables } from "../lib/database.types";
import { byPosition } from "./ordering";
import { optimisticListHandlers } from "./optimisticList";

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

// Shared config for every optimistic books mutation: same cache key + sort.
function bookHandlers<V>(
  qc: ReturnType<typeof useQueryClient>,
  update: (prev: Book[], variables: V) => Book[],
  errorMessage: string
) {
  return optimisticListHandlers<Book, V>({
    qc,
    key: booksKey,
    sort: byPosition,
    update,
    errorMessage,
  });
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
    ...bookHandlers<{
      id: string;
      title: string;
      folder_id: string | null;
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
        ];
      },
      "Couldn't create book"
    ),
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
    ...bookHandlers<{ id: string; title: string }>(
      qc,
      (prev, input) =>
        prev.map((b) => (b.id === input.id ? { ...b, title: input.title } : b)),
      "Couldn't rename book"
    ),
  });
}

// Generic patch for a book's editable fields (subtitle today; icon/cover land
// in later phases). Kept separate from rename so callers stay explicit.
export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { id: string } & Partial<
        Pick<Book, "title" | "subtitle" | "icon" | "cover_url">
      >
    ) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("books").update(patch).eq("id", id);
      if (error) throw error;
    },
    ...bookHandlers<
      { id: string } & Partial<
        Pick<Book, "title" | "subtitle" | "icon" | "cover_url">
      >
    >(
      qc,
      (prev, input) =>
        prev.map((b) => (b.id === input.id ? { ...b, ...input } : b)),
      "Couldn't update book"
    ),
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
    ...bookHandlers<{ id: string; folder_id: string | null; position: number }>(
      qc,
      (prev, input) =>
        prev.map((b) =>
          b.id === input.id
            ? { ...b, folder_id: input.folder_id, position: input.position }
            : b
        ),
      "Couldn't move book"
    ),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await supabase.from("books").delete().eq("id", input.id);
      if (error) throw error;
    },
    ...bookHandlers<{ id: string }>(
      qc,
      (prev, input) => prev.filter((b) => b.id !== input.id),
      "Couldn't delete book"
    ),
  });
}
