/* eslint-disable react-refresh/only-export-components */
import * as RDropdown from "@radix-ui/react-dropdown-menu";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import {
  menuContentClass,
  menuItemClass,
  menuItemDangerClass,
  menuLabelClass,
  menuSeparatorClass,
} from "./menuStyles";

export const DropdownMenu = RDropdown.Root;
export const DropdownMenuTrigger = RDropdown.Trigger;
export const DropdownMenuGroup = RDropdown.Group;

export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof RDropdown.Content>,
  React.ComponentPropsWithoutRef<typeof RDropdown.Content>
>(({ className, sideOffset = 6, align = "start", ...props }, ref) => (
  <RDropdown.Portal>
    <RDropdown.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(menuContentClass, className)}
      {...props}
    />
  </RDropdown.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof RDropdown.Item>,
  React.ComponentPropsWithoutRef<typeof RDropdown.Item> & { danger?: boolean }
>(({ className, danger, ...props }, ref) => (
  <RDropdown.Item
    ref={ref}
    className={cn(danger ? menuItemDangerClass : menuItemClass, className)}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = forwardRef<
  React.ElementRef<typeof RDropdown.Label>,
  React.ComponentPropsWithoutRef<typeof RDropdown.Label>
>(({ className, ...props }, ref) => (
  <RDropdown.Label ref={ref} className={cn(menuLabelClass, className)} {...props} />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = forwardRef<
  React.ElementRef<typeof RDropdown.Separator>,
  React.ComponentPropsWithoutRef<typeof RDropdown.Separator>
>(({ className, ...props }, ref) => (
  <RDropdown.Separator
    ref={ref}
    className={cn(menuSeparatorClass, className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
