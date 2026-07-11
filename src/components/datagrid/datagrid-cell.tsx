import { Check } from "lucide-react";

import { LinkIcon } from "@/components/sidebar/icons";
import {
  asRelationRefs,
  asStringArray,
  type DatagridField,
  type DatagridPropertyValue,
  type DatagridRelationRef,
  type DatagridSelectOption,
  isSafeDatagridUrl,
} from "@/lib/datagrid-schema";

import { DatagridOptionChip } from "./datagrid-option-chip";
import type { RelationTargets } from "./datagrid-relations";
import type { DatagridDisplayRow } from "./datagrid-view-model";

/** Finds a select/status option by id on a field, if configured. */
function optionById(
  field: DatagridField,
  id: string,
): DatagridSelectOption | undefined {
  return field.config.options?.find((o) => o.id === id);
}

/** A raw-string chip for values without a configured option (fallback). */
function PlainChip({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-full bg-tree-group px-2 py-0.5 text-xs font-medium text-muted">
      {label}
    </span>
  );
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

interface CellValueProps {
  field: DatagridField;
  value: DatagridPropertyValue;
  /** Source row timestamps, for the computed created/updated time field types. */
  createdAt?: string;
  updatedAt?: string;
  /** Resolves a relation ref to its target's live title; falls back to a
   * truncated id when omitted (e.g. no relation targets loaded yet). */
  resolveLabel?: (ref: DatagridRelationRef) => string;
}

/**
 * Read-only display of one property value, dispatched by field type: select and
 * status render a single swatch chip, multi_select a chip row, checkbox a tick,
 * url a link, dates/numbers as plain text, and relations as icon+title chips.
 * Shared by the table's non-editing cells, gallery property chips, and board
 * cards so every surface renders a value identically.
 */
export function CellValue({
  field,
  value,
  createdAt,
  updatedAt,
  resolveLabel,
}: CellValueProps) {
  switch (field.type) {
    case "checkbox":
      return value === true ? (
        <Check className="size-4 text-accent" aria-label="Checked" />
      ) : null;
    case "select":
    case "status": {
      if (typeof value !== "string" || value === "") return null;
      const option = optionById(field, value);
      return option ? (
        <DatagridOptionChip option={option} />
      ) : (
        <PlainChip label={value} />
      );
    }
    case "multi_select": {
      const ids = asStringArray(value);
      if (ids.length === 0) return null;
      return (
        <span className="flex flex-wrap gap-1">
          {ids.map((id) => {
            const option = optionById(field, id);
            return option ? (
              <DatagridOptionChip key={id} option={option} />
            ) : (
              <PlainChip key={id} label={id} />
            );
          })}
        </span>
      );
    }
    case "url": {
      if (typeof value !== "string" || value === "") return null;
      if (!isSafeDatagridUrl(value)) {
        return <span className="truncate text-text">{value}</span>;
      }
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="truncate text-accent underline-offset-2 hover:underline"
        >
          {value}
        </a>
      );
    }
    case "number":
      return typeof value === "number" ? (
        <span className="tabular-nums">{value}</span>
      ) : null;
    case "date":
      return typeof value === "string" && value !== "" ? (
        <span className="text-text">{formatDate(value)}</span>
      ) : null;
    case "created_time":
      return createdAt ? (
        <span className="text-muted">{formatDate(createdAt)}</span>
      ) : null;
    case "updated_time":
      return updatedAt ? (
        <span className="text-muted">{formatDate(updatedAt)}</span>
      ) : null;
    case "relation": {
      const refs = asRelationRefs(value);
      if (refs.length === 0) return null;
      return (
        <span className="flex flex-wrap gap-1">
          {refs.map((ref) => (
            <span
              key={`${ref.type}:${ref.id}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-tree-group px-2 py-0.5 text-xs font-medium text-muted"
            >
              <LinkIcon size={12} className="shrink-0" />
              <span className="truncate">
                {resolveLabel ? resolveLabel(ref) : ref.id.slice(0, 8)}
              </span>
            </span>
          ))}
        </span>
      );
    }
    default:
      return typeof value === "string" && value !== "" ? (
        <span className="truncate text-text">{value}</span>
      ) : null;
  }
}

/** How many property chips a gallery/board card shows beneath its title. */
const MAX_CARD_CHIPS = 3;

/**
 * Up to a few property values under a card title. Shared by gallery and board
 * so both surfaces render chips identically.
 */
export function RowPropertyChips({
  fields,
  row,
  relationTargets,
}: {
  fields: DatagridField[];
  row: Pick<DatagridDisplayRow, "properties" | "created_at" | "updated_at">;
  relationTargets?: RelationTargets;
}) {
  const chips = fields.slice(0, MAX_CARD_CHIPS);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((field) => (
        <CellValue
          key={field.id}
          field={field}
          value={row.properties[field.id] ?? null}
          createdAt={row.created_at}
          updatedAt={row.updated_at}
          resolveLabel={relationTargets?.resolveLabel}
        />
      ))}
    </div>
  );
}
