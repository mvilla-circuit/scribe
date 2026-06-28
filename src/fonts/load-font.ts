// Lazily loads a catalog font's CSS exactly once.
//
// Each web font's `load()` dynamically imports its Latin subset CSS (see
// catalog.ts), which Vite bundles as on-demand chunks. We cache by font id so a
// font is fetched at most once per session, and de-dupe concurrent requests for
// the same font (e.g. global + per-document resolution firing together).

import type { CSSProperties } from "react";

import {
  FONT_REGISTRY,
  FONT_ROLES,
  type FontRole,
  type ResolvedFonts,
  resolveFontEntry,
} from "./catalog";

const loaded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

/**
 * Ensures the font's web CSS is loaded. System defaults (no `load`) resolve
 * immediately. Failures (e.g. truly offline before first load) are swallowed so
 * the UI simply falls back to the stack's system fallback rather than throwing.
 */
export function ensureFontLoaded(fontId: string): Promise<void> {
  const entry = FONT_REGISTRY[fontId];
  if (!entry?.load || loaded.has(fontId)) return Promise.resolve();

  const existing = inflight.get(fontId);
  if (existing) return existing;

  const promise = entry
    .load()
    .then(() => {
      loaded.add(fontId);
    })
    .catch(() => {
      // Leave it unloaded; a later attempt can retry.
    })
    .finally(() => {
      inflight.delete(fontId);
    });

  inflight.set(fontId, promise);
  return promise;
}

/**
 * Resolves a font id to the CSS `font-family` stack to assign to a role
 * variable, falling back to the role's System default for unknown ids.
 */
export function fontStackFor(
  fontId: string | undefined,
  role: FontRole,
): string {
  return resolveFontEntry(fontId, role).stack;
}

/**
 * Builds the `--font-display/text/code` custom properties for a resolved
 * role -> fontId map. Shared by the global hook (assigned to the document root)
 * and the scoped hook (an inline style on the reading surface) so both compute
 * the same variables the same way.
 */
export function fontVarsFor(resolved: ResolvedFonts): CSSProperties {
  return {
    "--font-display": fontStackFor(resolved.display, "display"),
    "--font-text": fontStackFor(resolved.text, "text"),
    "--font-code": fontStackFor(resolved.code, "code"),
  };
}

/** Lazily loads the web CSS for every role's font in a resolved map. */
export function ensureFontsLoaded(resolved: ResolvedFonts): void {
  for (const role of FONT_ROLES) void ensureFontLoaded(resolved[role]);
}
