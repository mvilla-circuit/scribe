import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  Filter,
  Group,
  X,
} from "lucide-react";

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { TITLE_FIELD_ID } from "@/lib/datagrid-query";
import type { DatagridField, DatagridViewConfig } from "@/lib/datagrid-schema";
import { cn } from "@/lib/utils";

// Only these field types make sense to group a board/table into buckets.
const GROUPABLE = new Set(["select", "status", "multi_select", "checkbox"]);

interface ViewControlsProps {
  fields: DatagridField[];
  config: DatagridViewConfig;
  onChange: (update: (prev: DatagridViewConfig) => DatagridViewConfig) => void;
}

const activeDot = "ml-auto size-1.5 rounded-full bg-accent";

const rowButtonClass =
  "flex size-6 items-center justify-center rounded text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30";

/**
 * Filter / Sort / Group as nested submenu items for the datagrid overflow menu.
 * Each edit produces a new {@link DatagridViewConfig} the parent persists onto
 * the saved view. Sort supports multiple ordered clauses. Field show/hide lives
 * in the Fields dialog (layout-aware). Active axes surface an accent dot on
 * their submenu trigger.
 */
export function DatagridViewControls({
  fields,
  config,
  onChange,
}: ViewControlsProps) {
  const named = [
    { id: TITLE_FIELD_ID, name: "Title", type: "text" as const },
    ...fields,
  ];
  const groupable = fields.filter((f) => GROUPABLE.has(f.type));

  const sortedIds = new Set(config.sorts.map((s) => s.fieldId));
  const unsortedNamed = named.filter((f) => !sortedIds.has(f.id));

  const addSort = (fieldId: string) => {
    onChange((prev) => ({
      ...prev,
      sorts: [...prev.sorts, { fieldId, direction: "asc" }],
    }));
  };

  const flipSort = (index: number) => {
    onChange((prev) => ({
      ...prev,
      sorts: prev.sorts.map((s, i) =>
        i === index
          ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" }
          : s,
      ),
    }));
  };

  const removeSort = (index: number) => {
    onChange((prev) => ({
      ...prev,
      sorts: prev.sorts.filter((_, i) => i !== index),
    }));
  };

  const moveSort = (index: number, delta: number) => {
    onChange((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.sorts.length) return prev;
      const next = [...prev.sorts];
      const moved = next.splice(index, 1)[0];
      if (moved === undefined) return prev;
      next.splice(target, 0, moved);
      return { ...prev, sorts: next };
    });
  };

  const clearSort = () => {
    onChange((prev) => ({ ...prev, sorts: [] }));
  };

  const setGroup = (groupBy: string | null) => {
    onChange((prev) => ({ ...prev, groupBy }));
  };

  const addFilter = (fieldId: string) => {
    onChange((prev) => ({
      ...prev,
      filters: [...prev.filters, { fieldId, op: "is_not_empty" }],
    }));
  };

  const removeFilter = (index: number) => {
    onChange((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  };

  const fieldName = (fieldId: string) =>
    fieldId === TITLE_FIELD_ID
      ? "Title"
      : (fields.find((f) => f.id === fieldId)?.name ?? fieldId);

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Filter className="size-4" aria-hidden="true" />
          Filter
          {config.filters.length > 0 && <span className={activeDot} />}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {config.filters.length > 0 && (
            <>
              <DropdownMenuLabel>Active filters</DropdownMenuLabel>
              {config.filters.map((filter, i) => (
                <DropdownMenuItem
                  key={`${filter.fieldId}:${filter.op}:${JSON.stringify(
                    filter.value ?? null,
                  )}`}
                  onSelect={() => {
                    removeFilter(i);
                  }}
                >
                  {fieldName(filter.fieldId)} is not empty
                  <span className="ml-auto text-xs text-muted">Remove</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Add filter…</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {named.map((field) => (
                <DropdownMenuItem
                  key={field.id}
                  onSelect={() => {
                    addFilter(field.id);
                  }}
                >
                  {field.name} is not empty
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <ArrowDownAZ className="size-4" aria-hidden="true" />
          Sort
          {config.sorts.length > 0 && <span className={activeDot} />}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-64">
          {config.sorts.length > 0 && (
            <>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {config.sorts.map((sort, i) => (
                <div
                  key={sort.fieldId}
                  className="flex items-center gap-1 px-1.5 py-1"
                >
                  <span className="min-w-0 flex-1 truncate px-1 text-sm text-text">
                    {fieldName(sort.fieldId)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      flipSort(i);
                    }}
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {sort.direction === "asc" ? "Asc" : "Desc"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${fieldName(sort.fieldId)} sort up`}
                    disabled={i === 0}
                    onClick={() => {
                      moveSort(i, -1);
                    }}
                    className={rowButtonClass}
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${fieldName(sort.fieldId)} sort down`}
                    disabled={i === config.sorts.length - 1}
                    onClick={() => {
                      moveSort(i, 1);
                    }}
                    className={rowButtonClass}
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${fieldName(sort.fieldId)} sort`}
                    onClick={() => {
                      removeSort(i);
                    }}
                    className={rowButtonClass}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          {unsortedNamed.length > 0 && (
            <>
              <DropdownMenuLabel>Add sort</DropdownMenuLabel>
              {unsortedNamed.map((field) => (
                <DropdownMenuItem
                  key={field.id}
                  onSelect={() => {
                    addSort(field.id);
                  }}
                >
                  {field.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
          {config.sorts.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={clearSort}>
                Clear sort
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Group className="size-4" aria-hidden="true" />
          Group
          {config.groupBy && <span className={activeDot} />}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            onSelect={() => {
              setGroup(null);
            }}
            className={cn(!config.groupBy && "text-accent")}
          >
            None
          </DropdownMenuItem>
          {groupable.length > 0 && <DropdownMenuSeparator />}
          {groupable.map((field) => (
            <DropdownMenuItem
              key={field.id}
              onSelect={() => {
                setGroup(field.id);
              }}
              className={cn(config.groupBy === field.id && "text-accent")}
            >
              {field.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
