import type { DatagridField } from "@/lib/datagrid-schema";

import { DatagridRowEditFields } from "./datagrid-row-edit-fields";
import { DatagridShownFields } from "./datagrid-shown-fields";

/**
 * Quiet field chrome under the opened-row property list: card show/hide on
 * the left, schema Edit Fields on the right. Shared by full / modal / split.
 */
export function DatagridRowFieldsBar({
  datagridId,
  fields,
}: {
  datagridId: string;
  fields: DatagridField[];
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <DatagridShownFields datagridId={datagridId} fields={fields} />
      <DatagridRowEditFields datagridId={datagridId} fields={fields} />
    </div>
  );
}
