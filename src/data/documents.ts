import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { FontMap } from "@/fonts/catalog";
import { useAuth } from "@/lib/auth";
import type { Json, Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { optimisticListHandlers } from "./optimistic-list";
import { byPosition, getPositionBetween } from "./ordering";
import { pageIndexKey } from "./page-index";
import { collectSubtree } from "./subtree";

/** A single page row from the `documents` table. */
export type Document = Tables<"documents">;

/**
 * A page's per-role font overrides (a partial role -> fontId map). NULL on the
 * row means the page inherits everything from its book (which inherits global).
 */
export type DocFontOverrides = FontMap;

/** Typed view of the documents.font_overrides jsonb column. */
export function docFontOverrides(doc: Document): DocFontOverrides {
  const overrides = doc.font_overrides;
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return {};
  }
  return overrides;
}

// Documents are keyed per book so opening a book loads only its own pages and
// optimistic mutations touch a single, well-scoped cache entry.
export const documentsKey = (bookId: string) => ["documents", bookId] as const;

/** Query hook for one book's pages, ordered by position. */
export function useDocuments(bookId: string | null) {
  return useQuery({
    queryKey: documentsKey(bookId ?? "__none__"),
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
// per-book cache entry.
function documentHandlers<V>(
  qc: ReturnType<typeof useQueryClient>,
  key: ReturnType<typeof documentsKey>,
  update: (prev: Document[], variables: V) => Document[],
  errorMessage: string,
) {
  return optimisticListHandlers<Document, V>({
    qc,
    key,
    sort: byPosition,
    update,
    errorMessage,
    // Keep the cross-book page index fresh too, so page link cards re-resolve
    // their title/icon/breadcrumb when a document is renamed, moved, or deleted.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: pageIndexKey });
    },
  });
}

/**
 * Collects a document plus all of its descendant ids. The DB cascades the
 * delete (parent_document_id ON DELETE CASCADE); we mirror that optimistically.
 */
export function collectDocumentSubtree(
  documents: Document[],
  rootId: string,
): Set<string> {
  return collectSubtree(documents, rootId, (d) => d.parent_document_id);
}

/**
 * Builds the rows for a deep copy of a page and all of its nested pages,
 * inserted as a sibling right after the source. Each copied page gets a fresh
 * id, descendants are re-parented onto those new ids, and only the copy's root
 * is renamed (" copy") and repositioned; descendants keep their relative order.
 * `user_id` is left blank here and stamped by the mutation at insert time.
 */
export function buildDocumentDuplicate(
  documents: Document[],
  sourceId: string,
): { rows: Document[]; rootId: string } | null {
  const source = documents.find((d) => d.id === sourceId);
  if (!source || source.is_title_page) return null;

  const subtreeIds = collectDocumentSubtree(documents, sourceId);
  const idMap = new Map<string, string>();
  for (const id of subtreeIds) idMap.set(id, crypto.randomUUID());

  const siblings = documents
    .filter(
      (d) =>
        !d.is_title_page && d.parent_document_id === source.parent_document_id,
    )
    .sort(byPosition);
  const sourceIdx = siblings.findIndex((d) => d.id === sourceId);
  const next = siblings[sourceIdx + 1];
  const rootPosition = getPositionBetween(source.position, next?.position);

  const now = new Date().toISOString();
  const rows = documents
    .filter((d) => subtreeIds.has(d.id))
    .map((d): Document => {
      const isRoot = d.id === sourceId;
      // Every subtree id is in idMap; the `??` fallbacks just keep the types
      // honest (they never trigger given the filter above).
      const newId = idMap.get(d.id) ?? d.id;
      const newParent =
        d.parent_document_id === null
          ? null
          : (idMap.get(d.parent_document_id) ?? d.parent_document_id);
      return {
        ...d,
        id: newId,
        user_id: "",
        parent_document_id: isRoot ? d.parent_document_id : newParent,
        title: isRoot ? `${d.title || "Untitled"} copy` : d.title,
        position: isRoot ? rootPosition : d.position,
        created_at: now,
        updated_at: now,
      };
    });

  return { rows, rootId: idMap.get(sourceId) ?? sourceId };
}

/** Mutation hook that inserts a new page (optimistically appended to the cache). */
export function useCreateDocument(bookId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const key = documentsKey(bookId);

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      parent_document_id: string | null;
      position: number;
      is_title_page?: boolean;
    }) => {
      const userId = session?.user.id;
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("documents").insert({
        id: input.id,
        user_id: userId,
        book_id: bookId,
        parent_document_id: input.parent_document_id,
        title: input.title,
        is_title_page: input.is_title_page ?? false,
        position: input.position,
      });
      if (error) throw error;
    },
    ...documentHandlers<{
      id: string;
      title: string;
      parent_document_id: string | null;
      position: number;
      is_title_page?: boolean;
    }>(
      qc,
      key,
      (prev, input) => {
        const now = new Date().toISOString();
        return [
          ...prev,
          {
            id: input.id,
            user_id: session?.user.id ?? "",
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
          },
        ];
      },
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
    mutationFn: async (input: { rows: Document[] }) => {
      const userId = session?.user.id;
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("documents").insert(
        input.rows.map((r) => ({
          id: r.id,
          user_id: userId,
          book_id: r.book_id,
          parent_document_id: r.parent_document_id,
          title: r.title,
          icon: r.icon,
          subtitle: r.subtitle,
          banner_color: r.banner_color,
          banner_text: r.banner_text,
          show_outline: r.show_outline,
          show_subtitle: r.show_subtitle,
          is_title_page: r.is_title_page,
          position: r.position,
          content: r.content,
          font_overrides: r.font_overrides,
        })),
      );
      if (error) throw error;
    },
    ...documentHandlers<{ rows: Document[] }>(
      qc,
      key,
      (prev, input) => [
        ...prev,
        ...input.rows.map((r) => ({
          ...r,
          user_id: session?.user.id ?? "",
        })),
      ],
      "Couldn't duplicate page",
    ),
  });
}

/** Mutation hook that renames a page. */
export function useRenameDocument(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const { error } = await supabase
        .from("documents")
        .update({ title: input.title })
        .eq("id", input.id);
      if (error) throw error;
    },
    ...documentHandlers<{ id: string; title: string }>(
      qc,
      key,
      (prev, input) =>
        prev.map((d) => (d.id === input.id ? { ...d, title: input.title } : d)),
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
    mutationFn: async (
      input: { id: string } & Partial<
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
      >,
    ) => {
      const { id, ...patch } = input;
      const { error } = await supabase
        .from("documents")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    ...documentHandlers<
      { id: string } & Partial<
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
      >
    >(
      qc,
      key,
      (prev, input) =>
        prev.map((d) => (d.id === input.id ? { ...d, ...input } : d)),
      "Couldn't update page",
    ),
  });
}

/** Mutation hook that reparents and/or repositions a page within its book. */
export function useMoveDocument(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: async (input: {
      id: string;
      parent_document_id: string | null;
      position: number;
    }) => {
      const { error } = await supabase
        .from("documents")
        .update({
          parent_document_id: input.parent_document_id,
          position: input.position,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    ...documentHandlers<{
      id: string;
      parent_document_id: string | null;
      position: number;
    }>(
      qc,
      key,
      (prev, input) =>
        prev.map((d) =>
          d.id === input.id
            ? {
                ...d,
                parent_document_id: input.parent_document_id,
                position: input.position,
              }
            : d,
        ),
      "Couldn't move page",
    ),
  });
}

/** Mutation hook that deletes a page; descendants cascade away in the DB. */
export function useDeleteDocument(bookId: string) {
  const qc = useQueryClient();
  const key = documentsKey(bookId);
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    // The page and its descendants cascade away in the DB; remove the same set
    // optimistically so the outline and TOC update instantly.
    ...documentHandlers<{ id: string }>(
      qc,
      key,
      (prev, input) => {
        const removed = collectDocumentSubtree(prev, input.id);
        return prev.filter((d) => !removed.has(d.id));
      },
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
    mutationFn: async (input: { id: string; content: Json }) => {
      const { error } = await supabase
        .from("documents")
        .update({ content: input.content })
        .eq("id", input.id);
      if (error) throw error;
    },
    ...documentHandlers<{ id: string; content: Json }>(
      qc,
      key,
      (prev, input) =>
        prev.map((d) =>
          d.id === input.id ? { ...d, content: input.content } : d,
        ),
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
    mutationFn: async (input: {
      id: string;
      font_overrides: DocFontOverrides | null;
    }) => {
      const { error } = await supabase
        .from("documents")
        .update({ font_overrides: input.font_overrides })
        .eq("id", input.id);
      if (error) throw error;
    },
    ...documentHandlers<{
      id: string;
      font_overrides: DocFontOverrides | null;
    }>(
      qc,
      key,
      (prev, input) =>
        prev.map((d) =>
          d.id === input.id
            ? { ...d, font_overrides: input.font_overrides }
            : d,
        ),
      "Couldn't update page fonts",
    ),
  });
}

// Allowed image types and max size for a user-uploaded page icon. Kept small:
// icons render at tiny sizes, so there's no reason to accept large files.
const ICON_UPLOAD_MAX_BYTES = 1024 * 1024; // 1 MB
const ICON_UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/**
 * Uploads a custom page icon to the `page-icons` storage bucket under the
 * owner's folder and returns its public URL. The IconPicker stores that URL on
 * the document as an `image` icon.
 */
export function useUploadIcon() {
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("Not authenticated");

      const ext = ICON_UPLOAD_TYPES[file.type];
      if (!ext) throw new Error("Unsupported image type");
      if (file.size > ICON_UPLOAD_MAX_BYTES) {
        throw new Error("Image must be under 1 MB");
      }

      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("page-icons")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("page-icons").getPublicUrl(path);
      return data.publicUrl;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Couldn't upload icon",
      );
    },
  });
}

/**
 * Ensures every book has exactly one Title Page. Called when a book opens: once
 * its documents have loaded and none is flagged is_title_page, it creates one.
 * The optimistic insert flips the guard immediately, so it never double-creates.
 */
export function useEnsureTitlePage(bookId: string | null) {
  const query = useDocuments(bookId);
  const createDocument = useCreateDocument(bookId ?? "__none__");
  const create = createDocument.mutate;

  const documents = query.data;
  const ready = query.isSuccess;

  // Guard against creating more than one Title Page: React StrictMode invokes
  // effects twice in dev, and both runs would see the pre-insert document list.
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!bookId || !ready || !documents) return;
    if (documents.some((d) => d.is_title_page)) return;
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
