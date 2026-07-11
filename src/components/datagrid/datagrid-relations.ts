import { useQueries } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { useBooks } from "@/data/books";
import {
  datagridRowsQueryOptions,
  useDatagridRows,
} from "@/data/datagrid-rows";
import { useDatagrids } from "@/data/datagrids";
import { useEntries } from "@/data/entries";
import { usePageIndex } from "@/data/page-index";
import type {
  DatagridRelationRef,
  DatagridRelationTargetType,
} from "@/lib/datagrid-schema";
import { useUIStore } from "@/store/ui";

/** A single selectable relation target, resolved to a display label. */
export interface RelationOption {
  ref: DatagridRelationRef;
  label: string;
  subtitle: string;
}

/** The pool of candidate targets a relation cell may point at. */
export interface RelationSources {
  currentCollectionId: string | null;
  datagridRows: {
    id: string;
    datagridId: string;
    title: string;
    collectionId: string | null;
  }[];
  books: { id: string; title: string }[];
  entries: { id: string; title: string; collectionId: string | null }[];
  documents: { id: string; title: string }[];
  /** Optional case-insensitive filter over label/subtitle. */
  query?: string;
}

const TARGET_SUBTITLE: Record<DatagridRelationTargetType, string> = {
  datagrid_row: "Row",
  book: "Book",
  entry: "Doc",
  document: "Page",
};

const label = (title: string) => (title.trim() === "" ? "Untitled" : title);

/**
 * Ranks and flattens the candidate targets into a single picker list. Rows and
 * docs from the current collection sort first (relations usually point at
 * neighbors), then the remaining datagrid rows, books, entries, and pages.
 * An optional `query` filters by label/subtitle.
 */
export function buildRelationOptions(
  sources: RelationSources,
): RelationOption[] {
  const { currentCollectionId } = sources;
  const scored: { option: RelationOption; rank: number }[] = [];
  const inCurrent = (collectionId: string | null) =>
    currentCollectionId !== null && collectionId === currentCollectionId;

  for (const row of sources.datagridRows) {
    scored.push({
      rank: inCurrent(row.collectionId) ? 0 : 2,
      option: {
        ref: { type: "datagrid_row", id: row.id },
        label: label(row.title),
        subtitle: TARGET_SUBTITLE.datagrid_row,
      },
    });
  }
  for (const entry of sources.entries) {
    scored.push({
      rank: inCurrent(entry.collectionId) ? 1 : 4,
      option: {
        ref: { type: "entry", id: entry.id },
        label: label(entry.title),
        subtitle: TARGET_SUBTITLE.entry,
      },
    });
  }
  for (const book of sources.books) {
    scored.push({
      rank: 3,
      option: {
        ref: { type: "book", id: book.id },
        label: label(book.title),
        subtitle: TARGET_SUBTITLE.book,
      },
    });
  }
  for (const doc of sources.documents) {
    scored.push({
      rank: 5,
      option: {
        ref: { type: "document", id: doc.id },
        label: label(doc.title),
        subtitle: TARGET_SUBTITLE.document,
      },
    });
  }

  // Stable sort by rank; Array.prototype.sort is stable in modern engines, so
  // ties keep source order (which is already position-ordered).
  scored.sort((a, b) => a.rank - b.rank);
  let options = scored.map((s) => s.option);

  const q = sources.query?.trim().toLowerCase();
  if (q) {
    options = options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.subtitle.toLowerCase().includes(q),
    );
  }
  return options;
}

/** Resolves a stored reference to a live title, or a short id fallback. */
export function resolveRelationLabel(
  sources: RelationSources,
  ref: DatagridRelationRef,
): string {
  const found = (() => {
    switch (ref.type) {
      case "datagrid_row":
        return sources.datagridRows.find((r) => r.id === ref.id)?.title;
      case "book":
        return sources.books.find((b) => b.id === ref.id)?.title;
      case "entry":
        return sources.entries.find((e) => e.id === ref.id)?.title;
      case "document":
        return sources.documents.find((d) => d.id === ref.id)?.title;
    }
  })();
  if (found !== undefined && found.trim() !== "") return found;
  return ref.id.slice(0, 9);
}

/** Everything a relation editor needs: options, label lookup, and navigation. */
export interface RelationTargets {
  options: RelationOption[];
  resolveLabel: (ref: DatagridRelationRef) => string;
  navigate: (ref: DatagridRelationRef) => void;
}

/**
 * Assembles the relation picker's targets from the app's data layer: the
 * current datagrid's rows (same-collection, prioritized), the user's books,
 * collection entries, and every page. Also returns a label resolver and a
 * navigator that opens the referenced surface where possible.
 */
export function useDatagridRelationTargets(
  datagridId: string,
  config: { enabled?: boolean; query?: string } = {},
): RelationTargets {
  const { enabled = true, query = "" } = config;
  const datagridsQuery = useDatagrids();
  const rowsQuery = useDatagridRows(datagridId);
  const booksQuery = useBooks();
  const entriesQuery = useEntries();
  const pageIndexQuery = usePageIndex();
  const navigateTo = useUIStore((s) => s.navigateTo);

  const currentCollectionId =
    datagridsQuery.data?.find((d) => d.id === datagridId)?.collection_id ??
    null;

  // Relation targets span the whole collection, not just the current grid:
  // every sibling datagrid sharing `currentCollectionId` contributes its rows
  // too, so a relation can point at a row in a neighboring datagrid.
  const siblingDatagridIds = useMemo(
    () =>
      !enabled || currentCollectionId === null
        ? []
        : (datagridsQuery.data ?? [])
            .filter(
              (d) =>
                d.collection_id === currentCollectionId && d.id !== datagridId,
            )
            .map((d) => d.id),
    [datagridsQuery.data, currentCollectionId, datagridId, enabled],
  );
  const siblingRowsQueries = useQueries({
    queries: siblingDatagridIds.map((id) => datagridRowsQueryOptions(id)),
  });

  const rows = rowsQuery.data;
  const books = booksQuery.data;
  const entries = entriesQuery.data;
  const pages = pageIndexQuery.data;
  const siblingRows = useMemo(
    () => siblingRowsQueries.flatMap((q) => q.data ?? []),
    [siblingRowsQueries],
  );

  const sources = useMemo<RelationSources>(
    () => ({
      currentCollectionId,
      datagridRows: enabled
        ? [...(rows ?? []), ...siblingRows].map((r) => ({
            id: r.id,
            datagridId: r.datagrid_id,
            title: r.title,
            collectionId: currentCollectionId,
          }))
        : [],
      books: (books ?? []).map((b) => ({ id: b.id, title: b.title })),
      entries: (entries ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        collectionId: e.collection_id,
      })),
      documents: (pages ?? []).map((d) => ({ id: d.id, title: d.title })),
    }),
    [currentCollectionId, enabled, rows, siblingRows, books, entries, pages],
  );

  const options = useMemo(
    () => buildRelationOptions({ ...sources, query }),
    [sources, query],
  );

  const resolveLabel = useCallback(
    (ref: DatagridRelationRef) => resolveRelationLabel(sources, ref),
    [sources],
  );

  const navigate = useCallback(
    (ref: DatagridRelationRef) => {
      switch (ref.type) {
        case "datagrid_row":
          navigateTo({
            datagridId:
              sources.datagridRows.find((row) => row.id === ref.id)
                ?.datagridId ?? datagridId,
            rowId: ref.id,
          });
          break;
        case "book":
          navigateTo({ bookId: ref.id });
          break;
        case "entry": {
          const entry = entries?.find((e) => e.id === ref.id);
          if (entry) {
            navigateTo({ collectionId: entry.collection_id, entryId: ref.id });
          }
          break;
        }
        case "document": {
          const page = pages?.find((d) => d.id === ref.id);
          if (page) navigateTo({ bookId: page.book_id, docId: ref.id });
          break;
        }
      }
    },
    [navigateTo, datagridId, entries, pages, sources.datagridRows],
  );

  return { options, resolveLabel, navigate };
}
