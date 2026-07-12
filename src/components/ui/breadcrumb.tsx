import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared `/` separator for in-app breadcrumb trails. */
export function BreadcrumbSep() {
  return <span className="shrink-0 select-none text-muted/50">/</span>;
}

/** Clickable ancestor crumb in a breadcrumb trail. */
export function BreadcrumbLink({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-0 shrink truncate rounded-sm px-1 outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Flex row that holds breadcrumb crumbs and separators. Callers compose
 * `BreadcrumbLink` / `BreadcrumbSep` / a current crumb as children.
 */
export function Breadcrumb({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Optional accessible name when the parent nav is not already "Breadcrumb". */
  label?: string;
}) {
  return (
    <div
      aria-label={label}
      className={cn(
        "flex min-w-0 items-center gap-1 text-sm text-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}
