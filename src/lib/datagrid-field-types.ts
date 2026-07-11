import type { DatagridFieldConfig, DatagridFieldType } from "./datagrid-schema";

/** Metadata and initial configuration for one datagrid field type. */
export interface DatagridFieldTypeDef {
  type: DatagridFieldType;
  label: string;
  /** Initial config when creating a field of this type. */
  defaultConfig: DatagridFieldConfig;
}

/** Canonical field-type labels and creation defaults. */
export const DATAGRID_FIELD_TYPE_DEFS: DatagridFieldTypeDef[] = [
  { type: "text", label: "Text", defaultConfig: {} },
  { type: "number", label: "Number", defaultConfig: {} },
  { type: "date", label: "Date", defaultConfig: {} },
  { type: "select", label: "Select", defaultConfig: { options: [] } },
  {
    type: "multi_select",
    label: "Multi-select",
    defaultConfig: { options: [] },
  },
  { type: "status", label: "Status", defaultConfig: { options: [] } },
  { type: "checkbox", label: "Checkbox", defaultConfig: {} },
  { type: "url", label: "URL", defaultConfig: {} },
  { type: "relation", label: "Relation", defaultConfig: {} },
  { type: "created_time", label: "Created time", defaultConfig: {} },
  { type: "updated_time", label: "Updated time", defaultConfig: {} },
];

const FIELD_TYPE_DEFS_BY_TYPE = new Map(
  DATAGRID_FIELD_TYPE_DEFS.map((definition) => [definition.type, definition]),
);

/** Returns the canonical definition for a field type. */
export function fieldTypeDef(type: DatagridFieldType): DatagridFieldTypeDef {
  const definition = FIELD_TYPE_DEFS_BY_TYPE.get(type);
  if (!definition) {
    throw new Error(`Unknown datagrid field type: ${type}`);
  }
  return definition;
}
