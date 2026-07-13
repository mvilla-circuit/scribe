import { useCallback, useState } from "react";

import { useUpdateDatagrid } from "@/data/datagrids";
import type { DatagridField } from "@/lib/datagrid-schema";

import { FieldManager } from "./datagrid-field-manager";

/**
 * Quiet "Edit Fields" control for opened-row surfaces. Renders after the
 * property list so schema chrome stays with properties. Owns local FieldManager
 * dialog state so schema edits still work when MainPane unmounts DatagridPage
 * (full open mode). Persists through `useUpdateDatagrid({ fields })`.
 */
export function DatagridRowEditFields({
  datagridId,
  fields,
}: {
  datagridId: string;
  fields: DatagridField[];
}) {
  const [open, setOpen] = useState(false);
  const updateDatagrid = useUpdateDatagrid();
  const persistFields = useCallback(
    (next: DatagridField[]) => {
      updateDatagrid.mutate({ id: datagridId, fields: next });
    },
    [datagridId, updateDatagrid],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="font-sans text-xs text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
      >
        Edit Fields
      </button>
      <FieldManager
        open={open}
        onOpenChange={setOpen}
        fields={fields}
        onChange={persistFields}
      />
    </>
  );
}
