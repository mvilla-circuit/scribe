import { Feather } from "lucide-react";

import { makeIcon } from "@/lib/make-icon";
import { cn } from "@/lib/utils";

// The Scribe brand mark: a feather/quill pen, drawn in the chrome icon style.
const ScribeMark = makeIcon(Feather);

interface ScribeLogoProps {
  /** Pixel size of the leading feather mark. Defaults to 18. */
  iconSize?: number;
  /** Extra classes for the root row that wraps the mark and wordmark. */
  className?: string;
  /** Extra classes for the "Scribe" wordmark (e.g. its size). */
  textClassName?: string;
  /** Extra classes for the feather mark. */
  iconClassName?: string;
}

/**
 * The Scribe logo: the feather brand mark beside the "Scribe" wordmark, set in
 * the stable system serif face and italicized. The serif/italic treatment is a
 * deliberate exception to the sans-only chrome rule — it is the one place the
 * brand signs its name.
 */
export function ScribeLogo({
  iconSize = 18,
  className,
  textClassName,
  iconClassName,
}: ScribeLogoProps) {
  return (
    <span
      className={cn("inline-flex select-none items-center gap-1.5", className)}
    >
      <ScribeMark
        size={iconSize}
        className={cn("text-accent", iconClassName)}
      />
      <span
        className={cn(
          "font-serif font-semibold italic tracking-tight text-text",
          textClassName,
        )}
      >
        Scribe
      </span>
    </span>
  );
}
