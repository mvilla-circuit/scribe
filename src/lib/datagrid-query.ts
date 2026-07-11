/**
 * Pure, data-layer-free query engine for datagrid rows: filtering,
 * multi-column sorting, and group-by. Operates on a minimal row shape so it
 * stays in `lib` and never imports from `data`.
 */

import {
  asRelationRefs,
  asStringArray,
  type DatagridField,
  type DatagridFilter,
  type DatagridProperties,
  type DatagridPropertyValue,
  type DatagridSort,
  TITLE_FIELD_ID,
} from "./datagrid-schema";

export { TITLE_FIELD_ID } from "./datagrid-schema";

/**
 * Minimal row shape the query engine needs. Deliberately independent of the
 * data layer's row type so `lib` never depends on `data`.
 */
export interface DatagridQueryRow {
  id: string;
  title: string;
  properties: DatagridProperties;
  created_at: string;
  updated_at: string;
}

/** One group produced by {@link groupRows}. */
export interface DatagridGroupSection<
  T extends DatagridQueryRow = DatagridQueryRow,
> {
  key: string;
  label: string;
  rows: T[];
}

/** Result of a full {@link queryDatagrid} pass. */
export interface DatagridQueryResult<
  T extends DatagridQueryRow = DatagridQueryRow,
> {
  /** Filtered + sorted rows (flat), always present. */
  rows: T[];
  /** Grouped sections when a `groupBy` was requested, otherwise `null`. */
  sections: DatagridGroupSection<T>[] | null;
}

/** The filter/sort/group-by inputs {@link queryDatagrid} consumes. */
export interface DatagridQuery {
  filters: DatagridFilter[];
  sorts: DatagridSort[];
  groupBy: string | null;
}

function findField(
  fieldId: string,
  fields: DatagridField[],
): DatagridField | undefined {
  return fields.find((f) => f.id === fieldId);
}

/**
 * Resolves the raw comparison value for a field on a row. Title and the
 * timestamp field types read from the row itself; everything else reads the
 * property bag by field id.
 */
function resolveValue(
  row: DatagridQueryRow,
  fieldId: string,
  field: DatagridField | undefined,
): DatagridPropertyValue {
  if (fieldId === TITLE_FIELD_ID) return row.title;
  if (field?.type === "created_time") return row.created_at;
  if (field?.type === "updated_time") return row.updated_at;
  return row.properties[fieldId] ?? null;
}

function isEmptyValue(value: DatagridPropertyValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function toTimestamp(value: DatagridPropertyValue): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return new Date(value).getTime();
  return Number.NaN;
}

function relationIds(value: DatagridPropertyValue): string[] {
  return asRelationRefs(value).map((ref) => ref.id);
}

/**
 * Coerces a property value to a comparable string. Strings pass through;
 * numbers/booleans stringify; arrays and null become "" (they are never the
 * value of a text-like field the string branches handle).
 */
function toStr(value: DatagridPropertyValue): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function compareNumbers(a: number, b: number): number {
  if (Number.isNaN(a) && Number.isNaN(b)) return 0;
  if (Number.isNaN(a)) return 1;
  if (Number.isNaN(b)) return -1;
  return a - b;
}

/** Shared numeric/timestamp comparison for number and date-like filter ops. */
function matchesNumericOp(
  raw: DatagridPropertyValue,
  target: DatagridPropertyValue,
  op: DatagridFilter["op"],
): boolean {
  const a = toTimestamp(raw);
  const b = toTimestamp(target);
  switch (op) {
    case "equals":
      return a === b;
    case "not_equals":
      return a !== b;
    case "gt":
      return a > b;
    case "gte":
      return a >= b;
    case "lt":
      return a < b;
    case "lte":
      return a <= b;
    default:
      return false;
  }
}

/**
 * Tests one row against one filter clause. Empty checks are type-independent;
 * the remaining operators dispatch on the field type so numbers compare
 * numerically, dates by timestamp, and array fields by membership.
 */
function matchesFilter(
  row: DatagridQueryRow,
  filter: DatagridFilter,
  fields: DatagridField[],
): boolean {
  const field = findField(filter.fieldId, fields);
  const raw = resolveValue(row, filter.fieldId, field);

  if (filter.op === "is_empty") return isEmptyValue(raw);
  if (filter.op === "is_not_empty") return !isEmptyValue(raw);

  const type = filter.fieldId === TITLE_FIELD_ID ? "text" : field?.type;
  const target = filter.value ?? null;

  switch (type) {
    case "number":
    case "date":
    case "created_time":
    case "updated_time":
      return matchesNumericOp(raw, target, filter.op);
    case "checkbox": {
      const a = raw === true;
      const b = target === true;
      switch (filter.op) {
        case "equals":
          return a === b;
        case "not_equals":
          return a !== b;
        default:
          return false;
      }
    }
    case "multi_select": {
      const members = asStringArray(raw);
      const needle = typeof target === "string" ? target : "";
      switch (filter.op) {
        case "contains":
        case "equals":
          return members.includes(needle);
        case "not_contains":
        case "not_equals":
          return !members.includes(needle);
        default:
          return false;
      }
    }
    case "relation": {
      const ids = relationIds(raw);
      const needle = typeof target === "string" ? target : "";
      switch (filter.op) {
        case "contains":
        case "equals":
          return ids.includes(needle);
        case "not_contains":
        case "not_equals":
          return !ids.includes(needle);
        default:
          return false;
      }
    }
    default: {
      // text, url, select, status, title
      const a = toStr(raw);
      const b = toStr(target);
      switch (filter.op) {
        case "equals":
          return a === b;
        case "not_equals":
          return a !== b;
        case "contains":
          return a.toLowerCase().includes(b.toLowerCase());
        case "not_contains":
          return !a.toLowerCase().includes(b.toLowerCase());
        case "gt":
          return a.localeCompare(b) > 0;
        case "gte":
          return a.localeCompare(b) >= 0;
        case "lt":
          return a.localeCompare(b) < 0;
        case "lte":
          return a.localeCompare(b) <= 0;
        default:
          return false;
      }
    }
  }
}

/** Returns the rows that satisfy every filter (AND). */
export function filterRows<T extends DatagridQueryRow>(
  rows: T[],
  filters: DatagridFilter[],
  fields: DatagridField[],
): T[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((filter) => matchesFilter(row, filter, fields)),
  );
}

/**
 * Type-aware comparison of two resolved field values for sorting. Empty values
 * are handled by the caller; this only orders two present values.
 */
function compareValues(
  a: DatagridPropertyValue,
  b: DatagridPropertyValue,
  type: string | undefined,
): number {
  switch (type) {
    case "number":
    case "date":
    case "created_time":
    case "updated_time":
      return compareNumbers(toTimestamp(a), toTimestamp(b));
    case "checkbox":
      return Number(a === true) - Number(b === true);
    case "multi_select":
    case "relation": {
      const sa =
        type === "relation"
          ? relationIds(a).join(",")
          : asStringArray(a).join(",");
      const sb =
        type === "relation"
          ? relationIds(b).join(",")
          : asStringArray(b).join(",");
      return sa.localeCompare(sb);
    }
    default: {
      return toStr(a).localeCompare(toStr(b), undefined, {
        sensitivity: "base",
      });
    }
  }
}

/**
 * Sorts rows by the given clauses in order (stable). Empty values always sort
 * to the end, regardless of direction. Returns a new array.
 */
export function sortRows<T extends DatagridQueryRow>(
  rows: T[],
  sorts: DatagridSort[],
  fields: DatagridField[],
): T[] {
  if (sorts.length === 0) return [...rows];
  const decorated = rows.map((row, index) => ({ row, index }));
  decorated.sort((x, y) => {
    for (const sort of sorts) {
      const field = findField(sort.fieldId, fields);
      const type = sort.fieldId === TITLE_FIELD_ID ? "text" : field?.type;
      const va = resolveValue(x.row, sort.fieldId, field);
      const vb = resolveValue(y.row, sort.fieldId, field);
      const ea = isEmptyValue(va);
      const eb = isEmptyValue(vb);
      if (ea && eb) continue;
      if (ea) return 1;
      if (eb) return -1;
      const cmp = compareValues(va, vb, type);
      if (cmp !== 0) return sort.direction === "desc" ? -cmp : cmp;
    }
    return x.index - y.index;
  });
  return decorated.map((d) => d.row);
}

function selectOptionLabel(
  field: DatagridField | undefined,
  optionId: string,
): string {
  const option = field?.config.options?.find((o) => o.id === optionId);
  return option?.name ?? optionId;
}

/**
 * Groups rows by a field. Select/status/multi_select order sections by the
 * field's configured option order (a multi_select row appears in every selected
 * group); checkbox splits into Checked/Unchecked; other types group by their
 * stringified value in first-seen order. Rows with no value fall into a
 * trailing "No {field}" section.
 */
export function groupRows<T extends DatagridQueryRow>(
  rows: T[],
  groupBy: string,
  fields: DatagridField[],
): DatagridGroupSection<T>[] {
  const field = findField(groupBy, fields);
  const type = groupBy === TITLE_FIELD_ID ? "text" : field?.type;
  const emptyLabel = `No ${field?.name ?? "value"}`;

  if (type === "checkbox") {
    const checked: T[] = [];
    const unchecked: T[] = [];
    for (const row of rows) {
      if (row.properties[groupBy] === true) checked.push(row);
      else unchecked.push(row);
    }
    return [
      { key: "true", label: "Checked", rows: checked },
      { key: "false", label: "Unchecked", rows: unchecked },
    ];
  }

  const sections = new Map<string, DatagridGroupSection<T>>();
  const order: string[] = [];
  const emptyRows: T[] = [];

  // Pre-seed select-like sections in configured option order so empty groups
  // keep a stable position and empties can trail at the end.
  if (
    (type === "select" || type === "status" || type === "multi_select") &&
    field?.config.options
  ) {
    for (const option of field.config.options) {
      sections.set(option.id, {
        key: option.id,
        label: option.name,
        rows: [],
      });
      order.push(option.id);
    }
  }

  const push = (key: string, label: string, row: T) => {
    let section = sections.get(key);
    if (!section) {
      section = { key, label, rows: [] };
      sections.set(key, section);
      order.push(key);
    }
    section.rows.push(row);
  };

  for (const row of rows) {
    const raw = resolveValue(row, groupBy, field);
    if (type === "multi_select") {
      const members = asStringArray(raw);
      if (members.length === 0) {
        emptyRows.push(row);
        continue;
      }
      for (const member of members) {
        push(member, selectOptionLabel(field, member), row);
      }
      continue;
    }
    if (isEmptyValue(raw)) {
      emptyRows.push(row);
      continue;
    }
    const key = toStr(raw);
    const label =
      type === "select" || type === "status"
        ? selectOptionLabel(field, key)
        : key;
    push(key, label, row);
  }

  const result = order
    .map((key) => sections.get(key))
    .filter((s): s is DatagridGroupSection<T> => s !== undefined)
    .filter((s) => s.rows.length > 0);

  if (emptyRows.length > 0) {
    result.push({ key: "", label: emptyLabel, rows: emptyRows });
  }
  return result;
}

/** Applies filters, then sorts, then optional group-by in one pass. */
export function queryDatagrid<T extends DatagridQueryRow>(
  rows: T[],
  query: DatagridQuery,
  fields: DatagridField[],
): DatagridQueryResult<T> {
  const filtered = filterRows(rows, query.filters, fields);
  const sorted = sortRows(filtered, query.sorts, fields);
  const sections = query.groupBy
    ? groupRows(sorted, query.groupBy, fields)
    : null;
  return { rows: sorted, sections };
}
