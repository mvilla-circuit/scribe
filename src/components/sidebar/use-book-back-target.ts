import { useCallback } from "react";

import type { Book } from "@/data/books";
import { useCollections } from "@/data/collections";
import { useUIStore } from "@/store/ui";

/**
 * Resolves the "back" affordance for an open book: a book filed inside a
 * collection returns to that collection, while a top-level book returns to the
 * Library home. Shared by the expanded and collapsed sidebars so both stay in
 * sync on label, tooltip, and navigation target.
 */
export function useBookBackTarget(activeBook: Book | null) {
  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const setActiveCollection = useUIStore((s) => s.setActiveCollection);
  const collections = useCollections().data ?? [];

  const parentCollection = activeBook?.collection_id
    ? (collections.find((c) => c.id === activeBook.collection_id) ?? null)
    : null;

  const label = parentCollection
    ? parentCollection.name || "Untitled"
    : "Library";
  const tooltip = parentCollection
    ? `Back to ${parentCollection.name || "collection"}`
    : "Back to library";

  const goBack = useCallback(() => {
    if (parentCollection) {
      setActiveCollection(parentCollection.id);
    } else {
      setActiveBook(null);
    }
  }, [parentCollection, setActiveBook, setActiveCollection]);

  return { parentCollection, label, tooltip, goBack };
}
