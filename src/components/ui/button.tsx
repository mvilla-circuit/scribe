import { forwardRef } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium " +
  "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:opacity-90 px-3 py-1.5",
  secondary:
    "border border-border bg-surface text-text hover:bg-hover px-3 py-1.5",
  ghost: "text-muted hover:bg-hover hover:text-text px-3 py-1.5",
  danger: "bg-danger text-white hover:opacity-90 px-3 py-1.5",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "secondary", type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(base, variants[variant], className)}
    {...props}
  />
));
Button.displayName = "Button";
