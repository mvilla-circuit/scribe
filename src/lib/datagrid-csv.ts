/**
 * Pure CSV (RFC 4180-ish) serialize/parse for datagrid rows. Exports a Title
 * column plus one column per typed field; imports map columns back to fields by
 * name and return typed rows alongside clear per-cell validation errors.
 * Formula/rollup columns are not applicable and computed time columns are
 * read-only (skipped on import).
 */

import type {
  DatagridField,
  DatagridProperties,
  DatagridPropertyValue,
  DatagridRelationRef,
  DatagridRelationTargetType,
} from "./datagrid-schema";

const RELATION_TYPES = new Set<DatagridRelationTargetType>([
  "datagrid_row",
  "book",
  "entry",
  "document",
]);

const MULTI_DELIMITER = ";";

/** Input row shape for {@link serializeDatagridCsv}. */
export interface DatagridCsvRow {
  title: string;
  properties: DatagridProperties;
  created_at: string;
  updated_at: string;
}

/** A row produced by {@link parseDatagridCsv}. */
export interface DatagridParsedRow {
  title: string;
  properties: DatagridProperties;
}

/** A single validation problem found while parsing. `row` is 1-based data row. */
interface DatagridCsvError {
  row: number;
  column?: string;
  message: string;
}

/** Result of {@link parseDatagridCsv}: parsed rows plus any validation errors. */
export interface DatagridCsvParseResult {
  rows: DatagridParsedRow[];
  errors: DatagridCsvError[];
}

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function optionName(field: DatagridField, id: string): string {
  return field.config.options?.find((o) => o.id === id)?.name ?? id;
}

function optionIdByName(field: DatagridField, name: string): string | null {
  const match = field.config.options?.find(
    (o) => o.name.toLowerCase() === name.toLowerCase(),
  );
  return match?.id ?? null;
}

function serializeCell(
  value: DatagridPropertyValue,
  field: DatagridField,
  row: DatagridCsvRow,
): string {
  switch (field.type) {
    case "created_time":
      return row.created_at;
    case "updated_time":
      return row.updated_at;
    case "checkbox":
      return value === true ? "true" : "false";
    case "number":
      return typeof value === "number" ? String(value) : "";
    case "select":
    case "status":
      return typeof value === "string" ? optionName(field, value) : "";
    case "multi_select":
      return Array.isArray(value)
        ? value
            .filter((v): v is string => typeof v === "string")
            .map((id) => optionName(field, id))
            .join(MULTI_DELIMITER)
        : "";
    case "relation":
      return Array.isArray(value)
        ? value
            .filter(
              (v): v is DatagridRelationRef =>
                typeof v === "object" && v !== null && "id" in v,
            )
            .map((ref) => `${ref.type}:${ref.id}`)
            .join(MULTI_DELIMITER)
        : "";
    default:
      // text, url
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      return "";
  }
}

/**
 * Serializes rows to a CSV string: a `Title` header followed by one column per
 * field (in the given order), one line per row. Values are escaped per RFC 4180
 * and no trailing newline is emitted.
 */
export function serializeDatagridCsv(
  rows: DatagridCsvRow[],
  fields: DatagridField[],
): string {
  const header = ["Title", ...fields.map((f) => f.name)]
    .map(escapeCell)
    .join(",");
  const lines = rows.map((row) => {
    const cells = [
      row.title,
      ...fields.map((field) =>
        serializeCell(row.properties[field.id] ?? null, field, row),
      ),
    ];
    return cells.map(escapeCell).join(",");
  });
  return [header, ...lines].join("\n");
}

/** Parses raw CSV text into an array of record cell-arrays (RFC 4180). */
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;
  let sawAny = false;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (char === undefined) break;
    sawAny = true;
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      endField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRecord();
      i += 1;
      continue;
    }
    if (char === "\n") {
      endRecord();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (
    field.length > 0 ||
    record.length > 0 ||
    (sawAny && records.length === 0)
  ) {
    endRecord();
  }
  return records;
}

const TRUTHY = new Set(["true", "1", "yes", "y", "checked"]);
const FALSEY = new Set(["false", "0", "no", "n", "unchecked", ""]);

function parseCell(
  raw: string,
  field: DatagridField,
  rowNumber: number,
  errors: DatagridCsvError[],
): DatagridPropertyValue {
  const value = raw.trim();
  switch (field.type) {
    case "number": {
      if (value === "") return null;
      const num = Number(value);
      if (Number.isNaN(num)) {
        errors.push({
          row: rowNumber,
          column: field.name,
          message: `Invalid number "${raw}" for ${field.name}`,
        });
        return null;
      }
      return num;
    }
    case "checkbox": {
      const lower = value.toLowerCase();
      if (TRUTHY.has(lower)) return true;
      if (FALSEY.has(lower)) return false;
      errors.push({
        row: rowNumber,
        column: field.name,
        message: `Invalid checkbox value "${raw}" for ${field.name}`,
      });
      return false;
    }
    case "date": {
      if (value === "") return null;
      if (Number.isNaN(new Date(value).getTime())) {
        errors.push({
          row: rowNumber,
          column: field.name,
          message: `Invalid date "${raw}" for ${field.name}`,
        });
        return null;
      }
      return value;
    }
    case "select":
    case "status": {
      if (value === "") return null;
      const id = optionIdByName(field, value);
      if (id === null) {
        errors.push({
          row: rowNumber,
          column: field.name,
          message: `Unknown option "${raw}" for ${field.name}`,
        });
        return null;
      }
      return id;
    }
    case "multi_select": {
      if (value === "") return null;
      const ids: string[] = [];
      for (const part of value.split(MULTI_DELIMITER)) {
        const name = part.trim();
        if (name === "") continue;
        const id = optionIdByName(field, name);
        if (id === null) {
          errors.push({
            row: rowNumber,
            column: field.name,
            message: `Unknown option "${name}" for ${field.name}`,
          });
          continue;
        }
        ids.push(id);
      }
      return ids;
    }
    case "relation": {
      if (value === "") return null;
      const refs: DatagridRelationRef[] = [];
      for (const part of value.split(MULTI_DELIMITER)) {
        const token = part.trim();
        if (token === "") continue;
        const colon = token.indexOf(":");
        const type = (colon >= 0 ? token.slice(0, colon) : "").trim();
        const id = (colon >= 0 ? token.slice(colon + 1) : "").trim();
        if (!RELATION_TYPES.has(type as DatagridRelationTargetType) || !id) {
          errors.push({
            row: rowNumber,
            column: field.name,
            message: `Invalid relation "${token}" for ${field.name}`,
          });
          continue;
        }
        refs.push({ type: type as DatagridRelationTargetType, id });
      }
      return refs;
    }
    default:
      // text, url
      return value === "" ? null : value;
  }
}

/**
 * Parses CSV text into typed rows. The header must contain a `Title` column;
 * other columns are matched to fields by name (case-insensitive). Unknown
 * columns and read-only time columns are ignored. Blank-title rows are skipped
 * with an error; per-cell problems are reported without dropping the row.
 */
export function parseDatagridCsv(
  csv: string,
  fields: DatagridField[],
): DatagridCsvParseResult {
  const errors: DatagridCsvError[] = [];
  const records = parseCsvRecords(csv);
  const headerRecord = records[0];
  if (!headerRecord) return { rows: [], errors };

  const header = headerRecord.map((h) => h.trim());
  const titleIndex = header.findIndex((h) => h.toLowerCase() === "title");
  if (titleIndex === -1) {
    errors.push({ row: 0, message: "Missing required Title column" });
    return { rows: [], errors };
  }

  const columnFields = header.map((name) => {
    const field = fields.find(
      (f) => f.name.toLowerCase() === name.toLowerCase(),
    );
    if (!field) return null;
    if (field.type === "created_time" || field.type === "updated_time") {
      return null;
    }
    return field;
  });

  const rows: DatagridParsedRow[] = [];
  for (let r = 1; r < records.length; r += 1) {
    const record = records[r];
    if (!record) continue;
    const rowNumber = r;
    const title = (record[titleIndex] ?? "").trim();
    if (title === "") {
      errors.push({
        row: rowNumber,
        column: "Title",
        message: "Row is missing a Title",
      });
      continue;
    }
    const properties: DatagridProperties = {};
    for (let c = 0; c < columnFields.length; c += 1) {
      const field = columnFields[c];
      if (!field || c === titleIndex) continue;
      properties[field.id] = parseCell(
        record[c] ?? "",
        field,
        rowNumber,
        errors,
      );
    }
    rows.push({ title, properties });
  }

  return { rows, errors };
}
