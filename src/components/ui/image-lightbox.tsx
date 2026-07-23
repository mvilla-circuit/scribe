import { X } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  COVER_FLOATING_CONTROL_CLASS,
  COVER_FLOATING_ICON_CLASS,
} from "./cover-floating-control";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./dialog";
import { Tooltip } from "./tooltip";

export interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
}

/**
 * An image-first dialog for viewing a cover at its natural scale.
 */
export function ImageLightbox({
  open,
  onOpenChange,
  src,
  alt = "Cover image",
}: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={() => {
          onOpenChange(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onOpenChange(false);
        }}
        className={cn(
          "flex h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none items-center",
          "justify-center border-0 bg-transparent p-0 shadow-none",
        )}
      >
        <DialogTitle className="sr-only">Cover image</DialogTitle>
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
        <Tooltip content="Close image">
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close image"
              className={cn(
                COVER_FLOATING_CONTROL_CLASS,
                COVER_FLOATING_ICON_CLASS,
                "absolute right-2 top-2",
              )}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </DialogClose>
        </Tooltip>
      </DialogContent>
    </Dialog>
  );
}
