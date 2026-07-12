import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import {
  asRelationRefs,
  asStringArray,
  type DatagridField,
  type DatagridPropertyValue,
} from "@/lib/datagrid-schema";
import { cn } from "@/lib/utils";

import { CellValue } from "./datagrid-cell";
import { RelationField } from "./datagrid-relation-picker";
import type { RelationTargets } from "./datagrid-relations";

interface DatagridFieldEditorProps {
  field: DatagridField;
  value: DatagridPropertyValue;
  createdAt?: string;
  updatedAt?: string;
  /** Relation targets, required to edit relation fields (else read-only). */
  relationTargets?: RelationTargets;
  onCommit: (value: DatagridPropertyValue) => void;
  /**
   * `detail` is the spacious row-panel editor; `inline` is the denser table
   * cell (multi_select stays display-only there).
   */
  variant?: "detail" | "inline";
}

const DETAIL_INPUT_CLASS =
  "h-auto min-w-0 rounded-md border-transparent bg-transparent px-2 py-1 hover:border-border focus-visible:border-border";

const INLINE_INPUT_CLASS =
  "h-auto min-w-0 rounded border-transparent bg-transparent px-1.5 py-1";

/** Stable identity for remounting uncontrolled inputs when the prop value changes. */
function valueKey(value: DatagridPropertyValue): string {
  return JSON.stringify(value ?? null);
}

/**
 * The property editor for one field, dispatched by type and shared by the row
 * detail surfaces (modal/split/full) and the table's inline cells. Text-like
 * types use a quiet borderless input; select/status a native dropdown;
 * multi_select a chip toggle row (detail only); relation the
 * {@link RelationField} picker; checkbox a tick; and computed times render
 * read-only via {@link CellValue}.
 */
export function DatagridFieldEditor({
  field,
  value,
  createdAt,
  updatedAt,
  relationTargets,
  onCommit,
  variant = "detail",
}: DatagridFieldEditorProps) {
  const inline = variant === "inline";
  const inputClass = inline ? INLINE_INPUT_CLASS : DETAIL_INPUT_CLASS;
  const readOnlyPad = inline ? "px-1.5 py-1" : "px-2 py-1";

  switch (field.type) {
    case "text":
    case "url":
      return (
        <Input
          key={valueKey(value)}
          type={field.type === "url" ? "url" : "text"}
          aria-label={field.name}
          defaultValue={typeof value === "string" ? value : ""}
          onBlur={(e) => {
            const next = e.target.value === "" ? null : e.target.value;
            const current = typeof value === "string" ? value : null;
            if (next !== current) onCommit(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder={inline ? undefined : "Empty"}
          className={inputClass}
        />
      );
    case "number":
      return (
        <Input
          key={valueKey(value)}
          type="number"
          aria-label={field.name}
          defaultValue={typeof value === "number" ? String(value) : ""}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            const current = typeof value === "number" ? value : null;
            if (raw === "") {
              if (current !== null) onCommit(null);
              return;
            }
            const number = Number(raw);
            if (Number.isFinite(number) && number !== current) onCommit(number);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder={inline ? undefined : "Empty"}
          className={cn(inputClass, "tabular-nums")}
        />
      );
    case "date":
      return (
        <Input
          key={valueKey(value)}
          type="date"
          aria-label={field.name}
          defaultValue={typeof value === "string" ? value.slice(0, 10) : ""}
          onBlur={(e) => {
            const next = e.target.value === "" ? null : e.target.value;
            const current =
              typeof value === "string" ? value.slice(0, 10) : null;
            if (next !== current) onCommit(next);
          }}
          className={inputClass}
        />
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          aria-label={field.name}
          checked={value === true}
          onChange={(e) => {
            onCommit(e.target.checked);
          }}
          className={cn(
            "cursor-pointer accent-[var(--accent)]",
            inline ? "size-3.5" : "size-4",
          )}
        />
      );
    case "select":
    case "status":
      return (
        <select
          aria-label={field.name}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            onCommit(e.target.value === "" ? null : e.target.value);
          }}
          className={
            inline
              ? "w-full rounded bg-transparent px-1 py-1 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
              : "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-text outline-none hover:border-border focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring"
          }
        >
          <option value="">—</option>
          {(field.config.options ?? []).map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      );
    case "multi_select": {
      // Table cells stay display-only; chip toggling lives in the row panel.
      if (inline) {
        return (
          <div className={readOnlyPad}>
            <CellValue
              field={field}
              value={value}
              createdAt={createdAt}
              updatedAt={updatedAt}
            />
          </div>
        );
      }
      const ids = asStringArray(value);
      const options = field.config.options ?? [];
      if (options.length === 0) {
        return <span className="px-2 text-sm text-muted">No options</span>;
      }
      const toggle = (id: string) => {
        const next = ids.includes(id)
          ? ids.filter((x) => x !== id)
          : [...ids, id];
        onCommit(next.length > 0 ? next : null);
      };
      return (
        <div className="flex flex-wrap gap-1 px-2 py-0.5">
          {options.map((opt) => {
            const on = ids.includes(opt.id);
            return (
              <Chip
                key={opt.id}
                name={opt.name}
                color={opt.color}
                washed={on}
                aria-pressed={on}
                onClick={() => {
                  toggle(opt.id);
                }}
              />
            );
          })}
        </div>
      );
    }
    case "relation":
      return relationTargets ? (
        <div className={inline ? "px-1.5 py-0.5" : "px-1"}>
          <RelationField
            fieldName={field.name}
            value={asRelationRefs(value)}
            targets={relationTargets}
            onChange={(refs) => {
              onCommit(refs.length > 0 ? refs : null);
            }}
          />
        </div>
      ) : (
        <div className={readOnlyPad}>
          <CellValue field={field} value={value} />
        </div>
      );
    default:
      return (
        <div className={readOnlyPad}>
          <CellValue
            field={field}
            value={value}
            createdAt={createdAt}
            updatedAt={updatedAt}
          />
        </div>
      );
  }
}
