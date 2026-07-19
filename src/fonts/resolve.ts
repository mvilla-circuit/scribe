import { canonicalizeFontId } from "./aliases";
import {
  DEFAULT_FONT_ID,
  FONT_ROLES,
  type FontMap,
  type ResolvedFonts,
} from "./catalog";

/**
 * Resolves the effective font for each role by layering partial maps in order
 * of increasing priority, then filling any still-unset role with its System
 * default. Pass them low -> high: resolveFonts(global, book, page).
 *
 * Legacy catalog ids are canonicalized here so loaders, metrics, and the picker
 * all see current registry ids — stored maps are never rewritten.
 */
export function resolveFonts(
  ...layers: (FontMap | null | undefined)[]
): ResolvedFonts {
  const resolved: Partial<ResolvedFonts> = {};
  for (const role of FONT_ROLES) {
    let chosen: string | undefined;
    for (const layer of layers) {
      const value = layer?.[role];
      if (typeof value === "string") chosen = value; // last layer wins
    }
    const id = chosen ?? DEFAULT_FONT_ID[role];
    resolved[role] = canonicalizeFontId(id);
  }
  // Every role in FONT_ROLES was just assigned, so the map is complete.
  return resolved as ResolvedFonts;
}
