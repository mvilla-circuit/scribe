import {
  asRelationRefs,
  asStringArray,
  type DatagridField,
  type DatagridPropertyValue,
} from "@/lib/datagrid-schema";

import { CellValue } from "./datagrid-cell";
import type { RelationTargets } from "./datagrid-relations";
import type { DatagridDisplayRow } from "./datagrid-view-model";

/** Soft cap on how many non-empty values a gallery card shows. */
const MAX_CARD_FIELDS = 5;

type CardRow = Pick<
  DatagridDisplayRow,
  "properties" | "created_at" | "updated_at"
>;

/**
 * True when a field would render a visible value on a card (mirrors
 * {@link CellValue} emptiness — empty strings, nulls, false checkboxes, and
 * empty arrays stay quiet).
 */
function hasDisplayValue(
  field: DatagridField,
  value: DatagridPropertyValue,
  row: CardRow,
): boolean {
  switch (field.type) {
    case "checkbox":
      return value === true;
    case "number":
      return typeof value === "number";
    case "multi_select":
      return asStringArray(value).length > 0;
    case "relation":
      return asRelationRefs(value).length > 0;
    case "created_time":
      return Boolean(row.created_at);
    case "updated_time":
      return Boolean(row.updated_at);
    case "select":
    case "status":
    case "date":
    case "url":
    case "text":
    default:
      return typeof value === "string" && value !== "";
  }
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

/** Plain truncated scalar line for text-like card fields. */
function ScalarLine({
  children,
  muted = false,
}: {
  children: string;
  muted?: boolean;
}) {
  return (
    <span
      className={
        muted
          ? "block truncate text-sm text-muted"
          : "block truncate text-sm text-text"
      }
    >
      {children}
    </span>
  );
}

interface DatagridCardFieldsProps {
  /** Visible non-title fields in view order. */
  fields: DatagridField[];
  row: CardRow;
  /** Resolves relation chips to their target's title (else a truncated id). */
  relationTargets?: RelationTargets;
}

/**
 * Vertical value stack for gallery cards: non-empty field values in view
 * order, soft-capped at five. Scalars render as plain truncated text lines;
 * relations reuse {@link CellValue} chips. Select/status/multi_select keep
 * option chips so colors stay readable. No field labels or type icons.
 */
export function DatagridCardFields({
  fields,
  row,
  relationTargets,
}: DatagridCardFieldsProps) {
  const visible = fields
    .filter((field) =>
      hasDisplayValue(field, row.properties[field.id] ?? null, row),
    )
    .slice(0, MAX_CARD_FIELDS);

  if (visible.length === 0) return null;

  return (
    <ul className="flex min-w-0 list-none flex-col gap-1 p-0">
      {visible.map((field) => {
        const value = row.properties[field.id] ?? null;
        return (
          <li key={field.id} className="min-w-0">
            <CardFieldValue
              field={field}
              value={value}
              row={row}
              relationTargets={relationTargets}
            />
          </li>
        );
      })}
    </ul>
  );
}

function CardFieldValue({
  field,
  value,
  row,
  relationTargets,
}: {
  field: DatagridField;
  value: DatagridPropertyValue;
  row: CardRow;
  relationTargets?: RelationTargets;
}) {
  switch (field.type) {
    case "url":
      // Plain text — CoverCard wraps the card in a <button>, so nested <a>
      // from CellValue would be invalid HTML.
      return typeof value === "string" && value !== "" ? (
        <ScalarLine>{value}</ScalarLine>
      ) : null;
    case "relation":
    case "select":
    case "status":
    case "multi_select":
    case "checkbox":
      return (
        <CellValue
          field={field}
          value={value}
          createdAt={row.created_at}
          updatedAt={row.updated_at}
          resolveLabel={relationTargets?.resolveLabel}
        />
      );
    case "number":
      return typeof value === "number" ? (
        <ScalarLine>{String(value)}</ScalarLine>
      ) : null;
    case "date":
      return typeof value === "string" && value !== "" ? (
        <ScalarLine>{formatDate(value)}</ScalarLine>
      ) : null;
    case "created_time":
      return row.created_at ? (
        <ScalarLine muted>{formatDate(row.created_at)}</ScalarLine>
      ) : null;
    case "updated_time":
      return row.updated_at ? (
        <ScalarLine muted>{formatDate(row.updated_at)}</ScalarLine>
      ) : null;
    default:
      return typeof value === "string" && value !== "" ? (
        <ScalarLine>{value}</ScalarLine>
      ) : null;
  }
}
