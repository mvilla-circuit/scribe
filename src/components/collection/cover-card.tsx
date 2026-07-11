import { memo, type ReactNode } from "react";

import { DocumentIcon } from "@/components/ui/document-icon";
import {
  type RowAction,
  RowActionDropdown,
  RowContextMenu,
} from "@/components/ui/row-action-menu";

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
}

function CoverCardComponent({
  title,
  subtitle,
  icon,
  coverUrl,
  fallback,
  onOpen,
  actions,
}: CoverCardProps) {
  const label = title || "Untitled";
  const subtitleText = subtitle?.trim() ? subtitle.trim() : null;
  const card = (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface text-left outline-none transition-shadow hover:shadow-popover focus-visible:ring-2 focus-visible:ring-ring"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="aspect-[3/4] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-hover text-muted">
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
              <span className="mt-0.5 block truncate text-xs text-muted">
                {subtitleText}
              </span>
            )}
          </span>
        </div>
      </button>
      {actions && actions.length > 0 && (
        <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <RowActionDropdown actions={actions} label={`Actions for ${label}`} />
        </div>
      )}
    </div>
  );

  if (!actions || actions.length === 0) return card;
  return <RowContextMenu actions={actions}>{card}</RowContextMenu>;
}

/**
 * A single library item rendered as a gallery card: an optional cover image (or
 * the item's icon / a default glyph fallback) above its title and optional
 * subtitle, with optional hover/right-click actions. Shared by the collection
 * page's book and sub-collection grids. Memoized so a grid re-render doesn't
 * churn every card — pass referentially-stable handler props.
 */
export const CoverCard = memo(CoverCardComponent);
