import { MoreHorizontal } from "lucide-react";
import {
  type ComponentProps,
  type ComponentType,
  Fragment,
  type ReactNode,
} from "react";

import { makeIcon } from "@/lib/make-icon";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Tooltip } from "./tooltip";

const MoreIcon = makeIcon(MoreHorizontal);

// The menu content is portaled in the DOM but, in the React tree, it remains a
// descendant of the clickable row. React dispatches synthetic events through the
// React tree, so selecting an item bubbles a `click` up into the row's onClick
// (navigating into the book) and unmounts the dialog the action just opened.
// Stop the click at the menu content so it never reaches the row.
const stopRowClick = (e: React.MouseEvent) => {
  e.stopPropagation();
};

// A single declaration of a tree row's actions, rendered identically as both a
// hover dropdown and a right-click context menu so each row defines its menu
// once instead of writing the item list out twice.
export interface RowAction {
  icon: ReactNode;
  label: string;
  // Stable React key, used when labels aren't unique within a menu (e.g. a
  // "Move to" submenu of several "Untitled" collections). Defaults to `label`.
  key?: string;
  // Fired when the item is chosen. Optional because a `submenu` parent item
  // opens its submenu instead of firing an action of its own.
  onSelect?: () => void;
  danger?: boolean;
  // Render a separator above this item (ignored when it would lead the menu).
  separatorBefore?: boolean;
  // When present and non-empty, this action opens a nested submenu of these
  // actions instead of firing its own `onSelect` (which is ignored).
  submenu?: RowAction[];
}

interface MenuItemComponentProps {
  danger?: boolean;
  onSelect?: (event: Event) => void;
  children?: ReactNode;
}

interface MenuSubTriggerProps {
  children?: ReactNode;
}

// The menu item primitives for one surface (context menu or dropdown menu), so
// `renderActions` can build an identical action list against either family.
interface MenuPrimitives {
  Item: ComponentType<MenuItemComponentProps>;
  Separator: ComponentType;
  Sub: ComponentType<{ children?: ReactNode }>;
  SubTrigger: ComponentType<MenuSubTriggerProps>;
  SubContent: ComponentType<{ children?: ReactNode }>;
}

// Renders an action list against either the context-menu or dropdown-menu item
// primitives so each surface declares its items once. A leading separator is
// suppressed so a section break never opens the menu. Actions carrying a
// non-empty `submenu` render as a nested submenu whose own `onSelect` is ignored.
function renderActions(actions: RowAction[], primitives: MenuPrimitives) {
  const { Item, Separator, Sub, SubTrigger, SubContent } = primitives;
  return actions.map((action, i) => (
    // Prefer an explicit `key` so duplicate/blank labels (e.g. several
    // "Untitled" collections in a "Move to" submenu) can't collide and misroute
    // clicks; fall back to the label for the common unique-label case.
    <Fragment key={action.key ?? action.label}>
      {action.separatorBefore && i > 0 && <Separator />}
      {action.submenu && action.submenu.length > 0 ? (
        <Sub>
          <SubTrigger>
            {action.icon}
            {action.label}
          </SubTrigger>
          <SubContent>{renderActions(action.submenu, primitives)}</SubContent>
        </Sub>
      ) : (
        <Item
          danger={action.danger}
          onSelect={() => {
            action.onSelect?.();
          }}
        >
          {action.icon}
          {action.label}
        </Item>
      )}
    </Fragment>
  ));
}

const contextMenuPrimitives: MenuPrimitives = {
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
};

const dropdownMenuPrimitives: MenuPrimitives = {
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};

// Wraps a row so right-clicking it opens a context menu of the given actions.
export function RowContextMenu({
  actions,
  children,
}: {
  actions: RowAction[];
  children: ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        onClick={stopRowClick}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        {renderActions(actions, contextMenuPrimitives)}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// The trailing "more actions" button that opens the same actions as a dropdown.
export function RowActionDropdown({
  actions,
  label = "More actions",
  tooltipSide,
  onOpenChange,
}: {
  actions: RowAction[];
  label?: string;
  /** Which side the label tooltip opens on; defaults to the Tooltip default. */
  tooltipSide?: ComponentProps<typeof Tooltip>["side"];
  /** Fired when the dropdown opens or closes (e.g. to keep a hover chip visible). */
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <Tooltip content={label} side={tooltipSide}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            aria-label={label}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-hover data-[state=open]:text-text"
          >
            <MoreIcon size={15} />
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        onClick={stopRowClick}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        {renderActions(actions, dropdownMenuPrimitives)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
