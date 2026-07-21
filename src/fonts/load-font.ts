// Lazily loads a catalog font's CSS exactly once.
//
// Each web font's `load()` dynamically imports its Latin subset CSS (see
// catalog.ts), which Vite bundles as on-demand chunks. We cache by font id so a
// font is fetched at most once per session, and de-dupe concurrent requests for
// the same font (e.g. global + per-document resolution firing together).

import type { CSSProperties } from "react";

import { canonicalizeFontId } from "./aliases";
import { BRAND_FONT_ID, isCardillacAllowed } from "./brand";
import {
  FONT_REGISTRY,
  FONT_ROLES,
  type FontRole,
  type ResolvedFonts,
  resolveFontEntry,
} from "./catalog";
import { metricsFor } from "./metrics";

const loaded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

/**
 * True when the font needs no web CSS, or its CSS has already been loaded this
 * session. Used by the font picker to avoid applying a face before `@font-face`
 * rules exist (which would FOUT from the stack fallback into the real glyphs).
 */
export function isFontLoaded(fontId: string): boolean {
  const id = canonicalizeFontId(fontId);
  const entry = FONT_REGISTRY[id];
  if (!entry?.load) return true;
  return loaded.has(id);
}

/**
 * Ensures the font's web CSS is loaded. System defaults (no `load`) resolve
 * immediately. Failures (e.g. truly offline before first load) are swallowed so
 * the UI simply falls back to the stack's system fallback rather than throwing.
 *
 * Legacy ids are canonicalized so a stored alias still loads its successor.
 */
export function ensureFontLoaded(fontId: string): Promise<void> {
  const id = canonicalizeFontId(fontId);
  const entry = FONT_REGISTRY[id];
  if (!entry?.load || loaded.has(id)) return Promise.resolve();
  // Never inject Cardillac assets in commercial / disallowed builds.
  if (id === BRAND_FONT_ID && !isCardillacAllowed()) return Promise.resolve();

  const existing = inflight.get(id);
  if (existing) return existing;

  const promise = entry
    .load()
    .then(() => {
      loaded.add(id);
    })
    .catch(() => {
      // Leave it unloaded; a later attempt can retry.
    })
    .finally(() => {
      inflight.delete(id);
    });

  inflight.set(id, promise);
  return promise;
}

/**
 * Loads the font's CSS and waits until the given cuts are available to the
 * browser (so callers can paint the face without a `font-display: swap` FOUT).
 * Returns false when the CSS failed to load.
 */
export async function ensureFontReady(
  fontId: string,
  weights: readonly number[] = [400, 700],
): Promise<boolean> {
  const id = canonicalizeFontId(fontId);
  await ensureFontLoaded(id);
  if (!isFontLoaded(id)) return false;

  const entry = FONT_REGISTRY[id];
  if (!entry?.load) return true;

  const fonts = globalThis.document?.fonts;
  if (!fonts || typeof fonts.load !== "function") return true;

  const family = `"${entry.family}"`;
  try {
    await Promise.all(
      weights.flatMap((weight) => [
        fonts.load(`${weight} 16px ${family}`),
        fonts.load(`italic ${weight} 16px ${family}`),
      ]),
    );
  } catch {
    // CSS is present; callers may still paint the stack without a hard fail.
    return false;
  }

  return true;
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
 * Builds font-family and optical-metric custom properties for a resolved role ->
 * fontId map. Shared by the global hook (assigned to the document root) and the
 * scoped hook (an inline style on the reading surface) so both compute the same
 * variables the same way.
 */
export function fontVarsFor(resolved: ResolvedFonts): CSSProperties {
  const vars: CSSProperties = {};
  for (const role of FONT_ROLES) {
    const m = metricsFor(role, resolved[role]);
    vars[`--font-${role}`] = fontStackFor(resolved[role], role);
    vars[`--font-${role}-size`] = `${m.size}px`;
    vars[`--font-${role}-regular`] = `${m.regular}`;
    vars[`--font-${role}-bold`] = `${m.bold}`;
    vars[`--font-${role}-line`] = `${m.line}`;
    vars[`--font-${role}-spacing`] = `${m.spacing}em`;
  }
  return vars;
}

/** Lazily loads the web CSS for every role's font in a resolved map. */
export function ensureFontsLoaded(resolved: ResolvedFonts): void {
  for (const role of FONT_ROLES) void ensureFontLoaded(resolved[role]);
}
