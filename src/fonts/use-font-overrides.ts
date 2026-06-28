import { useEffect, useMemo, useRef } from "react";

import type { FontMap, FontRole } from "./catalog";
import { clearFontOverride, setFontOverride } from "./overrides";

/** Handlers a font control binds to: set one role, clear one, or clear all. */
export interface FontOverrideHandlers {
  setFont: (role: FontRole, fontId: string) => void;
  clearFont: (role: FontRole) => void;
  clearAll: () => void;
}

interface UseFontOverridesOptions {
  /** The current per-scope overrides (a page's or a book's). */
  overrides: FontMap;
  /**
   * Persist the next override map. Receives null instead of an empty map when
   * `collapseEmpty` is set (page scope drops to null; book scope keeps `{}`).
   */
  onChange: (fonts: FontMap | null) => void;
  /** Collapse an emptied map to null rather than `{}`. Defaults to false. */
  collapseEmpty?: boolean;
}

/**
 * Shared set/clear/clear-all logic for a scope's font overrides, used by both
 * the page (document) and book font controls. Keeps the merge/omit rules in one
 * place; callers only supply the current overrides and a persist callback.
 */
export function useFontOverrides({
  overrides,
  onChange,
  collapseEmpty = false,
}: UseFontOverridesOptions): FontOverrideHandlers {
  // Keep `onChange` in a ref so callers can pass an inline closure without
  // busting the memo below: the handlers stay referentially stable across
  // renders and only change when the override map (or collapse rule) does.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  return useMemo(
    () => ({
      setFont: (role, fontId) => {
        onChangeRef.current(setFontOverride(overrides, role, fontId));
      },
      clearFont: (role) => {
        onChangeRef.current(clearFontOverride(overrides, role, collapseEmpty));
      },
      clearAll: () => {
        onChangeRef.current(collapseEmpty ? null : {});
      },
    }),
    [overrides, collapseEmpty],
  );
}
