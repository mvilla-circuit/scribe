import { PageIcon } from "@/components/book/icons";
import {
  BookIcon,
  CollectionIcon,
  DatagridIcon,
} from "@/components/sidebar/icons";
import { DocumentIcon } from "@/components/ui/document-icon";
import {
  type RowAction,
  RowActionDropdown,
  RowContextMenu,
} from "@/components/ui/row-action-menu";

import { type GalleryChild, galleryChildMeta } from "./collection-gallery";

interface CollectionListRowProps {
  child: GalleryChild;
  onOpen: () => void;
  actions?: RowAction[];
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
  }
}

/**
 * A compact, actionable row for a collection gallery item in list view.
 */
export function CollectionListRow({
  child,
  onOpen,
  actions = [],
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
          <span className="mt-0.5 block text-xs text-muted">{kindLabel}</span>
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
