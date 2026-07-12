import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  body: string;
  /** Optional create affordance; callers own the CTA content. */
  cta?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * Dashed-bordered empty panel for lists, collections, and grids. Purely
 * presentational — wording and icon stay bespoke per surface while the frame,
 * spacing, and typography stay consistent.
 */
export function EmptyState({
  title,
  body,
  cta,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      {icon}
      <p className={cn("text-sm font-medium text-text", icon ? "mt-3" : null)}>
        {title}
      </p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{body}</p>
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  );
}
