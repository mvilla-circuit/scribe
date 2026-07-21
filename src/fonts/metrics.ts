/**
 * Per-role optical metrics for catalog fonts.
 *
 * Metrics are keyed by `(role, fontId)` so the same face (e.g. Literata) can
 * use different size/weight/line/tracking as a title vs body. Values come from
 * the locked type-lab / mono-lab snapshots in `metrics.json`. Fontsource
 * weights are the exact lab cut when available; otherwise the nearest higher
 * cut, or the package maximum when no higher cut exists.
 */

import { canonicalizeFontId } from "./aliases";
import type { FontRole } from "./catalog";
import raw from "./metrics.json";

/** Optical metrics for one face in one role. */
export interface FontMetrics {
  /** Baseline size in px (the only hardcoded type size on the reading surface). */
  size: number;
  /** Default / regular weight. */
  regular: number;
  /** Emphasis / strong weight. */
  bold: number;
  /** Unitless line-height. */
  line: number;
  /** Letter-spacing in em. */
  spacing: number;
}

type MetricsTable = Record<FontRole, Record<string, FontMetrics>>;

const METRICS = raw as MetricsTable;

/**
 * Fallbacks when a stored id has no lab metrics (unknown / partial catalogs).
 * Sized to match the historic editor defaults (~17px body, display titles, code).
 */
export const ROLE_METRIC_DEFAULTS: Record<FontRole, FontMetrics> = {
  display: { size: 50, regular: 400, bold: 700, line: 1.42, spacing: -0.01 },
  text: { size: 16, regular: 400, bold: 700, line: 1.55, spacing: 0 },
  code: { size: 16, regular: 400, bold: 700, line: 1.55, spacing: 0 },
};

/**
 * Looks up lab-locked metrics for a font in a role. Legacy ids are
 * canonicalized first so metrics stay aligned with `resolveFontEntry` /
 * loaders. Unknown ids return the role default so the reading surface always
 * has a usable baseline.
 */
export function metricsFor(role: FontRole, fontId: string): FontMetrics {
  const id = canonicalizeFontId(fontId);
  return METRICS[role][id] ?? ROLE_METRIC_DEFAULTS[role];
}

/**
 * Union of regular/bold weights across every role that lists `fontId`, so a
 * shared face loads every cut the cascade might need.
 */
export function weightUnionFor(fontId: string): number[] {
  const id = canonicalizeFontId(fontId);
  const weights = new Set<number>();
  for (const role of Object.keys(METRICS) as FontRole[]) {
    const m = METRICS[role][id];
    if (!m) continue;
    weights.add(m.regular);
    weights.add(m.bold);
  }
  return [...weights].sort((a, b) => a - b);
}
