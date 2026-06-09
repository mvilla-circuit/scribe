import {
  DEFAULT_FONT_ID,
  FONT_ROLES,
  type FontMap,
  type ResolvedFonts,
} from "./catalog";

// Resolves the effective font for each role by layering partial maps in order
// of increasing priority, then filling any still-unset role with its System
// default. Pass them low -> high: resolveFonts(global, book, page).
export function resolveFonts(
  ...layers: (FontMap | null | undefined)[]
): ResolvedFonts {
  const resolved = {} as ResolvedFonts;
  for (const role of FONT_ROLES) {
    let chosen: string | undefined;
    for (const layer of layers) {
      const value = layer?.[role];
      if (typeof value === "string") chosen = value; // last layer wins
    }
    resolved[role] = chosen ?? DEFAULT_FONT_ID[role];
  }
  return resolved;
}
