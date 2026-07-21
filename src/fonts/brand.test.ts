import { afterEach, describe, expect, it, vi } from "vitest";

describe("isCardillacAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows Cardillac when VITE_ALLOW_CARDILLAC is true", async () => {
    vi.stubEnv("VITE_ALLOW_CARDILLAC", "true");
    const { isCardillacAllowed } = await import("./brand");
    expect(isCardillacAllowed()).toBe(true);
  });

  it("blocks Cardillac when VITE_ALLOW_CARDILLAC is false", async () => {
    vi.stubEnv("VITE_ALLOW_CARDILLAC", "false");
    const { isCardillacAllowed } = await import("./brand");
    expect(isCardillacAllowed()).toBe(false);
  });
});
