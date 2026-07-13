import type { DatagridView } from "@/data/datagrid-views";
import type { DatagridField } from "@/lib/datagrid-schema";

/**
 * Expand empty `visibleFieldIds` (all visible) into the schema id list so
 * callers can treat “empty means all” as an explicit set.
 */
export function effectiveVisibleIds(
  fields: DatagridField[],
  visibleFieldIds: string[] | undefined,
): string[] {
  return visibleFieldIds && visibleFieldIds.length > 0
    ? visibleFieldIds
    : fields.map((field) => field.id);
}

/**
 * Expand empty `visibleFieldIds` (all visible) so a single toggle can hide,
 * then add/remove `fieldId`. Result stays in schema order.
 */
export function toggleVisibleFieldId(
  fields: DatagridField[],
  visibleFieldIds: string[],
  fieldId: string,
): string[] {
  const current = new Set(effectiveVisibleIds(fields, visibleFieldIds));
  if (current.has(fieldId)) current.delete(fieldId);
  else current.add(fieldId);
  return fields
    .filter((field) => current.has(field.id))
    .map((field) => field.id);
}

/** Prefer the default view, else the first saved view. */
export function pickCardVisibilityView(
  views: DatagridView[],
): DatagridView | null {
  return views.find((view) => view.is_default) ?? views[0] ?? null;
}
