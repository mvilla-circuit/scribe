import type { FontMap, FontRole } from "./catalog";

/** Set one role's font, returning the next override map (input untouched). */
export function setFontOverride(
  overrides: FontMap,
  role: FontRole,
  fontId: string,
): FontMap {
  return { ...overrides, [role]: fontId };
}

/**
 * Remove one role's override, returning the remaining map — or null when that
 * empties the map and `collapseEmpty` is set, so a page can drop its override
 * row entirely (book scope keeps an empty `{}` instead).
 */
export function clearFontOverride(
  overrides: FontMap,
  role: FontRole,
  collapseEmpty: boolean,
): FontMap | null {
  const { [role]: _removed, ...rest } = overrides;
  if (collapseEmpty && Object.keys(rest).length === 0) return null;
  return rest;
}
