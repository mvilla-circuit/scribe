import { MoreHorizontal, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import type { DatagridView } from "@/data/datagrid-views";
import { cn } from "@/lib/utils";

interface DatagridViewTabsProps {
  activeViewId: string | null;
  onCreate: () => void;
  onDelete: (viewId: string) => void;
  onSelect: (viewId: string) => void;
  views: DatagridView[];
}

export function DatagridViewTabs({
  activeViewId,
  onCreate,
  onDelete,
  onSelect,
  views,
}: DatagridViewTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {views.map((view) => (
        <div key={view.id} className="group/viewtab relative flex items-center">
          <button
            type="button"
            onClick={() => {
              onSelect(view.id);
            }}
            className={cn(
              "-mb-px border-b-2 px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeViewId === view.id
                ? "border-accent text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {view.name}
          </button>
          {views.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for ${view.name}`}
                  className={cn(
                    "ml-0.5 flex size-5 items-center justify-center rounded text-muted outline-none",
                    "opacity-0 transition-opacity hover:bg-hover hover:text-text",
                    "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
                    "group-hover/viewtab:opacity-100",
                  )}
                >
                  <MoreHorizontal className="size-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-danger"
                  onSelect={() => {
                    onDelete(view.id);
                  }}
                >
                  Delete view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
      <Tooltip content="New view">
        <button
          type="button"
          aria-label="New view"
          onClick={onCreate}
          className="ml-1 flex size-6 items-center justify-center rounded text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}
