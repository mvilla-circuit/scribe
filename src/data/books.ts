import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FontMap } from "../fonts/catalog";
import { useAuth } from "../lib/auth";
import type { Tables } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { optimisticListHandlers } from "./optimisticList";
import { byPosition } from "./ordering";

export type Book = Tables<"books">;

// A book's `theme` jsonb. `fonts` holds per-role font overrides that take
// precedence over the global settings; unset roles inherit from global.
// `showSubtitle` toggles the Title Page subtitle slot, mirroring the per-page
// `show_subtitle` column on documents.
export interface BookTheme {
  fonts?: FontMap;
  showSubtitle?: boolean;
}

// Typed view of the books.theme jsonb column.
export function bookTheme(book: Book): BookTheme {
  const theme = book.theme;
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) return {};
  return theme;
}

// The book's per-role font overrides (a partial role -> fontId map).
export function bookFontOverrides(book: Book): FontMap {
  const fonts = bookTheme(book).fonts;
  if (!fonts || typeof fonts !== "object" || Array.isArray(fonts)) return {};
  return fonts;
}

// Whether the Title Page shows its subtitle slot. Defaults to true when a
// subtitle already exists so existing books keep showing it, otherwise hidden.
export function bookShowSubtitle(book: Book): boolean {
  const flag = bookTheme(book).showSubtitle;
  if (typeof flag === "boolean") return flag;
  return Boolean(book.subtitle && book.subtitle.trim().length > 0);
}

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
  errorMessage: string,
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
      "Couldn't create book",
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
      "Couldn't rename book",
    ),
  });
}

// Generic patch for a book's editable fields (subtitle, icon/cover, and the
// Phase 6 font-role `theme`). Kept separate from rename so callers stay explicit.
export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { id: string } & Partial<
        Pick<Book, "title" | "subtitle" | "icon" | "cover_url" | "theme">
      >,
    ) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("books").update(patch).eq("id", id);
      if (error) throw error;
    },
    ...bookHandlers<
      { id: string } & Partial<
        Pick<Book, "title" | "subtitle" | "icon" | "cover_url" | "theme">
      >
    >(
      qc,
      (prev, input) =>
        prev.map((b) => (b.id === input.id ? { ...b, ...input } : b)),
      "Couldn't update book",
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
            : b,
        ),
      "Couldn't move book",
    ),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    ...bookHandlers<{ id: string }>(
      qc,
      (prev, input) => prev.filter((b) => b.id !== input.id),
      "Couldn't delete book",
    ),
  });
}
