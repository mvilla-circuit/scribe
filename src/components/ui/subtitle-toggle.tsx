import { Subtitles } from "lucide-react";

import { makeIcon } from "@/lib/make-icon";
import { cn } from "@/lib/utils";

import { Tooltip } from "./tooltip";

const SubtitleGlyph = makeIcon(Subtitles);

type SubtitleToggleVariant = "toolbar" | "block";

// The single, shared "show/hide subtitle" control used everywhere a subtitle can
// be toggled (the book title page, the document header, the essay block). It owns
// the tooltip wording, the subtitle glyph, and the pressed state so every
// subtitle in the app toggles the same way; only the surrounding chrome differs
// by `variant` — the page-header "toolbar" pill vs. the editor's bordered
// "block" control button.
export function SubtitleToggle({
  active,
  onToggle,
  variant = "toolbar",
}: {
  active: boolean;
  onToggle: () => void;
  variant?: SubtitleToggleVariant;
}) {
  return (
    <Tooltip content={active ? "Hide subtitle" : "Show subtitle"}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        aria-label={active ? "Hide subtitle" : "Show subtitle"}
        className={
          variant === "block"
            ? "scribe-block-btn"
            : cn(
                "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-selected text-text"
                  : "text-muted hover:bg-hover hover:text-text",
              )
        }
      >
        <SubtitleGlyph size={variant === "block" ? 15 : 16} />
      </button>
    </Tooltip>
  );
}
