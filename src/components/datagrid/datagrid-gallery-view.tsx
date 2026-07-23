import { ImagePlus } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";

import { DatagridIcon, TrashIcon } from "@/components/sidebar/icons";
import { CoverCard } from "@/components/ui/cover-card";
import { DashedAddTile } from "@/components/ui/dashed-add-tile";
import { type RowAction } from "@/components/ui/row-action-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { COVER_IMAGE_ACCEPT } from "@/data/cover-upload";
import type { DatagridField } from "@/lib/datagrid-schema";
import { cn } from "@/lib/utils";

import { DatagridCardFields } from "./datagrid-card-fields";
import type { RelationTargets } from "./datagrid-relations";
import type { DatagridDisplayRow } from "./datagrid-view-model";

interface GalleryViewProps {
  rows: DatagridDisplayRow[];
  /** Visible non-title fields, in view order, used for the card value stack. */
  fields: DatagridField[];
  onOpenRow: (id: string) => void;
  onCreateRow: () => void;
  /** Resolves relation chips to their target's title (else a truncated id). */
  relationTargets?: RelationTargets;
  /**
   * Optional cover upload for a gallery card. When provided, each card shows a
   * calm hover/focus media overlay that uploads without opening the row.
   */
  onUploadCover?: (rowId: string, file: File) => Promise<string>;
  /** When set, each card gets a hover/context Delete action that calls this. */
  onDeleteRow?: (rowId: string) => void;
}

/**
 * Calm gallery-card cover control: opens a file picker and uploads without
 * bubbling into the card's open handler. Sibling to the open button via
 * CoverCard's mediaOverlay slot.
 */
function GalleryCoverUpload({
  rowId,
  onUploadCover,
}: {
  rowId: string;
  onUploadCover: (rowId: string, file: File) => Promise<string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      await onUploadCover(rowId, file);
    } catch {
      // Upload/update mutations toast their own errors.
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Tooltip content="Upload cover">
        <button
          type="button"
          aria-label="Upload cover"
          disabled={isUploading}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md bg-elevated text-muted shadow-popover outline-none",
            "hover:text-text focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
          )}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
        </button>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept={COVER_IMAGE_ACCEPT}
        aria-label="Choose cover image"
        onChange={onFileChange}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="sr-only"
      />
    </>
  );
}

/**
 * The gallery layout: landscape CoverCards (wider than a book cover) with an
 * optional cover image, the row title, and a vertical field-value stack. A dashed
 * ghost card at the end adds a record.
 */
export function DatagridGalleryView({
  rows,
  fields,
  onOpenRow,
  onCreateRow,
  relationTargets,
  onUploadCover,
  onDeleteRow,
}: GalleryViewProps) {
  return (
    <div
      role="region"
      aria-label="Gallery"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {rows.map((row) => (
        <GalleryCard
          key={row.id}
          row={row}
          fields={fields}
          relationTargets={relationTargets}
          onOpenRow={onOpenRow}
          onUploadCover={onUploadCover}
          onDeleteRow={onDeleteRow}
        />
      ))}

      <DashedAddTile
        onClick={onCreateRow}
        className="h-full min-h-32 flex-col gap-1.5"
      >
        <span className="text-lg leading-none" aria-hidden="true">
          +
        </span>
        New card
      </DashedAddTile>
    </div>
  );
}

function GalleryCard({
  row,
  fields,
  relationTargets,
  onOpenRow,
  onUploadCover,
  onDeleteRow,
}: {
  row: DatagridDisplayRow;
  fields: DatagridField[];
  relationTargets?: RelationTargets;
  onOpenRow: (id: string) => void;
  onUploadCover?: (rowId: string, file: File) => Promise<string>;
  onDeleteRow?: (rowId: string) => void;
}) {
  const actions = useMemo<RowAction[] | undefined>(() => {
    if (!onDeleteRow) return undefined;
    return [
      {
        icon: <TrashIcon size={15} />,
        label: "Delete",
        danger: true,
        onSelect: () => {
          onDeleteRow(row.id);
        },
      },
    ];
  }, [onDeleteRow, row.id]);

  return (
    <CoverCard
      title={row.title}
      icon={row.icon}
      coverUrl={row.cover_url}
      fallback={<DatagridIcon size={26} />}
      onOpen={() => {
        onOpenRow(row.id);
      }}
      aspect="album"
      actions={actions}
      mediaOverlay={
        onUploadCover ? (
          <GalleryCoverUpload rowId={row.id} onUploadCover={onUploadCover} />
        ) : undefined
      }
      footerExtra={
        <div className="mt-1.5">
          <DatagridCardFields
            fields={fields}
            row={row}
            relationTargets={relationTargets}
          />
        </div>
      }
    />
  );
}
