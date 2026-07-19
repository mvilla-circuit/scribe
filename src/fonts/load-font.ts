// Lazily loads a catalog font's CSS exactly once.
//
// Each web font's `load()` dynamically imports its Latin subset CSS (see
// catalog.ts), which Vite bundles as on-demand chunks. We cache by font id so a
// font is fetched at most once per session, and de-dupe concurrent requests for
// the same font (e.g. global + per-document resolution firing together).

import type { CSSProperties } from "react";

import { canonicalizeFontId } from "./aliases";
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
  const display = metricsFor("display", resolved.display);
  const text = metricsFor("text", resolved.text);
  const code = metricsFor("code", resolved.code);

  return {
    "--font-display": fontStackFor(resolved.display, "display"),
    "--font-display-size": `${display.size}px`,
    "--font-display-regular": `${display.regular}`,
    "--font-display-bold": `${display.bold}`,
    "--font-display-line": `${display.line}`,
    "--font-display-spacing": `${display.spacing}em`,
    "--font-text": fontStackFor(resolved.text, "text"),
    "--font-text-size": `${text.size}px`,
    "--font-text-regular": `${text.regular}`,
    "--font-text-bold": `${text.bold}`,
    "--font-text-line": `${text.line}`,
    "--font-text-spacing": `${text.spacing}em`,
    "--font-code": fontStackFor(resolved.code, "code"),
    "--font-code-size": `${code.size}px`,
    "--font-code-regular": `${code.regular}`,
    "--font-code-bold": `${code.bold}`,
    "--font-code-line": `${code.line}`,
    "--font-code-spacing": `${code.spacing}em`,
  };
}

/** Lazily loads the web CSS for every role's font in a resolved map. */
export function ensureFontsLoaded(resolved: ResolvedFonts): void {
  for (const role of FONT_ROLES) void ensureFontLoaded(resolved[role]);
}
