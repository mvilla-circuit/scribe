import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FontMap } from "@/fonts/catalog";
import { useAuth } from "@/lib/auth";
import type { Tables, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { asJsonObject } from "@/lib/utils";

import {
  optimisticListHandlers,
  patchById,
  removeById,
} from "./optimistic-list";
import { byPosition } from "./ordering";
import { booksKey, pageIndexKey } from "./query-keys";

/** A single book row from the `books` table. */
export type Book = Tables<"books">;

/** Mutation input shapes, shared between each `mutationFn` and its optimistic updater. */
interface CreateBookInput {
  id: string;
  title: string;
  folder_id: string | null;
  position: number;
}
interface RenameBookInput {
  id: string;
  title: string;
}
type UpdateBookInput = { id: string } & Partial<
  Pick<Book, "title" | "subtitle" | "icon" | "cover_url" | "theme">
>;
interface MoveBookInput {
  id: string;
  folder_id: string | null;
  position: number;
}
interface DeleteBookInput {
  id: string;
}

/**
 * A book's `theme` jsonb. `fonts` holds per-role font overrides that take
 * precedence over the global settings; unset roles inherit from global.
 * `showSubtitle` toggles the Title Page subtitle slot, mirroring the per-page
 * `show_subtitle` column on documents.
 */
export interface BookTheme {
  fonts?: FontMap;
  showSubtitle?: boolean;
}

/** Typed view of the books.theme jsonb column. */
export function bookTheme(book: Book): BookTheme {
  return asJsonObject(book.theme);
}

/** The book's per-role font overrides (a partial role -> fontId map). */
export function bookFontOverrides(book: Book): FontMap {
  return asJsonObject(bookTheme(book).fonts);
}

/**
 * Whether the Title Page shows its subtitle slot. Defaults to true when a
 * subtitle already exists so existing books keep showing it, otherwise hidden.
 */
export function bookShowSubtitle(book: Book): boolean {
  const flag = bookTheme(book).showSubtitle;
  if (typeof flag === "boolean") return flag;
  return Boolean(book.subtitle && book.subtitle.trim().length > 0);
}

/** Query hook for all of the signed-in user's books, ordered by position. */
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
  invalidateKeys?: QueryKey[],
) {
  return optimisticListHandlers<Book, V>({
    qc,
    key: booksKey,
    sort: byPosition,
    update,
    errorMessage,
    invalidateKeys,
  });
}

// Patches a single book by id. Backs rename/update/move so their mutationFns
// stay one-liners over a single typed Supabase call.
async function updateBookRow(id: string, patch: TablesUpdate<"books">) {
  const { error } = await supabase.from("books").update(patch).eq("id", id);
  if (error) throw error;
}

/** Mutation hook that creates a book (optimistically appended to the cache). */
export function useCreateBook() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBookInput) => {
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
    ...bookHandlers<CreateBookInput>(
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

/** Mutation hook that renames a book. */
export function useRenameBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameBookInput) =>
      updateBookRow(input.id, { title: input.title }),
    ...bookHandlers<RenameBookInput>(
      qc,
      (prev, input) => patchById(prev, input.id, { title: input.title }),
      "Couldn't rename book",
    ),
  });
}

/**
 * Generic patch for a book's editable fields (subtitle, icon/cover, and the
 * Phase 6 font-role `theme`). Kept separate from rename so callers stay explicit.
 */
export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBookInput) => {
      const { id, ...patch } = input;
      return updateBookRow(id, patch);
    },
    ...bookHandlers<UpdateBookInput>(
      qc,
      (prev, input) => patchById(prev, input.id, input),
      "Couldn't update book",
    ),
  });
}

/** Mutation hook that moves a book to a folder and/or repositions it. */
export function useMoveBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveBookInput) =>
      updateBookRow(input.id, {
        folder_id: input.folder_id,
        position: input.position,
      }),
    ...bookHandlers<MoveBookInput>(
      qc,
      (prev, input) =>
        patchById(prev, input.id, {
          folder_id: input.folder_id,
          position: input.position,
        }),
      "Couldn't move book",
    ),
  });
}

/** Mutation hook that deletes a book; its documents cascade away in the DB. */
export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteBookInput) => {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    // Deleting a book cascade-deletes its documents in the DB. The cross-book
    // page index spans every book, so invalidate it too (mirroring the document
    // mutations) or page link cards keep resolving to the now-deleted pages.
    ...bookHandlers<DeleteBookInput>(
      qc,
      (prev, input) => removeById(prev, input.id),
      "Couldn't delete book",
      [booksKey, pageIndexKey],
    ),
  });
}
