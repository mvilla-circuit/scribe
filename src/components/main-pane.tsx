import type { Book } from "@/data/books";
import type { RowOpenMode } from "@/store/ui";

import { BookView } from "./book/book-view";
import { CollectionPage } from "./collection/collection-page";
import { EntryView } from "./collection/entry-view";
import { DatagridPage } from "./datagrid/datagrid-page";
import { DatagridRowFull } from "./datagrid/datagrid-row-full";
import { MainEmptyState } from "./main-empty-state";
import { WhiteboardPage } from "./whiteboard/whiteboard-page";

/**
 * Chooses which surface fills the main pane from the active selection. The app
 * shows exactly one surface at a time, resolved by precedence (independent of
 * the setters' mutual-exclusion invariant so the derivation stays total):
 * a full-window datagrid row, then the datagrid page, then a whiteboard, then a
 * collection entry, then the collection, then a book, then the empty state. A
 * datagrid row only takes over the whole pane in `"full"` open mode;
 * `"modal"`/`"split"` keep the datagrid page mounted. Kept as a small pure
 * component so the routing logic is testable without mounting the whole app.
 */
export function MainPane({
  activeBook,
  activeCollectionId,
  activeEntryId,
  activeDatagridId,
  activeDatagridRowId,
  activeWhiteboardId,
  rowOpenMode,
}: {
  activeBook: Book | null;
  activeCollectionId: string | null;
  activeEntryId: string | null;
  activeDatagridId: string | null;
  activeDatagridRowId: string | null;
  activeWhiteboardId: string | null;
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
  if (activeWhiteboardId) {
    return (
      <WhiteboardPage
        key={activeWhiteboardId}
        whiteboardId={activeWhiteboardId}
      />
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
