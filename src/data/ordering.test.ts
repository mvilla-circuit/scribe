import { describe, expect, it } from "vitest";

import { byPosition, endPositionFor, getPositionBetween } from "./ordering";

describe("getPositionBetween", () => {
  it("returns the step when the list is empty (no neighbours)", () => {
    expect(getPositionBetween(undefined, undefined)).toBe(1024);
  });

  it("inserts a step below the first item when dropping at the head", () => {
    expect(getPositionBetween(undefined, 1024)).toBe(0);
    expect(getPositionBetween(undefined, 100)).toBe(100 - 1024);
  });

  it("inserts a step above the last item when dropping at the tail", () => {
    expect(getPositionBetween(2048, undefined)).toBe(2048 + 1024);
  });

  it("returns the midpoint between two neighbours", () => {
    expect(getPositionBetween(1000, 2000)).toBe(1500);
    expect(getPositionBetween(0, 1024)).toBe(512);
  });

  it("keeps splitting a shrinking gap (fractional indexing)", () => {
    const mid = getPositionBetween(512, 513);
    expect(mid).toBeGreaterThan(512);
    expect(mid).toBeLessThan(513);
  });
});

describe("endPositionFor", () => {
  it("returns the first slot for an empty container", () => {
    expect(endPositionFor([])).toBe(1024);
  });

  it("steps past the largest existing position", () => {
    expect(endPositionFor([{ position: 1024 }, { position: 2048 }])).toBe(
      2048 + 1024,
    );
  });

  it("ignores the order of the siblings", () => {
    expect(endPositionFor([{ position: 3072 }, { position: 1024 }])).toBe(
      3072 + 1024,
    );
  });
});

describe("byPosition", () => {
  const row = (position: number, createdAt: string) => ({
    position,
    created_at: createdAt,
  });

  it("orders by position ascending", () => {
    const items = [
      row(3072, "2026-01-01T00:00:00.000Z"),
      row(1024, "2026-01-01T00:00:00.000Z"),
      row(2048, "2026-01-01T00:00:00.000Z"),
    ];
    expect(
      items
        .slice()
        .sort(byPosition)
        .map((r) => r.position),
    ).toEqual([1024, 2048, 3072]);
  });

  it("breaks position ties by created_at", () => {
    const older = row(1024, "2026-01-01T00:00:00.000Z");
    const newer = row(1024, "2026-02-01T00:00:00.000Z");
    expect([newer, older].sort(byPosition)).toEqual([older, newer]);
  });
});
