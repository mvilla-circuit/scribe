/* eslint-disable react-refresh/only-export-components -- Radix wrapper module that re-exports a whole family of Popover components, which trips react-refresh's single-component-export heuristic. */
import * as RPopover from "@radix-ui/react-popover";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Popover = RPopover.Root;
export const PopoverTrigger = RPopover.Trigger;
export const PopoverAnchor = RPopover.Anchor;

export const PopoverContent = forwardRef<
  React.ComponentRef<typeof RPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RPopover.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <RPopover.Portal>
    <RPopover.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "scribe-pop z-50 rounded-lg border border-border bg-elevated text-text shadow-popover outline-none font-sans",
        className,
      )}
      {...props}
    />
  </RPopover.Portal>
));
PopoverContent.displayName = "PopoverContent";
