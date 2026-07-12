import { ImagePlus, X } from "lucide-react";
import { type ChangeEvent, type ReactNode, useRef, useState } from "react";

import { COVER_IMAGE_ACCEPT } from "@/data/cover-upload";
import { cn } from "@/lib/utils";

import { Tooltip } from "./tooltip";

/** Shared hover-pill styles matching Masthead's "Add icon" affordance. */
const ADD_AFFORDANCE_CLASS =
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted opacity-0 outline-none transition-opacity hover:bg-hover hover:text-text focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/masthead:opacity-100 disabled:opacity-60";

const COVER_CONTROL_CLASS =
  "inline-flex items-center justify-center rounded-md bg-elevated text-muted shadow-popover outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export interface PageCoverProps {
  coverUrl: string | null;
  onUpload: (file: File) => Promise<string>;
  onRemove: () => void;
  className?: string;
}

function useCoverFilePicker(onUpload: (file: File) => Promise<string>): {
  isUploading: boolean;
  openPicker: () => void;
  fileInput: ReactNode;
} {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch {
      // Upload/update mutations toast their own errors; swallow so the file
      // input onChange does not surface an unhandled rejection.
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    openPicker: () => {
      inputRef.current?.click();
    },
    fileInput: (
      <input
        ref={inputRef}
        type="file"
        accept={COVER_IMAGE_ACCEPT}
        aria-label="Choose cover image"
        onChange={onFileChange}
        className="sr-only"
      />
    ),
  };
}

function CoverControl({
  isUploading,
  onChoose,
  onRemove,
}: {
  isUploading: boolean;
  onChoose: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip content="Change cover">
        <button
          type="button"
          aria-label="Change cover"
          onClick={onChoose}
          disabled={isUploading}
          className={cn(
            COVER_CONTROL_CLASS,
            "gap-1.5 px-2.5 py-1.5 text-sm font-medium hover:text-text",
          )}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {isUploading ? "Uploading…" : "Change cover"}
        </button>
      </Tooltip>
      <Tooltip content="Remove cover">
        <button
          type="button"
          aria-label="Remove cover"
          onClick={onRemove}
          disabled={isUploading}
          className={cn(COVER_CONTROL_CLASS, "size-8 hover:text-danger")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}

/**
 * Masthead hover control that opens a file picker and uploads a page cover.
 * Styled to sit beside "Add icon" above the title.
 */
export function AddCoverButton({
  onUpload,
}: {
  onUpload: (file: File) => Promise<string>;
}) {
  const { isUploading, openPicker, fileInput } = useCoverFilePicker(onUpload);

  return (
    <>
      <button
        type="button"
        aria-label="Add cover"
        disabled={isUploading}
        onClick={openPicker}
        className={ADD_AFFORDANCE_CLASS}
      >
        <ImagePlus className="size-4" aria-hidden="true" />
        {isUploading ? "Uploading…" : "Add cover"}
      </button>
      {fileInput}
    </>
  );
}

/**
 * Full-bleed cover band shown above the masthead when a cover image is set.
 * Change/remove controls appear on hover of the band. When there is no cover,
 * render nothing — use {@link AddCoverButton} in the masthead instead.
 */
export function PageCover({
  coverUrl,
  onUpload,
  onRemove,
  className,
}: PageCoverProps) {
  const { isUploading, openPicker, fileInput } = useCoverFilePicker(onUpload);

  if (!coverUrl) return null;

  return (
    <section
      aria-label="Page cover"
      className={cn(
        "group relative isolate min-h-48 overflow-hidden bg-surface",
        className,
      )}
    >
      <img
        src={coverUrl}
        alt="Page cover"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        data-testid="page-cover-controls"
        className={cn(
          "absolute right-4 top-4 opacity-0 motion-safe:transition-opacity",
          "pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto",
          "group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        <CoverControl
          isUploading={isUploading}
          onChoose={openPicker}
          onRemove={onRemove}
        />
      </div>
      {fileInput}
    </section>
  );
}
