import { useQueries } from "@tanstack/react-query";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import { useBooks } from "@/data/books";
import { datagridRowsQueryOptions } from "@/data/datagrid-rows";
import { datagridViewsQueryOptions } from "@/data/datagrid-views";
import { useDatagrids } from "@/data/datagrids";
import { usePageIndex } from "@/data/page-index";
import { type EditorBridge, EditorBridgeContext } from "@/editor/editor-bridge";
import { useUIStore } from "@/store/ui";

import {
  buildDatagridLinkOptions,
  buildDatagridRowLinkOptions,
  indexCardVisibleFieldIdsByDatagrid,
  indexRowsByDatagrid,
  resolveDatagridRow,
} from "./datagrid-row-resolve";
import {
  buildPageLinkOptions,
  indexById,
  resolvePageTarget,
} from "./page-link-resolve";

/**
 * Supplies the editor's {@link EditorBridge} from the app's data layer and UI
 * store, so the page-link and datagrid-row cards (rendered inside `<Editor>`)
 * can resolve targets and navigate without importing `@/data` or `@/store`
 * themselves. Wrap any `<Editor>` whose content may contain those embeds.
 *
 * Datagrid rows/views load lazily via {@link EditorBridge.watchDatagrid} so
 * page-link surfaces are not blocked on unrelated grid fetches.
 */
export function EditorBridgeHost({ children }: { children: ReactNode }) {
  const { data: index = [], isLoading: indexLoading } = usePageIndex();
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const { data: datagrids = [], isLoading: datagridsLoading } = useDatagrids();
  const navigateTo = useUIStore((s) => s.navigateTo);

  // Build the id map once per index, not inside every card's resolve call.
  const byId = useMemo(() => indexById(index), [index]);

  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const watchDatagrid = useCallback((datagridId: string) => {
    setWatchedIds((previous) =>
      previous.includes(datagridId) ? previous : [...previous, datagridId],
    );
  }, []);

  // Only fetch rows/views for datagrids that embeds or the picker asked for.
  const rowQueries = useQueries({
    queries: watchedIds.map((id) => datagridRowsQueryOptions(id)),
  });
  const viewQueries = useQueries({
    queries: watchedIds.map((id) => datagridViewsQueryOptions(id)),
  });

  const allRows = useMemo(
    () => rowQueries.flatMap((query) => query.data ?? []),
    [rowQueries],
  );
  const rowsByDatagrid = useMemo(() => indexRowsByDatagrid(allRows), [allRows]);

  const allViews = useMemo(
    () => viewQueries.flatMap((query) => query.data ?? []),
    [viewQueries],
  );
  const visibleFieldIdsByDatagrid = useMemo(
    () => indexCardVisibleFieldIdsByDatagrid(allViews),
    [allViews],
  );

  const isDatagridLoading = useCallback(
    (datagridId: string) => {
      // Resolve needs the datagrid list entry for the card title crumb.
      if (datagridsLoading) return true;
      const indexOf = watchedIds.indexOf(datagridId);
      // Not watched yet → treat as loading so embeds don't flash "not found"
      // before their useEffect registers the watch.
      if (indexOf === -1) return true;
      const rowQuery = rowQueries[indexOf];
      const viewQuery = viewQueries[indexOf];
      return Boolean(rowQuery?.isLoading || viewQuery?.isLoading);
    },
    [datagridsLoading, rowQueries, viewQueries, watchedIds],
  );

  const resolve = useCallback<EditorBridge["resolvePageTarget"]>(
    (targetType, targetId) =>
      resolvePageTarget(books, byId, targetType, targetId),
    [books, byId],
  );

  const pageLinkOptions = useMemo(
    () => buildPageLinkOptions(books, index),
    [books, index],
  );

  const navigateToPage = useCallback<EditorBridge["navigateToPage"]>(
    ({ bookId, docId }) => {
      navigateTo({ bookId, docId });
    },
    [navigateTo],
  );

  const resolveRow = useCallback<EditorBridge["resolveDatagridRow"]>(
    (datagridId, rowId) =>
      resolveDatagridRow(
        datagrids,
        rowsByDatagrid,
        datagridId,
        rowId,
        visibleFieldIdsByDatagrid,
      ),
    [datagrids, rowsByDatagrid, visibleFieldIdsByDatagrid],
  );

  const datagridLinkOptions = useMemo(
    () => buildDatagridLinkOptions(datagrids),
    [datagrids],
  );

  const datagridRowLinkOptions = useCallback<
    EditorBridge["datagridRowLinkOptions"]
  >(
    (datagridId) => {
      const datagrid = datagrids.find((grid) => grid.id === datagridId);
      if (!datagrid) return [];
      return buildDatagridRowLinkOptions(
        datagrid,
        rowsByDatagrid.get(datagridId) ?? [],
      );
    },
    [datagrids, rowsByDatagrid],
  );

  const navigateToDatagridRow = useCallback<
    EditorBridge["navigateToDatagridRow"]
  >(
    ({ datagridId, rowId }) => {
      navigateTo({ datagridId, rowId });
    },
    [navigateTo],
  );

  const bridge = useMemo<EditorBridge>(
    () => ({
      // Page links must not wait on datagrid row/view fetches.
      loading: indexLoading || booksLoading,
      resolvePageTarget: resolve,
      pageLinkOptions,
      navigateToPage,
      resolveDatagridRow: resolveRow,
      datagridLinkOptions,
      datagridRowLinkOptions,
      navigateToDatagridRow,
      watchDatagrid,
      isDatagridLoading,
    }),
    [
      indexLoading,
      booksLoading,
      resolve,
      pageLinkOptions,
      navigateToPage,
      resolveRow,
      datagridLinkOptions,
      datagridRowLinkOptions,
      navigateToDatagridRow,
      watchDatagrid,
      isDatagridLoading,
    ],
  );

  return (
    <EditorBridgeContext.Provider value={bridge}>
      {children}
    </EditorBridgeContext.Provider>
  );
}
