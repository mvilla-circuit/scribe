import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared bordered chrome (border, surface background, focus ring) for every
 * single-line text input in the app. A thin wrapper around the native
 * `<input>` so every field — search boxes, inline forms, dialogs — looks and
 * behaves the same; forwards its ref so callers can focus or measure the
 * underlying element directly.
 */
export const Input = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<"input">
>(({ className, ...props }, ref) => (
  // eslint-disable-next-line no-restricted-syntax -- Input is the design-system wrapper around the native control
  <input
    ref={ref}
    className={cn(
      "h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
