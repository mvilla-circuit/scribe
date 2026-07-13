import { Fragment } from "react";

import type {
  DatagridField,
  DatagridProperties,
  DatagridPropertyValue,
} from "@/lib/datagrid-schema";

import { DatagridFieldEditor } from "./datagrid-field-editor";
import type { RelationTargets } from "./datagrid-relations";

interface DatagridRowPropertiesProps {
  fields: DatagridField[];
  properties: DatagridProperties;
  createdAt: string;
  updatedAt: string;
  relationTargets: RelationTargets;
  onPatch: (fieldId: string, value: DatagridPropertyValue) => void;
}

/**
 * The row's properties as a calm definition list: a muted label paired with the
 * type-appropriate editor for each field. Empty when the datagrid has no fields.
 */
export function DatagridRowProperties({
  fields,
  properties,
  createdAt,
  updatedAt,
  relationTargets,
  onPatch,
}: DatagridRowPropertiesProps) {
  if (fields.length === 0) return null;

  return (
    <dl className="grid grid-cols-[minmax(5rem,9rem)_1fr] items-start gap-x-4 gap-y-2">
      {fields.map((field) => (
        <Fragment key={field.id}>
          <dt className="truncate py-2 text-xs text-muted">{field.name}</dt>
          <dd className="min-w-0">
            <DatagridFieldEditor
              field={field}
              value={properties[field.id] ?? null}
              createdAt={createdAt}
              updatedAt={updatedAt}
              relationTargets={relationTargets}
              onCommit={(value) => {
                onPatch(field.id, value);
              }}
            />
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}
