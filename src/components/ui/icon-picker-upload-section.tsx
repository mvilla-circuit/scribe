import { useRef, useState } from "react";

import { serializeIcon } from "@/data/icon";
import { useUploadIcon } from "@/data/icon-upload";
import { cn } from "@/lib/utils";

// The upload tab: a click-or-drop drop zone that uploads the chosen image and
// stores its public URL as an encoded icon value.
export function UploadSection({
  onSelect,
}: {
  onSelect: (icon: string) => void;
}) {
  const uploadIcon = useUploadIcon();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadIcon.mutateAsync(file).catch(() => null);
    if (url) onSelect(serializeIcon({ type: "image", url }));
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploadIcon.isPending}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 text-sm outline-none transition-colors",
          "hover:border-ring hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring",
          dragging && "border-ring bg-hover",
          uploadIcon.isPending && "opacity-60",
        )}
      >
        <span className="font-medium text-text">
          {uploadIcon.isPending ? "Uploading…" : "Upload an image"}
        </span>
        <span className="text-xs text-muted">Click or drag a file here</span>
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        PNG, JPG, WEBP, GIF or SVG · up to 1 MB
      </p>
    </div>
  );
}
