/* eslint-disable react-refresh/only-export-components */
import * as RContext from "@radix-ui/react-context-menu";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import {
  menuContentClass,
  menuItemClass,
  menuItemDangerClass,
  menuLabelClass,
  menuSeparatorClass,
} from "./menuStyles";

export const ContextMenu = RContext.Root;
export const ContextMenuTrigger = RContext.Trigger;
export const ContextMenuGroup = RContext.Group;

export const ContextMenuContent = forwardRef<
  React.ElementRef<typeof RContext.Content>,
  React.ComponentPropsWithoutRef<typeof RContext.Content>
>(({ className, ...props }, ref) => (
  <RContext.Portal>
    <RContext.Content
      ref={ref}
      className={cn(menuContentClass, className)}
      {...props}
    />
  </RContext.Portal>
));
ContextMenuContent.displayName = "ContextMenuContent";

export const ContextMenuItem = forwardRef<
  React.ElementRef<typeof RContext.Item>,
  React.ComponentPropsWithoutRef<typeof RContext.Item> & { danger?: boolean }
>(({ className, danger, ...props }, ref) => (
  <RContext.Item
    ref={ref}
    className={cn(danger ? menuItemDangerClass : menuItemClass, className)}
    {...props}
  />
));
ContextMenuItem.displayName = "ContextMenuItem";

export const ContextMenuLabel = forwardRef<
  React.ElementRef<typeof RContext.Label>,
  React.ComponentPropsWithoutRef<typeof RContext.Label>
>(({ className, ...props }, ref) => (
  <RContext.Label ref={ref} className={cn(menuLabelClass, className)} {...props} />
));
ContextMenuLabel.displayName = "ContextMenuLabel";

export const ContextMenuSeparator = forwardRef<
  React.ElementRef<typeof RContext.Separator>,
  React.ComponentPropsWithoutRef<typeof RContext.Separator>
>(({ className, ...props }, ref) => (
  <RContext.Separator
    ref={ref}
    className={cn(menuSeparatorClass, className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = "ContextMenuSeparator";
