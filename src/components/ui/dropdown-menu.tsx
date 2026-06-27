/* eslint-disable react-refresh/only-export-components -- Radix wrapper module that re-exports a whole family of DropdownMenu components, which trips react-refresh's single-component-export heuristic. */
import * as RDropdown from "@radix-ui/react-dropdown-menu";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

import {
  menuContentClass,
  menuItemClass,
  menuItemDangerClass,
  menuLabelClass,
  menuSeparatorClass,
} from "./menu-styles";

export const DropdownMenu = RDropdown.Root;
export const DropdownMenuTrigger = RDropdown.Trigger;
export const DropdownMenuSub = RDropdown.Sub;

export const DropdownMenuContent = forwardRef<
  React.ComponentRef<typeof RDropdown.Content>,
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
  React.ComponentRef<typeof RDropdown.Item>,
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
  React.ComponentRef<typeof RDropdown.Label>,
  React.ComponentPropsWithoutRef<typeof RDropdown.Label>
>(({ className, ...props }, ref) => (
  <RDropdown.Label
    ref={ref}
    className={cn(menuLabelClass, className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = forwardRef<
  React.ComponentRef<typeof RDropdown.Separator>,
  React.ComponentPropsWithoutRef<typeof RDropdown.Separator>
>(({ className, ...props }, ref) => (
  <RDropdown.Separator
    ref={ref}
    className={cn(menuSeparatorClass, className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export const DropdownMenuSubTrigger = forwardRef<
  React.ComponentRef<typeof RDropdown.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof RDropdown.SubTrigger>
>(({ className, ...props }, ref) => (
  <RDropdown.SubTrigger
    ref={ref}
    className={cn(menuItemClass, "data-[state=open]:bg-hover", className)}
    {...props}
  />
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

export const DropdownMenuSubContent = forwardRef<
  React.ComponentRef<typeof RDropdown.SubContent>,
  React.ComponentPropsWithoutRef<typeof RDropdown.SubContent>
>(({ className, ...props }, ref) => (
  <RDropdown.Portal>
    <RDropdown.SubContent
      ref={ref}
      className={cn(menuContentClass, className)}
      {...props}
    />
  </RDropdown.Portal>
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
