import { describe, expect, it } from "vitest";

import { metricsFor, ROLE_METRIC_DEFAULTS } from "./metrics";

describe("metricsFor", () => {
  it("returns role-specific metrics for literata (display ≠ text)", () => {
    const display = metricsFor("display", "literata");
    const text = metricsFor("text", "literata");
    expect(display).toEqual({
      size: 48,
      regular: 300,
      bold: 800,
      line: 1.42,
      spacing: -0.01,
    });
    expect(text).toEqual({
      size: 17,
      regular: 400,
      bold: 700,
      line: 1.6,
      spacing: 0.01,
    });
    expect(display).not.toEqual(text);
  });

  it("returns code metrics for chivo-mono", () => {
    expect(metricsFor("code", "chivo-mono")).toEqual({
      size: 16,
      regular: 400,
      bold: 800,
      line: 1.7,
      spacing: 0,
    });
  });

  it("falls back to role defaults for unknown ids", () => {
    for (const role of ["display", "text", "code"] as const) {
      expect(metricsFor(role, "does-not-exist")).toEqual(
        ROLE_METRIC_DEFAULTS[role],
      );
    }
  });
});
