import type { DatagridView } from "@/data/datagrid-views";
import type { DatagridField } from "@/lib/datagrid-schema";

/**
 * Expand empty `visibleFieldIds` (all visible) so a single toggle can hide,
 * then add/remove `fieldId`. Result stays in schema order.
 */
export function toggleVisibleFieldId(
  fields: DatagridField[],
  visibleFieldIds: string[],
  fieldId: string,
): string[] {
  const current = new Set(
    visibleFieldIds.length > 0 ? visibleFieldIds : fields.map((f) => f.id),
  );
  if (current.has(fieldId)) current.delete(fieldId);
  else current.add(fieldId);
  return fields.filter((f) => current.has(f.id)).map((f) => f.id);
}

/** Prefer the default view, else the first saved view. */
export function pickCardVisibilityView(
  views: DatagridView[],
): DatagridView | null {
  return views.find((view) => view.is_default) ?? views[0] ?? null;
}
