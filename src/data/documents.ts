import { useEffect, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import type { Json, Tables } from "../lib/database.types";
import { byPosition } from "./ordering";

export type Document = Tables<"documents">;

// Documents are keyed per book so opening a book loads only its own pages and
// optimistic mutations touch a single, well-scoped cache entry.
export const documentsKey = (bookId: string) =>
  ["documents", bookId] as const;

export function useDocuments(bookId: string | null) {
  return useQuery({
    queryKey: documentsKey(bookId ?? "__none__"),
    enabled: bookId !== null,
    queryFn: async (): Promise<Document[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("book_id", bookId as string)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

// Snapshot + rollback helpers shared by every optimistic document mutation.
async function optimistic(
  qc: QueryClient,
  key: QueryKey,
  update: (prev: Document[]) => Document[]
): Promise<{ previous: Document[] | undefined }> {
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<Document[]>(key);
  qc.setQueryData<Document[]>(key, (prev) =>
    (update(prev ?? []) ?? []).slice().sort(byPosition)
  );
  return { previous };
}

function rollback(qc: QueryClient, key: QueryKey, previous: Document[] | undefined) {
  if (previous) qc.setQueryData(key, previous);
}

// Collects a document plus all of its descendant ids. The DB cascades the
// delete (parent_document_id ON DELETE CASCADE); we mirror that optimistically.
export function collectDocumentSubtree(
  documents: Document[],
  rootId: string
): Set<string> {
  const childrenByParent = new Map<string, Document[]>();
  for (const doc of documents) {
    if (!doc.parent_document_id) continue;
    const list = childrenByParent.get(doc.parent_document_id) ?? [];
    list.push(doc);
    childrenByParent.set(doc.parent_document_id, list);
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
    onMutate: (input) => {
      const now = new Date().toISOString();
      return optimistic(qc, key, (prev) => [
        ...prev,
        {
          id: input.id,
          user_id: session?.user.id ?? "",
          book_id: bookId,
          parent_document_id: input.parent_document_id,
          title: input.title,
          icon: null,
          is_title_page: input.is_title_page ?? false,
          position: input.position,
          content: {} as Json,
          created_at: now,
          updated_at: now,
        },
      ]);
    },
    onError: (_e, _v, ctx) => {
      rollback(qc, key, ctx?.previous);
      toast.error("Couldn't create page");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

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
    onMutate: (input) =>
      optimistic(qc, key, (prev) =>
        prev.map((d) => (d.id === input.id ? { ...d, title: input.title } : d))
      ),
    onError: (_e, _v, ctx) => {
      rollback(qc, key, ctx?.previous);
      toast.error("Couldn't rename page");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

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
    onMutate: (input) =>
      optimistic(qc, key, (prev) =>
        prev.map((d) =>
          d.id === input.id
            ? {
                ...d,
                parent_document_id: input.parent_document_id,
                position: input.position,
              }
            : d
        )
      ),
    onError: (_e, _v, ctx) => {
      rollback(qc, key, ctx?.previous);
      toast.error("Couldn't move page");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

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
    onMutate: (input) =>
      optimistic(qc, key, (prev) => {
        const removed = collectDocumentSubtree(prev, input.id);
        return prev.filter((d) => !removed.has(d.id));
      }),
    onError: (_e, _v, ctx) => {
      rollback(qc, key, ctx?.previous);
      toast.error("Couldn't delete page");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// Persists a document body. Used by the Phase 4 editor; included here so the
// data layer is complete and the editor only has to call mutate.
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
    onMutate: (input) =>
      optimistic(qc, key, (prev) =>
        prev.map((d) =>
          d.id === input.id ? { ...d, content: input.content } : d
        )
      ),
    onError: (_e, _v, ctx) => {
      rollback(qc, key, ctx?.previous);
      toast.error("Couldn't save changes");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// Ensures every book has exactly one Title Page. Called when a book opens: once
// its documents have loaded and none is flagged is_title_page, it creates one.
// The optimistic insert flips the guard immediately, so it never double-creates.
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
    create({
      id: crypto.randomUUID(),
      title: "Title Page",
      parent_document_id: null,
      position: 0,
      is_title_page: true,
    });
  }, [bookId, ready, documents, create]);
}
