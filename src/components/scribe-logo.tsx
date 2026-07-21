import { Feather } from "lucide-react";
import { useEffect, useState } from "react";

import { ensureFontReady } from "@/fonts/load-font";
import { makeIcon } from "@/lib/make-icon";
import { cn } from "@/lib/utils";

// The Scribe brand mark: a feather/quill pen, drawn in the chrome icon style.
const ScribeMark = makeIcon(Feather);

/** Cardillac lab weights used by the wordmark (semibold + italic). */
const BRAND_WEIGHTS = [500, 600] as const;

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
 * Cardillac and italicized. The serif/italic treatment is a deliberate
 * exception to the sans-only chrome rule — it is the one place the brand signs
 * its name.
 */
export function ScribeLogo({
  iconSize = 18,
  className,
  textClassName,
  iconClassName,
}: ScribeLogoProps) {
  // Hide the wordmark until Cardillac cuts are ready so we don't FOUT from the
  // --font-brand stack fallback (New York) into the real face.
  const [faceReady, setFaceReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureFontReady("cardillac", BRAND_WEIGHTS).then((ready) => {
      if (!cancelled && ready) setFaceReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
          "font-semibold italic tracking-tight text-text",
          textClassName,
        )}
        style={{
          fontFamily: "var(--font-brand)",
          opacity: faceReady ? 1 : 0,
        }}
      >
        Scribe
      </span>
    </span>
  );
}
