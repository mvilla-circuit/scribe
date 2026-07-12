import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Tooltip } from "./tooltip";

type IconButtonSize = "sm" | "md";

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

interface IconButtonProps {
  /** Hover tooltip text and the button's accessible name. */
  label: string;
  /** Activated on click. */
  onClick: () => void;
  /** The icon to render, centered in the button. */
  children: ReactNode;
  /** Whether this control represents the current selection. */
  selected?: boolean;
  /** Square dimensions; defaults to `md` (9x9). */
  size?: IconButtonSize;
  className?: string;
  type?: "button" | "submit" | "reset";
}

/**
 * A square, icon-only chrome control: a muted button that warms on hover and
 * fills with the selected token when active. Wraps its own {@link Tooltip} so
 * callers don't need to add one — `label` doubles as the accessible name and
 * the hover hint.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      onClick,
      children,
      selected,
      size = "md",
      className,
      type = "button",
    },
    ref,
  ) {
    return (
      <Tooltip content={label}>
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          aria-label={label}
          className={cn(
            "flex items-center justify-center rounded-md font-sans outline-none",
            "transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            SIZE_CLASSES[size],
            selected
              ? "bg-selected text-text"
              : "text-muted hover:bg-hover hover:text-text",
            className,
          )}
        >
          {children}
        </button>
      </Tooltip>
    );
  },
);
