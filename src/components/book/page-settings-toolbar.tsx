import { BannerControl } from "@/components/ui/banner-control";
import { IconButton } from "@/components/ui/icon-button";
import { SubtitleToggle } from "@/components/ui/subtitle-toggle";
import type { DocumentMeta } from "@/data/documents";
import { SaveStatus } from "@/editor/save-status";
import type { SaveState } from "@/editor/use-autosave";
import type { FontMap, ResolvedFonts } from "@/fonts/catalog";
import type { FontOverrideHandlers } from "@/fonts/use-font-overrides";

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
        <IconButton
          label={document.show_contents ? "Hide contents" : "Show contents"}
          size="sm"
          selected={document.show_contents}
          aria-pressed={document.show_contents}
          onClick={onToggleContents}
        >
          <ListTreeIcon size={16} />
        </IconButton>
      )}
      <IconButton
        label={document.show_outline ? "Hide outline" : "Show outline"}
        size="sm"
        selected={document.show_outline}
        aria-pressed={document.show_outline}
        onClick={onToggleOutline}
      >
        <ListIcon size={16} />
      </IconButton>
      <FontControl
        heading="Page fonts"
        inheritLabel="book"
        overrides={fontOverrides}
        inherited={inheritedFonts}
        onSet={fontHandlers.setFont}
        onClear={fontHandlers.clearFont}
        onClearAll={fontHandlers.clearAll}
      />
      <IconButton
        label={
          document.spellcheck_enabled
            ? "Disable spellcheck"
            : "Enable spellcheck"
        }
        size="sm"
        selected={document.spellcheck_enabled}
        aria-pressed={document.spellcheck_enabled}
        onClick={onToggleSpellcheck}
      >
        <SpellCheckIcon size={16} />
      </IconButton>
    </span>
  );
}
