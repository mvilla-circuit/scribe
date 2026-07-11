import type { Book } from "@/data/books";

import { BookView } from "./book/book-view";
import { CollectionPage } from "./collection/collection-page";
import { EntryView } from "./collection/entry-view";
import { MainEmptyState } from "./main-empty-state";

/**
 * Chooses which surface fills the main pane from the active selection. The app
 * shows exactly one surface at a time; the collection axis takes precedence over
 * the book axis (the setters keep them mutually exclusive, but ordering here
 * makes the derivation total and independent of that invariant). Kept as a small
 * pure component so the routing logic is testable without mounting the whole app
 * shell.
 */
export function MainPane({
  activeBook,
  activeCollectionId,
  activeEntryId,
}: {
  activeBook: Book | null;
  activeCollectionId: string | null;
  activeEntryId: string | null;
}) {
  if (activeCollectionId && activeEntryId) {
    return (
      <EntryView
        key={activeEntryId}
        collectionId={activeCollectionId}
        entryId={activeEntryId}
      />
    );
  }
  if (activeCollectionId) {
    return (
      <CollectionPage
        key={activeCollectionId}
        collectionId={activeCollectionId}
      />
    );
  }
  if (activeBook) return <BookView key={activeBook.id} book={activeBook} />;
  return <MainEmptyState />;
}
