import type { Book } from "@/data/books";
import type { RowOpenMode } from "@/store/ui";

import { BookView } from "./book/book-view";
import { CollectionPage } from "./collection/collection-page";
import { EntryView } from "./collection/entry-view";
import { DatagridPage } from "./datagrid/datagrid-page";
import { DatagridRowFull } from "./datagrid/datagrid-row-full";
import { MainEmptyState } from "./main-empty-state";

/**
 * Chooses which surface fills the main pane from the active selection. The app
 * shows exactly one surface at a time, resolved by precedence (independent of
 * the setters' mutual-exclusion invariant so the derivation stays total):
 * a full-window datagrid row, then the datagrid page, then a collection entry,
 * then the collection, then a book, then the empty state. A datagrid row only
 * takes over the whole pane in `"full"` open mode; `"modal"`/`"split"` keep the
 * datagrid page mounted (Track D layers the row over it). Kept as a small pure
 * component so the routing logic is testable without mounting the whole app
 * shell.
 */
export function MainPane({
  activeBook,
  activeCollectionId,
  activeEntryId,
  activeDatagridId,
  activeDatagridRowId,
  rowOpenMode,
}: {
  activeBook: Book | null;
  activeCollectionId: string | null;
  activeEntryId: string | null;
  activeDatagridId: string | null;
  activeDatagridRowId: string | null;
  rowOpenMode: RowOpenMode;
}) {
  if (activeDatagridId && activeDatagridRowId && rowOpenMode === "full") {
    return (
      <DatagridRowFull
        key={activeDatagridRowId}
        datagridId={activeDatagridId}
        rowId={activeDatagridRowId}
      />
    );
  }
  if (activeDatagridId) {
    return (
      <DatagridPage key={activeDatagridId} datagridId={activeDatagridId} />
    );
  }
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
