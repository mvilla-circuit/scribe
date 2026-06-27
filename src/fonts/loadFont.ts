// Lazily loads a catalog font's CSS exactly once.
//
// Each web font's `load()` dynamically imports its Latin subset CSS (see
// catalog.ts), which Vite bundles as on-demand chunks. We cache by font id so a
// font is fetched at most once per session, and de-dupe concurrent requests for
// the same font (e.g. global + per-document resolution firing together).

import { FONT_REGISTRY, type FontRole, resolveFontEntry } from "./catalog";

const loaded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

// Ensures the font's web CSS is loaded. System defaults (no `load`) resolve
// immediately. Failures (e.g. truly offline before first load) are swallowed so
// the UI simply falls back to the stack's system fallback rather than throwing.
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

// Resolves a font id to the CSS `font-family` stack to assign to a role
// variable, falling back to the role's System default for unknown ids.
export function fontStackFor(
  fontId: string | undefined,
  role: FontRole,
): string {
  return resolveFontEntry(fontId, role).stack;
}
