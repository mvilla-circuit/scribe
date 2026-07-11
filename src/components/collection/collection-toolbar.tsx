import { Grid3X3, List, Search } from "lucide-react";

import { Tooltip } from "@/components/ui/tooltip";
import type { CollectionLayout } from "@/data/collection-view";
import { cn } from "@/lib/utils";

interface CollectionToolbarProps {
  query: string;
  layout: CollectionLayout;
  onQueryChange: (query: string) => void;
  onLayoutChange: (layout: CollectionLayout) => void;
}

/**
 * Search and grid/list controls for a collection gallery. Items are always
 * sorted alphabetically; layout is persisted per collection.
 */
export function CollectionToolbar({
  query,
  layout,
  onQueryChange,
  onLayoutChange,
}: CollectionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex min-w-48 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-muted focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search collection"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder="Search"
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
        />
      </label>

      <div className="ml-auto flex items-center rounded-md border border-border bg-surface p-0.5">
        <Tooltip content="Grid view">
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={layout === "grid"}
            onClick={() => {
              onLayoutChange("grid");
            }}
            className={cn(
              "flex size-7 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
              layout === "grid"
                ? "bg-hover text-text"
                : "text-muted hover:text-text",
            )}
          >
            <Grid3X3 className="size-4" aria-hidden="true" />
          </button>
        </Tooltip>
        <Tooltip content="List view">
          <button
            type="button"
            aria-label="List view"
            aria-pressed={layout === "list"}
            onClick={() => {
              onLayoutChange("list");
            }}
            className={cn(
              "flex size-7 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
              layout === "list"
                ? "bg-hover text-text"
                : "text-muted hover:text-text",
            )}
          >
            <List className="size-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
