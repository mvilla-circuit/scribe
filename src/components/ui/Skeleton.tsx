import type { CSSProperties } from "react";

import { cn } from "../../lib/utils";

interface SkeletonProps {
  /** CSS width (number → px, string → as-is). Defaults to 100%. */
  width?: number | string;
  /** CSS height (number → px, string → as-is). Defaults to 0.7rem. */
  height?: number | string;
  /** Override the default 4px corner radius (e.g. "9999px" for a circle). */
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}

const dim = (value: number | string | undefined): string | undefined =>
  typeof value === "number" ? `${value}px` : value;

// A single theme-aware shimmer bar. The `.scribe-skel` base (gradient, animation,
// reduced-motion handling) lives in index.css; this just sizes one instance.
export function Skeleton({
  width = "100%",
  height = "0.7rem",
  radius,
  className,
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn("scribe-skel", className)}
      style={{
        width: dim(width),
        height: dim(height),
        borderRadius: dim(radius),
        ...style,
      }}
    />
  );
}

// A stack of shimmer lines for paragraph-like placeholders. The last line is
// shortened so the block reads as text rather than a solid box.
export function SkeletonText({
  lines = 3,
  className,
  lineHeight = "0.7rem",
  gap = "0.5rem",
}: {
  lines?: number;
  className?: string;
  lineHeight?: number | string;
  gap?: number | string;
}) {
  return (
    <span
      aria-hidden
      className={cn("flex flex-col", className)}
      style={{ gap: dim(gap) }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </span>
  );
}
