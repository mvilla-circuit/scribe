import { type CSSProperties, useEffect } from "react";

import { type ResolvedFonts } from "./catalog";
import { ensureFontLoaded, fontStackFor } from "./loadFont";

/**
 * Given a fully-resolved role -> fontId map, returns an inline style that points
 * --font-display/text/code at each font's stack (scoping them to whatever
 * element it is applied to) and lazily loads those fonts. Used on the reading
 * surface so a book/page's overrides win over the global root variables.
 */
export function useScopedFonts(resolved: ResolvedFonts): CSSProperties {
  const { display, text, code } = resolved;

  useEffect(() => {
    void ensureFontLoaded(display);
    void ensureFontLoaded(text);
    void ensureFontLoaded(code);
  }, [display, text, code]);

  return {
    "--font-display": fontStackFor(display, "display"),
    "--font-text": fontStackFor(text, "text"),
    "--font-code": fontStackFor(code, "code"),
  };
}
