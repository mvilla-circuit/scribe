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

// List rows are more compact than grid cards, so a row caps at fewer chips
// before collapsing the rest into a "+N".
const MAX_VISIBLE_TAGS = 2;

interface CollectionListRowProps {
  child: GalleryChild;
  onOpen: () => void;
  actions?: RowAction[];
  /**
   * Tags to show alongside the kind label. Omitted entirely for kinds that
   * can't carry tags (only collections do today).
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
 */
export function CollectionListRow({
  child,
  onOpen,
  actions = [],
  tags = [],
}: CollectionListRowProps) {
  const { title, kindLabel, icon } = galleryChildMeta(child);
  const label = title || "Untitled";
  const hasActions = actions.length > 0;

  const row = (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left outline-none transition hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-tree-group text-muted">
          {icon ? (
            <DocumentIcon icon={icon} size={18} />
          ) : (
            galleryFallback(child)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text">
            {label}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <span>{kindLabel}</span>
            {tags.length > 0 && (
              <TagChipsRow
                tags={tags}
                max={MAX_VISIBLE_TAGS}
                data-testid="collection-list-row-tags"
              />
            )}
          </span>
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
