// Tiny class-name joiner: filters falsy values and joins with spaces.
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const RELATIVE_THRESHOLDS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

// "just now" / "3 hours ago" / "2 weeks ago" style relative time for an ISO
// timestamp. Falls back to "just now" for anything under a minute.
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
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

// Absolute timestamp for tooltips, e.g. "Jan 5, 2026, 3:42 PM".
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
