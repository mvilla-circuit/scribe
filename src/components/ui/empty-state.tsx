import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// The shared dashed-bordered panel used wherever a list, collection, or grid
// has nothing in it yet (collections, datagrids, the table of contents). It
// is purely presentational -- callers own any create affordance and pass it
// in as `cta` -- so the wording and icon stay bespoke per surface while the
// frame, spacing, and typography stay consistent.
export function EmptyState({
  title,
  body,
  cta,
  icon,
  className,
}: {
  title: string;
  body: string;
  cta?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      {icon}
      <p
        className={cn(
          "text-sm font-medium text-text",
          icon ? "mt-3" : undefined,
        )}
      >
        {title}
      </p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
