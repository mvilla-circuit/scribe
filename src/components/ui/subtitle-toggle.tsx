import { Subtitles } from "lucide-react";

import { makeIcon } from "@/lib/make-icon";

import { IconButton } from "./icon-button";
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
  const label = active ? "Hide subtitle" : "Show subtitle";

  if (variant === "block") {
    // Editor block chrome must stay on `scribe-block-btn` (selection-preserving
    // bordered control), not the shared IconButton stack.
    return (
      <Tooltip content={label}>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={active}
          aria-label={label}
          className="scribe-block-btn"
        >
          <SubtitleGlyph size={15} />
        </button>
      </Tooltip>
    );
  }

  return (
    <IconButton
      label={label}
      size="sm"
      selected={active}
      aria-pressed={active}
      onClick={onToggle}
    >
      <SubtitleGlyph size={16} />
    </IconButton>
  );
}
