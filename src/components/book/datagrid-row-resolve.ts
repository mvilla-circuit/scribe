import type { DatagridRowMeta } from "@/data/datagrid-rows";
import type { DatagridView } from "@/data/datagrid-views";
import type { Datagrid } from "@/data/datagrids";
import type {
  DatagridLinkOption,
  DatagridRowLinkOption,
  ResolvedDatagridRow,
} from "@/editor/editor-bridge";
import {
  asRelationRefs,
  asStringArray,
  type DatagridField,
  type DatagridPropertyValue,
  parseDatagridFields,
  parseDatagridProperties,
  parseDatagridViewConfig,
  selectVisibleFields,
} from "@/lib/datagrid-schema";

/** Soft cap matching gallery cards — keep embed previews scannable. */
const MAX_PREVIEW_FIELDS = 5;

/**
 * Index row metadata by owning datagrid id for O(1) resolve + picker lookups.
 * Build once per host render (memoized) so each card doesn't rebuild the map.
 */
export function indexRowsByDatagrid(
  rows: DatagridRowMeta[],
): Map<string, DatagridRowMeta[]> {
  const byDatagrid = new Map<string, DatagridRowMeta[]>();
  for (const row of rows) {
    const list = byDatagrid.get(row.datagrid_id);
    if (list) list.push(row);
    else byDatagrid.set(row.datagrid_id, [row]);
  }
  return byDatagrid;
}

/**
 * Map each datagrid id → `cardVisibleFieldIds` from its default (or first) view.
 * Empty arrays mean “all fields” for {@link selectVisibleFields}. Parse falls
 * back to `visibleFieldIds` when the card key was never persisted.
 */
export function indexCardVisibleFieldIdsByDatagrid(
  views: DatagridView[],
): Map<string, string[]> {
  const byDatagrid = new Map<string, DatagridView[]>();
  for (const view of views) {
    const list = byDatagrid.get(view.datagrid_id);
    if (list) list.push(view);
    else byDatagrid.set(view.datagrid_id, [view]);
  }
  const visible = new Map<string, string[]>();
  for (const [datagridId, list] of byDatagrid) {
    const preferred = list.find((view) => view.is_default) ?? list[0] ?? null;
    const config = parseDatagridViewConfig(preferred?.config ?? null);
    visible.set(datagridId, config.cardVisibleFieldIds);
  }
  return visible;
}

function formatDate(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function optionName(field: DatagridField, optionId: string): string {
  return (
    field.config.options?.find((option) => option.id === optionId)?.name ??
    optionId
  );
}

/**
 * Plain-text preview line for one field value, or null when the value would
 * stay quiet on a gallery card (empty / false checkbox / empty arrays).
 */
function previewLine(
  field: DatagridField,
  value: DatagridPropertyValue,
  row: Pick<DatagridRowMeta, "created_at" | "updated_at">,
): string | null {
  switch (field.type) {
    case "checkbox":
      return value === true ? "Yes" : null;
    case "number":
      return typeof value === "number" ? String(value) : null;
    case "multi_select": {
      const ids = asStringArray(value);
      if (ids.length === 0) return null;
      return ids.map((id) => optionName(field, id)).join(", ");
    }
    case "relation": {
      const refs = asRelationRefs(value);
      if (refs.length === 0) return null;
      return refs.map((ref) => ref.id.slice(0, 9)).join(", ");
    }
    case "created_time":
      return row.created_at ? formatDate(row.created_at) : null;
    case "updated_time":
      return row.updated_at ? formatDate(row.updated_at) : null;
    case "select":
    case "status":
      return typeof value === "string" && value !== ""
        ? optionName(field, value)
        : null;
    case "date":
      return typeof value === "string" && value !== ""
        ? formatDate(value)
        : null;
    case "url":
    case "text":
    default:
      return typeof value === "string" && value !== "" ? value : null;
  }
}

function buildFieldsPreview(
  fields: DatagridField[],
  row: DatagridRowMeta,
): { fieldId: string; text: string }[] {
  const properties = parseDatagridProperties(fields, row.properties);
  const lines: { fieldId: string; text: string }[] = [];
  for (const field of fields) {
    const text = previewLine(field, properties[field.id] ?? null, row);
    if (text === null) continue;
    lines.push({ fieldId: field.id, text });
    if (lines.length >= MAX_PREVIEW_FIELDS) break;
  }
  return lines;
}

/**
 * Resolve a datagrid-row embed to the live title/icon/cover/field preview
 * shown on its card. Pure over the current datagrids + indexed rows so renames
 * and property edits flow through on the next render. Returns null when the
 * target can't be found (loading, deleted, or inaccessible).
 *
 * `visibleFieldIdsByDatagrid` is each datagrid's default-view
 * `cardVisibleFieldIds` — empty / missing means all fields (same as gallery).
 */
export function resolveDatagridRow(
  datagrids: Datagrid[],
  byDatagrid: Map<string, DatagridRowMeta[]>,
  datagridId: string | null,
  rowId: string | null,
  visibleFieldIdsByDatagrid: ReadonlyMap<string, string[]> = new Map(),
): ResolvedDatagridRow | null {
  if (!datagridId || !rowId) return null;
  const datagrid = datagrids.find((grid) => grid.id === datagridId);
  if (!datagrid) return null;
  const row = byDatagrid.get(datagridId)?.find((r) => r.id === rowId);
  if (!row) return null;

  const fields = selectVisibleFields(
    parseDatagridFields(datagrid.fields),
    visibleFieldIdsByDatagrid.get(datagridId) ?? [],
  );
  return {
    title: row.title.trim() === "" ? "Untitled" : row.title,
    icon: row.icon,
    coverUrl: row.cover_url,
    datagridName: datagrid.name.trim() === "" ? "Untitled" : datagrid.name,
    fieldsPreview: buildFieldsPreview(fields, row),
  };
}

/**
 * Every datagrid offered by the first step of the "Datagrid card" picker.
 */
export function buildDatagridLinkOptions(
  datagrids: Datagrid[],
): DatagridLinkOption[] {
  return datagrids.map((grid) => ({
    datagridId: grid.id,
    label: grid.name.trim() === "" ? "Untitled" : grid.name,
    icon: grid.icon,
    subtitle: "Datagrid",
  }));
}

/**
 * Rows belonging to one datagrid for the second picker step.
 */
export function buildDatagridRowLinkOptions(
  datagrid: Datagrid,
  rows: DatagridRowMeta[],
): DatagridRowLinkOption[] {
  const subtitle = datagrid.name.trim() === "" ? "Untitled" : datagrid.name;
  return rows.map((row) => ({
    datagridId: datagrid.id,
    rowId: row.id,
    label: row.title.trim() === "" ? "Untitled" : row.title,
    icon: row.icon,
    subtitle,
  }));
}
