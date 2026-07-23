import { ImagePlus, Maximize2, MoveVertical, X } from "lucide-react";
import {
  type ChangeEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { COVER_IMAGE_ACCEPT } from "@/data/cover-upload";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { ImageLightbox } from "./image-lightbox";
import { Tooltip } from "./tooltip";

/** Shared hover-pill styles matching Masthead's "Add icon" affordance. */
const ADD_AFFORDANCE_CLASS =
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted opacity-0 outline-none transition-opacity hover:bg-hover hover:text-text focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/masthead:opacity-100 disabled:opacity-60";

const COVER_CONTROL_CLASS =
  "inline-flex items-center justify-center rounded-md bg-elevated text-muted shadow-popover outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

function clampCoverPosition(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export interface PageCoverProps {
  coverUrl: string | null;
  coverPosition?: number;
  onUpload: (file: File) => Promise<string>;
  onRemove: () => void;
  /** Persist the cover's vertical position; call sites should provide this. */
  onPositionChange?: (y: number) => void;
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
  onReposition,
  onView,
}: {
  isUploading: boolean;
  onChoose: () => void;
  onRemove: () => void;
  onReposition: () => void;
  onView: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip content="Reposition cover">
        <button
          type="button"
          aria-label="Reposition cover"
          onClick={(event) => {
            event.stopPropagation();
            onReposition();
          }}
          className={cn(COVER_CONTROL_CLASS, "size-8 hover:text-text")}
        >
          <MoveVertical className="size-4" aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip content="View cover">
        <button
          type="button"
          aria-label="View cover"
          onClick={(event) => {
            event.stopPropagation();
            onView();
          }}
          className={cn(COVER_CONTROL_CLASS, "size-8 hover:text-text")}
        >
          <Maximize2 className="size-4" aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip content="Change cover">
        <button
          type="button"
          aria-label="Change cover"
          onClick={(event) => {
            event.stopPropagation();
            onChoose();
          }}
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
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
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
  coverPosition = 50,
  onUpload,
  onRemove,
  onPositionChange,
  className,
}: PageCoverProps) {
  const { isUploading, openPicker, fileInput } = useCoverFilePicker(onUpload);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [draftPosition, setDraftPosition] = useState(coverPosition);
  const [isDragging, setIsDragging] = useState(false);
  const draftPositionRef = useRef(draftPosition);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startPosition: number;
  } | null>(null);

  useEffect(() => {
    draftPositionRef.current = draftPosition;
  }, [draftPosition]);

  useEffect(() => {
    if (!isRepositioning) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dragRef.current = null;
        setIsDragging(false);
        setIsRepositioning(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isRepositioning]);

  if (!coverUrl) return null;

  const position = isRepositioning ? draftPosition : coverPosition;
  const enterRepositioning = () => {
    setIsLightboxOpen(false);
    draftPositionRef.current = coverPosition;
    setDraftPosition(coverPosition);
    setIsRepositioning(true);
  };
  const openLightbox = () => {
    if (!isRepositioning) setIsLightboxOpen(true);
  };
  const startDragging = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isRepositioning) return;
    // Keep focus/click from fighting the drag session.
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // jsdom and some environments lack pointer capture.
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPosition: draftPositionRef.current,
    };
    setIsDragging(true);
  };
  const moveDragging = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    const { height } = event.currentTarget.getBoundingClientRect();
    if (height === 0) return;
    // Pan the crop with the pointer: drag down → show more of the top.
    const deltaRatio = (event.clientY - drag.startY) / height;
    setDraftPosition(clampCoverPosition(drag.startPosition - deltaRatio * 100));
  };
  const endDragging = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore unsupported pointer capture APIs
    }
  };
  const clearDragging = () => {
    dragRef.current = null;
    setIsDragging(false);
  };
  const savePosition = () => {
    onPositionChange?.(clampCoverPosition(draftPosition));
    clearDragging();
    setIsRepositioning(false);
  };
  const cancelRepositioning = () => {
    clearDragging();
    setIsRepositioning(false);
  };

  return (
    <section
      aria-label="Page cover"
      className={cn(
        "group relative isolate min-h-48 overflow-hidden bg-surface",
        className,
      )}
    >
      <button
        type="button"
        aria-label={
          isRepositioning ? "Adjust cover position" : "Open cover image"
        }
        onClick={openLightbox}
        onKeyDown={(event) => {
          if (isRepositioning) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLightbox();
          }
        }}
        onPointerDown={startDragging}
        onPointerMove={moveDragging}
        onPointerUp={endDragging}
        onPointerCancel={endDragging}
        onLostPointerCapture={clearDragging}
        className={cn(
          "absolute inset-0 size-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isRepositioning
            ? isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-zoom-in",
        )}
      >
        <img
          src={coverUrl}
          alt="Page cover"
          style={{ objectPosition: `50% ${position}%` }}
          className="size-full object-cover"
        />
      </button>
      {isRepositioning ? (
        <>
          <p className="sr-only" aria-live="polite">
            Drag to adjust cover position
          </p>
          <div className="absolute right-4 top-4 flex gap-2">
            <Button aria-label="Save position" onClick={savePosition}>
              Save
            </Button>
            <Button
              aria-label="Cancel repositioning"
              variant="ghost"
              onClick={cancelRepositioning}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div
          data-testid="page-cover-controls"
          className={cn(
            "absolute right-4 top-4 z-10 opacity-0 motion-safe:transition-opacity",
            "pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto",
            "group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <CoverControl
            isUploading={isUploading}
            onChoose={openPicker}
            onRemove={onRemove}
            onReposition={enterRepositioning}
            onView={openLightbox}
          />
        </div>
      )}
      {fileInput}
      <ImageLightbox
        open={isLightboxOpen}
        onOpenChange={setIsLightboxOpen}
        src={coverUrl}
        alt="Page cover"
      />
    </section>
  );
}
