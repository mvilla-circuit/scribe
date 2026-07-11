import { useCallback, useMemo } from "react";

import { useDatagridRows, useUpdateDatagridRow } from "@/data/datagrid-rows";
import { useDatagrids } from "@/data/datagrids";
import {
  type DatagridPropertyValue,
  parseDatagridFields,
  toDatagridProperties,
} from "@/lib/datagrid-schema";

import { useDatagridRelationTargets } from "./datagrid-relations";

/**
 * Loads a row and everything the detail surfaces need to edit it: the parsed
 * fields, typed properties, relation targets, and title/icon/property mutators.
 * Shared by the modal, split, and full row surfaces.
 */
export function useDatagridRowDetail(datagridId: string, rowId: string) {
  const datagridsQuery = useDatagrids();
  const rowsQuery = useDatagridRows(datagridId);
  const updateRow = useUpdateDatagridRow(datagridId);

  const datagrid =
    datagridsQuery.data?.find((d) => d.id === datagridId) ?? null;
  const row = rowsQuery.data?.find((r) => r.id === rowId) ?? null;

  const fields = useMemo(
    () => parseDatagridFields(datagrid?.fields ?? []),
    [datagrid?.fields],
  );
  const relationTargets = useDatagridRelationTargets(datagridId, {
    enabled: fields.some((field) => field.type === "relation"),
  });
  const properties = useMemo(
    () => toDatagridProperties(row?.properties),
    [row?.properties],
  );

  const rename = useCallback(
    (title: string) => {
      updateRow.mutate({ id: rowId, title });
    },
    [updateRow, rowId],
  );
  const setIcon = useCallback(
    (icon: string | null) => {
      updateRow.mutate({ id: rowId, icon });
    },
    [updateRow, rowId],
  );
  const patchProperty = useCallback(
    (fieldId: string, value: DatagridPropertyValue) => {
      updateRow.mutate({
        id: rowId,
        propertyPatch: { [fieldId]: value },
      });
    },
    [updateRow, rowId],
  );

  return {
    datagrid,
    row,
    fields,
    properties,
    relationTargets,
    rename,
    setIcon,
    patchProperty,
    isLoading: rowsQuery.isLoading,
  };
}
