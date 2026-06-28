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
import {
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

import { type RovingTabindex, RovingTabindexContext } from "./roving-tabindex";

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
  const treeRef = useRef<HTMLDivElement>(null);
  // The id of the row that currently holds the tree's single tab stop. Null
  // until the user interacts; we then fall back to the first row so the tree is
  // always reachable even if the remembered row was deleted or scrolled away.
  const [activeId, setActiveId] = useState<string | null>(null);
  const tabbableId =
    activeId && items.includes(activeId) ? activeId : (items[0] ?? null);

  const roving = useMemo<RovingTabindex>(
    () => ({ getTabIndex: (id) => (id === tabbableId ? 0 : -1) }),
    [tabbableId],
  );

  const focusRow = useCallback((id: string | undefined) => {
    if (!id) return;
    setActiveId(id);
    treeRef.current
      ?.querySelector<HTMLElement>(`[data-roving-id="${id}"]`)
      ?.focus();
  }, []);

  // Keep the tab stop on whichever row the user focuses (e.g. by clicking),
  // so Tabbing away and back returns to the same place. `onFocus` bubbles.
  const onFocus = useCallback((e: FocusEvent<HTMLDivElement>) => {
    const id = (e.target as HTMLElement).dataset.rovingId;
    if (id) setActiveId(id);
  }, []);

  // Arrow/Home/End move focus between rows. We only act when the event comes
  // from a row itself (it carries `data-roving-id`); keystrokes inside a rename
  // field or action button bubble up here with no id and are left alone.
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const id = (e.target as HTMLElement).dataset.rovingId;
      if (!id) return;
      const idx = items.indexOf(id);
      if (idx === -1) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          focusRow(items[Math.min(idx + 1, items.length - 1)]);
          break;
        case "ArrowUp":
          e.preventDefault();
          focusRow(items[Math.max(idx - 1, 0)]);
          break;
        case "Home":
          e.preventDefault();
          focusRow(items[0]);
          break;
        case "End":
          e.preventDefault();
          focusRow(items[items.length - 1]);
          break;
        default:
          break;
      }
    },
    [items, focusRow],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      {...dndHandlers}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- The tree only delegates roving-tabindex keyboard/focus events; the real tab stops are the treeitem rows, not this wrapper. */}
        <div
          ref={treeRef}
          role="tree"
          aria-label={ariaLabel}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          className={cn("flex flex-col", className)}
        >
          <RovingTabindexContext.Provider value={roving}>
            {children}
          </RovingTabindexContext.Provider>
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
    </DndContext>
  );
}
