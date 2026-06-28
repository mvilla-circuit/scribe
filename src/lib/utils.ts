import { twMerge } from "tailwind-merge";

import type { Json } from "@/lib/database.types";

/**
 * Class-name joiner: drops falsy values and resolves conflicting Tailwind
 * utilities so the last one wins (e.g. `cn("p-2", "p-4")` -> `"p-4"`). This
 * makes `cn(base, className)` overrides behave as written rather than depending
 * on CSS source order.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return twMerge(parts.filter(Boolean));
}

/**
 * Narrows an untrusted jsonb value to a plain object, returning an empty object
 * for null, arrays, and primitives. Centralizes the "is this a usable jsonb
 * object?" guard the typed column views (book theme, font overrides, profile
 * fonts) share before reading their fields.
 */
export function asJsonObject(
  value: Json | undefined,
): Record<string, Json | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

const RELATIVE_THRESHOLDS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/** Terse "Just now" / "5m ago" / "3d ago" / "Jun 5" style for a past instant. */
function formatCompactRelative(then: number): string {
  const elapsed = Date.now() - then;
  if (elapsed < MINUTE_MS) return "Just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  if (elapsed < WEEK_MS) return `${Math.floor(elapsed / DAY_MS)}d ago`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface RelativeTimeOptions {
  /**
   * Use the terse "5m ago" / "Jun 5" style (for tight UI like list rows)
   * instead of the spelled-out "5 minutes ago". Defaults to false.
   */
  compact?: boolean;
}

/**
 * "just now" / "3 hours ago" / "2 weeks ago" style relative time for an ISO
 * timestamp. Falls back to "just now" for anything under a minute. Pass
 * `{ compact: true }` for the terse "5m ago" / "Jun 5" variant.
 */
export function formatRelativeTime(
  iso: string,
  { compact = false }: RelativeTimeOptions = {},
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  if (compact) return formatCompactRelative(then);
  const seconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, secondsPerUnit] of RELATIVE_THRESHOLDS) {
    if (abs >= secondsPerUnit) {
      return rtf.format(Math.round(seconds / secondsPerUnit), unit);
    }
  }
  return "just now";
}

/** The decision an inline editor makes when it settles a draft. */
export type EditedValue =
  | { readonly commit: true; readonly value: string }
  | { readonly commit: false };

/**
 * Trims an edited draft and decides whether it should be persisted. A blank
 * draft (unless `allowEmpty`) or one that matches the previous value yields
 * `{ commit: false }` so the caller can revert/close without a redundant write;
 * otherwise it returns the trimmed value to commit. Shared by the inline rename
 * field and the reading-surface title/subtitle editors so both settle the same
 * way on blur/Enter.
 */
export function resolveEditedValue(
  draft: string,
  { previous, allowEmpty = false }: { previous: string; allowEmpty?: boolean },
): EditedValue {
  const trimmed = draft.trim();
  if (!trimmed && !allowEmpty) return { commit: false };
  if (trimmed === previous) return { commit: false };
  return { commit: true, value: trimmed };
}

/** Absolute timestamp for tooltips, e.g. "Jan 5, 2026, 3:42 PM". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
