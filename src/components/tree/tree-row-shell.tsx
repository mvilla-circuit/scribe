import type { ReactNode } from "react";

import { SidebarRow } from "@/components/sidebar/sidebar-row";
import {
  rowActivationHandlers,
  useSortableRow,
} from "@/components/tree/row-interactions";
import { InlineRename } from "@/components/ui/inline-rename";
import {
  type RowAction,
  RowActionDropdown,
  RowContextMenu,
} from "@/components/ui/row-action-menu";

interface TreeRowShellProps {
  /** Entity id; wires up dnd-kit sortable state for this row. */
  id: string;
  /** Whether this row may be used as a drag source. */
  draggable?: boolean;
  depth: number;
  /** Projected depth while this row is being dragged; null otherwise. */
  projectionDepth: number | null;
  selected: boolean;
  editing: boolean;
  ariaExpanded?: boolean;
  ariaSelected?: boolean;
  /** Left icon slot (with its own h-5/w-5 wrapper). */
  icon: ReactNode;
  /** Display label, also seeded into the rename field while editing. */
  label: string;
  renamePlaceholder?: string;
  /** Actions rendered in both the hover dropdown and the context menu. */
  menuActions: RowAction[];
  /** Extra trailing controls shown before the "more actions" dropdown. */
  leadingActions?: ReactNode;
  /** Click/Enter activates the row (select a book/page or toggle a folder). */
  onActivate: () => void;
  onStartRename: () => void;
  onCommitRename: (value: string) => void;
  onCancelRename: () => void;
}

// The shared envelope for an interactive tree row: dnd-kit sortable wiring, the
// label↔InlineRename swap, the SidebarRow box, and the hover/context action
// menus. The Library tree and the in-book Outline supply only their own icon,
// label, and action set.
export function TreeRowShell({
  id,
  draggable = true,
  depth,
  projectionDepth,
  selected,
  editing,
  ariaExpanded,
  ariaSelected,
  icon,
  label,
  renamePlaceholder,
  menuActions,
  leadingActions,
  onActivate,
  onStartRename,
  onCommitRename,
  onCancelRename,
}: TreeRowShellProps) {
  const { setNodeRef, style, dragHandleProps, isDragging } = useSortableRow(
    id,
    !draggable,
  );

  const activation = rowActivationHandlers({
    editing,
    onActivate,
    onStartRename,
  });

  const labelNode = editing ? (
    <InlineRename
      initialValue={label}
      onCommit={onCommitRename}
      onCancel={onCancelRename}
      placeholder={renamePlaceholder}
    />
  ) : (
    label
  );

  const actions = (
    <>
      {leadingActions}
      <RowActionDropdown actions={menuActions} tooltipSide="right" />
    </>
  );

  const rowInner = (
    <SidebarRow
      id={id}
      setNodeRef={setNodeRef}
      style={style}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
      depth={depth}
      projectionDepth={projectionDepth}
      selected={selected}
      editing={editing}
      ariaExpanded={ariaExpanded}
      ariaSelected={ariaSelected}
      icon={icon}
      actions={actions}
      {...activation}
    >
      {labelNode}
    </SidebarRow>
  );

  return <RowContextMenu actions={menuActions}>{rowInner}</RowContextMenu>;
}
