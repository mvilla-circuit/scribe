import { useEffect } from "react";

import { profileFonts, useProfile } from "../data/profile";
import { DEFAULT_FONT_ID, FONT_ROLES, type FontRole } from "./catalog";
import { ensureFontLoaded, fontStackFor } from "./loadFont";

// The CSS variable each role drives on the reading surface.
const ROLE_VAR: Record<FontRole, string> = {
  display: "--font-display",
  text: "--font-text",
  code: "--font-code",
};

// Applies the global role -> font map to the document root: it points
// --font-display/text/code at each chosen font's stack and lazily loads the
// three fonts, re-running whenever the profile changes so the reading surface
// updates instantly. Mount once near the app root.
export function useGlobalFonts() {
  const { data: profile } = useProfile();
  const fonts = profileFonts(profile);

  // Resolve to concrete ids (with System fallbacks) so the effect's deps are
  // primitive strings and only re-run on a real change.
  const display = fonts.display ?? DEFAULT_FONT_ID.display;
  const text = fonts.text ?? DEFAULT_FONT_ID.text;
  const code = fonts.code ?? DEFAULT_FONT_ID.code;

  useEffect(() => {
    const root = document.documentElement;
    const byRole: Record<FontRole, string> = { display, text, code };
    for (const role of FONT_ROLES) {
      const fontId = byRole[role];
      root.style.setProperty(ROLE_VAR[role], fontStackFor(fontId, role));
      void ensureFontLoaded(fontId);
    }
  }, [display, text, code]);
}
