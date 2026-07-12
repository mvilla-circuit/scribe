import { PageIcon } from "@/components/book/icons";
import {
  BookIcon,
  CollectionIcon,
  DatagridIcon,
  WhiteboardIcon,
} from "@/components/sidebar/icons";
import { DocumentIcon } from "@/components/ui/document-icon";
import {
  type RowAction,
  RowActionDropdown,
  RowContextMenu,
} from "@/components/ui/row-action-menu";

import { type GalleryChild, galleryChildMeta } from "./collection-gallery";
import { type GalleryTag, TagChipsRow } from "./tag-chips-row";

// List rows show every assigned tag — the wide row has room to wrap.

interface CollectionListRowProps {
  child: GalleryChild;
  onOpen: () => void;
  actions?: RowAction[];
  /**
   * Tags to show under the subtitle. Omitted entirely for kinds that can't
   * carry tags (only collections do today).
   */
  tags?: GalleryTag[];
}

function galleryFallback(child: GalleryChild) {
  switch (child.kind) {
    case "collection":
      return <CollectionIcon size={18} />;
    case "book":
      return <BookIcon size={18} />;
    case "entry":
      return <PageIcon size={18} />;
    case "datagrid":
      return <DatagridIcon size={18} />;
    case "whiteboard":
      return <WhiteboardIcon size={18} />;
  }
}

/**
 * A compact, actionable row for a collection gallery item in list view.
 * The left cap is flush to the row edge: cover fills it when present,
 * otherwise the icon (or kind glyph) sits centered on a quiet wash.
 */
export function CollectionListRow({
  child,
  onOpen,
  actions = [],
  tags = [],
}: CollectionListRowProps) {
  const { title, subtitle, icon, coverUrl } = galleryChildMeta(child);
  const label = title || "Untitled";
  const subtitleText = subtitle?.trim() ? subtitle.trim() : null;
  const hasActions = actions.length > 0;

  const row = (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-surface text-left outline-none transition hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          data-testid="list-row-media"
          className="relative w-20 shrink-0 self-stretch bg-tree-group text-muted"
        >
          {coverUrl ? (
            <img
              data-testid="list-row-cover"
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full min-h-16 w-full items-center justify-center">
              {icon ? (
                <DocumentIcon icon={icon} size={18} />
              ) : (
                galleryFallback(child)
              )}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 px-3 py-2.5">
          <span className="block truncate text-sm font-medium text-text">
            {label}
          </span>
          {subtitleText && (
            <span className="mt-0.5 line-clamp-2 text-xs text-muted">
              {subtitleText}
            </span>
          )}
          {tags.length > 0 && (
            <TagChipsRow
              tags={tags}
              className="mt-1.5"
              data-testid="collection-list-row-tags"
            />
          )}
        </span>
      </button>
      {hasActions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <RowActionDropdown actions={actions} label={`Actions for ${label}`} />
        </div>
      )}
    </div>
  );

  return hasActions ? (
    <RowContextMenu actions={actions}>{row}</RowContextMenu>
  ) : (
    row
  );
}
