import { Grid3X3, List } from "lucide-react";

import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { CollectionLayout } from "@/data/collection-view";

interface CollectionToolbarProps {
  query: string;
  layout: CollectionLayout;
  onQueryChange: (query: string) => void;
  onLayoutChange: (layout: CollectionLayout) => void;
}

const LAYOUT_SEGMENTS = [
  { value: "grid", label: "Grid view", icon: Grid3X3 },
  { value: "list", label: "List view", icon: List },
] as const;

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
      <SearchField
        label="Search collection"
        value={query}
        onChange={onQueryChange}
        className="min-w-48"
      />

      <SegmentedControl
        segments={LAYOUT_SEGMENTS}
        value={layout}
        onChange={onLayoutChange}
        aria-label="Layout"
        className="ml-auto"
      />
    </div>
  );
}
