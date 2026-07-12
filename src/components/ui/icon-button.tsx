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
  "className" | "children" | "onClick" | "type"
> {
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
  /** Tooltip placement relative to the button; defaults to `bottom`. */
  side?: ComponentProps<typeof Tooltip>["side"];
  className?: string;
  type?: "button" | "submit" | "reset";
}

/**
 * A square, icon-only chrome control: a muted button that warms on hover and
 * fills with the selected token when active. Wraps its own {@link Tooltip} so
 * callers don't need to add one — `label` doubles as the accessible name and
 * the hover hint. Forwards remaining native button attributes (`disabled`,
 * `aria-current`, …) so callers can compose it for nav-style controls without
 * widening this primitive's typed API.
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
      className,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <Tooltip content={label} side={side}>
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
      </Tooltip>
    );
  },
);
