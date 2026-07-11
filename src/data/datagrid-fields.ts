import { fieldTypeDef } from "@/lib/datagrid-field-types";
import {
  type DatagridField,
  type DatagridFieldType,
  TITLE_FIELD_ID,
} from "@/lib/datagrid-schema";

// Pure helpers for editing a datagrid's `fields` array (its property schema).
// Kept side-effect-free so the schema-editing rules are testable in isolation
// from the mutation that persists the resulting array to `datagrids.fields`.
//
// A row's title is the `datagrid_rows.title` column, not a field — the `fields`
// array holds custom properties only. `TITLE_FIELD_ID` names that reserved slot
// so the helpers can reject creating or deleting a field that would collide with
// the built-in title concept.

/** Returns the canonical display name for a field type. */
export function defaultFieldName(type: DatagridFieldType): string {
  return fieldTypeDef(type).label;
}

/**
 * Creates a field with its canonical name and the initial config for its type.
 */
export function newFieldFromType(
  type: DatagridFieldType,
  id: string,
): DatagridField {
  const definition = fieldTypeDef(type);
  const defaultOptions = definition.defaultConfig.options;

  return {
    id,
    name: definition.label,
    type,
    config:
      defaultOptions === undefined
        ? { ...definition.defaultConfig }
        : { ...definition.defaultConfig, options: [...defaultOptions] },
  };
}

/** Whether `id` names a reserved built-in concept rather than a custom field. */
function isReservedFieldId(id: string): boolean {
  return id === TITLE_FIELD_ID;
}

/**
 * Appends a new field to the schema. Throws when the id is already taken or
 * collides with the reserved title concept, so a caller can't silently shadow an
 * existing column or the built-in title.
 */
export function addField(
  fields: DatagridField[],
  field: DatagridField,
): DatagridField[] {
  if (isReservedFieldId(field.id)) {
    throw new Error(`"${field.id}" is reserved for the built-in row title`);
  }
  if (fields.some((f) => f.id === field.id)) {
    throw new Error(`A field with id "${field.id}" already exists`);
  }
  return [...fields, field];
}

/**
 * Shallow-merges `patch` into the field matching `id`. The id is immutable, so
 * any `id` in the patch is ignored. A non-matching id is a no-op that returns an
 * equivalent list.
 */
export function updateField(
  fields: DatagridField[],
  id: string,
  patch: Partial<DatagridField>,
): DatagridField[] {
  return fields.map((f) => (f.id === id ? { ...f, ...patch, id: f.id } : f));
}

/**
 * Moves the field with `id` to `toIndex`, shifting the others. Unknown ids and
 * out-of-range indices are a no-op that returns an equivalent list.
 */
export function reorderField(
  fields: DatagridField[],
  id: string,
  toIndex: number,
): DatagridField[] {
  const fromIndex = fields.findIndex((f) => f.id === id);
  if (fromIndex === -1) return fields;
  const clamped = Math.max(0, Math.min(toIndex, fields.length - 1));
  if (clamped === fromIndex) return fields;
  const next = [...fields];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return fields;
  next.splice(clamped, 0, moved);
  return next;
}

/**
 * Removes the field with `id`. Throws when `id` is the reserved title concept —
 * the title is a row column, not a deletable field.
 */
export function deleteField(
  fields: DatagridField[],
  id: string,
): DatagridField[] {
  if (isReservedFieldId(id)) {
    throw new Error("The row title is not a field and cannot be deleted");
  }
  return fields.filter((f) => f.id !== id);
}
