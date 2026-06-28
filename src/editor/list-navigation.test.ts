import { describe, expect, it } from "vitest";

import { nextActiveIndex } from "./list-navigation";

describe("nextActiveIndex", () => {
  it("returns the current index for an empty list", () => {
    expect(nextActiveIndex(0, "ArrowDown", { length: 0 })).toBe(0);
    expect(nextActiveIndex(0, "ArrowUp", { length: 0, wrap: true })).toBe(0);
  });

  it("returns the current index for non-arrow keys", () => {
    expect(nextActiveIndex(1, "Enter", { length: 3 })).toBe(1);
    expect(nextActiveIndex(1, "a", { length: 3, wrap: true })).toBe(1);
  });

  describe("clamping (default)", () => {
    it("moves down but stops at the last item", () => {
      expect(nextActiveIndex(0, "ArrowDown", { length: 3 })).toBe(1);
      expect(nextActiveIndex(2, "ArrowDown", { length: 3 })).toBe(2);
    });

    it("moves up but stops at the first item", () => {
      expect(nextActiveIndex(2, "ArrowUp", { length: 3 })).toBe(1);
      expect(nextActiveIndex(0, "ArrowUp", { length: 3 })).toBe(0);
    });
  });

  describe("wrapping", () => {
    it("wraps from the last item back to the first on ArrowDown", () => {
      expect(nextActiveIndex(2, "ArrowDown", { length: 3, wrap: true })).toBe(
        0,
      );
    });

    it("wraps from the first item to the last on ArrowUp", () => {
      expect(nextActiveIndex(0, "ArrowUp", { length: 3, wrap: true })).toBe(2);
    });

    it("steps normally in the middle of the list", () => {
      expect(nextActiveIndex(1, "ArrowDown", { length: 3, wrap: true })).toBe(
        2,
      );
      expect(nextActiveIndex(1, "ArrowUp", { length: 3, wrap: true })).toBe(0);
    });
  });
});
