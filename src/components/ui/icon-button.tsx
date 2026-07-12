import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import { Tooltip } from "./tooltip";

type IconButtonSize = "sm" | "md";

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

interface IconButtonProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "className" | "children" | "type"
> {
  /** Hover tooltip text and the button's accessible name. */
  label: string;
  /** The icon to render, centered in the button. */
  children: ReactNode;
  /** Whether this control represents the current selection. */
  selected?: boolean;
  /** Square dimensions; defaults to `md` (9x9). */
  size?: IconButtonSize;
  /** Tooltip placement relative to the button; defaults to `bottom`. */
  side?: ComponentProps<typeof Tooltip>["side"];
  /**
   * When false, render the bare button so a parent can own the tooltip
   * (e.g. `Tooltip` wrapping `PopoverTrigger asChild`). Defaults to true.
   */
  tooltip?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

/**
 * A square, icon-only chrome control: a muted button that warms on hover and
 * fills with the selected token when active. Wraps its own {@link Tooltip} by
 * default so callers don't need to add one — `label` doubles as the accessible
 * name and the hover hint. Pass `tooltip={false}` when composing with Radix
 * `asChild` triggers that need a single button element. Forwards remaining
 * native button attributes (`disabled`, `aria-current`, `aria-pressed`, …).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      onClick,
      children,
      selected,
      size = "md",
      side,
      tooltip = true,
      className,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const button = (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        aria-label={label}
        className={cn(
          "flex items-center justify-center rounded-md font-sans outline-none",
          "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-40",
          SIZE_CLASSES[size],
          selected
            ? "bg-selected text-text"
            : "text-muted hover:bg-hover hover:text-text",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );

    if (!tooltip) return button;
    return (
      <Tooltip content={label} side={side}>
        {button}
      </Tooltip>
    );
  },
);
