/* eslint-disable react-refresh/only-export-components */
import * as RDialog from "@radix-ui/react-dialog";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Dialog = RDialog.Root;
export const DialogClose = RDialog.Close;

export const DialogContent = forwardRef<
  React.ComponentRef<typeof RDialog.Content>,
  React.ComponentPropsWithoutRef<typeof RDialog.Content>
>(({ className, children, ...props }, ref) => (
  <RDialog.Portal>
    <RDialog.Overlay className="scribe-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
    <RDialog.Content
      ref={ref}
      className={cn(
        "scribe-dialog fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] " +
          "-translate-x-1/2 -translate-y-1/2 rounded-lg border border-border " +
          "bg-elevated p-5 shadow-popover outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </RDialog.Content>
  </RDialog.Portal>
));
DialogContent.displayName = "DialogContent";

export const DialogTitle = forwardRef<
  React.ComponentRef<typeof RDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RDialog.Title>
>(({ className, ...props }, ref) => (
  <RDialog.Title
    ref={ref}
    className={cn(
      "text-base font-semibold tracking-tight text-text",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  React.ComponentRef<typeof RDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RDialog.Description>
>(({ className, ...props }, ref) => (
  <RDialog.Description
    ref={ref}
    className={cn("mt-2 text-sm leading-relaxed text-muted", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";
