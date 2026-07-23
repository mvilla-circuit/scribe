import { X } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

import {
  COVER_FLOATING_CONTROL_CLASS,
  COVER_FLOATING_ICON_CLASS,
} from "./cover-floating-control";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { IconButton } from "./icon-button";

export interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
}

interface ImageLightboxBodyProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * Cover image + close control for use inside an existing Dialog (one dialog at
 * a time) or as the body of {@link ImageLightbox}.
 */
export function ImageLightboxBody({
  src,
  alt = "Cover image",
  onClose,
}: ImageLightboxBodyProps) {
  return (
    <div className="relative">
      <DialogTitle className="sr-only">Cover image</DialogTitle>
      <img
        src={src}
        alt={alt}
        className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] rounded-lg object-contain"
      />
      <IconButton
        label="Close image"
        size="sm"
        onClick={onClose}
        className={cn(
          COVER_FLOATING_CONTROL_CLASS,
          COVER_FLOATING_ICON_CLASS,
          "absolute right-2 top-2 hover:bg-inverted hover:text-inverted-text",
        )}
      >
        <X className="size-3.5" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

/** DialogContent classes that hug the image so the overlay stays clickable. */
export const IMAGE_LIGHTBOX_CONTENT_CLASS =
  "w-auto max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none outline-none";

/**
 * An image-first dialog for viewing a cover at its natural scale.
 * Content hugs the image so the dimmed overlay stays clickable to dismiss.
 */
export function ImageLightbox({
  open,
  onOpenChange,
  src,
  alt = "Cover image",
}: ImageLightboxProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        className={IMAGE_LIGHTBOX_CONTENT_CLASS}
      >
        <ImageLightboxBody
          src={src}
          alt={alt}
          onClose={() => {
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
