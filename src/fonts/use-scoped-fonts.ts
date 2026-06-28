import { type CSSProperties, useEffect } from "react";

import { type ResolvedFonts } from "./catalog";
import { ensureFontsLoaded, fontVarsFor } from "./load-font";

/**
 * Given a fully-resolved role -> fontId map, returns an inline style that points
 * --font-display/text/code at each font's stack (scoping them to whatever
 * element it is applied to) and lazily loads those fonts. Used on the reading
 * surface so a book/page's overrides win over the global root variables.
 */
export function useScopedFonts(resolved: ResolvedFonts): CSSProperties {
  const { display, text, code } = resolved;

  useEffect(() => {
    ensureFontsLoaded({ display, text, code });
  }, [display, text, code]);

  return fontVarsFor(resolved);
}
