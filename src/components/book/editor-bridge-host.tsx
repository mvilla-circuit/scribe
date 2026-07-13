import { useQueries } from "@tanstack/react-query";
import { type ReactNode, useCallback, useMemo } from "react";

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
  indexRowsByDatagrid,
  indexVisibleFieldIdsByDatagrid,
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
 */
export function EditorBridgeHost({ children }: { children: ReactNode }) {
  const { data: index = [], isLoading: indexLoading } = usePageIndex();
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const { data: datagrids = [], isLoading: datagridsLoading } = useDatagrids();
  const navigateTo = useUIStore((s) => s.navigateTo);

  // Build the id map once per index, not inside every card's resolve call.
  const byId = useMemo(() => indexById(index), [index]);

  // Load every datagrid's row metadata so embeds and the two-step picker can
  // resolve without N+1 fetches per card. Queries are keyed per datagrid, so
  // React Query shares cache with open datagrid pages.
  const rowQueries = useQueries({
    queries: datagrids.map((grid) => datagridRowsQueryOptions(grid.id)),
  });
  const allRows = useMemo(
    () => rowQueries.flatMap((query) => query.data ?? []),
    [rowQueries],
  );
  const rowsByDatagrid = useMemo(() => indexRowsByDatagrid(allRows), [allRows]);
  const rowsLoading =
    datagrids.length > 0 && rowQueries.some((query) => query.isLoading);

  // Default-view field visibility for embed card previews (same list gallery
  // cards use when that view is active).
  const viewQueries = useQueries({
    queries: datagrids.map((grid) => datagridViewsQueryOptions(grid.id)),
  });
  const allViews = useMemo(
    () => viewQueries.flatMap((query) => query.data ?? []),
    [viewQueries],
  );
  const visibleFieldIdsByDatagrid = useMemo(
    () => indexVisibleFieldIdsByDatagrid(allViews),
    [allViews],
  );
  const viewsLoading =
    datagrids.length > 0 && viewQueries.some((query) => query.isLoading);

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
      loading:
        indexLoading ||
        booksLoading ||
        datagridsLoading ||
        rowsLoading ||
        viewsLoading,
      resolvePageTarget: resolve,
      pageLinkOptions,
      navigateToPage,
      resolveDatagridRow: resolveRow,
      datagridLinkOptions,
      datagridRowLinkOptions,
      navigateToDatagridRow,
    }),
    [
      indexLoading,
      booksLoading,
      datagridsLoading,
      rowsLoading,
      viewsLoading,
      resolve,
      pageLinkOptions,
      navigateToPage,
      resolveRow,
      datagridLinkOptions,
      datagridRowLinkOptions,
      navigateToDatagridRow,
    ],
  );

  return (
    <EditorBridgeContext.Provider value={bridge}>
      {children}
    </EditorBridgeContext.Provider>
  );
}
