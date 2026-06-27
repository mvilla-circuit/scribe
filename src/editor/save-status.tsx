import { cn } from "@/lib/utils";

import type { SaveState } from "./use-autosave";

// A whisper-quiet save indicator: a colored status dot plus a short label.
// Green when saved, red when a save fails, neutral while saving. It fades out
// as the state drifts back to idle (the hook owns that). Purely derived.
export function SaveStatus({ state }: { state: SaveState }) {
  const visible = state !== "idle";
  const label =
    state === "saving"
      ? "Saving…"
      : state === "error"
        ? "Save failed"
        : "Saved";

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs transition-opacity duration-500",
        state === "error" ? "text-red-600 dark:text-red-400" : "text-muted",
      )}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full transition-colors",
          state === "saved" && "bg-emerald-500",
          state === "error" && "bg-red-500",
          state !== "saved" && state !== "error" && "bg-muted/60",
        )}
      />
      {label}
    </span>
  );
}
