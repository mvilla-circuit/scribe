import { useEffect } from "react";

import { profileFonts, useProfile } from "@/data/profile";

import { ensureFontsLoaded, fontVarsFor } from "./load-font";
import { resolveFonts } from "./resolve";

/**
 * Applies the global role -> font map to the document root: it points
 * --font-display/text/code at each chosen font's stack and lazily loads the
 * three fonts, re-running whenever the profile changes so the reading surface
 * updates instantly. Mount once near the app root.
 */
export function useGlobalFonts() {
  const { data: profile } = useProfile();
  // Resolve to concrete ids (with System fallbacks) so the effect's deps are
  // primitive strings and it only re-runs on a real change.
  const { display, text, code } = resolveFonts(profileFonts(profile));

  useEffect(() => {
    const resolved = { display, text, code };
    const root = document.documentElement;
    for (const [name, value] of Object.entries(fontVarsFor(resolved))) {
      if (typeof value === "string") root.style.setProperty(name, value);
    }
    ensureFontsLoaded(resolved);
  }, [display, text, code]);
}
