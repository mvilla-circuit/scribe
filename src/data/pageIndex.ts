import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

// A lightweight, cross-book index of every page the user can see (RLS-scoped).
// Page link cards resolve their live title/icon/breadcrumb from this, and the
// "Link to page" picker searches it — both without having to load each book's
// full document list. Renames/deletes invalidate this key (see documents.ts),
// so cards stay in sync with their target.
export type PageIndexEntry = {
  id: string;
  title: string;
  icon: string | null;
  book_id: string;
  parent_document_id: string | null;
  is_title_page: boolean;
};

export const pageIndexKey = ["page-index"] as const;

export function usePageIndex() {
  return useQuery({
    queryKey: pageIndexKey,
    queryFn: async (): Promise<PageIndexEntry[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, icon, book_id, parent_document_id, is_title_page");
      if (error) throw error;
      return (data ?? []) as PageIndexEntry[];
    },
  });
}
