import { MoreHorizontal } from "lucide-react";
import { type ComponentType, Fragment, type ReactNode } from "react";

import { makeIcon } from "@/lib/make-icon";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  onSelect: () => void;
  danger?: boolean;
  // Render a separator above this item (ignored when it would lead the menu).
  separatorBefore?: boolean;
}

interface MenuItemComponentProps {
  danger?: boolean;
  onSelect?: (event: Event) => void;
  children?: ReactNode;
}

// Renders an action list against either the context-menu or dropdown-menu item
// primitives so each surface declares its items once. A leading separator is
// suppressed so a section break never opens the menu.
function renderActions(
  actions: RowAction[],
  Item: ComponentType<MenuItemComponentProps>,
  Separator: ComponentType,
) {
  return actions.map((action, i) => (
    <Fragment key={action.label}>
      {action.separatorBefore && i > 0 && <Separator />}
      <Item
        danger={action.danger}
        onSelect={() => {
          action.onSelect();
        }}
      >
        {action.icon}
        {action.label}
      </Item>
    </Fragment>
  ));
}

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
        {renderActions(actions, ContextMenuItem, ContextMenuSeparator)}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// The trailing "more actions" button that opens the same actions as a dropdown.
export function RowActionDropdown({
  actions,
  label = "More actions",
}: {
  actions: RowAction[];
  label?: string;
}) {
  return (
    <DropdownMenu>
      <Tooltip content={label}>
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
            className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-text"
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
        {renderActions(actions, DropdownMenuItem, DropdownMenuSeparator)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
