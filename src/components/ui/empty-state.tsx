import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateTone = "chrome" | "editorial";

interface EmptyStateProps {
  title: string;
  body: string;
  /** Optional create affordance; callers own the CTA content. */
  cta?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /**
   * Typography scale. `chrome` (default) is the quiet app-empty copy;
   * `editorial` matches reading-surface empties (e.g. book TOC) with a
   * larger title/body.
   */
  tone?: EmptyStateTone;
  /** Inline styles for the title (e.g. book display font). */
  titleStyle?: CSSProperties;
  titleClassName?: string;
}

const TITLE_TONE: Record<EmptyStateTone, string> = {
  chrome: "text-sm font-medium text-text",
  editorial: "text-base text-text",
};

const BODY_TONE: Record<EmptyStateTone, string> = {
  chrome: "mt-1 max-w-sm text-xs leading-relaxed text-muted",
  editorial: "mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted",
};

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
  tone = "chrome",
  titleStyle,
  titleClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-10 text-center",
        tone === "editorial" && "py-8",
        className,
      )}
    >
      {icon}
      <p
        className={cn(TITLE_TONE[tone], icon ? "mt-3" : null, titleClassName)}
        style={titleStyle}
      >
        {title}
      </p>
      <p className={BODY_TONE[tone]}>{body}</p>
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  );
}
