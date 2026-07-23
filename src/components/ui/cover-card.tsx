import { memo, type ReactNode, useState } from "react";

import { COVER_FLOATING_CONTROL_CLASS } from "@/components/ui/cover-floating-control";
import { DocumentIcon } from "@/components/ui/document-icon";
import {
  type RowAction,
  RowActionDropdown,
  RowContextMenu,
} from "@/components/ui/row-action-menu";
import { cn } from "@/lib/utils";

/** Portrait book cover vs landscape album cover for gallery media. */
type CoverCardAspect = "book" | "album";

interface CoverCardProps {
  title: string;
  /** Optional secondary line under the title (book subtitle / collection description). */
  subtitle?: string | null;
  icon: string | null;
  coverUrl: string | null;
  /** Vertical focal point (0–100) for `object-position`, matching PageCover. */
  coverPosition?: number;
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
   * Extra content rendered under the title block (e.g. a row of tag chips).
   * Left to the caller so this design-system primitive doesn't depend on any
   * feature-specific data shape.
   */
  footerExtra?: ReactNode;
  /**
   * Optional media-area control (e.g. a calm cover upload). Rendered as a
   * sibling of the open button — never nested inside it — so the control stays
   * keyboard-reachable without nesting interactive elements. Visibility follows
   * card hover / focus-within, matching PageCover.
   */
  mediaOverlay?: ReactNode;
}

function CoverCardComponent({
  title,
  subtitle,
  icon,
  coverUrl,
  coverPosition = 50,
  fallback,
  onOpen,
  actions,
  aspect = "book",
  footerExtra,
  mediaOverlay,
}: CoverCardProps) {
  const label = title || "Untitled";
  const subtitleText = subtitle?.trim() || null;
  const mediaAspect = aspect === "album" ? "aspect-[4/3]" : "aspect-[3/4]";
  const actionsList = actions && actions.length > 0 ? actions : null;
  const card = (
    <div className="group relative h-full" data-testid="cover-card">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-surface text-left outline-none transition-[border-color,box-shadow] duration-150 ease-out hover:border-text/20 hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            data-testid="cover-card-media"
            style={{ objectPosition: `50% ${coverPosition}%` }}
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
        <div
          data-testid="cover-card-footer"
          className="flex flex-1 items-start gap-1.5 px-3 py-2.5"
        >
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
            {footerExtra}
          </span>
        </div>
      </button>
      {mediaOverlay ? (
        <div
          data-testid="cover-card-media-overlay"
          className={cn(
            "absolute left-1.5 top-1.5 z-10 opacity-0 motion-safe:transition-opacity motion-reduce:transition-none",
            "pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto",
            "group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          {mediaOverlay}
        </div>
      ) : null}
      {actionsList ? (
        <CoverCardActions actions={actionsList} label={label} />
      ) : null}
    </div>
  );

  if (!actionsList) return card;
  return <RowContextMenu actions={actionsList}>{card}</RowContextMenu>;
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
        "absolute right-1.5 top-1.5 transition-opacity motion-reduce:transition-none",
        COVER_FLOATING_CONTROL_CLASS,
        menuOpen
          ? "opacity-100"
          : "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
      )}
    >
      <RowActionDropdown
        actions={actions}
        label={`Actions for ${label}`}
        onOpenChange={setMenuOpen}
        triggerClassName="text-inverted-text/85 hover:bg-transparent hover:text-inverted-text data-[state=open]:bg-transparent data-[state=open]:text-inverted-text"
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
