import { BannerControl } from "@/components/ui/banner-control";
import { SubtitleToggle } from "@/components/ui/subtitle-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import type { DocumentMeta } from "@/data/documents";
import { SaveStatus } from "@/editor/save-status";
import type { SaveState } from "@/editor/use-autosave";
import type { FontMap, ResolvedFonts } from "@/fonts/catalog";
import type { FontOverrideHandlers } from "@/fonts/use-font-overrides";
import { cn } from "@/lib/utils";

import { FontControl } from "./font-control";
import { ListIcon, ListTreeIcon, SpellCheckIcon } from "./icons";

// The right-hand cluster of the document view's sticky top bar: save status,
// then the controls in order — banner, subtitle, contents/outline, page fonts,
// and spellcheck. Presentational — the parent owns the document mutations and
// font handlers and passes them in.
export function PageSettingsToolbar({
  document,
  saveState,
  fontOverrides,
  inheritedFonts,
  fontHandlers,
  hasChildren,
  onToggleContents,
  onToggleOutline,
  onToggleSubtitle,
  onToggleSpellcheck,
  onBannerChange,
}: {
  document: DocumentMeta;
  saveState: SaveState;
  fontOverrides: FontMap;
  inheritedFonts: ResolvedFonts;
  fontHandlers: FontOverrideHandlers;
  /** Whether this page has child pages — gates the table-of-contents toggle. */
  hasChildren: boolean;
  onToggleContents: () => void;
  onToggleOutline: () => void;
  onToggleSubtitle: () => void;
  onToggleSpellcheck: () => void;
  onBannerChange: (color: string | null) => void;
}) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1 pl-3">
      <span className="mr-2">
        <SaveStatus state={saveState} />
      </span>
      <BannerControl value={document.banner_color} onChange={onBannerChange} />
      <SubtitleToggle
        active={document.show_subtitle}
        onToggle={onToggleSubtitle}
      />
      {hasChildren && (
        <Tooltip
          content={document.show_contents ? "Hide contents" : "Show contents"}
        >
          <button
            type="button"
            onClick={onToggleContents}
            aria-pressed={document.show_contents}
            aria-label={
              document.show_contents ? "Hide contents" : "Show contents"
            }
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              document.show_contents
                ? "bg-selected text-text"
                : "text-muted hover:bg-hover hover:text-text",
            )}
          >
            <ListTreeIcon size={16} />
          </button>
        </Tooltip>
      )}
      <Tooltip
        content={document.show_outline ? "Hide outline" : "Show outline"}
      >
        <button
          type="button"
          onClick={onToggleOutline}
          aria-pressed={document.show_outline}
          aria-label={document.show_outline ? "Hide outline" : "Show outline"}
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
      <FontControl
        heading="Page fonts"
        inheritLabel="book"
        overrides={fontOverrides}
        inherited={inheritedFonts}
        onSet={fontHandlers.setFont}
        onClear={fontHandlers.clearFont}
        onClearAll={fontHandlers.clearAll}
      />
      <Tooltip
        content={
          document.spellcheck_enabled
            ? "Disable spellcheck"
            : "Enable spellcheck"
        }
      >
        <button
          type="button"
          onClick={onToggleSpellcheck}
          aria-pressed={document.spellcheck_enabled}
          aria-label={
            document.spellcheck_enabled
              ? "Disable spellcheck"
              : "Enable spellcheck"
          }
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            document.spellcheck_enabled
              ? "bg-selected text-text"
              : "text-muted hover:bg-hover hover:text-text",
          )}
        >
          <SpellCheckIcon size={16} />
        </button>
      </Tooltip>
    </span>
  );
}
