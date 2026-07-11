import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { DatagridField } from "@/lib/datagrid-schema";
import { cn } from "@/lib/utils";

import { RowPropertyChips } from "./datagrid-cell";
import { swatchDotStyle } from "./datagrid-colors";
import type { RelationTargets } from "./datagrid-relations";
import type { DatagridDisplayRow } from "./datagrid-view-model";

interface BoardColumn {
  key: string;
  label: string;
  color: string | null;
  rows: DatagridDisplayRow[];
}

interface BoardViewProps {
  rows: DatagridDisplayRow[];
  /** The select/status field the board groups by, or null when none is set. */
  boardField: DatagridField | null;
  /** Visible non-title fields for card chips. */
  chipFields: DatagridField[];
  onOpenRow: (id: string) => void;
  onCreateRow: () => void;
  /** Move a card into a column: sets its group property to `key` (null clears). */
  onMoveCard: (rowId: string, key: string | null) => void;
  /** Open the field manager so the user can add a group field (empty state). */
  onConfigureFields: () => void;
  /** Resolves relation chips to their target's title (else a truncated id). */
  relationTargets?: RelationTargets;
}

function buildColumns(
  rows: DatagridDisplayRow[],
  field: DatagridField,
): BoardColumn[] {
  const options = field.config.options ?? [];
  const columns: BoardColumn[] = options.map((o) => ({
    key: o.id,
    label: o.name,
    color: o.color,
    rows: [],
  }));
  const empty: BoardColumn = {
    key: "",
    label: `No ${field.name}`,
    color: null,
    rows: [],
  };
  const byKey = new Map(columns.map((c) => [c.key, c]));
  for (const row of rows) {
    const value = row.properties[field.id];
    const column = typeof value === "string" ? byKey.get(value) : undefined;
    (column ?? empty).rows.push(row);
  }
  return [...columns, empty];
}

/**
 * The board layout: rows grouped into soft columns by a select/status field.
 * Cards drag between columns to reassign that property. With no group field
 * configured the board shows a calm CTA to add one (AC19).
 */
export function DatagridBoardView({
  rows,
  boardField,
  chipFields,
  onOpenRow,
  onCreateRow,
  onMoveCard,
  onConfigureFields,
  relationTargets,
}: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (!boardField) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-14 text-center">
        <p className="text-sm font-medium text-text">No group field yet</p>
        <p className="mt-1 max-w-[24rem] text-xs leading-relaxed text-muted">
          Board view groups rows into columns by a select or status field. Add
          one to organize this datagrid as a board.
        </p>
        <Button variant="primary" className="mt-4" onClick={onConfigureFields}>
          Add a group field
        </Button>
      </div>
    );
  }

  const columns = buildColumns(rows, boardField);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((column) => (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the column is a pointer drag-drop target; keyboard reordering ships in a later track
        <section
          key={column.key || "__none__"}
          aria-label={column.label}
          onDragOver={(e) => {
            if (draggingId) e.preventDefault();
          }}
          onDrop={() => {
            if (draggingId) {
              onMoveCard(draggingId, column.key === "" ? null : column.key);
              setDraggingId(null);
            }
          }}
          className="flex w-64 shrink-0 flex-col rounded-lg bg-tree-group p-2"
        >
          <header className="flex items-center gap-1.5 px-1 py-1.5">
            {column.color && (
              <span
                style={swatchDotStyle(column.color)}
                className="size-2.5 rounded-full"
              />
            )}
            <span className="text-xs font-medium text-text">
              {column.label}
            </span>
            <span className="text-xs text-muted">{column.rows.length}</span>
          </header>
          <div className="flex flex-col gap-2">
            {column.rows.map((row) => (
              <button
                key={row.id}
                type="button"
                draggable
                onDragStart={() => {
                  setDraggingId(row.id);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                }}
                onClick={() => {
                  onOpenRow(row.id);
                }}
                className={cn(
                  "flex flex-col gap-2 rounded-md border border-border bg-surface p-2.5 text-left outline-none transition-shadow hover:shadow-popover focus-visible:ring-2 focus-visible:ring-ring",
                  draggingId === row.id && "opacity-50",
                )}
              >
                <span className="truncate text-sm font-medium text-text">
                  {row.title || "Untitled"}
                </span>
                <RowPropertyChips
                  fields={chipFields}
                  row={row}
                  relationTargets={relationTargets}
                />
              </button>
            ))}
          </div>
        </section>
      ))}
      <div className="w-64 shrink-0">
        <button
          type="button"
          onClick={onCreateRow}
          className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-base leading-none" aria-hidden="true">
            +
          </span>
          New row
        </button>
      </div>
    </div>
  );
}
