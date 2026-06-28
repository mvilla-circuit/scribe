import { BannerControl } from "@/components/ui/banner-control";
import { SubtitleToggle } from "@/components/ui/subtitle-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import type { Document } from "@/data/documents";
import { SaveStatus } from "@/editor/save-status";
import type { SaveState } from "@/editor/use-autosave";
import type { FontMap, ResolvedFonts } from "@/fonts/catalog";
import type { FontOverrideHandlers } from "@/fonts/use-font-overrides";
import { cn } from "@/lib/utils";

import { FontControl } from "./font-control";
import { ListIcon } from "./icons";

// The right-hand cluster of the document view's sticky top bar: save status, the
// outline / subtitle / banner toggles, and the page font control. Presentational
// — the parent owns the document mutations and font handlers and passes them in.
export function PageSettingsToolbar({
  document,
  saveState,
  fontOverrides,
  inheritedFonts,
  fontHandlers,
  onToggleOutline,
  onToggleSubtitle,
  onBannerChange,
}: {
  document: Document;
  saveState: SaveState;
  fontOverrides: FontMap;
  inheritedFonts: ResolvedFonts;
  fontHandlers: FontOverrideHandlers;
  onToggleOutline: () => void;
  onToggleSubtitle: () => void;
  onBannerChange: (color: string | null) => void;
}) {
  return (
    <span className="ml-auto flex items-center gap-1 pl-3">
      <span className="mr-2">
        <SaveStatus state={saveState} />
      </span>
      <Tooltip
        content={document.show_outline ? "Hide outline" : "Show outline"}
      >
        <button
          type="button"
          onClick={onToggleOutline}
          aria-pressed={document.show_outline}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            document.show_outline
              ? "bg-selected text-text"
              : "text-muted hover:bg-hover hover:text-text",
          )}
        >
          <ListIcon size={16} />
        </button>
      </Tooltip>
      <SubtitleToggle
        active={document.show_subtitle}
        onToggle={onToggleSubtitle}
      />
      <BannerControl value={document.banner_color} onChange={onBannerChange} />
      <FontControl
        heading="Page fonts"
        inheritLabel="book"
        overrides={fontOverrides}
        inherited={inheritedFonts}
        onSet={fontHandlers.setFont}
        onClear={fontHandlers.clearFont}
        onClearAll={fontHandlers.clearAll}
      />
    </span>
  );
}
