import { DatagridIcon } from "@/components/sidebar/icons";
import { DocumentIcon } from "@/components/ui/document-icon";
import type { DatagridField } from "@/lib/datagrid-schema";

import { RowPropertyChips } from "./datagrid-cell";
import type { RelationTargets } from "./datagrid-relations";
import type { DatagridDisplayRow } from "./datagrid-view-model";

interface GalleryViewProps {
  rows: DatagridDisplayRow[];
  /** Visible non-title fields, in view order, used for the card's chips. */
  fields: DatagridField[];
  onOpenRow: (id: string) => void;
  onCreateRow: () => void;
  /** Resolves relation chips to their target's title (else a truncated id). */
  relationTargets?: RelationTargets;
}

/**
 * The gallery layout: landscape CoverCards (wider than a book cover) with an
 * optional cover image, the row title, and up to a few property chips. A dashed
 * ghost card at the end adds a record.
 */
export function DatagridGalleryView({
  rows,
  fields,
  onOpenRow,
  onCreateRow,
  relationTargets,
}: GalleryViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => {
            onOpenRow(row.id);
          }}
          className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface text-left outline-none transition-shadow hover:shadow-popover focus-visible:ring-2 focus-visible:ring-ring"
        >
          {row.cover_url ? (
            <img
              src={row.cover_url}
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-hover text-muted">
              {row.icon ? (
                <DocumentIcon icon={row.icon} size={28} />
              ) : (
                <DatagridIcon size={26} />
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 px-3 py-2.5">
            <span className="truncate text-sm font-medium text-text">
              {row.title || "Untitled"}
            </span>
            <RowPropertyChips
              fields={fields}
              row={row}
              relationTargets={relationTargets}
            />
          </div>
        </button>
      ))}

      <button
        type="button"
        onClick={onCreateRow}
        className="flex aspect-[4/3] min-h-32 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm text-muted outline-none transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-lg leading-none" aria-hidden="true">
          +
        </span>
        New row
      </button>
    </div>
  );
}
