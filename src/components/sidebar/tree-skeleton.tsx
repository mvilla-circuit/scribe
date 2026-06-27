import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  SIDEBAR_ICON_SIZE,
  SIDEBAR_ROW_GAP,
  sidebarRowPadding,
} from "./sidebar-row";

// Placeholder rows matching the tree's row metrics (height, icon slot, indent),
// so the real Library tree / book Outline swap in without any layout shift.
// `depths` drives how many rows render and how indented each one is; the varied
// label widths keep it from reading as a flat block.
const LABEL_WIDTHS = ["72%", "58%", "66%", "48%", "61%", "54%", "70%"];

export function TreeSkeleton({
  depths = [0, 0, 1, 1, 0, 0],
}: {
  depths?: number[];
}) {
  return (
    <div aria-hidden className={cn("flex flex-col", SIDEBAR_ROW_GAP)}>
      {depths.map((depth, i) => (
        <div
          key={i}
          style={{ paddingLeft: sidebarRowPadding(depth) }}
          className="flex h-9 items-center gap-2 rounded-md pr-1"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <Skeleton width={SIDEBAR_ICON_SIZE} height={SIDEBAR_ICON_SIZE} />
          </span>
          <Skeleton
            height="0.8rem"
            width={LABEL_WIDTHS[i % LABEL_WIDTHS.length]}
          />
        </div>
      ))}
    </div>
  );
}
