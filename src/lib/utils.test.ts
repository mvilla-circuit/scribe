import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cn, formatDateTime, formatRelativeTime } from "./utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false, undefined, "b", null, "c")).toBe("a b c");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' under a minute", () => {
    expect(formatRelativeTime("2026-06-27T11:59:30.000Z")).toBe("just now");
  });

  it("formats hours and weeks in the past", () => {
    expect(formatRelativeTime("2026-06-27T10:00:00.000Z")).toBe("2 hours ago");
    expect(formatRelativeTime("2026-06-13T12:00:00.000Z")).toBe("2 weeks ago");
  });

  it("returns an empty string for an invalid timestamp", () => {
    expect(formatRelativeTime("not-a-date")).toBe("");
  });

  describe("compact", () => {
    const compact = (iso: string) => formatRelativeTime(iso, { compact: true });

    it("uses the terse m/h/d ago style for recent instants", () => {
      expect(compact("2026-06-27T11:59:30.000Z")).toBe("Just now");
      expect(compact("2026-06-27T11:30:00.000Z")).toBe("30m ago");
      expect(compact("2026-06-27T10:00:00.000Z")).toBe("2h ago");
      expect(compact("2026-06-24T12:00:00.000Z")).toBe("3d ago");
    });

    it("falls back to an absolute month/day after a week", () => {
      expect(compact("2026-06-13T12:00:00.000Z")).toMatch(/Jun/);
    });

    it("returns an empty string for an invalid timestamp", () => {
      expect(compact("not-a-date")).toBe("");
    });
  });
});

describe("formatDateTime", () => {
  it("renders an absolute date string for a valid timestamp", () => {
    const formatted = formatDateTime("2026-01-05T15:42:00.000Z");
    expect(formatted).not.toBe("");
    expect(formatted).toMatch(/2026/);
  });

  it("returns an empty string for an invalid timestamp", () => {
    expect(formatDateTime("nope")).toBe("");
  });
});
