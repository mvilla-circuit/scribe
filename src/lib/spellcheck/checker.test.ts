import { describe, expect, it } from "vitest";

import { createChecker } from "./checker";

describe("createChecker", () => {
  it("reports every word as known before the dictionary loads", () => {
    // Synchronously, right after creation, nothing has loaded yet: no word may
    // be flagged, so a squiggle never flashes before the dictionary is ready.
    const checker = createChecker();
    expect(checker.isReady).toBe(false);
    expect(checker.check("definitely-not-a-word")).toBe(true);
    expect(checker.suggest("teh")).toEqual([]);
  });

  it("distinguishes known from unknown words once ready", async () => {
    const checker = createChecker();
    await checker.whenReady;

    expect(checker.isReady).toBe(true);
    expect(checker.check("hello")).toBe(true);
    expect(checker.check("teh")).toBe(false);
    expect(checker.suggest("teh")).toContain("the");
  });

  it("honors words added to the checker", async () => {
    const checker = createChecker();
    await checker.whenReady;

    expect(checker.check("zzyzx")).toBe(false);
    checker.add("zzyzx");
    expect(checker.check("zzyzx")).toBe(true);
  });

  it("queues words added before the dictionary is ready", async () => {
    const checker = createChecker();
    // Added while still loading — must be applied once the dictionary lands.
    checker.add("zzyzx");
    await checker.whenReady;
    expect(checker.check("zzyzx")).toBe(true);
  });
});
