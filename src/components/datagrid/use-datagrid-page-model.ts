import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import {
  useCreateDatagridRow,
  useDatagridRows,
  useDeleteDatagridRows,
  useUpdateDatagridRow,
} from "@/data/datagrid-rows";
import {
  useCreateDatagridView,
  useDatagridViews,
  useDeleteDatagridView,
  useUpdateDatagridView,
} from "@/data/datagrid-views";
import { useDatagrids, useUpdateDatagrid } from "@/data/datagrids";
import { endPositionFor } from "@/data/ordering";
import { datagridViewsKey } from "@/data/query-keys";
import type { DatagridParsedRow } from "@/lib/datagrid-csv";
import { queryDatagrid } from "@/lib/datagrid-query";
import {
  type DatagridField,
  type DatagridPropertyValue,
  type DatagridViewConfig,
  parseDatagridFields,
  parseDatagridProperties,
  parseDatagridViewConfig,
  selectVisibleFields,
} from "@/lib/datagrid-schema";
import { matchesNormalizedQuery } from "@/lib/text-match";

import { useDatagridRelationTargets } from "./datagrid-relations";
import type { DatagridDisplayRow } from "./datagrid-view-model";

const OPTION_FIELD_TYPES = new Set(["select", "status"]);

/**
 * Owns the queries, derived rows, view state, and data mutations used by a
 * datagrid page.
 */
export function useDatagridPageModel(datagridId: string) {
  const qc = useQueryClient();
  const datagridsQuery = useDatagrids();
  const viewsQuery = useDatagridViews(datagridId);
  const rowsQuery = useDatagridRows(datagridId);
  const updateDatagrid = useUpdateDatagrid();
  const createRow = useCreateDatagridRow(datagridId);
  const updateRow = useUpdateDatagridRow(datagridId);
  const deleteRows = useDeleteDatagridRows(datagridId);
  const createView = useCreateDatagridView(datagridId);
  const updateView = useUpdateDatagridView(datagridId);
  const deleteView = useDeleteDatagridView(datagridId);

  const [query, setQuery] = useState("");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const datagrid =
    datagridsQuery.data?.find((item) => item.id === datagridId) ?? null;
  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data]);
  const views = useMemo(() => viewsQuery.data ?? [], [viewsQuery.data]);
  const fields = useMemo<DatagridField[]>(
    () => parseDatagridFields(datagrid?.fields ?? []),
    [datagrid?.fields],
  );
  const relationTargets = useDatagridRelationTargets(datagridId, {
    enabled: fields.some((field) => field.type === "relation"),
  });

  const activeView =
    views.find((view) => view.id === activeViewId) ??
    views.find((view) => view.is_default) ??
    views[0] ??
    null;
  const config = useMemo<DatagridViewConfig>(
    () => parseDatagridViewConfig(activeView?.config ?? null),
    [activeView?.config],
  );
  const columnFields = useMemo<DatagridField[]>(
    () => selectVisibleFields(fields, config.visibleFieldIds),
    [config.visibleFieldIds, fields],
  );
  const cardFields = useMemo<DatagridField[]>(
    () => selectVisibleFields(fields, config.cardVisibleFieldIds),
    [config.cardVisibleFieldIds, fields],
  );

  const displayRows = useMemo<DatagridDisplayRow[]>(
    () =>
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        icon: row.icon,
        cover_url: row.cover_url,
        cover_position: row.cover_position ?? 50,
        properties: parseDatagridProperties(fields, row.properties),
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    [fields, rows],
  );
  const searched = useMemo(() => {
    if (!query.trim()) return displayRows;
    return displayRows.filter((row) =>
      matchesNormalizedQuery(row.title, query),
    );
  }, [displayRows, query]);
  const orderedRows = useMemo(
    () =>
      queryDatagrid(
        searched,
        {
          filters: config.filters,
          sorts: config.sorts,
          groupBy: config.groupBy,
        },
        fields,
      ).rows,
    [searched, config.filters, config.sorts, config.groupBy, fields],
  );
  const boardField =
    fields.find(
      (field) =>
        OPTION_FIELD_TYPES.has(field.type) &&
        field.id === (config.boardFieldId ?? config.groupBy),
    ) ??
    fields.find((field) => OPTION_FIELD_TYPES.has(field.type)) ??
    null;

  const persistFields = useCallback(
    (next: DatagridField[]) => {
      updateDatagrid.mutate({ id: datagridId, fields: next });
    },
    [datagridId, updateDatagrid],
  );
  const persistConfig = useCallback(
    (update: (prev: DatagridViewConfig) => DatagridViewConfig) => {
      if (!activeView) return;
      const cached = qc
        .getQueryData<{ id: string; config: unknown }[]>(
          datagridViewsKey(datagridId),
        )
        ?.find((view) => view.id === activeView.id);
      const prev = parseDatagridViewConfig(cached?.config ?? activeView.config);
      updateView.mutate({ id: activeView.id, config: update(prev) });
    },
    [activeView, datagridId, qc, updateView],
  );
  const handleCreateRow = useCallback(() => {
    createRow.mutate({
      id: crypto.randomUUID(),
      title: "Untitled",
      position: endPositionFor(rows),
    });
  }, [createRow, rows]);
  const patchProperty = useCallback(
    (rowId: string, fieldId: string, value: DatagridPropertyValue) => {
      updateRow.mutate({
        id: rowId,
        propertyPatch: { [fieldId]: value },
      });
    },
    [updateRow],
  );
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((previous) =>
      previous.size === orderedRows.length
        ? new Set()
        : new Set(orderedRows.map((row) => row.id)),
    );
  }, [orderedRows]);
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    deleteRows.mutate({ ids: [...selectedIds] });
    clearSelection();
  }, [clearSelection, deleteRows, selectedIds]);
  const deleteRow = useCallback(
    (id: string) => {
      deleteRows.mutate({ ids: [id] });
      setSelectedIds((previous) => {
        if (!previous.has(id)) return previous;
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    },
    [deleteRows],
  );
  const bulkSetProperty = useCallback(
    (fieldId: string, value: DatagridPropertyValue) => {
      if (selectedIds.size === 0) return;
      for (const id of selectedIds) patchProperty(id, fieldId, value);
      clearSelection();
    },
    [clearSelection, patchProperty, selectedIds],
  );
  const handleImport = useCallback(
    (parsedRows: DatagridParsedRow[]) => {
      let position = endPositionFor(rows);
      for (const parsedRow of parsedRows) {
        createRow.mutate({
          id: crypto.randomUUID(),
          title: parsedRow.title,
          properties: parsedRow.properties,
          position,
        });
        position += 1024;
      }
    },
    [createRow, rows],
  );
  const handleNewView = useCallback(() => {
    const id = crypto.randomUUID();
    createView.mutate({
      id,
      name: `View ${views.length + 1}`,
      position: endPositionFor(views),
    });
    setActiveViewId(id);
  }, [createView, views]);
  const handleDeleteView = useCallback(
    (viewId: string) => {
      if (views.length <= 1) return;
      const remaining = views.filter((view) => view.id !== viewId);
      deleteView.mutate({ id: viewId });
      if (activeView?.id === viewId) {
        const next =
          remaining.find((view) => view.is_default) ?? remaining[0] ?? null;
        setActiveViewId(next?.id ?? null);
      }
    },
    [activeView?.id, deleteView, views],
  );

  const csvRows = useMemo(
    () =>
      displayRows.map((row) => ({
        title: row.title,
        properties: row.properties,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    [displayRows],
  );

  return {
    activeView,
    boardField,
    bulkSetProperty,
    clearSelection,
    config,
    csvRows,
    datagrid,
    datagridsQuery,
    deleteRow,
    deleteSelected,
    fields,
    handleCreateRow,
    handleDeleteView,
    handleImport,
    handleNewView,
    isTrulyEmpty: rows.length === 0 && query === "",
    orderedRows,
    patchProperty,
    persistConfig,
    persistFields,
    query,
    relationTargets,
    selectedIds,
    setActiveViewId,
    setQuery,
    toggleSelect,
    toggleSelectAll,
    updateRow,
    views,
    columnFields,
    cardFields,
  };
}
