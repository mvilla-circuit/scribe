import { Feather } from "lucide-react";
import { useEffect, useState } from "react";

import { isCardillacAllowed } from "@/fonts/brand";
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
  const cardillacAllowed = isCardillacAllowed();
  // Hide briefly until Cardillac is ready (when allowed) to avoid FOUT. Always
  // reveal afterward — including on load failure — so the wordmark never stays
  // invisible on the brand stack fallback.
  const [faceReady, setFaceReady] = useState(() => !cardillacAllowed);

  useEffect(() => {
    if (!cardillacAllowed) return;
    let cancelled = false;
    void ensureFontReady("cardillac", BRAND_WEIGHTS)
      .then(() => {
        if (!cancelled) setFaceReady(true);
      })
      .catch(() => {
        if (!cancelled) setFaceReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cardillacAllowed]);

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
