import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";

// Shared row interaction primitives for the Library tree and the in-book
// Outline. Both render rows through `SidebarRow` and need identical drag wiring
// and activation/rename semantics; these helpers keep that logic in one place.

/**
 * The dnd-kit sortable wiring for a single tree row, pre-shaped for `SidebarRow`
 * (which wants `setNodeRef`, an inline transform `style`, the merged drag-handle
 * props, and the `isDragging` flag).
 */
export function useSortableRow(id: string) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return {
    setNodeRef,
    style,
    dragHandleProps: { ...attributes, ...listeners },
    isDragging,
  };
}

/**
 * The click/double-click/keyboard behaviour shared by every tree row: a primary
 * action (select a page/book or toggle a folder), double-click and F2 to rename,
 * and a hard stop on all of it while the row's inline rename field is open.
 * `onActivate` lets each tree decide what "primary action" means.
 */
export function rowActivationHandlers({
  editing,
  onActivate,
  onStartRename,
}: {
  editing: boolean;
  onActivate: () => void;
  onStartRename: () => void;
}) {
  return {
    onClick: () => {
      if (editing) return;
      onActivate();
    },
    onDoubleClick: (e: MouseEvent) => {
      e.stopPropagation();
      if (!editing) onStartRename();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (editing) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      } else if (e.key === "F2") {
        e.preventDefault();
        onStartRename();
      }
    },
  };
}
