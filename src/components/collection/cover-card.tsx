import { memo, type ReactNode, useState } from "react";

import { DocumentIcon } from "@/components/ui/document-icon";
import {
  type RowAction,
  RowActionDropdown,
  RowContextMenu,
} from "@/components/ui/row-action-menu";
import { cn } from "@/lib/utils";

import { type GalleryTag, TagChipsRow } from "./tag-chips-row";

/** Portrait book cover vs landscape album cover for gallery media. */
type CoverCardAspect = "book" | "album";

// Grid cards are narrower than list rows, so a card caps at fewer chips
// before collapsing the rest into a "+N".
const MAX_VISIBLE_TAGS = 3;

interface CoverCardProps {
  title: string;
  /** Optional secondary line under the title (book subtitle / collection description). */
  subtitle?: string | null;
  icon: string | null;
  coverUrl: string | null;
  // Rendered in the cover area when there's no cover image and no stored icon —
  // the kind's default glyph (a book or a collection).
  fallback: ReactNode;
  onOpen: () => void;
  // Optional row actions, shown as a hover dropdown and a right-click menu.
  actions?: RowAction[];
  /**
   * Cover media shape. Books and docs use the tall `book` ratio; other library
   * kinds use the wider `album` ratio. Defaults to `book`.
   */
  aspect?: CoverCardAspect;
  /**
   * Tags to show under the title block, capped to `MAX_VISIBLE_TAGS` chips
   * plus a muted overflow count. Omitted entirely for kinds that can't carry
   * tags (only collections do today).
   */
  tags?: GalleryTag[];
}

function CoverCardComponent({
  title,
  subtitle,
  icon,
  coverUrl,
  fallback,
  onOpen,
  actions,
  aspect = "book",
  tags = [],
}: CoverCardProps) {
  const label = title || "Untitled";
  const subtitleText = subtitle?.trim() || null;
  const mediaAspect = aspect === "album" ? "aspect-[4/3]" : "aspect-[3/4]";
  const card = (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface text-left outline-none transition-[border-color,box-shadow] duration-150 ease-out hover:border-text/20 hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            data-testid="cover-card-media"
            className={cn(mediaAspect, "w-full object-cover")}
          />
        ) : (
          <div
            data-testid="cover-card-media"
            className={cn(
              "flex w-full items-center justify-center bg-hover text-muted",
              mediaAspect,
            )}
          >
            {icon ? <DocumentIcon icon={icon} size={28} /> : fallback}
          </div>
        )}
        <div className="flex items-start gap-1.5 px-3 py-2.5">
          {coverUrl && icon && (
            <span className="mt-0.5 shrink-0">
              <DocumentIcon icon={icon} size={16} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">
              {label}
            </span>
            {subtitleText && (
              <span className="mt-0.5 line-clamp-2 text-xs text-muted">
                {subtitleText}
              </span>
            )}
            <TagChipsRow
              tags={tags}
              max={MAX_VISIBLE_TAGS}
              className="mt-1.5"
              data-testid="cover-card-tags"
            />
          </span>
        </div>
      </button>
      {actions && actions.length > 0 && (
        <CoverCardActions actions={actions} label={label} />
      )}
    </div>
  );

  if (!actions || actions.length === 0) return card;
  return <RowContextMenu actions={actions}>{card}</RowContextMenu>;
}

// Hover chip for the more-actions control. Tracks menu open state in React
// because the Radix menu portals focus away from the card — CSS hover /
// focus-within alone can't keep the chip visible while the menu is open.
function CoverCardActions({
  actions,
  label,
}: {
  actions: RowAction[];
  label: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      data-testid="cover-card-actions"
      className={cn(
        "absolute right-1.5 top-1.5 rounded-md border border-border bg-elevated text-text shadow-popover transition-opacity motion-reduce:transition-none",
        menuOpen
          ? "opacity-100"
          : "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
      )}
    >
      <RowActionDropdown
        actions={actions}
        label={`Actions for ${label}`}
        onOpenChange={setMenuOpen}
      />
    </div>
  );
}

/**
 * A single library item rendered as a gallery card: an optional cover image (or
 * the item's icon / a default glyph fallback) above its title and optional
 * subtitle, with optional hover/right-click actions. Shared by the collection
 * page gallery. Memoized so a grid re-render doesn't churn every card — pass
 * referentially-stable handler props.
 */
export const CoverCard = memo(CoverCardComponent);
