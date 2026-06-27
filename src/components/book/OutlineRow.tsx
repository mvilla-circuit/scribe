import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  DuplicateIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/sidebar/icons";
import {
  SIDEBAR_ICON_SIZE,
  SidebarRow,
  SidebarRowOverlay,
} from "@/components/sidebar/SidebarRow";
import { DocumentIcon } from "@/components/ui/DocumentIcon";
import { InlineRename } from "@/components/ui/InlineRename";
import {
  type RowAction,
  RowActionDropdown,
  RowContextMenu,
} from "@/components/ui/RowActionMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

import { ChevronRightIcon, PageIcon, PlusIcon } from "./icons";
import { type FlatDocNode } from "./outlineDnd";

// The document's icon when set, otherwise the generic page glyph. Shared by the
// live rows and the drag overlay.
function DocIcon({ document }: { document: FlatDocNode["document"] }) {
  return document.icon ? (
    <DocumentIcon icon={document.icon} size={SIDEBAR_ICON_SIZE} />
  ) : (
    <PageIcon size={SIDEBAR_ICON_SIZE} />
  );
}

interface OutlineRowHandlers {
  onToggleExpand: () => void;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (value: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onNewChild: () => void;
}

type OutlineRowProps = OutlineRowHandlers & {
  node: FlatDocNode;
  selected: boolean;
  editing: boolean;
  expanded: boolean;
  /** Projected depth while this row is being dragged; null otherwise. */
  projectionDepth: number | null;
};

export function OutlineRow({
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

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
            onToggleExpand();
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

  const labelNode = editing ? (
    <InlineRename
      initialValue={label}
      onCommit={onCommitRename}
      onCancel={onCancelRename}
      placeholder="Untitled"
    />
  ) : (
    label
  );

  const menuActions: RowAction[] = [
    {
      icon: <PlusIcon size={15} />,
      label: "Add page inside",
      onSelect: onNewChild,
    },
    {
      icon: <PencilIcon size={15} />,
      label: "Rename",
      onSelect: onStartRename,
    },
    {
      icon: <DuplicateIcon size={15} />,
      label: "Duplicate",
      onSelect: onDuplicate,
    },
    {
      icon: <TrashIcon size={15} />,
      label: "Delete",
      onSelect: onDelete,
      danger: true,
      separatorBefore: true,
    },
  ];

  const actions = (
    <>
      <Tooltip content="Add page inside">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Add page inside"
          onClick={(e) => {
            e.stopPropagation();
            onNewChild();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-text"
        >
          <PlusIcon size={15} />
        </button>
      </Tooltip>
      <RowActionDropdown actions={menuActions} />
    </>
  );

  const rowInner = (
    <SidebarRow
      setNodeRef={setNodeRef}
      style={style}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      depth={node.depth}
      projectionDepth={projectionDepth}
      selected={selected}
      editing={editing}
      ariaExpanded={node.hasChildren ? expanded : undefined}
      ariaSelected={selected}
      icon={icon}
      actions={actions}
      onClick={() => {
        if (!editing) onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!editing) onStartRename();
      }}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        } else if (e.key === "F2") {
          e.preventDefault();
          onStartRename();
        }
      }}
    >
      {labelNode}
    </SidebarRow>
  );

  return <RowContextMenu actions={menuActions}>{rowInner}</RowContextMenu>;
}

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
