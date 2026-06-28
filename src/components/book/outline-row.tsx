import { memo } from "react";

import {
  DuplicateIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/sidebar/icons";
import {
  SIDEBAR_ICON_SIZE,
  SidebarRowOverlay,
} from "@/components/sidebar/sidebar-row";
import { TreeRowShell } from "@/components/tree/tree-row-shell";
import { DocumentIcon } from "@/components/ui/document-icon";
import { type RowAction } from "@/components/ui/row-action-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { ChevronRightIcon, PageIcon, PlusIcon } from "./icons";
import { type FlatDocNode } from "./outline-dnd";

// The document's icon when set, otherwise the generic page glyph. Shared by the
// live rows and the drag overlay.
function DocIcon({ document }: { document: FlatDocNode["document"] }) {
  return document.icon ? (
    <DocumentIcon icon={document.icon} size={SIDEBAR_ICON_SIZE} />
  ) : (
    <PageIcon size={SIDEBAR_ICON_SIZE} />
  );
}

// Handlers take the row's id/node so the parent can pass one stable set of
// callbacks for the whole outline (rather than a fresh closure per row per
// render), which is what lets `OutlineRow` actually skip re-rendering under
// `memo`.
interface OutlineRowHandlers {
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onStartRename: (id: string) => void;
  onCommitRename: (node: FlatDocNode, value: string) => void;
  onCancelRename: () => void;
  onDelete: (node: FlatDocNode) => void;
  onDuplicate: (node: FlatDocNode) => void;
  onNewChild: (id: string) => void;
}

type OutlineRowProps = OutlineRowHandlers & {
  node: FlatDocNode;
  selected: boolean;
  editing: boolean;
  expanded: boolean;
  /** Projected depth while this row is being dragged; null otherwise. */
  projectionDepth: number | null;
};

export const OutlineRow = memo(function OutlineRow({
  node,
  selected,
  editing,
  expanded,
  projectionDepth,
  onToggleExpand,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
  onDuplicate,
  onNewChild,
}: OutlineRowProps) {
  const label = node.document.title || "Untitled";

  // Always show the page's icon; for rows with children, reveal the
  // expand/collapse chevron over it on hover or focus (the icon fades out so the
  // chevron reads cleanly). This keeps the page's identity visible at rest while
  // still exposing the toggle on demand.
  const icon = (
    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center text-muted/70">
      <span
        className={cn(
          "flex items-center justify-center transition-opacity duration-150",
          node.hasChildren &&
            "group-hover:opacity-0 group-focus-within:opacity-0",
        )}
      >
        <DocIcon document={node.document} />
      </span>
      {node.hasChildren && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.id);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="absolute inset-0 flex items-center justify-center rounded text-muted opacity-0 transition-opacity duration-150 hover:text-text group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <ChevronRightIcon
            size={SIDEBAR_ICON_SIZE}
            className={cn(
              "transition-transform duration-150",
              expanded && "rotate-90",
            )}
          />
        </button>
      )}
    </span>
  );

  const menuActions: RowAction[] = [
    {
      icon: <PlusIcon size={15} />,
      label: "Add page inside",
      onSelect: () => {
        onNewChild(node.id);
      },
    },
    {
      icon: <PencilIcon size={15} />,
      label: "Rename",
      onSelect: () => {
        onStartRename(node.id);
      },
    },
    {
      icon: <DuplicateIcon size={15} />,
      label: "Duplicate",
      onSelect: () => {
        onDuplicate(node);
      },
    },
    {
      icon: <TrashIcon size={15} />,
      label: "Delete",
      onSelect: () => {
        onDelete(node);
      },
      danger: true,
      separatorBefore: true,
    },
  ];

  const leadingActions = (
    <Tooltip content="Add page inside" side="right">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Add page inside"
        onClick={(e) => {
          e.stopPropagation();
          onNewChild(node.id);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-text"
      >
        <PlusIcon size={15} />
      </button>
    </Tooltip>
  );

  return (
    <TreeRowShell
      id={node.id}
      depth={node.depth}
      projectionDepth={projectionDepth}
      selected={selected}
      editing={editing}
      ariaExpanded={node.hasChildren ? expanded : undefined}
      ariaSelected={selected}
      icon={icon}
      label={label}
      renamePlaceholder="Untitled"
      menuActions={menuActions}
      leadingActions={leadingActions}
      onActivate={() => {
        onSelect(node.id);
      }}
      onStartRename={() => {
        onStartRename(node.id);
      }}
      onCommitRename={(value) => {
        onCommitRename(node, value);
      }}
      onCancelRename={onCancelRename}
    />
  );
});

// Clean single-line chip rendered in the DragOverlay so the lifted row follows
// the cursor without its controls.
export function OutlineDragOverlay({ node }: { node: FlatDocNode }) {
  return (
    <SidebarRowOverlay
      icon={<DocIcon document={node.document} />}
      label={node.document.title || "Untitled"}
    />
  );
}
