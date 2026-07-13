import type { DatagridView } from "@/data/datagrid-views";
import {
  type DatagridField,
  isNoneVisibleFieldIds,
  NONE_VISIBLE_FIELD_IDS,
} from "@/lib/datagrid-schema";

/**
 * Expand empty `visibleFieldIds` (all visible) into the schema id list so
 * callers can treat “empty means all” as an explicit set. The none-sentinel
 * expands to an empty list (title-only).
 */
export function effectiveVisibleIds(
  fields: DatagridField[],
  visibleFieldIds: string[] | undefined,
): string[] {
  if (!visibleFieldIds || visibleFieldIds.length === 0) {
    return fields.map((field) => field.id);
  }
  if (isNoneVisibleFieldIds(visibleFieldIds)) return [];
  return visibleFieldIds;
}

/**
 * Expand empty `visibleFieldIds` (all visible) so a single toggle can hide,
 * then add/remove `fieldId`. Result stays in schema order. Hiding the last
 * field persists {@link NONE_VISIBLE_FIELD_IDS} so title-only stays sticky
 * (unlike `[]`, which still means “show all”).
 */
export function toggleVisibleFieldId(
  fields: DatagridField[],
  visibleFieldIds: string[],
  fieldId: string,
): string[] {
  const current = new Set(effectiveVisibleIds(fields, visibleFieldIds));
  if (current.has(fieldId)) current.delete(fieldId);
  else current.add(fieldId);
  const next = fields
    .filter((field) => current.has(field.id))
    .map((field) => field.id);
  return next.length === 0 ? [...NONE_VISIBLE_FIELD_IDS] : next;
}

/** Prefer the default view, else the first saved view. */
export function pickCardVisibilityView(
  views: DatagridView[],
): DatagridView | null {
  return views.find((view) => view.is_default) ?? views[0] ?? null;
}
