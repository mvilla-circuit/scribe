/**
 * Shared datagrid field, property, and view-config types used by the data
 * layer and pure query/CSV helpers. Kept in `lib` so both `data` and UI can
 * import without crossing architecture boundaries.
 */

import type { Json } from "./database.types";

/** Reserved field id for the built-in row title (a column, never a field). */
export const TITLE_FIELD_ID = "title";

/** Supported property column types for a datagrid. */
export type DatagridFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "status"
  | "checkbox"
  | "url"
  | "relation"
  | "created_time"
  | "updated_time";

/** A colored option for select, multi-select, or status fields. */
export interface DatagridSelectOption {
  id: string;
  name: string;
  color: string;
}

/** Status group buckets (Notion-style). */
type DatagridStatusGroup = "todo" | "in_progress" | "done";

/** Per-type configuration stored on a field definition. */
export interface DatagridFieldConfig {
  options?: DatagridSelectOption[];
  groups?: Partial<Record<DatagridStatusGroup, string[]>>;
  allowMultiple?: boolean;
}

/** One column in a datagrid's property schema. */
export interface DatagridField {
  id: string;
  name: string;
  type: DatagridFieldType;
  config: DatagridFieldConfig;
}

/** Entity kinds a relation cell may point at. */
export type DatagridRelationTargetType =
  "datagrid_row" | "book" | "entry" | "document";

/** A single relation target reference stored in properties. */
export interface DatagridRelationRef {
  type: DatagridRelationTargetType;
  id: string;
}

/** Typed property value shapes keyed by field type. */
export type DatagridPropertyValue =
  string | number | boolean | string[] | DatagridRelationRef[] | null;

/** Row property bag keyed by field id. */
export type DatagridProperties = Record<string, DatagridPropertyValue>;

const RELATION_TARGET_TYPES = new Set<DatagridRelationTargetType>([
  "datagrid_row",
  "book",
  "entry",
  "document",
]);

function isRelationRef(value: unknown): value is DatagridRelationRef {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const ref = value as Record<string, unknown>;
  return (
    typeof ref.type === "string" &&
    RELATION_TARGET_TYPES.has(ref.type as DatagridRelationTargetType) &&
    typeof ref.id === "string" &&
    ref.id.trim().length > 0
  );
}

/**
 * True when a URL cell value is safe to render as an `<a href>`. Only
 * `http:`/`https:` and protocol-relative `//` links are allowed — blocks
 * schemeless strings, `javascript:`, and other dangerous schemes.
 */
export function isSafeDatagridUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  // Reject ASCII controls (incl. null) so schemes like `java\0script:` can't slip
  // past a prefix check via URL parser normalization.
  for (const char of trimmed) {
    const code = char.charCodeAt(0);
    if (code < 32 || code === 127) return false;
  }
  if (!/^(https?:\/\/|\/\/)/i.test(trimmed)) return false;
  try {
    const url = new URL(trimmed, "https://scribe.invalid");
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Narrows a property value to the string ids stored by multi-select fields.
 * Non-arrays and mixed arrays yield an empty list.
 */
export function asStringArray(value: DatagridPropertyValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Narrows a property value to relation refs. Non-arrays and non-ref entries
 * are dropped so UI editors can treat the result as `DatagridRelationRef[]`.
 * Ids are trimmed so display/CSV paths match the picker write normalizer.
 */
export function asRelationRefs(
  value: DatagridPropertyValue,
): DatagridRelationRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRelationRef).map((ref) => ({
    type: ref.type,
    id: ref.id.trim(),
  }));
}

/**
 * Converts a nullable JSON value into a datagrid property bag. Non-object
 * values, including arrays, produce an empty bag.
 */
export function toDatagridProperties(
  value: Json | null | undefined,
): DatagridProperties {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? value
      : {}
  ) as DatagridProperties;
}

/**
 * Parses an untrusted row property bag against its field schema. Only known
 * field ids with values plausible for that field's type are retained.
 */
export function parseDatagridProperties(
  fields: DatagridField[],
  raw: unknown,
): DatagridProperties {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const properties: DatagridProperties = {};

  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(source, field.id)) continue;
    const value = source[field.id];
    const nullableString =
      value === null || typeof value === "string" ? value : undefined;

    switch (field.type) {
      case "text":
      case "url":
      case "date":
      case "created_time":
      case "updated_time":
      case "select":
      case "status":
        if (nullableString !== undefined) properties[field.id] = nullableString;
        break;
      case "number":
        if (value === null || typeof value === "number") {
          properties[field.id] = value;
        }
        break;
      case "checkbox":
        if (value === null || typeof value === "boolean") {
          properties[field.id] = value;
        }
        break;
      case "multi_select":
        if (
          Array.isArray(value) &&
          value.every((item) => typeof item === "string")
        ) {
          properties[field.id] = value;
        }
        break;
      case "relation":
        if (Array.isArray(value) && value.every(isRelationRef)) {
          properties[field.id] = asRelationRefs(value);
        }
        break;
    }
  }

  return properties;
}

/** Layout modes for a saved datagrid view. */
export type DatagridLayout = "table" | "gallery" | "board";

/** A single filter clause on a property. */
export interface DatagridFilter {
  fieldId: string;
  op:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "is_empty"
    | "is_not_empty"
    | "gt"
    | "gte"
    | "lt"
    | "lte";
  value?: DatagridPropertyValue;
}

/** A sort clause. */
export interface DatagridSort {
  fieldId: string;
  direction: "asc" | "desc";
}

/** Persisted view configuration (layout, filters, sorts, chrome). */
export interface DatagridViewConfig {
  layout: DatagridLayout;
  filters: DatagridFilter[];
  sorts: DatagridSort[];
  groupBy: string | null;
  /** Table column visibility/order. Empty means all fields in schema order. */
  visibleFieldIds: string[];
  /**
   * Gallery/board/embed card field visibility/order. Empty means all fields.
   * When omitted from persisted jsonb, parse falls back to `visibleFieldIds`.
   */
  cardVisibleFieldIds: string[];
  columnWidths: Record<string, number>;
  boardFieldId?: string | null;
  coverField?: string | null;
}

/** Default view config for a newly created table view. */
export const DEFAULT_DATAGRID_VIEW_CONFIG: DatagridViewConfig = {
  layout: "table",
  filters: [],
  sorts: [],
  groupBy: null,
  visibleFieldIds: [],
  cardVisibleFieldIds: [],
  columnWidths: {},
  boardFieldId: null,
  coverField: null,
};

/**
 * Apply a view's visible-id list to the schema field list. Empty means all
 * fields in schema order; otherwise returns those ids that still exist, in
 * list order. Shared by table columns, gallery/board cards, and embeds.
 */
export function selectVisibleFields(
  fields: DatagridField[],
  visibleFieldIds: string[],
): DatagridField[] {
  if (visibleFieldIds.length === 0) return fields;
  const byId = new Map(fields.map((field) => [field.id, field]));
  return visibleFieldIds
    .map((id) => byId.get(id))
    .filter((field): field is DatagridField => field !== undefined);
}

const FIELD_TYPES = new Set<string>([
  "text",
  "number",
  "date",
  "select",
  "multi_select",
  "status",
  "checkbox",
  "url",
  "relation",
  "created_time",
  "updated_time",
]);

const FILTER_OPS = new Set<DatagridFilter["op"]>([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
  "gt",
  "gte",
  "lt",
  "lte",
]);

function isPropertyValue(value: unknown): value is DatagridPropertyValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) &&
      (value.every((item) => typeof item === "string") ||
        value.every(isRelationRef)))
  );
}

function parseStringIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}

function parseFilters(raw: unknown): DatagridFilter[] {
  if (!Array.isArray(raw)) return [];
  const filters: DatagridFilter[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }
    const clause = item as Record<string, unknown>;
    if (
      typeof clause.fieldId !== "string" ||
      typeof clause.op !== "string" ||
      !FILTER_OPS.has(clause.op as DatagridFilter["op"]) ||
      ("value" in clause && !isPropertyValue(clause.value))
    ) {
      continue;
    }
    const filter: DatagridFilter = {
      fieldId: clause.fieldId,
      op: clause.op as DatagridFilter["op"],
    };
    if ("value" in clause) filter.value = clause.value as DatagridPropertyValue;
    filters.push(filter);
  }
  return filters;
}

function parseSorts(raw: unknown): DatagridSort[] {
  if (!Array.isArray(raw)) return [];
  const sorts: DatagridSort[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }
    const clause = item as Record<string, unknown>;
    if (
      typeof clause.fieldId === "string" &&
      (clause.direction === "asc" || clause.direction === "desc")
    ) {
      sorts.push({
        fieldId: clause.fieldId,
        direction: clause.direction,
      });
    }
  }
  return sorts;
}

/**
 * Parses an untrusted `fields` jsonb payload into a typed field list.
 * Invalid entries are dropped; missing config becomes `{}`.
 */
export function parseDatagridFields(raw: unknown): DatagridField[] {
  if (!Array.isArray(raw)) return [];
  const fields: DatagridField[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string") continue;
    if (typeof row.type !== "string" || !FIELD_TYPES.has(row.type)) continue;
    const type = row.type as DatagridFieldType;
    const config =
      typeof row.config === "object" &&
      row.config !== null &&
      !Array.isArray(row.config)
        ? (row.config as DatagridFieldConfig)
        : {};
    fields.push({ id: row.id, name: row.name, type, config });
  }
  return fields;
}

/**
 * Parses an untrusted view `config` jsonb into a typed view config with
 * safe defaults for missing keys.
 */
export function parseDatagridViewConfig(raw: unknown): DatagridViewConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_DATAGRID_VIEW_CONFIG };
  }
  const row = raw as Record<string, unknown>;
  const layout =
    row.layout === "gallery" || row.layout === "board" || row.layout === "table"
      ? row.layout
      : DEFAULT_DATAGRID_VIEW_CONFIG.layout;
  const visibleFieldIds = parseStringIds(row.visibleFieldIds);
  // Missing cardVisibleFieldIds falls back to column visibility so pre-split
  // configs keep the same hides on cards; an explicit [] means all card fields.
  const cardVisibleFieldIds = Array.isArray(row.cardVisibleFieldIds)
    ? parseStringIds(row.cardVisibleFieldIds)
    : visibleFieldIds;
  return {
    layout,
    filters: parseFilters(row.filters),
    sorts: parseSorts(row.sorts),
    groupBy: typeof row.groupBy === "string" ? row.groupBy : null,
    visibleFieldIds,
    cardVisibleFieldIds,
    columnWidths:
      typeof row.columnWidths === "object" &&
      row.columnWidths !== null &&
      !Array.isArray(row.columnWidths)
        ? (row.columnWidths as Record<string, number>)
        : {},
    boardFieldId:
      typeof row.boardFieldId === "string" ? row.boardFieldId : null,
    coverField: typeof row.coverField === "string" ? row.coverField : null,
  };
}
