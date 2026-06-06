/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

// Shared layout tokens for every sidebar tree row (the Library tree and the
// in-book Outline). Keeping these in one place guarantees the two trees share
// identical row height, icon sizing, indentation, and spacing.
export const SIDEBAR_INDENT = 16;
export const SIDEBAR_ICON_SIZE = 19;
/** Vertical gap between sibling rows. */
export const SIDEBAR_ROW_GAP = "gap-1.5";

export function sidebarRowPadding(depth: number) {
  return 8 + depth * SIDEBAR_INDENT;
}

type SidebarRowProps = {
  // dnd-kit wiring from the caller's useSortable().
  setNodeRef: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging: boolean;
  depth: number;
  /** Projected depth while dragging; falls back to `depth`. */
  projectionDepth?: number | null;

  selected?: boolean;
  editing: boolean;

  role?: string;
  ariaExpanded?: boolean;
  ariaSelected?: boolean;

  /** The left icon slot, including its own h-5/w-5 wrapper. */
  icon: ReactNode;
  /** The label, or the rename field while editing. */
  children: ReactNode;
  /** Trailing controls; revealed on hover/focus when not editing. */
  actions?: ReactNode;

  onClick?: () => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};

// The visual shell for a single tree row. Callers supply the icon, label, and
// trailing actions; this component owns the row's box, sizing, selection state,
// and the drag insertion line.
export function SidebarRow({
  setNodeRef,
  style,
  dragHandleProps,
  isDragging,
  depth,
  projectionDepth,
  selected,
  editing,
  role = "treeitem",
  ariaExpanded,
  ariaSelected,
  icon,
  children,
  actions,
  onClick,
  onDoubleClick,
  onKeyDown,
}: SidebarRowProps) {
  // While dragging, collapse the row into an insertion line at the projected
  // depth so the drop target (including nesting) reads clearly.
  if (isDragging) {
    const lineDepth = projectionDepth ?? depth;
    return (
      <div ref={setNodeRef} style={style} role={role}>
        <div style={{ paddingLeft: sidebarRowPadding(lineDepth) }}>
          <div className="h-9 rounded-md border border-dashed border-accent/50 bg-accent/5" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, paddingLeft: sidebarRowPadding(depth) }}
      {...dragHandleProps}
      role={role}
      aria-expanded={ariaExpanded}
      aria-selected={ariaSelected}
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={cn(
        "group flex h-9 cursor-default items-center gap-2 rounded-md pr-1 text-sm outline-none",
        "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-selected font-medium text-text"
          : "text-text hover:bg-hover"
      )}
    >
      {icon}

      {editing ? (
        <span className="min-w-0 flex-1 py-0.5">{children}</span>
      ) : (
        <span className="min-w-0 flex-1 truncate">{children}</span>
      )}

      {!editing && actions && (
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {actions}
        </span>
      )}
    </div>
  );
}

// A non-interactive copy of a row for the DragOverlay: a single clean chip that
// follows the cursor. Shared so the lifted item looks the same in both trees.
export function SidebarRowOverlay({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-elevated px-2 pr-3 text-sm text-text shadow-popover">
      <span className="flex h-5 w-5 items-center justify-center text-muted">
        {icon}
      </span>
      <span className="max-w-[14rem] truncate">{label}</span>
    </div>
  );
}
