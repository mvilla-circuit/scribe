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
          // Keep focus in the dialog so Escape dismiss works without focusing the image.
          event.preventDefault();
          contentRef.current?.focus();
        }}
        className={cn(
          // Hug the image — leave the scribe-overlay exposed for backdrop dismiss.
          "w-auto max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none",
          "outline-none",
        )}
      >
        <DialogTitle className="sr-only">Cover image</DialogTitle>
        <div className="relative">
          <img
            src={src}
            alt={alt}
            className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] rounded-lg object-contain"
          />
          <IconButton
            label="Close image"
            size="sm"
            onClick={() => {
              onOpenChange(false);
            }}
            className={cn(
              COVER_FLOATING_CONTROL_CLASS,
              COVER_FLOATING_ICON_CLASS,
              "absolute right-2 top-2 hover:bg-inverted hover:text-inverted-text",
            )}
          >
            <X className="size-3.5" aria-hidden="true" />
          </IconButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
