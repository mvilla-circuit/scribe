import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// The floating control cluster shared by the custom block NodeViews (callout,
// quote, essay, page link, link card). It owns the common shell — the
// `scribe-block-controls` chrome, the `contentEditable={false}` guard so the
// controls aren't typed into, and the `data-open` flag that keeps the cluster
// visible while a popover anchored inside it is open. Each view passes its own
// modifier class and the buttons/popovers that go inside.
export function BlockControls({
  className,
  open,
  children,
}: {
  /** View-specific modifier class (e.g. `scribe-callout-controls`). */
  className?: string;
  /** Keep the cluster shown while an inner popover is open. */
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("scribe-block-controls", className)}
      contentEditable={false}
      data-open={open || undefined}
    >
      {children}
    </div>
  );
}
