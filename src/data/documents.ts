import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type { FontMap } from "@/fonts/catalog";
import { useAuth } from "@/lib/auth";
import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { execWrite, requireUserId } from "./crud";
import { collectDocumentSubtree } from "./document-duplicate";
import { coerceFontMap } from "./font-map";
import { listHandlers, patchById, removeBySet } from "./optimistic-list";
import { byPosition } from "./ordering";
import { documentsKey, NO_BOOK, pageIndexKey } from "./query-keys";

/** A single page row from the `documents` table. */
export type Document = Tables<"documents">;

/** Mutation input shapes, shared between each `mutationFn` and its optimistic updater. */
interface CreateDocumentInput {
  id: string;
  title: string;
  parent_document_id: string | null;
  position: number;
  is_title_page?: boolean;
}
interface DuplicateDocumentInput {
  rows: Document[];
}
interface RenameDocumentInput {
  id: string;
  title: string;
}
type UpdateDocumentInput = { id: string } & Partial<
  Pick<
    Document,
    | "title"
    | "icon"
    | "subtitle"
    | "banner_color"
    | "banner_text"
    | "show_outline"
    | "show_subtitle"
  >
>;
interface MoveDocumentInput {
  id: string;
  parent_document_id: string | null;
  position: number;
}
interface DeleteDocumentInput {
  id: string;
}
interface UpdateContentInput {
  id: string;
  content: Json;
}
interface UpdateFontOverridesInput {
  id: string;
  font_overrides: DocFontOverrides | null;
}

/**
 * A page's per-role font overrides (a partial role -> fontId map). NULL on the
 * row means the page inherits everything from its book (which inherits global).
 */
export type DocFontOverrides = FontMap;

/** Typed view of the documents.font_overrides jsonb column. */
export function docFontOverrides(doc: Document): DocFontOverrides {
  return coerceFontMap(doc.font_overrides);
}

/** Query hook for one book's pages, ordered by position. */
export function useDocuments(bookId: string | null) {
  return useQuery({
    queryKey: documentsKey(bookId ?? NO_BOOK),
    enabled: bookId !== null,
    queryFn: async (): Promise<Document[]> => {
      if (bookId === null) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("book_id", bookId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

// Shared config for every optimistic documents mutation, scoped to one book's
// per-book cache entry. Always refreshes the cross-book page index too, so page
// link cards re-resolve their title/icon/breadcrumb when a document changes.
function documentHandlers<V>(
  qc: ReturnType<typeof useQueryClient>,
  key: ReturnType<typeof documentsKey>,
  update: (prev: Document[], variables: V) => Document[],
  errorMessage: string,
) {
  return listHandlers<Document, V>({
    qc,
    key,
    update,
    errorMessage,
    alsoInvalidate: [pageIndexKey],
  });
}

// Patches a single document by id. Backs rename/update/move/content/font hooks
// so their mutationFns stay one-liners over a single typed Supabase call.
async function updateDocumentRow(id: string, patch: TablesUpdate<"documents">) {
  await execWrite(supabase.from("documents").update(patch).eq("id", id));
}

/**
 * Builds the full documents row for a freshly created page. Both the Supabase
 * insert and the optimistic cache entry are derived from this one place so the
 * column set can't drift between them (the insert simply drops the two
 * DB-managed timestamps and lets Postgres default them).
 */
function newDocumentRow(
  input: CreateDocumentInput,
  bookId: string,
  userId: string,
): Document {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    book_id: bookId,
    parent_document_id: input.parent_document_id,
    title: input.title,
    icon: null,
    subtitle: null,
    banner_color: null,
    banner_text: null,
    show_outline: false,
    show_subtitle: false,
    is_title_page: input.is_title_page ?? false,
    position: input.position,
    content: {},
    font_overrides: null,
    created_at: now,
    updated_at: now,
  };
}

/** Mutation hook that inserts a new page (optimistically appended to the cache). */
export function useCreateDocument(bookId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const key = documentsKey(bookId);

  return useMutation({
    mutationFn: async (input: CreateDocumentInput) => {
      const userId = requireUserId(session);
      // Drop the DB-managed timestamps so Postgres defaults them on insert.
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newDocumentRow(input, bookId, userId);
      await execWrite(supabase.from("documents").insert(row));
    },
    ...documentHandlers<CreateDocumentInput>(
      qc,
      key,
      (prev, input) => [
        ...prev,
        newDocumentRow(input, bookId, requireUserId(session)),
      ],
      "Couldn't create page",
    ),
  });
}

/**
 * Inserts a pre-built set of duplicated rows (see buildDocumentDuplicate) in one
 * batch, stamping the current user onto each. The optimistic update appends the
 * same rows so the new pages appear instantly in the outline.
 */
export function useDuplicateDocument(bookId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const key = documentsKey(bookId);

  return useMutation({
    mutationFn: async (input: DuplicateDocumentInput) => {
      const userId = requireUserId(session);
      // Stamp the owner and let Postgres default the timestamps; every other
      // column carries over verbatim from the pre-built duplicate rows.
      const rows = input.rows.map(
        ({ created_at: _created, updated_at: _updated, ...r }) => ({
          ...r,
          user_id: userId,
        }),
      );
      await execWrite(supabase.from("documents").insert(rows));
    },
    ...documentHandlers<DuplicateDocumentInput>(
      qc,
      key,
      (prev, input) => {
        const userId = requireUserId(session);
        return [...prev, ...input.rows.map((r) => ({ ...r, user_id: userId }))];
      },
      "Couldn't duplicate page",
    ),
  });
}

/** Mutation hook that renames a page. */
export function useRenameDocument(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: (input: RenameDocumentInput) =>
      updateDocumentRow(input.id, { title: input.title }),
    ...documentHandlers<RenameDocumentInput>(
      qc,
      key,
      (prev, input) => patchById(prev, input.id, { title: input.title }),
      "Couldn't rename page",
    ),
  });
}

/**
 * Generic patch for a document's page-level settings (icon, subtitle, banner,
 * outline visibility). Kept separate from rename/move/content so each call
 * site stays explicit about what it touches.
 */
export function useUpdateDocument(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: (input: UpdateDocumentInput) => {
      const { id, ...patch } = input;
      return updateDocumentRow(id, patch);
    },
    ...documentHandlers<UpdateDocumentInput>(
      qc,
      key,
      (prev, input) => patchById(prev, input.id, input),
      "Couldn't update page",
    ),
  });
}

/** Mutation hook that reparents and/or repositions a page within its book. */
export function useMoveDocument(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: (input: MoveDocumentInput) =>
      updateDocumentRow(input.id, {
        parent_document_id: input.parent_document_id,
        position: input.position,
      }),
    ...documentHandlers<MoveDocumentInput>(
      qc,
      key,
      (prev, input) =>
        patchById(prev, input.id, {
          parent_document_id: input.parent_document_id,
          position: input.position,
        }),
      "Couldn't move page",
    ),
  });
}

/** Mutation hook that deletes a page; descendants cascade away in the DB. */
export function useDeleteDocument(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: async (input: DeleteDocumentInput) => {
      await execWrite(supabase.from("documents").delete().eq("id", input.id));
    },
    // The page and its descendants cascade away in the DB; remove the same set
    // optimistically so the outline and TOC update instantly.
    ...documentHandlers<DeleteDocumentInput>(
      qc,
      key,
      (prev, input) =>
        removeBySet(prev, collectDocumentSubtree(prev, input.id)),
      "Couldn't delete page",
    ),
  });
}

/**
 * Persists a document body. Used by the Phase 4 editor; included here so the
 * data layer is complete and the editor only has to call mutate.
 */
export function useUpdateDocumentContent(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: (input: UpdateContentInput) =>
      updateDocumentRow(input.id, { content: input.content }),
    ...documentHandlers<UpdateContentInput>(
      qc,
      key,
      (prev, input) => patchById(prev, input.id, { content: input.content }),
      "Couldn't save changes",
    ),
  });
}

/**
 * Writes or clears a page's font-role overrides. Passing `null` clears the
 * column so the page inherits its book's choice again ("Inherit from book").
 */
export function useUpdateDocumentFontOverrides(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: (input: UpdateFontOverridesInput) =>
      updateDocumentRow(input.id, { font_overrides: input.font_overrides }),
    ...documentHandlers<UpdateFontOverridesInput>(
      qc,
      key,
      (prev, input) =>
        patchById(prev, input.id, { font_overrides: input.font_overrides }),
      "Couldn't update page fonts",
    ),
  });
}

/**
 * Whether a loaded page list still needs its single Title Page created. Pure so
 * the policy ("every book has exactly one Title Page") is testable in isolation
 * from the effect that acts on it.
 */
export function needsTitlePage(documents: Document[]): boolean {
  return !documents.some((d) => d.is_title_page);
}

/**
 * Ensures every book has exactly one Title Page. Called when a book opens: once
 * its documents have loaded and none is flagged is_title_page, it creates one.
 * The optimistic insert flips the guard immediately, so it never double-creates.
 */
export function useEnsureTitlePage(bookId: string | null) {
  const query = useDocuments(bookId);
  const createDocument = useCreateDocument(bookId ?? NO_BOOK);
  const create = createDocument.mutate;

  const documents = query.data;
  const ready = query.isSuccess;

  // Guard against creating more than one Title Page: React StrictMode invokes
  // effects twice in dev, and both runs would see the pre-insert document list.
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!bookId || !ready || !documents) return;
    if (!needsTitlePage(documents)) return;
    if (attempted.current.has(bookId)) return;
    attempted.current.add(bookId);
    create(
      {
        id: crypto.randomUUID(),
        title: "Title Page",
        parent_document_id: null,
        position: 0,
        is_title_page: true,
      },
      {
        // A transient failure rolls the optimistic Title Page back out of the
        // cache, so clear the guard to allow a retry on the next render/refetch.
        // Without this, a single failed insert leaves the book with no Title
        // Page for the rest of the session.
        onError: () => {
          attempted.current.delete(bookId);
        },
      },
    );
  }, [bookId, ready, documents, create]);
}
