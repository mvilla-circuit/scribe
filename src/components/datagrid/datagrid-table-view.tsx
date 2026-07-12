import { Maximize2, Plus } from "lucide-react";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { useDragResize } from "@/components/ui/use-drag-resize";
import type { DatagridQueryRow } from "@/lib/datagrid-query";
import { TITLE_FIELD_ID } from "@/lib/datagrid-query";
import type {
  DatagridField,
  DatagridPropertyValue,
} from "@/lib/datagrid-schema";
import { cn } from "@/lib/utils";

import { DatagridFieldEditor } from "./datagrid-field-editor";
import type { RelationTargets } from "./datagrid-relations";

// Starting widths used when a column has never been resized, so a drag has a
// stable baseline (and jsdom, which reports 0 for layout, stays deterministic).
const DEFAULT_TITLE_WIDTH = 224;
const DEFAULT_FIELD_WIDTH = 176;
const MIN_COLUMN_WIDTH = 96;
// One keyboard nudge of a column edge.
const RESIZE_STEP = 16;

interface TableViewProps {
  rows: DatagridQueryRow[];
  /** Visible fields, already ordered and filtered by the view's visibleFieldIds. */
  fields: DatagridField[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenRow: (id: string) => void;
  onCreateRow: () => void;
  onCommitTitle: (id: string, title: string) => void;
  onCommitCell: (
    id: string,
    fieldId: string,
    value: DatagridPropertyValue,
  ) => void;
  /** Persisted per-column widths, keyed by field id (title uses TITLE_FIELD_ID). */
  columnWidths?: Record<string, number>;
  /** Commits a new width for a column edge (title or field). */
  onResizeColumn?: (columnId: string, width: number) => void;
  /** Relation targets, so relation cells can be edited inline (else read-only). */
  relationTargets?: RelationTargets;
}

/**
 * The table layout: a framed card of white cells with a warm header strip and
 * hairline borders. The title is the pinned first column — frozen while the grid
 * scrolls horizontally, with a soft edge fade — and each visible field gets an
 * inline-editable, resizable cell. A hover-revealed selection checkbox leads each
 * row (selected rows wash in `bg-selected`), and a ghost row at the foot adds a
 * record.
 */
export function DatagridTableView({
  rows,
  fields,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenRow,
  onCreateRow,
  onCommitTitle,
  onCommitCell,
  columnWidths,
  onResizeColumn,
  relationTargets,
}: TableViewProps) {
  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  // Live width overrides during a drag; committed to the view on mouse-up so the
  // grid never writes to the store on every mousemove.
  const [draftWidths, setDraftWidths] = useState<Record<string, number>>({});
  // Which column is being resized, and the width/clientX it started from — set
  // synchronously before arming `useDragResize` so its clientX-only callbacks
  // can be translated back into a width for that column.
  const dragStart = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const defaultWidth = (columnId: string) =>
    columnId === TITLE_FIELD_ID ? DEFAULT_TITLE_WIDTH : DEFAULT_FIELD_WIDTH;

  const widthOf = (columnId: string): number | undefined =>
    draftWidths[columnId] ?? columnWidths?.[columnId];

  const commitWidth = (columnId: string, width: number) => {
    const next = Math.max(MIN_COLUMN_WIDTH, Math.round(width));
    setDraftWidths((prev) => {
      const { [columnId]: _drop, ...rest } = prev;
      return rest;
    });
    onResizeColumn?.(columnId, next);
  };

  const widthAtClientX = (clientX: number) => {
    const drag = dragStart.current;
    if (!drag) return null;
    return Math.max(
      MIN_COLUMN_WIDTH,
      drag.startWidth + (clientX - drag.startX),
    );
  };

  const { onMouseDown: armDrag } = useDragResize({
    onResize: (clientX) => {
      const drag = dragStart.current;
      const width = widthAtClientX(clientX);
      if (!drag || width === null) return;
      setDraftWidths((prev) => ({ ...prev, [drag.columnId]: width }));
    },
    onCommit: (clientX) => {
      const drag = dragStart.current;
      const width = widthAtClientX(clientX);
      dragStart.current = null;
      if (!drag || width === null) return;
      commitWidth(drag.columnId, width);
    },
  });

  const startResize = (columnId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragStart.current = {
      columnId,
      startX: event.clientX,
      startWidth: widthOf(columnId) ?? defaultWidth(columnId),
    };
    armDrag(event);
  };

  const nudgeWidth = (columnId: string, delta: number) => {
    const current = widthOf(columnId) ?? defaultWidth(columnId);
    commitWidth(columnId, current + delta);
  };

  const resizeHandle = (columnId: string, label: string) => (
    <button
      type="button"
      aria-label={`Resize ${label} column`}
      onMouseDown={(e) => {
        startResize(columnId, e);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          nudgeWidth(columnId, RESIZE_STEP);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          nudgeWidth(columnId, -RESIZE_STEP);
        }
      }}
      className="absolute inset-y-0 right-0 z-20 w-1 cursor-col-resize bg-transparent outline-none hover:bg-border focus-visible:bg-accent"
    />
  );

  const colStyle = (columnId: string): React.CSSProperties | undefined => {
    const width = widthOf(columnId);
    return width === undefined ? undefined : { width, minWidth: width };
  };

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={colStyle(TITLE_FIELD_ID)} />
            {fields.map((field) => (
              <col key={field.id} style={colStyle(field.id)} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-[var(--table-header)]">
              <th className="sticky left-0 z-10 w-9 border-b border-border bg-[var(--table-header)] px-2 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="size-3.5 cursor-pointer accent-[var(--accent)]"
                />
              </th>
              <th
                style={colStyle(TITLE_FIELD_ID)}
                className="relative sticky left-9 z-10 min-w-52 border-b border-l border-border bg-[var(--table-header)] px-3 py-2 text-left font-medium text-muted"
              >
                Title
                {resizeHandle(TITLE_FIELD_ID, "Title")}
              </th>
              {fields.map((field) => (
                <th
                  key={field.id}
                  style={colStyle(field.id)}
                  className="relative min-w-40 border-b border-l border-border px-3 py-2 text-left font-medium text-muted"
                >
                  {field.name}
                  {resizeHandle(field.id, field.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedIds.has(row.id);
              const stickyBg = selected
                ? "bg-selected"
                : "bg-[var(--table-cell)]";
              return (
                <tr
                  key={row.id}
                  data-selected={selected || undefined}
                  className={cn(
                    "group",
                    selected ? "bg-selected" : "bg-[var(--table-cell)]",
                  )}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-b border-border px-2 py-1.5 align-middle",
                      stickyBg,
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.title || "Untitled"}`}
                      checked={selected}
                      onChange={() => {
                        onToggleSelect(row.id);
                      }}
                      className={cn(
                        "size-3.5 cursor-pointer accent-[var(--accent)] transition-opacity",
                        selected
                          ? "opacity-100"
                          : "opacity-0 focus:opacity-100 group-hover:opacity-100",
                      )}
                    />
                  </td>
                  <td
                    className={cn(
                      "sticky left-9 z-10 border-b border-l border-border px-1.5 py-1 align-middle",
                      stickyBg,
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <Input
                        key={row.title}
                        aria-label={`Title for ${row.title || "Untitled"}`}
                        defaultValue={row.title}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== row.title) {
                            onCommitTitle(row.id, next);
                          } else {
                            e.target.value = row.title;
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        placeholder="Untitled"
                        className="h-auto flex-1 rounded border-transparent bg-transparent px-1.5 py-1 font-medium"
                      />
                      <Tooltip content="Open">
                        <button
                          type="button"
                          aria-label={`Open ${row.title || "Untitled"}`}
                          onClick={() => {
                            onOpenRow(row.id);
                          }}
                          className="flex size-6 shrink-0 items-center justify-center rounded text-muted opacity-0 outline-none transition-opacity hover:bg-hover hover:text-text focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                        >
                          <Maximize2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                  {fields.map((field) => (
                    <td
                      key={field.id}
                      className="border-b border-l border-border px-2 py-1 align-middle text-text"
                    >
                      <DatagridFieldEditor
                        variant="inline"
                        field={field}
                        value={row.properties[field.id] ?? null}
                        createdAt={row.created_at}
                        updatedAt={row.updated_at}
                        relationTargets={relationTargets}
                        onCommit={(value) => {
                          onCommitCell(row.id, field.id, value);
                        }}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="bg-[var(--table-cell)]">
              <td
                colSpan={fields.length + 2}
                className="sticky left-0 border-b border-border p-0"
              >
                <button
                  type="button"
                  onClick={onCreateRow}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        aria-hidden="true"
        data-testid="datagrid-scroll-fade"
        className="datagrid-scroll-fade pointer-events-none absolute inset-y-px right-px w-6 rounded-r-lg"
        style={{
          background:
            "linear-gradient(to left, var(--table-fade), transparent)",
        }}
      />
    </div>
  );
}
