import { useCallback, useMemo } from "react";

import { deleteCoverObject, useUploadCover } from "@/data/cover-upload";
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
 * fields, typed properties, relation targets, and title/icon/cover/property
 * mutators. Shared by the modal, split, and full row surfaces.
 */
export function useDatagridRowDetail(datagridId: string, rowId: string) {
  const datagridsQuery = useDatagrids();
  const rowsQuery = useDatagridRows(datagridId);
  const updateRow = useUpdateDatagridRow(datagridId);
  const uploadCover = useUploadCover();

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
  const setCover = useCallback(
    async (file: File) => {
      const previous = row?.cover_url ?? null;
      const coverUrl = await uploadCover.mutateAsync(file);
      await updateRow.mutateAsync({ id: rowId, cover_url: coverUrl });
      void deleteCoverObject(previous);
      return coverUrl;
    },
    [row?.cover_url, uploadCover, updateRow, rowId],
  );
  const clearCover = useCallback(() => {
    const previous = row?.cover_url ?? null;
    updateRow.mutate(
      { id: rowId, cover_url: null },
      {
        onSuccess: () => {
          void deleteCoverObject(previous);
        },
      },
    );
  }, [row?.cover_url, updateRow, rowId]);

  return {
    datagrid,
    row,
    fields,
    properties,
    relationTargets,
    rename,
    setIcon,
    setCover,
    clearCover,
    patchProperty,
    isLoading: rowsQuery.isLoading,
  };
}
