import { type CSSProperties, useMemo } from "react";

import type { EntryMeta } from "@/data/entries";
import { entryFontOverrides } from "@/data/entries";
import { profileFonts, useProfile } from "@/data/profile";

import type { FontMap, ResolvedFonts } from "./catalog";
import { resolveFonts } from "./resolve";
import {
  type FontOverrideHandlers,
  useFontOverrides,
} from "./use-font-overrides";
import { useScopedFonts } from "./use-scoped-fonts";

interface UseEntryFontsOptions {
  /** The entry being edited, or null while it's loading/unselected. */
  entry: EntryMeta | null;
  /** Persist the entry's next override map (null clears it — "Inherit"). */
  onChangeOverrides: (fonts: FontMap | null) => void;
}

/** The resolved font cascade plus the handles an entry's reading surface needs. */
export interface EntryFonts {
  /** Inline style scoping --font-display/text/code onto the reading surface. */
  fontVars: CSSProperties;
  /** The fully-resolved fonts after layering global -> entry. */
  resolved: ResolvedFonts;
  /** Resolved fonts for the global layer alone (what the entry inherits). */
  inherited: ResolvedFonts;
  /** The entry's own overrides. */
  overrides: FontMap;
  /** set/clear/clear-all handlers bound to the entry's overrides. */
  handlers: FontOverrideHandlers;
}

/**
 * Resolves the font cascade for an entry's reading surface and wires its
 * override handlers. Entries cascade straight from the global font map, with
 * no collection layer in between. Pass `entry: null` (loading/unselected) to
 * get a safe global-only resolution; the returned handlers are inert until a
 * real entry is available since callers gate `onChangeOverrides` on it.
 */
export function useEntryFonts({
  entry,
  onChangeOverrides,
}: UseEntryFontsOptions): EntryFonts {
  const { data: profile } = useProfile();

  // Recompute only when the profile or entry changes (same memo shape as
  // useCascadedFonts).
  const { overrides, inherited, resolved } = useMemo(() => {
    const globalFonts = profileFonts(profile);
    const entryOverrides = entry ? entryFontOverrides(entry) : {};
    return {
      overrides: entryOverrides,
      inherited: resolveFonts(globalFonts),
      resolved: resolveFonts(globalFonts, entryOverrides),
    };
  }, [profile, entry]);

  const fontVars = useScopedFonts(resolved);

  const handlers = useFontOverrides({
    overrides,
    collapseEmpty: true,
    onChange: onChangeOverrides,
  });

  return { fontVars, resolved, inherited, overrides, handlers };
}
