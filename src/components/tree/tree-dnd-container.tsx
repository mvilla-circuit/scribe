import {
  closestCenter,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type DndContextProps = ComponentProps<typeof DndContext>;

// The drag-and-drop scaffold shared by the Library tree and the in-book Outline:
// a `DndContext` with the same sensors/collision/measuring config, a vertical
// `SortableContext`, the `role="tree"` list, and the lifted-row `DragOverlay`.
// Callers supply the rows (`children`), the overlay chip, and the small bits
// that differ (aria label, row gap). Drag state/handlers come from useTreeDnd.
export function TreeDndContainer({
  sensors,
  dndHandlers,
  items,
  ariaLabel,
  className,
  overlay,
  children,
}: {
  sensors: DndContextProps["sensors"];
  dndHandlers: Pick<
    DndContextProps,
    "onDragStart" | "onDragMove" | "onDragEnd" | "onDragCancel"
  >;
  /** Sortable item ids, in render order (the currently visible nodes). */
  items: string[];
  ariaLabel: string;
  /** Extra classes for the tree list — e.g. the inter-row gap. */
  className?: string;
  /** Content of the DragOverlay (the lifted row chip), or null when idle. */
  overlay: ReactNode;
  children: ReactNode;
}) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      {...dndHandlers}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div
          role="tree"
          aria-label={ariaLabel}
          className={cn("flex flex-col", className)}
        >
          {children}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
    </DndContext>
  );
}
