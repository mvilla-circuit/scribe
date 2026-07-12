import { DatagridIcon } from "@/components/sidebar/icons";
import { CoverCard } from "@/components/ui/cover-card";
import { DashedAddTile } from "@/components/ui/dashed-add-tile";
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
        <CoverCard
          key={row.id}
          title={row.title}
          icon={row.icon}
          coverUrl={row.cover_url}
          fallback={<DatagridIcon size={26} />}
          onOpen={() => {
            onOpenRow(row.id);
          }}
          aspect="album"
          footerExtra={
            <div className="mt-1.5">
              <RowPropertyChips
                fields={fields}
                row={row}
                relationTargets={relationTargets}
              />
            </div>
          }
        />
      ))}

      <DashedAddTile
        onClick={onCreateRow}
        className="aspect-[4/3] min-h-32 flex-col gap-1.5"
      >
        <span className="text-lg leading-none" aria-hidden="true">
          +
        </span>
        New row
      </DashedAddTile>
    </div>
  );
}
