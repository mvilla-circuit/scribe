import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FontMap } from "@/fonts/catalog";
import { useAuth } from "@/lib/auth";
import type { Tables, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { asJsonObject } from "@/lib/utils";

import { execWrite, requireUserId } from "./crud";
import { coerceFontMap } from "./font-map";
import { listHandlers, patchById, removeById } from "./optimistic-list";
import { byPosition } from "./ordering";
import { booksKey, pageIndexKey } from "./query-keys";
import { pruneWhiteboardCache } from "./whiteboard-cache";

/** A single book row from the `books` table. */
export type Book = Tables<"books">;

/** Mutation input shapes, shared between each `mutationFn` and its optimistic updater. */
interface CreateBookInput {
  id: string;
  title: string;
  folder_id: string | null;
  collection_id?: string | null;
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
  collection_id: string | null;
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
  return coerceFontMap(bookTheme(book).fonts);
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

// Patches a single book by id. Backs rename/update/move so their mutationFns
// stay one-liners over a single typed Supabase call.
async function updateBookRow(id: string, patch: TablesUpdate<"books">) {
  await execWrite(supabase.from("books").update(patch).eq("id", id));
}

/**
 * Builds the full books row for a freshly created book. Both the Supabase
 * insert and the optimistic cache entry derive from this one place so the
 * column set can't drift (the insert drops the DB-managed timestamps and lets
 * Postgres default them), mirroring `newDocumentRow`.
 */
function newBookRow(input: CreateBookInput, userId: string): Book {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    title: input.title,
    subtitle: null,
    cover_url: null,
    icon: null,
    theme: {},
    folder_id: input.folder_id,
    collection_id: input.collection_id ?? null,
    position: input.position,
    created_at: now,
    updated_at: now,
  };
}

/** Mutation hook that creates a book (optimistically appended to the cache). */
export function useCreateBook() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBookInput) => {
      const userId = requireUserId(session);
      // Drop the DB-managed timestamps so Postgres defaults them on insert.
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newBookRow(input, userId);
      await execWrite(supabase.from("books").insert(row));
    },
    ...listHandlers<Book, CreateBookInput>({
      qc,
      key: booksKey,
      update: (prev, input) => [
        ...prev,
        newBookRow(input, requireUserId(session)),
      ],
      errorMessage: "Couldn't create book",
    }),
  });
}

/** Mutation hook that renames a book. */
export function useRenameBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameBookInput) =>
      updateBookRow(input.id, { title: input.title }),
    ...listHandlers<Book, RenameBookInput>({
      qc,
      key: booksKey,
      update: (prev, input) =>
        patchById(prev, input.id, { title: input.title }),
      errorMessage: "Couldn't rename book",
    }),
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
    ...listHandlers<Book, UpdateBookInput>({
      qc,
      key: booksKey,
      update: (prev, input) => patchById(prev, input.id, input),
      errorMessage: "Couldn't update book",
    }),
  });
}

/**
 * Mutation hook that moves a book into a folder or a collection (or the root)
 * and/or repositions it. A book's two containers are mutually exclusive, so
 * callers pass the winning container and null the other; both `folder_id` and
 * `collection_id` are written on every move to enforce that invariant.
 */
export function useMoveBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveBookInput) =>
      updateBookRow(input.id, {
        folder_id: input.folder_id,
        collection_id: input.collection_id,
        position: input.position,
      }),
    ...listHandlers<Book, MoveBookInput>({
      qc,
      key: booksKey,
      update: (prev, input) =>
        patchById(prev, input.id, {
          folder_id: input.folder_id,
          collection_id: input.collection_id,
          position: input.position,
        }),
      errorMessage: "Couldn't move book",
    }),
  });
}

/** Mutation hook that deletes a book; its documents cascade away in the DB. */
export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteBookInput) => {
      await execWrite(supabase.from("books").delete().eq("id", input.id));
    },
    // Deleting a book cascade-deletes its documents in the DB. The cross-book
    // page index spans every book, so invalidate it too (mirroring the document
    // mutations) or page link cards keep resolving to the now-deleted pages.
    ...listHandlers<Book, DeleteBookInput>({
      qc,
      key: booksKey,
      update: (prev, input) => removeById(prev, input.id),
      errorMessage: "Couldn't delete book",
      alsoInvalidate: [pageIndexKey],
    }),
    onSuccess: (_data, input) => {
      pruneWhiteboardCache(qc, (whiteboard) => whiteboard.book_id === input.id);
    },
  });
}
